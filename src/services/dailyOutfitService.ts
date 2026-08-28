/**
 * Daily outfits
 *
 * Replaces the Home screen's occasion recommendations, which had three
 * structural faults:
 *
 *   1. **Every variant returned the same clothes.** generateStyleMatchedOutfit
 *      and generateWeatherOptimizedOutfit both called
 *      selectItem(items, 'tops', { occasion, weather }) with identical
 *      arguments. selectItem is deterministic and returns the single top
 *      scorer, so the two "different" outfits were the same garments under
 *      different headlines. Swapping cycled four near-identical looks.
 *   2. **Occasions converged.** Occasion contributed at most 35 points from an
 *      `item.occasion` field that is rarely populated, or 25 from a keyword
 *      regex over style/tags. For a normal closet both score zero on most
 *      items, leaving a wornCount nudge and a hash as the only differences -
 *      so Work, Date and Weekend drew from the same ordering.
 *   3. **Tops and bottoms were chosen independently.** Nothing checked that
 *      the two garments went together. That is not outfit building, it is two
 *      separate lookups.
 *
 * This builds outfits jointly: candidate pairs are scored as pairs, on colour
 * harmony and formality coherence, against a formality target derived from the
 * occasion. Results are then diversified so no two suggestions lean on the
 * same pieces, and seeded by date so the set is stable through a day and
 * different tomorrow.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { Item } from '../types';
import { colorsWork } from './outfitUnlock';
import { WeatherCondition } from './recommendationEngine';

export type OccasionKey =
  | 'work'
  | 'casual'
  | 'formal'
  | 'date'
  | 'workout'
  | 'party'
  | 'travel'
  | 'outdoor';

export interface OutfitCandidate {
  id: string;
  items: Item[];
  score: number;
  /** Deterministic, countable reasons. The AI layer may add prose on top. */
  reasons: string[];
  formality: number;
}

interface WorkingCandidate extends OutfitCandidate {
  /** Compatible finishers, ranked. Resolved during diversification so the
   *  same pair of shoes does not end up under every single look. */
  shoeOptions: Item[];
  layerOptions: Item[];
  layerReason: string | null;
}

/* ------------------------------------------------------------------ *
 * Formality
 * ------------------------------------------------------------------ */

/**
 * A 0-5 formality reading for a garment.
 *
 * Derived from subcategory first because that is the most reliable field the
 * classifier produces, then fabric, pattern and fit as adjustments. This is
 * the signal the old engine was missing entirely - it tried to infer occasion
 * fit from regexes over free-text tags, which for most closets matched
 * nothing.
 */
const SUBCATEGORY_FORMALITY: Array<[RegExp, number]> = [
  [/tuxedo|gown|evening gown/, 5],
  [/suit|blazer|sport coat|dress shirt|oxford|pump|heel|tie/, 4],
  [/trouser|slack|button.?down|blouse|midi|loafer|oxford shoe|cardigan|turtleneck/, 3],
  [/chino|polo|knit|sweater|skirt|boot|dress\b|jacket/, 2.5],
  [/jean|denim|tee|t.?shirt|sneaker|short|hoodie|sweatshirt/, 1],
  [/legging|jogger|trainer|track|sports bra|gym/, 0],
];

const FABRIC_ADJUST: Array<[RegExp, number]> = [
  [/silk|satin|wool|cashmere|tweed|velvet|leather/, 0.6],
  [/linen|cotton poplin|crepe/, 0.2],
  [/denim|jersey|fleece|terry|nylon/, -0.5],
];

export function formalityOf(item: Item): number {
  const haystack = [item.subcategory, item.category, item.style, ...(item.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let base = 2; // an unlabelled garment sits mid-scale rather than at an extreme
  for (const [pattern, value] of SUBCATEGORY_FORMALITY) {
    if (pattern.test(haystack)) {
      base = value;
      break;
    }
  }

  const fabric = (item.fabricTexture || '').toLowerCase();
  for (const [pattern, delta] of FABRIC_ADJUST) {
    if (pattern.test(fabric)) {
      base += delta;
      break;
    }
  }

  // Loud patterns read less formal in a work context, more in a party one;
  // the occasion scoring below handles the direction. Here they just soften.
  const pattern = (item.pattern || '').toLowerCase();
  if (pattern && pattern !== 'solid') base -= 0.3;

  const fit = (item.fitType || '').toLowerCase();
  if (/tailored|slim|fitted|structured/.test(fit)) base += 0.4;
  if (/oversized|relaxed|loose|baggy/.test(fit)) base -= 0.4;

  return Math.max(0, Math.min(5, base));
}

interface OccasionProfile {
  /** Where the outfit should sit on the formality scale. */
  target: number;
  /** How far from target is still acceptable before it costs points. */
  tolerance: number;
  /** Positive favours neutral palettes, negative favours colour and pattern. */
  neutralBias: number;
  label: string;
}

/**
 * Work and Date can sit at the same formality and still want different
 * clothes, which is why formality alone was never going to separate them.
 * neutralBias is what pulls Work toward a structured neutral palette and Date
 * toward colour, texture and pattern.
 */
const OCCASIONS: Record<OccasionKey, OccasionProfile> = {
  work: { target: 3.6, tolerance: 1.0, neutralBias: 0.7, label: 'work' },
  formal: { target: 4.6, tolerance: 0.8, neutralBias: 0.3, label: 'a formal event' },
  date: { target: 3.4, tolerance: 1.1, neutralBias: -0.6, label: 'a date' },
  party: { target: 3.6, tolerance: 1.2, neutralBias: -0.9, label: 'going out' },
  casual: { target: 1.6, tolerance: 1.1, neutralBias: 0, label: 'the weekend' },
  travel: { target: 1.8, tolerance: 1.2, neutralBias: 0.5, label: 'travelling' },
  outdoor: { target: 1.4, tolerance: 1.2, neutralBias: 0.3, label: 'being outdoors' },
  workout: { target: 0.3, tolerance: 0.8, neutralBias: 0, label: 'training' },
};

const NEUTRALS = /black|white|grey|gray|navy|beige|cream|tan|khaki|ivory|charcoal|stone|camel/;

function isNeutral(item: Item): boolean {
  return NEUTRALS.test((item.color || '').toLowerCase());
}

/* ------------------------------------------------------------------ *
 * Weather
 * ------------------------------------------------------------------ */

type TempBand = 'freezing' | 'cold' | 'mild' | 'warm' | 'hot';

function tempBand(temperature: number): TempBand {
  if (temperature < 35) return 'freezing';
  if (temperature < 55) return 'cold';
  if (temperature < 75) return 'mild';
  if (temperature < 85) return 'warm';
  return 'hot';
}

const BAND_SEASONS: Record<TempBand, string[]> = {
  freezing: ['winter'],
  cold: ['winter', 'fall'],
  mild: ['spring', 'fall'],
  warm: ['spring', 'summer'],
  hot: ['summer'],
};

function seasonScore(item: Item, band: TempBand): number {
  const seasons = item.seasons || [];
  // No season data is neutral, not a penalty - most closets are partly tagged.
  if (seasons.length === 0) return 0;
  const wanted = BAND_SEASONS[band];
  return seasons.some(s => wanted.includes((s || '').toLowerCase())) ? 1 : -1;
}

/* ------------------------------------------------------------------ *
 * Rotation
 * ------------------------------------------------------------------ */

/** Stable within a calendar day, different the next. */
export function daySeed(date: Date = new Date()): number {
  return Number(
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
      date.getDate()
    ).padStart(2, '0')}`
  );
}

/**
 * Two slots a day - one from midnight, one from midday.
 *
 * Suggestions should feel like a considered choice, not a slot machine. The
 * deterministic layer was already day-stable, but the AI ranking re-ran on
 * every load and picked a different three with different copy each time, so
 * pulling to refresh reshuffled everything. Results are computed once per slot
 * and cached against this number.
 */
export function slotSeed(date: Date = new Date()): number {
  return daySeed(date) * 2 + (date.getHours() < 12 ? 0 : 1);
}

function hash(value: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(h, 31) + value.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

function daysSinceWorn(item: Item): number | null {
  if (!item.lastWornDate) return null;
  const then = new Date(item.lastWornDate).getTime();
  if (isNaN(then)) return null;
  return (Date.now() - then) / 86_400_000;
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

function itemScore(
  item: Item,
  profile: OccasionProfile,
  band: TempBand | null,
  seed: number
): number {
  let score = 0;

  const distance = Math.abs(formalityOf(item) - profile.target);
  // Inside tolerance costs nothing; beyond it the penalty grows steeply, so a
  // hoodie cannot drift into a work outfit just by being under-worn.
  score += distance <= profile.tolerance ? 12 : 12 - (distance - profile.tolerance) * 14;

  if (profile.neutralBias !== 0) {
    score += (isNeutral(item) ? 1 : -1) * profile.neutralBias * 6;
  }

  // A real occasion tag on the item beats everything inferred.
  if (item.occasion && item.occasion.toLowerCase() === profile.label) score += 10;

  if (band) score += seasonScore(item, band) * 8;

  // Rotation: things not worn recently rise, things worn constantly fall.
  const since = daysSinceWorn(item);
  if (since !== null) score += Math.min(8, since / 7);
  else score += 2;
  score -= Math.min(6, (item.wornCount || 0) * 0.4);

  // A small seeded jitter so the same closet does not produce the identical
  // ordering every single day. Small enough that it never outranks fit.
  score += hash(item.id, seed) * 4;

  return score;
}

function pairScore(top: Item, bottom: Item, profile: OccasionProfile): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (colorsWork(top.color || '', bottom.color || '')) {
    score += 10;
  } else {
    score -= 18;
  }

  const topColor = (top.color || '').toLowerCase();
  const bottomColor = (bottom.color || '').toLowerCase();

  // One neutral anchoring one colour is the most reliable pairing there is.
  if (isNeutral(top) !== isNeutral(bottom)) {
    score += 5;
    reasons.push(`${top.color || 'The top'} against ${bottom.color || 'the bottom'}`);
  }

  // Head-to-toe in one colour is a deliberate look, not something to serve up
  // four times in a row. Without this the colour-favouring occasions returned
  // nothing but monochrome.
  if (topColor && topColor === bottomColor) {
    score -= 7;
  }

  // Two garments in an outfit should sit near each other on the scale. A
  // blazer over gym shorts is formal on average and wrong in practice - which
  // is the failure mode of scoring items independently.
  const gap = Math.abs(formalityOf(top) - formalityOf(bottom));
  score += gap <= 1 ? 10 : -gap * 6;
  if (gap <= 0.5) reasons.push('Pitched at the same level');

  // Two loud patterns together is usually a mistake.
  const topPattern = (top.pattern || 'solid').toLowerCase();
  const bottomPattern = (bottom.pattern || 'solid').toLowerCase();
  if (topPattern !== 'solid' && bottomPattern !== 'solid') score -= 8;
  else if (topPattern !== 'solid' || bottomPattern !== 'solid') {
    score += 3;
    reasons.push('One pattern, one plain');
  }

  if (profile.neutralBias < 0 && (!isNeutral(top) || !isNeutral(bottom))) {
    reasons.push('Enough colour to not read as an office outfit');
  }

  return { score, reasons };
}

/* ------------------------------------------------------------------ *
 * Construction
 * ------------------------------------------------------------------ */

function inCategory(items: Item[], category: string): Item[] {
  return items.filter(i => (i.category || '').toLowerCase() === category);
}

function needsOuterwear(weather?: { condition: WeatherCondition; temperature: number }): boolean {
  if (!weather) return false;
  const band = tempBand(weather.temperature);
  if (band === 'freezing' || band === 'cold') return true;
  return band !== 'hot' && (weather.condition === 'rainy' || weather.condition === 'snowy');
}

export interface BuildOptions {
  occasion: OccasionKey;
  weather?: { condition: WeatherCondition; temperature: number };
  /** How many distinct outfits to return. */
  count?: number;
  seed?: number;
  /** Item id -> how many days ago Dress Me Today last showed it. */
  recentlyShown?: Map<string, number>;
}

/**
 * The day-over-day rotation the seeded jitter alone could not deliver.
 *
 * The jitter tops out at 4 points while the structural scores (formality fit,
 * season, pairing) run to 10+ - so the same best-scoring outfits won every
 * day, identically. This penalty is the counterweight: items shown yesterday
 * carry enough cost to push a different-but-still-good look to the top, and
 * the cost decays over three days so favourites return, just not tomorrow.
 * It is a penalty rather than a veto on purpose: in a small closet where
 * everything was shown yesterday, the penalties fall on every candidate
 * roughly equally and cancel out - the screen stays full.
 */
const RECENCY_PENALTY: Record<number, number> = { 1: 16, 2: 8, 3: 4 };

function recencyCost(items: Item[], recent?: Map<string, number>): number {
  if (!recent?.size) return 0;
  return items.reduce((sum, item) => sum + (RECENCY_PENALTY[recent.get(item.id) ?? 0] || 0), 0);
}

/**
 * Builds distinct outfits for one occasion.
 *
 * Candidates are enumerated as pairs and scored as pairs. Selection is greedy
 * with a reuse penalty, so the returned set does not lean on the same hero
 * piece over and over - the specific complaint that the old engine produced
 * four looks built from one top.
 */
export function buildOutfits(items: Item[], options: BuildOptions): OutfitCandidate[] {
  const profile = OCCASIONS[options.occasion] || OCCASIONS.casual;
  const band = options.weather ? tempBand(options.weather.temperature) : null;
  const seed = options.seed ?? daySeed();
  const count = options.count ?? 4;

  const tops = inCategory(items, 'tops');
  const bottoms = inCategory(items, 'bottoms');
  const dresses = inCategory(items, 'dresses');
  const shoes = inCategory(items, 'shoes');
  const outerwear = inCategory(items, 'outerwear');

  const scoredShoes = shoes
    .map(s => ({ item: s, score: itemScore(s, profile, band, seed) }))
    .sort((a, b) => b.score - a.score);
  const scoredOuterwear = outerwear
    .map(o => ({ item: o, score: itemScore(o, profile, band, seed) }))
    .sort((a, b) => b.score - a.score);

  const candidates: WorkingCandidate[] = [];

  const pushCandidate = (base: Item[], baseScore: number, baseReasons: string[]) => {
    // Every compatible finisher is kept, ranked, rather than committing to the
    // best one now. Choosing here is what put an identical pair of shoes under
    // every look the old pairing service produced.
    const shoeOptions = scoredShoes
      .filter(s => base.every(b => colorsWork(s.item.color || '', b.color || '')))
      .map(s => s.item);

    const layerOptions = needsOuterwear(options.weather)
      ? scoredOuterwear
          .filter(o => base.every(b => colorsWork(o.item.color || '', b.color || '')))
          .map(o => o.item)
      : [];

    const layerReason = layerOptions.length
      ? options.weather?.condition === 'rainy'
        ? 'A layer for the rain'
        : `A layer for ${Math.round(options.weather!.temperature)}°`
      : null;

    const formality = base.reduce((sum, i) => sum + formalityOf(i), 0) / Math.max(1, base.length);

    candidates.push({
      id: base.map(i => i.id).join('-'),
      items: base,
      score: baseScore,
      reasons: [...baseReasons],
      formality,
      shoeOptions,
      layerOptions,
      layerReason,
    });
  };

  tops.forEach(top => {
    const topScore = itemScore(top, profile, band, seed);
    bottoms.forEach(bottom => {
      const bottomScore = itemScore(bottom, profile, band, seed);
      const pair = pairScore(top, bottom, profile);
      pushCandidate([top, bottom], topScore + bottomScore + pair.score, pair.reasons);
    });
  });

  dresses.forEach(dress => {
    const score = itemScore(dress, profile, band, seed) * 2;
    pushCandidate([dress], score, ['A single piece — nothing to coordinate']);
  });

  candidates.sort((a, b) => b.score - a.score);

  // Greedy diversification: each already-selected item makes reusing it more
  // expensive, so the set spreads across the wardrobe instead of returning
  // four variations on one shirt.
  const chosen: OutfitCandidate[] = [];
  const used = new Map<string, number>();

  /** Least-used compatible option, falling back to the highest ranked. */
  const leastUsed = (options_: Item[]): Item | undefined =>
    options_.length === 0
      ? undefined
      : options_.reduce((best, candidate) =>
          (used.get(candidate.id) || 0) < (used.get(best.id) || 0) ? candidate : best
        );

  while (chosen.length < count && candidates.length > 0) {
    let bestIndex = -1;
    let bestValue = -Infinity;

    candidates.forEach((candidate, index) => {
      const penalty = candidate.items.reduce((sum, i) => sum + (used.get(i.id) || 0) * 25, 0);
      const value =
        candidate.score - penalty - recencyCost(candidate.items, options.recentlyShown);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });

    if (bestIndex < 0) break;
    const [picked] = candidates.splice(bestIndex, 1);

    // Finishers are resolved now, against what the already-chosen looks used,
    // so shoes rotate across the set instead of repeating under every one.
    const items = [...picked.items];
    const reasons = [...picked.reasons];

    const shoe = leastUsed(picked.shoeOptions);
    if (shoe) items.push(shoe);

    const layer = leastUsed(picked.layerOptions);
    if (layer) {
      items.push(layer);
      if (picked.layerReason) reasons.push(picked.layerReason);
    }

    items.forEach(i => used.set(i.id, (used.get(i.id) || 0) + 1));
    chosen.push({
      id: items.map(i => i.id).join('-'),
      items,
      score: picked.score,
      reasons,
      formality: items.reduce((sum, i) => sum + formalityOf(i), 0) / Math.max(1, items.length),
    });
  }

  return chosen;
}

/* ------------------------------------------------------------------ *
 * AI ranking
 * ------------------------------------------------------------------ */

const curateDailyOutfitsFn = httpsCallable(functions, 'curateDailyOutfits');

export interface DailyOutfit extends OutfitCandidate {
  title: string;
  note: string;
}

/** Fallback titles, used when the model is unavailable. */
function deterministicTitle(candidate: OutfitCandidate, occasion: OccasionKey): string {
  const hero = candidate.items[0];
  const descriptor = [hero?.color, hero?.subcategory || hero?.category].filter(Boolean).join(' ');
  return descriptor ? descriptor.replace(/^\w/, c => c.toUpperCase()) : OCCASIONS[occasion].label;
}

/** The tabs on Home, in the order they appear. */
export const HOME_OCCASIONS: OccasionKey[] = ['work', 'date', 'casual', 'travel', 'party'];

const CACHE_KEY = 'dressMeToday:v1';
const PER_OCCASION = 3;

interface SlotCache {
  slot: number;
  /** Fingerprint of the closet the pools were built from. Rehydration checks
   *  ids, which catches deletions - but an added garment matches every cached
   *  id and slipped straight through, so a wardrobe could grow all day and the
   *  screen would keep serving outfits computed from the old, smaller closet.
   *  Optional because caches written before this field must read as stale. */
  closet?: string;
  /** Item ids per outfit, per occasion. Ids only - garments are re-read from
   *  the live closet so a renamed or deleted item cannot go stale in cache. */
  pools: Partial<Record<OccasionKey, string[][]>>;
  copy: Partial<Record<OccasionKey, Array<{ title: string; note: string }>>>;
}

/** Order-independent closet fingerprint. Ids catch additions and removals;
 *  category is included because moving a garment between categories changes
 *  which outfits can exist without changing any id. */
function closetSignature(items: Item[]): string {
  let h = 2166136261 >>> 0;
  for (const key of items.map(i => `${i.id}|${(i.category || '').toLowerCase()}`).sort()) {
    for (let i = 0; i < key.length; i++) {
      h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0;
    }
    h = Math.imul(h ^ 0x1f, 16777619) >>> 0;
  }
  return `${items.length}:${h.toString(16)}`;
}

async function readCache(slot: number): Promise<SlotCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SlotCache;
    return parsed.slot === slot ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCache(cache: SlotCache): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // A failed cache write only costs a recompute; never break the screen.
  }
}

/* ------------------------------------------------------------------ *
 * Shown history - what makes today's looks differ from yesterday's
 * ------------------------------------------------------------------ */

const HISTORY_KEY = 'dressMeToday:shown:v1';
const HISTORY_DAYS = 3;

/** daySeed numbers are YYYYMMDD, so subtraction across month ends lies -
 *  convert back to dates to count days. */
function daysBetweenSeeds(later: number, earlier: number): number {
  const parse = (seedValue: number) => {
    const s = String(seedValue);
    return new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
  };
  return Math.round((parse(later).getTime() - parse(earlier).getTime()) / 86_400_000);
}

/** Item id -> days ago it was shown (1..HISTORY_DAYS). Today is excluded so
 *  the within-day slot cache stays stable. */
async function readRecentlyShown(today: number = daySeed()): Promise<Map<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    const recent = new Map<string, number>();
    Object.entries(parsed)
      .map(([day, ids]) => ({ daysAgo: daysBetweenSeeds(today, Number(day)), ids }))
      .filter(entry => entry.daysAgo >= 1 && entry.daysAgo <= HISTORY_DAYS)
      // Oldest first, so when an item was shown twice the nearest day wins.
      .sort((a, b) => b.daysAgo - a.daysAgo)
      .forEach(entry => entry.ids.forEach(id => recent.set(id, entry.daysAgo)));
    return recent;
  } catch {
    return new Map();
  }
}

async function recordShown(
  pools: Record<OccasionKey, OutfitCandidate[]>,
  today: number = daySeed()
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const parsed: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    const ids = new Set(parsed[String(today)] || []);
    HOME_OCCASIONS.forEach(occasion =>
      pools[occasion]?.forEach(candidate => candidate.items.forEach(item => ids.add(item.id)))
    );
    parsed[String(today)] = Array.from(ids);
    Object.keys(parsed).forEach(day => {
      const age = daysBetweenSeeds(today, Number(day));
      if (age > HISTORY_DAYS || age < 0) delete parsed[day];
    });
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(parsed));
  } catch {
    // History is rotation, not correctness; never break the screen over it.
  }
}

/**
 * Builds every tab's outfits in one pass, with no garment reused across tabs.
 *
 * Doing them together is the only way to guarantee the tabs differ. Built one
 * at a time, Work and Date can legitimately arrive at the same shirt-and-
 * trousers pairing, and the user sees the same outfit twice.
 */
export function buildAllOccasions(
  items: Item[],
  options: { weather?: BuildOptions['weather']; seed?: number; recentlyShown?: Map<string, number> }
): Record<OccasionKey, OutfitCandidate[]> {
  const seed = options.seed ?? slotSeed();
  const spent = new Set<string>();
  const result = {} as Record<OccasionKey, OutfitCandidate[]>;

  HOME_OCCASIONS.forEach(occasion => {
    // Over-fetch, then take the first PER_OCCASION that do not reuse a garment
    // another tab already claimed.
    const pool = buildOutfits(items, {
      occasion,
      weather: options.weather,
      seed,
      count: PER_OCCASION * 4,
      recentlyShown: options.recentlyShown,
    });

    // Overlap is a cost, not a veto. A hard exclusion empties the pool for
    // whichever tab is scored last, and the earlier fallback then handed that
    // tab an unfiltered slice - so the very tab most at risk of repeating was
    // the one with no protection at all. Ranking by overlap keeps every tab
    // full and pushes repetition to the last possible place.
    const picked: OutfitCandidate[] = [];
    const remaining = [...pool];

    while (picked.length < PER_OCCASION && remaining.length > 0) {
      let bestIndex = 0;
      let bestOverlap = Infinity;

      remaining.forEach((candidate, index) => {
        const overlap = candidate.items.filter(i => spent.has(i.id)).length;
        // Ties break on pool order, which is already score-descending.
        if (overlap < bestOverlap) {
          bestOverlap = overlap;
          bestIndex = index;
        }
      });

      const [chosen] = remaining.splice(bestIndex, 1);
      chosen.items.forEach(i => spent.add(i.id));
      picked.push(chosen);
    }

    result[occasion] = picked;
  });

  return result;
}

export interface OutfitCopy {
  title: string;
  note: string;
}

export interface OutfitPools {
  slot: number;
  pools: Record<OccasionKey, OutfitCandidate[]>;
  copy: Partial<Record<OccasionKey, OutfitCopy[]>>;
}

/**
 * Loads every tab's outfits for the current slot.
 *
 * Called once. Switching tabs afterwards is a lookup in the returned object,
 * with no await and no network - previously the first visit to each tab in a
 * slot triggered its own model call, so Work -> Date -> Weekend each paid a
 * few seconds the first time round.
 */
export async function loadOutfitPools(
  items: Item[],
  options: { weather?: BuildOptions['weather']; seed?: number }
): Promise<OutfitPools> {
  const slot = options.seed ?? slotSeed();
  const byId = new Map(items.map(i => [i.id, i]));
  const signature = closetSignature(items);
  const cached = await readCache(slot);

  // Rehydrate cached pools from the live closet. Ids are cached, garments are
  // not, so a deleted item drops its outfit rather than rendering a gap. The
  // signature gate covers the opposite direction: garments added since the
  // pools were built rehydrate cleanly yet were never candidates, so the cache
  // must be treated as describing a different closet.
  if (cached?.pools && cached.closet === signature) {
    const rehydrated = {} as Record<OccasionKey, OutfitCandidate[]>;
    let usable = true;

    HOME_OCCASIONS.forEach(occasion => {
      const ids = cached.pools[occasion];
      if (!ids?.length) {
        usable = false;
        return;
      }
      rehydrated[occasion] = ids
        .map((outfitIds): OutfitCandidate | null => {
          const resolved = outfitIds.map(id => byId.get(id)).filter((i): i is Item => !!i);
          if (resolved.length < outfitIds.length || resolved.length === 0) return null;
          return {
            id: outfitIds.join('-'),
            items: resolved,
            score: 0,
            reasons: [],
            formality:
              resolved.reduce((sum, i) => sum + formalityOf(i), 0) / Math.max(1, resolved.length),
          };
        })
        .filter((o): o is OutfitCandidate => o !== null);
    });

    if (usable && HOME_OCCASIONS.every(o => rehydrated[o]?.length)) {
      return { slot, pools: rehydrated, copy: cached.copy ?? {} };
    }
  }

  const recentlyShown = await readRecentlyShown();
  const pools = buildAllOccasions(items, { weather: options.weather, seed: slot, recentlyShown });
  const idsOnly: SlotCache['pools'] = {};
  HOME_OCCASIONS.forEach(occasion => {
    idsOnly[occasion] = pools[occasion].map(c => c.items.map(i => i.id));
  });
  // Cached copy is not carried over: it was written for the outfits the old
  // pools held, position by position, and those positions now hold different
  // clothes. Deterministic titles cover until rankOccasion refills it.
  await writeCache({ slot, closet: signature, pools: idsOnly, copy: {} });
  // Remember what went on screen so tomorrow's build rotates away from it.
  recordShown(pools).catch(() => undefined);

  return { slot, pools, copy: {} };
}

/**
 * Ranks replacements for one garment in a look.
 *
 * Candidates are everything in the source pool from the same category that
 * is not already on the body, scored the same way the engine scored the
 * original: pair chemistry with each remaining piece (colour, formality gap,
 * pattern mixing) plus distance from the occasion's formality target. This is
 * what makes "swap a piece" a styling decision rather than a category browse.
 */
export function rankAlternates(
  current: Item,
  look: Item[],
  source: Item[],
  occasion: OccasionKey
): Item[] {
  const profile = OCCASIONS[occasion] || OCCASIONS.casual;
  const category = (current.category || '').toLowerCase();
  const inLook = new Set(look.map(i => i.id));
  const others = look.filter(i => i.id !== current.id);
  const core = new Set(['tops', 'bottoms', 'dresses']);

  const seen = new Set<string>();
  const candidates = source.filter(item => {
    const key = item.id;
    if (seen.has(key) || inLook.has(key)) return false;
    seen.add(key);
    return (item.category || '').toLowerCase() === category;
  });

  return candidates
    .map(candidate => {
      let score = 0;
      for (const other of others) {
        const { score: pair } = pairScore(candidate, other, profile);
        // Chemistry with the other core garment matters most; shoes and
        // layers weigh in at half strength.
        score += core.has((other.category || '').toLowerCase()) ? pair : pair * 0.5;
      }
      const gap = Math.abs(formalityOf(candidate) - profile.target);
      if (gap > profile.tolerance) score -= (gap - profile.tolerance) * 8;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.candidate);
}

/**
 * Turns a pool into renderable outfits. Pure and synchronous, so a tab switch
 * is a state update rather than an await.
 */
export function composeOutfits(
  pool: OutfitCandidate[],
  occasion: OccasionKey,
  copy?: OutfitCopy[]
): DailyOutfit[] {
  return pool.map((candidate, index) => ({
    ...candidate,
    title: copy?.[index]?.title || deterministicTitle(candidate, occasion),
    note:
      copy?.[index]?.note ||
      candidate.reasons[0] ||
      `Works for ${OCCASIONS[occasion].label}.`,
  }));
}

/**
 * Asks the model to order and annotate one tab's outfits, and caches the
 * result for the slot.
 *
 * Returns null when unavailable; the caller keeps whatever it is already
 * showing, which is why the screen can render before this resolves.
 */
export async function rankOccasion(
  pool: OutfitCandidate[],
  occasion: OccasionKey,
  context: {
    slot: number;
    weather?: BuildOptions['weather'];
    archetypes?: string[];
    avoidRules?: string[];
    /**
     * Compact lines describing current trends the user's own closet can
     * already carry (from trendRemixService.wearableTrendLines), so the
     * model can name a trend when an outfit genuinely channels one.
     */
    trendLines?: string[];
  }
): Promise<OutfitCopy[] | null> {
  // The function needs at least two outfits to have anything to rank between.
  // A closet that cannot fill a tab is an ordinary situation, not a failure -
  // calling anyway spent a round trip to be told so, and logged it as an
  // error. The deterministic copy is a complete answer here.
  if (pool.length < 2) return null;

  try {
    const result = await curateDailyOutfitsFn({
      occasion: OCCASIONS[occasion].label,
      weather: context.weather,
      archetypes: context.archetypes || [],
      avoidRules: context.avoidRules || [],
      trends: context.trendLines || [],
      outfits: pool.map((c, index) => ({
        index,
        formality: c.formality,
        pieces: c.items.map(i => ({
          category: i.category,
          subcategory: i.subcategory,
          color: i.color,
          pattern: i.pattern,
          fabric: i.fabricTexture,
          fit: i.fitType,
          brand: i.brand,
        })),
      })),
    });

    const picks = (result.data as any)?.data?.picks as
      | Array<{ index: number; title: string; note: string }>
      | undefined;
    if (!picks?.length) return null;

    // Copy is keyed by position so the pool order - and therefore the
    // cross-tab de-duplication - is preserved. The model annotates; it does
    // not get to drop or reorder outfits out from under the cache.
    const byIndex = new Map(picks.map(p => [p.index, p]));
    const copy: OutfitCopy[] = pool.map((candidate, index) => ({
      title: byIndex.get(index)?.title || deterministicTitle(candidate, occasion),
      note:
        byIndex.get(index)?.note ||
        candidate.reasons[0] ||
        `Works for ${OCCASIONS[occasion].label}.`,
    }));

    const existing = await readCache(context.slot);
    if (existing) {
      await writeCache({
        ...existing,
        copy: { ...(existing.copy ?? {}), [occasion]: copy },
      });
    }

    return copy;
  } catch (error) {
    console.log(`Outfit ranking unavailable for ${occasion}`, error);
    return null;
  }
}

export const dailyOutfitService = {
  buildOutfits,
  buildAllOccasions,
  loadOutfitPools,
  composeOutfits,
  rankOccasion,
  rankAlternates,
  formalityOf,
  daySeed,
  slotSeed,
};

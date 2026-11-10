/**
 * Garment life: what a piece has actually done, and what the closet as a
 * whole says about how long things last in it.
 *
 * Everything here is counted from the closet's own records - wears, dates,
 * price, the fixes someone logged. Nothing is estimated and nothing is
 * rated: there is no carbon, no brand score, no number without a count
 * behind it. Three things live here:
 *
 *   - the life record of one piece (item page);
 *   - the revive queue: pieces that have gone quiet, and the one-week nudge
 *     that puts a chosen piece back into the daily outfits;
 *   - the longevity score, which is only ever shown with its inputs.
 *
 * Pure (no Firebase, no React Native): scripts/auditGarmentLife.ts runs it.
 */

import { CareIssueId, careIssue } from '../data/careGuide';

const DAY_MS = 86_400_000;

/** One fix or alteration logged against a piece. Stored on the closet item as `careLog`. */
export interface CareRecord {
  id: string;
  /** ISO date the fix was logged. */
  date: string;
  issue: CareIssueId;
  /** Who did it. */
  by: 'self' | 'pro' | 'brand';
  note?: string;
}

/** The closet fields this module reads. Every one is optional - old items lack most. */
export interface LifeItem {
  id: string;
  category?: string;
  brand?: string | null;
  price?: number | null;
  wornCount?: number | null;
  lastWornDate?: string | null;
  purchaseDate?: string | null;
  createdAt?: string | null;
  seasons?: string[] | null;
  careLog?: CareRecord[] | null;
  /** ISO date until which the piece is on the "wear it this week" list. */
  reviveUntil?: string | null;
  /** The user reviewed it and chose to keep it; never re-suggested. */
  declutterKeep?: boolean | null;
}

function time(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return isNaN(ms) ? null : ms;
}

/** Whatever is stored under `careLog`, reduced to well-formed records, newest first. */
export function readCareLog(raw: unknown): CareRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is CareRecord => !!r && typeof r === 'object' && !!careIssue((r as any).issue) && time((r as any).date) !== null)
    .map((r): CareRecord => ({
      id: String(r.id || `${r.issue}-${r.date}`),
      date: String(r.date),
      issue: r.issue,
      by: r.by === 'pro' || r.by === 'brand' ? r.by : 'self',
      note: typeof r.note === 'string' && r.note.trim() ? r.note.trim().slice(0, 140) : undefined,
    }))
    .sort((a, b) => (time(b.date) ?? 0) - (time(a.date) ?? 0));
}

// ---------------------------------------------------------------- life record

export interface LifeRecord {
  wears: number;
  /** Days since it was last worn; null when never worn or no date. */
  daysSinceWorn: number | null;
  /** When it joined the closet: the purchase date if known, else when it was added. */
  since: string | null;
  /** True when `since` is the day it was added to the app, not a purchase date. */
  sinceIsAddedDate: boolean;
  monthsOwned: number | null;
  /** Price divided by wears. Null until there is a price AND at least one wear. */
  costPerWear: number | null;
  care: CareRecord[];
}

export function lifeRecord(item: LifeItem, now: number = Date.now()): LifeRecord {
  const wears = Math.max(0, Math.floor(Number(item.wornCount) || 0));
  const worn = time(item.lastWornDate);
  const bought = time(item.purchaseDate);
  const added = time(item.createdAt);
  const since = bought ?? added;
  const price = typeof item.price === 'number' && item.price > 0 ? item.price : null;
  return {
    wears,
    daysSinceWorn: worn !== null && wears > 0 ? Math.max(0, Math.floor((now - worn) / DAY_MS)) : null,
    since: since !== null ? new Date(since).toISOString() : null,
    sinceIsAddedDate: bought === null && added !== null,
    monthsOwned: since !== null ? Math.max(0, Math.floor((now - since) / (30.44 * DAY_MS))) : null,
    costPerWear: price !== null && wears > 0 ? price / wears : null,
    care: readCareLog(item.careLog),
  };
}

function ago(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 730) return `${Math.round(days / 30.44)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

function owned(months: number): string {
  if (months < 1) return 'under a month';
  if (months < 24) return `${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  return `${years} years`;
}

export interface LifeFact {
  label: string;
  value: string;
}

/** The life record as the four facts the item page prints. Only facts that exist are returned. */
export function lifeFacts(record: LifeRecord): LifeFact[] {
  const facts: LifeFact[] = [
    {
      label: 'Worn',
      value: record.wears === 0 ? 'Not yet' : `${record.wears} time${record.wears === 1 ? '' : 's'}`,
    },
  ];
  if (record.daysSinceWorn !== null) facts.push({ label: 'Last worn', value: ago(record.daysSinceWorn) });
  if (record.monthsOwned !== null) {
    facts.push({ label: record.sinceIsAddedDate ? 'In your closet' : 'Owned', value: owned(record.monthsOwned) });
  }
  if (record.costPerWear !== null) facts.push({ label: 'Cost per wear', value: `$${record.costPerWear.toFixed(2)}` });
  return facts;
}

/** "Hem restitched, March 2026 · by a tailor" - one line per logged fix. */
export function careLine(record: CareRecord): string {
  const issue = careIssue(record.issue);
  const when = new Date(record.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const who = record.by === 'pro' ? ' · done professionally' : record.by === 'brand' ? ' · by the brand' : '';
  return `${issue ? issue.done : 'Repaired'}, ${when}${who}`;
}

export function newCareRecord(issue: CareIssueId, by: CareRecord['by'], note?: string, now: number = Date.now()): CareRecord {
  return {
    id: `${issue}-${now.toString(36)}`,
    date: new Date(now).toISOString(),
    issue,
    by,
    ...(note && note.trim() ? { note: note.trim().slice(0, 140) } : {}),
  };
}

// --------------------------------------------------------------- revive queue

/** A piece only counts as quiet once it has had a fair chance to be worn. */
export const REVIVE_NEW_ITEM_DAYS = 60;
/** Worn before, but not for this long. */
export const REVIVE_DORMANT_DAYS = 180;
/** How long "wear it this week" keeps a piece in front of the outfit engine. */
export const REVIVE_WINDOW_DAYS = 7;

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export function seasonOf(now: number = Date.now()): Season {
  const month = new Date(now).getMonth();
  if (month <= 1 || month === 11) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'fall';
}

export interface ReviveCandidate<T extends LifeItem = LifeItem> {
  item: T;
  /** 'never' = in the closet over two months and not worn; 'dormant' = not worn in six months. */
  reason: 'never' | 'dormant';
  /** One honest line for the card. */
  line: string;
  /** The item's own season tags say now is not its time. It stays listed, last, with no nudge. */
  outOfSeason: boolean;
  /** Already on this week's list. */
  reviving: boolean;
}

/** True while a piece is on the "wear it this week" list and has not been worn since. */
export function isReviving(item: LifeItem, now: number = Date.now()): boolean {
  const until = time(item.reviveUntil);
  if (until === null || until <= now) return false;
  const worn = time(item.lastWornDate);
  // Worn inside the window: the nudge has done its job.
  return worn === null || worn < until - REVIVE_WINDOW_DAYS * DAY_MS;
}

/** The date to store when someone taps "wear it this week". */
export function reviveUntilFrom(now: number = Date.now()): string {
  return new Date(now + REVIVE_WINDOW_DAYS * DAY_MS).toISOString();
}

/**
 * What the outfit engine adds to a piece's score while it is being revived.
 * Sized to outrank ordinary rotation (which tops out at 8) without ever
 * beating fit: one step outside an occasion's formality tolerance costs 14,
 * so a revived hoodie still cannot walk into a work outfit.
 */
export function reviveBonus(item: LifeItem, now: number = Date.now()): number {
  return isReviving(item, now) ? 11 : 0;
}

function inSeason(item: LifeItem, season: Season): boolean {
  const tags = (item.seasons || []).map(s => String(s).toLowerCase());
  if (tags.length === 0 || tags.includes('all') || tags.includes('all-season') || tags.includes('all season')) return true;
  return tags.includes(season) || (season === 'fall' && tags.includes('autumn'));
}

/**
 * The pieces that have gone quiet, most worth reviving first: in season
 * before out of season, already-chosen pieces on top, then the longest idle.
 * A piece the user chose to keep is left alone; so is anything too new to judge.
 */
export function reviveQueue<T extends LifeItem>(items: T[], now: number = Date.now()): ReviveCandidate<T>[] {
  const season = seasonOf(now);
  const out: Array<ReviveCandidate<T> & { idle: number }> = [];
  for (const item of items) {
    if (item.declutterKeep) continue;
    const wears = Math.max(0, Number(item.wornCount) || 0);
    const since = time(item.purchaseDate) ?? time(item.createdAt);
    const added = time(item.createdAt);
    const worn = time(item.lastWornDate);
    const reviving = isReviving(item, now);
    if (wears === 0) {
      // Judged from when it entered the app: a ten-year-old coat photographed
      // yesterday has had no chance to be logged as worn.
      if (added === null || now - added < REVIVE_NEW_ITEM_DAYS * DAY_MS) continue;
      const months = Math.max(2, Math.floor((now - added) / (30.44 * DAY_MS)));
      out.push({
        item,
        reason: 'never',
        line: `In your closet ${months} months and not worn yet`,
        outOfSeason: !inSeason(item, season),
        reviving,
        idle: now - (since ?? added),
      });
    } else if (worn !== null && now - worn >= REVIVE_DORMANT_DAYS * DAY_MS) {
      out.push({
        item,
        reason: 'dormant',
        line: `Worn ${wears} time${wears === 1 ? '' : 's'}, last ${ago(Math.floor((now - worn) / DAY_MS))}`,
        outOfSeason: !inSeason(item, season),
        reviving,
        idle: now - worn,
      });
    }
  }
  return out
    .sort(
      (a, b) =>
        Number(b.reviving) - Number(a.reviving) ||
        Number(a.outOfSeason) - Number(b.outOfSeason) ||
        b.idle - a.idle
    )
    .map(({ idle: _idle, ...candidate }) => candidate);
}

// ------------------------------------------------------------ longevity score

export interface LongevityInput {
  key: 'wears' | 'active' | 'kept' | 'care' | 'passedOn';
  label: string;
  /** The measurement itself, in plain words: "11 wears a piece", "62% of your closet". */
  value: string;
  /** What that measurement is and how it turns into points. */
  how: string;
  points: number;
  max: number;
  /** False when the closet has nothing to measure this input on yet; it is then left out of the total. */
  measured: boolean;
}

export interface LongevityScore {
  /** 0-100, or null until at least one wear has been logged. */
  score: number | null;
  /** The sentence shown under the number. */
  headline: string;
  inputs: LongevityInput[];
}

/** Thirty wears is the benchmark the "30 wears" campaign made common: a piece worn that often has earned its place. */
export const WEARS_BENCHMARK = 30;

/**
 * How long things last in this closet, from five counts and nothing else.
 *
 *   Wears a piece (35)   average wears, against the 30-wear benchmark
 *   In rotation (30)     share of the closet worn in the last 90 days
 *   Kept and worn (20)   of pieces over a year old, the share still being worn
 *   Mended (10)          repairs and alterations logged, 2.5 each
 *   Passed on (5)        pieces sold, swapped or given away rather than binned
 *
 * An input the closet cannot be measured on yet (no piece is a year old) is
 * marked unmeasured and the total is scaled over the rest, so a new account
 * is not marked down for being new. The score is null - not zero - until a
 * wear exists, because a closet nobody has logged a wear in says nothing.
 */
export function longevityScore(
  items: LifeItem[],
  extras: { passedOn?: number } = {},
  now: number = Date.now()
): LongevityScore {
  const total = items.length;
  const wearsOf = (item: LifeItem) => Math.max(0, Number(item.wornCount) || 0);
  const totalWears = items.reduce((sum, item) => sum + wearsOf(item), 0);

  const average = total > 0 ? totalWears / total : 0;
  const wearsPoints = Math.min(35, (average / WEARS_BENCHMARK) * 35);

  const recent = items.filter(item => {
    const worn = time(item.lastWornDate);
    return wearsOf(item) > 0 && worn !== null && now - worn <= 90 * DAY_MS;
  }).length;
  const activeShare = total > 0 ? recent / total : 0;

  const yearOld = items.filter(item => {
    const since = time(item.purchaseDate) ?? time(item.createdAt);
    return since !== null && now - since >= 365 * DAY_MS;
  });
  const keptWorn = yearOld.filter(item => {
    const worn = time(item.lastWornDate);
    return wearsOf(item) > 0 && worn !== null && now - worn <= 365 * DAY_MS;
  }).length;
  const keptShare = yearOld.length > 0 ? keptWorn / yearOld.length : 0;

  const fixes = items.reduce((sum, item) => sum + readCareLog(item.careLog).length, 0);
  const passedOn = Math.max(0, Math.floor(Number(extras.passedOn) || 0));

  const inputs: LongevityInput[] = [
    {
      key: 'wears',
      label: 'Wears a piece',
      value: `${average >= 10 ? Math.round(average) : average.toFixed(1)} on average`,
      how: `${totalWears} wears logged across ${total} piece${total === 1 ? '' : 's'}. ${WEARS_BENCHMARK} a piece is full marks.`,
      points: wearsPoints,
      max: 35,
      measured: total > 0,
    },
    {
      key: 'active',
      label: 'In rotation',
      value: `${Math.round(activeShare * 100)}% of your closet`,
      how: `${recent} of ${total} pieces worn in the last 90 days.`,
      points: activeShare * 30,
      max: 30,
      measured: total > 0,
    },
    {
      key: 'kept',
      label: 'Kept and still worn',
      value: yearOld.length > 0 ? `${keptWorn} of ${yearOld.length}` : 'Nothing a year old yet',
      how:
        yearOld.length > 0
          ? 'Pieces you have had over a year that you wore in the last twelve months.'
          : 'Counts once a piece has been in your closet for a year.',
      points: keptShare * 20,
      max: 20,
      measured: yearOld.length > 0,
    },
    {
      key: 'care',
      label: 'Mended',
      value: `${fixes} fix${fixes === 1 ? '' : 'es'} logged`,
      how: 'Repairs and alterations you have logged on your pieces. Four is full marks.',
      points: Math.min(10, fixes * 2.5),
      max: 10,
      measured: true,
    },
    {
      key: 'passedOn',
      label: 'Passed on',
      value: `${passedOn} piece${passedOn === 1 ? '' : 's'}`,
      how: 'Pieces you sold, swapped or gave away from here rather than throwing out. Five is full marks.',
      points: Math.min(5, passedOn),
      max: 5,
      measured: true,
    },
  ];

  if (total === 0 || totalWears === 0) {
    return {
      score: null,
      headline:
        total === 0
          ? 'Add pieces to your closet and the score builds from how you wear them.'
          : 'Log a wear and the score starts. It is built only from what you actually wear, mend and keep.',
      inputs,
    };
  }

  const measured = inputs.filter(input => input.measured);
  const available = measured.reduce((sum, input) => sum + input.max, 0);
  const earned = measured.reduce((sum, input) => sum + input.points, 0);
  const score = Math.round((earned / available) * 100);

  // The headline names the input with the most room left - the one thing to do next.
  const weakest = measured
    .filter(input => input.key === 'wears' || input.key === 'active' || input.key === 'kept')
    .sort((a, b) => a.points / a.max - b.points / b.max)[0];
  const next =
    weakest?.key === 'active'
      ? 'Most of what you own has not been out in three months - the revive list is where it moves.'
      : weakest?.key === 'kept'
        ? 'Your older pieces are the ones going unworn.'
        : 'It rises with every wear you log.';
  return {
    score,
    headline: score >= 75 ? 'What you own is being worn, and kept.' : next,
    inputs,
  };
}

export const garmentLife = {
  readCareLog,
  lifeRecord,
  lifeFacts,
  careLine,
  newCareRecord,
  reviveQueue,
  isReviving,
  reviveUntilFrom,
  reviveBonus,
  seasonOf,
  longevityScore,
};

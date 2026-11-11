/**
 * Trend Remix.
 *
 * The bridge between the trend registry and the closet the user actually
 * owns. For every published trend it answers: can this person wear the trend
 * today with what they have, and if not, what is the one piece that gets
 * them in?
 *
 * This is the highest-trust way to make someone trendier, because the first
 * move costs nothing: "wide-leg tailoring is everywhere in Copenhagen - and
 * you already own it" teaches trend fluency before a single product is
 * pitched. The gap line, when it appears, is honest about being a purchase.
 *
 * Ordering respects both the world and the person: peak trends and trends
 * the user can wear today lead; how early we surface emerging trends depends
 * on how adventurous their own behaviour says they are.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { Item } from '../types';
import {
  FashionTrend,
  trendCoverage,
  trendAvoidRuleConflict,
  trendWeatherFit,
  trendShowsSkin,
  trendAnchorWords,
  stageWeight,
} from '../models/fashionTrend';
import { ProfileMatchContext } from './profileMatchContext';
import { getPublishedTrends } from './trendService';
import { getLocaleStyle, LocaleStyle } from './localeStyleService';
import {
  LocaleProfile,
  resolveLocaleProfile,
  regionAffinity,
  coverageFit,
  localWearLine,
  typicalTemperatureF,
} from './localeProfile';
import { shopperSignals, trendAdventurousness, currentPathLevel } from './shopperSignals';
import { trendFitsFocus, trendForFocus, trendIllustrated, WardrobeFocus } from './trendLooks';
import { profileMatch, pathWeight, nextStep, stepFor, NextStep, PathStep } from './trendPath';
import { profileSignature } from './profileEvents';

const personalizeTrendReportFn = httpsCallable(functions, 'personalizeTrendReport');

/**
 * Where and in what weather this user actually is. The trend desk publishes
 * one editorial pool for everyone; this is what makes each user's *delivery*
 * of it local - the same registry reads differently in Miami in August than
 * in Oslo in January, or in a polished city than an outdoorsy suburb.
 */
export interface LocaleContext {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  temperature?: number;
  condition?: string;
  /** Resolved style scene for the place (GPT, cached); loadTrendRemixes fills this in. */
  localeStyle?: LocaleStyle;
  /**
   * The deterministic locale profile (localeProfile.ts): style capitals the
   * place takes cues from, climate, coverage norm, local staples.
   * loadTrendRemixes resolves it from city/country when absent.
   */
  profile?: LocaleProfile;
}

/**
 * Human label for an owned anchor piece. Prefers the item's real name; falls
 * back to colour + subcategory, skipping the colour when the subcategory
 * already contains it ("white pleated skirt", not "white white pleated skirt").
 */
export function anchorDisplayLabel(item: Item): string {
  const named = (item.name || '').trim();
  if (named && named.toLowerCase() !== 'item') return named.toLowerCase();
  const sub = (item.subcategory || item.category || '').toLowerCase();
  const color = (item.color || '').toLowerCase();
  return color && !sub.includes(color) ? `${color} ${sub}`.trim() : sub;
}

export interface TrendRemix {
  trend: FashionTrend;
  /** Owned pieces that carry the trend outright. */
  anchors: Item[];
  /** Owned pieces that support it on colour. */
  supporting: Item[];
  /** True when at least one anchor exists - the trend is wearable today. */
  wearableToday: boolean;
  /**
   * How squarely this trend sits in the user's taste and closet today, 0..1
   * (trendPath.profileMatch).
   */
  adjacency: number;
  /** Why it matches, in true sentences, strongest first. Empty when nothing personal applies. */
  matchReasons: string[];
  /** "One piece away" line when the closet can't anchor it yet. */
  gapLine: string | null;
  /**
   * The avoid rule this trend crosses, when it does. Not a reason to hide
   * it - avoid rules are a preference, not a veto - but every surface that
   * shows a challenging trend demotes it and names the crossing.
   */
  challengesAvoidRule: string | null;
  /**
   * Why this trend ranks for *this user's place*, when it does - "Strong in
   * Marrakesh right now", "Paris style reads naturally in Casablanca",
   * "Right for 34° in Oslo". Null when the ranking is purely taste/closet-driven.
   */
  localeNote: string | null;
  /**
   * How to make the trend wearable under the local dress code, when it
   * shows skin somewhere that dresses more covered - "worn over a full base
   * layer, or kept for evenings". Null when nothing needs adapting.
   */
  localAdaptation: string | null;
  /**
   * How the place actually finishes the trend once it lands - fabric, shoe,
   * bag, jewellery ("How Marrakesh wears it: in linen, with a babouche...").
   * Set for trends arriving from elsewhere; a place's own trend needs no
   * translation.
   */
  localWear: string | null;
  /** True when the trend is foreign to this place and being introduced gently. */
  introduced: boolean;
  /**
   * The AI stylist's read of this trend against THIS closet, when the
   * personalization pass has run. The deterministic fields above are the
   * instant first paint; this replaces them on screen once present -
   * critically, its gapNote is guaranteed to be something the user does not
   * already own, which keyword matching alone cannot promise.
   */
  personalization?: TrendPersonalization;
}

export interface TrendPersonalization {
  /** How far into the trend this closet already is. */
  participation: 'in' | 'partial' | 'not-yet';
  /** Their real pieces that carry the trend, per the model's garment-level read. */
  ownedItems: Item[];
  /** Styling advice written from their named pieces. */
  wearNote: string;
  /** The one purchase that advances them - never something they own. Null when they're equipped. */
  gapNote: string | null;
}

/** A profile that could not be read carries no taste - match as if there were none. */
const tasteOf = (profile?: ProfileMatchContext) => (profile && !profile.profileReadFailed ? profile : undefined);

/**
 * How well a trend fits the *place*, and the honest lines explaining it.
 *
 * Four local signals, multiplied into the ranking:
 *   - affinity: where the trend is strong versus which capitals this place
 *     takes its cues from (localeProfile.regionAffinity). A place's own
 *     trend ranks first; an affine capital's reads naturally; a foreign
 *     one is introduced at a pace set by how cosmopolitan the place is and
 *     how far along the trend is - the "fine balance".
 *   - weather: a suede-and-layers trend sinks in a 90° city, a sheer-summer
 *     trend sinks in the cold (trendWeatherFit). With no live reading the
 *     climate band's typical temperature for the LOCAL season stands in,
 *     so Sydney in September is scored as spring, not fall.
 *   - coverage: a skin-showing trend is demoted where the street dresses
 *     more covered, and re-styled rather than hidden.
 *   - scene: the GPT locale style, when available, adds city-level nuance
 *     on top (regionAffinities, archetypes).
 */
function localeFit(
  trend: FashionTrend,
  locale?: LocaleContext
): {
  multiplier: number;
  note: string | null;
  adaptation: string | null;
  wear: string | null;
  introduced: boolean;
} {
  if (!locale) return { multiplier: 1, note: null, adaptation: null, wear: null, introduced: false };

  const profile = locale.profile;
  const temperature =
    typeof locale.temperature === 'number'
      ? locale.temperature
      : profile
        ? typicalTemperatureF(profile.climate, profile.localSeason)
        : undefined;
  const weather = trendWeatherFit(trend, temperature);

  let scene = 1;
  let note: string | null = null;
  let introduced = false;
  let native = false;

  if (profile) {
    const affinity = regionAffinity(trend.region, trend.regions, trend.stage, trend.reach, profile);
    scene *= affinity.multiplier;
    note = affinity.note;
    introduced = affinity.introduced;
    native = affinity.multiplier > 1.05;
  }

  const style = locale.localeStyle;
  if (style) {
    const places = [trend.region, ...(trend.regions || [])].map(r => r.toLowerCase());
    const affinity = style.regionAffinities.some(r => r !== 'Global' && places.includes(r.toLowerCase()));
    if (affinity) {
      scene *= 1.1;
      if (!note && locale.city) note = `${trend.region} style reads naturally in ${locale.city}`;
    }
    if (style.archetypes.some(a => trend.archetypes.includes(a))) {
      scene *= 1.08;
      if (!note && locale.city) note = `Fits how ${locale.city} actually dresses`;
    }
  }

  const cover = profile ? coverageFit(trendShowsSkin(trend), profile) : { multiplier: 1, adaptation: null };

  // Weather earns the note when it is the stronger signal and nothing local
  // has claimed it. A strongly demoted trend is not advertised - it simply
  // ranks low.
  if (typeof locale.temperature === 'number' && weather >= 1.1 && !native) {
    note = `Right for ${locale.temperature}°${locale.city ? ` in ${locale.city}` : ' where you are'}`;
  }

  const wear = profile && !native ? localWearLine(profile, trendAnchorWords(trend)) : null;

  return { multiplier: weather * scene * cover.multiplier, note, adaptation: cover.adaptation, wear, introduced };
}

/**
 * Builds the remix list for one user. Trends that cross an avoid rule stay
 * in the list - avoid rules are a strong preference, not a veto, and the
 * whole point of the trend layer is reaching past someone's defaults. They
 * are demoted (harder for cautious users, gently for adventurous ones) and
 * carry the crossed rule so every surface can say it out loud.
 *
 * "Not my thing" is honoured per trend, not just as a global mood: one
 * dismissal sinks that trend to the bottom of every surface, a second
 * removes it outright. Saying it twice is the user repeating themselves -
 * bringing the trend back at rank one after that would make the control
 * a lie.
 *
 * With a LocaleContext the ranking is also local: the same published pool
 * orders differently per city, weather, and street-style scene.
 */
export function buildRemixes(
  trends: FashionTrend[],
  closetItems: Item[],
  profile?: ProfileMatchContext,
  locale?: LocaleContext
): TrendRemix[] {
  const signals = shopperSignals.current();
  const adventurousness = trendAdventurousness(signals);
  const dismissals = signals.trendDismissals || {};

  // Home's remix card, the Trend Report and the stylist chat are all built
  // from this list, so the department rule is applied once, here: a trend
  // that belongs to the other department is not shown, and each trend's
  // summary, styling note and "way in" are worded for this one (see
  // trendFitsFocus / trendForFocus).
  const focus = profile?.wardrobeFocus;
  const taste = tasteOf(profile);

  const entries = trends
    .filter(t => t.stage !== 'fading' || adventurousness < 0.4)
    .filter(t => (dismissals[t.id] || 0) < 2)
    .filter(t => trendFitsFocus(t, focus))
    // A trend the app cannot show in photographed, shoppable pieces for this
    // reader is not shown at all. It used to stay in the report, demoted: a
    // title and a paragraph with nothing under it (desk drafts written in
    // words no product uses - "laser-cut shirt").
    .filter(t => trendIllustrated(t, focus))
    .map(t => trendForFocus(t, focus))
    .filter(t => t.summary.trim().length > 0)
    .map(trend => {
      const { anchors, supporting } = trendCoverage(trend, closetItems);
      const wearableToday = anchors.length > 0;
      const local = localeFit(trend, locale);
      const crosses = trendAvoidRuleConflict(trend, profile?.avoidRules);
      const match = profileMatch(trend, taste, { owned: anchors.length, supporting: supporting.length }, crosses);
      return {
        remix: {
          trend,
          anchors: anchors.slice(0, 4),
          supporting: supporting.slice(0, 4),
          wearableToday,
          adjacency: match.score,
          matchReasons: match.reasons,
          gapLine: wearableToday || !trend.entryPiece ? null : `One piece away: ${trend.entryPiece}.`,
          challengesAvoidRule: crosses,
          localeNote: local.note,
          localAdaptation: local.adaptation,
          localWear: local.wear,
          introduced: local.introduced,
        } as TrendRemix,
        localeMultiplier: local.multiplier,
      };
    });

  // Where this person is on the trend path decides how far from their own
  // taste the ranking reaches (trendPath.ts). The step is the stored one; a
  // first read is worked out from what they own and have done.
  const level = currentPathLevel(signals, entries.filter(e => e.remix.wearableToday).length);

  return entries
    .sort((a, b) => {
      const weight = (e: { remix: TrendRemix; localeMultiplier: number }) =>
        stageWeight(e.remix.trend.stage, adventurousness) *
        pathWeight(level, e.remix.adjacency, e.remix.trend.stage) *
        (0.55 + 0.45 * e.remix.adjacency) *
        (e.remix.wearableToday ? 1.35 : 1) *
        (e.remix.challengesAvoidRule ? 0.35 + 0.4 * adventurousness : 1) *
        // An explicit "not my thing" outweighs every promotion signal - the
        // trend still exists, but at the bottom, not back at rank one.
        (dismissals[e.remix.trend.id] ? 0.05 : 1) *
        e.localeMultiplier;
      return weight(b) - weight(a);
    })
    .map(e => e.remix);
}

export interface TrendPathView {
  step: PathStep;
  /** The one thing to try next, or null when there is nothing honest to offer. */
  next: NextStep | null;
}

/**
 * Where this person is on the trend path and what to try next, from an
 * already-ranked remix list. `ownedNames` keeps a piece they have out of
 * the suggestion.
 */
export function trendPathView(remixes: TrendRemix[], focus: WardrobeFocus, ownedNames: string[] = []): TrendPathView {
  const level = currentPathLevel(shopperSignals.current(), remixes.filter(r => r.wearableToday).length);
  return { step: stepFor(level), next: nextStep(remixes, level, focus, { ownedNames }) };
}

/**
 * Loads trends, resolves the place (deterministic profile + GPT style
 * scene), and builds the remix list in one call - what screens use. Locale resolution is best-effort: no city
 * or an unreachable locale function simply means weather-only or fully
 * taste-driven ranking.
 */
const LOCALE_STYLE_WAIT_MS = 700;

/** Resolves with the promise's value, or undefined if it takes longer than `ms`. */
function withinOrUndefined<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      }
    );
  });
}

export async function loadTrendRemixes(
  closetItems: Item[],
  profile?: ProfileMatchContext,
  locale?: LocaleContext
): Promise<TrendRemix[]> {
  const [trends, localeStyle] = await Promise.all([
    getPublishedTrends(),
    // The city's style scene is cached on the device for a week, so this is
    // normally instant. The first time for a city it is an AI call on a
    // function that may be cold - several seconds for one input to a ranking
    // that already has the deterministic locale profile below. Give it a
    // moment; if it has not answered, rank without it. The call keeps
    // running and its answer is cached for the next open.
    locale?.city && !locale.localeStyle
      ? withinOrUndefined(
          getLocaleStyle(locale.city, locale.region, locale.country).catch(() => undefined),
          LOCALE_STYLE_WAIT_MS
        )
      : Promise.resolve(locale?.localeStyle),
    // Warm the signals cache so per-trend dismissals and adventurousness are
    // read from storage, not an empty default, whichever screen calls first.
    shopperSignals.load().catch(() => undefined),
  ]);
  const localeProfile =
    locale?.profile ??
    (locale && (locale.city || locale.country)
      ? resolveLocaleProfile({
          city: locale.city,
          region: locale.region,
          country: locale.country,
          latitude: locale.latitude,
        })
      : undefined);
  // Move the stored step before ranking with it: at most one step, at most
  // once a week, by what this person owns and has done (trendPath.ts).
  const focus = profile?.wardrobeFocus;
  const worn = trends.filter(
    t => trendFitsFocus(t, focus) && trendIllustrated(t, focus) && trendCoverage(t, closetItems).anchors.length > 0
  ).length;
  await shopperSignals.advanceTrendPath(worn).catch(() => undefined);

  return buildRemixes(
    trends,
    closetItems,
    profile,
    locale ? { ...locale, localeStyle, profile: localeProfile } : undefined
  );
}

// ==================== AI PERSONALIZATION ====================

const REPORT_CACHE_KEY = '@styled_trend_report_ai';
const REPORT_TTL_MS = 24 * 60 * 60 * 1000;

/** Cheap stable signature so the cache invalidates when trends or closet change. */
function reportSignature(trendIds: string[], closetItems: Item[]): string {
  const text = `${trendIds.join(',')}::${closetItems
    .map(i => i.id)
    .sort()
    .join(',')}`;
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return String(hash);
}

interface StoredReport {
  trendId: string;
  participation: 'in' | 'partial' | 'not-yet';
  ownedItemIds: string[];
  wearNote: string;
  gapNote: string | null;
}

function mergeReports(
  remixes: TrendRemix[],
  reports: StoredReport[],
  closetItems: Item[]
): TrendRemix[] {
  const byId = new Map(reports.map(r => [r.trendId, r]));
  const itemById = new Map(closetItems.map(i => [i.id, i]));
  return remixes.map(remix => {
    const report = byId.get(remix.trend.id);
    if (!report || !report.wearNote) return remix;
    return {
      ...remix,
      personalization: {
        participation: report.participation,
        ownedItems: report.ownedItemIds
          .map(id => itemById.get(id))
          .filter((i): i is Item => Boolean(i)),
        wearNote: report.wearNote,
        gapNote: report.gapNote,
      },
    };
  });
}

/**
 * The AI pass over the report: the model reads the real closet against each
 * trend and returns per-user participation, styling advice from owned
 * pieces, and a shop suggestion vetted against ownership. Cached for a day
 * per (trends, closet) pair so revisits are free. Returns null when it
 * cannot run - the deterministic report already on screen simply stands.
 */
export async function personalizeRemixes(
  remixes: TrendRemix[],
  closetItems: Item[],
  profile?: ProfileMatchContext,
  locale?: LocaleContext
): Promise<TrendRemix[] | null> {
  if (closetItems.length < 3 || remixes.length === 0) return null;

  const top = remixes.slice(0, 8);
  // wardrobeFocus is part of the signature: switching department must
  // invalidate cached gap suggestions, or a menswear user could see
  // yesterday's womenswear "worth adding" lines for a day.
  // The place is part of the signature too: a Marrakesh report and a Paris
  // report must not share a day's cached notes.
  // And the rest of the profile the model was briefed with - archetypes,
  // avoid rules, colour season (profileSignature covers the department too):
  // notes written for "bohemian" are not served to the same closet a day
  // after it became "romantic".
  const sig = `${reportSignature(top.map(r => r.trend.id), closetItems)}:${profileSignature(profile)}:${(locale?.city || locale?.country || '').toLowerCase()}`;

  try {
    const raw = await AsyncStorage.getItem(REPORT_CACHE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored.sig === sig && Date.now() - (stored.at || 0) < REPORT_TTL_MS) {
        return mergeReports(remixes, stored.reports || [], closetItems);
      }
    }
  } catch {}

  try {
    const result = await personalizeTrendReportFn({
      trends: top.map(r => ({
        id: r.trend.id,
        name: r.trend.name,
        region: r.trend.region,
        stage: r.trend.stage,
        keyGarments: r.trend.keyGarments,
        keyAccessories: r.trend.keyAccessories,
        keyColors: r.trend.keyColors,
        silhouettes: r.trend.silhouettes,
        stylingNote: r.trend.stylingNote,
        entryPiece: r.trend.entryPiece,
      })),
      closetItems: closetItems.slice(0, 150).map(i => ({
        id: i.id,
        category: i.category,
        subcategory: i.subcategory,
        color: i.color,
        style: i.style,
        fabricTexture: i.fabricTexture,
        fitType: i.fitType,
      })),
      profile: profile
        ? {
            archetypes: profile.styleArchetypes,
            avoidRules: profile.avoidRules,
            palette: profile.recommendedColors,
            wardrobeFocus: profile.wardrobeFocus,
          }
        : undefined,
      locale: locale
        ? {
            city: locale.city,
            country: locale.country,
            temperatureF: locale.temperature,
            region: locale.profile?.regionLabel,
            coverage: locale.profile?.coverage,
            season: locale.profile?.localSeason,
            staples: locale.profile?.staples,
            scene: locale.localeStyle?.summary ?? locale.profile?.scene,
          }
        : undefined,
    });

    const reports = ((result.data as any)?.data?.reports || []) as StoredReport[];
    if (reports.length === 0) return null;

    AsyncStorage.setItem(
      REPORT_CACHE_KEY,
      JSON.stringify({ at: Date.now(), sig, reports })
    ).catch(() => {});

    return mergeReports(remixes, reports, closetItems);
  } catch (error) {
    console.log('Trend report personalization unavailable', error);
    return null;
  }
}

/**
 * Compact prompt lines for the outfit-ranking model: only trends the user
 * can already anchor from their closet, so the model connects real garments
 * to a real trend rather than wishing a wardrobe existed.
 */
export function wearableTrendLines(remixes: TrendRemix[], limit: number = 3): string[] {
  return remixes
    .filter(r => r.wearableToday)
    .slice(0, limit)
    .map(
      r =>
        `${r.trend.name} (${r.trend.region}) — carried by their ${r.anchors
          .map(a => [a.color, a.subcategory || a.category].filter(Boolean).join(' '))
          .slice(0, 2)
          .join(' and ')}`
    );
}

export const trendRemixService = {
  trendPathView,
  buildRemixes,
  loadTrendRemixes,
  personalizeRemixes,
  wearableTrendLines,
};

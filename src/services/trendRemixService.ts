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
  stageWeight,
} from '../models/fashionTrend';
import { ProfileMatchContext } from './profileMatchContext';
import { getPublishedTrends } from './trendService';
import { getLocaleStyle, LocaleStyle } from './localeStyleService';
import { shopperSignals, trendAdventurousness } from './shopperSignals';

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
  temperature?: number;
  condition?: string;
  /** Resolved style scene for the place; loadTrendRemixes fills this in. */
  localeStyle?: LocaleStyle;
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
  /** How close this trend sits to the user's stated taste, 0..1. */
  adjacency: number;
  /** "One piece away" line when the closet can't anchor it yet. */
  gapLine: string | null;
  /**
   * The avoid rule this trend crosses, when it does. Not a reason to hide
   * it - avoid rules are a preference, not a veto - but every surface that
   * shows a challenging trend demotes it and names the crossing.
   */
  challengesAvoidRule: string | null;
  /**
   * Why this trend ranks for *this user's place*, when it does - "Right for
   * 34° in Oslo", "New York style reads naturally in Chicago". Null when the
   * ranking is purely taste/closet-driven.
   */
  localeNote: string | null;
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

/**
 * How near a trend sits to this user's declared taste. Not a gate - the
 * point of the trend layer is reaching *beyond* the profile - but it decides
 * order: reachable stretches before far ones.
 */
function adjacencyScore(trend: FashionTrend, profile?: ProfileMatchContext): number {
  if (!profile) return 0.5;

  let score = 0.3;

  const archetypes = (profile.styleArchetypes || []).map(a => a.toLowerCase());
  if (archetypes.length && trend.archetypes.some(a => archetypes.includes(a.toLowerCase()))) {
    score += 0.4;
  }

  const palette = (profile.recommendedColors || []).map(c => c.toLowerCase());
  if (
    palette.length &&
    trend.keyColors.some(k => palette.some(p => p.includes(k) || k.includes(p)))
  ) {
    score += 0.3;
  }

  return Math.min(1, score);
}

/**
 * How well a trend fits the *place*, and the honest line explaining it.
 *
 * Two local signals, multiplied into the ranking:
 *   - weather: a suede-and-layers trend sinks in a 90° city, a sheer-summer
 *     trend sinks in the cold (trendWeatherFit).
 *   - scene: the place's style profile says which capitals' trends read
 *     naturally there and which archetypes the streets actually wear.
 */
function localeFit(
  trend: FashionTrend,
  locale?: LocaleContext
): { multiplier: number; note: string | null } {
  if (!locale) return { multiplier: 1, note: null };

  const weather = trendWeatherFit(trend, locale.temperature);
  let scene = 1;
  let note: string | null = null;

  const style = locale.localeStyle;
  if (style) {
    const affinity = style.regionAffinities.some(
      r => r !== 'Global' && r.toLowerCase() === trend.region.toLowerCase()
    );
    if (affinity) {
      scene += 0.2;
      if (locale.city) note = `${trend.region} style reads naturally in ${locale.city}`;
    }
    if (style.archetypes.some(a => trend.archetypes.includes(a))) {
      scene += 0.15;
      if (!note && locale.city) note = `Fits how ${locale.city} actually dresses`;
    }
  }

  // Weather earns the note when it is the stronger signal, either way.
  if (typeof locale.temperature === 'number') {
    if (weather >= 1.1) {
      note = `Right for ${locale.temperature}°${locale.city ? ` in ${locale.city}` : ' where you are'}`;
    } else if (weather <= 0.5) {
      note = null; // demoted, not advertised - it will simply rank low
    }
  }

  return { multiplier: weather * scene, note };
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

  return trends
    .filter(t => t.stage !== 'fading' || adventurousness < 0.4)
    .filter(t => (dismissals[t.id] || 0) < 2)
    .map(trend => {
      const { anchors, supporting } = trendCoverage(trend, closetItems);
      const wearableToday = anchors.length > 0;
      const local = localeFit(trend, locale);
      return {
        remix: {
          trend,
          anchors: anchors.slice(0, 4),
          supporting: supporting.slice(0, 4),
          wearableToday,
          adjacency: adjacencyScore(trend, profile),
          gapLine: wearableToday ? null : `One piece away: ${trend.entryPiece}.`,
          challengesAvoidRule: trendAvoidRuleConflict(trend, profile?.avoidRules),
          localeNote: local.note,
        } as TrendRemix,
        localeMultiplier: local.multiplier,
      };
    })
    .sort((a, b) => {
      const weight = (e: { remix: TrendRemix; localeMultiplier: number }) =>
        stageWeight(e.remix.trend.stage, adventurousness) *
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

/**
 * Loads trends, resolves the place's style scene, and builds the remix list
 * in one call - what screens use. Locale resolution is best-effort: no city
 * or an unreachable locale function simply means weather-only or fully
 * taste-driven ranking.
 */
export async function loadTrendRemixes(
  closetItems: Item[],
  profile?: ProfileMatchContext,
  locale?: LocaleContext
): Promise<TrendRemix[]> {
  const [trends, localeStyle] = await Promise.all([
    getPublishedTrends(),
    locale?.city && !locale.localeStyle
      ? getLocaleStyle(locale.city, locale.region, locale.country).catch(() => undefined)
      : Promise.resolve(locale?.localeStyle),
    // Warm the signals cache so per-trend dismissals and adventurousness are
    // read from storage, not an empty default, whichever screen calls first.
    shopperSignals.load().catch(() => undefined),
  ]);
  return buildRemixes(
    trends,
    closetItems,
    profile,
    locale ? { ...locale, localeStyle } : undefined
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
  const sig = `${reportSignature(top.map(r => r.trend.id), closetItems)}:${profile?.wardrobeFocus ?? 'all'}`;

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
        ? { city: locale.city, temperatureF: locale.temperature }
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
  buildRemixes,
  loadTrendRemixes,
  personalizeRemixes,
  wearableTrendLines,
};

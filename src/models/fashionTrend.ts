/**
 * Fashion Trend model.
 *
 * The external signal the recommendation pipeline never had. Every other
 * input to the engines - profile, closet, weather, wear history - is about
 * the user; a FashionTrend is about the world: what is genuinely moving in
 * fashion right now, where it is strongest, and how to buy into it.
 *
 * Trends live in the Firestore `trends` collection and go through the same
 * draft-then-publish flow as Edits: the AI drafts a trend report, a human on
 * the trend desk reviews it, and only published entries reach users. The
 * matchers below are deliberately the same coarse text-matching used
 * everywhere else in the app (avoid rules, wardrobe fit check), so a trend
 * can be scored against closet items and shop products with zero new
 * infrastructure.
 */

import { Item, Season } from '../types';

/** Where a trend is in its life. Drives how boldly it is recommended. */
export type TrendStage = 'emerging' | 'rising' | 'peak' | 'fading';

export type TrendStatus = 'draft' | 'published' | 'archived';

export interface FashionTrend {
  id: string;
  /** Short editorial name, e.g. "Wide-leg tailoring". */
  name: string;
  /** One or two sentences: what it is and why now. */
  summary: string;
  /** Where it is strongest right now, e.g. "Copenhagen", "Seoul", "Global". */
  region: string;
  stage: TrendStage;
  season: Season;
  year: number;
  /**
   * Lowercase garment words matched against item/product text
   * (name, subcategory, tags). These are the trend's anchors - owning one
   * means you can wear the trend today.
   */
  keyGarments: string[];
  /** Lowercase colour words. A colour match supports a trend, it doesn't anchor it. */
  keyColors: string[];
  /** Lowercase cut/fit words, e.g. "wide-leg", "oversized". Anchor-strength like garments. */
  silhouettes: string[];
  /** STYLE_ARCHETYPES keys this trend sits nearest, for adjacency scoring. */
  archetypes: string[];
  /** How to actually wear it with a normal wardrobe - the fashion-savvy part. */
  stylingNote: string;
  /** The single lowest-commitment way in, e.g. "wide-leg trousers in a neutral". */
  entryPiece: string;
  status: TrendStatus;
  source: 'editorial' | 'ai-draft';
  createdAt: string;
  publishedAt?: string;
}

export type TrendMatchKind = 'garment' | 'silhouette' | 'color';

/**
 * Whether a piece of garment text carries this trend, and how strongly.
 * A garment or silhouette hit anchors the trend; a colour hit only supports
 * it - a burgundy tee is not "the suede trend" because suede is brown.
 */
export function trendTextMatch(
  trend: FashionTrend,
  haystack: string,
  color?: string
): TrendMatchKind | null {
  const text = haystack.toLowerCase();
  if (trend.keyGarments.some(g => text.includes(g))) return 'garment';
  if (trend.silhouettes.some(s => text.includes(s))) return 'silhouette';
  const c = (color || '').toLowerCase();
  if (c && trend.keyColors.some(k => c.includes(k) || k.includes(c))) return 'color';
  return null;
}

function itemText(item: Item): string {
  return [
    item.name,
    item.subcategory,
    item.category,
    item.style,
    item.fitType,
    item.fabricTexture,
    ...(item.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function itemMatchesTrend(trend: FashionTrend, item: Item): TrendMatchKind | null {
  return trendTextMatch(trend, itemText(item), item.color);
}

export interface TrendCoverage {
  /** Owned pieces that carry the trend outright (garment or silhouette match). */
  anchors: Item[];
  /** Owned pieces that support it on colour alone. */
  supporting: Item[];
}

/** What of this trend the user already owns. The heart of Trend Remix. */
export function trendCoverage(trend: FashionTrend, closetItems: Item[]): TrendCoverage {
  const anchors: Item[] = [];
  const supporting: Item[] = [];
  closetItems.forEach(item => {
    const match = itemMatchesTrend(trend, item);
    if (match === 'garment' || match === 'silhouette') anchors.push(item);
    else if (match === 'color') supporting.push(item);
  });
  return { anchors, supporting };
}

/**
 * The avoid rule this trend runs up against, or null.
 *
 * Deliberately NOT a veto. Avoid rules are a strong preference the engines
 * respect by default, but trend is the bedrock of the app: a genuinely
 * current trend is allowed to challenge a "never". The contract every
 * caller must keep is honesty and demotion - a challenging trend ranks
 * below unchallenged ones and always says which rule it is crossing, so
 * the exception reads as an invitation, never as the app forgetting what
 * it was told.
 */
export function trendAvoidRuleConflict(trend: FashionTrend, avoidRules?: string[]): string | null {
  if (!avoidRules?.length) return null;
  const text = [trend.name, ...trend.keyGarments, ...trend.silhouettes, trend.entryPiece]
    .join(' ')
    .toLowerCase();
  return avoidRules.find(rule => text.includes(rule.toLowerCase())) || null;
}

/**
 * Ranking weight for a stage given how adventurous this user has proven to
 * be (0..1). Bold users see emerging trends early; cautious ones meet a trend
 * once it has already settled.
 */
export function stageWeight(stage: TrendStage, adventurousness: number): number {
  switch (stage) {
    case 'emerging':
      return 0.35 + 0.65 * adventurousness;
    case 'rising':
      return 0.85 + 0.15 * adventurousness;
    case 'peak':
      return 1;
    case 'fading':
      return 0.3;
  }
}

/** Compact one-liner for prompts: name, place, and how to use it. */
export function trendPromptLine(trend: FashionTrend): string {
  return `${trend.name} (${trend.stage}, strongest in ${trend.region}): ${trend.stylingNote}`;
}

/**
 * Garment words that imply a temperature. Deliberately coarse, same spirit as
 * seasonalFit's keyword lists: the goal is not pushing suede jackets on
 * someone in a 95° city, not simulating a climate model.
 */
const WARM_WEATHER_HINTS = [
  'linen', 'sheer', 'mesh', 'shorts', 'sandal', 'tank', 'camisole', 'mini',
  'organza', 'chiffon', 'swim', 'sundress',
];
const COLD_WEATHER_HINTS = [
  'coat', 'jacket', 'knit', 'sweater', 'wool', 'suede', 'boot', 'cardigan',
  'turtleneck', 'fleece', 'parka', 'layering', 'shearling', 'corduroy',
];

/**
 * How well a trend suits the weather where this user actually is, as a
 * ranking multiplier (≈0.45..1.15). A trend with no temperature implication
 * is neutral - most aren't about warmth at all.
 */
export function trendWeatherFit(trend: FashionTrend, temperatureF?: number): number {
  if (typeof temperatureF !== 'number') return 1;

  const text = [trend.name, ...trend.keyGarments, ...trend.silhouettes, trend.entryPiece]
    .join(' ')
    .toLowerCase();
  const leansWarm = WARM_WEATHER_HINTS.some(w => text.includes(w));
  const leansCold = COLD_WEATHER_HINTS.some(w => text.includes(w));
  if (leansWarm === leansCold) return 1;

  if (leansCold) {
    if (temperatureF >= 85) return 0.45;
    if (temperatureF >= 72) return 0.8;
    if (temperatureF <= 55) return 1.15;
    return 1;
  }
  // Warm-weather trend.
  if (temperatureF <= 45) return 0.45;
  if (temperatureF <= 60) return 0.8;
  if (temperatureF >= 75) return 1.15;
  return 1;
}

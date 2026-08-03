/**
 * Product matching.
 *
 * The old version emitted labels - "In your color season", "Suits your body &
 * fit profile". Those state that a match happened without ever saying what the
 * match was, which is exactly as persuasive as no reason at all.
 *
 * This version produces evidence. Every signal names the specific thing it
 * found: which colour, which silhouette, how many pieces it pairs with, what
 * it would cost per wear given how this person actually wears that category.
 * Each is countable from real data, so nothing here is a claim the app cannot
 * back up if the user goes looking.
 *
 * It also surfaces reasons NOT to buy. A recommender that only ever argues in
 * favour is advertising; one that says "you already own three of these" is
 * worth trusting the next time it says buy.
 */

import { Item } from '../types';
import { Product, MatchedProduct, isOnSale, discountPercent } from '../models/product';
import { ProfileMatchContext } from './profileMatchContext';
import { findCapsuleGaps } from './closetOrganizationService';
import { computeOutfitUnlock, unlockHeadline, OutfitUnlock, colorsWork } from './outfitUnlock';
import { forecastCostPerWear, spendProfile, budgetVerdict } from './costPerWearForecast';
import { seasonalFit, currentSeason } from './seasonalFit';
import { behaviouralAdjustment, ShopperSignals } from './shopperSignals';
import { Season } from '../types';
import { WeatherCondition } from './recommendationEngine';

/**
 * Everything that makes a ranking change over time rather than only when the
 * user edits their closet. All optional - scoring degrades to the purely
 * profile-based ranking when none of it is supplied.
 */
export interface MatchEnvironment {
  season?: Season;
  weather?: { condition: WeatherCondition; temperature: number };
  signals?: ShopperSignals;
}

/**
 * Signals that only a live retailer feed can provide.
 *
 * Every branch is guarded on the field being present, so this contributes
 * nothing against the placeholder catalogue and starts influencing rankings
 * the moment a real provider populates them - no rewiring at switchover.
 */
function inventorySignals(product: Product): MatchSignal[] {
  const out: MatchSignal[] = [];

  if (product.listedAt) {
    const days = (Date.now() - new Date(product.listedAt).getTime()) / 86_400_000;
    if (!isNaN(days) && days <= 14) {
      out.push({ kind: 'value', text: 'Just landed', strength: 'moderate' });
    }
  }

  if (typeof product.previousPrice === 'number' && product.previousPrice > product.price) {
    const drop = Math.round((1 - product.price / product.previousPrice) * 100);
    if (drop >= 5) {
      out.push({
        kind: 'value',
        text: `Price dropped ${drop}% since you last looked`,
        strength: 'strong',
      });
    }
  }

  // Scarcity only when the retailer actually reports it. Inventing urgency is
  // the fastest way to lose the trust the rest of this file is built on.
  if (product.stockLevel === 'low') {
    out.push({ kind: 'value', text: 'Low stock at this retailer', strength: 'minor' });
  }

  // A rating is only meaningful with enough reviews behind it.
  if (typeof product.rating === 'number' && (product.reviewCount ?? 0) >= 20 && product.rating >= 4.5) {
    out.push({
      kind: 'value',
      text: `${product.rating.toFixed(1)}★ from ${product.reviewCount} buyers`,
      strength: 'minor',
    });
  }

  return out;
}

const INVENTORY_WEIGHTS: Record<string, number> = {
  'Just landed': 8,
  'Low stock at this retailer': 3,
};

// Score needed to count as "matched" (Shop's "Matched to you" filter + the MATCH badge).
export const MATCH_THRESHOLD = 45;

export type SignalKind =
  | 'unlock'
  | 'color'
  | 'fit'
  | 'style'
  | 'gap'
  | 'value'
  | 'versatility'
  | 'concern';

export interface MatchSignal {
  kind: SignalKind;
  text: string;
  /** Drives ordering and emphasis in the UI. */
  strength: 'strong' | 'moderate' | 'minor';
}

const NEUTRAL_COLORS = ['black', 'white', 'gray', 'grey', 'navy', 'beige', 'cream', 'tan'];

const STRENGTH_ORDER: Record<MatchSignal['strength'], number> = {
  strong: 0,
  moderate: 1,
  minor: 2,
};

function matchedColorName(productColor: string, palette?: string[]): string | null {
  if (!palette?.length || !productColor) return null;
  const found = palette.find(
    c => c.toLowerCase().includes(productColor) || productColor.includes(c.toLowerCase())
  );
  return found || null;
}

/** The specific silhouette word that matched, so the reason can quote it. */
function matchedSilhouette(haystack: string, guidance?: string[]): string | null {
  if (!guidance?.length) return null;
  return guidance.find(g => haystack.includes(g.toLowerCase())) || null;
}

export function scoreProduct(
  product: Product,
  profile: ProfileMatchContext | undefined,
  closetItems: Item[],
  env: MatchEnvironment = {}
): MatchedProduct {
  if (!product.inStock) {
    return {
      product,
      matchScore: 0,
      matchReasons: ['Out of stock'],
      signals: [{ kind: 'concern', text: 'Out of stock', strength: 'strong' }],
      headline: 'Out of stock',
      concerns: ['Out of stock'],
      unlock: null,
    };
  }

  const productColor = (product.color || '').toLowerCase();
  const haystack = [product.name, product.subcategory, ...(product.styleTags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // A hard avoid-rule is a veto, not a penalty. The user told us not to show
  // them this; scoring it lower would still show it.
  const violatedRule = profile?.avoidRules?.find(
    rule => haystack.includes(rule.toLowerCase()) || productColor.includes(rule.toLowerCase())
  );
  if (violatedRule) {
    return {
      product,
      matchScore: 0,
      matchReasons: [`You asked to avoid ${violatedRule}`],
      signals: [{ kind: 'concern', text: `You asked to avoid ${violatedRule}`, strength: 'strong' }],
      headline: `You asked to avoid ${violatedRule}`,
      concerns: [`You asked to avoid ${violatedRule}`],
      unlock: null,
    };
  }

  let score = 40;
  const signals: MatchSignal[] = [];
  const concerns: string[] = [];

  // ---- Outfit unlock: the strongest signal, because it is about their
  // wardrobe rather than the product ----
  const unlock = computeOutfitUnlock(
    { category: product.category, color: product.color },
    closetItems
  );
  const unlockLine = unlockHeadline(unlock);
  if (unlockLine) {
    const weight = unlock.newOutfits >= 5 ? 28 : unlock.newOutfits >= 2 ? 20 : 12;
    score += weight;
    signals.push({
      kind: 'unlock',
      text:
        unlock.bestPairings.length > 0
          ? `${unlockLine} — including your ${unlock.bestPairings[0].label}`
          : unlockLine,
      strength: unlock.newOutfits >= 3 ? 'strong' : 'moderate',
    });
  } else if (unlock.pairsWith === 0 && closetItems.length > 3) {
    concerns.push("Doesn't pair with much you own yet");
    score -= 8;
  }

  // ---- Colour, named ----
  const paletteMatch = matchedColorName(productColor, profile?.recommendedColors);
  const avoidMatch = matchedColorName(productColor, profile?.colorsToAvoid);
  if (paletteMatch) {
    score += 25;
    signals.push({
      kind: 'color',
      text: profile?.colorSeason
        ? `${paletteMatch} sits in your ${profile.colorSeason} palette`
        : `${paletteMatch} is in your palette`,
      strength: 'strong',
    });
  } else if (avoidMatch) {
    score -= 20;
    concerns.push(
      profile?.colorSeason
        ? `${avoidMatch} is on your ${profile.colorSeason} avoid list`
        : `${avoidMatch} is a colour you're avoiding`
    );
  } else if (NEUTRAL_COLORS.includes(productColor)) {
    score += 8;
    signals.push({
      kind: 'color',
      text: `A neutral — it works with almost everything you own`,
      strength: 'minor',
    });
  }

  // ---- Fit, quoting the actual silhouette ----
  const categoryGuidance = profile?.categoryGuidance?.[product.category];
  const silhouette =
    matchedSilhouette(haystack, categoryGuidance) ||
    matchedSilhouette(haystack, profile?.recommendedSilhouettes) ||
    matchedSilhouette(haystack, profile?.bodyMatchKeywords);
  if (silhouette) {
    score += 20;
    signals.push({
      kind: 'fit',
      text: profile?.bodyTypeLabel
        ? `The ${silhouette} cut is one your ${profile.bodyTypeLabel} guidance calls for`
        : `The ${silhouette} cut suits your fit profile`,
      strength: 'strong',
    });
  }

  // ---- Style archetype, named ----
  const archetype = profile?.styleArchetypes?.find(a => haystack.includes(a.toLowerCase()));
  if (archetype) {
    score += 15;
    signals.push({
      kind: 'style',
      text: `Reads ${archetype}, which is how you've described your style`,
      strength: 'moderate',
    });
  }

  // ---- Gap, made concrete ----
  const ownedInCategory = closetItems.filter(i => i.category === product.category);
  const gaps = findCapsuleGaps(closetItems);
  if (gaps.some(g => g.category === product.category)) {
    score += 20;
    signals.push({
      kind: 'gap',
      text:
        ownedInCategory.length === 0
          ? `You own no ${product.category} at all — this is a real hole in your wardrobe`
          : `You're thin on ${product.category} — only ${ownedInCategory.length} in your closet`,
      strength: 'strong',
    });
  }

  // ---- Duplication, stated honestly ----
  const duplicates = closetItems.filter(
    i => i.category === product.category && (i.color || '').toLowerCase() === productColor
  );
  if (duplicates.length > 0) {
    score -= 15;
    const unworn = duplicates.filter(d => (d.wornCount ?? 0) === 0).length;
    concerns.push(
      unworn > 0
        ? `You already own ${duplicates.length} ${productColor} ${product.category}, and ${unworn} ${unworn === 1 ? 'has' : 'have'} never been worn`
        : `You already own ${duplicates.length} ${productColor} ${product.category}`
    );
  }

  // ---- What it would actually cost them ----
  const forecast = forecastCostPerWear(closetItems, product.category, product.price);
  if (forecast.verdict !== 'unknown' && forecast.projectedCostPerWear !== null) {
    if (forecast.verdict === 'strong') {
      score += 12;
      signals.push({
        kind: 'value',
        text: `Going by how you wear ${product.category}, about $${forecast.projectedCostPerWear.toFixed(2)} a wear`,
        strength: 'moderate',
      });
    } else if (forecast.verdict === 'poor') {
      score -= 6;
      concerns.push(
        `At your rate for ${product.category}, that's around $${forecast.projectedCostPerWear.toFixed(2)} per wear`
      );
    }
  }

  // ---- Budget, inferred rather than configured ----
  const budget = budgetVerdict(spendProfile(closetItems, product.category), product.price);
  if (budget && !budget.withinBudget) {
    score -= 5;
    concerns.push(budget.label);
  }

  // ---- Value ----
  if (isOnSale(product)) {
    const off = discountPercent(product);
    score += 6;
    signals.push({
      kind: 'value',
      text: off ? `${off}% off right now` : 'On sale',
      strength: 'minor',
    });
  }

  // ---- Versatility across what they own ----
  const compatibleShare =
    closetItems.length > 0
      ? closetItems.filter(i => colorsWork(productColor, i.color || '')).length / closetItems.length
      : 0;
  if (compatibleShare >= 0.7 && closetItems.length >= 6) {
    score += 8;
    signals.push({
      kind: 'versatility',
      text: `Sits with ${Math.round(compatibleShare * 100)}% of your wardrobe`,
      strength: 'minor',
    });
  }

  // ---- Seasonality: the slow clock that makes rankings move on their own ----
  const season = seasonalFit(product, env.season ?? currentSeason(), env.weather);
  score += season.weight;
  if (season.reason) {
    signals.push({
      kind: 'versatility',
      text: season.reason,
      strength: season.weight >= 18 ? 'strong' : 'moderate',
    });
  } else if (season.outOfSeason) {
    concerns.push('Out of season right now');
  }

  // ---- Live inventory: silent today, active the moment a real feed lands ----
  const inventory = inventorySignals(product);
  inventory.forEach(signal => {
    score += INVENTORY_WEIGHTS[signal.text] ?? (signal.strength === 'strong' ? 10 : 4);
    signals.push(signal);
  });

  // ---- Behaviour: novelty decay + what they've actually engaged with ----
  let suppressed = false;
  if (env.signals) {
    const behaviour = behaviouralAdjustment(product, env.signals);
    score += behaviour.weight;
    suppressed = behaviour.suppressed;
    if (behaviour.reason) {
      signals.push({ kind: 'style', text: behaviour.reason, strength: 'moderate' });
    }
  }

  const ordered = [...signals].sort(
    (a, b) => STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength]
  );

  if (suppressed) {
    return {
      product,
      matchScore: 0,
      matchReasons: ['You dismissed this'],
      signals: [],
      headline: 'You dismissed this',
      concerns: [],
      unlock,
    };
  }

  return {
    product,
    matchScore: Math.max(0, Math.min(100, Math.round(score))),
    // Kept for any consumer still reading the old flat list.
    matchReasons: ordered.map(s => s.text),
    signals: ordered,
    headline: ordered[0]?.text || 'Worth a look',
    concerns,
    unlock,
  };
}

export function scoreAndRankProducts(
  products: Product[],
  profile: ProfileMatchContext | undefined,
  closetItems: Item[],
  env: MatchEnvironment = {}
): MatchedProduct[] {
  return products
    .map(p => scoreProduct(p, profile, closetItems, env))
    // Dismissed products drop out entirely rather than sitting at the bottom.
    // Someone who said no should not have to scroll past it again.
    .filter(p => p.headline !== 'You dismissed this')
    .sort((a, b) => b.matchScore - a.matchScore);
}

export type { OutfitUnlock };

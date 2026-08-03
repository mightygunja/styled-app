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
  closetItems: Item[]
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

  const ordered = [...signals].sort(
    (a, b) => STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength]
  );

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
  closetItems: Item[]
): MatchedProduct[] {
  return products
    .map(p => scoreProduct(p, profile, closetItems))
    .sort((a, b) => b.matchScore - a.matchScore);
}

export type { OutfitUnlock };

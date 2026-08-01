/**
 * In-Store Snap-to-Check
 *
 * Photograph an item before buying it and get a verdict grounded in three
 * things Styled already knows about the user: their color season, their
 * body/fit guidance, and their style profile - plus a check against what
 * they already own, which no photo-only competitor can do.
 */

import { ColorSeason } from './personalStyleProfile';

export interface StoreItemClassification {
  category: string;
  subcategory: string;
  color: string;
  pattern: string;
  style: string;
}

export interface VerdictDetail {
  matches: boolean | null; // null when we don't have enough profile data to judge this dimension
  reasoning: string;
}

export type OverallVerdict = 'buy' | 'maybe' | 'skip';

export interface OwnedItemMatch {
  itemId: string;
  color: string;
  subcategory: string;
  imageUrl: string;
  price: number | null;
  wornCount: number;
  costPerWear: number | null;
}

export interface StoreCheckResult {
  classification: StoreItemClassification;
  colorVerdict: VerdictDetail;
  fitVerdict: VerdictDetail;
  styleVerdict: VerdictDetail;
  overallVerdict: OverallVerdict;
  overallReasoning: string;
  analyzedAt: string;
}

/**
 * Deterministic, client-side duplicate check against the user's real closet -
 * no AI call, instant, and the reason this feature can do more than a
 * standalone style score: matches by category + color (+ subcategory when
 * both items have one), then ranks by cost-per-wear so the highest-value
 * "you already have this" comparison surfaces first.
 */
export function findSimilarOwnedItems(
  classification: StoreItemClassification,
  closetItems: Array<{
    id: string;
    category?: string;
    subcategory?: string;
    color?: string;
    imageUrl?: string;
    price?: number | null;
    wornCount?: number;
  }>
): OwnedItemMatch[] {
  const targetColor = classification.color.toLowerCase();
  const targetSub = classification.subcategory.toLowerCase();

  const matches = closetItems
    .filter(item => {
      if (!item.category || item.category !== classification.category) return false;
      const colorMatch = (item.color || '').toLowerCase() === targetColor;
      const subMatch = item.subcategory && targetSub
        ? item.subcategory.toLowerCase() === targetSub
        : false;
      return colorMatch || subMatch;
    })
    .map((item): OwnedItemMatch => {
      const wornCount = item.wornCount || 0;
      const price = typeof item.price === 'number' ? item.price : null;
      return {
        itemId: item.id,
        color: item.color || '',
        subcategory: item.subcategory || classification.category,
        imageUrl: item.imageUrl || '',
        price,
        wornCount,
        costPerWear: price !== null && wornCount > 0 ? Math.round((price / wornCount) * 100) / 100 : null,
      };
    })
    // Cheapest cost-per-wear (best-proven value) first; unworn/no-price items last
    .sort((a, b) => {
      if (a.costPerWear === null && b.costPerWear === null) return 0;
      if (a.costPerWear === null) return 1;
      if (b.costPerWear === null) return -1;
      return a.costPerWear - b.costPerWear;
    });

  return matches.slice(0, 5);
}

/** Formats a color season into a short phrase for use in verdict copy. */
export function describeSeasonFit(season: ColorSeason | undefined, isRecommended: boolean | null): string {
  if (!season || isRecommended === null) return '';
  return isRecommended
    ? `Fits your ${season} palette`
    : `Outside your ${season} palette`;
}

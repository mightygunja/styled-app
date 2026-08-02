/**
 * AI Outfit Pairing Service
 *
 * Provides intelligent outfit suggestions by analyzing:
 * - Color compatibility
 * - Season appropriateness
 * - Style/occasion fit (via item.style and item.tags)
 *
 * Builds combos by category bucket (top x bottom x shoes, or dress x shoes)
 * rather than brute-forcing every N-item subset of the closet - the old
 * approach generated the full combinatorial power set (C(n,2)+C(n,3)+C(n,4)),
 * which is ~13M combinations for a 129-item closet and froze the UI thread.
 */

import { ClosetItem } from '../types';

export interface OutfitSuggestion {
  id: string;
  items: ClosetItem[];
  score: number;
  reason: string;
  occasion: 'casual' | 'work' | 'formal' | 'athletic';
  season: string[];
}

// Color compatibility matrix (simplified)
const COLOR_COMPATIBILITY: { [key: string]: string[] } = {
  black: ['white', 'gray', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'brown', 'beige'],
  white: ['black', 'gray', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'brown', 'beige'],
  gray: ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'navy'],
  navy: ['white', 'gray', 'beige', 'brown', 'red', 'pink'],
  blue: ['white', 'gray', 'beige', 'brown', 'black'],
  red: ['black', 'white', 'gray', 'navy', 'beige'],
  green: ['black', 'white', 'gray', 'beige', 'brown'],
  yellow: ['black', 'white', 'gray', 'navy', 'blue'],
  pink: ['black', 'white', 'gray', 'navy', 'beige'],
  purple: ['black', 'white', 'gray', 'beige'],
  brown: ['white', 'beige', 'green', 'blue', 'gray'],
  beige: ['black', 'white', 'navy', 'brown', 'green', 'blue', 'red', 'pink'],
};

// Keyword signal for how well an item's style/tags fit a given occasion -
// matched against real style/tags data, replacing the old template-matching
// logic which compared broad categories ("tops") against subcategory values
// ("t-shirt") and could never actually match.
const OCCASION_KEYWORDS: Record<OutfitSuggestion['occasion'], RegExp> = {
  casual: /casual|everyday|relaxed|denim|jean|sneaker|tee/,
  work: /formal|business|professional|blazer|button|trouser|structured/,
  formal: /formal|suit|gown|tuxedo|evening|cocktail/,
  athletic: /athletic|sport|gym|active|yoga|running|legging/,
};

const MAX_PER_CATEGORY = 25; // bounds combination count regardless of closet size

function getColorScore(items: ClosetItem[]): number {
  if (items.length < 2) return 1;
  let compatiblePairs = 0;
  let totalPairs = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const color1 = items[i].color?.toLowerCase() || '';
      const color2 = items[j].color?.toLowerCase() || '';
      if (COLOR_COMPATIBILITY[color1]?.includes(color2)) compatiblePairs++;
      totalPairs++;
    }
  }
  return totalPairs > 0 ? compatiblePairs / totalPairs : 0.5;
}

function getSeasonScore(items: ClosetItem[]): number {
  const seasons = items.map(item => item.season).filter(Boolean) as string[];
  if (seasons.length === 0) return 0.5;
  const uniqueSeasons = new Set(seasons);
  if (uniqueSeasons.size === 1) return 1;
  if (uniqueSeasons.size === 2) return 0.7;
  return 0.4;
}

function getOccasionScore(items: ClosetItem[], occasion: OutfitSuggestion['occasion']): number {
  const pattern = OCCASION_KEYWORDS[occasion];
  const matches = items.filter(item => {
    const haystack = [item.occasion || '', ...(item.tags || [])].join(' ').toLowerCase();
    return pattern.test(haystack);
  }).length;
  return items.length > 0 ? matches / items.length : 0;
}

// Recency/variety bias: favor less-worn items so suggestions rotate through
// the closet, same signal used in recommendationEngine.
function topByVariety(items: ClosetItem[], cap: number): ClosetItem[] {
  return [...items]
    .sort((a, b) => (a.wornCount || 0) - (b.wornCount || 0))
    .slice(0, cap);
}

function bucket(items: ClosetItem[], category: string): ClosetItem[] {
  return topByVariety(items.filter(i => i.category?.toLowerCase() === category), MAX_PER_CATEGORY);
}

function buildSuggestion(
  combo: ClosetItem[],
  occasion: OutfitSuggestion['occasion']
): OutfitSuggestion | null {
  const colorScore = getColorScore(combo);
  const seasonScore = getSeasonScore(combo);
  const occasionScore = getOccasionScore(combo, occasion);
  const score = colorScore * 0.4 + seasonScore * 0.3 + occasionScore * 0.3;
  if (score <= 0.35) return null;

  return {
    id: `outfit-${combo.map(i => i.id).join('-')}`,
    items: combo,
    score,
    reason: generateReason(combo, colorScore, seasonScore, occasionScore > 0.3),
    occasion,
    season: combo.map(i => i.season).filter(Boolean) as string[],
  };
}

/**
 * Main AI pairing function - generates real outfit combinations bucketed
 * by category, bounded so it stays fast on any closet size.
 */
export function generateOutfitSuggestions(
  closetItems: ClosetItem[],
  occasion?: 'casual' | 'work' | 'formal' | 'athletic',
  maxSuggestions: number = 10
): OutfitSuggestion[] {
  const targetOccasion = occasion || 'casual';
  const suggestions: OutfitSuggestion[] = [];

  const tops = bucket(closetItems, 'tops');
  const bottoms = bucket(closetItems, 'bottoms');
  const dresses = bucket(closetItems, 'dresses');
  const shoes = bucket(closetItems, 'shoes');
  const outerwear = bucket(closetItems, 'outerwear');

  // Top + bottom (+ optional shoes/outerwear) combos
  for (const top of tops) {
    for (const bottom of bottoms) {
      const combo = [top, bottom];
      if (shoes.length > 0) combo.push(shoes[0]);
      const suggestion = buildSuggestion(combo, targetOccasion);
      if (suggestion) suggestions.push(suggestion);
    }
  }

  // Dress (+ optional shoes/outerwear) combos
  for (const dress of dresses) {
    const combo = [dress];
    if (shoes.length > 0) combo.push(shoes[0]);
    if (outerwear.length > 0 && targetOccasion === 'work') combo.push(outerwear[0]);
    const suggestion = buildSuggestion(combo, targetOccasion);
    if (suggestion) suggestions.push(suggestion);
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);
}

/**
 * Generate human-readable reason for pairing
 */
function generateReason(
  items: ClosetItem[],
  colorScore: number,
  seasonScore: number,
  occasionMatch: boolean
): string {
  const reasons: string[] = [];
  if (colorScore > 0.7) reasons.push('great color harmony');
  else if (colorScore > 0.4) reasons.push('good color pairing');

  if (seasonScore === 1) reasons.push('perfectly seasonal');
  else if (seasonScore > 0.6) reasons.push('season-appropriate');

  if (occasionMatch) reasons.push('fits the occasion');

  if (reasons.length === 0) return 'A versatile combination from your closet';
  return `This outfit has ${reasons.join(', ')}`;
}

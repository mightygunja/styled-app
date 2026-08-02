/**
 * Scores marketplace products against a user's real style profile and real
 * closet - same "grounded in what you actually own/suit" principle as the
 * capsule wardrobe builder, applied to shopping instead of organizing.
 */

import { Item } from '../types';
import { Product, MatchedProduct } from '../models/product';
import { ProfileMatchContext } from './profileMatchContext';
import { findCapsuleGaps } from './closetOrganizationService';

const NEUTRAL_COLORS = ['black', 'white', 'gray', 'grey', 'navy', 'beige', 'cream', 'tan'];

// Score needed to count as "matched" (Shop's "Matched to you" filter + the MATCH badge).
// Baseline is 40; a single real personalization signal (color season, body/fit, style
// archetype, or filling a real closet gap) is enough to cross it. Without this being low
// enough, a user whose profile only has ONE strong signal populated (e.g. a wardrobe gap
// in just one category) sees "matched" collapse to almost only that category, since
// nothing else has any signal to add to the neutral-color baseline.
export const MATCH_THRESHOLD = 45;

export function scoreProduct(
  product: Product,
  profile: ProfileMatchContext | undefined,
  closetItems: Item[]
): MatchedProduct {
  let score = 40; // baseline so an unmatched product still shows up, just lower
  const reasons: string[] = [];

  if (!product.inStock) {
    return { product, matchScore: 0, matchReasons: ['Out of stock'] };
  }

  const productColor = (product.color || '').toLowerCase();
  const haystack = [product.name, ...(product.styleTags || [])].join(' ').toLowerCase();

  if (profile?.avoidRules?.some(rule => haystack.includes(rule.toLowerCase()) || productColor.includes(rule.toLowerCase()))) {
    return { product, matchScore: 0, matchReasons: ["Matches something you've asked to avoid"] };
  }

  if (profile?.recommendedColors?.some(c => c.toLowerCase().includes(productColor) || productColor.includes(c.toLowerCase()))) {
    score += 25;
    reasons.push('In your color season');
  } else if (profile?.colorsToAvoid?.some(c => c.toLowerCase().includes(productColor) || productColor.includes(c.toLowerCase()))) {
    score -= 20;
  } else if (NEUTRAL_COLORS.includes(productColor)) {
    score += 8;
  }

  if (profile?.bodyMatchKeywords?.some(kw => haystack.includes(kw.toLowerCase()))) {
    score += 20;
    reasons.push('Suits your body & fit profile');
  }

  if (profile?.styleArchetypes?.some(a => haystack.includes(a.toLowerCase()))) {
    score += 15;
    reasons.push('Matches your style archetype');
  }

  // Closet-gap awareness: a category the user owns zero of gets a real boost,
  // same signal the capsule builder surfaces as "you have 0 shoes."
  const gaps = findCapsuleGaps(closetItems);
  if (gaps.some(g => g.category === product.category)) {
    score += 20;
    reasons.push(`Fills a gap in your closet - you have no ${product.category}`);
  }

  // Duplicate awareness: already own something very similar in this category/color
  const ownsSimilar = closetItems.some(
    item => item.category === product.category && (item.color || '').toLowerCase() === productColor
  );
  if (ownsSimilar) {
    score -= 15;
    reasons.push(`You already own ${productColor || 'a similar color'} ${product.category}`);
  }

  if (product.originalPrice && product.originalPrice > product.price) {
    reasons.push('On sale');
  }

  return {
    product,
    matchScore: Math.max(0, Math.min(100, Math.round(score))),
    matchReasons: reasons,
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

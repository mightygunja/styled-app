/**
 * Smart Gap Analysis Service
 * 
 * Plus tier feature: Identifies strategic wardrobe gaps that would unlock more outfits.
 * 
 * CRITICAL RULES:
 * - Never pushy or sales-y
 * - Always optional ("no rush")
 * - Focus on versatility, not quantity
 * - Only suggest 1 item at a time
 * - No shopping links
 */

import { ClosetItem, ClothingCategory } from '../models/closetItem';
import { PersonalStyleProfile } from '../models/personalStyleProfile';

export interface SmartGap {
  category: ClothingCategory;
  description: string;
  reason: string;
  impact: string; // e.g., "Would unlock 5+ new outfit combinations"
}

/**
 * Analyze closet for strategic gaps
 * 
 * Returns the single most impactful item that would unlock more outfits.
 * Plus tier only.
 */
export function analyzeSmartGap(
  closet: ClosetItem[],
  styleProfile: PersonalStyleProfile
): SmartGap | null {
  // Need at least 5 items to suggest gaps
  if (closet.length < 5) {
    return null;
  }

  const categories = new Set(closet.map(item => item.category));
  const categoryCount: Record<ClothingCategory, number> = {
    top: 0,
    bottom: 0,
    dress: 0,
    outerwear: 0,
    shoe: 0,
    accessory: 0,
  };

  // Count items per category
  closet.forEach(item => {
    categoryCount[item.category]++;
  });

  // Identify the most impactful gap
  // Priority: outerwear > shoes > bottoms > tops

  // Check for outerwear gap (most versatile)
  if (categoryCount.outerwear === 0 && closet.length >= 6) {
    return {
      category: 'outerwear',
      description: 'One versatile layer would unlock more outfits — no rush.',
      reason: 'Adds layering options to your existing pieces',
      impact: 'Would create 10+ new outfit combinations',
    };
  }

  // Check for shoes gap
  if (categoryCount.shoe < 2 && closet.length >= 5) {
    return {
      category: 'shoe',
      description: 'A second pair of shoes would unlock more outfits — no rush.',
      reason: 'Gives you more styling flexibility',
      impact: 'Would create 5+ new outfit combinations',
    };
  }

  // Check for bottoms gap
  if (categoryCount.bottom < 2 && categoryCount.top >= 3) {
    return {
      category: 'bottom',
      description: 'One more bottom would unlock more outfits — no rush.',
      reason: 'Pairs with your existing tops',
      impact: 'Would create 6+ new outfit combinations',
    };
  }

  // Check for tops gap
  if (categoryCount.top < 3 && categoryCount.bottom >= 2) {
    return {
      category: 'top',
      description: 'One more top would unlock more outfits — no rush.',
      reason: 'Pairs with your existing bottoms',
      impact: 'Would create 4+ new outfit combinations',
    };
  }

  // No significant gaps
  return null;
}

/**
 * Get user-friendly message for smart gap
 * 
 * Always optional, never pushy.
 */
export function getSmartGapMessage(gap: SmartGap | null): string | null {
  if (!gap) {
    return null;
  }

  return gap.description;
}

/**
 * Check if user should see smart gap suggestion
 * 
 * Plus tier only, and only if there's a meaningful gap.
 */
export function shouldShowSmartGap(
  closet: ClosetItem[],
  tier: 'free' | 'plus' | 'premium'
): boolean {
  // Plus and Premium only
  if (tier === 'free') {
    return false;
  }

  // Need at least 5 items
  if (closet.length < 5) {
    return false;
  }

  // Check if there's a gap
  const gap = analyzeSmartGap(closet, {} as PersonalStyleProfile);
  return gap !== null;
}

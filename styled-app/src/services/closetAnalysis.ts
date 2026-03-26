/**
 * Closet Analysis Service
 * 
 * CRITICAL: Sparse closets will kill confidence if mishandled.
 * Rule: NEVER say "you don't have enough clothes."
 * 
 * Instead: Focus on what they CAN do with what they have.
 */

import { ClosetItem } from '../models/closetItem';

/**
 * Detect if a closet is sparse
 * 
 * A closet is considered sparse if:
 * - Less than 8 items total, OR
 * - Less than 3 different categories
 * 
 * @param closet - Array of closet items
 * @returns true if closet is sparse, false otherwise
 */
export function isClosetSparse(closet: ClosetItem[]): boolean {
  const categories = new Set(closet.map(item => item.category));
  return closet.length < 8 || categories.size < 3;
}

/**
 * Get supportive messaging for sparse closets
 * 
 * NEVER negative. Always empowering.
 */
export function getSparseClosetMessage(closet: ClosetItem[]): {
  title: string;
  message: string;
  actionText: string;
} {
  const itemCount = closet.length;
  const categories = new Set(closet.map(item => item.category));
  const categoryCount = categories.size;

  // Use exact copy for all sparse closet scenarios
  // Different messages based on what they have
  if (itemCount === 0) {
    return {
      title: "You're off to a great start.",
      message: "Styled works with what you already own. As your closet grows, your outfits will too.",
      actionText: "Add 1–2 more pieces when you're ready",
    };
  }

  if (itemCount < 5) {
    return {
      title: "You're off to a great start.",
      message: "Styled works with what you already own. As your closet grows, your outfits will too.",
      actionText: "Add 1–2 more pieces when you're ready",
    };
  }

  if (categoryCount < 3) {
    return {
      title: "You're off to a great start.",
      message: "Styled works with what you already own. As your closet grows, your outfits will too.",
      actionText: "Add 1–2 more pieces when you're ready",
    };
  }

  // Shouldn't reach here if sparse, but just in case
  return {
    title: "You're all set!",
    message: "Your closet is ready for outfit generation.",
    actionText: "Generate Outfits",
  };
}

/**
 * Get outfit generation strategy for sparse closets
 * 
 * Returns guidance on how to generate outfits with limited items.
 */
export function getSparseClosetStrategy(closet: ClosetItem[]): {
  canGenerateOutfits: boolean;
  strategy: 'minimal' | 'basic' | 'full';
  message: string;
} {
  const itemCount = closet.length;
  const categories = new Set(closet.map(item => item.category));
  const categoryCount = categories.size;

  // Need at least 3 items from 2 categories
  if (itemCount < 3 || categoryCount < 2) {
    return {
      canGenerateOutfits: false,
      strategy: 'minimal',
      message: "Add a few more items to start creating outfits. We'll work with whatever you have!",
    };
  }

  // Can generate basic outfits
  if (itemCount < 8 || categoryCount < 3) {
    return {
      canGenerateOutfits: true,
      strategy: 'basic',
      message: "We'll create outfits with what you have. Add more items anytime to see more combinations.",
    };
  }

  // Full outfit generation
  return {
    canGenerateOutfits: true,
    strategy: 'full',
    message: "Your closet is ready for full outfit generation!",
  };
}

/**
 * Analyze closet composition
 * 
 * Provides insights without being judgmental.
 */
export function analyzeClosetComposition(closet: ClosetItem[]): {
  itemCount: number;
  categoryCount: number;
  categories: string[];
  missingCategories: string[];
  isBalanced: boolean;
} {
  const categories = new Set(closet.map(item => item.category));
  const categoryList = Array.from(categories);

  // Essential categories for outfit generation
  const essentialCategories = ['tops', 'bottoms', 'shoes', 'outerwear', 'dresses'];
  const missingCategories = essentialCategories.filter(cat => !categories.has(cat));

  // Balanced if has at least 3 essential categories
  const isBalanced = categoryList.filter(cat => essentialCategories.includes(cat)).length >= 3;

  return {
    itemCount: closet.length,
    categoryCount: categories.size,
    categories: categoryList,
    missingCategories,
    isBalanced,
  };
}

/**
 * Get helpful suggestions for building out a sparse closet
 * 
 * Focuses on what would unlock more outfit possibilities.
 */
export function getSparseClosetSuggestions(closet: ClosetItem[]): string[] {
  const analysis = analyzeClosetComposition(closet);
  const suggestions: string[] = [];

  // Prioritize suggestions based on what's missing
  if (!analysis.categories.includes('tops')) {
    suggestions.push("Add a versatile top to create more outfit combinations");
  }

  if (!analysis.categories.includes('bottoms')) {
    suggestions.push("Add pants or a skirt to expand your options");
  }

  if (!analysis.categories.includes('shoes')) {
    suggestions.push("Add shoes to complete your outfits");
  }

  if (analysis.itemCount < 5) {
    suggestions.push("Add a few more pieces you already own and love");
  }

  if (analysis.categoryCount < 3) {
    suggestions.push("Mix in items from different categories for more variety");
  }

  // If no specific suggestions, give general encouragement
  if (suggestions.length === 0) {
    suggestions.push("You're doing great! Keep adding pieces as you discover them");
  }

  return suggestions;
}

/**
 * Check if outfit generation should be allowed
 * 
 * More lenient than isClosetSparse - we want to try even with limited items.
 */
export function canGenerateOutfits(closet: ClosetItem[]): boolean {
  const categories = new Set(closet.map(item => item.category));
  
  // Minimum requirements:
  // - At least 3 items
  // - At least 2 different categories
  return closet.length >= 3 && categories.size >= 2;
}

/**
 * Get confidence-building message for outfit generation
 * 
 * Always positive, never apologetic.
 */
export function getOutfitGenerationMessage(closet: ClosetItem[]): string {
  const itemCount = closet.length;

  if (itemCount < 8) {
    return "Here's what we can create with your current pieces. Add more items anytime to see more combinations!";
  }

  return "Here are personalized outfit ideas based on your closet and style preferences.";
}

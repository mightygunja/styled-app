/**
 * Closet Health Service
 * 
 * Goal: Emotional reinforcement through positive insights.
 * 
 * Plus tier feature with free tier teaser (blurred).
 * Shows users their wardrobe is working together.
 */

import { ClosetItem } from '../models/closetItem';
import { PersonalStyleProfile } from '../models/personalStyleProfile';

export interface ClosetHealthScore {
  overall: number; // 0-100
  versatility: number; // How many outfit combinations possible
  styleAlignment: number; // How well items match PersonalStyleProfile
  colorHarmony: number; // How well colors work together
  gapAnalysis: string[]; // Strategic gaps (if any)
}

export interface ClosetHealthInsight {
  title: string;
  message: string;
  positive: boolean; // Always true - we only show positive insights
}

/**
 * Calculate closet health score
 * Plus tier only - shows blurred teaser for free users
 */
export function calculateClosetHealth(
  closet: ClosetItem[],
  styleProfile: PersonalStyleProfile
): ClosetHealthScore {
  // Versatility: How many outfit combinations are possible
  const versatility = Math.min(100, (closet.length * 3)); // Rough estimate

  // Style alignment: How many items match user's style archetypes
  const matchingItems = closet.filter(item => {
    const itemTags = item.tags || [];
    return styleProfile.styleArchetypes.some(archetype =>
      itemTags.some(tag => tag.toLowerCase().includes(archetype.toLowerCase()))
    );
  });
  const styleAlignment = closet.length > 0 
    ? Math.round((matchingItems.length / closet.length) * 100)
    : 0;

  // Color harmony: How many items are in user's color palette
  const colorMatchingItems = closet.filter(item =>
    item.colors.some(color =>
      [...styleProfile.colorProfile.primary, ...styleProfile.colorProfile.secondary].some(
        preferred => color.toLowerCase().includes(preferred.toLowerCase())
      )
    )
  );
  const colorHarmony = closet.length > 0
    ? Math.round((colorMatchingItems.length / closet.length) * 100)
    : 0;

  // Overall score (weighted average)
  const overall = Math.round(
    (versatility * 0.4) + (styleAlignment * 0.3) + (colorHarmony * 0.3)
  );

  // Gap analysis (strategic suggestions)
  const categories = new Set(closet.map(item => item.category));
  const gapAnalysis: string[] = [];
  
  if (!categories.has('outerwear') && closet.length > 5) {
    gapAnalysis.push('A versatile layer would unlock more combinations');
  }
  if (categories.size < 3) {
    gapAnalysis.push('Adding variety in categories creates more options');
  }

  return {
    overall,
    versatility,
    styleAlignment,
    colorHarmony,
    gapAnalysis,
  };
}

/**
 * Get positive insights about closet health
 * Always encouraging, never negative
 */
export function getClosetHealthInsights(
  closet: ClosetItem[],
  styleProfile: PersonalStyleProfile
): ClosetHealthInsight[] {
  const health = calculateClosetHealth(closet, styleProfile);
  const insights: ClosetHealthInsight[] = [];

  // Always start with positive framing
  insights.push({
    title: "You're building a wardrobe that works together.",
    message: `${closet.length} pieces that reflect your style`,
    positive: true,
  });

  // Versatility insight
  if (health.versatility > 60) {
    insights.push({
      title: "Great versatility!",
      message: "Your pieces create many outfit combinations",
      positive: true,
    });
  }

  // Style alignment insight
  if (health.styleAlignment > 70) {
    insights.push({
      title: "Strong style consistency",
      message: "Most items align with your style preferences",
      positive: true,
    });
  }

  // Color harmony insight
  if (health.colorHarmony > 70) {
    insights.push({
      title: "Cohesive color palette",
      message: "Your colors work beautifully together",
      positive: true,
    });
  }

  return insights;
}

/**
 * Get teaser message for free users
 * Shows value without full access
 */
export function getClosetHealthTeaser(): string {
  return "Unlock insights about your wardrobe's versatility and style alignment";
}

/**
 * User Model
 * 
 * Core user entity with StyleDNA integration for personalized styling
 */

import { StyleDNA } from './styleDNA';

export type SubscriptionTier = "free" | "plus" | "premium";

export interface User {
  id: string;
  name: string;
  email?: string;
  profileImageUrl?: string;
  
  /**
   * StyleDNA belongs on the User, not individual outfits.
   * 
   * Rationale:
   * - StyleDNA represents the user's inherent style preferences, lifestyle needs,
   *   and aesthetic identity - it's about WHO they are, not WHAT they wear.
   * - It's used to filter, score, and recommend items/outfits that match the user.
   * - Outfits are ephemeral combinations; StyleDNA is the persistent profile
   *   that guides all styling decisions across the entire wardrobe.
   * - A single user has one evolving style identity, but creates many outfits.
   */
  styleDNA?: StyleDNA;
  
  subscriptionTier: SubscriptionTier;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Subscription tier features
 */
export const SUBSCRIPTION_FEATURES = {
  free: {
    name: "Free",
    features: [
      "Basic closet management",
      "Simple outfit suggestions",
      "Limited AI recommendations",
    ],
    maxClosetItems: 50,
    aiRecommendationsPerMonth: 10,
  },
  plus: {
    name: "Plus",
    features: [
      "Unlimited closet items",
      "Advanced AI styling assistant",
      "Style DNA profile",
      "Color analysis",
      "Outfit planning",
    ],
    maxClosetItems: Infinity,
    aiRecommendationsPerMonth: 100,
  },
  premium: {
    name: "Premium",
    features: [
      "Everything in Plus",
      "Personal stylist consultations",
      "Priority support",
      "Advanced analytics",
      "Shopping recommendations",
      "Trend predictions",
    ],
    maxClosetItems: Infinity,
    aiRecommendationsPerMonth: Infinity,
  },
} as const;

/**
 * Check if user has access to a feature based on subscription tier
 */
export function hasFeatureAccess(
  user: User,
  feature: 'styleDNA' | 'advancedAI' | 'personalStylist' | 'analytics'
): boolean {
  switch (feature) {
    case 'styleDNA':
      return user.subscriptionTier === 'plus' || user.subscriptionTier === 'premium';
    case 'advancedAI':
      return user.subscriptionTier === 'plus' || user.subscriptionTier === 'premium';
    case 'personalStylist':
      return user.subscriptionTier === 'premium';
    case 'analytics':
      return user.subscriptionTier === 'premium';
    default:
      return false;
  }
}

/**
 * Check if user has completed their Style DNA profile
 */
export function hasCompletedStyleDNA(user: User): boolean {
  if (!user.styleDNA) return false;
  
  return (
    user.styleDNA.styleArchetypes.length > 0 &&
    user.styleDNA.colorProfile.primary.length > 0 &&
    user.styleDNA.lifestyleWeights.work +
    user.styleDNA.lifestyleWeights.casual +
    user.styleDNA.lifestyleWeights.social +
    user.styleDNA.lifestyleWeights.travel === 1.0
  );
}

/**
 * Calculate Style DNA completion percentage
 */
export function getStyleDNACompletionPercentage(user: User): number {
  if (!user.styleDNA) return 0;
  
  let completed = 0;
  let total = 5;
  
  // Check lifestyle weights
  const weightsSum = 
    user.styleDNA.lifestyleWeights.work +
    user.styleDNA.lifestyleWeights.casual +
    user.styleDNA.lifestyleWeights.social +
    user.styleDNA.lifestyleWeights.travel;
  
  if (Math.abs(weightsSum - 1.0) < 0.01) completed++;
  
  // Check style archetypes
  if (user.styleDNA.styleArchetypes.length > 0) completed++;
  
  // Check color profile
  if (user.styleDNA.colorProfile.primary.length > 0) completed++;
  
  // Check guidance level
  if (user.styleDNA.guidanceLevel) completed++;
  
  // Check fit preferences (optional but counts)
  if (user.styleDNA.fitPreferences.highlight || user.styleDNA.fitPreferences.downplay) {
    completed++;
  }
  
  return Math.round((completed / total) * 100);
}

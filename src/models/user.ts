/**
 * User Model
 * 
 * Core user entity with PersonalStyleProfile integration for personalized styling
 */

import { PersonalStyleProfile } from './personalStyleProfile';

export type SubscriptionTier = "free" | "plus" | "premium";

export interface User {
  id: string;
  name: string;
  email?: string;
  profileImageUrl?: string;
  
  /**
   * PersonalStyleProfile belongs on the User, not individual outfits.
   * 
   * Rationale:
   * - PersonalStyleProfile represents the user's inherent style preferences, lifestyle needs,
   *   and aesthetic identity - it's about WHO they are, not WHAT they wear.
   * - It's used to filter, score, and recommend items/outfits that match the user.
   * - Outfits are ephemeral combinations; PersonalStyleProfile is the persistent profile
   *   that guides all styling decisions across the entire wardrobe.
   * - A single user has one evolving style identity, but creates many outfits.
   */
  styleProfile?: PersonalStyleProfile;
  
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
      "Style profile",
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
  feature: 'styleProfile' | 'advancedAI' | 'personalStylist' | 'analytics'
): boolean {
  switch (feature) {
    case 'styleProfile':
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
 * Check if user has completed their style profile
 */
export function hasCompletedStyleProfile(user: User): boolean {
  if (!user.styleProfile) return false;
  
  return (
    user.styleProfile.styleArchetypes.length > 0 &&
    user.styleProfile.colorProfile.primary.length > 0 &&
    user.styleProfile.lifestyleWeights.work +
    user.styleProfile.lifestyleWeights.casual +
    user.styleProfile.lifestyleWeights.social +
    user.styleProfile.lifestyleWeights.travel === 1.0
  );
}

/**
 * Calculate style profile completion percentage
 */
export function getStyleProfileCompletionPercentage(user: User): number {
  if (!user.styleProfile) return 0;
  
  let completed = 0;
  let total = 5;
  
  // Check lifestyle weights
  const weightsSum = 
    user.styleProfile.lifestyleWeights.work +
    user.styleProfile.lifestyleWeights.casual +
    user.styleProfile.lifestyleWeights.social +
    user.styleProfile.lifestyleWeights.travel;
  
  if (Math.abs(weightsSum - 1.0) < 0.01) completed++;
  
  // Check style archetypes
  if (user.styleProfile.styleArchetypes.length > 0) completed++;
  
  // Check color profile
  if (user.styleProfile.colorProfile.primary.length > 0) completed++;
  
  // Check guidance level
  if (user.styleProfile.guidanceLevel) completed++;
  
  // Check fit preferences (optional but counts)
  if (user.styleProfile.fitPreferences.highlight || user.styleProfile.fitPreferences.downplay) {
    completed++;
  }
  
  return Math.round((completed / total) * 100);
}

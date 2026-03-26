/**
 * Feature Flags Configuration
 * 
 * Simple string-based tier system for feature access control.
 * Maps subscription tiers to available features.
 * 
 * MVP: Monthly subscriptions only (annual coming later)
 */

export type SubscriptionTier = 'free' | 'plus' | 'premium';

/**
 * Feature Gating - Clean & Centralized
 * 
 * Maps features to the tiers that have access.
 * This is the single source of truth for feature access.
 */
export const FEATURES = {
  unlimitedOutfits: ["plus", "premium"] as const,
  styleDNA: ["plus", "premium"] as const,
  stylistReview: ["premium"] as const,
} as const;

export interface FeatureFlags {
  unlimitedOutfits: boolean;
  styleDNAAccess: boolean;
  advancedAnalysis: boolean;
  aiStylingAssistant: boolean;
  personalStylistAccess: boolean;
  prioritySupport: boolean;
}

/**
 * App Store Product IDs (reverse-DNS, stable forever)
 */
export const PRODUCT_IDS = {
  PLUS_MONTHLY: 'com.styled.plus.monthly',
  PREMIUM_MONTHLY: 'com.styled.premium.monthly',
} as const;

/**
 * Subscription pricing (monthly only for MVP)
 */
export const TIER_PRICING: Record<SubscriptionTier, number | null> = {
  free: null,
  plus: 8.99,      // $8.99/month
  premium: 23.99,  // $23.99/month
};

/**
 * Feature access map by subscription tier
 */
export const TIER_FEATURES: Record<SubscriptionTier, FeatureFlags> = {
  free: {
    unlimitedOutfits: false,        // Limited to 3 outfits
    styleDNAAccess: false,           // No StyleDNA profile
    advancedAnalysis: false,         // No analytics
    aiStylingAssistant: false,       // Limited AI recommendations
    personalStylistAccess: false,    // No human stylist
    prioritySupport: false,          // Standard support
  },
  plus: {
    unlimitedOutfits: true,          // Unlimited outfit generation
    styleDNAAccess: true,            // Full StyleDNA profile
    advancedAnalysis: true,          // Closet analytics
    aiStylingAssistant: true,        // Full AI styling
    personalStylistAccess: false,    // No human stylist
    prioritySupport: false,          // Standard support
  },
  premium: {
    unlimitedOutfits: true,          // Unlimited outfit generation
    styleDNAAccess: true,            // Full StyleDNA profile
    advancedAnalysis: true,          // Advanced analytics
    aiStylingAssistant: true,        // Full AI styling
    personalStylistAccess: true,     // Human stylist consultations
    prioritySupport: true,           // Priority support
  },
};

/**
 * Outfit generation limits by tier
 */
export const OUTFIT_LIMITS: Record<SubscriptionTier, number> = {
  free: 3,           // 3 outfits per session/day
  plus: Infinity,    // Unlimited
  premium: Infinity, // Unlimited
};

/**
 * Check if a user has access to a specific feature
 */
export function hasFeatureAccess(
  tier: SubscriptionTier,
  feature: keyof FeatureFlags
): boolean {
  return TIER_FEATURES[tier][feature];
}

/**
 * Check if a tier has access to a feature (using FEATURES constant)
 * 
 * @param tier - User's subscription tier
 * @param feature - Feature to check
 * @returns true if tier has access, false otherwise
 */
export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof typeof FEATURES
): boolean {
  return (FEATURES[feature] as readonly SubscriptionTier[]).includes(tier);
}

/**
 * Get outfit generation limit for a tier
 */
export function getOutfitLimit(tier: SubscriptionTier): number {
  return OUTFIT_LIMITS[tier];
}

/**
 * Check if user has reached outfit limit
 */
export function hasReachedOutfitLimit(
  tier: SubscriptionTier,
  generatedCount: number
): boolean {
  const limit = getOutfitLimit(tier);
  return limit !== Infinity && generatedCount >= limit;
}

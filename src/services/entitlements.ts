/**
 * Entitlements Service
 * 
 * Critical: Checks user's subscription tier based on RevenueCat entitlements.
 * This is the source of truth for feature access throughout the app.
 */

import Purchases from "react-native-purchases";

/**
 * Get user's current subscription tier
 * 
 * @returns 'free' | 'plus' | 'premium'
 * 
 * Entitlement mapping (must match RevenueCat dashboard):
 * - 'premium' entitlement → premium tier
 * - 'plus' entitlement → plus tier
 * - No active entitlements → free tier
 */
export async function getSubscriptionTier(): Promise<
  "free" | "plus" | "premium"
> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();

    // Check entitlements in priority order
    if (customerInfo.entitlements.active.premium) {
      return "premium";
    }

    if (customerInfo.entitlements.active.plus) {
      return "plus";
    }

    return "free";
  } catch (error) {
    console.error('Failed to get subscription tier:', error);
    // Fail safely to free tier
    return "free";
  }
}

/**
 * Check if user has access to a specific feature
 * 
 * @param feature - Feature to check access for
 * @returns true if user has access, false otherwise
 */
export async function hasFeatureAccess(
  feature: 'unlimitedOutfits' | 'styleDNA' | 'stylistReview'
): Promise<boolean> {
  try {
    const tier = await getSubscriptionTier();
    
    // Import FEATURES from centralized config
    const { FEATURES } = await import('../config/features');
    
    // Check if tier has access to feature
    const allowedTiers = FEATURES[feature] as readonly string[];
    return allowedTiers?.includes(tier) ?? false;
  } catch (error) {
    console.error('Failed to check feature access:', error);
    return false;
  }
}

/**
 * Check if user is in free trial
 */
export async function isInFreeTrial(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    
    // Check if any active entitlement is in trial period
    const activeEntitlements = Object.values(customerInfo.entitlements.active);
    return activeEntitlements.some(entitlement => 
      entitlement.periodType === 'trial'
    );
  } catch (error) {
    console.error('Failed to check trial status:', error);
    return false;
  }
}

/**
 * Get trial end date if user is in trial
 */
export async function getTrialEndDate(): Promise<Date | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    
    // Find active trial entitlement
    const trialEntitlement = Object.values(customerInfo.entitlements.active)
      .find(e => e.periodType === 'trial');
    
    if (trialEntitlement?.expirationDate) {
      return new Date(trialEntitlement.expirationDate);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get trial end date:', error);
    return null;
  }
}

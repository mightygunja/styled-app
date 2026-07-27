/**
 * Purchases Service - RevenueCat Initialization
 * 
 * Initializes RevenueCat SDK with Expo device check.
 * Only runs on physical devices (not simulators).
 */

import Purchases from "react-native-purchases";
import * as Device from "expo-device";

/**
 * Initialize RevenueCat purchases
 * 
 * @param userId - Unique user identifier for tracking subscriptions
 * 
 * Note: Only initializes on physical devices, not simulators.
 * This prevents errors during development on simulators.
 */
export async function initPurchases(userId: string): Promise<void> {
  // Skip initialization on simulators/emulators
  if (!Device.isDevice) {
    console.log('Skipping RevenueCat initialization on simulator');
    return;
  }

  try {
    // Get API key from environment
    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
    
    if (!apiKey) {
      console.error('RevenueCat API key not found in environment variables');
      return;
    }

    // Configure RevenueCat
    Purchases.configure({
      apiKey,
      appUserID: userId,
    });

    console.log('RevenueCat initialized successfully for user:', userId);
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
  }
}

/**
 * Get current subscription tier from RevenueCat
 * 
 * @returns 'free' | 'plus' | 'premium'
 */
export async function getSubscriptionTier(): Promise<'free' | 'plus' | 'premium'> {
  if (!Device.isDevice) {
    return 'free'; // Default to free on simulator
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    
    // Check entitlements (match RevenueCat dashboard configuration)
    const hasPremium = customerInfo.entitlements.active['premium'] !== undefined;
    const hasPlus = customerInfo.entitlements.active['plus'] !== undefined;
    
    if (hasPremium) return 'premium';
    if (hasPlus) return 'plus';
    return 'free';
  } catch (error) {
    console.error('Failed to get subscription tier:', error);
    return 'free';
  }
}

/**
 * Get available subscription offerings
 */
export async function getOfferings() {
  if (!Device.isDevice) {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: any) {
  if (!Device.isDevice) {
    throw new Error('Purchases only work on physical devices');
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, customerInfo };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, cancelled: true };
    }
    throw error;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases() {
  if (!Device.isDevice) {
    throw new Error('Restore only works on physical devices');
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: true, customerInfo };
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    throw error;
  }
}

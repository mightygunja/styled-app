/**
 * RevenueCat Service
 * 
 * Minimal wrapper for RevenueCat SDK with correct entitlement mapping.
 * Entitlements: 'plus' and 'premium' (not plus_access/premium_access)
 */

import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage,
  CustomerInfo 
} from 'react-native-purchases';
import { SubscriptionTier } from '../config/features';

class RevenueCatService {
  private initialized = false;

  /**
   * Initialize RevenueCat SDK
   * Call this once when app starts
   */
  async initialize(apiKey: string, userId?: string): Promise<void> {
    if (this.initialized) return;

    try {
      await Purchases.configure({ apiKey });
      
      if (userId) {
        await Purchases.logIn(userId);
      }

      this.initialized = true;
      console.log('RevenueCat initialized');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
      throw error;
    }
  }

  /**
   * Get current subscription tier based on entitlements
   * Entitlements: 'plus' or 'premium'
   */
  async getSubscriptionTier(): Promise<SubscriptionTier> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Check entitlements (use exact identifiers from RevenueCat)
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
  async getOfferings(): Promise<PurchasesOffering | null> {
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
  async purchasePackage(pkg: PurchasesPackage): Promise<{
    success: boolean;
    tier: SubscriptionTier;
  }> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const tier = await this.getSubscriptionTier();
      
      return {
        success: tier !== 'free',
        tier,
      };
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
      } else {
        console.error('Purchase failed:', error);
      }
      
      return {
        success: false,
        tier: 'free',
      };
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<{
    success: boolean;
    tier: SubscriptionTier;
  }> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const tier = await this.getSubscriptionTier();
      
      return {
        success: tier !== 'free',
        tier,
      };
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      return {
        success: false,
        tier: 'free',
      };
    }
  }

  /**
   * Get customer info (includes entitlements, subscription status, etc.)
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }

  /**
   * Check if user is in free trial
   */
  async isInTrial(): Promise<boolean> {
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
  async getTrialEndDate(): Promise<Date | null> {
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
}

export const revenueCatService = new RevenueCatService();

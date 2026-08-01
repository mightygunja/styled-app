/**
 * Subscription Context
 * 
 * Provides app-wide access to subscription tier and feature flags.
 * Integrates with existing subscriptionService for tier management.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { subscriptionService, SubscriptionTier as ServiceTier } from '../services/subscriptionService';
import { SubscriptionTier, hasFeatureAccess, hasReachedOutfitLimit } from '../config/features';

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  loading: boolean;
  outfitCount: number;
  hasFeature: (feature: string) => boolean;
  canGenerateOutfit: () => boolean;
  incrementOutfitCount: () => void;
  resetOutfitCount: () => void;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  tier: 'free',
  loading: true,
  outfitCount: 0,
  hasFeature: () => false,
  canGenerateOutfit: () => false,
  incrementOutfitCount: () => {},
  resetOutfitCount: () => {},
  refreshSubscription: async () => {},
});

interface SubscriptionProviderProps {
  children: ReactNode;
  userId?: string;
}

export function SubscriptionProvider({ children, userId = 'mock-user' }: SubscriptionProviderProps) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);
  const [outfitCount, setOutfitCount] = useState(0);

  useEffect(() => {
    loadSubscription();
  }, [userId]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual RevenueCat integration
      // Example:
      // import Purchases from 'react-native-purchases';
      // const customerInfo = await Purchases.getCustomerInfo();
      // const hasPremium = customerInfo.entitlements.active['premium'] !== undefined;
      // const hasPlus = customerInfo.entitlements.active['plus'] !== undefined;
      // const tier = hasPremium ? 'premium' : hasPlus ? 'plus' : 'free';
      
      const subscription = await subscriptionService.getUserSubscription(userId);
      
      // Map service tier to feature flag tier
      const mappedTier = mapServiceTierToFeatureTier(subscription.tier);
      setTier(mappedTier);
    } catch (error) {
      console.error('Failed to load subscription:', error);
      setTier('free');
    } finally {
      setLoading(false);
    }
  };

  const mapServiceTierToFeatureTier = (serviceTier: ServiceTier): SubscriptionTier => {
    // Map existing service tiers to feature flag tiers
    switch (serviceTier) {
      case 'premium':
        return 'plus';
      case 'pro':
        return 'premium';
      case 'free':
      default:
        return 'free';
    }
  };

  const hasFeature = (feature: string): boolean => {
    // Map feature names to feature flag keys
    const featureMap: Record<string, keyof import('../config/features').FeatureFlags> = {
      'unlimitedOutfits': 'unlimitedOutfits',
      'styleProfile': 'styleProfileAccess',
      'analytics': 'advancedAnalysis',
      'aiAssistant': 'aiStylingAssistant',
    };

    const featureKey = featureMap[feature];
    if (!featureKey) return false;

    return hasFeatureAccess(tier, featureKey);
  };

  const canGenerateOutfit = (): boolean => {
    // Check if user can generate another outfit
    if (tier !== 'free') {
      return true; // Unlimited for paid tiers
    }

    return !hasReachedOutfitLimit(tier, outfitCount);
  };

  const incrementOutfitCount = () => {
    setOutfitCount(prev => prev + 1);
  };

  const resetOutfitCount = () => {
    setOutfitCount(0);
  };

  const refreshSubscription = async () => {
    await loadSubscription();
  };

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        loading,
        outfitCount,
        hasFeature,
        canGenerateOutfit,
        incrementOutfitCount,
        resetOutfitCount,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}

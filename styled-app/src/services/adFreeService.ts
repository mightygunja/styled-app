/**
 * Ad-Free Experience Service
 * 
 * Manages ad display preferences, ad-free benefits, and premium
 * content access for subscribers.
 */

import { SubscriptionTier } from './subscriptionService';

export type AdPlacement = 'banner' | 'interstitial' | 'native' | 'video' | 'sponsored';
export type AdFrequency = 'high' | 'medium' | 'low' | 'none';

export interface AdSettings {
  userId: string;
  tier: SubscriptionTier;
  adFreeEnabled: boolean;
  adFrequency: AdFrequency;
  allowedPlacements: AdPlacement[];
  blockedPlacements: AdPlacement[];
  personalizedAds: boolean;
  trackingEnabled: boolean;
}

export interface AdExperience {
  tier: SubscriptionTier;
  isAdFree: boolean;
  benefits: {
    noBannerAds: boolean;
    noInterstitialAds: boolean;
    noVideoAds: boolean;
    noSponsoredContent: boolean;
    cleanInterface: boolean;
    fasterLoading: boolean;
    priorityContent: boolean;
    exclusiveFeatures: boolean;
  };
  restrictions: {
    adsPerSession: number;
    adsPerHour: number;
    videoAdDuration: number; // seconds
    skipableAfter: number; // seconds
  };
}

export interface AdStats {
  totalAdsShown: number;
  totalAdsBlocked: number;
  timeSaved: number; // minutes
  dataUsageSaved: number; // MB
  adFreeStreakDays: number;
  estimatedValue: number; // dollars
}

export interface AdPreferences {
  categories: {
    fashion: boolean;
    beauty: boolean;
    lifestyle: boolean;
    luxury: boolean;
    sustainable: boolean;
  };
  brands: string[];
  blockedBrands: string[];
  interests: string[];
}

export interface AdFreeComparison {
  feature: string;
  free: string;
  premium: string;
  pro: string;
}

class AdFreeService {
  /**
   * Get ad settings for user
   */
  async getAdSettings(userId: string, tier: SubscriptionTier): Promise<AdSettings> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const adFreeEnabled = tier === 'premium' || tier === 'pro';
    const frequency: AdFrequency = tier === 'pro' ? 'none' : tier === 'premium' ? 'none' : 'high';

    return {
      userId,
      tier,
      adFreeEnabled,
      adFrequency: frequency,
      allowedPlacements: adFreeEnabled ? [] : ['banner', 'native', 'sponsored'],
      blockedPlacements: adFreeEnabled 
        ? ['banner', 'interstitial', 'native', 'video', 'sponsored']
        : ['interstitial', 'video'],
      personalizedAds: !adFreeEnabled,
      trackingEnabled: !adFreeEnabled,
    };
  }

  /**
   * Get ad experience details
   */
  async getAdExperience(tier: SubscriptionTier): Promise<AdExperience> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const experiences: Record<SubscriptionTier, AdExperience> = {
      free: {
        tier: 'free',
        isAdFree: false,
        benefits: {
          noBannerAds: false,
          noInterstitialAds: false,
          noVideoAds: false,
          noSponsoredContent: false,
          cleanInterface: false,
          fasterLoading: false,
          priorityContent: false,
          exclusiveFeatures: false,
        },
        restrictions: {
          adsPerSession: 10,
          adsPerHour: 20,
          videoAdDuration: 30,
          skipableAfter: 5,
        },
      },
      premium: {
        tier: 'premium',
        isAdFree: true,
        benefits: {
          noBannerAds: true,
          noInterstitialAds: true,
          noVideoAds: true,
          noSponsoredContent: false,
          cleanInterface: true,
          fasterLoading: true,
          priorityContent: true,
          exclusiveFeatures: false,
        },
        restrictions: {
          adsPerSession: 0,
          adsPerHour: 0,
          videoAdDuration: 0,
          skipableAfter: 0,
        },
      },
      pro: {
        tier: 'pro',
        isAdFree: true,
        benefits: {
          noBannerAds: true,
          noInterstitialAds: true,
          noVideoAds: true,
          noSponsoredContent: true,
          cleanInterface: true,
          fasterLoading: true,
          priorityContent: true,
          exclusiveFeatures: true,
        },
        restrictions: {
          adsPerSession: 0,
          adsPerHour: 0,
          videoAdDuration: 0,
          skipableAfter: 0,
        },
      },
    };

    return experiences[tier];
  }

  /**
   * Get ad statistics
   */
  async getAdStats(userId: string, tier: SubscriptionTier): Promise<AdStats> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const isAdFree = tier === 'premium' || tier === 'pro';

    if (!isAdFree) {
      return {
        totalAdsShown: 1247,
        totalAdsBlocked: 0,
        timeSaved: 0,
        dataUsageSaved: 0,
        adFreeStreakDays: 0,
        estimatedValue: 0,
      };
    }

    // Calculate stats for ad-free users
    const daysSubscribed = 45; // mock
    const avgAdsPerDay = 28;
    const avgAdDuration = 15; // seconds
    const avgAdSize = 2; // MB

    const totalAdsBlocked = daysSubscribed * avgAdsPerDay;
    const timeSaved = Math.round((totalAdsBlocked * avgAdDuration) / 60); // minutes
    const dataUsageSaved = Math.round((totalAdsBlocked * avgAdSize) / 1024); // MB
    const estimatedValue = Math.round(totalAdsBlocked * 0.05); // $0.05 per ad

    return {
      totalAdsShown: 0,
      totalAdsBlocked,
      timeSaved,
      dataUsageSaved,
      adFreeStreakDays: daysSubscribed,
      estimatedValue,
    };
  }

  /**
   * Get ad preferences
   */
  async getAdPreferences(userId: string): Promise<AdPreferences> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      categories: {
        fashion: true,
        beauty: true,
        lifestyle: true,
        luxury: false,
        sustainable: true,
      },
      brands: ['Zara', 'H&M', 'Everlane'],
      blockedBrands: ['Fast Fashion Co'],
      interests: ['Sustainable Fashion', 'Minimalism', 'Capsule Wardrobe'],
    };
  }

  /**
   * Update ad preferences
   */
  async updateAdPreferences(
    userId: string,
    preferences: Partial<AdPreferences>
  ): Promise<AdPreferences> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const current = await this.getAdPreferences(userId);
    return { ...current, ...preferences };
  }

  /**
   * Check if ad should be shown
   */
  async shouldShowAd(
    userId: string,
    tier: SubscriptionTier,
    placement: AdPlacement
  ): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (tier === 'premium' || tier === 'pro') {
      return false; // Ad-free
    }

    // Free tier logic
    const settings = await this.getAdSettings(userId, tier);
    return !settings.blockedPlacements.includes(placement);
  }

  /**
   * Get ad-free comparison
   */
  async getAdFreeComparison(): Promise<AdFreeComparison[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return [
      {
        feature: 'Banner Ads',
        free: '10-20 per session',
        premium: 'None',
        pro: 'None',
      },
      {
        feature: 'Video Ads',
        free: '30s unskippable',
        premium: 'None',
        pro: 'None',
      },
      {
        feature: 'Interstitial Ads',
        free: 'Every 5 minutes',
        premium: 'None',
        pro: 'None',
      },
      {
        feature: 'Sponsored Content',
        free: 'In feed',
        premium: 'In feed',
        pro: 'None',
      },
      {
        feature: 'Loading Speed',
        free: 'Standard',
        premium: '2x faster',
        pro: '3x faster',
      },
      {
        feature: 'Data Usage',
        free: 'High',
        premium: '50% less',
        pro: '70% less',
      },
      {
        feature: 'Clean Interface',
        free: 'Cluttered',
        premium: 'Clean',
        pro: 'Premium',
      },
      {
        feature: 'Priority Content',
        free: 'Standard',
        premium: 'Priority',
        pro: 'Exclusive',
      },
    ];
  }

  /**
   * Calculate ad-free value
   */
  async calculateAdFreeValue(tier: SubscriptionTier, months: number): Promise<{
    adsBlocked: number;
    timeSaved: number; // hours
    dataUsageSaved: number; // GB
    monetaryValue: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (tier === 'free') {
      return {
        adsBlocked: 0,
        timeSaved: 0,
        dataUsageSaved: 0,
        monetaryValue: 0,
      };
    }

    const avgAdsPerDay = 28;
    const avgAdDuration = 15; // seconds
    const avgAdSize = 2; // MB
    const days = months * 30;

    const adsBlocked = days * avgAdsPerDay;
    const timeSaved = (adsBlocked * avgAdDuration) / 3600; // hours
    const dataUsageSaved = (adsBlocked * avgAdSize) / 1024; // GB
    const monetaryValue = adsBlocked * 0.05; // $0.05 per ad

    return {
      adsBlocked,
      timeSaved: Math.round(timeSaved * 10) / 10,
      dataUsageSaved: Math.round(dataUsageSaved * 10) / 10,
      monetaryValue: Math.round(monetaryValue),
    };
  }

  /**
   * Get ad-free benefits summary
   */
  async getAdFreeBenefitsSummary(tier: SubscriptionTier): Promise<{
    title: string;
    description: string;
    benefits: string[];
    savings: {
      time: string;
      data: string;
      value: string;
    };
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (tier === 'free') {
      return {
        title: 'Upgrade for Ad-Free Experience',
        description: 'Remove all ads and enjoy a cleaner, faster app',
        benefits: [
          'No banner ads',
          'No video ads',
          'No interstitial ads',
          'Faster loading times',
          'Clean interface',
          'Priority content access',
        ],
        savings: {
          time: '0 hours',
          data: '0 GB',
          value: '$0',
        },
      };
    }

    const value = await this.calculateAdFreeValue(tier, 1);

    return {
      title: tier === 'pro' ? 'Complete Ad-Free Experience' : 'Premium Ad-Free Experience',
      description: 'You\'re enjoying an ad-free experience',
      benefits: [
        '✓ No banner ads',
        '✓ No video ads',
        '✓ No interstitial ads',
        tier === 'pro' ? '✓ No sponsored content' : '○ Sponsored content (Pro only)',
        '✓ 2-3x faster loading',
        '✓ 50-70% less data usage',
        '✓ Clean interface',
        '✓ Priority content',
      ],
      savings: {
        time: `${value.timeSaved.toFixed(1)} hours/month`,
        data: `${value.dataUsageSaved.toFixed(1)} GB/month`,
        value: `$${value.monetaryValue}/month`,
      },
    };
  }

  /**
   * Enable ad-free mode (for testing)
   */
  async enableAdFreeMode(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Mock enable
  }

  /**
   * Disable ad-free mode (for testing)
   */
  async disableAdFreeMode(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Mock disable
  }

  /**
   * Get ad-free testimonials
   */
  async getAdFreeTestimonials(): Promise<{
    author: string;
    tier: string;
    quote: string;
    rating: number;
  }[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return [
      {
        author: 'Sarah M.',
        tier: 'Premium',
        quote: 'The ad-free experience is worth every penny. The app is so much faster and cleaner!',
        rating: 5,
      },
      {
        author: 'James K.',
        tier: 'Pro',
        quote: 'No more interruptions! I can focus on styling without constant ad breaks.',
        rating: 5,
      },
      {
        author: 'Emily R.',
        tier: 'Premium',
        quote: 'I didn\'t realize how much time I was wasting on ads until I upgraded. Game changer!',
        rating: 5,
      },
    ];
  }
}

export const adFreeService = new AdFreeService();

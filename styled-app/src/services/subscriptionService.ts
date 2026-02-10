/**
 * Subscription Service
 * 
 * Manages subscription tiers (Free/Premium/Pro) with feature gating.
 * Handles subscription management, upgrades, downgrades, and billing.
 */

export type SubscriptionTier = 'free' | 'premium' | 'pro';
export type BillingPeriod = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'trial' | 'past_due';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  limits: {
    closetItems: number | 'unlimited';
    outfits: number | 'unlimited';
    aiSuggestions: number | 'unlimited';
    stylingSessions: number;
    analyticsAccess: boolean;
    prioritySupport: boolean;
    adFree: boolean;
    exclusiveContent: boolean;
  };
  popular?: boolean;
  savings?: number; // percentage saved on yearly
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentMethod?: {
    type: 'card' | 'paypal';
    last4?: string;
    brand?: string;
  };
  nextBillingDate?: string;
  canceledAt?: string;
  trialEndsAt?: string;
}

export interface FeatureAccess {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: SubscriptionTier;
}

export interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  description: string;
  invoiceUrl?: string;
}

export interface SubscriptionStats {
  currentTier: SubscriptionTier;
  memberSince: string;
  daysRemaining: number;
  usage: {
    closetItems: number;
    outfits: number;
    aiSuggestions: number;
    stylingSessions: number;
  };
  limits: {
    closetItems: number | 'unlimited';
    outfits: number | 'unlimited';
    aiSuggestions: number | 'unlimited';
    stylingSessions: number;
  };
}

class SubscriptionService {
  private plans: SubscriptionPlan[] = [
    {
      id: 'free',
      tier: 'free',
      name: 'Free',
      description: 'Get started with basic features',
      price: {
        monthly: 0,
        yearly: 0,
      },
      features: [
        'Browse curated looks',
        'Save up to 50 closet items',
        'Basic outfit suggestions',
        'Limited AI recommendations',
        'Community access',
      ],
      limits: {
        closetItems: 50,
        outfits: 20,
        aiSuggestions: 10,
        stylingSessions: 0,
        analyticsAccess: false,
        prioritySupport: false,
        adFree: false,
        exclusiveContent: false,
      },
    },
    {
      id: 'premium',
      tier: 'premium',
      name: 'Premium',
      description: 'Unlock advanced features',
      price: {
        monthly: 9.99,
        yearly: 99.99,
      },
      features: [
        'Unlimited closet items',
        'Unlimited outfits',
        'Advanced AI outfit pairing',
        'Priority customer support',
        'Ad-free experience',
        'Early access to new features',
        'Advanced analytics',
        '1 styling session per month',
      ],
      limits: {
        closetItems: 'unlimited',
        outfits: 'unlimited',
        aiSuggestions: 'unlimited',
        stylingSessions: 1,
        analyticsAccess: true,
        prioritySupport: true,
        adFree: true,
        exclusiveContent: false,
      },
      popular: true,
      savings: 17, // 17% savings on yearly
    },
    {
      id: 'pro',
      tier: 'pro',
      name: 'Pro',
      description: 'For fashion professionals',
      price: {
        monthly: 19.99,
        yearly: 199.99,
      },
      features: [
        'Everything in Premium',
        '3 styling sessions per month',
        'Exclusive trend reports',
        'Personal stylist chat support',
        'Advanced wardrobe analytics',
        'Exclusive content access',
        'Custom branding options',
        'API access',
        'White-label features',
      ],
      limits: {
        closetItems: 'unlimited',
        outfits: 'unlimited',
        aiSuggestions: 'unlimited',
        stylingSessions: 3,
        analyticsAccess: true,
        prioritySupport: true,
        adFree: true,
        exclusiveContent: true,
      },
      savings: 17,
    },
  ];

  /**
   * Get all subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...this.plans];
  }

  /**
   * Get plan by tier
   */
  async getPlan(tier: SubscriptionTier): Promise<SubscriptionPlan | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.plans.find(p => p.tier === tier) || null;
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<UserSubscription> {
    await new Promise(resolve => setTimeout(resolve, 400));

    // Mock user subscription - default to free tier
    return {
      id: `sub-${userId}`,
      userId,
      tier: 'free',
      status: 'active',
      billingPeriod: 'monthly',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
    };
  }

  /**
   * Subscribe to a plan
   */
  async subscribe(
    userId: string,
    tier: SubscriptionTier,
    billingPeriod: BillingPeriod
  ): Promise<UserSubscription> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    const plan = await this.getPlan(tier);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const startDate = new Date();
    const endDate = new Date();
    if (billingPeriod === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return {
      id: `sub-${Date.now()}`,
      userId,
      tier,
      status: 'active',
      billingPeriod,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      autoRenew: true,
      paymentMethod: {
        type: 'card',
        last4: '4242',
        brand: 'Visa',
      },
      nextBillingDate: endDate.toISOString(),
    };
  }

  /**
   * Upgrade subscription
   */
  async upgrade(
    userId: string,
    newTier: SubscriptionTier,
    billingPeriod: BillingPeriod
  ): Promise<UserSubscription> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const currentSub = await this.getUserSubscription(userId);
    
    // Calculate prorated amount (mock)
    const plan = await this.getPlan(newTier);
    if (!plan) {
      throw new Error('Plan not found');
    }

    return {
      ...currentSub,
      tier: newTier,
      billingPeriod,
      status: 'active',
    };
  }

  /**
   * Downgrade subscription
   */
  async downgrade(
    userId: string,
    newTier: SubscriptionTier
  ): Promise<UserSubscription> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const currentSub = await this.getUserSubscription(userId);

    // Downgrade takes effect at end of current billing period
    return {
      ...currentSub,
      tier: newTier,
      status: 'active',
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<UserSubscription> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const currentSub = await this.getUserSubscription(userId);

    return {
      ...currentSub,
      status: 'canceled',
      autoRenew: false,
      canceledAt: new Date().toISOString(),
    };
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(userId: string): Promise<UserSubscription> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const currentSub = await this.getUserSubscription(userId);

    return {
      ...currentSub,
      status: 'active',
      autoRenew: true,
      canceledAt: undefined,
    };
  }

  /**
   * Check feature access
   */
  async checkFeatureAccess(
    userId: string,
    feature: keyof SubscriptionPlan['limits']
  ): Promise<FeatureAccess> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const subscription = await this.getUserSubscription(userId);
    const plan = await this.getPlan(subscription.tier);

    if (!plan) {
      return { hasAccess: false, reason: 'Invalid subscription' };
    }

    const hasAccess = plan.limits[feature] === true || 
                      plan.limits[feature] === 'unlimited' ||
                      (typeof plan.limits[feature] === 'number' && plan.limits[feature] > 0);

    if (!hasAccess) {
      const upgradeRequired = subscription.tier === 'free' ? 'premium' : 'pro';
      return {
        hasAccess: false,
        reason: `This feature requires ${upgradeRequired} subscription`,
        upgradeRequired,
      };
    }

    return { hasAccess: true };
  }

  /**
   * Get subscription stats
   */
  async getSubscriptionStats(userId: string): Promise<SubscriptionStats> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const subscription = await this.getUserSubscription(userId);
    const plan = await this.getPlan(subscription.tier);

    if (!plan) {
      throw new Error('Plan not found');
    }

    const endDate = new Date(subscription.endDate);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Mock usage data
    const usage = {
      closetItems: 35,
      outfits: 12,
      aiSuggestions: 8,
      stylingSessions: subscription.tier === 'free' ? 0 : subscription.tier === 'premium' ? 1 : 2,
    };

    return {
      currentTier: subscription.tier,
      memberSince: subscription.startDate,
      daysRemaining,
      usage,
      limits: plan.limits,
    };
  }

  /**
   * Get billing history
   */
  async getBillingHistory(userId: string): Promise<BillingHistory[]> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const subscription = await this.getUserSubscription(userId);

    if (subscription.tier === 'free') {
      return [];
    }

    // Mock billing history
    const history: BillingHistory[] = [];
    const plan = await this.getPlan(subscription.tier);
    
    if (plan) {
      const amount = subscription.billingPeriod === 'monthly' 
        ? plan.price.monthly 
        : plan.price.yearly;

      for (let i = 0; i < 3; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        
        history.push({
          id: `inv-${i}`,
          date: date.toISOString(),
          amount,
          status: 'paid',
          description: `${plan.name} - ${subscription.billingPeriod}`,
          invoiceUrl: `https://styled.app/invoices/inv-${i}`,
        });
      }
    }

    return history;
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    userId: string,
    paymentMethod: UserSubscription['paymentMethod']
  ): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Mock payment method update
  }

  /**
   * Compare plans
   */
  async comparePlans(): Promise<{
    features: string[];
    plans: Record<SubscriptionTier, boolean[]>;
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const allFeatures = [
      'Browse curated looks',
      'Save closet items',
      'Create outfits',
      'AI outfit suggestions',
      'Community access',
      'Unlimited closet items',
      'Unlimited outfits',
      'Advanced AI pairing',
      'Priority support',
      'Ad-free experience',
      'Advanced analytics',
      'Styling sessions',
      'Exclusive content',
      'Trend reports',
      'Custom branding',
      'API access',
    ];

    const plans: Record<SubscriptionTier, boolean[]> = {
      free: [true, true, true, true, true, false, false, false, false, false, false, false, false, false, false, false],
      premium: [true, true, true, true, true, true, true, true, true, true, true, true, false, false, false, false],
      pro: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    };

    return {
      features: allFeatures,
      plans,
    };
  }

  /**
   * Start free trial
   */
  async startFreeTrial(userId: string, tier: SubscriptionTier): Promise<UserSubscription> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

    return {
      id: `trial-${Date.now()}`,
      userId,
      tier,
      status: 'trial',
      billingPeriod: 'monthly',
      startDate: new Date().toISOString(),
      endDate: trialEndDate.toISOString(),
      autoRenew: true,
      trialEndsAt: trialEndDate.toISOString(),
    };
  }

  /**
   * Calculate savings
   */
  calculateYearlySavings(tier: SubscriptionTier): number {
    const plan = this.plans.find(p => p.tier === tier);
    if (!plan) return 0;

    const monthlyTotal = plan.price.monthly * 12;
    const yearlyPrice = plan.price.yearly;
    return monthlyTotal - yearlyPrice;
  }
}

export const subscriptionService = new SubscriptionService();

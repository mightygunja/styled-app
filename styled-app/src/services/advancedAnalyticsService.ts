/**
 * Advanced Analytics Service
 * 
 * Provides detailed wardrobe insights, wear pattern analysis,
 * cost-per-wear tracking, and style evolution analytics for premium members.
 */

export interface WardrobeInsights {
  totalItems: number;
  totalValue: number;
  averageItemCost: number;
  mostWornItem: {
    id: string;
    name: string;
    wearCount: number;
    imageUrl: string;
  };
  leastWornItem: {
    id: string;
    name: string;
    wearCount: number;
    imageUrl: string;
  };
  categoryBreakdown: {
    category: string;
    count: number;
    percentage: number;
    totalValue: number;
  }[];
  colorDistribution: {
    color: string;
    hex: string;
    count: number;
    percentage: number;
  }[];
  seasonalBreakdown: {
    season: string;
    count: number;
    percentage: number;
  }[];
}

export interface WearPatternAnalysis {
  totalWears: number;
  averageWearsPerItem: number;
  wearFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
    rarely: number;
  };
  peakWearDays: {
    day: string;
    count: number;
  }[];
  occasionBreakdown: {
    occasion: string;
    count: number;
    percentage: number;
  }[];
  monthlyTrend: {
    month: string;
    wears: number;
  }[];
}

export interface CostPerWearAnalysis {
  overallCostPerWear: number;
  bestValue: {
    id: string;
    name: string;
    cost: number;
    wears: number;
    costPerWear: number;
    imageUrl: string;
  }[];
  worstValue: {
    id: string;
    name: string;
    cost: number;
    wears: number;
    costPerWear: number;
    imageUrl: string;
  }[];
  categoryComparison: {
    category: string;
    averageCostPerWear: number;
    totalSpent: number;
    totalWears: number;
  }[];
  savingsOpportunities: {
    message: string;
    potentialSavings: number;
    recommendation: string;
  }[];
}

export interface StyleEvolution {
  timeline: {
    period: string;
    dominantStyles: string[];
    dominantColors: string[];
    averagePrice: number;
    itemsAdded: number;
  }[];
  styleShifts: {
    from: string;
    to: string;
    confidence: number;
    date: string;
  }[];
  colorEvolution: {
    period: string;
    colors: { color: string; hex: string; percentage: number }[];
  }[];
  priceEvolution: {
    period: string;
    averagePrice: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
}

export interface SustainabilityMetrics {
  totalCarbonFootprint: number; // kg CO2
  averagePerItem: number;
  sustainableItems: number;
  sustainabilityScore: number; // 0-100
  recommendations: {
    title: string;
    description: string;
    impact: number; // kg CO2 saved
  }[];
  comparisonToAverage: {
    yourFootprint: number;
    averageUser: number;
    percentageDifference: number;
  };
}

export interface OutfitAnalytics {
  totalOutfits: number;
  averageItemsPerOutfit: number;
  mostUsedCombinations: {
    items: string[];
    count: number;
  }[];
  versatilityScore: {
    item: string;
    score: number; // 0-100
    outfitCount: number;
  }[];
  gapAnalysis: {
    category: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface BudgetAnalytics {
  totalSpent: number;
  monthlyAverage: number;
  yearlyProjection: number;
  spendingByCategory: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  spendingTrend: {
    month: string;
    amount: number;
  }[];
  budgetRecommendations: {
    category: string;
    currentSpend: number;
    recommendedBudget: number;
    reason: string;
  }[];
}

export interface AnalyticsSummary {
  insights: WardrobeInsights;
  wearPatterns: WearPatternAnalysis;
  costPerWear: CostPerWearAnalysis;
  styleEvolution: StyleEvolution;
  sustainability: SustainabilityMetrics;
  outfits: OutfitAnalytics;
  budget: BudgetAnalytics;
  lastUpdated: string;
}

class AdvancedAnalyticsService {
  /**
   * Get complete analytics summary
   */
  async getAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const [
      insights,
      wearPatterns,
      costPerWear,
      styleEvolution,
      sustainability,
      outfits,
      budget,
    ] = await Promise.all([
      this.getWardrobeInsights(userId),
      this.getWearPatternAnalysis(userId),
      this.getCostPerWearAnalysis(userId),
      this.getStyleEvolution(userId),
      this.getSustainabilityMetrics(userId),
      this.getOutfitAnalytics(userId),
      this.getBudgetAnalytics(userId),
    ]);

    return {
      insights,
      wearPatterns,
      costPerWear,
      styleEvolution,
      sustainability,
      outfits,
      budget,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get wardrobe insights
   */
  async getWardrobeInsights(userId: string): Promise<WardrobeInsights> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      totalItems: 127,
      totalValue: 15840,
      averageItemCost: 124.72,
      mostWornItem: {
        id: 'item-1',
        name: 'Black Blazer',
        wearCount: 45,
        imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
      },
      leastWornItem: {
        id: 'item-2',
        name: 'Sequin Dress',
        wearCount: 2,
        imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae',
      },
      categoryBreakdown: [
        { category: 'Tops', count: 42, percentage: 33, totalValue: 4200 },
        { category: 'Bottoms', count: 28, percentage: 22, totalValue: 3360 },
        { category: 'Dresses', count: 18, percentage: 14, totalValue: 3600 },
        { category: 'Outerwear', count: 15, percentage: 12, totalValue: 2250 },
        { category: 'Shoes', count: 14, percentage: 11, totalValue: 1680 },
        { category: 'Accessories', count: 10, percentage: 8, totalValue: 750 },
      ],
      colorDistribution: [
        { color: 'Black', hex: '#000000', count: 35, percentage: 28 },
        { color: 'White', hex: '#FFFFFF', count: 28, percentage: 22 },
        { color: 'Navy', hex: '#001f3f', count: 22, percentage: 17 },
        { color: 'Gray', hex: '#808080', count: 18, percentage: 14 },
        { color: 'Beige', hex: '#F5F5DC', count: 14, percentage: 11 },
        { color: 'Other', hex: '#CCCCCC', count: 10, percentage: 8 },
      ],
      seasonalBreakdown: [
        { season: 'All Season', count: 58, percentage: 46 },
        { season: 'Spring/Summer', count: 38, percentage: 30 },
        { season: 'Fall/Winter', count: 31, percentage: 24 },
      ],
    };
  }

  /**
   * Get wear pattern analysis
   */
  async getWearPatternAnalysis(userId: string): Promise<WearPatternAnalysis> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      totalWears: 342,
      averageWearsPerItem: 2.7,
      wearFrequency: {
        daily: 15,
        weekly: 42,
        monthly: 38,
        rarely: 32,
      },
      peakWearDays: [
        { day: 'Monday', count: 58 },
        { day: 'Wednesday', count: 52 },
        { day: 'Friday', count: 48 },
        { day: 'Tuesday', count: 45 },
        { day: 'Thursday', count: 42 },
        { day: 'Saturday', count: 38 },
        { day: 'Sunday', count: 35 },
      ],
      occasionBreakdown: [
        { occasion: 'Work', count: 156, percentage: 46 },
        { occasion: 'Casual', count: 102, percentage: 30 },
        { occasion: 'Social', count: 54, percentage: 16 },
        { occasion: 'Formal', count: 30, percentage: 8 },
      ],
      monthlyTrend: [
        { month: 'Jan', wears: 28 },
        { month: 'Feb', wears: 32 },
        { month: 'Mar', wears: 35 },
        { month: 'Apr', wears: 38 },
        { month: 'May', wears: 42 },
        { month: 'Jun', wears: 45 },
      ],
    };
  }

  /**
   * Get cost per wear analysis
   */
  async getCostPerWearAnalysis(userId: string): Promise<CostPerWearAnalysis> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      overallCostPerWear: 46.32,
      bestValue: [
        {
          id: 'item-1',
          name: 'Black Blazer',
          cost: 295,
          wears: 45,
          costPerWear: 6.56,
          imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
        },
        {
          id: 'item-2',
          name: 'White T-Shirt',
          cost: 45,
          wears: 38,
          costPerWear: 1.18,
          imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
        },
        {
          id: 'item-3',
          name: 'Jeans',
          cost: 128,
          wears: 32,
          costPerWear: 4.00,
          imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d',
        },
      ],
      worstValue: [
        {
          id: 'item-4',
          name: 'Sequin Dress',
          cost: 450,
          wears: 2,
          costPerWear: 225.00,
          imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae',
        },
        {
          id: 'item-5',
          name: 'Designer Heels',
          cost: 680,
          wears: 5,
          costPerWear: 136.00,
          imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2',
        },
      ],
      categoryComparison: [
        { category: 'Tops', averageCostPerWear: 12.50, totalSpent: 4200, totalWears: 336 },
        { category: 'Bottoms', averageCostPerWear: 15.20, totalSpent: 3360, totalWears: 221 },
        { category: 'Dresses', averageCostPerWear: 45.00, totalSpent: 3600, totalWears: 80 },
        { category: 'Outerwear', averageCostPerWear: 18.75, totalSpent: 2250, totalWears: 120 },
      ],
      savingsOpportunities: [
        {
          message: 'You have 12 items worn less than 3 times',
          potentialSavings: 2400,
          recommendation: 'Consider selling or donating rarely worn items',
        },
        {
          message: 'Invest in versatile basics',
          potentialSavings: 800,
          recommendation: 'Your most-worn items have the best cost-per-wear',
        },
      ],
    };
  }

  /**
   * Get style evolution
   */
  async getStyleEvolution(userId: string): Promise<StyleEvolution> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      timeline: [
        {
          period: '2024 Q1',
          dominantStyles: ['Minimalist', 'Professional'],
          dominantColors: ['Black', 'White', 'Navy'],
          averagePrice: 145,
          itemsAdded: 12,
        },
        {
          period: '2024 Q2',
          dominantStyles: ['Casual', 'Sustainable'],
          dominantColors: ['Beige', 'Earth Tones'],
          averagePrice: 128,
          itemsAdded: 15,
        },
        {
          period: '2024 Q3',
          dominantStyles: ['Bold', 'Trendy'],
          dominantColors: ['Vibrant', 'Patterns'],
          averagePrice: 165,
          itemsAdded: 18,
        },
      ],
      styleShifts: [
        {
          from: 'Fast Fashion',
          to: 'Sustainable Brands',
          confidence: 85,
          date: '2024-04-15',
        },
        {
          from: 'Trendy Pieces',
          to: 'Investment Items',
          confidence: 78,
          date: '2024-06-20',
        },
      ],
      colorEvolution: [
        {
          period: '2024 Q1',
          colors: [
            { color: 'Black', hex: '#000000', percentage: 35 },
            { color: 'White', hex: '#FFFFFF', percentage: 28 },
            { color: 'Navy', hex: '#001f3f', percentage: 20 },
          ],
        },
        {
          period: '2024 Q2',
          colors: [
            { color: 'Beige', hex: '#F5F5DC', percentage: 32 },
            { color: 'Earth Tones', hex: '#8B7355', percentage: 25 },
            { color: 'White', hex: '#FFFFFF', percentage: 22 },
          ],
        },
      ],
      priceEvolution: [
        { period: '2024 Q1', averagePrice: 145, trend: 'stable' },
        { period: '2024 Q2', averagePrice: 128, trend: 'decreasing' },
        { period: '2024 Q3', averagePrice: 165, trend: 'increasing' },
      ],
    };
  }

  /**
   * Get sustainability metrics
   */
  async getSustainabilityMetrics(userId: string): Promise<SustainabilityMetrics> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      totalCarbonFootprint: 2450, // kg CO2
      averagePerItem: 19.3,
      sustainableItems: 38,
      sustainabilityScore: 72,
      recommendations: [
        {
          title: 'Choose sustainable brands',
          description: 'Opt for eco-friendly materials and ethical production',
          impact: 450,
        },
        {
          title: 'Buy less, choose well',
          description: 'Invest in quality pieces that last longer',
          impact: 380,
        },
        {
          title: 'Shop secondhand',
          description: 'Reduce carbon footprint by 80% per item',
          impact: 620,
        },
      ],
      comparisonToAverage: {
        yourFootprint: 2450,
        averageUser: 3200,
        percentageDifference: -23.4,
      },
    };
  }

  /**
   * Get outfit analytics
   */
  async getOutfitAnalytics(userId: string): Promise<OutfitAnalytics> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      totalOutfits: 45,
      averageItemsPerOutfit: 4.2,
      mostUsedCombinations: [
        { items: ['Black Blazer', 'White Shirt', 'Jeans'], count: 12 },
        { items: ['T-Shirt', 'Jeans', 'Sneakers'], count: 10 },
        { items: ['Dress', 'Heels', 'Clutch'], count: 8 },
      ],
      versatilityScore: [
        { item: 'Black Blazer', score: 95, outfitCount: 28 },
        { item: 'White T-Shirt', score: 92, outfitCount: 25 },
        { item: 'Jeans', score: 88, outfitCount: 22 },
      ],
      gapAnalysis: [
        {
          category: 'Formal Shoes',
          recommendation: 'Add versatile pumps for professional occasions',
          priority: 'high',
        },
        {
          category: 'Statement Accessories',
          recommendation: 'Elevate basics with bold jewelry',
          priority: 'medium',
        },
      ],
    };
  }

  /**
   * Get budget analytics
   */
  async getBudgetAnalytics(userId: string): Promise<BudgetAnalytics> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      totalSpent: 15840,
      monthlyAverage: 264,
      yearlyProjection: 3168,
      spendingByCategory: [
        { category: 'Tops', amount: 4200, percentage: 26.5 },
        { category: 'Bottoms', amount: 3360, percentage: 21.2 },
        { category: 'Dresses', amount: 3600, percentage: 22.7 },
        { category: 'Outerwear', amount: 2250, percentage: 14.2 },
        { category: 'Shoes', amount: 1680, percentage: 10.6 },
        { category: 'Accessories', amount: 750, percentage: 4.7 },
      ],
      spendingTrend: [
        { month: 'Jan', amount: 245 },
        { month: 'Feb', amount: 312 },
        { month: 'Mar', amount: 198 },
        { month: 'Apr', amount: 425 },
        { month: 'May', amount: 289 },
        { month: 'Jun', amount: 356 },
      ],
      budgetRecommendations: [
        {
          category: 'Dresses',
          currentSpend: 3600,
          recommendedBudget: 2400,
          reason: 'Lower cost-per-wear ratio',
        },
        {
          category: 'Tops',
          currentSpend: 4200,
          recommendedBudget: 4500,
          reason: 'High versatility and frequent use',
        },
      ],
    };
  }

  /**
   * Export analytics report
   */
  async exportAnalyticsReport(userId: string, format: 'pdf' | 'csv'): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `https://example.com/analytics-report.${format}`;
  }

  /**
   * Get analytics comparison with previous period
   */
  async getComparison(
    userId: string,
    metric: 'spending' | 'wears' | 'items'
  ): Promise<{
    current: number;
    previous: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const comparisons = {
      spending: { current: 264, previous: 312, change: -15.4, trend: 'down' as const },
      wears: { current: 57, previous: 48, change: 18.8, trend: 'up' as const },
      items: { current: 127, previous: 115, change: 10.4, trend: 'up' as const },
    };

    return comparisons[metric];
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();

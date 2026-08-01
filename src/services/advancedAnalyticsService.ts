/**
 * Advanced Analytics Service
 *
 * Provides detailed wardrobe insights, cost-per-wear tracking, and style
 * evolution analytics, computed from the user's real closet items and saved outfits.
 */

import { closetAPI, ClosetItem } from './api';
import { outfitsService, SavedOutfit } from './firestore';

export interface WardrobeInsights {
  totalItems: number;
  totalValue: number;
  averageItemCost: number;
  mostWornItem: { id: string; name: string; wearCount: number; imageUrl: string } | null;
  leastWornItem: { id: string; name: string; wearCount: number; imageUrl: string } | null;
  categoryBreakdown: { category: string; count: number; percentage: number; totalValue: number }[];
  colorDistribution: { color: string; hex: string; count: number; percentage: number }[];
  seasonalBreakdown: { season: string; count: number; percentage: number }[];
}

export interface WearPatternAnalysis {
  totalWears: number;
  averageWearsPerItem: number;
  wearFrequency: { daily: number; weekly: number; monthly: number; rarely: number };
  categoryWearCounts: { category: string; count: number }[];
  colorBreakdown: { color: string; percentage: number }[];
  itemsAddedByMonth: { month: string; count: number }[];
}

export interface CostPerWearAnalysis {
  overallCostPerWear: number;
  bestValue: { id: string; name: string; cost: number; wears: number; costPerWear: number; imageUrl: string }[];
  worstValue: { id: string; name: string; cost: number; wears: number; costPerWear: number; imageUrl: string }[];
  categoryComparison: { category: string; averageCostPerWear: number; totalSpent: number; totalWears: number }[];
  savingsOpportunities: { message: string; potentialSavings: number; recommendation: string }[];
}

export interface StyleEvolution {
  timeline: { period: string; dominantColors: string[]; averagePrice: number; itemsAdded: number }[];
}

export interface OutfitAnalytics {
  totalOutfits: number;
  averageItemsPerOutfit: number;
  mostUsedItems: { itemId: string; name: string; imageUrl: string; count: number }[];
  gapAnalysis: { category: string; recommendation: string; priority: 'high' | 'medium' | 'low' }[];
}

export interface BudgetAnalytics {
  totalSpent: number;
  monthlyAverage: number;
  spendingByCategory: { category: string; amount: number; percentage: number }[];
  spendingTrend: { month: string; amount: number }[];
}

export interface AnalyticsSummary {
  insights: WardrobeInsights;
  wearPatterns: WearPatternAnalysis;
  costPerWear: CostPerWearAnalysis;
  styleEvolution: StyleEvolution;
  outfits: OutfitAnalytics;
  budget: BudgetAnalytics;
  lastUpdated: string;
}

const COLOR_HEX: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', gray: '#808080', grey: '#808080', red: '#EF4444',
  blue: '#3B82F6', navy: '#001f3f', green: '#10B981', yellow: '#F59E0B', pink: '#EC4899',
  purple: '#8B5CF6', brown: '#92400E', beige: '#F5F5DC',
};

class AdvancedAnalyticsService {
  private async loadData(userId: string): Promise<{ items: ClosetItem[]; outfits: SavedOutfit[] }> {
    const [itemsResponse, outfits] = await Promise.all([
      closetAPI.getItems(userId),
      outfitsService.getAll(userId).catch(() => []),
    ]);
    return { items: (itemsResponse.data || []) as unknown as ClosetItem[], outfits };
  }

  async getAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
    const { items, outfits } = await this.loadData(userId);

    return {
      insights: this.computeWardrobeInsights(items),
      wearPatterns: this.computeWearPatterns(items),
      costPerWear: this.computeCostPerWear(items),
      styleEvolution: this.computeStyleEvolution(items),
      outfits: this.computeOutfitAnalytics(items, outfits),
      budget: this.computeBudget(items),
      lastUpdated: new Date().toISOString(),
    };
  }

  private computeWardrobeInsights(items: ClosetItem[]): WardrobeInsights {
    const totalItems = items.length;
    const totalValue = items.reduce((sum, i) => sum + (i.price || 0), 0);
    const averageItemCost = totalItems > 0 ? totalValue / totalItems : 0;

    const sortedByWear = [...items].sort((a, b) => (b.wornCount || 0) - (a.wornCount || 0));
    const toSummary = (item: ClosetItem) => ({
      id: item.id,
      name: [item.color, item.category].filter(Boolean).join(' '),
      wearCount: item.wornCount || 0,
      imageUrl: item.imageUrl,
    });

    const categoryMap = new Map<string, { count: number; totalValue: number }>();
    items.forEach(item => {
      const existing = categoryMap.get(item.category) || { count: 0, totalValue: 0 };
      categoryMap.set(item.category, {
        count: existing.count + 1,
        totalValue: existing.totalValue + (item.price || 0),
      });
    });
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        percentage: totalItems > 0 ? Math.round((data.count / totalItems) * 100) : 0,
        totalValue: data.totalValue,
      }))
      .sort((a, b) => b.count - a.count);

    const colorMap = new Map<string, number>();
    items.forEach(item => {
      if (item.color) colorMap.set(item.color, (colorMap.get(item.color) || 0) + 1);
    });
    const colorDistribution = Array.from(colorMap.entries())
      .map(([color, count]) => ({
        color,
        hex: COLOR_HEX[color.toLowerCase()] || '#CCCCCC',
        count,
        percentage: totalItems > 0 ? Math.round((count / totalItems) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const seasonMap = new Map<string, number>();
    let taggedCount = 0;
    items.forEach(item => {
      (item.seasons || []).forEach(season => {
        seasonMap.set(season, (seasonMap.get(season) || 0) + 1);
        taggedCount++;
      });
    });
    const seasonalBreakdown = Array.from(seasonMap.entries())
      .map(([season, count]) => ({
        season,
        count,
        percentage: taggedCount > 0 ? Math.round((count / taggedCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalItems,
      totalValue,
      averageItemCost,
      mostWornItem: sortedByWear.length > 0 ? toSummary(sortedByWear[0]) : null,
      leastWornItem: sortedByWear.length > 0 ? toSummary(sortedByWear[sortedByWear.length - 1]) : null,
      categoryBreakdown,
      colorDistribution,
      seasonalBreakdown,
    };
  }

  private computeWearPatterns(items: ClosetItem[]): WearPatternAnalysis {
    const totalWears = items.reduce((sum, i) => sum + (i.wornCount || 0), 0);
    const averageWearsPerItem = items.length > 0 ? totalWears / items.length : 0;

    // Real bucketing by actual wornCount (no per-wear-event log exists, so we classify
    // by total lifetime wears rather than fabricating a daily/weekly cadence)
    const wearFrequency = { daily: 0, weekly: 0, monthly: 0, rarely: 0 };
    items.forEach(item => {
      const w = item.wornCount || 0;
      if (w >= 50) wearFrequency.daily++;
      else if (w >= 15) wearFrequency.weekly++;
      else if (w >= 3) wearFrequency.monthly++;
      else wearFrequency.rarely++;
    });

    const categoryWearMap = new Map<string, number>();
    items.forEach(item => {
      categoryWearMap.set(item.category, (categoryWearMap.get(item.category) || 0) + (item.wornCount || 0));
    });
    const categoryWearCounts = Array.from(categoryWearMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const colorMap = new Map<string, number>();
    items.forEach(item => {
      if (item.color) colorMap.set(item.color, (colorMap.get(item.color) || 0) + 1);
    });
    const colorBreakdown = Array.from(colorMap.entries())
      .map(([color, count]) => ({ color, percentage: items.length > 0 ? Math.round((count / items.length) * 100) : 0 }))
      .sort((a, b) => b.percentage - a.percentage);

    // Real: items actually added per month, from createdAt (last 6 months)
    const now = new Date();
    const months: { label: string; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() });
    }
    const itemsAddedByMonth = months.map(({ label, year, month }) => ({
      month: label,
      count: items.filter(item => {
        if (!item.createdAt) return false;
        const d = new Date(item.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length,
    }));

    return { totalWears, averageWearsPerItem, wearFrequency, categoryWearCounts, colorBreakdown, itemsAddedByMonth };
  }

  private computeCostPerWear(items: ClosetItem[]): CostPerWearAnalysis {
    const withCost = items.filter(i => i.price && i.price > 0);
    const totalSpent = withCost.reduce((sum, i) => sum + (i.price || 0), 0);
    const totalWears = withCost.reduce((sum, i) => sum + (i.wornCount || 0), 0);
    const overallCostPerWear = totalWears > 0 ? totalSpent / totalWears : totalSpent;

    const toValueEntry = (item: ClosetItem) => ({
      id: item.id,
      name: [item.color, item.category].filter(Boolean).join(' '),
      cost: item.price || 0,
      wears: item.wornCount || 0,
      costPerWear: (item.price || 0) / Math.max(1, item.wornCount || 0),
      imageUrl: item.imageUrl,
    });

    const withCostPerWear = withCost.map(toValueEntry).sort((a, b) => a.costPerWear - b.costPerWear);
    const bestValue = withCostPerWear.slice(0, 3);
    const worstValue = [...withCostPerWear].sort((a, b) => b.costPerWear - a.costPerWear).slice(0, 3);

    const categoryMap = new Map<string, { totalSpent: number; totalWears: number }>();
    withCost.forEach(item => {
      const existing = categoryMap.get(item.category) || { totalSpent: 0, totalWears: 0 };
      categoryMap.set(item.category, {
        totalSpent: existing.totalSpent + (item.price || 0),
        totalWears: existing.totalWears + (item.wornCount || 0),
      });
    });
    const categoryComparison = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      averageCostPerWear: data.totalWears > 0 ? data.totalSpent / data.totalWears : data.totalSpent,
      totalSpent: data.totalSpent,
      totalWears: data.totalWears,
    }));

    const neverWorn = items.filter(i => (i.wornCount || 0) === 0 && i.price);
    const neverWornValue = neverWorn.reduce((sum, i) => sum + (i.price || 0), 0);
    const savingsOpportunities = neverWorn.length > 0
      ? [{
          message: `You have ${neverWorn.length} item${neverWorn.length === 1 ? '' : 's'} never worn`,
          potentialSavings: Math.round(neverWornValue),
          recommendation: 'Consider selling or donating items you never wear',
        }]
      : [];

    return { overallCostPerWear, bestValue, worstValue, categoryComparison, savingsOpportunities };
  }

  private computeStyleEvolution(items: ClosetItem[]): StyleEvolution {
    const now = new Date();
    const quarters: { label: string; year: number; quarter: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const q = Math.floor(d.getMonth() / 3) + 1;
      quarters.push({ label: `${d.getFullYear()} Q${q}`, year: d.getFullYear(), quarter: q });
    }

    const timeline = quarters.map(({ label, year, quarter }) => {
      const periodItems = items.filter(item => {
        if (!item.createdAt) return false;
        const d = new Date(item.createdAt);
        return d.getFullYear() === year && Math.floor(d.getMonth() / 3) + 1 === quarter;
      });
      const colorCounts = new Map<string, number>();
      periodItems.forEach(i => {
        if (i.color) colorCounts.set(i.color, (colorCounts.get(i.color) || 0) + 1);
      });
      const dominantColors = Array.from(colorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([color]) => color);
      const pricedItems = periodItems.filter(i => i.price);
      const averagePrice = pricedItems.length > 0
        ? pricedItems.reduce((sum, i) => sum + (i.price || 0), 0) / pricedItems.length
        : 0;

      return { period: label, dominantColors, averagePrice, itemsAdded: periodItems.length };
    });

    return { timeline };
  }

  private computeOutfitAnalytics(items: ClosetItem[], outfits: SavedOutfit[]): OutfitAnalytics {
    const totalOutfits = outfits.length;
    const averageItemsPerOutfit = totalOutfits > 0
      ? outfits.reduce((sum, o) => sum + o.itemIds.length, 0) / totalOutfits
      : 0;

    const itemUsage = new Map<string, number>();
    outfits.forEach(outfit => {
      outfit.itemIds.forEach(id => itemUsage.set(id, (itemUsage.get(id) || 0) + 1));
    });
    const itemsById = new Map(items.map(i => [i.id, i]));
    const mostUsedItems = Array.from(itemUsage.entries())
      .map(([itemId, count]) => {
        const item = itemsById.get(itemId);
        return {
          itemId,
          name: item ? [item.color, item.category].filter(Boolean).join(' ') : 'Item',
          imageUrl: item?.imageUrl || '',
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Real gap analysis: categories with zero or very few items
    const categoryCounts = new Map<string, number>();
    items.forEach(item => categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + 1));
    const coreCategories = ['tops', 'bottoms', 'shoes', 'outerwear'];
    const gapAnalysis = coreCategories
      .filter(cat => (categoryCounts.get(cat) || 0) < 2)
      .map(cat => ({
        category: cat.charAt(0).toUpperCase() + cat.slice(1),
        recommendation: `You have ${categoryCounts.get(cat) || 0} ${cat} - consider adding more for outfit variety`,
        priority: (categoryCounts.get(cat) || 0) === 0 ? ('high' as const) : ('medium' as const),
      }));

    return { totalOutfits, averageItemsPerOutfit, mostUsedItems, gapAnalysis };
  }

  private computeBudget(items: ClosetItem[]): BudgetAnalytics {
    const withCost = items.filter(i => i.price && i.price > 0);
    const totalSpent = withCost.reduce((sum, i) => sum + (i.price || 0), 0);

    const categoryMap = new Map<string, number>();
    withCost.forEach(item => categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + (item.price || 0)));
    const spendingByCategory = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const now = new Date();
    const months: { label: string; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() });
    }
    const spendingTrend = months.map(({ label, year, month }) => ({
      month: label,
      amount: withCost
        .filter(item => {
          const dateStr = item.purchaseDate || item.createdAt;
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, i) => sum + (i.price || 0), 0),
    }));

    const monthsWithData = spendingTrend.filter(m => m.amount > 0).length || 1;
    const monthlyAverage = spendingTrend.reduce((sum, m) => sum + m.amount, 0) / monthsWithData;

    return { totalSpent, monthlyAverage, spendingByCategory, spendingTrend };
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();

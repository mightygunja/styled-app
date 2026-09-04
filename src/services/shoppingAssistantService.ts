/**
 * Personalized Shopping Assistant Service
 * 
 * AI-powered shopping recommendations based on wardrobe gaps,
 * style preferences, budget, and upcoming occasions.
 */

import { Item } from '../types';
import { StyleProfile } from './aiStyleService';

export type ShoppingPriority = 'essential' | 'recommended' | 'nice-to-have';
export type BudgetRange = 'budget' | 'mid-range' | 'premium' | 'luxury';

export interface ShoppingRecommendation {
  id: string;
  item: ShoppingItem;
  priority: ShoppingPriority;
  reason: string[];
  wardrobeGap: string;
  versatilityScore: number; // 0-100
  outfitPotential: number; // number of outfits this enables
  alternatives: ShoppingItem[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  color: string;
  brand: string;
  price: number;
  retailer: string;
  affiliateLink?: string;
  inStock: boolean;
  rating?: number;
  reviews?: number;
}

export interface WardrobeGap {
  id: string;
  category: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  suggestedItems: string[];
  outfitsMissing: number;
}

export interface ShoppingList {
  id: string;
  userId: string;
  name: string;
  budget: number;
  items: ShoppingRecommendation[];
  totalCost: number;
  createdAt: string;
}

export interface BudgetAllocation {
  category: string;
  amount: number;
  percentage: number;
  priority: ShoppingPriority;
}

export interface OccasionShoppingGuide {
  occasion: string;
  description: string;
  essentialItems: ShoppingItem[];
  optionalItems: ShoppingItem[];
  totalCost: { min: number; max: number };
  tips: string[];
}

class ShoppingAssistantService {
  private shoppingLists: Map<string, ShoppingList[]> = new Map();

  /**
   * Get personalized shopping recommendations
   */
  async getRecommendations(
    userId: string,
    closetItems: Item[],
    styleProfile?: StyleProfile,
    budget?: number
  ): Promise<ShoppingRecommendation[]> {
    await new Promise(resolve => setTimeout(resolve, 900));

    // Analyze wardrobe gaps
    const gaps = this.analyzeWardrobeGaps(closetItems, styleProfile);

    // Generate recommendations
    const recommendations: ShoppingRecommendation[] = [];

    gaps.forEach(gap => {
      const items = this.getItemsForGap(gap);
      items.forEach(item => {
        recommendations.push({
          id: `rec-${item.id}`,
          item,
          priority: gap.impact === 'high' ? 'essential' : gap.impact === 'medium' ? 'recommended' : 'nice-to-have',
          reason: [
            `Fills ${gap.description}`,
            `Can create ${gap.outfitsMissing} new outfits`,
            `Matches your ${styleProfile?.dominantStyles[0]?.style || 'personal'} style`,
          ],
          wardrobeGap: gap.description,
          versatilityScore: this.calculateVersatility(item, closetItems),
          outfitPotential: gap.outfitsMissing,
          alternatives: this.getAlternatives(item),
        });
      });
    });

    // Filter by budget if provided
    if (budget) {
      return this.filterByBudget(recommendations, budget);
    }

    return recommendations.slice(0, 10);
  }

  /**
   * Analyze wardrobe gaps
   */
  private analyzeWardrobeGaps(closetItems: Item[], styleProfile?: StyleProfile): WardrobeGap[] {
    const gaps: WardrobeGap[] = [];

    // Check for essential categories
    const categories = new Set(closetItems.map(item => item.category));
    
    const essentialCategories = [
      { name: 'tops', description: 'versatile tops', impact: 'high' as const, outfits: 15 },
      { name: 'bottoms', description: 'quality bottoms', impact: 'high' as const, outfits: 12 },
      { name: 'shoes', description: 'everyday shoes', impact: 'medium' as const, outfits: 10 },
      { name: 'outerwear', description: 'layering pieces', impact: 'medium' as const, outfits: 8 },
      { name: 'accessories', description: 'statement accessories', impact: 'low' as const, outfits: 5 },
    ];

    essentialCategories.forEach((cat, index) => {
      const itemsInCategory = closetItems.filter(item => item.category === cat.name).length;
      
      if (itemsInCategory < 3) {
        gaps.push({
          id: `gap-${index}`,
          category: cat.name,
          description: cat.description,
          impact: cat.impact,
          suggestedItems: [cat.name],
          outfitsMissing: cat.outfits,
        });
      }
    });

    // Check for color gaps
    const colors = new Set(closetItems.map(item => item.color).filter(Boolean));
    if (!colors.has('black') || !colors.has('white')) {
      gaps.push({
        id: 'gap-neutrals',
        category: 'basics',
        description: 'neutral basics',
        impact: 'high',
        suggestedItems: ['black top', 'white top'],
        outfitsMissing: 20,
      });
    }

    return gaps;
  }

  /**
   * Get items for a wardrobe gap
   */
  private getItemsForGap(gap: WardrobeGap): ShoppingItem[] {
    const mockItems: ShoppingItem[] = [
      {
        id: 'shop-1',
        name: 'Classic White T-Shirt',
        // Neutral flat-lay shot — the old id was a male model, which read
        // wrong in a womenswear closet's gap suggestions.
        imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400',
        category: 'tops',
        color: 'white',
        brand: 'Everlane',
        price: 35,
        retailer: 'Everlane',
        inStock: true,
        rating: 4.8,
        reviews: 1250,
      },
      {
        id: 'shop-2',
        name: 'Black Slim Jeans',
        imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
        category: 'bottoms',
        color: 'black',
        brand: 'Levi\'s',
        price: 98,
        retailer: 'Levi\'s',
        inStock: true,
        rating: 4.6,
        reviews: 890,
      },
      {
        id: 'shop-3',
        name: 'Minimalist Leather Sneakers',
        imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
        category: 'shoes',
        color: 'white',
        brand: 'Common Projects',
        price: 425,
        retailer: 'Nordstrom',
        inStock: true,
        rating: 4.9,
        reviews: 2100,
      },
      {
        id: 'shop-4',
        name: 'Wool Blend Overcoat',
        imageUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400',
        category: 'outerwear',
        color: 'camel',
        brand: 'J.Crew',
        price: 298,
        retailer: 'J.Crew',
        inStock: true,
        rating: 4.7,
        reviews: 450,
      },
    ];

    // Filter items that match the gap category
    return mockItems.filter(item => 
      item.category === gap.category || gap.suggestedItems.some(s => item.name.toLowerCase().includes(s))
    );
  }

  /**
   * Calculate versatility score
   */
  private calculateVersatility(item: ShoppingItem, closetItems: Item[]): number {
    let score = 50; // Base score

    // Neutral colors are more versatile
    const neutralColors = ['black', 'white', 'gray', 'navy', 'beige', 'cream'];
    if (neutralColors.includes(item.color.toLowerCase())) {
      score += 20;
    }

    // Basic categories are more versatile
    const basicCategories = ['tops', 'bottoms', 'shoes'];
    if (basicCategories.includes(item.category)) {
      score += 15;
    }

    // Items that complement existing wardrobe
    const matchingItems = closetItems.filter(existing => 
      existing.category !== item.category
    );
    score += Math.min(15, matchingItems.length);

    return Math.min(100, score);
  }

  /**
   * Get alternative items
   */
  private getAlternatives(item: ShoppingItem): ShoppingItem[] {
    return [
      {
        ...item,
        id: `${item.id}-alt1`,
        name: `${item.name} (Alternative)`,
        brand: 'Alternative Brand',
        price: item.price * 0.7,
        retailer: 'Alternative Store',
      },
      {
        ...item,
        id: `${item.id}-alt2`,
        name: `${item.name} (Budget)`,
        brand: 'Budget Brand',
        price: item.price * 0.5,
        retailer: 'Budget Store',
      },
    ];
  }

  /**
   * Filter recommendations by budget
   */
  private filterByBudget(
    recommendations: ShoppingRecommendation[],
    budget: number
  ): ShoppingRecommendation[] {
    // Sort by priority and versatility
    const sorted = [...recommendations].sort((a, b) => {
      const priorityWeight = { essential: 3, recommended: 2, 'nice-to-have': 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.versatilityScore - a.versatilityScore;
    });

    // Select items within budget
    const selected: ShoppingRecommendation[] = [];
    let totalCost = 0;

    for (const rec of sorted) {
      if (totalCost + rec.item.price <= budget) {
        selected.push(rec);
        totalCost += rec.item.price;
      }
    }

    return selected;
  }

  /**
   * Create shopping list
   */
  async createShoppingList(
    userId: string,
    name: string,
    items: ShoppingRecommendation[],
    budget: number
  ): Promise<ShoppingList> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const list: ShoppingList = {
      id: `list-${Date.now()}`,
      userId,
      name,
      budget,
      items,
      totalCost: items.reduce((sum, item) => sum + item.item.price, 0),
      createdAt: new Date().toISOString(),
    };

    const userLists = this.shoppingLists.get(userId) || [];
    userLists.push(list);
    this.shoppingLists.set(userId, userLists);

    return list;
  }

  /**
   * Get shopping lists
   */
  async getShoppingLists(userId: string): Promise<ShoppingList[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.shoppingLists.get(userId) || [];
  }

  /**
   * Get budget allocation suggestions
   */
  async getBudgetAllocation(totalBudget: number): Promise<BudgetAllocation[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return [
      { category: 'Basics', amount: totalBudget * 0.4, percentage: 40, priority: 'essential' },
      { category: 'Shoes', amount: totalBudget * 0.25, percentage: 25, priority: 'essential' },
      { category: 'Outerwear', amount: totalBudget * 0.2, percentage: 20, priority: 'recommended' },
      { category: 'Accessories', amount: totalBudget * 0.15, percentage: 15, priority: 'nice-to-have' },
    ];
  }

  /**
   * Get occasion shopping guide
   */
  async getOccasionGuide(occasion: string): Promise<OccasionShoppingGuide> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const guides: Record<string, OccasionShoppingGuide> = {
      work: {
        occasion: 'Work Wardrobe',
        description: 'Professional pieces for the office',
        essentialItems: [
          {
            id: 'work-1',
            name: 'Tailored Blazer',
            imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
            category: 'outerwear',
            color: 'navy',
            brand: 'Theory',
            price: 395,
            retailer: 'Nordstrom',
            inStock: true,
          },
          {
            id: 'work-2',
            name: 'Dress Pants',
            imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400',
            category: 'bottoms',
            color: 'black',
            brand: 'Banana Republic',
            price: 120,
            retailer: 'Banana Republic',
            inStock: true,
          },
        ],
        optionalItems: [
          {
            id: 'work-3',
            name: 'Silk Blouse',
            imageUrl: 'https://images.unsplash.com/photo-1564257577-d18b2b6e3a8f?w=400',
            category: 'tops',
            color: 'white',
            brand: 'Equipment',
            price: 228,
            retailer: 'Bloomingdale\'s',
            inStock: true,
          },
        ],
        totalCost: { min: 515, max: 743 },
        tips: [
          'Invest in quality basics that last',
          'Stick to neutral colors for versatility',
          'Choose wrinkle-resistant fabrics',
          'Ensure proper fit for professional appearance',
        ],
      },
    };

    return guides[occasion] || guides.work;
  }

  /**
   * Get price comparison
   */
  async getPriceComparison(itemName: string): Promise<{
    item: string;
    prices: { retailer: string; price: number; link: string }[];
    lowestPrice: number;
    averagePrice: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockPrices = [
      { retailer: 'Nordstrom', price: 98, link: 'https://nordstrom.com' },
      { retailer: 'Amazon', price: 85, link: 'https://amazon.com' },
      { retailer: 'Zappos', price: 92, link: 'https://zappos.com' },
    ];

    return {
      item: itemName,
      prices: mockPrices,
      lowestPrice: Math.min(...mockPrices.map(p => p.price)),
      averagePrice: mockPrices.reduce((sum, p) => sum + p.price, 0) / mockPrices.length,
    };
  }
}

export const shoppingAssistantService = new ShoppingAssistantService();

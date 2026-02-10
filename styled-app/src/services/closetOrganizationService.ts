/**
 * AI-Powered Closet Organization Service
 * 
 * Smart categorization, decluttering suggestions, capsule wardrobe
 * creation, and organization recommendations.
 */

import { Item } from '../types';

export type OrganizationMethod = 'color' | 'category' | 'season' | 'occasion' | 'frequency';
export type DeclutterReason = 'unused' | 'duplicate' | 'poor-fit' | 'outdated' | 'damaged';

export interface OrganizationPlan {
  method: OrganizationMethod;
  sections: OrganizationSection[];
  totalItems: number;
  estimatedTime: number; // minutes
}

export interface OrganizationSection {
  id: string;
  name: string;
  items: Item[];
  color?: string;
  order: number;
}

export interface DeclutterSuggestion {
  id: string;
  item: Item;
  reason: DeclutterReason;
  confidence: number; // 0-100
  explanation: string;
  lastWorn?: string;
  alternatives?: Item[];
}

export interface CapsuleWardrobe {
  id: string;
  name: string;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'year-round';
  items: Item[];
  outfitCombinations: number;
  essentialPieces: string[];
  colorPalette: string[];
}

export interface UsageAnalytics {
  itemId: string;
  wearCount: number;
  lastWorn: string;
  costPerWear: number;
  versatilityScore: number;
  seasonalUse: { season: string; count: number }[];
}

export interface OrganizationTip {
  id: string;
  category: string;
  tip: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

class ClosetOrganizationService {
  /**
   * Generate organization plan
   */
  async generateOrganizationPlan(
    items: Item[],
    method: OrganizationMethod
  ): Promise<OrganizationPlan> {
    await new Promise(resolve => setTimeout(resolve, 700));

    const sections = this.organizeBySections(items, method);

    return {
      method,
      sections,
      totalItems: items.length,
      estimatedTime: Math.ceil(items.length * 2), // 2 minutes per item
    };
  }

  /**
   * Organize items into sections
   */
  private organizeBySections(items: Item[], method: OrganizationMethod): OrganizationSection[] {
    switch (method) {
      case 'color':
        return this.organizeByColor(items);
      case 'category':
        return this.organizeByCategory(items);
      case 'season':
        return this.organizeBySeason(items);
      case 'occasion':
        return this.organizeByOccasion(items);
      case 'frequency':
        return this.organizeByFrequency(items);
      default:
        return this.organizeByCategory(items);
    }
  }

  /**
   * Organize by color
   */
  private organizeByColor(items: Item[]): OrganizationSection[] {
    const colorOrder = ['white', 'black', 'gray', 'beige', 'brown', 'blue', 'green', 'red', 'pink', 'purple', 'yellow', 'orange'];
    const sections: OrganizationSection[] = [];

    colorOrder.forEach((color, index) => {
      const colorItems = items.filter(item => 
        item.color?.toLowerCase().includes(color)
      );

      if (colorItems.length > 0) {
        sections.push({
          id: `color-${color}`,
          name: color.charAt(0).toUpperCase() + color.slice(1),
          items: colorItems,
          color,
          order: index,
        });
      }
    });

    // Add "Other" section for remaining items
    const categorizedItems = sections.flatMap(s => s.items);
    const otherItems = items.filter(item => !categorizedItems.includes(item));
    if (otherItems.length > 0) {
      sections.push({
        id: 'color-other',
        name: 'Other Colors',
        items: otherItems,
        order: colorOrder.length,
      });
    }

    return sections;
  }

  /**
   * Organize by category
   */
  private organizeByCategory(items: Item[]): OrganizationSection[] {
    const categories = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];
    const sections: OrganizationSection[] = [];

    categories.forEach((category, index) => {
      const categoryItems = items.filter(item => item.category === category);

      if (categoryItems.length > 0) {
        sections.push({
          id: `category-${category}`,
          name: category.charAt(0).toUpperCase() + category.slice(1),
          items: categoryItems,
          order: index,
        });
      }
    });

    return sections;
  }

  /**
   * Organize by season
   */
  private organizeBySeason(items: Item[]): OrganizationSection[] {
    return [
      {
        id: 'season-spring',
        name: 'Spring',
        items: items.filter((_, i) => i % 4 === 0),
        order: 0,
      },
      {
        id: 'season-summer',
        name: 'Summer',
        items: items.filter((_, i) => i % 4 === 1),
        order: 1,
      },
      {
        id: 'season-fall',
        name: 'Fall',
        items: items.filter((_, i) => i % 4 === 2),
        order: 2,
      },
      {
        id: 'season-winter',
        name: 'Winter',
        items: items.filter((_, i) => i % 4 === 3),
        order: 3,
      },
    ];
  }

  /**
   * Organize by occasion
   */
  private organizeByOccasion(items: Item[]): OrganizationSection[] {
    return [
      {
        id: 'occasion-casual',
        name: 'Casual',
        items: items.filter((_, i) => i % 3 === 0),
        order: 0,
      },
      {
        id: 'occasion-work',
        name: 'Work',
        items: items.filter((_, i) => i % 3 === 1),
        order: 1,
      },
      {
        id: 'occasion-formal',
        name: 'Formal',
        items: items.filter((_, i) => i % 3 === 2),
        order: 2,
      },
    ];
  }

  /**
   * Organize by frequency
   */
  private organizeByFrequency(items: Item[]): OrganizationSection[] {
    return [
      {
        id: 'freq-daily',
        name: 'Wear Often',
        items: items.slice(0, Math.floor(items.length * 0.3)),
        order: 0,
      },
      {
        id: 'freq-weekly',
        name: 'Wear Sometimes',
        items: items.slice(Math.floor(items.length * 0.3), Math.floor(items.length * 0.7)),
        order: 1,
      },
      {
        id: 'freq-rarely',
        name: 'Wear Rarely',
        items: items.slice(Math.floor(items.length * 0.7)),
        order: 2,
      },
    ];
  }

  /**
   * Get declutter suggestions
   */
  async getDeclutterSuggestions(items: Item[]): Promise<DeclutterSuggestion[]> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const suggestions: DeclutterSuggestion[] = [];

    // Mock suggestions based on various criteria
    items.forEach((item, index) => {
      // Simulate unused items (every 5th item)
      if (index % 5 === 0) {
        suggestions.push({
          id: `declutter-${item.id}`,
          item,
          reason: 'unused',
          confidence: 85,
          explanation: 'You haven\'t worn this in over 6 months',
          lastWorn: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Simulate duplicates (every 7th item)
      if (index % 7 === 0 && index > 0) {
        suggestions.push({
          id: `declutter-${item.id}`,
          item,
          reason: 'duplicate',
          confidence: 75,
          explanation: 'You have 3 similar items in the same color',
          alternatives: [items[index - 1]],
        });
      }
    });

    return suggestions.slice(0, 8); // Return top 8 suggestions
  }

  /**
   * Create capsule wardrobe
   */
  async createCapsuleWardrobe(
    items: Item[],
    season: 'spring' | 'summer' | 'fall' | 'winter' | 'year-round',
    pieceCount: number = 30
  ): Promise<CapsuleWardrobe> {
    await new Promise(resolve => setTimeout(resolve, 900));

    // Select versatile, neutral items
    const selectedItems = this.selectCapsuleItems(items, pieceCount);

    // Calculate outfit combinations
    const tops = selectedItems.filter(i => i.category === 'tops').length;
    const bottoms = selectedItems.filter(i => i.category === 'bottoms').length;
    const outfitCombinations = tops * bottoms + selectedItems.filter(i => i.category === 'dresses').length;

    return {
      id: `capsule-${Date.now()}`,
      name: `${season.charAt(0).toUpperCase() + season.slice(1)} Capsule`,
      season,
      items: selectedItems,
      outfitCombinations,
      essentialPieces: [
        'White T-Shirt',
        'Black Jeans',
        'Neutral Blazer',
        'Versatile Shoes',
        'Classic Dress',
      ],
      colorPalette: ['black', 'white', 'gray', 'navy', 'beige'],
    };
  }

  /**
   * Select items for capsule wardrobe
   */
  private selectCapsuleItems(items: Item[], count: number): Item[] {
    // Prioritize neutral colors and versatile categories
    const scored = items.map(item => ({
      item,
      score: this.calculateCapsuleScore(item),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, count).map(s => s.item);
  }

  /**
   * Calculate capsule wardrobe score
   */
  private calculateCapsuleScore(item: Item): number {
    let score = 0;

    // Neutral colors get higher scores
    const neutralColors = ['black', 'white', 'gray', 'navy', 'beige', 'cream'];
    if (item.color && neutralColors.includes(item.color.toLowerCase())) {
      score += 30;
    }

    // Versatile categories
    const versatileCategories = ['tops', 'bottoms', 'shoes'];
    if (versatileCategories.includes(item.category)) {
      score += 20;
    }

    // Quality brands (if available)
    if (item.brand) {
      score += 10;
    }

    return score;
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(itemId: string): Promise<UsageAnalytics> {
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock analytics
    const wearCount = Math.floor(Math.random() * 50) + 1;
    const price = Math.floor(Math.random() * 200) + 50;

    return {
      itemId,
      wearCount,
      lastWorn: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      costPerWear: price / wearCount,
      versatilityScore: Math.floor(Math.random() * 40) + 60,
      seasonalUse: [
        { season: 'Spring', count: Math.floor(wearCount * 0.25) },
        { season: 'Summer', count: Math.floor(wearCount * 0.25) },
        { season: 'Fall', count: Math.floor(wearCount * 0.25) },
        { season: 'Winter', count: Math.floor(wearCount * 0.25) },
      ],
    };
  }

  /**
   * Get organization tips
   */
  async getOrganizationTips(): Promise<OrganizationTip[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return [
      {
        id: 'tip-1',
        category: 'Storage',
        tip: 'Use matching hangers for a cohesive look and to maximize space',
        priority: 'high',
        icon: '🧥',
      },
      {
        id: 'tip-2',
        category: 'Maintenance',
        tip: 'Rotate seasonal items every 3 months to keep your closet fresh',
        priority: 'high',
        icon: '🔄',
      },
      {
        id: 'tip-3',
        category: 'Decluttering',
        tip: 'Follow the one-year rule: if you haven\'t worn it in a year, consider donating',
        priority: 'medium',
        icon: '♻️',
      },
      {
        id: 'tip-4',
        category: 'Organization',
        tip: 'Group similar items together for easier outfit planning',
        priority: 'medium',
        icon: '📦',
      },
      {
        id: 'tip-5',
        category: 'Space',
        tip: 'Use shelf dividers and bins to maximize vertical space',
        priority: 'low',
        icon: '📏',
      },
    ];
  }

  /**
   * Get color coordination suggestions
   */
  async getColorCoordination(items: Item[]): Promise<{
    dominantColors: { color: string; count: number; percentage: number }[];
    suggestions: string[];
  }> {
    await new Promise(resolve => setTimeout(resolve, 400));

    // Count colors
    const colorCounts = new Map<string, number>();
    items.forEach(item => {
      if (item.color) {
        const color = item.color.toLowerCase();
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
    });

    // Convert to array and sort
    const dominantColors = Array.from(colorCounts.entries())
      .map(([color, count]) => ({
        color,
        count,
        percentage: Math.round((count / items.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const suggestions = [
      'Your wardrobe is well-balanced with neutral tones',
      'Consider adding pops of color for variety',
      'Black and white pieces can be mixed with any color',
      'Navy pairs well with most colors in your closet',
    ];

    return { dominantColors, suggestions };
  }
}

export const closetOrganizationService = new ClosetOrganizationService();

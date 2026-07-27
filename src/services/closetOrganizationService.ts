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
    const seasons: { id: string; name: string; key: string }[] = [
      { id: 'season-spring', name: 'Spring', key: 'spring' },
      { id: 'season-summer', name: 'Summer', key: 'summer' },
      { id: 'season-fall', name: 'Fall', key: 'fall' },
      { id: 'season-winter', name: 'Winter', key: 'winter' },
    ];

    const sections = seasons.map((s, index) => ({
      id: s.id,
      name: s.name,
      items: items.filter(item => (item.seasons || []).includes(s.key)),
      order: index,
    }));

    // Items with no season tag at all go in a real "Unsorted" bucket rather than being
    // force-distributed round-robin
    const taggedIds = new Set(sections.flatMap(s => s.items.map(i => i.id)));
    const untagged = items.filter(item => !taggedIds.has(item.id));
    if (untagged.length > 0) {
      sections.push({ id: 'season-untagged', name: 'Not Season-Tagged', items: untagged, order: 4 });
    }

    return sections;
  }

  /**
   * Organize by occasion - uses the AI-classified `style` field (casual/formal/sporty/etc)
   * as the closest real proxy, since closet items have no dedicated occasion field.
   */
  private organizeByOccasion(items: Item[]): OrganizationSection[] {
    const buckets: { id: string; name: string; match: (style: string) => boolean }[] = [
      { id: 'occasion-casual', name: 'Casual', match: s => /casual|everyday|relaxed/.test(s) },
      { id: 'occasion-work', name: 'Work', match: s => /formal|business|professional/.test(s) },
      { id: 'occasion-sport', name: 'Athletic', match: s => /sport|athletic|active/.test(s) },
    ];

    const sections = buckets.map((b, index) => ({
      id: b.id,
      name: b.name,
      items: items.filter(item => item.style && b.match(item.style.toLowerCase())),
      order: index,
    }));

    const categorizedIds = new Set(sections.flatMap(s => s.items.map(i => i.id)));
    const other = items.filter(item => !categorizedIds.has(item.id));
    if (other.length > 0) {
      sections.push({ id: 'occasion-other', name: 'Other', items: other, order: 3 });
    }

    return sections;
  }

  /**
   * Organize by frequency - real, sorted by actual wornCount
   */
  private organizeByFrequency(items: Item[]): OrganizationSection[] {
    const sorted = [...items].sort((a, b) => (b.wornCount || 0) - (a.wornCount || 0));

    return [
      {
        id: 'freq-daily',
        name: 'Wear Often',
        items: sorted.filter(i => (i.wornCount || 0) >= 15),
        order: 0,
      },
      {
        id: 'freq-weekly',
        name: 'Wear Sometimes',
        items: sorted.filter(i => (i.wornCount || 0) >= 3 && (i.wornCount || 0) < 15),
        order: 1,
      },
      {
        id: 'freq-rarely',
        name: 'Wear Rarely',
        items: sorted.filter(i => (i.wornCount || 0) < 3),
        order: 2,
      },
    ];
  }

  /**
   * Get declutter suggestions
   */
  async getDeclutterSuggestions(items: Item[]): Promise<DeclutterSuggestion[]> {
    const suggestions: DeclutterSuggestion[] = [];
    const now = Date.now();
    const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

    // Real "unused" detection: never worn, or not worn in 6+ months
    items.forEach(item => {
      const wornCount = item.wornCount || 0;
      const lastWornMs = item.lastWornDate ? new Date(item.lastWornDate).getTime() : null;
      const staleWear = lastWornMs !== null && now - lastWornMs > SIX_MONTHS_MS;

      if (wornCount === 0) {
        suggestions.push({
          id: `declutter-unused-${item.id}`,
          item,
          reason: 'unused',
          confidence: 90,
          explanation: "You haven't worn this item yet",
        });
      } else if (staleWear) {
        suggestions.push({
          id: `declutter-unused-${item.id}`,
          item,
          reason: 'unused',
          confidence: 75,
          explanation: "You haven't worn this in over 6 months",
          lastWorn: item.lastWornDate,
        });
      }
    });

    // Real duplicate detection: 2+ items sharing category + color
    const groups = new Map<string, Item[]>();
    items.forEach(item => {
      const key = `${item.category}|${(item.color || '').toLowerCase()}`;
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
    });
    groups.forEach(group => {
      if (group.length > 1) {
        group.forEach(item => {
          suggestions.push({
            id: `declutter-dup-${item.id}`,
            item,
            reason: 'duplicate',
            confidence: 70,
            explanation: `You have ${group.length} similar ${item.category} items in ${item.color || 'this color'}`,
            alternatives: group.filter(i => i.id !== item.id),
          });
        });
      }
    });

    return suggestions.slice(0, 8);
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

    // Real essentials: top-scoring item per category among the actually-selected items
    const essentialPieces = ['tops', 'bottoms', 'shoes', 'outerwear', 'dresses', 'accessories']
      .map(category => {
        const inCategory = selectedItems.filter(i => i.category === category);
        if (inCategory.length === 0) return null;
        const best = [...inCategory].sort(
          (a, b) => this.calculateCapsuleScore(b) - this.calculateCapsuleScore(a)
        )[0];
        return [best.color, best.category].filter(Boolean).join(' ');
      })
      .filter((s): s is string => Boolean(s));

    // Real color palette: actual dominant colors among the selected items
    const colorCounts = new Map<string, number>();
    selectedItems.forEach(item => {
      if (item.color) colorCounts.set(item.color.toLowerCase(), (colorCounts.get(item.color.toLowerCase()) || 0) + 1);
    });
    const colorPalette = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color);

    return {
      id: `capsule-${Date.now()}`,
      name: `${season.charAt(0).toUpperCase() + season.slice(1)} Capsule`,
      season,
      items: selectedItems,
      outfitCombinations,
      essentialPieces,
      colorPalette,
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

    // Real signal: items already worn a lot have proven versatility
    score += Math.min(20, item.wornCount || 0);

    return score;
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(item: Item): Promise<UsageAnalytics> {
    const wearCount = item.wornCount || 0;
    const price = item.price || 0;

    return {
      itemId: item.id,
      wearCount,
      lastWorn: item.lastWornDate || '',
      costPerWear: price / Math.max(1, wearCount),
      versatilityScore: this.calculateCapsuleScore(item),
      seasonalUse: ['spring', 'summer', 'fall', 'winter'].map(season => ({
        season: season.charAt(0).toUpperCase() + season.slice(1),
        count: (item.seasons || []).includes(season) ? wearCount : 0,
      })),
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

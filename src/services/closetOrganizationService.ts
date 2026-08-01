/**
 * AI-Powered Closet Organization Service
 * 
 * Smart categorization, decluttering suggestions, capsule wardrobe
 * creation, and organization recommendations.
 */

import { Item } from '../types';

/**
 * Optional style-profile signals used to make capsule selection personal
 * instead of purely neutral-color/wear-count driven. Every field is optional
 * so the builder still works for users who haven't completed a color or
 * body & fit analysis yet.
 */
export interface CapsuleProfileContext {
  recommendedColors?: string[];   // from ColorAnalysisResult.palette
  colorsToAvoid?: string[];       // from ColorAnalysisResult.colorsToAvoid
  bodyMatchKeywords?: string[];   // from BODY_TYPE_GUIDES[bodyType].matchKeywords
  styleArchetypes?: string[];
  avoidRules?: string[];          // hard exclusion, same as everywhere else in the app
}

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

export interface CapsuleOutfitPreview {
  items: Item[];
  label: string; // e.g. "Navy top + black trousers + white sneakers"
}

export interface CapsuleGap {
  category: string;
  message: string;
}

export interface CapsuleWardrobe {
  id: string;
  name: string;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'year-round';
  items: Item[];
  outfitCombinations: number;
  essentialPieces: string[];
  colorPalette: string[];
  outfitPreviews: CapsuleOutfitPreview[];
  gaps: CapsuleGap[];
  personalized: boolean; // true when built with at least one profile signal
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

/**
 * Flags core categories with zero items anywhere in the closet. Standalone
 * export so the marketplace matching engine can reuse the same gap signal
 * ("you have 0 shoes" -> boost shoe products) without duplicating it.
 */
export function findCapsuleGaps(allItems: Item[]): CapsuleGap[] {
  const coreCategories: { key: string; label: string }[] = [
    { key: 'tops', label: 'tops' },
    { key: 'bottoms', label: 'bottoms' },
    { key: 'shoes', label: 'shoes' },
  ];

  return coreCategories
    .filter(c => !allItems.some(item => item.category === c.key))
    .map(c => ({
      category: c.key,
      message: `You don't have any ${c.label} in your closet yet - add a few to complete a real capsule.`,
    }));
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
    const categories = [
      { key: 'tops', label: 'Tops' },
      { key: 'bottoms', label: 'Bottoms' },
      { key: 'dresses', label: 'Dresses' },
      { key: 'outerwear', label: 'Outerwear' },
      { key: 'shoes', label: 'Shoes' },
      { key: 'accessories', label: 'Accessories' },
    ];
    const sections: OrganizationSection[] = [];

    categories.forEach((category, index) => {
      const categoryItems = items.filter(item => item.category === category.key);

      if (categoryItems.length > 0) {
        sections.push({
          id: `category-${category.key}`,
          name: category.label,
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
   * Create capsule wardrobe. Optionally personalized against the user's color
   * season, body/fit guidance, and style profile - StyleDNA's capsule content
   * is generic; this one is built from what the user actually owns and, when
   * available, what actually suits them.
   */
  async createCapsuleWardrobe(
    items: Item[],
    season: 'spring' | 'summer' | 'fall' | 'winter' | 'year-round',
    pieceCount: number = 30,
    profile?: CapsuleProfileContext
  ): Promise<CapsuleWardrobe> {
    await new Promise(resolve => setTimeout(resolve, 900));

    // Hard exclusion: items matching an explicit avoid-rule never enter the
    // capsule, same treatment avoidRules gets everywhere else in the app.
    const avoidRules = (profile?.avoidRules || []).map(r => r.toLowerCase());
    const candidates = avoidRules.length === 0
      ? items
      : items.filter(item => {
          const haystack = [item.color || '', item.style || '', ...(item.tags || [])].join(' ').toLowerCase();
          return !avoidRules.some(rule => haystack.includes(rule));
        });

    const selectedItems = this.selectCapsuleItems(candidates, pieceCount, profile);

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
          (a, b) => this.calculateCapsuleScore(b, profile) - this.calculateCapsuleScore(a, profile)
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
      outfitPreviews: this.buildOutfitPreviews(selectedItems),
      gaps: this.findCapsuleGaps(items),
      personalized: !!(profile && (
        (profile.recommendedColors?.length ?? 0) > 0 ||
        (profile.bodyMatchKeywords?.length ?? 0) > 0 ||
        (profile.styleArchetypes?.length ?? 0) > 0 ||
        avoidRules.length > 0
      )),
    };
  }

  /**
   * Select items for capsule wardrobe
   */
  private selectCapsuleItems(items: Item[], count: number, profile?: CapsuleProfileContext): Item[] {
    // Prioritize neutral colors, versatile categories, and (when available) fit/color/style match
    const scored = items.map(item => ({
      item,
      score: this.calculateCapsuleScore(item, profile),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, count).map(s => s.item);
  }

  /**
   * Calculate capsule wardrobe score. Base score rewards neutral, versatile,
   * proven (worn) pieces; profile signals - when present - add a personalized
   * layer on top rather than replacing the base logic, so the builder still
   * works well for users with no color/body analysis yet.
   */
  private calculateCapsuleScore(item: Item, profile?: CapsuleProfileContext): number {
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

    if (profile) {
      const itemColor = (item.color || '').toLowerCase();
      const haystack = [item.style || '', ...(item.tags || [])].join(' ').toLowerCase();

      if (profile.recommendedColors?.some(c => c.toLowerCase().includes(itemColor) || itemColor.includes(c.toLowerCase()))) {
        score += 25; // fits their color season
      }
      if (profile.colorsToAvoid?.some(c => c.toLowerCase().includes(itemColor) || itemColor.includes(c.toLowerCase()))) {
        score -= 25; // clashes with their color season
      }
      if (profile.bodyMatchKeywords?.some(kw => haystack.includes(kw.toLowerCase()))) {
        score += 20; // cut/silhouette suits their body & fit type
      }
      if (profile.styleArchetypes?.some(a => haystack.includes(a.toLowerCase()))) {
        score += 15; // matches their style archetypes
      }
    }

    return score;
  }

  /**
   * Sample outfit previews from the capsule - bounded (max 3), not a full
   * combinatorial expansion, so this stays instant even on a 40-piece capsule.
   * Turns "24 outfit combinations" from an abstract number into something
   * the user can actually picture.
   */
  private buildOutfitPreviews(selectedItems: Item[]): CapsuleOutfitPreview[] {
    const tops = selectedItems.filter(i => i.category === 'tops').sort((a, b) => (b.wornCount || 0) - (a.wornCount || 0));
    const bottoms = selectedItems.filter(i => i.category === 'bottoms').sort((a, b) => (b.wornCount || 0) - (a.wornCount || 0));
    const shoes = selectedItems.filter(i => i.category === 'shoes');
    const dresses = selectedItems.filter(i => i.category === 'dresses');

    const previews: CapsuleOutfitPreview[] = [];
    const maxPreviews = 3;

    for (let i = 0; i < Math.min(tops.length, bottoms.length) && previews.length < maxPreviews; i++) {
      const outfitItems = [tops[i], bottoms[i % bottoms.length]];
      if (shoes[i % Math.max(1, shoes.length)] && shoes.length > 0) outfitItems.push(shoes[i % shoes.length]);
      previews.push({
        items: outfitItems,
        label: outfitItems.map(it => [it.color, it.category].filter(Boolean).join(' ')).join(' + '),
      });
    }

    for (const dress of dresses.slice(0, maxPreviews - previews.length)) {
      const outfitItems = [dress];
      if (shoes[0]) outfitItems.push(shoes[0]);
      previews.push({
        items: outfitItems,
        label: outfitItems.map(it => [it.color, it.category].filter(Boolean).join(' ')).join(' + '),
      });
    }

    return previews;
  }

  /**
   * Flags core categories with zero items anywhere in the closet (not just
   * the selection) - a real capsule needs bottoms and shoes to function, and
   * StyleDNA's static guide content has no equivalent gap-awareness at all.
   */
  private findCapsuleGaps(allItems: Item[]): CapsuleGap[] {
    return findCapsuleGaps(allItems);
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

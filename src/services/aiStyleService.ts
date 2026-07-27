/**
 * AI Style Analysis Service
 * 
 * Analyzes user's closet to identify style profile, color preferences,
 * brand patterns, and wardrobe insights.
 */

import { Item, ItemCategory } from '../types';

export type StyleCategory = 
  | 'minimalist'
  | 'bohemian'
  | 'streetwear'
  | 'vintage'
  | 'classic'
  | 'athleisure'
  | 'formal'
  | 'casual';

export interface StyleProfile {
  userId: string;
  dominantStyles: StyleCategoryScore[];
  colorPalette: ColorAnalysis;
  brandPreferences: BrandPreference[];
  categoryDistribution: CategoryDistribution[];
  wardrobeStats: WardrobeStats;
  insights: StyleInsight[];
  lastAnalyzed: string;
}

export interface StyleCategoryScore {
  category: StyleCategory;
  score: number; // 0-100
  percentage: number;
  itemCount: number;
}

export interface ColorAnalysis {
  dominantColors: ColorScore[];
  colorFamilies: ColorFamily[];
  seasonalPalette: 'spring' | 'summer' | 'autumn' | 'winter';
}

export interface ColorScore {
  color: string;
  name: string;
  count: number;
  percentage: number;
}

export interface ColorFamily {
  family: 'neutrals' | 'warm' | 'cool' | 'bright' | 'dark';
  percentage: number;
  colors: string[];
}

export interface BrandPreference {
  brand: string;
  itemCount: number;
  percentage: number;
  averagePrice: number;
  categories: ItemCategory[];
}

export interface CategoryDistribution {
  category: ItemCategory;
  count: number;
  percentage: number;
  totalValue: number;
}

export interface WardrobeStats {
  totalItems: number;
  totalValue: number;
  averageItemPrice: number;
  mostWornCategory: ItemCategory;
  leastWornCategory: ItemCategory;
  wardrobeGaps: ItemCategory[];
  duplicateItems: number;
  seasonalBalance: {
    spring: number;
    summer: number;
    autumn: number;
    winter: number;
  };
}

export interface StyleInsight {
  id: string;
  type: 'strength' | 'gap' | 'suggestion' | 'trend';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  action?: string;
}

export interface StyleEvolution {
  month: string;
  styles: { [key in StyleCategory]?: number };
  itemsAdded: number;
}

class AIStyleService {
  /**
   * Analyze user's closet and generate style profile
   */
  async analyzeStyle(items: Item[]): Promise<StyleProfile> {
    const dominantStyles = this.analyzeStyleCategories(items);
    const colorPalette = this.analyzeColors(items);
    const brandPreferences = this.analyzeBrands(items);
    const categoryDistribution = this.analyzeCategoryDistribution(items);
    const wardrobeStats = this.calculateWardrobeStats(items);
    const insights = this.generateInsights(items, dominantStyles, categoryDistribution);

    return {
      userId: 'current-user',
      dominantStyles,
      colorPalette,
      brandPreferences,
      categoryDistribution,
      wardrobeStats,
      insights,
      lastAnalyzed: new Date().toISOString(),
    };
  }

  /**
   * Analyze style categories
   */
  private analyzeStyleCategories(items: Item[]): StyleCategoryScore[] {
    const styleScores = new Map<StyleCategory, number>();
    
    // Analyze each item and assign style scores
    items.forEach(item => {
      const styles = this.detectItemStyle(item);
      styles.forEach(({ style, score }) => {
        styleScores.set(style, (styleScores.get(style) || 0) + score);
      });
    });

    // Convert to array and calculate percentages
    const totalScore = Array.from(styleScores.values()).reduce((a, b) => a + b, 0);
    const results: StyleCategoryScore[] = [];

    styleScores.forEach((score, category) => {
      const itemCount = items.filter(item => 
        this.detectItemStyle(item).some(s => s.style === category)
      ).length;

      results.push({
        category,
        score: Math.round(score),
        percentage: Math.round((score / totalScore) * 100),
        itemCount,
      });
    });

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * Detect style category for an item
   */
  private detectItemStyle(item: Item): Array<{ style: StyleCategory; score: number }> {
    const styles: Array<{ style: StyleCategory; score: number }> = [];
    // Real signal: AI-generated tags/style from garment classification, plus category/brand.
    // (item.name is just a generic fallback like "Item" and carries no descriptive signal.)
    const haystack = [
      ...(item.tags || []),
      item.category,
      item.brand || '',
    ]
      .join(' ')
      .toLowerCase();

    if (haystack.match(/basic|simple|classic|minimal|neutral|solid/)) {
      styles.push({ style: 'minimalist', score: 10 });
    }

    if (haystack.match(/sneaker|hoodie|jogger|street|graphic|oversized/) || item.category === 'shoes') {
      styles.push({ style: 'streetwear', score: 8 });
    }

    if (haystack.match(/boho|flowy|maxi|embroidered|floral|paisley/)) {
      styles.push({ style: 'bohemian', score: 10 });
    }

    if (haystack.match(/vintage|retro|denim|corduroy/)) {
      styles.push({ style: 'vintage', score: 8 });
    }

    if (haystack.match(/athletic|sport|yoga|active|gym|running/)) {
      styles.push({ style: 'athleisure', score: 10 });
    }

    if (haystack.match(/suit|blazer|formal|dress shirt|tuxedo|gown/) || item.category === 'dresses') {
      styles.push({ style: 'formal', score: 8 });
    }

    // Casual as a base score whenever nothing more specific was matched strongly
    if (styles.length === 0 || Math.max(...styles.map(s => s.score)) < 10) {
      styles.push({ style: 'casual', score: 5 });
    }

    return styles;
  }

  /**
   * Analyze color palette
   */
  private analyzeColors(items: Item[]): ColorAnalysis {
    const colorCounts = new Map<string, number>();

    // Count colors
    items.forEach(item => {
      if (item.color) {
        const color = item.color.toLowerCase();
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
    });

    const totalItems = items.length;
    const dominantColors: ColorScore[] = [];

    colorCounts.forEach((count, color) => {
      dominantColors.push({
        color,
        name: this.getColorName(color),
        count,
        percentage: Math.round((count / totalItems) * 100),
      });
    });

    dominantColors.sort((a, b) => b.count - a.count);

    // Analyze color families
    const colorFamilies = this.analyzeColorFamilies(dominantColors);

    // Determine seasonal palette
    const seasonalPalette = this.determineSeasonalPalette(colorFamilies);

    return {
      dominantColors: dominantColors.slice(0, 10),
      colorFamilies,
      seasonalPalette,
    };
  }

  /**
   * Get friendly color name
   */
  private getColorName(color: string): string {
    const colorMap: { [key: string]: string } = {
      'black': 'Black',
      'white': 'White',
      'gray': 'Gray',
      'grey': 'Gray',
      'blue': 'Blue',
      'navy': 'Navy',
      'red': 'Red',
      'green': 'Green',
      'yellow': 'Yellow',
      'orange': 'Orange',
      'purple': 'Purple',
      'pink': 'Pink',
      'brown': 'Brown',
      'beige': 'Beige',
      'tan': 'Tan',
      'cream': 'Cream',
    };

    return colorMap[color] || color.charAt(0).toUpperCase() + color.slice(1);
  }

  /**
   * Analyze color families
   */
  private analyzeColorFamilies(colors: ColorScore[]): ColorFamily[] {
    const families: ColorFamily[] = [
      { family: 'neutrals', percentage: 0, colors: [] },
      { family: 'warm', percentage: 0, colors: [] },
      { family: 'cool', percentage: 0, colors: [] },
      { family: 'bright', percentage: 0, colors: [] },
      { family: 'dark', percentage: 0, colors: [] },
    ];

    const neutrals = ['black', 'white', 'gray', 'grey', 'beige', 'tan', 'cream', 'brown'];
    const warm = ['red', 'orange', 'yellow', 'pink', 'coral', 'peach'];
    const cool = ['blue', 'navy', 'green', 'teal', 'purple', 'turquoise'];
    const bright = ['red', 'yellow', 'orange', 'pink', 'lime'];
    const dark = ['black', 'navy', 'brown', 'charcoal', 'burgundy'];

    const totalPercentage = colors.reduce((sum, c) => sum + c.percentage, 0);

    colors.forEach(color => {
      const colorLower = color.color.toLowerCase();
      
      if (neutrals.some(n => colorLower.includes(n))) {
        families[0].percentage += color.percentage;
        families[0].colors.push(color.name);
      }
      if (warm.some(w => colorLower.includes(w))) {
        families[1].percentage += color.percentage;
        families[1].colors.push(color.name);
      }
      if (cool.some(c => colorLower.includes(c))) {
        families[2].percentage += color.percentage;
        families[2].colors.push(color.name);
      }
      if (bright.some(b => colorLower.includes(b))) {
        families[3].percentage += color.percentage;
        families[3].colors.push(color.name);
      }
      if (dark.some(d => colorLower.includes(d))) {
        families[4].percentage += color.percentage;
        families[4].colors.push(color.name);
      }
    });

    return families.filter(f => f.percentage > 0).sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * Determine seasonal color palette
   */
  private determineSeasonalPalette(families: ColorFamily[]): 'spring' | 'summer' | 'autumn' | 'winter' {
    const warmPercentage = families.find(f => f.family === 'warm')?.percentage || 0;
    const coolPercentage = families.find(f => f.family === 'cool')?.percentage || 0;
    const brightPercentage = families.find(f => f.family === 'bright')?.percentage || 0;
    const darkPercentage = families.find(f => f.family === 'dark')?.percentage || 0;

    if (warmPercentage > coolPercentage && brightPercentage > darkPercentage) return 'spring';
    if (coolPercentage > warmPercentage && brightPercentage < darkPercentage) return 'summer';
    if (warmPercentage > coolPercentage && darkPercentage > brightPercentage) return 'autumn';
    return 'winter';
  }

  /**
   * Analyze brand preferences
   */
  private analyzeBrands(items: Item[]): BrandPreference[] {
    const brandMap = new Map<string, { items: Item[]; totalPrice: number }>();

    items.forEach(item => {
      if (item.brand) {
        const brand = item.brand;
        const existing = brandMap.get(brand) || { items: [], totalPrice: 0 };
        existing.items.push(item);
        existing.totalPrice += item.price || 0;
        brandMap.set(brand, existing);
      }
    });

    const totalItems = items.length;
    const preferences: BrandPreference[] = [];

    brandMap.forEach((data, brand) => {
      const categories = [...new Set(data.items.map(i => i.category))];
      preferences.push({
        brand,
        itemCount: data.items.length,
        percentage: Math.round((data.items.length / totalItems) * 100),
        averagePrice: Math.round(data.totalPrice / data.items.length),
        categories,
      });
    });

    return preferences.sort((a, b) => b.itemCount - a.itemCount).slice(0, 10);
  }

  /**
   * Analyze category distribution
   */
  private analyzeCategoryDistribution(items: Item[]): CategoryDistribution[] {
    const categoryMap = new Map<ItemCategory, { count: number; value: number }>();

    items.forEach(item => {
      const existing = categoryMap.get(item.category) || { count: 0, value: 0 };
      existing.count += 1;
      existing.value += item.price || 0;
      categoryMap.set(item.category, existing);
    });

    const totalItems = items.length;
    const distribution: CategoryDistribution[] = [];

    categoryMap.forEach((data, category) => {
      distribution.push({
        category,
        count: data.count,
        percentage: Math.round((data.count / totalItems) * 100),
        totalValue: data.value,
      });
    });

    return distribution.sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate wardrobe statistics
   */
  private calculateWardrobeStats(items: Item[]): WardrobeStats {
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.price || 0), 0);
    const averageItemPrice = totalValue / totalItems;

    const categoryDist = this.analyzeCategoryDistribution(items);
    const mostWornCategory = categoryDist[0]?.category || 'tops';
    const leastWornCategory = categoryDist[categoryDist.length - 1]?.category || 'accessories';

    // Identify wardrobe gaps against the categories the app actually supports
    const allCategories: ItemCategory[] = [
      'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories',
    ];
    const existingCategories = new Set(items.map(i => i.category));
    const wardrobeGaps = allCategories.filter(c => !existingCategories.has(c));

    // Real duplicate detection: items sharing the same category + color
    const groupCounts = new Map<string, number>();
    items.forEach(item => {
      const key = `${item.category}|${(item.color || '').toLowerCase()}`;
      groupCounts.set(key, (groupCounts.get(key) || 0) + 1);
    });
    const duplicateItems = Array.from(groupCounts.values()).filter(count => count > 1).length;

    // Real seasonal balance from item.seasons (falls back evenly if no season data at all)
    const seasonTotals = { spring: 0, summer: 0, autumn: 0, winter: 0 };
    let seasonTagCount = 0;
    items.forEach(item => {
      (item.seasons || []).forEach(season => {
        const key = season === 'fall' ? 'autumn' : season;
        if (key in seasonTotals) {
          seasonTotals[key as keyof typeof seasonTotals]++;
          seasonTagCount++;
        }
      });
    });
    const seasonalBalance =
      seasonTagCount > 0
        ? {
            spring: Math.round((seasonTotals.spring / seasonTagCount) * 100),
            summer: Math.round((seasonTotals.summer / seasonTagCount) * 100),
            autumn: Math.round((seasonTotals.autumn / seasonTagCount) * 100),
            winter: Math.round((seasonTotals.winter / seasonTagCount) * 100),
          }
        : { spring: 25, summer: 25, autumn: 25, winter: 25 };

    return {
      totalItems,
      totalValue,
      averageItemPrice: Math.round(averageItemPrice) || 0,
      mostWornCategory,
      leastWornCategory,
      wardrobeGaps,
      duplicateItems,
      seasonalBalance,
    };
  }

  /**
   * Generate actionable insights
   */
  private generateInsights(
    items: Item[],
    styles: StyleCategoryScore[],
    categories: CategoryDistribution[]
  ): StyleInsight[] {
    const insights: StyleInsight[] = [];

    // Style strength insight
    if (styles.length > 0) {
      insights.push({
        id: 'style-strength',
        type: 'strength',
        title: `Your style is ${styles[0].percentage}% ${styles[0].category}`,
        description: `You have a strong ${styles[0].category} aesthetic with ${styles[0].itemCount} items in this style.`,
        priority: 'high',
        actionable: false,
      });
    }

    // Wardrobe gap insight
    const allCategories: ItemCategory[] = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes'];
    const existingCategories = new Set(items.map(i => i.category));
    const gaps = allCategories.filter(c => !existingCategories.has(c));
    
    if (gaps.length > 0) {
      insights.push({
        id: 'wardrobe-gap',
        type: 'gap',
        title: `Missing ${gaps.length} key categories`,
        description: `Consider adding ${gaps.join(', ')} to complete your wardrobe.`,
        priority: 'medium',
        actionable: true,
        action: 'Browse shopping recommendations',
      });
    }

    // Color diversity insight
    const uniqueColors = new Set(items.map(i => i.color).filter(Boolean));
    if (uniqueColors.size < 5) {
      insights.push({
        id: 'color-diversity',
        type: 'suggestion',
        title: 'Limited color palette',
        description: 'Adding more colors could increase outfit versatility.',
        priority: 'low',
        actionable: true,
        action: 'Explore color recommendations',
      });
    }

    // Category balance insight
    const topCategory = categories[0];
    if (topCategory && topCategory.percentage > 40) {
      insights.push({
        id: 'category-balance',
        type: 'suggestion',
        title: `Heavy on ${topCategory.category}`,
        description: `${topCategory.percentage}% of your wardrobe is ${topCategory.category}. Consider diversifying.`,
        priority: 'medium',
        actionable: true,
        action: 'View category recommendations',
      });
    }

    return insights;
  }

  /**
   * Get style evolution over time (mock data)
   */
  async getStyleEvolution(userId: string): Promise<StyleEvolution[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const evolution: StyleEvolution[] = months.map((month, index) => ({
      month,
      styles: {
        minimalist: 30 + index * 5,
        casual: 25 - index * 2,
        streetwear: 20 + index * 3,
        bohemian: 15,
        vintage: 10 - index,
      },
      itemsAdded: 5 + index * 2,
    }));

    return evolution;
  }
}

export const aiStyleService = new AIStyleService();

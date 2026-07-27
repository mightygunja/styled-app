/**
 * Recommendation Engine Service
 * 
 * Generates smart outfit recommendations based on weather, events,
 * style profile, and user preferences.
 */

import { Item, Look } from '../types';
import { StyleProfile } from './aiStyleService';

export type OccasionType = 
  | 'work'
  | 'casual'
  | 'formal'
  | 'date'
  | 'workout'
  | 'party'
  | 'travel'
  | 'outdoor';

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'cold' | 'hot';

export interface OutfitRecommendation {
  id: string;
  title: string;
  description: string;
  occasion: OccasionType;
  items: Item[];
  suitabilityScore: number; // 0-100
  reasoning: string[];
  weatherSuitable: boolean;
  styleMatch: number; // 0-100
  missingPieces?: string[];
  alternatives?: Item[][];
  tags: string[];
}

export interface RecommendationContext {
  occasion?: OccasionType;
  weather?: {
    condition: WeatherCondition;
    temperature: number; // Fahrenheit
  };
  event?: {
    title: string;
    date: string;
    type: string;
  };
  preferences?: {
    colors?: string[];
    styles?: string[];
    avoidCategories?: string[];
  };
}

export interface RecommendationFeedback {
  recommendationId: string;
  userId: string;
  accepted: boolean;
  modified: boolean;
  rating?: number; // 1-5
  feedback?: string;
  timestamp: string;
}

class RecommendationEngine {
  private feedbackHistory: Map<string, RecommendationFeedback[]> = new Map();
  private lastGeneratedOccasion: Map<string, OccasionType> = new Map();

  /**
   * Generate outfit recommendations
   */
  async generateRecommendations(
    items: Item[],
    styleProfile: StyleProfile,
    context: RecommendationContext
  ): Promise<OutfitRecommendation[]> {
    const recommendations: OutfitRecommendation[] = [];

    // Generate multiple recommendations
    const occasion = context.occasion || 'casual';
    const weather = context.weather;

    // Recommendation 1: Style-matched outfit
    const styleMatched = this.generateStyleMatchedOutfit(items, styleProfile, occasion, weather);
    if (styleMatched) recommendations.push(styleMatched);

    // Recommendation 2: Weather-optimized outfit
    if (weather) {
      const weatherOptimized = this.generateWeatherOptimizedOutfit(items, weather, occasion);
      if (weatherOptimized) recommendations.push(weatherOptimized);
    }

    // Recommendation 3: Trending outfit
    const trending = this.generateTrendingOutfit(items, occasion);
    if (trending) recommendations.push(trending);

    // Recommendation 4: Color-coordinated outfit
    const colorCoordinated = this.generateColorCoordinatedOutfit(items, styleProfile, occasion);
    if (colorCoordinated) recommendations.push(colorCoordinated);

    recommendations.forEach(rec => this.lastGeneratedOccasion.set(rec.id, rec.occasion));

    return recommendations;
  }

  /**
   * Generate style-matched outfit
   */
  private generateStyleMatchedOutfit(
    items: Item[],
    styleProfile: StyleProfile,
    occasion: OccasionType,
    weather?: { condition: WeatherCondition; temperature: number }
  ): OutfitRecommendation | null {
    const dominantStyle = styleProfile.dominantStyles[0]?.category || 'casual';
    
    // Select items that match the dominant style
    const top = this.selectItem(items, 'tops', { occasion, weather });
    const bottom = this.selectItem(items, 'bottoms', { occasion, weather });
    const shoes = this.selectItem(items, 'shoes', { occasion, weather });
    const outerwear = weather && weather.temperature < 60 
      ? this.selectItem(items, 'outerwear', { occasion, weather })
      : undefined;

    const outfitItems = [top, bottom, shoes, outerwear].filter(Boolean) as Item[];

    if (outfitItems.length < 3) return null;

    const reasoning = [
      `Matches your ${dominantStyle} style (${styleProfile.dominantStyles[0]?.percentage}% of wardrobe)`,
      `Perfect for ${occasion} occasions`,
    ];

    if (weather) {
      reasoning.push(`Suitable for ${weather.condition} weather at ${weather.temperature}°F`);
    }

    const weatherSuitable = weather ? this.checkWeatherSuitability(outfitItems, weather) : true;
    const styleMatch = this.calculateStyleMatch(outfitItems, dominantStyle);

    return {
      id: `rec-style-${Date.now()}`,
      title: `Your ${dominantStyle.charAt(0).toUpperCase() + dominantStyle.slice(1)} Look`,
      description: `A classic ${dominantStyle} outfit that matches your personal style`,
      occasion,
      items: outfitItems,
      suitabilityScore: this.calculateSuitabilityScore(outfitItems, weatherSuitable, styleMatch),
      reasoning,
      weatherSuitable,
      styleMatch,
      tags: [dominantStyle, occasion, 'recommended'],
    };
  }

  /**
   * Generate weather-optimized outfit
   */
  private generateWeatherOptimizedOutfit(
    items: Item[],
    weather: { condition: WeatherCondition; temperature: number },
    occasion: OccasionType
  ): OutfitRecommendation | null {
    const top = this.selectItem(items, 'tops', { occasion, weather });
    const bottom = this.selectItem(items, 'bottoms', { occasion, weather });
    const shoes = this.selectItem(items, 'shoes', { occasion, weather });
    
    let outerwear: Item | undefined;
    if (weather.temperature < 60 || weather.condition === 'rainy') {
      outerwear = this.selectItem(items, 'outerwear', { occasion, weather });
    }

    const outfitItems = [top, bottom, shoes, outerwear].filter(Boolean) as Item[];

    if (outfitItems.length < 3) return null;

    const reasoning = [
      `Optimized for ${weather.condition} weather`,
      `Temperature: ${weather.temperature}°F`,
      `Comfortable and practical for ${occasion}`,
    ];

    if (weather.temperature < 50) {
      reasoning.push('Includes warm layers');
    } else if (weather.temperature > 80) {
      reasoning.push('Lightweight and breathable');
    }

    const styleMatch = this.calculateStyleMatch(outfitItems, 'casual');

    return {
      id: `rec-weather-${Date.now()}`,
      title: `Weather-Ready ${occasion.charAt(0).toUpperCase() + occasion.slice(1)} Outfit`,
      description: `Perfect for today's ${weather.condition} conditions`,
      occasion,
      items: outfitItems,
      suitabilityScore: this.calculateSuitabilityScore(outfitItems, true, styleMatch),
      reasoning,
      weatherSuitable: true,
      styleMatch,
      tags: ['weather-optimized', occasion, weather.condition],
    };
  }

  /**
   * Generate trending outfit
   */
  private generateTrendingOutfit(
    items: Item[],
    occasion: OccasionType
  ): OutfitRecommendation | null {
    // "Trending" proxy: the most recently added items in each category (real signal
    // available on ClosetItem - there's no external trend feed to draw on)
    const top = this.selectItem(items, 'tops', { occasion, trending: true });
    const bottom = this.selectItem(items, 'bottoms', { occasion, trending: true });
    const shoes = this.selectItem(items, 'shoes', { occasion, trending: true });

    const outfitItems = [top, bottom, shoes].filter(Boolean) as Item[];

    if (outfitItems.length < 3) return null;

    const styleMatch = this.calculateStyleMatch(outfitItems, 'streetwear');

    return {
      id: `rec-trend-${Date.now()}`,
      title: 'Fresh From Your Closet',
      description: 'Your most recently added pieces, styled together',
      occasion,
      items: outfitItems,
      suitabilityScore: this.calculateSuitabilityScore(outfitItems, true, styleMatch),
      reasoning: [
        'Built from the newest additions to your closet',
        `Great for ${occasion} settings`,
      ],
      weatherSuitable: true,
      styleMatch,
      tags: ['recent', occasion],
    };
  }

  /**
   * Generate color-coordinated outfit
   */
  private generateColorCoordinatedOutfit(
    items: Item[],
    styleProfile: StyleProfile,
    occasion: OccasionType
  ): OutfitRecommendation | null {
    const dominantColor = styleProfile.colorPalette.dominantColors[0]?.color || 'black';
    
    // Select items in coordinating colors
    const top = this.selectItem(items, 'tops', { occasion, preferredColor: dominantColor });
    const bottom = this.selectItem(items, 'bottoms', { occasion });
    const shoes = this.selectItem(items, 'shoes', { occasion });

    const outfitItems = [top, bottom, shoes].filter(Boolean) as Item[];

    if (outfitItems.length < 3) return null;

    const styleMatch = this.calculateStyleMatch(outfitItems, 'minimalist');

    return {
      id: `rec-color-${Date.now()}`,
      title: 'Color-Coordinated Ensemble',
      description: 'A harmonious outfit with perfectly matched colors',
      occasion,
      items: outfitItems,
      suitabilityScore: this.calculateSuitabilityScore(outfitItems, true, styleMatch),
      reasoning: [
        `Features your favorite color: ${dominantColor}`,
        'Complementary color palette',
        'Visually balanced and cohesive',
      ],
      weatherSuitable: true,
      styleMatch,
      tags: ['color-coordinated', occasion, dominantColor],
    };
  }

  /**
   * Real style-match score: fraction of the outfit's items whose category/tags/brand
   * actually relate to the given style keyword (0-100)
   */
  private calculateStyleMatch(outfitItems: Item[], style: string): number {
    if (outfitItems.length === 0) return 0;
    const keywordsByStyle: Record<string, RegExp> = {
      minimalist: /basic|simple|classic|minimal|neutral|solid/,
      streetwear: /sneaker|hoodie|jogger|street|graphic|oversized/,
      bohemian: /boho|flowy|maxi|embroidered|floral|paisley/,
      vintage: /vintage|retro|denim|corduroy/,
      athleisure: /athletic|sport|yoga|active|gym|running/,
      formal: /suit|blazer|formal|dress shirt|tuxedo|gown/,
      casual: /.*/, // casual has no strong negative signal, treat as a loose match
    };
    const pattern = keywordsByStyle[style] || keywordsByStyle.casual;
    const matches = outfitItems.filter(item => {
      const haystack = [...(item.tags || []), item.category, item.brand || ''].join(' ').toLowerCase();
      return pattern.test(haystack);
    }).length;
    return Math.round((matches / outfitItems.length) * 100);
  }

  /**
   * Real suitability score: combines outfit completeness, weather fit, and color harmony
   */
  private calculateSuitabilityScore(
    outfitItems: Item[],
    weatherSuitable: boolean,
    styleMatch: number
  ): number {
    let score = 50;
    score += Math.min(outfitItems.length, 4) * 7; // completeness, up to +28
    score += weatherSuitable ? 12 : 0;
    score += Math.round(styleMatch * 0.1); // up to +10
    return Math.min(99, score);
  }

  /**
   * Select an item from closet based on criteria
   */
  private selectItem(
    items: Item[],
    category: string,
    criteria: {
      occasion?: OccasionType;
      weather?: { condition: WeatherCondition; temperature: number };
      trending?: boolean;
      preferredColor?: string;
    }
  ): Item | undefined {
    let filtered = items.filter(item => item.category === category);
    if (filtered.length === 0) return undefined;

    // Soft-prefer items whose real `seasons` tag matches the weather, when that data exists
    if (criteria.weather) {
      const wantsWarm = criteria.weather.temperature < 50;
      const wantsLight = criteria.weather.temperature > 80;
      const seasonFiltered = filtered.filter(item => {
        if (!item.seasons || item.seasons.length === 0) return false;
        if (wantsWarm) return item.seasons.includes('winter') || item.seasons.includes('fall');
        if (wantsLight) return item.seasons.includes('summer');
        return true;
      });
      if (seasonFiltered.length > 0) filtered = seasonFiltered;
    }

    // Deterministic scoring instead of random pick
    const scored = filtered.map(item => {
      let score = 0;

      if (criteria.preferredColor && item.color?.toLowerCase() === criteria.preferredColor.toLowerCase()) {
        score += 20;
      }

      if (criteria.trending) {
        // Recency is the only real trend signal we have: newer items score higher
        const ageMs = item.createdAt ? Date.now() - new Date(item.createdAt).getTime() : Infinity;
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        score += Math.max(0, 30 - ageDays / 3);
      }

      // Slightly favor underused items so recommendations rotate through the closet
      score += Math.max(0, 10 - (item.wornCount || 0));

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
    return scored[0].item;
  }

  /**
   * Check if outfit is suitable for weather
   */
  private checkWeatherSuitability(
    items: Item[],
    weather: { condition: WeatherCondition; temperature: number }
  ): boolean {
    const hasOuterwear = items.some(item => item.category === 'outerwear');
    
    if (weather.temperature < 50 && !hasOuterwear) {
      return false;
    }

    if (weather.condition === 'rainy' && !hasOuterwear) {
      return false;
    }

    return true;
  }

  /**
   * Get recommendations for specific event
   */
  async getEventRecommendations(
    items: Item[],
    styleProfile: StyleProfile,
    eventType: string
  ): Promise<OutfitRecommendation[]> {
    const occasionMap: { [key: string]: OccasionType } = {
      'meeting': 'work',
      'interview': 'formal',
      'dinner': 'date',
      'gym': 'workout',
      'wedding': 'formal',
      'party': 'party',
    };

    const occasion = occasionMap[eventType.toLowerCase()] || 'casual';

    return this.generateRecommendations(items, styleProfile, { occasion });
  }

  /**
   * Save user feedback on recommendation
   */
  async saveFeedback(feedback: RecommendationFeedback): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const userFeedback = this.feedbackHistory.get(feedback.userId) || [];
    userFeedback.push(feedback);
    this.feedbackHistory.set(feedback.userId, userFeedback);
  }

  /**
   * Get personalized recommendations based on feedback history
   */
  async getPersonalizedRecommendations(
    items: Item[],
    styleProfile: StyleProfile,
    userId: string
  ): Promise<OutfitRecommendation[]> {
    const feedback = this.feedbackHistory.get(userId) || [];

    // Learn a preferred occasion from what the user has actually accepted/rated well
    const acceptedRecs = feedback.filter(f => f.accepted);
    const highRatedRecs = feedback.filter(f => f.rating && f.rating >= 4);
    const positiveFeedback = [...acceptedRecs, ...highRatedRecs];

    let preferredOccasion: OccasionType = 'casual';
    if (positiveFeedback.length > 0) {
      // recommendationId is prefixed like `rec-style-...`; we don't retain occasion on the
      // feedback record itself, so fall back to the most recent context we generated for.
      const recent = positiveFeedback[positiveFeedback.length - 1];
      preferredOccasion = (this.lastGeneratedOccasion.get(recent.recommendationId) as OccasionType) || 'casual';
    }

    return this.generateRecommendations(items, styleProfile, {
      occasion: preferredOccasion,
    });
  }

  /**
   * Get daily outfit suggestion
   */
  async getDailyOutfit(
    items: Item[],
    styleProfile: StyleProfile,
    weather: { condition: WeatherCondition; temperature: number }
  ): Promise<OutfitRecommendation | null> {
    const recommendations = await this.generateRecommendations(items, styleProfile, {
      occasion: 'casual',
      weather,
    });

    return recommendations.length > 0 ? recommendations[0] : null;
  }
}

export const recommendationEngine = new RecommendationEngine();

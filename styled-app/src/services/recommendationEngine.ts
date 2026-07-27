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

  /**
   * Generate outfit recommendations
   */
  async generateRecommendations(
    items: Item[],
    styleProfile: StyleProfile,
    context: RecommendationContext
  ): Promise<OutfitRecommendation[]> {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate AI processing

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

    return {
      id: `rec-style-${Date.now()}`,
      title: `Your ${dominantStyle.charAt(0).toUpperCase() + dominantStyle.slice(1)} Look`,
      description: `A classic ${dominantStyle} outfit that matches your personal style`,
      occasion,
      items: outfitItems,
      suitabilityScore: 95,
      reasoning,
      weatherSuitable: weather ? this.checkWeatherSuitability(outfitItems, weather) : true,
      styleMatch: 95,
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

    return {
      id: `rec-weather-${Date.now()}`,
      title: `Weather-Ready ${occasion.charAt(0).toUpperCase() + occasion.slice(1)} Outfit`,
      description: `Perfect for today's ${weather.condition} conditions`,
      occasion,
      items: outfitItems,
      suitabilityScore: 92,
      reasoning,
      weatherSuitable: true,
      styleMatch: 85,
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
    // Select trendy items (mock logic - would use real trend data)
    const top = this.selectItem(items, 'tops', { occasion, trending: true });
    const bottom = this.selectItem(items, 'bottoms', { occasion, trending: true });
    const shoes = this.selectItem(items, 'shoes', { occasion, trending: true });

    const outfitItems = [top, bottom, shoes].filter(Boolean) as Item[];

    if (outfitItems.length < 3) return null;

    return {
      id: `rec-trend-${Date.now()}`,
      title: 'On-Trend Look',
      description: 'A fashionable outfit featuring current trends',
      occasion,
      items: outfitItems,
      suitabilityScore: 88,
      reasoning: [
        'Incorporates current fashion trends',
        'Popular color combinations',
        `Great for ${occasion} settings`,
      ],
      weatherSuitable: true,
      styleMatch: 80,
      tags: ['trending', 'fashionable', occasion],
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

    return {
      id: `rec-color-${Date.now()}`,
      title: 'Color-Coordinated Ensemble',
      description: 'A harmonious outfit with perfectly matched colors',
      occasion,
      items: outfitItems,
      suitabilityScore: 90,
      reasoning: [
        `Features your favorite color: ${dominantColor}`,
        'Complementary color palette',
        'Visually balanced and cohesive',
      ],
      weatherSuitable: true,
      styleMatch: 87,
      tags: ['color-coordinated', occasion, dominantColor],
    };
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

    // Filter by weather
    if (criteria.weather) {
      if (criteria.weather.temperature < 50) {
        // Prefer warm items
        filtered = filtered.filter(item => 
          !item.name.toLowerCase().includes('short') &&
          !item.name.toLowerCase().includes('tank')
        );
      } else if (criteria.weather.temperature > 80) {
        // Prefer light items
        filtered = filtered.filter(item => 
          !item.name.toLowerCase().includes('sweater') &&
          !item.name.toLowerCase().includes('coat')
        );
      }
    }

    // Filter by color preference
    if (criteria.preferredColor && filtered.length > 1) {
      const colorMatches = filtered.filter(item => 
        item.color?.toLowerCase() === criteria.preferredColor?.toLowerCase()
      );
      if (colorMatches.length > 0) {
        filtered = colorMatches;
      }
    }

    // Return random item from filtered list
    return filtered.length > 0 
      ? filtered[Math.floor(Math.random() * filtered.length)]
      : undefined;
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
    
    // Analyze feedback to improve recommendations
    const acceptedRecs = feedback.filter(f => f.accepted);
    const highRatedRecs = feedback.filter(f => f.rating && f.rating >= 4);

    // Generate recommendations with learned preferences
    return this.generateRecommendations(items, styleProfile, {
      occasion: 'casual',
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

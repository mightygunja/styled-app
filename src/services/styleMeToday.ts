/**
 * Style Me Today Service
 * 
 * Goal: Reduce daily friction with 1-tap outfit generation.
 * 
 * Features:
 * - Instant outfit for today
 * - Weather-aware (light logic, not complex)
 * - Context-aware (work day vs weekend)
 * - No decisions required
 */

import { ClosetItem, getCurrentSeason } from '../models/closetItem';
import { PersonalStyleProfile } from '../models/personalStyleProfile';
import { generateOutfits, Outfit } from './generateOutfits';

export interface TodayContext {
  isWeekday: boolean;
  temperature?: number; // Fahrenheit
  weather?: 'sunny' | 'rainy' | 'cold' | 'hot';
  hasEvent?: boolean;
}

/**
 * Get today's context for outfit generation
 * Light logic - just the basics
 */
export function getTodayContext(): TodayContext {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  return {
    isWeekday,
    // Weather data would come from API in production
    // For now, return basic context
  };
}

/**
 * Generate outfit for today with 1 tap
 * 
 * No decisions, no friction - just what to wear right now.
 */
export function styleMeToday(
  closet: ClosetItem[],
  styleProfile: PersonalStyleProfile,
  context?: TodayContext
): Outfit | null {
  const todayContext = context || getTodayContext();
  
  // Determine occasion based on context
  const occasion = todayContext.isWeekday ? 'work' : 'casual';
  
  // Generate outfits for today
  const outfits = generateOutfits(closet, styleProfile, {
    occasion,
    season: getCurrentSeason(),
    maxOutfits: 1, // Only need one
  });

  // Return the best outfit for today
  return outfits.length > 0 ? outfits[0] : null;
}

/**
 * Get weather-appropriate outfit
 * Light logic - basic temperature ranges
 */
export function getWeatherAwareOutfit(
  closet: ClosetItem[],
  styleProfile: PersonalStyleProfile,
  temperature: number
): Outfit | null {
  const context = getTodayContext();
  
  // Simple weather logic
  let weather: TodayContext['weather'];
  if (temperature < 50) {
    weather = 'cold';
  } else if (temperature > 80) {
    weather = 'hot';
  } else {
    weather = 'sunny';
  }

  // Filter closet by weather appropriateness
  const weatherAppropriate = closet.filter(item => {
    if (weather === 'cold') {
      // Need layers and outerwear
      return item.category === 'outerwear' || 
             item.silhouettes.includes('layered') ||
             item.category === 'top' ||
             item.category === 'bottom';
    } else if (weather === 'hot') {
      // Light, breathable items
      return item.category !== 'outerwear' &&
             !item.silhouettes.includes('layered');
    }
    // Normal weather - all items fine
    return true;
  });

  // Generate outfit from weather-appropriate items
  const outfits = generateOutfits(weatherAppropriate, styleProfile, {
    occasion: context.isWeekday ? 'work' : 'casual',
    season: getCurrentSeason(),
    maxOutfits: 1,
  });

  return outfits.length > 0 ? outfits[0] : null;
}

/**
 * Check if user should get "Style Me Today" notification
 * 
 * Rules:
 * - Only 1 notification per day max
 * - Only on weekday mornings (7-9am)
 * - Only if user has used app 3+ times
 * - Never on weekends (let them sleep)
 */
export function shouldShowStyleMeTodayNotification(
  lastNotificationDate: Date | null,
  userEngagementCount: number
): boolean {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  
  // Only weekdays
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Only morning (7-9am)
  if (hour < 7 || hour >= 9) {
    return false;
  }

  // Only if engaged (3+ uses)
  if (userEngagementCount < 3) {
    return false;
  }

  // Only if not already sent today
  if (lastNotificationDate) {
    const lastDate = new Date(lastNotificationDate);
    const isToday = lastDate.toDateString() === now.toDateString();
    if (isToday) {
      return false;
    }
  }

  return true;
}

/**
 * Get notification message
 * Exact copy: "Want an outfit that already works for today?"
 */
export function getStyleMeTodayNotificationMessage(): {
  title: string;
  body: string;
} {
  return {
    title: "Good morning!",
    body: "Want an outfit that already works for today?",
  };
}

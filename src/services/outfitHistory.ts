/**
 * Outfit History Service
 * 
 * Goal: Emotional reinforcement through usage tracking.
 * 
 * Shows users their outfits are working in real life.
 * "You wore this twice" - validation that their choices work.
 */

import { Outfit } from './generateOutfits';

export interface OutfitHistoryEntry {
  outfitId: string;
  outfit: Outfit;
  wornDate: Date;
  feedback?: 'loved' | 'liked' | 'okay';
  notes?: string;
}

export interface OutfitUsageStats {
  totalOutfitsGenerated: number;
  totalOutfitsWorn: number;
  favoriteItems: string[]; // Item IDs worn most often
  wearRate: number; // Percentage of generated outfits actually worn
  streakDays: number; // Consecutive days using 33 Trends
}

/**
 * Track when outfit is worn
 */
export function recordOutfitWorn(
  outfitId: string,
  outfit: Outfit,
  feedback?: 'loved' | 'liked' | 'okay'
): OutfitHistoryEntry {
  return {
    outfitId,
    outfit,
    wornDate: new Date(),
    feedback,
  };
}

/**
 * Get usage statistics for emotional reinforcement
 */
export function getOutfitUsageStats(
  history: OutfitHistoryEntry[]
): OutfitUsageStats {
  const totalOutfitsWorn = history.length;
  
  // Count favorite items (worn 2+ times)
  const itemWearCount = new Map<string, number>();
  history.forEach(entry => {
    entry.outfit.items.forEach(item => {
      const count = itemWearCount.get(item.id) || 0;
      itemWearCount.set(item.id, count + 1);
    });
  });

  const favoriteItems = Array.from(itemWearCount.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([itemId]) => itemId);

  // Calculate wear rate (mock - would need total generated count)
  const wearRate = 75; // Placeholder

  // Calculate streak (mock - would need daily tracking)
  const streakDays = 7; // Placeholder

  return {
    totalOutfitsGenerated: totalOutfitsWorn + 5, // Mock
    totalOutfitsWorn,
    favoriteItems,
    wearRate,
    streakDays,
  };
}

/**
 * Get encouraging message about outfit usage
 * "You wore this twice" - validation
 */
export function getOutfitUsageMessage(
  wearCount: number,
  itemName?: string
): string {
  if (wearCount === 0) {
    return "Try this outfit and see how it feels";
  } else if (wearCount === 1) {
    return "You wore this once";
  } else if (wearCount === 2) {
    return "You wore this twice - it's working!";
  } else {
    return `You've worn this ${wearCount} times - a favorite!`;
  }
}

/**
 * Get confidence-building insights from history
 */
export function getConfidenceInsights(
  stats: OutfitUsageStats
): string[] {
  const insights: string[] = [];

  // Total outfits worn
  if (stats.totalOutfitsWorn > 0) {
    insights.push(
      `You've worn ${stats.totalOutfitsWorn} 33 Trends ${stats.totalOutfitsWorn === 1 ? 'outfit' : 'outfits'}`
    );
  }

  // Wear rate
  if (stats.wearRate > 60) {
    insights.push(
      "You're actually wearing what we suggest - that's validation!"
    );
  }

  // Streak
  if (stats.streakDays > 3) {
    insights.push(
      `${stats.streakDays} days of confident style`
    );
  }

  // Favorite items
  if (stats.favoriteItems.length > 0) {
    insights.push(
      "You've found pieces that work for you"
    );
  }

  return insights;
}

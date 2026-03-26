/**
 * Monthly Insights Service
 * 
 * Goal: Long-term retention through personalized style insights.
 * 
 * Plus tier feature: Monthly mini-insights based on actual usage.
 * Shows users we're learning their style over time.
 */

import { ClosetItem } from '../models/closetItem';
import { StyleDNA } from '../models/styleDNA';
import { OutfitHistoryEntry } from './outfitHistory';

export interface MonthlyInsight {
  insight: string;
  category: 'color' | 'silhouette' | 'pattern' | 'styling';
  confidence: number; // 0-100, how confident we are in this insight
}

/**
 * Generate monthly mini-insight based on user's actual behavior
 * 
 * Examples:
 * - "You wear neutrals best when paired with structure."
 * - "Your most-worn pieces have clean lines."
 * - "You reach for layers on busy days."
 */
export function generateMonthlyInsight(
  closet: ClosetItem[],
  styleDNA: StyleDNA,
  history: OutfitHistoryEntry[]
): MonthlyInsight | null {
  if (history.length < 5) {
    // Need at least 5 worn outfits to generate insights
    return null;
  }

  // Analyze what they actually wear
  const wornItems = history.flatMap(entry => entry.outfit.items);
  
  // Color insights
  const colorInsight = analyzeColorPatterns(wornItems, styleDNA);
  if (colorInsight) return colorInsight;

  // Silhouette insights
  const silhouetteInsight = analyzeSilhouettePatterns(wornItems);
  if (silhouetteInsight) return silhouetteInsight;

  // Styling insights
  const stylingInsight = analyzeStylingPatterns(history);
  if (stylingInsight) return stylingInsight;

  return null;
}

/**
 * Analyze color patterns in worn outfits
 */
function analyzeColorPatterns(
  wornItems: ClosetItem[],
  styleDNA: StyleDNA
): MonthlyInsight | null {
  // Count neutral vs. color usage
  const neutrals = ['black', 'white', 'gray', 'beige', 'navy', 'brown'];
  const neutralItems = wornItems.filter(item =>
    item.colors.some(color => 
      neutrals.some(neutral => color.toLowerCase().includes(neutral))
    )
  );

  const neutralRate = neutralItems.length / wornItems.length;

  // Check if neutrals are paired with structured items
  if (neutralRate > 0.6) {
    const structuredItems = wornItems.filter(item =>
      item.silhouettes.includes('tailored') || 
      item.silhouettes.includes('structured')
    );

    if (structuredItems.length > wornItems.length * 0.4) {
      return {
        insight: "You wear neutrals best when paired with structure.",
        category: 'color',
        confidence: 85,
      };
    }

    return {
      insight: "Your go-to palette is neutral and versatile.",
      category: 'color',
      confidence: 80,
    };
  }

  return null;
}

/**
 * Analyze silhouette patterns in worn outfits
 */
function analyzeSilhouettePatterns(
  wornItems: ClosetItem[]
): MonthlyInsight | null {
  // Count silhouette types
  const silhouetteCounts = new Map<string, number>();
  wornItems.forEach(item => {
    item.silhouettes.forEach(sil => {
      silhouetteCounts.set(sil, (silhouetteCounts.get(sil) || 0) + 1);
    });
  });

  // Find dominant silhouette
  const sortedSilhouettes = Array.from(silhouetteCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  if (sortedSilhouettes.length > 0) {
    const [topSilhouette, count] = sortedSilhouettes[0];
    const rate = count / wornItems.length;

    if (rate > 0.5) {
      const insights: Record<string, string> = {
        'tailored': "Your most-worn pieces have clean lines.",
        'relaxed': "You gravitate toward comfortable, easy silhouettes.",
        'fitted': "You prefer pieces that define your shape.",
        'oversized': "You reach for relaxed, oversized fits most often.",
      };

      return {
        insight: insights[topSilhouette] || `You favor ${topSilhouette} silhouettes.`,
        category: 'silhouette',
        confidence: 80,
      };
    }
  }

  return null;
}

/**
 * Analyze styling patterns across outfits
 */
function analyzeStylingPatterns(
  history: OutfitHistoryEntry[]
): MonthlyInsight | null {
  // Analyze by day of week
  const weekdayOutfits = history.filter(entry => {
    const day = entry.wornDate.getDay();
    return day >= 1 && day <= 5;
  });

  const weekendOutfits = history.filter(entry => {
    const day = entry.wornDate.getDay();
    return day === 0 || day === 6;
  });

  // Check for layering patterns
  const layeredOutfits = history.filter(entry =>
    entry.outfit.items.some(item => item.category === 'outerwear')
  );

  if (layeredOutfits.length > history.length * 0.6) {
    return {
      insight: "You reach for layers on busy days.",
      category: 'styling',
      confidence: 75,
    };
  }

  // Check for consistency
  if (weekdayOutfits.length > 0 && weekendOutfits.length > 0) {
    return {
      insight: "Your weekday and weekend styles are distinct but cohesive.",
      category: 'styling',
      confidence: 70,
    };
  }

  return null;
}

/**
 * Get all possible insights for a user
 * Used to show variety over time
 */
export function getAllPossibleInsights(
  closet: ClosetItem[],
  styleDNA: StyleDNA,
  history: OutfitHistoryEntry[]
): MonthlyInsight[] {
  const insights: MonthlyInsight[] = [];

  const colorInsight = analyzeColorPatterns(
    history.flatMap(e => e.outfit.items),
    styleDNA
  );
  if (colorInsight) insights.push(colorInsight);

  const silhouetteInsight = analyzeSilhouettePatterns(
    history.flatMap(e => e.outfit.items)
  );
  if (silhouetteInsight) insights.push(silhouetteInsight);

  const stylingInsight = analyzeStylingPatterns(history);
  if (stylingInsight) insights.push(stylingInsight);

  return insights;
}

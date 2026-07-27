/**
 * AI Outfit Pairing Service
 * 
 * This service provides intelligent outfit suggestions by analyzing:
 * - Color compatibility
 * - Category combinations
 * - Season appropriateness
 * - Style coherence
 * - Occasion suitability
 */

import { ClosetItem } from '../types';

export interface OutfitSuggestion {
  id: string;
  items: ClosetItem[];
  score: number;
  reason: string;
  occasion: 'casual' | 'work' | 'formal' | 'athletic';
  season: string[];
}

// Color compatibility matrix (simplified)
const COLOR_COMPATIBILITY: { [key: string]: string[] } = {
  black: ['white', 'gray', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'brown', 'beige'],
  white: ['black', 'gray', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'brown', 'beige'],
  gray: ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'navy'],
  navy: ['white', 'gray', 'beige', 'brown', 'red', 'pink'],
  blue: ['white', 'gray', 'beige', 'brown', 'black'],
  red: ['black', 'white', 'gray', 'navy', 'beige'],
  green: ['black', 'white', 'gray', 'beige', 'brown'],
  yellow: ['black', 'white', 'gray', 'navy', 'blue'],
  pink: ['black', 'white', 'gray', 'navy', 'beige'],
  purple: ['black', 'white', 'gray', 'beige'],
  brown: ['white', 'beige', 'green', 'blue', 'gray'],
  beige: ['black', 'white', 'navy', 'brown', 'green', 'blue', 'red', 'pink'],
};

// Outfit templates by occasion
const OUTFIT_TEMPLATES = {
  casual: [
    { top: ['t-shirt', 'sweater', 'hoodie'], bottom: ['jeans', 'shorts', 'joggers'], shoes: ['sneakers', 'boots'] },
    { dress: ['dress'], shoes: ['sneakers', 'sandals', 'boots'] },
    { top: ['blouse', 'tank'], bottom: ['skirt', 'shorts'], shoes: ['sandals', 'sneakers'] },
  ],
  work: [
    { top: ['blouse', 'button-down', 'sweater'], bottom: ['trousers', 'skirt', 'dress-pants'], shoes: ['heels', 'loafers', 'flats'] },
    { dress: ['dress'], shoes: ['heels', 'flats'], outerwear: ['blazer'] },
    { top: ['blazer'], bottom: ['trousers', 'skirt'], shoes: ['heels', 'loafers'] },
  ],
  formal: [
    { dress: ['dress', 'gown'], shoes: ['heels'], accessories: ['clutch', 'jewelry'] },
    { top: ['blouse', 'blazer'], bottom: ['dress-pants', 'skirt'], shoes: ['heels'] },
  ],
  athletic: [
    { top: ['tank', 'sports-bra', 't-shirt'], bottom: ['leggings', 'shorts', 'joggers'], shoes: ['sneakers'] },
  ],
};

/**
 * Calculate color compatibility score
 */
function getColorScore(items: ClosetItem[]): number {
  if (items.length < 2) return 1;
  
  let compatiblePairs = 0;
  let totalPairs = 0;
  
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const color1 = items[i].color?.toLowerCase() || '';
      const color2 = items[j].color?.toLowerCase() || '';
      
      if (COLOR_COMPATIBILITY[color1]?.includes(color2)) {
        compatiblePairs++;
      }
      totalPairs++;
    }
  }
  
  return totalPairs > 0 ? compatiblePairs / totalPairs : 0.5;
}

/**
 * Calculate season compatibility score
 */
function getSeasonScore(items: ClosetItem[]): number {
  const seasons = items.map(item => item.season).filter(Boolean) as string[];
  if (seasons.length === 0) return 0.5;
  
  // Check if all items share the same season
  const uniqueSeasons = new Set(seasons);
  if (uniqueSeasons.size === 1) return 1; // Perfect match
  if (uniqueSeasons.size === 2) return 0.7; // Good match
  return 0.4; // Mixed seasons
}

/**
 * Check if outfit matches a template
 */
function matchesTemplate(items: ClosetItem[], template: any): boolean {
  const categories = items.map(item => item.category?.toLowerCase() || '');
  
  for (const [key, values] of Object.entries(template)) {
    const requiredCategories = values as string[];
    const hasMatch = requiredCategories.some(cat => categories.includes(cat));
    if (!hasMatch) return false;
  }
  
  return true;
}

/**
 * Generate outfit combinations
 */
function generateCombinations(items: ClosetItem[], size: number): ClosetItem[][] {
  const combinations: ClosetItem[][] = [];
  
  function combine(start: number, current: ClosetItem[]) {
    if (current.length === size) {
      combinations.push([...current]);
      return;
    }
    
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      combine(i + 1, current);
      current.pop();
    }
  }
  
  combine(0, []);
  return combinations;
}

/**
 * Main AI pairing function
 */
export function generateOutfitSuggestions(
  closetItems: ClosetItem[],
  occasion?: 'casual' | 'work' | 'formal' | 'athletic',
  maxSuggestions: number = 10
): OutfitSuggestion[] {
  const suggestions: OutfitSuggestion[] = [];
  
  // Filter items by occasion if specified
  let filteredItems = closetItems;
  if (occasion) {
    // In a real implementation, items would have occasion tags
    filteredItems = closetItems;
  }
  
  // Generate 2-4 item combinations
  for (let size = 2; size <= Math.min(4, filteredItems.length); size++) {
    const combinations = generateCombinations(filteredItems, size);
    
    for (const combo of combinations) {
      // Skip if items are from incompatible categories
      const categories = combo.map(item => item.category?.toLowerCase() || '');
      const hasDuplicateCategory = categories.length !== new Set(categories).size;
      if (hasDuplicateCategory && !categories.includes('accessories')) continue;
      
      // Calculate scores
      const colorScore = getColorScore(combo);
      const seasonScore = getSeasonScore(combo);
      
      // Determine occasion
      const detectedOccasion = occasion || 'casual';
      
      // Check template match
      const templates = OUTFIT_TEMPLATES[detectedOccasion] || OUTFIT_TEMPLATES.casual;
      const templateMatch = templates.some(template => matchesTemplate(combo, template));
      const templateScore = templateMatch ? 1 : 0.3;
      
      // Calculate overall score
      const score = (colorScore * 0.4 + seasonScore * 0.3 + templateScore * 0.3);
      
      // Only include outfits with decent scores
      if (score > 0.4) {
        suggestions.push({
          id: `outfit-${combo.map(i => i.id).join('-')}`,
          items: combo,
          score,
          reason: generateReason(combo, colorScore, seasonScore, templateMatch),
          occasion: detectedOccasion,
          season: combo.map(i => i.season).filter(Boolean) as string[],
        });
      }
    }
  }
  
  // Sort by score and return top suggestions
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);
}

/**
 * Generate human-readable reason for pairing
 */
function generateReason(items: ClosetItem[], colorScore: number, seasonScore: number, templateMatch: boolean): string {
  const reasons: string[] = [];
  
  if (colorScore > 0.7) {
    reasons.push('Great color combination');
  } else if (colorScore > 0.5) {
    reasons.push('Colors work well together');
  }
  
  if (seasonScore > 0.8) {
    reasons.push('Perfect for the season');
  }
  
  if (templateMatch) {
    reasons.push('Classic outfit structure');
  }
  
  if (reasons.length === 0) {
    reasons.push('Interesting combination');
  }
  
  return reasons.join(' • ');
}

/**
 * Get outfit suggestions for a specific item
 */
export function getPairingsForItem(
  targetItem: ClosetItem,
  closetItems: ClosetItem[],
  maxSuggestions: number = 5
): OutfitSuggestion[] {
  // Filter out the target item
  const otherItems = closetItems.filter(item => item.id !== targetItem.id);
  
  // Generate combinations that include the target item
  const suggestions: OutfitSuggestion[] = [];
  
  for (let size = 1; size <= Math.min(3, otherItems.length); size++) {
    const combinations = generateCombinations(otherItems, size);
    
    for (const combo of combinations) {
      const fullOutfit = [targetItem, ...combo];
      
      // Calculate scores
      const colorScore = getColorScore(fullOutfit);
      const seasonScore = getSeasonScore(fullOutfit);
      const score = (colorScore * 0.5 + seasonScore * 0.5);
      
      if (score > 0.4) {
        suggestions.push({
          id: `pairing-${fullOutfit.map(i => i.id).join('-')}`,
          items: fullOutfit,
          score,
          reason: generateReason(fullOutfit, colorScore, seasonScore, true),
          occasion: 'casual',
          season: fullOutfit.map(i => i.season).filter(Boolean) as string[],
        });
      }
    }
  }
  
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);
}

/**
 * Get daily outfit suggestions
 */
export function getDailyOutfitSuggestion(
  closetItems: ClosetItem[],
  weather?: { temp: number; condition: string },
  occasion?: 'casual' | 'work' | 'formal' | 'athletic'
): OutfitSuggestion | null {
  const suggestions = generateOutfitSuggestions(closetItems, occasion, 1);
  return suggestions[0] || null;
}

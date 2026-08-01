/**
 * Outfit Generation Service
 * 
 * Safe and trustworthy outfit generator that uses normalized ClosetItem data
 * and PersonalStyleProfile preferences to create cohesive, personalized outfit suggestions.
 */

import { ClosetItem, ClothingCategory, Season, getCurrentSeason, hasFormalityMatch, hasColorHarmony, canLayer, isSeasonallyAppropriate } from '../models/closetItem';
import { PersonalStyleProfile, DEFAULT_PERSONAL_STYLE_PROFILE } from '../models/personalStyleProfile';

/**
 * Represents a complete outfit suggestion
 */
export interface Outfit {
  id: string;
  items: ClosetItem[];
  score: number;  // 0-100, how well this outfit matches user's PersonalStyleProfile
  occasion: string;  // e.g., "work", "casual", "date"
  reason: string;  // Human-readable explanation of why this outfit works
}

/**
 * Options for outfit generation
 */
export interface GenerateOutfitsOptions {
  occasion?: string;  // Filter for specific occasion
  season?: Season;  // Filter for specific season (defaults to current)
  maxOutfits?: number;  // Maximum number of outfits to generate (default: 3)
  minItems?: number;  // Minimum items per outfit (default: 2)
  maxItems?: number;  // Maximum items per outfit (default: 5)
}

/**
 * Silhouette compatibility rules (no ML, pure logic)
 * Defines which silhouettes pair well together for visual balance
 */
const SILHOUETTE_COMPATIBILITY: Record<string, string[]> = {
  'fitted': ['relaxed', 'wide', 'flowing', 'oversized'],  // Fitted pairs with loose
  'tailored': ['relaxed', 'slim', 'fitted'],  // Tailored pairs with structured or slim
  'relaxed': ['fitted', 'tailored', 'slim'],  // Relaxed pairs with fitted
  'oversized': ['fitted', 'slim', 'tailored'],  // Oversized pairs with fitted
  'slim': ['relaxed', 'oversized', 'tailored'],  // Slim pairs with relaxed or structured
  'wide': ['fitted', 'tailored'],  // Wide pairs with fitted
  'flowing': ['fitted', 'tailored', 'structured'],  // Flowing pairs with structured
  'structured': ['relaxed', 'flowing'],  // Structured pairs with soft
};

/**
 * Select best items from sparse closet for a single outfit
 * Focuses on creating one strong outfit rather than multiple weak ones
 */
function selectBestItems(closet: ClosetItem[], styleProfile: PersonalStyleProfile): {
  items: ClosetItem[];
  occasion: string;
} {
  // Prioritize items that match user's style archetypes
  const scoredItems = closet.map(item => ({
    item,
    score: calculateItemScore(item, styleProfile),
  })).sort((a, b) => b.score - a.score);

  const selectedItems: ClosetItem[] = [];
  const categories = new Set<ClothingCategory>();

  // Try to build a complete outfit with highest-scoring items
  for (const { item } of scoredItems) {
    // Avoid duplicate categories (except accessories)
    if (categories.has(item.category) && item.category !== 'accessory') {
      continue;
    }

    selectedItems.push(item);
    categories.add(item.category);

    // Stop when we have a reasonable outfit (2-4 items)
    if (selectedItems.length >= 4) break;
  }

  // Determine occasion based on formality of selected items
  const avgFormality = selectedItems.reduce((sum, item) => sum + item.formality, 0) / selectedItems.length;
  const occasion = avgFormality >= 7 ? 'work' : avgFormality >= 4 ? 'casual' : 'relaxed';

  return { items: selectedItems, occasion };
}

/**
 * Calculate how well an item matches user's PersonalStyleProfile
 */
function calculateItemScore(item: ClosetItem, styleProfile: PersonalStyleProfile): number {
  let score = 50; // Base score

  // Boost score if item matches style archetypes
  const itemDescriptors = [...(item.tags || []), ...item.silhouettes];
  const matchesArchetype = styleProfile.styleArchetypes.some(archetype =>
    itemDescriptors.some(desc => desc.toLowerCase().includes(archetype.toLowerCase()))
  );
  if (matchesArchetype) score += 20;

  // Boost score if item is in color comfort zone
  const inColorZone = item.colors.some(color =>
    [...styleProfile.colorProfile.primary, ...styleProfile.colorProfile.secondary].some(preferred =>
      color.toLowerCase().includes(preferred.toLowerCase())
    )
  );
  if (inColorZone) score += 15;

  // Penalize if item matches avoid rules
  const matchesAvoidRule = styleProfile.avoidRules.some(rule =>
    itemDescriptors.some(desc => desc.toLowerCase().includes(rule.toLowerCase()))
  );
  if (matchesAvoidRule) score -= 30;

  return Math.max(0, Math.min(100, score));
}

/**
 * Checks if two items have compatible silhouettes for visual balance
 */
function haveSilhouetteCompatibility(item1: ClosetItem, item2: ClosetItem): boolean {
  // If either item has no silhouettes, allow pairing (defensive)
  if (item1.silhouettes.length === 0 || item2.silhouettes.length === 0) {
    return true;
  }

  // Check if any silhouette from item1 is compatible with any from item2
  for (const sil1 of item1.silhouettes) {
    const compatibleSilhouettes = SILHOUETTE_COMPATIBILITY[sil1] || [];
    for (const sil2 of item2.silhouettes) {
      if (compatibleSilhouettes.includes(sil2)) {
        return true;
      }
      // Also check reverse compatibility
      const reverseSilhouettes = SILHOUETTE_COMPATIBILITY[sil2] || [];
      if (reverseSilhouettes.includes(sil1)) {
        return true;
      }
    }
  }

  // Same silhouettes can work together (e.g., all tailored)
  const sharedSilhouettes = item1.silhouettes.filter(s => item2.silhouettes.includes(s));
  if (sharedSilhouettes.length > 0) {
    return true;
  }

  return false;
}

/**
 * Checks if item colors are within user's comfort zone (PersonalStyleProfile color profile)
 */
function isInColorComfortZone(item: ClosetItem, styleProfile: PersonalStyleProfile): boolean {
  const allPreferredColors = [
    ...styleProfile.colorProfile.primary,
    ...styleProfile.colorProfile.secondary,
    ...styleProfile.colorProfile.stretch,
  ];

  // Check if any of the item's colors match user's preferred colors
  return item.colors.some(color => 
    allPreferredColors.some(preferred => 
      color.toLowerCase().includes(preferred.toLowerCase()) ||
      preferred.toLowerCase().includes(color.toLowerCase())
    )
  );
}

/**
 * Generates outfit suggestions from user's closet using PersonalStyleProfile preferences
 * 
 * SAFE & TRUSTWORTHY:
 * - Works even if styleProfile is undefined (uses sensible defaults)
 * - Never crashes on incomplete data (defensive programming)
 * - Always returns valid outfits (even if just basic combinations)
 * - Scores outfits so best suggestions appear first
 * 
 * @param closet - Array of normalized ClosetItem objects
 * @param styleProfile - User's style preferences (optional, uses defaults if undefined)
 * @param options - Optional configuration for outfit generation
 * @returns Array of Outfit suggestions, sorted by score (best first)
 */
export function generateOutfits(
  closet: ClosetItem[],
  styleProfile?: PersonalStyleProfile,
  options: GenerateOutfitsOptions = {}
): Outfit[] {
  // Defensive: Handle empty or invalid closet
  if (!closet || !Array.isArray(closet) || closet.length === 0) {
    return [];
  }

  // Temporary fallback: Use default PersonalStyleProfile if undefined
  // This ensures the function works even without user's style profile
  const userStyleProfile = styleProfile || DEFAULT_PERSONAL_STYLE_PROFILE;

  // SPARSE CLOSET FALLBACK
  // If closet is sparse, return a single confidence-building outfit
  const { isClosetSparse } = require('./closetAnalysis');
  if (isClosetSparse(closet)) {
    const bestOutfit = selectBestItems(closet, userStyleProfile);
    if (bestOutfit.items.length >= 2) {
      return [{
        id: `sparse-outfit-${Date.now()}`,
        items: bestOutfit.items,
        score: 85, // High score to build confidence
        occasion: bestOutfit.occasion,
        reason: "This outfit highlights the strongest pieces in your closet right now.",
      }];
    }
  }

  // Extract options with defaults
  // Rule-based: Return at most 3 outfits (best quality over quantity)
  const {
    occasion,
    season = getCurrentSeason(),
    maxOutfits = 3,
    minItems = 2,
    maxItems = 5,
  } = options;

  // Filter closet items by season (only show seasonally appropriate items)
  const seasonalItems = closet.filter(item => isSeasonallyAppropriate(item, season));
  
  if (seasonalItems.length < minItems) {
    // Not enough items for even one outfit
    return [];
  }

  // Categorize items for outfit building
  const tops = seasonalItems.filter(item => item.category === 'top');
  const bottoms = seasonalItems.filter(item => item.category === 'bottom');
  const dresses = seasonalItems.filter(item => item.category === 'dress');
  const outerwear = seasonalItems.filter(item => item.category === 'outerwear');
  const shoes = seasonalItems.filter(item => item.category === 'shoe');
  const accessories = seasonalItems.filter(item => item.category === 'accessory');

  const outfits: Outfit[] = [];

  // Strategy 1: Generate dress-based outfits
  dresses.forEach(dress => {
    const outfit = buildDressOutfit(dress, shoes, outerwear, accessories, userStyleProfile, occasion);
    if (outfit) {
      outfits.push(outfit);
    }
  });

  // Strategy 2: Generate top + bottom outfits with strict rule-based matching
  tops.forEach(top => {
    bottoms.forEach(bottom => {
      // Rule-based matching: formality alignment, color harmony, silhouette compatibility
      const formalityAligned = hasFormalityMatch(top, bottom, 2);  // Stricter tolerance
      const colorsHarmonize = hasColorHarmony(top, bottom);
      const silhouettesCompatible = haveSilhouetteCompatibility(top, bottom);
      const topInComfortZone = isInColorComfortZone(top, userStyleProfile);
      const bottomInComfortZone = isInColorComfortZone(bottom, userStyleProfile);
      
      // Only create outfit if all rules pass
      if (formalityAligned && colorsHarmonize && silhouettesCompatible && 
          (topInComfortZone || bottomInComfortZone)) {
        const outfit = buildTopBottomOutfit(top, bottom, shoes, outerwear, accessories, userStyleProfile, occasion);
        if (outfit) {
          outfits.push(outfit);
        }
      }
    });
  });

  // Sort outfits by score (best first)
  outfits.sort((a, b) => b.score - a.score);

  // Return top N outfits
  return outfits.slice(0, maxOutfits);
}

/**
 * Builds a dress-based outfit
 */
function buildDressOutfit(
  dress: ClosetItem,
  shoes: ClosetItem[],
  outerwear: ClosetItem[],
  accessories: ClosetItem[],
  styleProfile: PersonalStyleProfile,
  occasion?: string
): Outfit | null {
  const items: ClosetItem[] = [dress];

  // Rule-based shoe selection: strict formality alignment and color harmony
  const compatibleShoes = shoes.filter(shoe => {
    const formalityMatch = hasFormalityMatch(dress, shoe, 2);  // Stricter tolerance
    const colorMatch = hasColorHarmony(dress, shoe);
    const inComfortZone = isInColorComfortZone(shoe, styleProfile);
    return formalityMatch && colorMatch && inComfortZone;
  });
  
  // Deterministic selection: pick shoe with closest formality match (no randomness)
  if (compatibleShoes.length > 0) {
    const bestShoe = compatibleShoes.reduce((best, current) => 
      Math.abs(current.formality - dress.formality) < Math.abs(best.formality - dress.formality) 
        ? current 
        : best
    );
    items.push(bestShoe);
  }

  // Rule-based layering: only add if warmth logic requires it
  if (dress.warmth === 'light' || dress.warmth === 'mid') {
    const compatibleOuterwear = outerwear.filter(layer => {
      const canLayerProperly = canLayer(dress, layer);
      const formalityMatch = hasFormalityMatch(dress, layer, 2);
      const colorMatch = hasColorHarmony(layer, dress);
      return canLayerProperly && formalityMatch && colorMatch;
    });
    
    // Deterministic selection: pick outerwear with closest formality match
    if (compatibleOuterwear.length > 0) {
      const bestLayer = compatibleOuterwear.reduce((best, current) => 
        Math.abs(current.formality - dress.formality) < Math.abs(best.formality - dress.formality) 
          ? current 
          : best
      );
      items.push(bestLayer);
    }
  }

  // Rule-based accessory selection: only for formal occasions
  if (dress.formality >= 6 && accessories.length > 0) {
    const compatibleAccessories = accessories.filter(acc => {
      const formalityMatch = hasFormalityMatch(dress, acc, 2);
      const inComfortZone = isInColorComfortZone(acc, styleProfile);
      return formalityMatch && inComfortZone;
    });
    
    // Deterministic selection: pick accessory with closest formality match
    if (compatibleAccessories.length > 0) {
      const bestAccessory = compatibleAccessories.reduce((best, current) => 
        Math.abs(current.formality - dress.formality) < Math.abs(best.formality - dress.formality) 
          ? current 
          : best
      );
      items.push(bestAccessory);
    }
  }

  // Score the outfit
  const score = scoreOutfit(items, styleProfile, occasion);
  const outfitOccasion = determineOccasion(items, occasion);
  const reason = generateOutfitReason(items, styleProfile, outfitOccasion);

  // Deterministic ID generation (no randomness)
  const itemIds = items.map(i => i.id).sort().join('-');
  const outfitId = `outfit-${itemIds.substring(0, 20)}`;

  return {
    id: outfitId,
    items,
    score,
    occasion: outfitOccasion,
    reason,
  };
}

/**
 * Builds a top + bottom outfit
 */
function buildTopBottomOutfit(
  top: ClosetItem,
  bottom: ClosetItem,
  shoes: ClosetItem[],
  outerwear: ClosetItem[],
  accessories: ClosetItem[],
  styleProfile: PersonalStyleProfile,
  occasion?: string
): Outfit | null {
  const items: ClosetItem[] = [top, bottom];

  // Rule-based shoe selection: strict formality alignment and color harmony
  const avgFormality = (top.formality + bottom.formality) / 2;
  const compatibleShoes = shoes.filter(shoe => {
    const formalityMatch = Math.abs(shoe.formality - avgFormality) <= 2;  // Stricter
    const colorMatch = hasColorHarmony(shoe, top) || hasColorHarmony(shoe, bottom);
    const inComfortZone = isInColorComfortZone(shoe, styleProfile);
    return formalityMatch && colorMatch && inComfortZone;
  });
  
  // Deterministic selection: pick shoe with closest formality match (no randomness)
  if (compatibleShoes.length > 0) {
    const bestShoe = compatibleShoes.reduce((best, current) => 
      Math.abs(current.formality - avgFormality) < Math.abs(best.formality - avgFormality) 
        ? current 
        : best
    );
    items.push(bestShoe);
  }

  // Rule-based layering: only add if warmth logic requires it
  const needsLayer = top.warmth === 'light' || bottom.warmth === 'light';
  if (needsLayer && outerwear.length > 0) {
    const compatibleOuterwear = outerwear.filter(layer => {
      const canLayerProperly = canLayer(top, layer);
      const formalityMatch = Math.abs(layer.formality - avgFormality) <= 2;
      const colorMatch = hasColorHarmony(layer, top) || hasColorHarmony(layer, bottom);
      return canLayerProperly && formalityMatch && colorMatch;
    });
    
    // Deterministic selection: pick outerwear with closest formality match
    if (compatibleOuterwear.length > 0) {
      const bestLayer = compatibleOuterwear.reduce((best, current) => 
        Math.abs(current.formality - avgFormality) < Math.abs(best.formality - avgFormality) 
          ? current 
          : best
      );
      items.push(bestLayer);
    }
  }

  // Rule-based accessory selection: only for formal outfits
  if (avgFormality >= 6 && accessories.length > 0) {
    const compatibleAccessories = accessories.filter(acc => {
      const formalityMatch = Math.abs(acc.formality - avgFormality) <= 2;
      const inComfortZone = isInColorComfortZone(acc, styleProfile);
      return formalityMatch && inComfortZone;
    });
    
    // Deterministic selection: pick accessory with closest formality match
    if (compatibleAccessories.length > 0) {
      const bestAccessory = compatibleAccessories.reduce((best, current) => 
        Math.abs(current.formality - avgFormality) < Math.abs(best.formality - avgFormality) 
          ? current 
          : best
      );
      items.push(bestAccessory);
    }
  }

  // Score the outfit
  const score = scoreOutfit(items, styleProfile, occasion);
  const outfitOccasion = determineOccasion(items, occasion);
  const reason = generateOutfitReason(items, styleProfile, outfitOccasion);

  // Deterministic ID generation (no randomness)
  const itemIds = items.map(i => i.id).sort().join('-');
  const outfitId = `outfit-${itemIds.substring(0, 20)}`;

  return {
    id: outfitId,
    items,
    score,
    occasion: outfitOccasion,
    reason,
  };
}

/**
 * Scores an outfit based on PersonalStyleProfile preferences (0-100)
 */
function scoreOutfit(items: ClosetItem[], styleProfile: PersonalStyleProfile, occasion?: string): number {
  let score = 50; // Start at middle

  // Color matching with PersonalStyleProfile
  const outfitColors = items.flatMap(item => item.colors);
  const matchingPrimaryColors = outfitColors.filter(c =>
    styleProfile.colorProfile.primary.includes(c)
  );
  const matchingSecondaryColors = outfitColors.filter(c =>
    styleProfile.colorProfile.secondary.includes(c)
  );
  
  score += matchingPrimaryColors.length * 5;
  score += matchingSecondaryColors.length * 2;

  // Formality matching with lifestyle weights
  const avgFormality = items.reduce((sum, item) => sum + item.formality, 0) / items.length;
  
  if (occasion === 'work' || avgFormality >= 7) {
    score += styleProfile.lifestyleWeights.work * 20;
  } else if (occasion === 'date' || occasion === 'social') {
    score += styleProfile.lifestyleWeights.social * 20;
  } else {
    score += styleProfile.lifestyleWeights.casual * 20;
  }

  // Silhouette matching with style archetypes
  const outfitSilhouettes = items.flatMap(item => item.silhouettes);
  const hasRelaxed = outfitSilhouettes.includes('relaxed');
  const hasTailored = outfitSilhouettes.includes('tailored');
  
  if (styleProfile.styleArchetypes.includes('minimal') || styleProfile.styleArchetypes.includes('classic')) {
    if (hasTailored) score += 10;
  }
  if (styleProfile.styleArchetypes.includes('relaxed') || styleProfile.styleArchetypes.includes('bohemian')) {
    if (hasRelaxed) score += 10;
  }

  // Avoid rules penalty
  const itemTags = items.flatMap(item => item.tags || []);
  const hasAvoidedStyle = itemTags.some(tag =>
    styleProfile.avoidRules.some(rule => tag.toLowerCase().includes(rule))
  );
  if (hasAvoidedStyle) {
    score -= 30;
  }

  // Clamp score to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determines the occasion for an outfit
 */
function determineOccasion(items: ClosetItem[], requestedOccasion?: string): string {
  if (requestedOccasion) return requestedOccasion;

  const avgFormality = items.reduce((sum, item) => sum + item.formality, 0) / items.length;

  if (avgFormality >= 8) return 'formal';
  if (avgFormality >= 6) return 'work';
  if (avgFormality >= 4) return 'casual';
  return 'relaxed';
}

/**
 * Generates a human-readable explanation for why the outfit works
 * References user's PersonalStyleProfile preferences, not trends
 */
function generateOutfitReason(items: ClosetItem[], styleProfile: PersonalStyleProfile, occasion: string): string {
  const reasons: string[] = [];

  // Reference user's color preferences (PersonalStyleProfile)
  const colors = items.flatMap(item => item.colors);
  const uniqueColors = [...new Set(colors)];
  
  const matchingPrimaryColors = colors.filter(c => 
    styleProfile.colorProfile.primary.some(pref => 
      c.toLowerCase().includes(pref.toLowerCase()) || pref.toLowerCase().includes(c.toLowerCase())
    )
  );
  const matchingSecondaryColors = colors.filter(c => 
    styleProfile.colorProfile.secondary.some(pref => 
      c.toLowerCase().includes(pref.toLowerCase()) || pref.toLowerCase().includes(c.toLowerCase())
    )
  );
  
  if (matchingPrimaryColors.length > 0) {
    const colorList = [...new Set(matchingPrimaryColors)].slice(0, 2).join(' and ');
    reasons.push(`Features ${colorList} from your preferred color palette`);
  } else if (matchingSecondaryColors.length > 0) {
    reasons.push('Uses colors you enjoy wearing');
  } else if (uniqueColors.length <= 3) {
    reasons.push('Simple color combination that works well together');
  }

  // Reference user's lifestyle weights
  const avgFormality = items.reduce((sum, item) => sum + item.formality, 0) / items.length;
  
  if (occasion === 'work' || avgFormality >= 7) {
    const workWeight = Math.round(styleProfile.lifestyleWeights.work * 100);
    if (workWeight >= 30) {
      reasons.push(`Aligns with your ${workWeight}% work wardrobe needs`);
    } else {
      reasons.push('Professional look for work settings');
    }
  } else if (occasion === 'social' || (avgFormality >= 5 && avgFormality < 7)) {
    const socialWeight = Math.round(styleProfile.lifestyleWeights.social * 100);
    if (socialWeight >= 20) {
      reasons.push(`Fits your ${socialWeight}% social lifestyle`);
    } else {
      reasons.push('Polished yet approachable for social occasions');
    }
  } else {
    const casualWeight = Math.round(styleProfile.lifestyleWeights.casual * 100);
    if (casualWeight >= 30) {
      reasons.push(`Matches your ${casualWeight}% casual wardrobe preference`);
    } else {
      reasons.push('Comfortable for everyday wear');
    }
  }

  // Reference user's style archetypes
  const silhouettes = items.flatMap(item => item.silhouettes);
  const hasRelaxed = silhouettes.includes('relaxed');
  const hasTailored = silhouettes.includes('tailored');
  const hasFitted = silhouettes.includes('fitted');
  const hasOversized = silhouettes.includes('oversized');
  
  if (styleProfile.styleArchetypes.includes('minimal') || styleProfile.styleArchetypes.includes('classic')) {
    if (hasTailored || hasFitted) {
      reasons.push('Clean lines match your minimal/classic style');
    }
  } else if (styleProfile.styleArchetypes.includes('relaxed') || styleProfile.styleArchetypes.includes('bohemian')) {
    if (hasRelaxed || hasOversized) {
      reasons.push('Relaxed fit aligns with your preferred style');
    }
  } else if (styleProfile.styleArchetypes.includes('polished') || styleProfile.styleArchetypes.includes('edgy')) {
    if (hasTailored && hasRelaxed) {
      reasons.push('Balanced silhouettes create your signature polished look');
    }
  }
  
  // Silhouette compatibility (visual balance)
  if (hasTailored && hasRelaxed) {
    reasons.push('Fitted and relaxed pieces balance each other');
  } else if (hasFitted && hasOversized) {
    reasons.push('Proportions create visual interest');
  }

  // Reference avoid rules (if applicable)
  const itemTags = items.flatMap(item => item.tags || []);
  const avoidsRespected = styleProfile.avoidRules.length > 0 && 
    !itemTags.some(tag => styleProfile.avoidRules.some(rule => tag.toLowerCase().includes(rule)));
  
  if (avoidsRespected && styleProfile.avoidRules.length > 0) {
    reasons.push('Respects your style preferences');
  }

  // Guidance level personalization
  if (styleProfile.guidanceLevel === 'directive' && reasons.length > 0) {
    // For directive users, be more specific
    return reasons.slice(0, 3).join('. ') + '.';
  } else if (styleProfile.guidanceLevel === 'inspiration' && reasons.length > 0) {
    // For inspiration users, be more open-ended
    return reasons.slice(0, 2).join('. ') + '. Try it and see how you feel.';
  } else {
    // Guided (default)
    return reasons.slice(0, 2).join('. ') + '.';
  }
}

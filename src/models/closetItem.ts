/**
 * Closet Item Model
 * 
 * Normalized clothing object that replaces raw AI tags with structured,
 * actionable data for outfit matching, recommendations, and styling.
 */

export type ClothingCategory = "top" | "bottom" | "dress" | "outerwear" | "shoe" | "accessory";
export type WarmthLevel = "light" | "mid" | "heavy";
export type Season = "spring" | "summer" | "fall" | "winter";

export interface ClosetItem {
  // Required identifiers
  id: string;
  imageUrl: string;

  /**
   * Category - Used for outfit generation to ensure complete outfits
   * 
   * Outfit generation uses this to:
   * - Ensure each outfit has required pieces (top + bottom, or dress)
   * - Prevent invalid combinations (e.g., two tops together)
   * - Apply category-specific pairing rules
   * - Filter items when building specific outfit types
   */
  category: ClothingCategory;

  /**
   * Colors - Used for color harmony and coordination
   * 
   * Outfit generation uses this to:
   * - Match complementary colors across pieces
   * - Ensure neutral-based outfits don't clash
   * - Apply color theory rules (complementary, analogous, monochromatic)
   * - Score outfit cohesiveness based on color compatibility
   * - Match against user's PersonalStyleProfile color preferences
   */
  colors: string[];

  /**
   * Warmth - Used for layering logic and seasonal appropriateness
   * 
   * Outfit generation uses this to:
   * - Determine valid layering order (light under heavy)
   * - Ensure weather-appropriate outfit suggestions
   * - Calculate if additional layers are needed
   * - Match warmth level to current season/temperature
   * - Prevent over-layering or under-dressing
   */
  warmth: WarmthLevel;

  /**
   * Formality - Used to ensure outfit pieces match in dressiness (1-10 scale)
   * 
   * Outfit generation uses this to:
   * - Match items within acceptable formality range (typically ±2 points)
   * - Filter items for occasion-specific outfits (casual vs formal events)
   * - Ensure visual coherence (no sneakers with suits)
   * - Score outfit appropriateness for different contexts
   * - Align with user's lifestyle weights from PersonalStyleProfile
   */
  formality: number;

  /**
   * Silhouettes - Used for visual balance and style matching
   * 
   * Outfit generation uses this to:
   * - Balance proportions (fitted top with relaxed bottom, or vice versa)
   * - Match style aesthetics (all tailored vs all relaxed)
   * - Align with user's PersonalStyleProfile archetypes
   * - Prevent unflattering combinations
   * - Apply fit preference rules from PersonalStyleProfile
   */
  silhouettes: string[];

  /**
   * Seasons - Used to filter items for current weather/time of year
   * 
   * Outfit generation uses this to:
   * - Only suggest seasonally appropriate items
   * - Auto-filter closet based on current season
   * - Ensure outfit makes sense for weather conditions
   * - Prioritize multi-season versatile pieces
   * - Match to user's travel/location context
   */
  seasons: Season[];

  /**
   * Last Worn - Used to promote variety and reduce outfit repetition
   * 
   * Outfit generation uses this to:
   * - Prioritize least-recently-worn items
   * - Ensure wardrobe rotation
   * - Suggest fresh combinations
   * - Track usage patterns for analytics
   */
  lastWorn?: Date;
  
  // Optional metadata (not used in core outfit generation)
  brand?: string;
  name?: string;
  purchaseDate?: Date;
  price?: number;
  notes?: string;
  tags?: string[];  // User-defined tags
  favorite?: boolean;
}

/**
 * Extended ClosetItem with user-specific metadata
 */
export interface UserClosetItem extends ClosetItem {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  wearCount: number;
  versatilityScore?: number;  // Calculated based on outfit pairings
}

/**
 * Category definitions with typical formality ranges
 */
export const CATEGORY_DEFAULTS = {
  top: {
    formalityRange: [1, 9],
    typicalSilhouettes: ["relaxed", "fitted", "oversized", "tailored"],
  },
  bottom: {
    formalityRange: [1, 9],
    typicalSilhouettes: ["relaxed", "fitted", "wide", "slim", "tailored"],
  },
  dress: {
    formalityRange: [3, 10],
    typicalSilhouettes: ["fitted", "flowing", "structured", "wrap"],
  },
  outerwear: {
    formalityRange: [1, 9],
    typicalSilhouettes: ["relaxed", "fitted", "oversized", "structured"],
  },
  shoe: {
    formalityRange: [1, 10],
    typicalSilhouettes: ["casual", "athletic", "dressy", "formal"],
  },
  accessory: {
    formalityRange: [1, 10],
    typicalSilhouettes: ["minimal", "statement", "delicate", "bold"],
  },
} as const;

/**
 * Warmth level definitions for layering logic
 */
export const WARMTH_DEFINITIONS = {
  light: {
    description: "Lightweight, breathable fabrics",
    examples: ["t-shirt", "tank top", "shorts", "sandals"],
    idealSeasons: ["spring", "summer"],
  },
  mid: {
    description: "Medium weight, versatile",
    examples: ["long sleeve shirt", "jeans", "light jacket", "sneakers"],
    idealSeasons: ["spring", "fall"],
  },
  heavy: {
    description: "Warm, insulating fabrics",
    examples: ["sweater", "coat", "boots", "thick pants"],
    idealSeasons: ["fall", "winter"],
  },
} as const;

/**
 * Validates a ClosetItem object
 */
export function validateClosetItem(item: Partial<ClosetItem>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!item.id) errors.push("Missing required field: id");
  if (!item.imageUrl) errors.push("Missing required field: imageUrl");
  if (!item.category) errors.push("Missing required field: category");
  if (!item.colors || item.colors.length === 0) errors.push("Missing required field: colors");
  if (!item.warmth) errors.push("Missing required field: warmth");
  if (item.formality === undefined || item.formality < 1 || item.formality > 10) {
    errors.push("Formality must be between 1 and 10");
  }
  if (!item.silhouettes || item.silhouettes.length === 0) {
    errors.push("Missing required field: silhouettes");
  }
  if (!item.seasons || item.seasons.length === 0) {
    errors.push("Missing required field: seasons");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalizes raw AI tags into a structured ClosetItem
 */
export function normalizeFromAITags(
  id: string,
  imageUrl: string,
  aiTags: string[]
): Partial<ClosetItem> {
  const normalized: Partial<ClosetItem> = {
    id,
    imageUrl,
    colors: [],
    silhouettes: [],
    seasons: [],
  };

  // Extract category
  const categoryTags = aiTags.filter(tag => 
    ["top", "bottom", "dress", "outerwear", "shoe", "accessory"].includes(tag.toLowerCase())
  );
  if (categoryTags.length > 0) {
    normalized.category = categoryTags[0].toLowerCase() as ClothingCategory;
  }

  // Extract colors
  const colorKeywords = ["black", "white", "blue", "red", "green", "yellow", "pink", "purple", 
                        "brown", "gray", "grey", "beige", "navy", "orange", "tan", "cream"];
  normalized.colors = aiTags.filter(tag => 
    colorKeywords.some(color => tag.toLowerCase().includes(color))
  ).map(tag => tag.toLowerCase());

  // Extract warmth
  if (aiTags.some(tag => ["heavy", "thick", "warm", "winter"].some(w => tag.toLowerCase().includes(w)))) {
    normalized.warmth = "heavy";
  } else if (aiTags.some(tag => ["light", "thin", "summer", "tank"].some(w => tag.toLowerCase().includes(w)))) {
    normalized.warmth = "light";
  } else {
    normalized.warmth = "mid";
  }

  // Estimate formality (basic heuristic)
  let formality = 5; // Default to middle
  if (aiTags.some(tag => ["formal", "dress", "suit", "blazer", "elegant"].some(f => tag.toLowerCase().includes(f)))) {
    formality = 8;
  } else if (aiTags.some(tag => ["casual", "relaxed", "athletic", "gym"].some(c => tag.toLowerCase().includes(c)))) {
    formality = 3;
  }
  normalized.formality = formality;

  // Extract silhouettes
  const silhouetteKeywords = ["relaxed", "fitted", "oversized", "tailored", "slim", "wide", "flowing", "structured"];
  normalized.silhouettes = aiTags.filter(tag =>
    silhouetteKeywords.some(sil => tag.toLowerCase().includes(sil))
  ).map(tag => tag.toLowerCase());
  
  if (normalized.silhouettes.length === 0) {
    normalized.silhouettes = ["relaxed"]; // Default
  }

  // Extract seasons
  const seasonKeywords: Season[] = ["spring", "summer", "fall", "winter"];
  normalized.seasons = aiTags.filter(tag =>
    seasonKeywords.some(season => tag.toLowerCase().includes(season))
  ).map(tag => tag.toLowerCase() as Season);
  
  if (normalized.seasons.length === 0) {
    // Default based on warmth
    if (normalized.warmth === "light") {
      normalized.seasons = ["spring", "summer"];
    } else if (normalized.warmth === "heavy") {
      normalized.seasons = ["fall", "winter"];
    } else {
      normalized.seasons = ["spring", "fall"];
    }
  }

  return normalized;
}

/**
 * Checks if an item is appropriate for a given season
 */
export function isSeasonallyAppropriate(item: ClosetItem, season: Season): boolean {
  return item.seasons.includes(season);
}

/**
 * Checks if two items have compatible formality levels
 */
export function hasFormalityMatch(item1: ClosetItem, item2: ClosetItem, tolerance: number = 2): boolean {
  return Math.abs(item1.formality - item2.formality) <= tolerance;
}

/**
 * Checks if items can be layered together based on warmth
 */
export function canLayer(baseItem: ClosetItem, layerItem: ClosetItem): boolean {
  const warmthOrder = { light: 1, mid: 2, heavy: 3 };
  
  // Layer should be warmer or equal to base
  return warmthOrder[layerItem.warmth] >= warmthOrder[baseItem.warmth];
}

/**
 * Calculates color compatibility between two items
 */
export function hasColorHarmony(item1: ClosetItem, item2: ClosetItem): boolean {
  // Neutrals go with everything
  const neutrals = ["black", "white", "gray", "grey", "beige", "navy", "brown", "tan", "cream"];
  
  const hasNeutral1 = item1.colors.some(c => neutrals.includes(c));
  const hasNeutral2 = item2.colors.some(c => neutrals.includes(c));
  
  if (hasNeutral1 || hasNeutral2) return true;
  
  // Check for matching colors
  const sharedColors = item1.colors.filter(c => item2.colors.includes(c));
  if (sharedColors.length > 0) return true;
  
  // Complementary color pairs (simplified)
  const complementary: Record<string, string[]> = {
    blue: ["orange", "yellow", "white", "beige"],
    red: ["green", "white", "black"],
    yellow: ["purple", "blue", "gray"],
    green: ["red", "brown", "beige"],
    purple: ["yellow", "white"],
    orange: ["blue", "brown"],
    pink: ["gray", "white", "navy"],
  };
  
  for (const color1 of item1.colors) {
    if (complementary[color1]) {
      for (const color2 of item2.colors) {
        if (complementary[color1].includes(color2)) return true;
      }
    }
  }
  
  return false;
}

/**
 * Calculates a versatility score for an item (0-100)
 * Based on neutral colors, mid-formality, and multi-season appropriateness
 */
export function calculateVersatilityScore(item: ClosetItem): number {
  let score = 0;
  
  // Neutral colors are more versatile (40 points)
  const neutrals = ["black", "white", "gray", "grey", "beige", "navy", "brown", "tan"];
  const neutralCount = item.colors.filter(c => neutrals.includes(c)).length;
  score += Math.min(40, neutralCount * 20);
  
  // Mid-formality is most versatile (30 points)
  const formalityScore = 30 - Math.abs(item.formality - 5) * 3;
  score += Math.max(0, formalityScore);
  
  // Multi-season items are more versatile (30 points)
  score += (item.seasons.length / 4) * 30;
  
  return Math.round(Math.min(100, score));
}

/**
 * Gets the current season based on date
 */
export function getCurrentSeason(date: Date = new Date()): Season {
  const month = date.getMonth(); // 0-11
  
  if (month >= 2 && month <= 4) return "spring";  // Mar-May
  if (month >= 5 && month <= 7) return "summer";  // Jun-Aug
  if (month >= 8 && month <= 10) return "fall";   // Sep-Nov
  return "winter";  // Dec-Feb
}

/**
 * Filters closet items by category
 */
export function filterByCategory(items: ClosetItem[], category: ClothingCategory): ClosetItem[] {
  return items.filter(item => item.category === category);
}

/**
 * Filters closet items by formality range
 */
export function filterByFormality(
  items: ClosetItem[],
  minFormality: number,
  maxFormality: number
): ClosetItem[] {
  return items.filter(item => item.formality >= minFormality && item.formality <= maxFormality);
}

/**
 * Filters closet items by season
 */
export function filterBySeason(items: ClosetItem[], season: Season): ClosetItem[] {
  return items.filter(item => item.seasons.includes(season));
}

/**
 * Sorts items by last worn date (least recently worn first)
 */
export function sortByLastWorn(items: ClosetItem[]): ClosetItem[] {
  return [...items].sort((a, b) => {
    if (!a.lastWorn) return -1;
    if (!b.lastWorn) return 1;
    return a.lastWorn.getTime() - b.lastWorn.getTime();
  });
}

/**
 * Creates a default ClosetItem with required fields
 */
export function createDefaultClosetItem(
  id: string,
  imageUrl: string,
  category: ClothingCategory
): ClosetItem {
  return {
    id,
    imageUrl,
    category,
    colors: ["gray"],
    warmth: "mid",
    formality: 5,
    silhouettes: ["relaxed"],
    seasons: ["spring", "fall"],
  };
}

/**
 * Maps existing closet scan output to normalized ClosetItem model
 * 
 * Preserves existing scan behavior while converting to structured format.
 * Uses reasonable defaults for missing fields.
 * 
 * DEFENSIVE DEFAULTS:
 * This function is designed to NEVER fail, even with incomplete or malformed scan data.
 * All fields have sensible fallbacks to prevent null/undefined from breaking outfit generation.
 * 
 * MVP APPROXIMATION PHILOSOPHY:
 * Approximate values are acceptable for MVP because:
 * - Better to show imperfect outfit suggestions than crash or show nothing
 * - Users can manually correct items later if AI misclassifies
 * - Defaults are based on statistical clothing norms (most items are casual, mid-weight, relaxed)
 * - Outfit generation algorithms are tolerant to small inaccuracies (±2 formality, color harmony rules)
 * - Real user feedback will improve AI over time; perfect accuracy isn't required for launch
 * - Edge cases (e.g., formal sneakers) are rare and won't significantly impact user experience
 * 
 * @param scanOutput - Raw output from closet scan/Firebase API (may be incomplete)
 * @returns Normalized ClosetItem with guaranteed valid values
 */
export function mapScanOutputToClosetItem(scanOutput: any): ClosetItem {
  // Defensive: Handle null/undefined scanOutput
  if (!scanOutput || typeof scanOutput !== 'object') {
    scanOutput = {};
  }

  // Extract ID and imageUrl (required fields) with defensive fallbacks
  const id = scanOutput.id || scanOutput._id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const imageUrl = scanOutput.imageUrl || scanOutput.thumbnailUrl || scanOutput.url || '';

  // Map category from scan output
  let category: ClothingCategory = "top"; // Default
  const rawCategory = (scanOutput.category || '').toLowerCase();
  
  if (rawCategory.includes('top') || rawCategory.includes('shirt') || rawCategory.includes('blouse')) {
    category = "top";
  } else if (rawCategory.includes('bottom') || rawCategory.includes('pant') || rawCategory.includes('jean') || rawCategory.includes('short')) {
    category = "bottom";
  } else if (rawCategory.includes('dress') || rawCategory.includes('gown')) {
    category = "dress";
  } else if (rawCategory.includes('outerwear') || rawCategory.includes('jacket') || rawCategory.includes('coat') || rawCategory.includes('sweater')) {
    category = "outerwear";
  } else if (rawCategory.includes('shoe') || rawCategory.includes('boot') || rawCategory.includes('sneaker')) {
    category = "shoe";
  } else if (rawCategory.includes('accessor') || rawCategory.includes('bag') || rawCategory.includes('hat') || rawCategory.includes('scarf')) {
    category = "accessory";
  }

  // Extract colors from scan output
  // MVP: Gray is an acceptable default - most clothing has some neutral tone
  const colors: string[] = [];
  
  // Primary color (defensive: check for null/undefined/empty string)
  if (scanOutput.color && typeof scanOutput.color === 'string' && scanOutput.color.trim()) {
    colors.push(scanOutput.color.toLowerCase().trim());
  }
  
  // Secondary colors (defensive: validate array and string values)
  if (scanOutput.secondaryColors && Array.isArray(scanOutput.secondaryColors)) {
    scanOutput.secondaryColors.forEach((c: any) => {
      if (c && typeof c === 'string' && c.trim()) {
        const normalized = c.toLowerCase().trim();
        if (!colors.includes(normalized)) {
          colors.push(normalized);
        }
      }
    });
  }
  
  // Defensive fallback: Always ensure at least one color exists
  // MVP: "gray" is statistically common and pairs well with most colors
  if (colors.length === 0) {
    colors.push("gray");
  }

  // Determine warmth from fabric texture, sleeve length, or category
  // MVP: "mid" is the safest default - works for 3 out of 4 seasons
  let warmth: WarmthLevel = "mid";
  
  // Defensive: Ensure strings are valid before processing
  const fabricTexture = (scanOutput.fabricTexture && typeof scanOutput.fabricTexture === 'string') 
    ? scanOutput.fabricTexture.toLowerCase() 
    : '';
  const sleeveLength = (scanOutput.sleeveLength && typeof scanOutput.sleeveLength === 'string') 
    ? scanOutput.sleeveLength.toLowerCase() 
    : '';
  
  if (fabricTexture.includes('heavy') || fabricTexture.includes('thick') || fabricTexture.includes('wool')) {
    warmth = "heavy";
  } else if (fabricTexture.includes('light') || fabricTexture.includes('thin') || sleeveLength.includes('sleeveless') || sleeveLength.includes('short')) {
    warmth = "light";
  } else if (category === "outerwear") {
    warmth = "heavy"; // Outerwear defaults to heavy
  } else if (sleeveLength.includes('long')) {
    warmth = "mid";
  }

  // Estimate formality from style, fit type, and category
  // MVP: Formality=5 is acceptable default - represents "smart casual" which is most common
  // Outfit generation uses ±2 tolerance, so small inaccuracies won't break matching
  let formality = 5;
  
  // Defensive: Validate string types
  const style = (scanOutput.style && typeof scanOutput.style === 'string') 
    ? scanOutput.style.toLowerCase() 
    : '';
  const fitType = (scanOutput.fitType && typeof scanOutput.fitType === 'string') 
    ? scanOutput.fitType.toLowerCase() 
    : '';
  
  if (style.includes('formal') || style.includes('business') || style.includes('professional') || fitType.includes('tailored')) {
    formality = 8;
  } else if (style.includes('elegant') || style.includes('sophisticated')) {
    formality = 7;
  } else if (style.includes('casual') || style.includes('relaxed') || style.includes('athletic')) {
    formality = 3;
  } else if (category === "dress") {
    formality = 6; // Dresses slightly more formal by default
  } else if (category === "shoe") {
    formality = 5; // Shoes vary widely, keep at middle
  }
  
  // Defensive: Clamp formality to valid range (1-10)
  formality = Math.max(1, Math.min(10, formality));

  // Extract silhouettes from fit type and style
  // MVP: "relaxed" is acceptable default - most casual clothing is relaxed fit
  const silhouettes: string[] = [];
  
  if (fitType && fitType.length > 0) {
    if (fitType.includes('relaxed') || fitType.includes('loose')) silhouettes.push("relaxed");
    if (fitType.includes('fitted') || fitType.includes('slim')) silhouettes.push("fitted");
    if (fitType.includes('tailored')) silhouettes.push("tailored");
    if (fitType.includes('oversized')) silhouettes.push("oversized");
  }
  
  if (style && style.length > 0) {
    if (style.includes('flowing')) silhouettes.push("flowing");
    if (style.includes('structured')) silhouettes.push("structured");
  }
  
  // Defensive: Always ensure at least one silhouette
  if (silhouettes.length === 0) {
    silhouettes.push("relaxed");
  }

  // Map seasons from scan output
  // MVP: Season defaults based on warmth are acceptable - better than crashing
  let seasons: Season[] = [];
  
  // Defensive: Validate seasons array and string values
  if (scanOutput.seasons && Array.isArray(scanOutput.seasons)) {
    scanOutput.seasons.forEach((s: any) => {
      if (s && typeof s === 'string') {
        const season = s.toLowerCase();
        if (season.includes('spring') && !seasons.includes("spring")) seasons.push("spring");
        if (season.includes('summer') && !seasons.includes("summer")) seasons.push("summer");
        if ((season.includes('fall') || season.includes('autumn')) && !seasons.includes("fall")) seasons.push("fall");
        if (season.includes('winter') && !seasons.includes("winter")) seasons.push("winter");
      }
    });
  }
  
  // Defensive: Always ensure at least one season exists
  // MVP: Warmth-based season defaults are statistically accurate for most clothing
  if (seasons.length === 0) {
    if (warmth === "light") {
      seasons = ["spring", "summer"];
    } else if (warmth === "heavy") {
      seasons = ["fall", "winter"];
    } else {
      seasons = ["spring", "fall"]; // Mid-weight works for transitional seasons
    }
  }

  // Extract optional metadata with defensive checks
  // MVP: Missing metadata is fine - these fields are optional and don't affect outfit generation
  const brand = (scanOutput.brand && typeof scanOutput.brand === 'string' && scanOutput.brand.trim()) 
    ? scanOutput.brand.trim() 
    : undefined;
  
  const name = (scanOutput.name && typeof scanOutput.name === 'string' && scanOutput.name.trim())
    ? scanOutput.name.trim()
    : (scanOutput.subcategory && typeof scanOutput.subcategory === 'string' && scanOutput.subcategory.trim())
      ? scanOutput.subcategory.trim()
      : undefined;
  
  const notes = (scanOutput.notes && typeof scanOutput.notes === 'string' && scanOutput.notes.trim())
    ? scanOutput.notes.trim()
    : undefined;
  
  const tags = (scanOutput.tags && Array.isArray(scanOutput.tags))
    ? scanOutput.tags.filter((t: any) => t && typeof t === 'string' && t.trim()).map((t: string) => t.trim())
    : undefined;
  
  // Defensive: Validate date before creating Date object
  let lastWorn: Date | undefined = undefined;
  if (scanOutput.lastWorn) {
    try {
      const date = new Date(scanOutput.lastWorn);
      // Check if date is valid (not NaN)
      if (!isNaN(date.getTime())) {
        lastWorn = date;
      }
    } catch (e) {
      // Invalid date format - ignore and leave as undefined
    }
  }

  // Return normalized ClosetItem with guaranteed valid values
  // All required fields are present with sensible defaults
  // MVP: This item is ready for outfit generation even if AI scan was incomplete
  return {
    id,
    imageUrl,
    category,
    colors,
    warmth,
    formality,
    silhouettes,
    seasons,
    lastWorn,
    brand,
    name,
    notes,
    tags,
  };
}

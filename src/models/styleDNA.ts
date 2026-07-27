/**
 * Style DNA Model
 * 
 * A first-class object representing a user's comprehensive style profile.
 * This model captures lifestyle preferences, style archetypes, avoidance rules,
 * color profiles, fit preferences, and guidance level to power personalized
 * styling recommendations throughout the app.
 */

export interface StyleDNA {
  /**
   * Lifestyle distribution weights (should sum to 1.0)
   * Represents how the user splits their wardrobe needs across different contexts
   */
  lifestyleWeights: {
    work: number;      // Professional/office wear (0-1)
    casual: number;    // Everyday relaxed wear (0-1)
    social: number;    // Events, dates, social gatherings (0-1)
    travel: number;    // Travel and vacation wear (0-1)
  };

  /**
   * Core style archetypes that define the user's aesthetic
   * Examples: "minimal", "polished", "relaxed", "edgy", "classic", "bohemian"
   */
  styleArchetypes: string[];

  /**
   * Style elements to avoid
   * Examples: "trendy", "tight", "loud", "oversized", "formal", "casual"
   */
  avoidRules: string[];

  /**
   * Color profile defining preferred color palettes
   */
  colorProfile: {
    primary: string[];    // Go-to colors the user loves and wears frequently
    secondary: string[];  // Complementary colors for variety
    stretch: string[];    // Colors outside comfort zone to explore occasionally
  };

  /**
   * Body fit preferences for personalized recommendations
   */
  fitPreferences: {
    highlight?: string[];  // Body areas to emphasize (e.g., "shoulders", "waist", "legs")
    downplay?: string[];   // Body areas to minimize focus (e.g., "hips", "arms", "midsection")
  };

  /**
   * Level of styling guidance the user prefers
   * - "inspiration": Show ideas, let user decide
   * - "guided": Provide suggestions with explanations
   * - "directive": Give specific recommendations and instructions
   */
  guidanceLevel: "inspiration" | "guided" | "directive";
}

/**
 * Extended Style DNA with metadata
 */
export interface UserStyleDNA extends StyleDNA {
  userId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isComplete: boolean;  // Whether the user has completed the style profile
}

/**
 * Style archetype definitions
 */
export const STYLE_ARCHETYPES = {
  minimal: {
    name: "Minimal",
    description: "Clean lines, neutral colors, simple silhouettes",
    keywords: ["simple", "clean", "neutral", "understated"],
  },
  polished: {
    name: "Polished",
    description: "Refined, put-together, professional",
    keywords: ["refined", "tailored", "sophisticated", "elegant"],
  },
  relaxed: {
    name: "Relaxed",
    description: "Comfortable, easy-going, effortless",
    keywords: ["comfortable", "casual", "effortless", "laid-back"],
  },
  edgy: {
    name: "Edgy",
    description: "Bold, modern, fashion-forward",
    keywords: ["bold", "modern", "daring", "unconventional"],
  },
  classic: {
    name: "Classic",
    description: "Timeless, traditional, elegant",
    keywords: ["timeless", "traditional", "refined", "enduring"],
  },
  bohemian: {
    name: "Bohemian",
    description: "Free-spirited, artistic, eclectic",
    keywords: ["artistic", "eclectic", "flowing", "creative"],
  },
  romantic: {
    name: "Romantic",
    description: "Soft, feminine, delicate",
    keywords: ["soft", "feminine", "delicate", "flowing"],
  },
  sporty: {
    name: "Sporty",
    description: "Athletic, functional, active",
    keywords: ["athletic", "functional", "active", "dynamic"],
  },
} as const;

/**
 * Default Style DNA for new users
 */
export const DEFAULT_STYLE_DNA: StyleDNA = {
  lifestyleWeights: {
    work: 0.4,
    casual: 0.4,
    social: 0.15,
    travel: 0.05,
  },
  styleArchetypes: ["classic", "polished"],
  avoidRules: [],
  colorProfile: {
    primary: ["black", "white", "navy", "gray"],
    secondary: ["beige", "brown", "blue"],
    stretch: [],
  },
  fitPreferences: {},
  guidanceLevel: "guided",
};

/**
 * Validates a complete StyleDNA object
 */
export function validateStyleDNA(styleDNA: StyleDNA): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate lifestyle weights
  if (!validateLifestyleWeights(styleDNA.lifestyleWeights)) {
    errors.push('Lifestyle weights must sum to 1.0');
  }

  // Validate style archetypes
  if (!styleDNA.styleArchetypes || styleDNA.styleArchetypes.length === 0) {
    errors.push('At least one style archetype is required');
  }

  // Validate color profile - at least one primary color required
  if (!styleDNA.colorProfile.primary || styleDNA.colorProfile.primary.length === 0) {
    errors.push('At least one primary color is required');
  }

  // Validate guidance level
  if (!['inspiration', 'guided', 'directive'].includes(styleDNA.guidanceLevel)) {
    errors.push('Valid guidance level is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that lifestyle weights sum to approximately 1.0
 */
export function validateLifestyleWeights(weights: StyleDNA['lifestyleWeights']): boolean {
  const sum = weights.work + weights.casual + weights.social + weights.travel;
  return Math.abs(sum - 1.0) < 0.01; // Allow small floating point errors
}

/**
 * Normalizes lifestyle weights to sum to 1.0
 */
export function normalizeLifestyleWeights(
  weights: StyleDNA['lifestyleWeights']
): StyleDNA['lifestyleWeights'] {
  const sum = weights.work + weights.casual + weights.social + weights.travel;
  
  if (sum === 0) {
    return DEFAULT_STYLE_DNA.lifestyleWeights;
  }
  
  return {
    work: weights.work / sum,
    casual: weights.casual / sum,
    social: weights.social / sum,
    travel: weights.travel / sum,
  };
}

/**
 * Calculates a style compatibility score between two Style DNAs (0-1)
 */
export function calculateStyleCompatibility(dna1: StyleDNA, dna2: StyleDNA): number {
  let score = 0;
  let factors = 0;

  // Compare style archetypes (40% weight)
  const sharedArchetypes = dna1.styleArchetypes.filter(a => 
    dna2.styleArchetypes.includes(a)
  );
  score += (sharedArchetypes.length / Math.max(dna1.styleArchetypes.length, dna2.styleArchetypes.length)) * 0.4;
  factors += 0.4;

  // Compare primary colors (30% weight)
  const sharedColors = dna1.colorProfile.primary.filter(c => 
    dna2.colorProfile.primary.includes(c)
  );
  score += (sharedColors.length / Math.max(dna1.colorProfile.primary.length, dna2.colorProfile.primary.length)) * 0.3;
  factors += 0.3;

  // Compare lifestyle weights (30% weight)
  const lifestyleDiff = 
    Math.abs(dna1.lifestyleWeights.work - dna2.lifestyleWeights.work) +
    Math.abs(dna1.lifestyleWeights.casual - dna2.lifestyleWeights.casual) +
    Math.abs(dna1.lifestyleWeights.social - dna2.lifestyleWeights.social) +
    Math.abs(dna1.lifestyleWeights.travel - dna2.lifestyleWeights.travel);
  
  score += (1 - (lifestyleDiff / 4)) * 0.3;
  factors += 0.3;

  return score / factors;
}

/**
 * Determines if an item matches the user's Style DNA
 */
export function matchesStyleDNA(
  itemTags: string[],
  itemColors: string[],
  styleDNA: StyleDNA
): {
  matches: boolean;
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // Check avoid rules (automatic rejection)
  const hasAvoidedStyle = itemTags.some(tag => 
    styleDNA.avoidRules.some(rule => tag.toLowerCase().includes(rule.toLowerCase()))
  );
  
  if (hasAvoidedStyle) {
    return {
      matches: false,
      score: 0,
      reasons: ["Contains avoided style elements"],
    };
  }

  // Check style archetypes
  const matchingArchetypes = itemTags.filter(tag =>
    styleDNA.styleArchetypes.some(archetype => 
      tag.toLowerCase().includes(archetype.toLowerCase())
    )
  );
  
  if (matchingArchetypes.length > 0) {
    score += 0.4;
    reasons.push(`Matches ${matchingArchetypes.join(", ")} style`);
  }

  // Check color profile
  const matchingColors = itemColors.filter(color =>
    styleDNA.colorProfile.primary.includes(color.toLowerCase()) ||
    styleDNA.colorProfile.secondary.includes(color.toLowerCase())
  );
  
  if (matchingColors.length > 0) {
    score += 0.3;
    reasons.push(`Matches preferred colors: ${matchingColors.join(", ")}`);
  }

  // Stretch colors get a small bonus
  const stretchColors = itemColors.filter(color =>
    styleDNA.colorProfile.stretch.includes(color.toLowerCase())
  );
  
  if (stretchColors.length > 0) {
    score += 0.1;
    reasons.push(`Stretch color opportunity: ${stretchColors.join(", ")}`);
  }

  return {
    matches: score >= 0.3, // Threshold for matching
    score,
    reasons,
  };
}

/**
 * Creates a new User Style DNA with metadata
 */
export function createUserStyleDNA(
  userId: string,
  styleDNA: Partial<StyleDNA> = {}
): UserStyleDNA {
  const now = new Date().toISOString();
  
  return {
    ...DEFAULT_STYLE_DNA,
    ...styleDNA,
    userId,
    createdAt: now,
    updatedAt: now,
    version: 1,
    isComplete: false,
  };
}

/**
 * Updates an existing User Style DNA
 */
export function updateUserStyleDNA(
  existing: UserStyleDNA,
  updates: Partial<StyleDNA>
): UserStyleDNA {
  return {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  };
}

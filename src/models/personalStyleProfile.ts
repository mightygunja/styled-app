/**
 * Personal Style Profile Model
 *
 * A first-class object representing a user's comprehensive style profile.
 * This model captures lifestyle preferences, style archetypes, avoidance rules,
 * color profiles, fit preferences, and guidance level to power personalized
 * styling recommendations throughout the app.
 */

/**
 * A single recommended (or to-avoid) color in a personal color analysis result.
 */
export interface ColorSwatch {
  name: string; // e.g. "Warm Ivory"
  hex: string;  // e.g. "#F5E6D3"
}

export const COLOR_SEASONS = [
  'Bright Spring', 'True Spring', 'Light Spring',
  'Light Summer', 'True Summer', 'Soft Summer',
  'Soft Autumn', 'True Autumn', 'Deep Autumn',
  'Deep Winter', 'True Winter', 'Bright Winter',
] as const;

export type ColorSeason = (typeof COLOR_SEASONS)[number];

/**
 * Result of an AI-powered personal color analysis (selfie -> seasonal color type).
 * Optional on PersonalStyleProfile so existing profiles without an analysis remain valid.
 */
export interface ColorAnalysisResult {
  season: ColorSeason;
  undertone: 'warm' | 'cool' | 'neutral';
  description: string;
  palette: ColorSwatch[];
  colorsToAvoid: ColorSwatch[];
  analyzedAt: string;
  sourceImageUrl?: string;
}

/**
 * Whose wardrobe the app is dressing. Set in onboarding; every matcher,
 * catalogue search and outbound link respects it. 'all' (and the undefined
 * of profiles that predate the question) means no department filtering.
 */
export type WardrobeFocus = 'womens' | 'mens' | 'all';

export const WOMENS_BODY_TYPES = [
  'hourglass', 'topHourglass', 'bottomHourglass',
  'pear', 'invertedTriangle', 'rectangle', 'apple', 'diamond',
] as const;

/**
 * The five standard menswear frame types. Prefixed keys so their guide
 * content never collides with the women's rectangle/inverted-triangle
 * entries, whose advice is written for a different wardrobe.
 */
export const MENS_BODY_TYPES = [
  'mTrapezoid', 'mRectangle', 'mTriangle', 'mOval', 'mInvertedTriangle',
] as const;

export const BODY_TYPES = [...WOMENS_BODY_TYPES, ...MENS_BODY_TYPES] as const;

export type BodyType = (typeof BODY_TYPES)[number];

/**
 * Per-category styling guidance - deliberately more granular than a flat
 * highlight/downplay list, so advice doesn't collapse into vague silhouette
 * talk (e.g. a shoe pick that undercuts the rest of the outfit).
 */
export interface CategoryGuidance {
  tops: string[];
  bottoms: string[];
  dresses: string[];
  shoes: string[];
  outerwear: string[];
}

/**
 * Result of a body/fit analysis - either from the guided quiz (deterministic,
 * on-device) or an AI photo estimate. Optional on PersonalStyleProfile so existing
 * profiles without one remain valid.
 */
export interface BodyAnalysisResult {
  bodyType: BodyType;
  description: string;
  highlight: string[];              // body areas to emphasize
  downplay: string[];               // body areas to minimize focus
  recommendedSilhouettes: string[]; // cuts/shapes that work well, at a glance
  categoryGuidance: CategoryGuidance;
  source: 'quiz' | 'photo';
  photoConfirmed?: boolean;         // true once a photo estimate has agreed with (or replaced) the quiz result
  analyzedAt: string;
  sourceImageUrl?: string;
}

/**
 * Static styling guidance per body type, used both as the quiz result content
 * and as a fallback if an AI photo estimate omits a field. `matchKeywords`
 * powers the Wardrobe Fit Check - matching against tags/subcategory on the
 * user's real closet items, not just generic advice.
 */
export const BODY_TYPE_GUIDES: Record<BodyType, {
  label: string;
  description: string;
  highlight: string[];
  downplay: string[];
  recommendedSilhouettes: string[];
  categoryGuidance: CategoryGuidance;
  matchKeywords: string[];
}> = {
  hourglass: {
    label: 'Hourglass',
    description: 'Your bust and hips are close in width with a well-defined waist - balance comes naturally, so the goal is to keep it visible.',
    highlight: ['waist', 'shoulders'],
    downplay: [],
    recommendedSilhouettes: ['Wrap tops and dresses', 'Fitted waistbands', 'Belted coats', 'V-necks'],
    categoryGuidance: {
      tops: ['Wrap and surplice styles that nip at the waist', 'Fitted knits over boxy cuts'],
      bottoms: ['High-rise, fitted-through-the-hip cuts', 'Avoid anything that adds bulk at the waistband'],
      dresses: ['Wrap dresses', 'Fit-and-flare with a defined waist seam'],
      shoes: ['Pointed-toe flats or heels to keep the leg line long', 'Avoid chunky ankle straps that cut the leg short'],
      outerwear: ['Belted coats and trenches', 'Tailored blazers nipped at the waist'],
    },
    matchKeywords: ['wrap', 'belted', 'fitted', 'v-neck', 'fit-and-flare', 'surplice'],
  },
  topHourglass: {
    label: 'Top Hourglass',
    description: 'You have an hourglass shape with a slightly fuller bust - a defined waist still balances you, and necklines matter more than most.',
    highlight: ['waist', 'legs'],
    downplay: ['bust'],
    recommendedSilhouettes: ['V-necks and scoop necks', 'Fitted waistbands', 'Straight or bootcut bottoms'],
    categoryGuidance: {
      tops: ['V-neck and scoop-neck tops to elongate', 'Avoid high, tight necklines and horizontal chest stripes'],
      bottoms: ['Straight-leg or bootcut for balance below', 'High-rise to define the waist'],
      dresses: ['Empire or wrap dresses with a V-neck', 'Avoid high necklines paired with a fitted bodice'],
      shoes: ['Any heel height works - focus on keeping the leg line clean'],
      outerwear: ['Open-front blazers and cardigans that show the V of the neckline'],
    },
    matchKeywords: ['v-neck', 'scoop-neck', 'wrap', 'empire', 'straight-leg', 'bootcut'],
  },
  bottomHourglass: {
    label: 'Bottom Hourglass',
    description: 'You have an hourglass shape with slightly fuller hips - the waist is still your best asset, and structure on top brings balance.',
    highlight: ['waist', 'shoulders'],
    downplay: ['hips'],
    recommendedSilhouettes: ['Structured shoulders', 'A-line skirts', 'Fitted waistbands'],
    categoryGuidance: {
      tops: ['Structured shoulders and statement sleeves', 'Tuck or belt at the waist to keep it defined'],
      bottoms: ['A-line skirts and gently flared trousers', 'Avoid clingy fabric across the hip'],
      dresses: ['Fit-and-flare with a structured bodice'],
      shoes: ['Pointed-toe styles to lengthen the leg'],
      outerwear: ['Cropped jackets that hit above the widest point of the hip'],
    },
    matchKeywords: ['structured', 'a-line', 'belted', 'fit-and-flare', 'statement sleeve'],
  },
  pear: {
    label: 'Pear',
    description: 'Your hips are wider than your shoulders and bust - drawing the eye upward and adding structure on top creates balance.',
    highlight: ['shoulders', 'bust'],
    downplay: ['hips'],
    recommendedSilhouettes: ['Statement necklines', 'Structured shoulders', 'A-line skirts', 'Straight-leg trousers'],
    categoryGuidance: {
      tops: ['Boat necks and statement sleeves to widen the shoulder line', 'Bright colors or patterns up top'],
      bottoms: ['Straight-leg or bootcut in darker, matte fabrics', 'Avoid pockets, patterns, or shine at the hip'],
      dresses: ['Fit-and-flare with a detailed bodice and plain skirt'],
      shoes: ['Pointed-toe flats or heels to elongate the leg from the hip down'],
      outerwear: ['Structured shoulders, cropped at or above the hip'],
    },
    matchKeywords: ['boat-neck', 'structured-shoulder', 'statement-sleeve', 'straight-leg', 'a-line'],
  },
  invertedTriangle: {
    label: 'Inverted Triangle',
    description: 'Your shoulders and bust are broader than your hips - softening the shoulder line and adding volume below balances the frame.',
    highlight: ['legs', 'hips'],
    downplay: ['shoulders'],
    recommendedSilhouettes: ['V-necks', 'Wide-leg trousers', 'A-line skirts', 'Minimal shoulder detail'],
    categoryGuidance: {
      tops: ['V-necks and raglan sleeves to soften the shoulder', 'Avoid shoulder pads, halters, and boat necks'],
      bottoms: ['Wide-leg, flared, or patterned bottoms to add volume below', 'Front pockets and light washes work well'],
      dresses: ['A-line and fit-and-flare, plain on top and detailed below'],
      shoes: ['Ankle straps and lighter colors to draw the eye down'],
      outerwear: ['Single-breasted, minimal shoulder structure, hits at the hip'],
    },
    matchKeywords: ['v-neck', 'raglan', 'wide-leg', 'a-line', 'flared'],
  },
  rectangle: {
    label: 'Rectangle',
    description: 'Your shoulders, waist, and hips are similarly proportioned - creating the illusion of a waist adds shape and dimension.',
    highlight: ['waist'],
    downplay: [],
    recommendedSilhouettes: ['Belted styles', 'Peplum tops', 'Wrap dresses', 'Layering for dimension'],
    categoryGuidance: {
      tops: ['Peplum and wrap tops to create waist definition', 'Layer with a cropped jacket to add shape'],
      bottoms: ['High-rise with a visible waistband', 'Pair with a tucked-in top to break up the torso'],
      dresses: ['Belted or wrap dresses over straight sheaths'],
      shoes: ['Most styles work - use this as a place to add personality'],
      outerwear: ['Belted trenches and peplum-hem jackets'],
    },
    matchKeywords: ['peplum', 'wrap', 'belted', 'high-rise', 'cropped-jacket'],
  },
  apple: {
    label: 'Apple',
    description: 'You carry more fullness through the midsection with slimmer legs - drawing the eye to your neckline and legs creates balance.',
    highlight: ['neckline', 'legs'],
    downplay: ['midsection'],
    recommendedSilhouettes: ['Empire waists', 'V-necks', 'A-line dresses', 'Straight-leg trousers'],
    categoryGuidance: {
      tops: ['Empire-waist and A-line tops that skim rather than cling', 'V-necks to lengthen the torso'],
      bottoms: ['Straight-leg trousers in your best color', 'A comfortable, non-cinching waistband'],
      dresses: ['Empire-waist dresses that flow from just under the bust'],
      shoes: ['Any style - lean into this as a place to show off proportion'],
      outerwear: ['Open, unstructured layers that skim over the midsection'],
    },
    matchKeywords: ['empire', 'a-line', 'v-neck', 'straight-leg', 'flowy'],
  },
  diamond: {
    label: 'Diamond',
    description: 'Your shoulders and hips are narrower than your midsection - definition through the shoulder and hem draws the frame outward at both ends.',
    highlight: ['shoulders', 'legs'],
    downplay: ['midsection'],
    recommendedSilhouettes: ['Structured shoulders', 'A-line skirts', 'Empire waists', 'Open necklines'],
    categoryGuidance: {
      tops: ['Structured shoulders and open necklines', 'Avoid tight fabric bunching at the waist'],
      bottoms: ['A-line skirts and slightly flared trousers'],
      dresses: ['Empire-waist with a structured shoulder'],
      shoes: ['Pointed-toe styles to lengthen the leg line'],
      outerwear: ['Single-breasted with a defined shoulder, worn open rather than belted'],
    },
    matchKeywords: ['structured-shoulder', 'a-line', 'empire', 'open-neckline', 'flared'],
  },

  // ---- Menswear frames ----
  mTrapezoid: {
    label: 'Trapezoid',
    description: 'Shoulders broader than the waist with an even taper - the frame most cuts are drafted for, so fit precision is your whole game.',
    highlight: ['shoulders', 'chest'],
    downplay: [],
    recommendedSilhouettes: ['Tailored through the body', 'Straight and slim-straight legs', 'Unstructured blazers', 'Crew and polo collars'],
    categoryGuidance: {
      tops: ['Tailored and slim-straight cuts that follow the taper', 'Avoid extreme oversizing that erases the frame'],
      bottoms: ['Straight or slim-straight legs with a mid rise', 'Most cuts work - fit at the seat and break decide it'],
      dresses: [],
      shoes: ['Almost anything - let formality, not correction, choose the shoe'],
      outerwear: ['Unstructured blazers and clean overcoats that sit on the shoulder line'],
    },
    matchKeywords: ['tailored', 'slim-straight', 'straight-leg', 'unstructured', 'crewneck'],
  },
  mRectangle: {
    label: 'Straight',
    description: 'Shoulders, chest and waist run close to the same width - structure up top and layering add the taper the frame does not supply.',
    highlight: ['shoulders'],
    downplay: [],
    recommendedSilhouettes: ['Structured shoulders', 'Layered tops', 'Straight legs', 'Horizontal detail at the chest'],
    categoryGuidance: {
      tops: ['Structured shoulders, chest pockets and layering to build the upper frame', 'Avoid long unbroken columns of one colour'],
      bottoms: ['Straight legs; a slight taper reads as shape'],
      dresses: [],
      shoes: ['A slightly substantial shoe balances the added structure up top'],
      outerwear: ['Shoulder-structured jackets, trucker and chore shapes, filled gilets'],
    },
    matchKeywords: ['structured', 'layered', 'chest-pocket', 'trucker', 'chore'],
  },
  mTriangle: {
    label: 'Triangle',
    description: 'Waist and hips carry more than the shoulders - visual weight moved upward brings the frame into balance.',
    highlight: ['shoulders', 'chest'],
    downplay: ['midsection'],
    recommendedSilhouettes: ['Structured shoulders', 'Vertical patterns', 'Straight legs', 'Open collars'],
    categoryGuidance: {
      tops: ['Structured shoulders, spread collars and vertical stripes', 'Darker, matte fabrics below the chest'],
      bottoms: ['Straight legs with a clean drape - avoid tapering too hard at the ankle'],
      dresses: [],
      shoes: ['A fuller shoe grounds the silhouette'],
      outerwear: ['Shoulder-built jackets worn open, single-breasted coats'],
    },
    matchKeywords: ['structured', 'vertical-stripe', 'straight-leg', 'spread-collar', 'single-breasted'],
  },
  mOval: {
    label: 'Oval',
    description: 'The midsection is the fullest point - long clean lines and one-colour columns lengthen the whole frame.',
    highlight: ['shoulders', 'legs'],
    downplay: ['midsection'],
    recommendedSilhouettes: ['Vertical lines', 'Single-breasted layers', 'Straight legs', 'V-necks and open collars'],
    categoryGuidance: {
      tops: ['V-necks, open collars and vertical detail to lengthen', 'Skim, never cling - and never billow'],
      bottoms: ['Straight legs with a comfortable, non-cinching waistband', 'Flat fronts over pleats'],
      dresses: [],
      shoes: ['Substantial soles balance the frame top to bottom'],
      outerwear: ['Long single-breasted coats worn open create the vertical line'],
    },
    matchKeywords: ['v-neck', 'single-breasted', 'straight-leg', 'flat-front', 'longline'],
  },
  mInvertedTriangle: {
    label: 'Inverted Triangle',
    description: 'Shoulders and chest dominate a narrow waist and hips - adding visual weight below keeps the frame from top-heaviness.',
    highlight: ['chest'],
    downplay: [],
    recommendedSilhouettes: ['Straight and relaxed legs', 'Minimal shoulder structure', 'Textured bottoms'],
    categoryGuidance: {
      tops: ['Softer shoulders and raglan sleeves - the frame supplies its own structure', 'Avoid extra chest padding or tight stretch fits'],
      bottoms: ['Straight to relaxed legs with texture or lighter washes to add weight below'],
      dresses: [],
      shoes: ['Fuller shoes - chunky soles, boots - anchor the silhouette'],
      outerwear: ['Unstructured, raglan and bomber shapes over padded shoulders'],
    },
    matchKeywords: ['raglan', 'relaxed', 'straight-leg', 'unstructured', 'bomber'],
  },
};

/**
 * Deterministic, on-device body type classification from four quick
 * proportion comparisons - no photo or network call required, and no
 * dependency on AI accuracy for the primary result (photo analysis is an
 * optional refinement layered on top - see analyzeBodyType Cloud Function).
 */
export function classifyBodyTypeFromQuiz(answers: {
  shouldersVsHips: 'narrower' | 'similar' | 'wider';
  waistDefinition: 'defined' | 'somewhat' | 'minimal';
  bustVsHip: 'bustFuller' | 'hipFuller' | 'balanced';
  fullestArea: 'shoulders' | 'bust' | 'waist' | 'hips' | 'balanced';
}): BodyType {
  const { shouldersVsHips, waistDefinition, bustVsHip, fullestArea } = answers;

  if (fullestArea === 'waist') {
    return shouldersVsHips === 'similar' && waistDefinition === 'minimal' ? 'diamond' : 'apple';
  }
  if (waistDefinition === 'defined') {
    if (bustVsHip === 'bustFuller') return 'topHourglass';
    if (bustVsHip === 'hipFuller') return 'bottomHourglass';
    return 'hourglass';
  }
  if (shouldersVsHips === 'wider') return 'invertedTriangle';
  if (shouldersVsHips === 'narrower') return 'pear';
  return 'rectangle';
}

/**
 * Builds a full BodyAnalysisResult from a classified body type, using the
 * static guide content. Used by both the quiz flow and as a fallback when
 * an AI photo estimate is missing fields.
 */
export function buildBodyAnalysisResult(
  bodyType: BodyType,
  source: 'quiz' | 'photo',
  sourceImageUrl?: string
): BodyAnalysisResult {
  const guide = BODY_TYPE_GUIDES[bodyType];
  return {
    bodyType,
    description: guide.description,
    highlight: guide.highlight,
    downplay: guide.downplay,
    recommendedSilhouettes: guide.recommendedSilhouettes,
    categoryGuidance: guide.categoryGuidance,
    source,
    analyzedAt: new Date().toISOString(),
    sourceImageUrl,
  };
}

/**
 * Wardrobe Fit Check - cross-references BODY_TYPE_GUIDES.matchKeywords against
 * the user's real closet items (tags, subcategory, notes), instead of only
 * offering generic silhouette advice divorced from what they actually own.
 * Purely client-side heuristic matching - no AI call, instant, free.
 */
export interface WardrobeFitMatch {
  itemId: string;
  matchedKeywords: string[];
}

export function wardrobeFitCheck(
  bodyType: BodyType,
  closetItems: Array<{
    id: string;
    category?: string;
    subcategory?: string;
    tags?: string[];
    notes?: string | null;
    neckline?: string;
    sleeveLength?: string;
    fitType?: string;
  }>
): { matches: WardrobeFitMatch[]; gapCategories: string[] } {
  const keywords = BODY_TYPE_GUIDES[bodyType].matchKeywords;
  const matches: WardrobeFitMatch[] = [];
  const matchedCategories = new Set<string>();

  for (const item of closetItems) {
    const haystack = [
      item.subcategory || '',
      item.neckline || '',
      item.sleeveLength || '',
      item.fitType || '',
      ...(item.tags || []),
      item.notes || '',
    ].join(' ').toLowerCase();

    const matchedKeywords = keywords.filter(kw => haystack.includes(kw.toLowerCase()));
    if (matchedKeywords.length > 0) {
      matches.push({ itemId: item.id, matchedKeywords });
      if (item.category) matchedCategories.add(item.category);
    }
  }

  const coreCategories = ['tops', 'bottoms', 'dresses'];
  const gapCategories = coreCategories.filter(c => !matchedCategories.has(c));

  return { matches, gapCategories };
}

export interface PersonalStyleProfile {
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

  /**
   * Whose wardrobe this is - womenswear, menswear, or both. Optional so
   * profiles that predate the question stay valid; absent reads as 'all'.
   */
  wardrobeFocus?: WardrobeFocus;

  /**
   * AI-powered personal color analysis (selfie -> seasonal color type + palette).
   * Optional: absent until the user completes the Personal Color Analysis flow.
   */
  colorAnalysis?: ColorAnalysisResult;

  /**
   * Body/fit analysis (guided quiz or AI photo estimate).
   * Optional: absent until the user completes the Body & Fit Analysis flow.
   */
  bodyAnalysis?: BodyAnalysisResult;
}

/**
 * Extended Personal Style Profile with metadata
 */
export interface UserPersonalStyleProfile extends PersonalStyleProfile {
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
 * Default Personal Style Profile for new users
 */
export const DEFAULT_PERSONAL_STYLE_PROFILE: PersonalStyleProfile = {
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
 * Validates a complete PersonalStyleProfile object
 */
export function validatePersonalStyleProfile(styleProfile: PersonalStyleProfile): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate lifestyle weights
  if (!validateLifestyleWeights(styleProfile.lifestyleWeights)) {
    errors.push('Lifestyle weights must sum to 1.0');
  }

  // Validate style archetypes
  if (!styleProfile.styleArchetypes || styleProfile.styleArchetypes.length === 0) {
    errors.push('At least one style archetype is required');
  }

  // Validate color profile - at least one primary color required
  if (!styleProfile.colorProfile.primary || styleProfile.colorProfile.primary.length === 0) {
    errors.push('At least one primary color is required');
  }

  // Validate guidance level
  if (!['inspiration', 'guided', 'directive'].includes(styleProfile.guidanceLevel)) {
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
export function validateLifestyleWeights(weights: PersonalStyleProfile['lifestyleWeights']): boolean {
  const sum = weights.work + weights.casual + weights.social + weights.travel;
  return Math.abs(sum - 1.0) < 0.01; // Allow small floating point errors
}

/**
 * Normalizes lifestyle weights to sum to 1.0
 */
export function normalizeLifestyleWeights(
  weights: PersonalStyleProfile['lifestyleWeights']
): PersonalStyleProfile['lifestyleWeights'] {
  const sum = weights.work + weights.casual + weights.social + weights.travel;

  if (sum === 0) {
    return DEFAULT_PERSONAL_STYLE_PROFILE.lifestyleWeights;
  }

  return {
    work: weights.work / sum,
    casual: weights.casual / sum,
    social: weights.social / sum,
    travel: weights.travel / sum,
  };
}

/**
 * Calculates a style compatibility score between two Style Profiles (0-1)
 */
export function calculateStyleCompatibility(profile1: PersonalStyleProfile, profile2: PersonalStyleProfile): number {
  let score = 0;
  let factors = 0;

  // Compare style archetypes (40% weight)
  const sharedArchetypes = profile1.styleArchetypes.filter(a =>
    profile2.styleArchetypes.includes(a)
  );
  score += (sharedArchetypes.length / Math.max(profile1.styleArchetypes.length, profile2.styleArchetypes.length)) * 0.4;
  factors += 0.4;

  // Compare primary colors (30% weight)
  const sharedColors = profile1.colorProfile.primary.filter(c =>
    profile2.colorProfile.primary.includes(c)
  );
  score += (sharedColors.length / Math.max(profile1.colorProfile.primary.length, profile2.colorProfile.primary.length)) * 0.3;
  factors += 0.3;

  // Compare lifestyle weights (30% weight)
  const lifestyleDiff =
    Math.abs(profile1.lifestyleWeights.work - profile2.lifestyleWeights.work) +
    Math.abs(profile1.lifestyleWeights.casual - profile2.lifestyleWeights.casual) +
    Math.abs(profile1.lifestyleWeights.social - profile2.lifestyleWeights.social) +
    Math.abs(profile1.lifestyleWeights.travel - profile2.lifestyleWeights.travel);

  score += (1 - (lifestyleDiff / 4)) * 0.3;
  factors += 0.3;

  return score / factors;
}

/**
 * Determines if an item matches the user's Personal Style Profile
 */
export function matchesPersonalStyleProfile(
  itemTags: string[],
  itemColors: string[],
  styleProfile: PersonalStyleProfile
): {
  matches: boolean;
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // Check avoid rules (automatic rejection)
  const hasAvoidedStyle = itemTags.some(tag =>
    styleProfile.avoidRules.some(rule => tag.toLowerCase().includes(rule.toLowerCase()))
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
    styleProfile.styleArchetypes.some(archetype =>
      tag.toLowerCase().includes(archetype.toLowerCase())
    )
  );

  if (matchingArchetypes.length > 0) {
    score += 0.4;
    reasons.push(`Matches ${matchingArchetypes.join(", ")} style`);
  }

  // Check color profile
  const matchingColors = itemColors.filter(color =>
    styleProfile.colorProfile.primary.includes(color.toLowerCase()) ||
    styleProfile.colorProfile.secondary.includes(color.toLowerCase())
  );

  if (matchingColors.length > 0) {
    score += 0.3;
    reasons.push(`Matches preferred colors: ${matchingColors.join(", ")}`);
  }

  // Stretch colors get a small bonus
  const stretchColors = itemColors.filter(color =>
    styleProfile.colorProfile.stretch.includes(color.toLowerCase())
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
 * Creates a new User Personal Style Profile with metadata
 */
export function createUserPersonalStyleProfile(
  userId: string,
  styleProfile: Partial<PersonalStyleProfile> = {}
): UserPersonalStyleProfile {
  const now = new Date().toISOString();

  return {
    ...DEFAULT_PERSONAL_STYLE_PROFILE,
    ...styleProfile,
    userId,
    createdAt: now,
    updatedAt: now,
    version: 1,
    isComplete: false,
  };
}

/**
 * Updates an existing User Personal Style Profile
 */
export function updateUserPersonalStyleProfile(
  existing: UserPersonalStyleProfile,
  updates: Partial<PersonalStyleProfile>
): UserPersonalStyleProfile {
  return {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  };
}

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';
import OpenAI, { toFile } from 'openai';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: functions.config().openai.key,
});

// ==================== AI CLASSIFICATION ====================

export const classifyGarmentImage = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      // Allow unauthenticated calls for testing
      // TODO: Add authentication check in production
      
      const { imageUrl } = data;

      if (!imageUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'imageUrl is required');
      }

      console.log('Classifying garment image:', imageUrl);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this clothing item and provide detailed attributes in JSON format. Return ONLY valid JSON with these fields:
{
  "category": "tops|bottoms|dresses|outerwear|shoes|accessories",
  "subcategory": "specific type (e.g., blouse, jeans, sneakers)",
  "color": "primary color",
  "secondaryColors": ["array", "of", "additional", "colors"],
  "pattern": "solid|striped|floral|plaid|etc",
  "neckline": "crew|v-neck|scoop|etc (if applicable)",
  "sleeveLength": "short|long|3/4|sleeveless (if applicable)",
  "fitType": "fitted|relaxed|oversized",
  "fabricTexture": "cotton|silk|denim|etc",
  "style": "casual|formal|sporty|etc",
  "seasons": ["spring", "summer", "fall", "winter"],
  "tags": ["descriptive", "tags"]
}`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      let content = response.choices[0]?.message?.content || '{}';

      // Strip markdown code fences if present
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const classification = JSON.parse(content);

      console.log('Classification result:', classification);

      return {
        success: true,
        data: classification,
      };
    } catch (error: any) {
      console.error('Error classifying image:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== PERSONAL COLOR ANALYSIS ====================

const COLOR_SEASONS = [
  'Bright Spring', 'True Spring', 'Light Spring',
  'Light Summer', 'True Summer', 'Soft Summer',
  'Soft Autumn', 'True Autumn', 'Deep Autumn',
  'Deep Winter', 'True Winter', 'Bright Winter',
];

export const analyzeColorSeason = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const { imageUrl } = data;

      if (!imageUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'imageUrl is required');
      }

      console.log('Analyzing color season for:', imageUrl);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a professional color analyst performing seasonal color analysis (the "12-season" method) from a selfie. Assess skin undertone, apparent contrast, and complexion depth from the photo, then return ONLY valid JSON with this exact shape:
{
  "season": "one of: ${COLOR_SEASONS.join(' | ')}",
  "undertone": "warm" | "cool" | "neutral",
  "description": "2-3 sentence warm, affirming explanation of why this season fits, describing the person's coloring in positive terms - never clinical or negative",
  "palette": [ { "name": "descriptive color name e.g. Warm Ivory", "hex": "#RRGGBB" }, ... 8 to 10 recommended colors that flatter this season ],
  "colorsToAvoid": [ { "name": "descriptive color name", "hex": "#RRGGBB" }, ... 3 to 5 colors that clash with this season's undertone ]
}
If the photo doesn't clearly show a face (no face visible, too dark, obstructed), instead return: {"error": "no_face_detected"}.
Never use the word "flattering" - describe specifically what a color does (e.g. "brightens your complexion", "balances your undertone").`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);

      if (result.error === 'no_face_detected') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'No clear face was detected in the photo. Please try again with a well-lit, front-facing selfie.'
        );
      }

      if (!result.season || !COLOR_SEASONS.includes(result.season)) {
        throw new functions.https.HttpsError('internal', 'Color analysis did not return a valid season.');
      }

      const analysis = {
        season: result.season,
        undertone: result.undertone || 'neutral',
        description: result.description || '',
        palette: Array.isArray(result.palette) ? result.palette : [],
        colorsToAvoid: Array.isArray(result.colorsToAvoid) ? result.colorsToAvoid : [],
        analyzedAt: new Date().toISOString(),
        sourceImageUrl: imageUrl,
      };

      console.log('Color analysis result:', analysis.season, analysis.undertone);

      return {
        success: true,
        data: analysis,
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error analyzing color season:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== BODY & FIT ANALYSIS ====================

const BODY_TYPES = [
  'hourglass', 'topHourglass', 'bottomHourglass',
  'pear', 'invertedTriangle', 'rectangle', 'apple', 'diamond',
];

export const analyzeBodyType = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const { imageUrl, quizBodyType } = data;

      if (!imageUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'imageUrl is required');
      }

      console.log('Analyzing body type for:', imageUrl, quizBodyType ? `(quiz said: ${quizBodyType})` : '');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a professional image consultant estimating body/silhouette type from a single full-length photo. Assess shoulder width, waist definition, and hip width relative to each other. Return ONLY valid JSON with this exact shape:
{
  "bodyType": "one of: ${BODY_TYPES.join(' | ')}",
  "confidence": "high" | "medium" | "low",
  "reasoning": "1-2 sentence factual explanation of the proportions you observed (shoulders vs hips, waist definition) - never comment on weight, size, or attractiveness"
}
${quizBodyType ? `The user already completed a quick proportion quiz and it classified them as "${quizBodyType}". Give your own independent read from the photo - do not simply confirm their quiz answer. If your photo-based read disagrees, that's useful information, not an error.` : ''}
If the photo doesn't clearly show a full standing figure (cropped, seated, too dark, obstructed), instead return: {"error": "no_figure_detected"}.`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 400,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);

      if (result.error === 'no_figure_detected') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'We couldn\'t clearly see a full standing figure in that photo. Please try again with a full-length, front-facing photo.'
        );
      }

      if (!result.bodyType || !BODY_TYPES.includes(result.bodyType)) {
        throw new functions.https.HttpsError('internal', 'Body analysis did not return a valid body type.');
      }

      const agreesWithQuiz = quizBodyType ? result.bodyType === quizBodyType : null;

      console.log('Body analysis result:', result.bodyType, result.confidence, 'agreesWithQuiz:', agreesWithQuiz);

      return {
        success: true,
        data: {
          bodyType: result.bodyType,
          confidence: result.confidence || 'medium',
          reasoning: result.reasoning || '',
          agreesWithQuiz,
        },
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error analyzing body type:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== IN-STORE SNAP-TO-CHECK ====================

interface StoreCheckProfileContext {
  colorSeason?: string;
  recommendedColors?: string[];
  colorsToAvoid?: string[];
  bodyType?: string;
  bodyHighlight?: string[];
  bodyDownplay?: string[];
  bodyRecommendedSilhouettes?: string[];
  styleArchetypes?: string[];
  avoidRules?: string[];
}

export const analyzeStoreItem = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const { imageUrl, profile }: { imageUrl: string; profile?: StoreCheckProfileContext } = data;

      if (!imageUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'imageUrl is required');
      }

      console.log('Analyzing store item for:', imageUrl);

      const profileLines: string[] = [];
      if (profile?.colorSeason) {
        profileLines.push(`Their color season: ${profile.colorSeason}.`);
        if (profile.recommendedColors && profile.recommendedColors.length > 0) {
          profileLines.push(`Colors that work for them: ${profile.recommendedColors.join(', ')}.`);
        }
        if (profile.colorsToAvoid && profile.colorsToAvoid.length > 0) {
          profileLines.push(`Colors to avoid: ${profile.colorsToAvoid.join(', ')}.`);
        }
      }
      if (profile?.bodyType) {
        profileLines.push(`Their body/fit type: ${profile.bodyType}.`);
        if (profile.bodyRecommendedSilhouettes && profile.bodyRecommendedSilhouettes.length > 0) {
          profileLines.push(`Silhouettes that work for them: ${profile.bodyRecommendedSilhouettes.join(', ')}.`);
        }
        if (profile.bodyHighlight && profile.bodyHighlight.length > 0) {
          profileLines.push(`They like to highlight: ${profile.bodyHighlight.join(', ')}.`);
        }
        if (profile.bodyDownplay && profile.bodyDownplay.length > 0) {
          profileLines.push(`They prefer to downplay: ${profile.bodyDownplay.join(', ')}.`);
        }
      }
      if (profile?.styleArchetypes && profile.styleArchetypes.length > 0) {
        profileLines.push(`Their style archetypes: ${profile.styleArchetypes.join(', ')}.`);
      }
      if (profile?.avoidRules && profile.avoidRules.length > 0) {
        profileLines.push(`HARD CONSTRAINT - they want to avoid: ${profile.avoidRules.join(', ')}.`);
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a fashion consultant helping someone decide whether to buy an item they're looking at in a store, from a single photo. First classify the item, then judge it against their personal profile below (skip any dimension they haven't completed - mark it as unknown, don't guess).

${profileLines.length > 0 ? `Their profile:\n${profileLines.join('\n')}\n` : 'They have not completed a color, body, or style profile yet - judge color/fit/style verdicts as unknown (matches: null) and rely on overallReasoning for general observations only.'}

Return ONLY valid JSON with this exact shape:
{
  "classification": { "category": "tops|bottoms|dresses|outerwear|shoes|accessories", "subcategory": "specific type", "color": "primary color", "pattern": "solid|striped|floral|etc", "style": "casual|formal|sporty|etc" },
  "colorVerdict": { "matches": true|false|null, "reasoning": "1 sentence" },
  "fitVerdict": { "matches": true|false|null, "reasoning": "1 sentence" },
  "styleVerdict": { "matches": true|false|null, "reasoning": "1 sentence" },
  "overallVerdict": "buy" | "maybe" | "skip",
  "overallReasoning": "1-2 sentence summary, warm and direct, never clinical"
}
"skip" only for a genuine HARD CONSTRAINT violation or a clear multi-dimension mismatch - default to "buy" or "maybe" when profile data is limited or the item is reasonably versatile.`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 600,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);

      if (!result.classification || !result.overallVerdict) {
        throw new functions.https.HttpsError('internal', 'Store item analysis did not return a valid result.');
      }

      console.log('Store check result:', result.classification?.category, result.overallVerdict);

      return {
        success: true,
        data: {
          classification: result.classification,
          colorVerdict: result.colorVerdict || { matches: null, reasoning: '' },
          fitVerdict: result.fitVerdict || { matches: null, reasoning: '' },
          styleVerdict: result.styleVerdict || { matches: null, reasoning: '' },
          overallVerdict: result.overallVerdict,
          overallReasoning: result.overallReasoning || '',
          analyzedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error analyzing store item:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== IMAGE EMBEDDINGS ====================
// Using OpenAI's text embeddings on image descriptions for similarity
// This is lighter than CLIP and works well for Cloud Functions

async function generateImageDescription(imageUrl: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this clothing item in detail for similarity matching. Include: style, color, pattern, fabric, fit, and overall aesthetic. Be concise but descriptive.',
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content || '';
}

export const generateImageEmbedding = functions
  .runWith({ memory: '512MB', timeoutSeconds: 60, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const { imageUrl } = data;

      if (!imageUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'imageUrl is required');
      }

      console.log('Generating embedding for:', imageUrl);

      // Generate description of the image
      const description = await generateImageDescription(imageUrl);
      console.log('Generated description:', description);

      // Generate embedding from description
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: description,
      });

      const embedding = embeddingResponse.data[0].embedding;
      console.log('Generated embedding, length:', embedding.length);

      return {
        success: true,
        embedding,
      };
    } catch (error: any) {
      console.error('Error generating embedding:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== FIND SIMILAR ITEMS ====================

function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimensions');
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    const val1 = embedding1[i];
    const val2 = embedding2[i];
    if (val1 !== undefined && val2 !== undefined) {
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    }
  }
  
  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  
  if (magnitude === 0) {
    return 0;
  }
  
  return dotProduct / magnitude;
}

/**
 * Similarity, scored on the attributes the classifier already extracted.
 *
 * The previous implementation ranked purely on cosine distance between
 * `text-embedding-3-small` vectors built from a free-prose description of each
 * garment. That does not work here, for two reasons:
 *
 *   1. Every description comes from the same prompt template, so the vectors
 *      share a large amount of boilerplate and cluster tightly - unrelated
 *      garments routinely score 0.75-0.90 against each other. A 0.7 floor
 *      filtered almost nothing, and the ordering inside that band was mostly
 *      noise.
 *   2. Prose compresses away exactly the facets that decide whether two
 *      garments are alike. "A relaxed navy cotton crew-neck" and "a fitted
 *      cream linen v-neck blouse" read as similar text and are not similar
 *      clothes.
 *
 * Meanwhile classifyGarmentImage already stores category, subcategory,
 * colour, pattern, neckline, sleeve length, fit, fabric, style, seasons and
 * tags on every item - precise, discrete, and completely unused by the old
 * search. This scores on those, keeps the embedding as one modest signal for
 * tie-breaking, and returns the reasons so the UI can say why.
 */

const COLOR_FAMILIES: Record<string, string[]> = {
  neutral: ['black', 'white', 'grey', 'gray', 'ivory', 'cream', 'beige', 'tan', 'stone', 'charcoal', 'camel', 'khaki'],
  blue: ['blue', 'navy', 'denim', 'indigo', 'cobalt', 'teal', 'turquoise', 'aqua'],
  red: ['red', 'burgundy', 'maroon', 'crimson', 'wine'],
  pink: ['pink', 'blush', 'rose', 'fuchsia', 'magenta'],
  green: ['green', 'olive', 'sage', 'emerald', 'forest', 'mint'],
  brown: ['brown', 'chocolate', 'rust', 'terracotta', 'coffee'],
  yellow: ['yellow', 'mustard', 'gold', 'lemon'],
  orange: ['orange', 'coral', 'peach', 'apricot'],
  purple: ['purple', 'lilac', 'lavender', 'plum', 'violet'],
};

function colorFamily(color?: string): string | null {
  const c = (color || '').toLowerCase().trim();
  if (!c) return null;
  for (const [family, members] of Object.entries(COLOR_FAMILIES)) {
    if (members.some(m => c.includes(m))) return family;
  }
  return null;
}

function sameText(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a.toLowerCase().trim() === b.toLowerCase().trim();
}

interface FacetScore {
  score: number;
  max: number;
  reasons: string[];
}

/**
 * Weighted facet comparison. Weights reflect how much each attribute actually
 * tells you two garments are alike: subcategory and colour dominate, brand and
 * season are tiebreakers.
 *
 * `max` accumulates only the facets both items actually have, so an item with
 * sparse metadata is not penalised for fields nobody filled in.
 */
function scoreFacets(target: any, candidate: any): FacetScore {
  let score = 0;
  let max = 0;
  const reasons: string[] = [];

  const consider = (weight: number, bothPresent: boolean, matched: boolean, reason?: string) => {
    if (!bothPresent) return;
    max += weight;
    if (matched) {
      score += weight;
      if (reason) reasons.push(reason);
    }
  };

  consider(
    22,
    !!(target.subcategory && candidate.subcategory),
    sameText(target.subcategory, candidate.subcategory),
    candidate.subcategory ? `Also a ${String(candidate.subcategory).toLowerCase()}` : undefined
  );

  // Colour scores in two tiers: the same colour is a strong signal, the same
  // family is a weaker one.
  const tFam = colorFamily(target.color);
  const cFam = colorFamily(candidate.color);
  if (target.color && candidate.color) {
    max += 18;
    if (sameText(target.color, candidate.color)) {
      score += 18;
      reasons.push(`Same ${String(candidate.color).toLowerCase()}`);
    } else if (tFam && cFam && tFam === cFam) {
      score += 9;
      reasons.push(`Both in the ${tFam} family`);
    }
  }

  consider(
    12,
    !!(target.pattern && candidate.pattern),
    sameText(target.pattern, candidate.pattern),
    candidate.pattern && String(candidate.pattern).toLowerCase() !== 'solid'
      ? `Both ${String(candidate.pattern).toLowerCase()}`
      : 'Both solid'
  );

  consider(
    10,
    !!(target.style && candidate.style),
    sameText(target.style, candidate.style),
    candidate.style ? `Same ${String(candidate.style).toLowerCase()} feel` : undefined
  );

  consider(
    10,
    !!(target.fabricTexture && candidate.fabricTexture),
    sameText(target.fabricTexture, candidate.fabricTexture),
    candidate.fabricTexture ? `Both ${String(candidate.fabricTexture).toLowerCase()}` : undefined
  );

  consider(
    8,
    !!(target.fitType && candidate.fitType),
    sameText(target.fitType, candidate.fitType),
    candidate.fitType ? `Same ${String(candidate.fitType).toLowerCase()} fit` : undefined
  );

  consider(
    6,
    !!(target.neckline && candidate.neckline),
    sameText(target.neckline, candidate.neckline),
    candidate.neckline ? `Same ${String(candidate.neckline).toLowerCase()} neckline` : undefined
  );

  consider(
    6,
    !!(target.sleeveLength && candidate.sleeveLength),
    sameText(target.sleeveLength, candidate.sleeveLength),
    undefined
  );

  consider(
    4,
    !!(target.brand && candidate.brand),
    sameText(target.brand, candidate.brand),
    candidate.brand ? `Also ${candidate.brand}` : undefined
  );

  // Season and tag overlap are proportional rather than all-or-nothing.
  const tSeasons: string[] = Array.isArray(target.seasons) ? target.seasons : [];
  const cSeasons: string[] = Array.isArray(candidate.seasons) ? candidate.seasons : [];
  if (tSeasons.length && cSeasons.length) {
    max += 5;
    const shared = cSeasons.filter(s => tSeasons.some(t => sameText(t, s)));
    if (shared.length) score += (shared.length / Math.max(tSeasons.length, cSeasons.length)) * 5;
  }

  const tTags: string[] = Array.isArray(target.tags) ? target.tags : [];
  const cTags: string[] = Array.isArray(candidate.tags) ? candidate.tags : [];
  if (tTags.length && cTags.length) {
    max += 6;
    const shared = cTags.filter(s => tTags.some(t => sameText(t, s)));
    if (shared.length) {
      score += Math.min(1, shared.length / 3) * 6;
      if (shared.length >= 2) reasons.push(`Shares ${shared.slice(0, 2).join(' and ')}`);
    }
  }

  return { score, max, reasons };
}

export const findSimilarItems = functions
  .runWith({ memory: '1GB', timeoutSeconds: 60, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const { itemId, userId, limit = 10, minSimilarity = 0.3 } = data;

      if (!itemId || !userId) {
        throw new functions.https.HttpsError('invalid-argument', 'itemId and userId are required');
      }

      const targetDoc = await db.collection('closetItems').doc(itemId).get();
      if (!targetDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Item not found');
      }

      const target = targetDoc.data() as any;
      const targetEmbedding: number[] | undefined = target?.embedding;

      const itemsSnapshot = await db
        .collection('closetItems')
        .where('userId', '==', userId)
        .get();

      const scored: any[] = [];

      itemsSnapshot.forEach(doc => {
        if (doc.id === itemId) return;
        const candidate = doc.data() as any;

        // Hard gate. "Similar" has to mean the same kind of garment - the old
        // version could rank a scarf against a shoe because their prose
        // descriptions happened to share adjectives.
        if (!sameText(target.category, candidate.category)) return;

        const facets = scoreFacets(target, candidate);
        // If neither item carries usable metadata there is nothing to compare
        // on; fall back to a neutral half-score rather than inventing one.
        const facetRatio = facets.max > 0 ? facets.score / facets.max : 0.5;

        // The embedding stays, at a modest weight, as a tiebreaker for things
        // the facets cannot express. Raw cosines here occupy roughly 0.7-0.95,
        // so rescale that band across 0-1 or it contributes almost nothing.
        let embeddingRatio: number | null = null;
        if (targetEmbedding?.length && candidate.embedding?.length === targetEmbedding.length) {
          const raw = cosineSimilarity(targetEmbedding, candidate.embedding);
          embeddingRatio = Math.max(0, Math.min(1, (raw - 0.7) / 0.25));
        }

        const similarity =
          embeddingRatio === null ? facetRatio : facetRatio * 0.85 + embeddingRatio * 0.15;

        if (similarity < minSimilarity) return;

        scored.push({
          item: { id: doc.id, ...candidate },
          similarity,
          // Strongest first, capped - three reasons is a row of text, ten is a
          // paragraph nobody reads.
          reasons: facets.reasons.slice(0, 3),
        });
      });

      scored.sort((a, b) => b.similarity - a.similarity);
      const limited = scored.slice(0, limit);

      console.log(
        `findSimilarItems: ${limited.length} of ${itemsSnapshot.size} items matched ${itemId} (category ${target.category})`
      );

      return {
        success: true,
        data: limited,
        count: limited.length,
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error finding similar items:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== AI STYLIST CHAT ====================

interface ClosetItemSummary {
  id: string;
  category?: string;
  color?: string;
  brand?: string;
  style?: string;
  seasons?: string[];
  wornCount?: number;
  daysSinceWorn?: number | null;
}

interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

interface WeatherContext {
  condition: string;
  temperature: number;
}

interface CategoryGuidanceContext {
  tops?: string[];
  bottoms?: string[];
  dresses?: string[];
  shoes?: string[];
  outerwear?: string[];
}

interface StyleProfileContext {
  styleArchetypes?: string[];
  avoidRules?: string[];
  preferredColors?: string[];
  stretchColors?: string[];
  guidanceLevel?: 'inspiration' | 'guided' | 'directive';
  fitHighlight?: string[];
  fitDownplay?: string[];
  // AI-derived color season analysis (selfie -> seasonal palette)
  colorSeason?: string;
  undertone?: 'warm' | 'cool' | 'neutral';
  seasonalPalette?: string[];
  colorsToAvoid?: string[];
  // AI/quiz-derived body & fit analysis
  bodyType?: string;
  bodyHighlight?: string[];
  bodyDownplay?: string[];
  recommendedSilhouettes?: string[];
  categoryGuidance?: CategoryGuidanceContext;
}

export const chatWithStylist = functions
  .runWith({ memory: '512MB', timeoutSeconds: 60, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const {
        message,
        history = [],
        closetItems = [],
        weather,
        occasion,
        mood,
        styleProfile,
        timeOfDay,
        dayType,
      }: {
        message: string;
        history: ChatHistoryEntry[];
        closetItems: ClosetItemSummary[];
        weather?: WeatherContext;
        occasion?: string;
        mood?: string;
        styleProfile?: StyleProfileContext;
        timeOfDay?: string;
        dayType?: string;
      } = data;

      if (!message) {
        throw new functions.https.HttpsError('invalid-argument', 'message is required');
      }

      // Summarize the user's closet so the model can reference real items by ID.
      // Include wornCount/daysSinceWorn so the model can favor underused or
      // not-recently-worn pieces for variety, and seasons for weather-appropriateness.
      const closetSummary = closetItems.length > 0
        ? closetItems
            .slice(0, 150)
            .map((item) => {
              const parts = [
                `id:${item.id}`,
                item.category || 'item',
                item.color || 'unknown color',
              ];
              if (item.brand) parts.push(item.brand);
              if (item.style) parts.push(`${item.style} style`);
              if (item.seasons && item.seasons.length > 0) parts.push(`seasons:${item.seasons.join('/')}`);
              parts.push(`worn ${item.wornCount ?? 0}x`);
              if (typeof item.daysSinceWorn === 'number') {
                parts.push(
                  item.daysSinceWorn <= 2
                    ? `worn ${item.daysSinceWorn}d ago (recent)`
                    : `last worn ${item.daysSinceWorn}d ago`
                );
              } else {
                parts.push('never worn');
              }
              return `- ${parts.join(' | ')}`;
            })
            .join('\n')
        : '(the user has no items in their closet yet)';

      const contextLines: string[] = [];
      if (occasion) contextLines.push(`Occasion: ${occasion}`);
      if (mood) contextLines.push(`User's mood/vibe today: ${mood}`);
      if (weather) contextLines.push(`Current weather: ${weather.condition}, ${weather.temperature}°F`);
      if (timeOfDay) contextLines.push(`Time of day: ${timeOfDay}`);
      if (dayType) contextLines.push(`Day: ${dayType}`);

      const styleProfileLines: string[] = [];
      if (styleProfile?.styleArchetypes && styleProfile.styleArchetypes.length > 0) {
        styleProfileLines.push(`Their style archetypes: ${styleProfile.styleArchetypes.join(', ')} - lean into these when choosing between options.`);
      }

      // AI-derived color season analysis is the authoritative color signal when present -
      // it's a real seasonal-color-analysis result, more precise than the hand-picked
      // go-to colors below, so state it first and have it take priority.
      if (styleProfile?.colorSeason) {
        const undertoneNote = styleProfile.undertone ? ` (${styleProfile.undertone} undertone)` : '';
        styleProfileLines.push(`Their AI color season analysis: ${styleProfile.colorSeason}${undertoneNote}. This is their authoritative color guidance - prioritize it over generic color preference below.`);
      }
      if (styleProfile?.seasonalPalette && styleProfile.seasonalPalette.length > 0) {
        styleProfileLines.push(`Colors that flatter their season: ${styleProfile.seasonalPalette.join(', ')} - strongly prefer these.`);
      }
      if (styleProfile?.colorsToAvoid && styleProfile.colorsToAvoid.length > 0) {
        styleProfileLines.push(`Colors that clash with their season: ${styleProfile.colorsToAvoid.join(', ')} - avoid recommending these unless nothing else in their closet works.`);
      }
      if (styleProfile?.preferredColors && styleProfile.preferredColors.length > 0) {
        styleProfileLines.push(`Their go-to colors: ${styleProfile.preferredColors.join(', ')} - prefer these when multiple items fit equally well${styleProfile.colorSeason ? ' and the color season guidance above doesn\'t decide it' : ''}.`);
      }
      if (styleProfile?.stretchColors && styleProfile.stretchColors.length > 0) {
        styleProfileLines.push(`Colors they're open to experimenting with: ${styleProfile.stretchColors.join(', ')} - occasionally suggest these to help them stretch, but don't force it.`);
      }
      if (styleProfile?.avoidRules && styleProfile.avoidRules.length > 0) {
        styleProfileLines.push(`HARD CONSTRAINT - they explicitly want to avoid: ${styleProfile.avoidRules.join(', ')}. Never recommend items/styles matching these.`);
      }

      // AI/quiz-derived body & fit analysis - concrete per-category silhouette guidance,
      // more actionable than the flat highlight/downplay list below.
      if (styleProfile?.bodyType) {
        styleProfileLines.push(`Their body type analysis: ${styleProfile.bodyType}. Use the silhouette and per-category guidance below to steer fit choices, not just color/style.`);
      }
      if (styleProfile?.recommendedSilhouettes && styleProfile.recommendedSilhouettes.length > 0) {
        styleProfileLines.push(`Silhouettes that work well for them: ${styleProfile.recommendedSilhouettes.join(', ')}.`);
      }
      if (styleProfile?.categoryGuidance) {
        const cg = styleProfile.categoryGuidance;
        const cgLines: string[] = [];
        if (cg.tops?.length) cgLines.push(`tops - ${cg.tops.join('; ')}`);
        if (cg.bottoms?.length) cgLines.push(`bottoms - ${cg.bottoms.join('; ')}`);
        if (cg.dresses?.length) cgLines.push(`dresses - ${cg.dresses.join('; ')}`);
        if (cg.shoes?.length) cgLines.push(`shoes - ${cg.shoes.join('; ')}`);
        if (cg.outerwear?.length) cgLines.push(`outerwear - ${cg.outerwear.join('; ')}`);
        if (cgLines.length > 0) {
          styleProfileLines.push(`Fit guidance by category:\n${cgLines.map(l => `  - ${l}`).join('\n')}`);
        }
      }
      if (styleProfile?.bodyHighlight && styleProfile.bodyHighlight.length > 0) {
        styleProfileLines.push(`They like to highlight: ${styleProfile.bodyHighlight.join(', ')}.`);
      } else if (styleProfile?.fitHighlight && styleProfile.fitHighlight.length > 0) {
        styleProfileLines.push(`They like to highlight: ${styleProfile.fitHighlight.join(', ')}.`);
      }
      if (styleProfile?.bodyDownplay && styleProfile.bodyDownplay.length > 0) {
        styleProfileLines.push(`They prefer to downplay: ${styleProfile.bodyDownplay.join(', ')}.`);
      } else if (styleProfile?.fitDownplay && styleProfile.fitDownplay.length > 0) {
        styleProfileLines.push(`They prefer to downplay: ${styleProfile.fitDownplay.join(', ')}.`);
      }

      const guidanceStyle = {
        inspiration: 'They prefer INSPIRATION over instruction: present 1-2 options and let them choose, keep it light and exploratory.',
        guided: 'They prefer GUIDED advice: give one clear recommendation with a brief explanation of why.',
        directive: 'They prefer DIRECTIVE advice: give one confident, specific pick with minimal hedging - tell them exactly what to wear.',
      }[styleProfile?.guidanceLevel || 'guided'];

      const systemPrompt = `You are a fast, sharp personal fashion stylist inside a wardrobe app called Styled. You know the user's real closet inventory below and give specific, confident outfit advice grounded in what they actually own - never generic platitudes.

${contextLines.length > 0 ? `Today's context:\n${contextLines.join('\n')}\n` : ''}
${styleProfileLines.length > 0 ? `What you know about their personal style (from their saved Style Profile):\n${styleProfileLines.join('\n')}\n` : ''}
Communication style: ${guidanceStyle}

The user's actual closet inventory (id | category | color | brand | style | seasons | wear count | recency):
${closetSummary}

Guidelines:
- When the user asks for an outfit, a recommendation, or what to wear, build a COMPLETE outfit: at minimum a top + bottom (or a dress) + shoes, and add outerwear if the weather is cold or rainy. Pick real items from the inventory above.
- Weigh weather: avoid short sleeves/sandals if cold or rainy; avoid heavy layers if hot.
- Weigh occasion formality: casual outings get relaxed pieces, work/formal gets polished pieces.
- Weigh mood if given: let it flavor the vibe (e.g. "confident" -> bolder pieces, "relaxed" -> comfort-first).
- Weigh time of day and day type: evenings/weekends can lean dressier-fun or more relaxed depending on occasion; weekday mornings favor practical, quick-to-wear pieces.
- If they have a color season analysis, use it as the primary color filter for picks - items in their flattering palette outrank items in their generic go-to colors, and items in their "colors to avoid" list should only be picked if nothing else in the relevant category works.
- If they have a body type / fit analysis, use the per-category fit guidance (necklines, cuts, silhouettes) to choose between otherwise-similar items, not just color or style-archetype fit.
- Respect their Style Profile above, especially any HARD CONSTRAINT avoid-list - never violate it.
- Favor items with a lower wear count AND items not worn in the last couple days, when multiple options fit equally well, so the user rotates their closet instead of repeating the same pieces or what they just wore.
- Briefly explain WHY the outfit works (1-2 short sentences covering the most relevant factors: weather/occasion/mood/color season/fit), don't just list items.
- Keep replies tight: under 100 words for outfit recommendations, under 60 for quick questions.

Respond with a JSON object shaped exactly like: {"reply": string, "itemIds": string[]}.
- "reply" is your conversational message to show the user. Refer to items by name only (e.g. "the camel coat", "your black boots") - NEVER include an item's id, database key, or any bracketed/parenthetical code in "reply", under any circumstance.
- "itemIds" is the ONLY place item ids belong: list every real closet item id you recommended in "reply" (from the inventory above only). Use an empty array if you didn't recommend specific owned items (e.g. general advice, greetings, shopping suggestions).`;

      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0]?.message?.content || '{}';
      let reply = "Sorry, I couldn't come up with a response. Please try again.";
      let itemIds: string[] = [];
      try {
        const parsed = JSON.parse(raw);
        reply = typeof parsed.reply === 'string' ? parsed.reply : reply;
        itemIds = Array.isArray(parsed.itemIds)
          ? parsed.itemIds.filter((id: any) => typeof id === 'string' && closetItems.some((item) => item.id === id))
          : [];
      } catch (parseError) {
        console.error('Failed to parse model JSON output:', raw, parseError);
      }

      return {
        success: true,
        reply,
        itemIds,
      };
    } catch (error: any) {
      console.error('Error in chatWithStylist:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== SHOP MY CLOSET ====================

export const shopMyCloset = functions
  .runWith({ memory: '512MB', timeoutSeconds: 120, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const { lookId, userId, limit = 10, minSimilarity = 0.6 } = data;

      if (!lookId || !userId) {
        throw new functions.https.HttpsError('invalid-argument', 'lookId and userId are required');
      }

      // Get look
      const lookDoc = await db.collection('looks').doc(lookId).get();
      if (!lookDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Look not found');
      }

      const look = lookDoc.data();
      let lookEmbedding = look?.embedding;

      // Generate embedding if doesn't exist
      if (!lookEmbedding || lookEmbedding.length === 0) {
        console.log('Generating embedding for look:', lookId);
        
        // Generate description and embedding
        const description = await generateImageDescription(look?.imageUrl);
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: description,
        });
        lookEmbedding = embeddingResponse.data[0].embedding;

        // Save embedding to look
        await db.collection('looks').doc(lookId).update({ embedding: lookEmbedding });
      }

      // Get all user's closet items
      const itemsSnapshot = await db
        .collection('closetItems')
        .where('userId', '==', userId)
        .get();

      const similarItems: any[] = [];

      itemsSnapshot.forEach((doc) => {
        const item = doc.data();
        const embedding = item.embedding;

        if (embedding && embedding.length > 0) {
          const similarity = cosineSimilarity(lookEmbedding, embedding);

          if (similarity >= minSimilarity) {
            similarItems.push({
              item: { id: doc.id, ...item },
              similarity,
            });
          }
        }
      });

      // Sort by similarity and limit
      similarItems.sort((a, b) => b.similarity - a.similarity);
      const limitedItems = similarItems.slice(0, limit);

      return {
        success: true,
        data: limitedItems,
        count: limitedItems.length,
        look: {
          id: lookDoc.id,
          title: look?.title,
          imageUrl: look?.imageUrl,
        },
      };
    } catch (error: any) {
      console.error('Error in shop my closet:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== STYLIST MARKETPLACE SEED ====================
// One-time (idempotent) seed of the stylists catalog into Firestore. Safe to
// call more than once - it upserts by fixed doc ID rather than appending.
// Not wired to any client button; invoke once via `firebase functions:shell`
// or a direct callable-function invocation after deploy.

const SEED_STYLISTS: Record<string, any> = {
  'stylist-1': {
    name: 'Emma Rodriguez',
    bio: 'Celebrity stylist with 10+ years of experience. Specializing in modern professional looks and sustainable fashion.',
    profileImageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    coverImageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea1c8e5d?w=800',
    specialties: ['Professional Styling', 'Sustainable Fashion', 'Color Analysis'],
    hourlyRate: 150,
    rating: 4.9,
    reviewCount: 127,
    availability: ['Mon', 'Tue', 'Wed', 'Thu'],
    yearsExperience: 12,
    certifications: ['Certified Image Consultant', 'Color Analysis Expert'],
    portfolio: [
      { id: 'p1', imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400', title: 'Executive Makeover', description: 'Complete wardrobe transformation for C-suite executive' },
      { id: 'p2', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400', title: 'Sustainable Capsule', description: '30-piece sustainable wardrobe' },
    ],
    sessionTypes: ['closet-audit', 'shopping-assistance', 'event-styling', 'wardrobe-planning'],
    languages: ['English', 'Spanish'],
    location: 'New York, NY',
    isVerified: true,
    responseTime: '< 2 hours',
  },
  'stylist-2': {
    name: 'Marcus Chen',
    bio: 'Fashion consultant specializing in minimalist wardrobes and personal branding for entrepreneurs.',
    profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    coverImageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
    specialties: ['Minimalist Style', 'Personal Branding', 'Capsule Wardrobes'],
    hourlyRate: 125,
    rating: 4.8,
    reviewCount: 89,
    availability: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    yearsExperience: 8,
    certifications: ['Personal Stylist Certification'],
    portfolio: [
      { id: 'p3', imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400', title: 'Minimalist Wardrobe', description: '20-piece capsule for tech entrepreneur' },
    ],
    sessionTypes: ['closet-audit', 'wardrobe-planning'],
    languages: ['English', 'Mandarin'],
    location: 'San Francisco, CA',
    isVerified: true,
    responseTime: '< 4 hours',
  },
  'stylist-3': {
    name: 'Sophia Laurent',
    bio: 'Luxury fashion stylist with expertise in high-end brands and red carpet events.',
    profileImageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    coverImageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
    specialties: ['Luxury Fashion', 'Event Styling', 'Red Carpet'],
    hourlyRate: 200,
    rating: 5.0,
    reviewCount: 64,
    availability: ['Mon', 'Wed', 'Fri'],
    yearsExperience: 15,
    certifications: ['Luxury Brand Specialist', 'Event Styling Pro'],
    portfolio: [
      { id: 'p4', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400', title: 'Gala Ready', description: 'Red carpet styling for charity gala' },
      { id: 'p5', imageUrl: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400', title: 'Luxury Wardrobe', description: 'High-end wardrobe curation' },
    ],
    sessionTypes: ['event-styling', 'shopping-assistance'],
    languages: ['English', 'French'],
    location: 'Los Angeles, CA',
    isVerified: true,
    responseTime: '< 1 hour',
  },
  'stylist-4': {
    name: 'Jordan Taylor',
    bio: 'Body-positive stylist helping clients feel confident at any size. Specializing in plus-size fashion.',
    profileImageUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400',
    coverImageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
    specialties: ['Plus Size Fashion', 'Body Positivity', 'Confidence Building'],
    hourlyRate: 100,
    rating: 4.9,
    reviewCount: 156,
    availability: ['Mon', 'Tue', 'Thu', 'Fri', 'Sat'],
    yearsExperience: 6,
    certifications: ['Body Positive Styling'],
    portfolio: [
      { id: 'p6', imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400', title: 'Confidence Boost', description: 'Complete style transformation' },
    ],
    sessionTypes: ['closet-audit', 'shopping-assistance', 'wardrobe-planning'],
    languages: ['English'],
    location: 'Chicago, IL',
    isVerified: true,
    responseTime: '< 3 hours',
  },
};

export const seedStylists = functions
  .runWith({ memory: '256MB', timeoutSeconds: 60, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    const batch = db.batch();
    for (const [id, stylist] of Object.entries(SEED_STYLISTS)) {
      batch.set(db.collection('stylists').doc(id), stylist, { merge: true });
    }
    await batch.commit();
    return { success: true, count: Object.keys(SEED_STYLISTS).length };
  });

// ==================== SHOPPING MARKETPLACE (SOVRN COMMERCE) ====================
//
// The client's affiliateNetwork.ts talks to these two functions ONLY once
// MARKETPLACE_PROVIDER is flipped to 'sovrn' there - until then the client
// uses a local mock catalog and never calls these. They exist now so the
// switchover is a config change, not a rebuild.
//
// To activate:
//   1. Create a Sovrn Commerce (https://www.sovrn.com/products/commerce/) or
//      Skimlinks account, get an API key + publisher/site ID.
//   2. firebase functions:config:set sovrn.key="..." sovrn.pubid="..."
//   3. Implement the two TODOs below against Sovrn's actual Product Search
//      and link-wrapping API (their exact request/response shape needs to be
//      pulled from their current API docs when you have real credentials -
//      intentionally not guessed here, since a wrong guess would silently
//      fail rather than error clearly).
//   4. firebase deploy --only functions:searchMarketplaceProducts,functions:wrapAffiliateLink
//   5. Flip MARKETPLACE_PROVIDER to 'sovrn' in src/services/affiliateNetwork.ts

function getSovrnConfig(): { key: string; pubId: string } | null {
  const cfg = functions.config().sovrn;
  // pubid is optional: Sovrn's link format authenticates on `key` alone. It is
  // still read so an existing config keeps working and so a publisher id can be
  // threaded through as `cuid` for attribution if you want it later.
  if (!cfg?.key) return null;
  return { key: cfg.key, pubId: cfg.pubid || '' };
}

const SOVRN_PRODUCTS_URL =
  'https://shopping-gallery.prd-commerce.sovrnservices.com/ai-orchestration/products';

/** Shape Sovrn's Product Recommendation endpoint documents for each product. */
interface SovrnProduct {
  id: number;
  name: string;
  imageURL?: string;
  thumbnailURL?: string;
  currency?: string;
  salePrice?: number;
  retailPrice?: number;
  discountRate?: number;
  inStock?: boolean;
  affiliatable?: boolean;
  deepLink?: string;
}

/**
 * Sovrn's endpoint is content-based, not keyword-based: it takes the text of
 * what the user is looking at and returns products relevant to it. There is no
 * `query` parameter to pass a search box into.
 *
 * That is a better fit here than it first appears. Styled always knows more
 * than a search term - the category being browsed, the user's colour season,
 * their archetypes - so this composes a natural-language brief from all of it.
 * A keyword API would have thrown that context away.
 */
function buildRecommendationContent(data: any): string {
  const parts: string[] = [];

  if (data.query) parts.push(data.query);
  if (data.category) parts.push(`Category: ${data.category}.`);
  if (data.subcategory) parts.push(`Specifically ${data.subcategory}.`);
  if (Array.isArray(data.colors) && data.colors.length) {
    parts.push(`Colours that suit them: ${data.colors.join(', ')}.`);
  }
  if (Array.isArray(data.styleArchetypes) && data.styleArchetypes.length) {
    parts.push(`Their style reads ${data.styleArchetypes.join(' and ')}.`);
  }
  if (Array.isArray(data.silhouettes) && data.silhouettes.length) {
    parts.push(`Cuts that work for them: ${data.silhouettes.join(', ')}.`);
  }
  if (data.condition === 'secondhand') parts.push('Prefer secondhand or resale listings.');
  if (data.onSaleOnly) parts.push('Prefer items currently on sale.');

  const content = parts.join(' ').trim();
  // Never send an empty brief - the endpoint requires content, and a blank
  // string would return arbitrary products presented as recommendations.
  return content || 'Everyday wardrobe staples in versatile neutral colours.';
}

/** Sovrn's `priceRange` uses "min-max" with `*` for an open end. */
function buildPriceRange(minPrice?: number, maxPrice?: number): string | undefined {
  if (typeof minPrice !== 'number' && typeof maxPrice !== 'number') return undefined;
  const min = typeof minPrice === 'number' ? String(Math.floor(minPrice)) : '*';
  const max = typeof maxPrice === 'number' ? String(Math.ceil(maxPrice)) : '*';
  return `${min}-${max}`;
}

/**
 * Maps a Sovrn product onto the client's Product model.
 *
 * Sovrn does not return brand, retailer, colour, category or sizes. Those are
 * left undefined rather than guessed - the client's scorer already treats a
 * missing field as "no signal" and skips that dimension, which is correct.
 * Inventing a brand by splitting the product name would produce confident
 * nonsense in the match reasons, which is the one place it would do real harm.
 *
 * `category` is carried over from the request because the caller asked for it,
 * so it is known rather than inferred.
 */
function mapSovrnProduct(raw: SovrnProduct, requestedCategory?: string) {
  const price = typeof raw.salePrice === 'number' ? raw.salePrice : raw.retailPrice;
  if (typeof price !== 'number' || !raw.name) return null;

  const onSale =
    typeof raw.retailPrice === 'number' &&
    typeof raw.salePrice === 'number' &&
    raw.retailPrice > raw.salePrice;

  return {
    id: String(raw.id),
    name: raw.name,
    brand: '',
    retailer: '',
    category: requestedCategory || 'tops',
    price,
    originalPrice: onSale ? raw.retailPrice : undefined,
    currency: raw.currency ? raw.currency.toUpperCase() : 'USD',
    imageUrl: raw.imageURL || raw.thumbnailURL || '',
    // deepLink is already affiliate-wrapped by Sovrn, so no second wrap is
    // needed for these. wrapAffiliateLink stays for links from anywhere else.
    sourceUrl: raw.deepLink || '',
    inStock: raw.inStock !== false,
  };
}

export const searchMarketplaceProducts = functions
  .runWith({ memory: '256MB', timeoutSeconds: 30, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    const sovrn = getSovrnConfig();
    if (!sovrn) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Sovrn Commerce is not configured yet. Set sovrn.key and sovrn.pubid via firebase functions:config:set, then implement the product search call in searchMarketplaceProducts.'
      );
    }
    try {
      const params = new URLSearchParams({
        apiKey: sovrn.key,
        // Sovrn keys recommendations to a page identity. There is no web page
        // here, so a stable per-surface identifier is sent instead - enough for
        // their side to group requests without inventing a fake URL.
        pageUrl: `styled-app://shop/${data.category || 'all'}`,
        numProducts: String(Math.min(50, Math.max(1, data.pageSize || 24))),
      });

      const priceRange = buildPriceRange(data.minPrice, data.maxPrice);
      if (priceRange) params.set('priceRange', priceRange);
      if (data.market) params.set('market', data.market);
      if (data.cuid) params.set('cuid', data.cuid);

      const response = await fetch(`${SOVRN_PRODUCTS_URL}?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: buildRecommendationContent(data),
          ...(data.title ? { title: data.title } : {}),
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error('Sovrn product request failed', response.status, detail.slice(0, 400));
        throw new functions.https.HttpsError(
          'unavailable',
          `Sovrn returned ${response.status}. ${detail.slice(0, 200)}`
        );
      }

      const payload = await response.json();

      // The docs describe a bare array, but tolerate the common wrapper shapes
      // rather than silently returning nothing if their envelope differs.
      const rawProducts: SovrnProduct[] = Array.isArray(payload)
        ? payload
        : payload?.products || payload?.data || payload?.results;

      if (!Array.isArray(rawProducts)) {
        // Fail loudly. A silent empty result here would look exactly like "no
        // matches" and could sit unnoticed for weeks.
        console.error('Unexpected Sovrn response shape:', JSON.stringify(payload).slice(0, 500));
        throw new functions.https.HttpsError(
          'internal',
          'Sovrn returned an unexpected response shape. Check the mapping in searchMarketplaceProducts.'
        );
      }

      const products = rawProducts
        .map(p => mapSovrnProduct(p, data.category))
        .filter((p): p is NonNullable<typeof p> => p !== null)
        // Anything Sovrn cannot monetise is dropped: it would earn nothing and
        // its link may not resolve.
        .filter(p => !!p.sourceUrl);

      console.log(`Sovrn returned ${rawProducts.length} products, ${products.length} usable`);

      return {
        products,
        // The endpoint caps at 50 and exposes no cursor, so there is no further
        // page to offer. Claiming otherwise would produce an infinite scroll
        // that never loads anything.
        hasMore: false,
        totalCount: products.length,
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error calling Sovrn product recommendations:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== RAKUTEN ADVERTISING ====================
//
// CONFIDENCE NOTE - read before debugging this.
//
// Unlike the Sovrn adapter above, this is NOT built from an official published
// reference: Rakuten's developer portal is not publicly accessible and their
// Product Search docs sit behind a publisher account. Endpoints, parameter
// names and XML element names below come from the long-established LinkShare /
// LinkSynergy ecosystem and are the shape their API has used for years - but
// they are unverified against current live responses.
//
// Everything provider-specific is therefore isolated in RAKUTEN_FIELDS and
// RAKUTEN_ENDPOINTS below. When you have credentials, run one live query, look
// at the XML, and correct those two blocks. Nothing else should need touching.
//
// Setup:
//   1. Get client_id, client_secret and SID from your Rakuten Advertising
//      publisher account (Help > API Access).
//   2. firebase functions:config:set rakuten.client_id="..." \
//        rakuten.client_secret="..." rakuten.sid="..."
//   3. firebase deploy --only functions:searchRakutenProducts
//   4. Set MARKETPLACE_PROVIDER to 'rakuten' (or 'both') in affiliateNetwork.ts

const RAKUTEN_ENDPOINTS = {
  token: 'https://api.rakutenmarketing.com/token',
  productSearch: 'https://api.rakutenmarketing.com/productsearch/1.0',
};

/** XML element names on each returned product. Correct these against a live response. */
const RAKUTEN_FIELDS = {
  itemPath: ['result', 'item'],
  productName: 'productname',
  merchantName: 'merchantname',
  merchantId: 'mid',
  sku: 'sku',
  price: 'price',
  salePrice: 'saleprice',
  linkUrl: 'linkurl',
  imageUrl: 'imageurl',
  categoryPrimary: 'primary',
  description: 'description',
  upc: 'upccode',
};

function getRakutenConfig(): { clientId: string; clientSecret: string; sid: string } | null {
  const cfg = functions.config().rakuten;
  if (!cfg?.client_id || !cfg?.client_secret || !cfg?.sid) return null;
  return { clientId: cfg.client_id, clientSecret: cfg.client_secret, sid: cfg.sid };
}

/**
 * Rakuten access tokens are valid for hours, so one is cached in module scope
 * and reused across invocations that land on a warm instance. Re-authenticating
 * on every search would add a round trip to every page of results.
 */
let rakutenToken: { value: string; expiresAt: number } | null = null;

async function getRakutenToken(cfg: {
  clientId: string;
  clientSecret: string;
  sid: string;
}): Promise<string> {
  if (rakutenToken && Date.now() < rakutenToken.expiresAt - 60_000) {
    return rakutenToken.value;
  }

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  const response = await fetch(RAKUTEN_ENDPOINTS.token, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `scope=${encodeURIComponent(cfg.sid)}`,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new functions.https.HttpsError(
      'unauthenticated',
      `Rakuten token request failed (${response.status}). ${detail.slice(0, 200)}`
    );
  }

  const payload: any = await response.json();
  const token = payload.access_token;
  if (!token) {
    throw new functions.https.HttpsError('internal', 'Rakuten token response contained no access_token.');
  }

  const ttlSeconds = Number(payload.expires_in) || 3600;
  rakutenToken = { value: token, expiresAt: Date.now() + ttlSeconds * 1000 };
  return token;
}

/** Rakuten prices arrive as either a bare value or `{ '#text': n, '@_currency': 'USD' }`. */
function rakutenPrice(node: any): { amount: number | null; currency: string } {
  if (node === undefined || node === null) return { amount: null, currency: 'USD' };
  if (typeof node === 'number') return { amount: node, currency: 'USD' };
  if (typeof node === 'string') {
    const parsed = parseFloat(node);
    return { amount: isNaN(parsed) ? null : parsed, currency: 'USD' };
  }
  const raw = node['#text'] ?? node.value;
  const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return {
    amount: isNaN(parsed) ? null : parsed,
    currency: String(node['@_currency'] || 'USD').toUpperCase(),
  };
}

function textOf(node: any): string {
  if (node === undefined || node === null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return String(node['#text'] ?? '');
}

export const searchRakutenProducts = functions
  .runWith({ memory: '512MB', timeoutSeconds: 30, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    const cfg = getRakutenConfig();
    if (!cfg) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Rakuten Advertising is not configured. Set rakuten.client_id, rakuten.client_secret and rakuten.sid via firebase functions:config:set.'
      );
    }

    try {
      const token = await getRakutenToken(cfg);

      const params = new URLSearchParams({
        // Rakuten is keyword-based, unlike Sovrn. Category is folded into the
        // keyword when no explicit search term was given, so browsing a
        // category still returns something relevant.
        keyword: (data.query || data.subcategory || data.category || 'clothing').toString(),
        max: String(Math.min(100, Math.max(1, data.pageSize || 24))),
        pagenumber: String((data.page || 0) + 1), // Rakuten pages are 1-indexed
      });
      if (data.category) params.set('cat', String(data.category));
      if (typeof data.maxPrice === 'number') params.set('maxprice', String(Math.ceil(data.maxPrice)));
      if (typeof data.minPrice === 'number') params.set('minprice', String(Math.floor(data.minPrice)));

      const response = await fetch(`${RAKUTEN_ENDPOINTS.productSearch}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/xml' },
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        // A 401 here usually means the cached token went stale early; clear it
        // so the next call re-authenticates rather than failing repeatedly.
        if (response.status === 401) rakutenToken = null;
        throw new functions.https.HttpsError(
          'unavailable',
          `Rakuten returned ${response.status}. ${detail.slice(0, 200)}`
        );
      }

      const xml = await response.text();
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const parsed = parser.parse(xml);

      let node: any = parsed;
      for (const key of RAKUTEN_FIELDS.itemPath) {
        node = node?.[key];
      }

      // A single result parses to an object rather than an array.
      const items: any[] = Array.isArray(node) ? node : node ? [node] : [];

      if (items.length === 0) {
        // Distinguish "no matches" from "we misread the response". If the
        // payload clearly contained products but our path missed them, that is
        // a mapping bug and must not look like an empty search.
        if (/<item[\s>]/i.test(xml)) {
          console.error('Rakuten XML contained items but itemPath missed them:', xml.slice(0, 600));
          throw new functions.https.HttpsError(
            'internal',
            'Rakuten response shape did not match RAKUTEN_FIELDS.itemPath. Correct the mapping in searchRakutenProducts.'
          );
        }
        return { products: [], hasMore: false, totalCount: 0 };
      }

      const products = items
        .map(item => {
          const price = rakutenPrice(item[RAKUTEN_FIELDS.price]);
          const sale = rakutenPrice(item[RAKUTEN_FIELDS.salePrice]);
          const name = textOf(item[RAKUTEN_FIELDS.productName]);
          const link = textOf(item[RAKUTEN_FIELDS.linkUrl]);

          // Sale price of 0 means "not on sale" in this feed, not "free".
          const effective = sale.amount && sale.amount > 0 ? sale.amount : price.amount;
          if (!name || !link || effective === null) return null;

          const onSale =
            sale.amount !== null && sale.amount > 0 && price.amount !== null && price.amount > sale.amount;

          return {
            id: `rakuten-${textOf(item[RAKUTEN_FIELDS.merchantId])}-${textOf(item[RAKUTEN_FIELDS.sku])}`,
            name,
            // Rakuten gives a merchant, not a manufacturer brand. Using it as
            // the retailer is accurate; using it as the brand would not be.
            brand: '',
            retailer: textOf(item[RAKUTEN_FIELDS.merchantName]),
            category: data.category || 'tops',
            price: effective,
            originalPrice: onSale ? price.amount ?? undefined : undefined,
            currency: price.currency || 'USD',
            imageUrl: textOf(item[RAKUTEN_FIELDS.imageUrl]),
            // linkurl is already the tracking link, so it needs no further wrap.
            sourceUrl: link,
            inStock: true,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      console.log(`Rakuten returned ${items.length} items, ${products.length} usable`);

      return {
        products,
        hasMore: items.length >= Math.min(100, data.pageSize || 24),
        totalCount: null,
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error calling Rakuten product search:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

export const wrapAffiliateLink = functions
  .runWith({ memory: '256MB', timeoutSeconds: 30, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    const sovrn = getSovrnConfig();
    if (!sovrn) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Sovrn Commerce is not configured yet. Set sovrn.key and sovrn.pubid via firebase functions:config:set, then implement the link-wrapping call in wrapAffiliateLink.'
      );
    }
    const { sourceUrl, cuid } = data;
    if (!sourceUrl) {
      throw new functions.https.HttpsError('invalid-argument', 'sourceUrl is required');
    }

    // Sovrn link wrapping is URL construction, not an API call - there is no
    // round trip to make. Building it here rather than on the client keeps the
    // Commerce key server-side, which is the whole reason this function exists.
    const params = new URLSearchParams({
      key: sovrn.key,
      u: sourceUrl,
    });
    if (cuid) params.set('cuid', String(cuid).slice(0, 2048));

    // URLSearchParams percent-encodes `u` for us, which the format requires.
    return { wrappedUrl: `https://sovrn.co?${params.toString()}` };
  });

// ==================== IMAGE GENERATION HELPERS ====================

/**
 * Downloads an image URL into an OpenAI-uploadable file.
 *
 * Cloud Functions cannot stream a remote URL straight into the images API, so
 * the bytes come through memory - hence the 1GB/long-timeout config on every
 * caller below.
 */
async function fetchAsUploadable(imageUrl: string, filename: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new functions.https.HttpsError('invalid-argument', `Could not read image at ${imageUrl}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return toFile(buffer, filename, { type: 'image/png' });
}

/**
 * Cuts a garment out of its background and returns it on transparency.
 *
 * Returns base64 rather than writing to Storage: the client already has a
 * proven upload path (uploadImageToFirebase) with the right security rules, and
 * routing the write through it keeps bucket permissions in one place.
 */
export const removeGarmentBackground = functions
  .runWith({ memory: '1GB', timeoutSeconds: 300, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const { imageUrl }: { imageUrl: string } = data;
      if (!imageUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'imageUrl is required');
      }

      const file = await fetchAsUploadable(imageUrl, 'garment.png');

      const result = await openai.images.edit({
        model: 'gpt-image-1',
        image: file,
        prompt:
          'Isolate only the clothing item in this photo on a fully transparent background. ' +
          'Remove the person, hanger, floor, and every background element. Keep the garment ' +
          'exactly as it is - do not restyle it, recolour it, change its pattern, or alter its ' +
          'shape. Preserve the original fabric texture and true colour. Present it flat and ' +
          'centred, as a clean catalogue cutout.',
        background: 'transparent',
        size: '1024x1024',
      });

      const b64 = result.data?.[0]?.b64_json;
      if (!b64) {
        throw new functions.https.HttpsError('internal', 'Background removal returned no image.');
      }

      console.log('Removed background for:', imageUrl);
      return { success: true, data: { imageBase64: `data:image/png;base64,${b64}` } };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error removing garment background:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Renders an outfit on the user's own full-length photo.
 *
 * Deliberately grounded in a real photo of the user rather than a generic
 * avatar: the point of a try-on is seeing it on your own proportions, and a
 * stock mannequin answers a question nobody asked.
 */
export const renderTryOn = functions
  .runWith({ memory: '1GB', timeoutSeconds: 300, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const {
        personImageUrl,
        garmentDescriptions = [],
      }: { personImageUrl: string; garmentDescriptions: string[] } = data;

      if (!personImageUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'personImageUrl is required');
      }
      if (garmentDescriptions.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'At least one garment is required');
      }

      const file = await fetchAsUploadable(personImageUrl, 'person.png');

      const result = await openai.images.edit({
        model: 'gpt-image-1',
        image: file,
        prompt:
          `Show this exact person wearing the following outfit: ${garmentDescriptions.join('; ')}. ` +
          'Keep their face, hair, skin tone, body proportions and pose completely unchanged - ' +
          'this must still clearly be the same person. Replace only their clothing. Render the ' +
          'garments realistically with natural fabric drape and lighting consistent with the ' +
          'original photo. Keep the background simple and neutral.',
        size: '1024x1536',
      });

      const b64 = result.data?.[0]?.b64_json;
      if (!b64) {
        throw new functions.https.HttpsError('internal', 'Try-on render returned no image.');
      }

      console.log('Rendered try-on with', garmentDescriptions.length, 'garments');
      return { success: true, data: { imageBase64: `data:image/png;base64,${b64}` } };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error rendering try-on:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== EXPLORE CURATION ====================

/**
 * Groups recent community posts into named editorial collections.
 *
 * This is the part of Explore that a ranking algorithm cannot do. Velocity can
 * tell you what is popular and profile-matching can tell you what suits
 * someone, but neither can notice that eleven unrelated people all posted
 * neutral layering this week and give that a name.
 *
 * The model only ever groups and titles - it is explicitly told not to invent
 * posts, and every id it returns is validated against the input on the client.
 */
export const curateExploreCollections = functions
  .runWith({ memory: '512MB', timeoutSeconds: 60, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const { posts = [] }: { posts: Array<{ id: string; caption: string; hashtags: string[]; type: string }> } = data;

      if (posts.length < 6) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Not enough recent posts to curate collections from.'
        );
      }

      const postLines = posts
        .map(p => `- ${p.id} | ${p.type} | "${p.caption}"${p.hashtags?.length ? ` | #${p.hashtags.join(' #')}` : ''}`)
        .join('\n');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `You are the editor of a styling app's discovery page. Below are recent posts from its community. Group them into 2-4 collections that a reader would find genuinely interesting.

Posts (use these exact ids):
${postLines}

What makes a good collection here:
- A real thread running through the posts - a shared silhouette, palette, occasion, or approach. Not a category label.
- Specific enough to be worth a title. "Neutral layering, done three ways" beats "Casual looks".
- At least 3 posts, or it is not a collection.

Rules:
- Only use ids from the list. Never invent a post.
- A post may appear in at most one collection.
- Do not force every post into a collection. Leaving most of them out is correct.
- title: 2-5 words, no emoji, no hashtags.
- rationale: one sentence naming what these posts have in common. Write like an editor, not a classifier. Never use the word "flattering".
- If nothing coherent emerges, return an empty collections array. That is a valid and useful answer.

Return ONLY valid JSON:
{ "collections": [{ "title": "string", "rationale": "one sentence", "postIds": ["ids"] }] }`,
          },
        ],
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);

      const validIds = new Set(posts.map(p => p.id));
      const used = new Set<string>();

      const collections = (Array.isArray(result.collections) ? result.collections : [])
        .map((c: any) => {
          // Enforce the one-collection-per-post rule server-side rather than
          // trusting the model to have honoured it.
          const postIds = (Array.isArray(c?.postIds) ? c.postIds : []).filter((id: string) => {
            if (!validIds.has(id) || used.has(id)) return false;
            used.add(id);
            return true;
          });
          return { title: c?.title || '', rationale: c?.rationale || '', postIds };
        })
        .filter((c: any) => c.title && c.postIds.length >= 3);

      console.log(`Curated ${collections.length} explore collections from ${posts.length} posts`);

      return { success: true, data: { collections } };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error curating explore collections:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * The Edit - Explore's editorial voice.
 *
 * Writes a short styling piece over candidate products, grounded in a summary
 * of the user's real closet. The summary is counts and colours only; no item
 * names, no images, nothing that would put someone's wardrobe contents into a
 * prompt unnecessarily.
 *
 * The model chooses and argues. It never supplies a number - newOutfits and
 * pairsWith come from computeOutfitUnlock on the client and are passed in, so
 * the copy can reference them without being able to invent them.
 */
export const curateStyleEdit = functions
  .runWith({ memory: '512MB', timeoutSeconds: 60, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const {
        season = 'autumn',
        archetypes = [],
        palette = [],
        closet = {},
        products = [],
      }: {
        season: string;
        archetypes: string[];
        palette: string[];
        closet: {
          totalItems?: number;
          byRole?: Record<string, number>;
          topColors?: string[];
          outfitsToday?: number;
          bottleneckRole?: string | null;
          bottleneckGain?: number;
        };
        products: Array<{
          id: string;
          name: string;
          brand?: string;
          category: string;
          color?: string;
          price: number;
          newOutfits: number;
          pairsWith: number;
          headline: string;
        }>;
      } = data;

      if (products.length < 6) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Not enough candidate products to write an edit.'
        );
      }

      const productLines = products
        .map(
          p =>
            `- ${p.id} | ${p.name}${p.brand ? ` (${p.brand})` : ''} | ${p.category} | ${
              p.color || 'unspecified colour'
            } | $${p.price} | makes ${p.newOutfits} new outfits, pairs with ${p.pairsWith} owned pieces`
        )
        .join('\n');

      const closetLine = [
        closet.totalItems ? `${closet.totalItems} items` : null,
        closet.outfitsToday ? `${closet.outfitsToday} outfits currently makeable` : null,
        closet.topColors?.length ? `mostly ${closet.topColors.join(', ')}` : null,
        closet.bottleneckRole
          ? `short on ${closet.bottleneckRole}s (one more would add ${closet.bottleneckGain} outfits)`
          : null,
      ]
        .filter(Boolean)
        .join('; ');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `You are the style editor of a personal styling app. Write this week's Edit for one reader.

What you know about their wardrobe: ${closetLine || 'very little - treat them as starting out'}.
Season: ${season}.
${archetypes.length ? `Their style reads as: ${archetypes.join(', ')}.` : ''}
${palette.length ? `Colours that suit them: ${palette.join(', ')}.` : ''}

Candidate pieces (use these exact ids):
${productLines}

Choose 3 to 5 pieces that make a coherent argument together, and write the Edit.

What makes this good:
- One idea, not a list. "Three ways to break up a neutral wardrobe" is an idea. "Autumn picks" is not.
- Argue from THEIR closet. The numbers above are real and countable - use them when they help ("this alone takes you from 12 outfits to 20").
- Prefer pieces with high newOutfits when the argument allows it. A beautiful piece that pairs with nothing they own is a bad recommendation.

Rules:
- Only use ids from the list. Never invent a product.
- Never invent a number. Only cite newOutfits and pairsWith exactly as given.
- No emoji. No hashtags. Never use the word "flattering", "must-have", "elevate" or "effortless".
- title: 3-7 words.
- standfirst: one or two sentences setting up the idea.
- line (per pick): one sentence saying why this piece, for this reader. Specific, not generic praise.

Return ONLY valid JSON:
{ "title": "string", "standfirst": "string", "picks": [{ "productId": "id", "line": "one sentence" }] }`,
          },
        ],
        max_tokens: 900,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);

      // Validate ids server-side and drop duplicates. The client validates
      // again on the way in - this is the cheaper of the two checks, not the
      // only one.
      const validIds = new Set(products.map(p => p.id));
      const used = new Set<string>();
      const picks = (Array.isArray(result.picks) ? result.picks : [])
        .filter((p: any) => {
          const id = p?.productId;
          if (!id || !validIds.has(id) || used.has(id) || !p?.line) return false;
          used.add(id);
          return true;
        })
        .slice(0, 5)
        .map((p: any) => ({ productId: p.productId, line: String(p.line) }));

      if (!result.title || picks.length < 3) {
        throw new functions.https.HttpsError(
          'internal',
          'Edit did not come back with enough valid picks.'
        );
      }

      console.log(`Wrote style edit "${result.title}" with ${picks.length} picks`);

      return {
        success: true,
        data: {
          title: String(result.title),
          standfirst: String(result.standfirst || ''),
          picks,
        },
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error curating style edit:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Ranks and writes up the day's outfit suggestions.
 *
 * The client builds the candidates deterministically - real garments, real
 * pairings, colour and formality already checked - and sends a shortlist. The
 * model's job is judgement and voice: which of these actually works best for
 * this occasion, and why, in a sentence a person would read.
 *
 * It cannot invent an outfit. It returns indices into the shortlist, which are
 * validated on the way out, so a hallucinated garment is impossible by
 * construction rather than by hoping the prompt held.
 */
export const curateDailyOutfits = functions
  .runWith({ memory: '512MB', timeoutSeconds: 60, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const {
        occasion = 'casual',
        weather,
        archetypes = [],
        avoidRules = [],
        outfits = [],
      }: {
        occasion: string;
        weather?: { condition: string; temperature: number };
        archetypes: string[];
        avoidRules: string[];
        outfits: Array<{
          index: number;
          pieces: Array<{
            category: string;
            subcategory?: string;
            color?: string;
            pattern?: string;
            fabric?: string;
            fit?: string;
            brand?: string;
          }>;
          formality: number;
        }>;
      } = data;

      if (outfits.length < 2) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Not enough candidate outfits to rank.'
        );
      }

      const described = outfits
        .map(
          o =>
            `[${o.index}] ${o.pieces
              .map(p =>
                [p.fit, p.color, p.pattern !== 'solid' ? p.pattern : null, p.fabric, p.subcategory || p.category]
                  .filter(Boolean)
                  .join(' ')
              )
              .join(' + ')} (formality ${o.formality.toFixed(1)}/5)`
        )
        .join('\n');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `You are a personal stylist choosing what someone should wear today for: ${occasion}.

${weather ? `Weather: ${weather.condition}, ${Math.round(weather.temperature)}°F.` : ''}
${archetypes.length ? `Their style reads as: ${archetypes.join(', ')}.` : ''}
${avoidRules.length ? `They do not wear: ${avoidRules.join('; ')}.` : ''}

Candidate outfits, all built from garments they already own:
${described}

Pick the best 3 for this occasion, in order, and say why each one works.

What makes a good answer:
- Judge the outfit as an outfit. Does it hold together, and is it right for ${occasion} specifically?
- Be concrete about what makes it work: the cut, the colour relationship, the level it is pitched at.
- If a candidate is wrong for the occasion, do not pick it, even if it appears high in the list.
- Reject anything that breaks their stated rules.

Rules:
- Only use the numeric indices shown. Never describe a garment that is not listed.
- Never invent a colour, brand or fabric that was not given.
- note: one sentence, max 20 words. No emoji. Never use "effortless", "elevate", "must-have", "flattering" or "pop of colour".
- title: 2-4 words naming the look, not the occasion.

Return ONLY valid JSON:
{ "picks": [{ "index": 0, "title": "string", "note": "one sentence" }] }`,
          },
        ],
        max_tokens: 700,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);

      const validIndices = new Set(outfits.map(o => o.index));
      const seen = new Set<number>();
      const picks = (Array.isArray(result.picks) ? result.picks : [])
        .filter((p: any) => {
          const i = Number(p?.index);
          if (!Number.isInteger(i) || !validIndices.has(i) || seen.has(i) || !p?.note) return false;
          seen.add(i);
          return true;
        })
        .slice(0, 3)
        .map((p: any) => ({
          index: Number(p.index),
          title: String(p.title || 'Today'),
          note: String(p.note),
        }));

      if (picks.length === 0) {
        throw new functions.https.HttpsError('internal', 'No valid picks returned.');
      }

      console.log(`curateDailyOutfits: ranked ${picks.length} of ${outfits.length} for ${occasion}`);

      return { success: true, data: { picks } };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error curating daily outfits:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== ADMIN ====================

/**
 * The admin allowlist, as Firebase uids.
 *
 * Read from ADMIN_UIDS in functions/.env first, falling back to the legacy
 * runtime config. The Firebase CLI now refuses `functions:config:set` without
 * enabling a deprecated experiment, and functions.config() is removed in 2027,
 * so .env is the path forward - but reading both means an existing runtime
 * config keeps working and a lost .env cannot silently empty the list.
 *
 * An empty result denies everyone. A misconfiguration should lock admins out,
 * never open the door.
 */
function adminUids(): string[] {
  const fromEnv = process.env.ADMIN_UIDS || '';
  const fromConfig = (() => {
    try {
      return functions.config().admin?.uids || '';
    } catch {
      // functions.config() throws rather than returning empty when no runtime
      // config exists at all.
      return '';
    }
  })();

  return `${fromEnv},${fromConfig}`
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Whether the caller is an admin.
 *
 * The client needs this to decide whether to show the admin entry at all.
 * It is a convenience, not a security boundary - every admin action
 * re-checks server-side via requireAdmin, because anything the client
 * decides can be lied about.
 */
export const getAdminStatus = functions
  .runWith({ memory: '128MB', timeoutSeconds: 15, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid) return { success: true, data: { isAdmin: false } };

    return { success: true, data: { isAdmin: adminUids().includes(uid) } };
  });

/**
 * Affiliate performance.
 *
 * An important limit, stated here because the UI states it too: this can
 * measure impressions and outbound clicks, and nothing beyond them. Whether a
 * click became an order, survived the return window, and paid out is known
 * only to Sovrn and Rakuten. Those figures arrive through their reports and
 * are recorded via recordAffiliateRevenue - they are never inferred here.
 *
 * `estimatedCommission` on a click doc is a flat-rate guess and is reported
 * as "potential", never as earnings.
 */
export const getAffiliateAnalytics = functions
  .runWith({ memory: '512MB', timeoutSeconds: 60, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    requireAdmin(context);

    const days = Math.min(180, Math.max(1, Number(data?.days) || 30));
    const since = new Date(Date.now() - days * 86_400_000);

    const [clicksSnap, dailySnap, revenueSnap] = await Promise.all([
      db.collection('affiliateClicks').where('clickedAt', '>=', since).get(),
      db.collection('affiliateDaily').get(),
      db.collection('affiliateRevenue').orderBy('period', 'desc').limit(24).get(),
    ]);

    const bySurface: Record<
      string,
      { clicks: number; clickValue: number; potential: number; impressions: number; impressionValue: number }
    > = {};
    const ensure = (surface: string) => {
      if (!bySurface[surface]) {
        bySurface[surface] = {
          clicks: 0,
          clickValue: 0,
          potential: 0,
          impressions: 0,
          impressionValue: 0,
        };
      }
      return bySurface[surface];
    };

    const byReason: Record<string, { clicks: number; clickValue: number }> = {};
    const byRetailer: Record<string, { clicks: number; clickValue: number }> = {};
    const uniqueUsers = new Set<string>();
    let mockClicks = 0;

    clicksSnap.forEach(doc => {
      const c = doc.data() as any;
      const bucket = ensure(c.surface || 'unknown');
      bucket.clicks += 1;
      bucket.clickValue += Number(c.price) || 0;
      bucket.potential += Number(c.estimatedCommission) || 0;
      if (c.userId) uniqueUsers.add(c.userId);
      if (!c.provider || c.provider === 'mock') mockClicks += 1;

      if (c.reason) {
        const r = (byReason[c.reason] ||= { clicks: 0, clickValue: 0 });
        r.clicks += 1;
        r.clickValue += Number(c.price) || 0;
      }
      if (c.retailer) {
        const r = (byRetailer[c.retailer] ||= { clicks: 0, clickValue: 0 });
        r.clicks += 1;
        r.clickValue += Number(c.price) || 0;
      }
    });

    const sinceDay = since.toISOString().slice(0, 10);
    dailySnap.forEach(doc => {
      const d = doc.data() as any;
      if (!d.day || d.day < sinceDay) return;
      Object.entries(d.impressions || {}).forEach(([surface, count]) => {
        ensure(surface).impressions += Number(count) || 0;
      });
      Object.entries(d.impressionValue || {}).forEach(([surface, value]) => {
        ensure(surface).impressionValue += Number(value) || 0;
      });
    });

    const surfaces = Object.entries(bySurface)
      .map(([surface, v]) => ({
        surface,
        ...v,
        // Null rather than zero when there is no denominator - a rate of 0%
        // and "not measurable yet" are different statements.
        tapThrough: v.impressions > 0 ? v.clicks / v.impressions : null,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    const totals = surfaces.reduce(
      (acc, s) => ({
        clicks: acc.clicks + s.clicks,
        impressions: acc.impressions + s.impressions,
        clickValue: acc.clickValue + s.clickValue,
        potential: acc.potential + s.potential,
      }),
      { clicks: 0, impressions: 0, clickValue: 0, potential: 0 }
    );

    const revenue = revenueSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    const recordedNet = revenue.reduce((sum, r) => sum + (Number(r.net) || 0), 0);
    const recordedOrders = revenue.reduce((sum, r) => sum + (Number(r.orders) || 0), 0);

    return {
      success: true,
      data: {
        days,
        totals: {
          ...totals,
          uniqueUsers: uniqueUsers.size,
          // Share of clicks that came from the placeholder catalogue. Non-zero
          // means the numbers above are a rehearsal, not a business.
          mockShare: totals.clicks > 0 ? mockClicks / totals.clicks : null,
        },
        surfaces,
        reasons: Object.entries(byReason)
          .map(([reason, v]) => ({ reason, ...v }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 12),
        retailers: Object.entries(byRetailer)
          .map(([retailer, v]) => ({ retailer, ...v }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 12),
        revenue,
        // Real, reconciled figures. Everything else on this screen is activity.
        recorded: {
          net: recordedNet,
          orders: recordedOrders,
          conversion: totals.clicks > 0 && recordedOrders > 0 ? recordedOrders / totals.clicks : null,
          revenuePerClick: totals.clicks > 0 && recordedNet > 0 ? recordedNet / totals.clicks : null,
        },
      },
    };
  });

/**
 * Records an actual payout from a network report.
 *
 * This is the only source of truth for money on the affiliate screen. Entered
 * by hand because Sovrn and Rakuten report on their own schedules and in their
 * own formats, and a wrong automated import is worse than a manual one.
 */
export const recordAffiliateRevenue = functions
  .runWith({ memory: '256MB', timeoutSeconds: 30, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    const uid = requireAdmin(context);

    const { period, network, gross, returns, net, orders, note } = data || {};

    if (!/^\d{4}-\d{2}$/.test(String(period || ''))) {
      throw new functions.https.HttpsError('invalid-argument', 'period must be YYYY-MM.');
    }
    if (!network) {
      throw new functions.https.HttpsError('invalid-argument', 'network is required.');
    }

    const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : 0);
    const id = `${period}_${String(network).toLowerCase()}`;

    await db.collection('affiliateRevenue').doc(id).set(
      {
        period,
        network,
        gross: num(gross),
        returns: num(returns),
        net: num(net) || num(gross) - num(returns),
        orders: num(orders),
        note: note || null,
        recordedBy: uid,
        recordedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`recordAffiliateRevenue: ${id} net=${num(net)} by ${uid}`);
    return { success: true, data: { id } };
  });

// ==================== STYLIST APPLICATIONS ====================
//
// Approving a stylist is the one action in this app that grants a user a role
// other people are charged for, so it lives entirely server-side. Nothing on
// the client can write the `stylists` collection.
//
// Admins are identified by an allowlist of uids:
//   firebase functions:config:set admin.uids="uid1,uid2"
//
// A config allowlist rather than custom claims because there will be a handful
// of admins and no self-serve admin signup. If that changes, move to custom
// claims - the check is isolated in requireAdmin() below.

function requireAdmin(context: functions.https.CallableContext): string {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  // An empty allowlist denies everyone rather than allowing everyone. A
  // misconfiguration should lock admins out, not let the world in.
  if (!adminUids().includes(uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Admins only.');
  }
  return uid;
}

export const listStylistApplications = functions
  .runWith({ memory: '256MB', timeoutSeconds: 30, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    requireAdmin(context);

    const status = data?.status || 'pending';
    const snapshot = await db
      .collection('stylistApplications')
      .where('status', '==', status)
      .get();

    const applications = snapshot.docs
      .map(d => d.data())
      .sort((a: any, b: any) => String(a.submittedAt).localeCompare(String(b.submittedAt)));

    return { applications };
  });

/**
 * Approves or declines an application.
 *
 * On approval this is the ONLY place a `stylists/{uid}` document is created.
 * The record is built from the application rather than from anything the
 * client sends at review time, so an admin cannot be tricked into approving
 * different terms than the ones that were reviewed.
 */
export const reviewStylistApplication = functions
  .runWith({ memory: '256MB', timeoutSeconds: 60, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    const reviewerUid = requireAdmin(context);

    const { applicationId, decision, reviewNote } = data as {
      applicationId: string;
      decision: 'approve' | 'decline';
      reviewNote?: string;
    };

    if (!applicationId || (decision !== 'approve' && decision !== 'decline')) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'applicationId and a decision of approve or decline are required.'
      );
    }

    const ref = db.collection('stylistApplications').doc(applicationId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'That application no longer exists.');
    }

    const application = snap.data() as any;

    if (application.status !== 'pending') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `That application was already ${application.status}.`
      );
    }

    if (decision === 'decline') {
      await ref.update({
        status: 'declined',
        reviewNote: reviewNote || '',
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewerUid,
      });
      console.log(`Declined stylist application ${applicationId}`);
      return { success: true, decision: 'declined' };
    }

    // Approval. The stylist doc id is the applicant's uid, which is what makes
    // the whole role check work - AccountScreen and StylistDashboard both look
    // up stylists/{their own uid}.
    const stylistDoc = {
      id: applicationId,
      name: application.fullName || 'Stylist',
      bio: application.bio || '',
      profileImageUrl: application.profileImageUrl || '',
      specialties: Array.isArray(application.specialties) ? application.specialties : [],
      hourlyRate: typeof application.hourlyRate === 'number' ? application.hourlyRate : 0,
      // A new stylist has no history. Seeding a flattering rating would be
      // inventing social proof, and every review count in the app is real.
      rating: 0,
      reviewCount: 0,
      availability: [],
      yearsExperience:
        typeof application.yearsExperience === 'number' ? application.yearsExperience : 0,
      certifications: Array.isArray(application.certifications) ? application.certifications : [],
      portfolio: (Array.isArray(application.portfolioUrls) ? application.portfolioUrls : []).map(
        (url: string, i: number) => ({
          id: `portfolio-${i + 1}`,
          imageUrl: url,
          title: `Work sample ${i + 1}`,
        })
      ),
      sessionTypes: Array.isArray(application.sessionTypes) ? application.sessionTypes : [],
      languages: Array.isArray(application.languages) ? application.languages : [],
      location: application.location || '',
      // Verified means a human reviewed and accepted them, which is exactly
      // what just happened.
      isVerified: true,
      createdAt: admin.firestore.Timestamp.now(),
    };

    const batch = db.batch();
    batch.set(db.collection('stylists').doc(applicationId), stylistDoc);
    batch.update(ref, {
      status: 'approved',
      reviewNote: reviewNote || '',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewerUid,
    });
    await batch.commit();

    // Told in-app rather than by email: there is no transactional email
    // provider wired up, and a notification is something this app can actually
    // deliver today.
    await db.collection('notifications').add({
      userId: applicationId,
      type: 'system',
      title: "You're approved as a Styled stylist",
      body: 'Your stylist tools are now available from your account. Set your availability to start taking bookings.',
      read: false,
      createdAt: admin.firestore.Timestamp.now(),
    });

    console.log(`Approved stylist application ${applicationId}`);
    return { success: true, decision: 'approved' };
  });

// ==================== CHALLENGE SEEDING ====================

/**
 * The pool challenges rotate through.
 *
 * Editorial content, so it lives in code rather than a database - these get
 * reviewed and reworded like copy, not managed like records. Add to the end;
 * the rotation cursor handles the rest.
 */
const CHALLENGE_POOL = [
  {
    slug: 'one-piece-five-ways',
    title: 'One piece, five ways',
    type: 'weekly',
    prize: 'Featured on the community feed',
    hashtags: ['onepiecefiveways', 'versatility'],
    description:
      'Pick the hardest-working item in your closet and show five genuinely different outfits built around it. Bonus points if two of them are for completely different occasions.',
    rules: [
      'Every look must include the same single piece',
      'Five distinct outfits, not five angles of one',
      'Say which piece you chose and why',
    ],
  },
  {
    slug: 'shop-your-closet',
    title: 'Shop your own closet',
    type: 'weekly',
    prize: 'Featured on the community feed',
    hashtags: ['shopyourcloset', 'rediscovery'],
    description:
      'Build an outfit entirely from pieces you have not worn in the last three months. The ones you forgot you owned are usually the most interesting.',
    rules: [
      'Nothing worn in the last 3 months',
      'At least three pieces',
      'Tell us why it fell out of rotation',
    ],
  },
  {
    slug: 'nothing-but-neutrals',
    title: 'Nothing but neutrals',
    type: 'weekly',
    prize: 'Featured on the community feed',
    hashtags: ['nothingbutneutrals', 'colour'],
    description:
      'Cream, camel, charcoal, bone. Prove a restricted palette is a discipline rather than a limitation - texture and silhouette have to do all the work.',
    rules: ['Neutrals only', 'No accent colours', 'Texture is your friend'],
  },
  {
    slug: 'lowest-cost-per-wear',
    title: 'Your lowest cost-per-wear',
    type: 'monthly',
    prize: 'Featured on the community feed',
    hashtags: ['costperwear', 'value'],
    description:
      'An outfit made only from the pieces you wear most. Share the cost-per-wear if you have it - the best answers here are usually the oldest things you own.',
    rules: ['Only your most-worn pieces', 'Share the cost-per-wear if you track it'],
  },
  {
    slug: 'one-colour-head-to-toe',
    title: 'One colour, head to toe',
    type: 'weekly',
    prize: 'Featured on the community feed',
    hashtags: ['monochrome', 'colour'],
    description:
      'Commit to one colour for the whole outfit. The trick is varying the shade and texture so it reads considered rather than uniform.',
    rules: ['A single colour family', 'Vary the shade and texture', 'Neutrals count as a colour'],
  },
  {
    slug: 'secondhand-only',
    title: 'Secondhand only',
    type: 'monthly',
    prize: 'Featured on the community feed',
    hashtags: ['secondhand', 'sustainability'],
    description:
      'An outfit where nothing was bought new. Tell us where you found the best piece - half the pleasure is in the hunt.',
    rules: ['Nothing bought new', 'Name where you found it'],
  },
  {
    slug: 'dress-for-the-weather',
    title: 'Dress for the actual weather',
    type: 'daily',
    prize: 'Featured on the community feed',
    hashtags: ['dressfortheweather', 'practical'],
    description:
      'No styling for an imaginary climate. Whatever it is doing outside your window right now - dress for that, and make it look good anyway.',
    rules: ['Must suit the real weather where you are today', 'Say what it is doing outside'],
  },
  {
    slug: 'carry-on-only',
    title: 'Carry-on only',
    type: 'monthly',
    prize: 'Featured on the community feed',
    hashtags: ['carryononly', 'travel'],
    description:
      'Nine pieces, seven days, one bag. Show the pieces and how they recombine - this is the closest thing styling has to a puzzle.',
    rules: ['Nine pieces maximum', 'Show at least five outfits from them'],
  },
  {
    slug: 'oldest-thing-you-own',
    title: 'The oldest thing you own',
    type: 'weekly',
    prize: 'Featured on the community feed',
    hashtags: ['oldestthingyouown', 'longevity'],
    description:
      'Build a look around the piece you have had longest. Anything that survived that many wardrobe clear-outs has earned its place.',
    rules: ['Feature your longest-owned piece', 'Tell us how long you have had it'],
  },
  {
    slug: 'texture-over-pattern',
    title: 'Texture over pattern',
    type: 'weekly',
    prize: 'Featured on the community feed',
    hashtags: ['textureoverpattern', 'craft'],
    description:
      'Knit, suede, denim, silk, corduroy. Make an outfit interesting without a single print in it.',
    rules: ['No prints of any kind', 'At least three different textures'],
  },
];

const CHALLENGE_DURATION_DAYS = 14;
/** Overlapping runs, so there is always something mid-flight and something new. */
const TARGET_ACTIVE = 2;
const TARGET_UPCOMING = 1;

/**
 * Keeps the Challenges screen populated: retires what has ended, promotes what
 * has started, and opens new ones from the pool when the count runs short.
 *
 * Field names here MUST match the Challenge interface in
 * src/services/challengeService.ts - startDate/endDate/participants/entries,
 * not the startsAt/endsAt shape an earlier version of this function wrote.
 * getChallenges() orders by `startDate`, and Firestore silently omits any
 * document missing the field it is ordered by, so a mismatch does not error:
 * the documents simply never come back. `type` is likewise required rather
 * than optional, because the Challenges screen calls type.toUpperCase()
 * unguarded and would crash on a document without it.
 *
 * Idempotent and safe to run repeatedly: it only creates when below target.
 */
async function rotateChallengesNow(): Promise<{
  retired: number;
  promoted: number;
  created: number;
  repaired: number;
}> {
  const now = new Date();
  const nowIso = now.toISOString();
  const collection = db.collection('challenges');

  // Remove anything written in the old, unreadable shape. Those documents can
  // never be returned by getChallenges(), so leaving them would both hide them
  // from users and block new ones being created for the same slug.
  let repaired = 0;
  const all = await collection.get();
  for (const doc of all.docs) {
    const data = doc.data() as any;
    if (!data.startDate || !data.type) {
      await doc.ref.delete();
      repaired++;
    }
  }

  const live = await collection.where('status', 'in', ['active', 'upcoming']).get();
  let retired = 0;
  let promoted = 0;

  for (const doc of live.docs) {
    const data = doc.data() as any;
    if (data.endDate && data.endDate < nowIso) {
      await doc.ref.update({ status: 'completed' });
      retired++;
    } else if (data.status === 'upcoming' && data.startDate && data.startDate <= nowIso) {
      await doc.ref.update({ status: 'active' });
      promoted++;
    }
  }

  const stillLive = await collection.where('status', 'in', ['active', 'upcoming']).get();
  const activeCount = stillLive.docs.filter(d => (d.data() as any).status === 'active').length;
  const upcomingCount = stillLive.docs.filter(d => (d.data() as any).status === 'upcoming').length;

  const activeNeeded = Math.max(0, TARGET_ACTIVE - activeCount);
  const needed = activeNeeded + Math.max(0, TARGET_UPCOMING - upcomingCount);
  if (needed === 0) {
    return { retired, promoted, created: 0, repaired };
  }

  // Cursor into the pool so challenges cycle rather than repeating. Stored
  // rather than derived, so adding to the pool never replays old ones.
  const cursorRef = db.collection('challengeRotation').doc('state');
  const cursorDoc = await cursorRef.get();
  let cursor = cursorDoc.exists ? (cursorDoc.data() as any).cursor || 0 : 0;

  // Never re-open something already running.
  const liveSlugs = new Set(stillLive.docs.map(d => (d.data() as any).slug).filter(Boolean));

  let created = 0;
  for (let attempt = 0; attempt < CHALLENGE_POOL.length && created < needed; attempt++) {
    const template = CHALLENGE_POOL[cursor % CHALLENGE_POOL.length];
    cursor++;
    if (liveSlugs.has(template.slug)) continue;

    const startOffset = created < activeNeeded ? 0 : 7;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + startOffset);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + CHALLENGE_DURATION_DAYS);

    // Id carries the start date so the same theme can run again months later
    // without colliding with its previous outing.
    const id = template.slug + '-' + startDate.toISOString().slice(0, 10);

    await collection.doc(id).set({
      slug: template.slug,
      title: template.title,
      description: template.description,
      type: template.type,
      status: startOffset === 0 ? 'active' : 'upcoming',
      prize: template.prize,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      participants: 0,
      entries: 0,
      rules: template.rules,
      hashtags: template.hashtags,
      createdBy: 'styled',
      createdAt: admin.firestore.Timestamp.now(),
    });

    liveSlugs.add(template.slug);
    created++;
  }

  await cursorRef.set({ cursor, updatedAt: admin.firestore.Timestamp.now() });
  return { retired, promoted, created, repaired };
}

/**
 * Runs daily. Cheap - it usually does nothing but a couple of reads.
 *
 * Daily rather than weekly because the transitions it handles are date-based:
 * a challenge that ends on Tuesday should not still be listed as active on
 * Wednesday just because the scheduler runs on Sundays.
 */
export const rotateChallenges = functions
  .runWith({ memory: '256MB', timeoutSeconds: 120 })
  .pubsub.schedule('every 24 hours')
  .timeZone('America/Chicago')
  .onRun(async () => {
    const result = await rotateChallengesNow();
    console.log(
      `Challenge rotation: ${result.repaired} malformed removed, ${result.retired} retired, ${result.promoted} promoted, ${result.created} created`
    );
    return null;
  });

/**
 * Manual trigger for the same logic, so the board can be filled immediately
 * rather than waiting for the first scheduled run.
 */
export const seedChallenges = functions
  .runWith({ memory: '256MB', timeoutSeconds: 120, enforceAppCheck: false })
  .https.onCall(async () => {
    const result = await rotateChallengesNow();
    console.log(
      `Manual challenge seed: ${result.repaired} malformed removed, ${result.retired} retired, ${result.promoted} promoted, ${result.created} created`
    );
    return { success: true, ...result };
  });

// ==================== ACCOUNT DELETION ====================

/**
 * Collections holding user-owned documents, keyed by the field that identifies
 * the owner.
 *
 * Deliberately explicit rather than discovered at runtime: a wildcard sweep
 * over every collection would be one rename away from deleting data it should
 * not touch, and this is the one operation with no undo.
 */
const USER_OWNED_COLLECTIONS: Array<{ name: string; field: string }> = [
  { name: 'closetItems', field: 'userId' },
  { name: 'outfits', field: 'userId' },
  { name: 'plannedOutfits', field: 'userId' },
  { name: 'packingLists', field: 'userId' },
  { name: 'resaleValuations', field: 'userId' },
  { name: 'wishlistItems', field: 'userId' },
  { name: 'favoriteLooks', field: 'userId' },
  { name: 'shoppingListItems', field: 'userId' },
  { name: 'affiliateClicks', field: 'userId' },
  { name: 'chatMessages', field: 'userId' },
  { name: 'notifications', field: 'userId' },
  { name: 'posts', field: 'userId' },
  { name: 'postComments', field: 'userId' },
  { name: 'postLikes', field: 'userId' },
  { name: 'savedPosts', field: 'userId' },
  { name: 'postCollections', field: 'userId' },
  { name: 'userInteractions', field: 'userId' },
  { name: 'groupMembers', field: 'userId' },
  { name: 'eventAttendees', field: 'userId' },
  { name: 'challengeEntries', field: 'userId' },
  { name: 'challengeParticipants', field: 'userId' },
  { name: 'challengeVotes', field: 'userId' },
  { name: 'stylistBookings', field: 'userId' },
  { name: 'sessionNotes', field: 'userId' },
  { name: 'sessionPhotos', field: 'userId' },
  { name: 'sessionDeliverables', field: 'userId' },
  { name: 'sessionRecommendations', field: 'userId' },
  { name: 'reviews', field: 'userId' },
  { name: 'paymentMethods', field: 'userId' },
  { name: 'pendingReceiptImports', field: 'userId' },
  { name: 'styleEdits', field: 'userId' },
  { name: 'closetShares', field: 'ownerId' },
  { name: 'closetShares', field: 'viewerId' },
];

/** Documents whose id IS the uid. */
const USER_KEYED_DOCS = [
  'users',
  'userProfiles',
  'userSettings',
  'subscriptions',
  'notificationSettings',
  'feedPreferences',
  'stylistSchedules',
  'userReceiptInbox',
];

async function deleteQueryBatch(collectionName: string, field: string, uid: string): Promise<number> {
  let deleted = 0;
  // Batched in pages so a user with thousands of closet items cannot exceed
  // Firestore's 500-writes-per-batch limit or the function's memory.
  for (;;) {
    const snapshot = await db.collection(collectionName).where(field, '==', uid).limit(400).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;

    if (snapshot.size < 400) break;
  }
  return deleted;
}

/**
 * Erases a user's data when their auth account is deleted.
 *
 * Runs as an auth trigger rather than from the client on purpose: deletion has
 * to complete even if the app is closed the instant after the user taps
 * confirm, and a client-side cascade would leave orphaned data behind on every
 * interrupted run. It is also the difference between satisfying the letter of
 * Apple's account-deletion requirement and actually honouring a GDPR/CCPA
 * erasure request.
 *
 * Failures are logged per collection rather than aborting: one failed
 * collection must not strand the remaining thirty.
 */
export const onUserDeleted = functions.auth.user().onDelete(async user => {
  const uid = user.uid;
  console.log(`Erasing data for deleted user ${uid}`);

  let totalDeleted = 0;

  for (const { name, field } of USER_OWNED_COLLECTIONS) {
    try {
      const count = await deleteQueryBatch(name, field, uid);
      totalDeleted += count;
      if (count > 0) console.log(`  ${name}.${field}: ${count}`);
    } catch (error) {
      console.error(`  Failed clearing ${name}.${field}`, error);
    }
  }

  for (const name of USER_KEYED_DOCS) {
    try {
      await db.collection(name).doc(uid).delete();
    } catch (error) {
      console.error(`  Failed deleting ${name}/${uid}`, error);
    }
  }

  // The inbox token is keyed by the token, not the uid, so it needs a lookup
  // rather than a direct delete - otherwise a forwarded receipt could still
  // resolve to a user who no longer exists.
  try {
    const tokens = await db.collection('receiptInboxTokens').where('userId', '==', uid).get();
    await Promise.all(tokens.docs.map(d => d.ref.delete()));
  } catch (error) {
    console.error('  Failed clearing receipt inbox tokens', error);
  }

  // Everything the user uploaded: closet photos, selfies, body shots, receipts,
  // try-on renders. Storage is not covered by Firestore deletion.
  try {
    await admin.storage().bucket().deleteFiles({ prefix: `images/${uid}/` });
    await admin.storage().bucket().deleteFiles({ prefix: `${uid}/` });
  } catch (error) {
    console.error('  Failed clearing Storage files', error);
  }

  console.log(`Erased ${totalDeleted} documents for ${uid}`);
});

// ==================== E-RECEIPT FORWARDING ====================
//
// Users forward order-confirmation emails to a personal address and the
// clothing lines land in their closet. This is the inbound-email webhook.
//
// Setup (Mailgun is the recommended provider - its route forwarding posts
// application/x-www-form-urlencoded, which Firebase parses natively; SendGrid
// Inbound Parse posts multipart/form-data and would need a busboy parser
// added here first):
//
//   1. Point an MX record for a subdomain (e.g. inbox.styled.app) at Mailgun.
//   2. firebase functions:config:set mailgun.signing_key="..."
//   3. Create a Mailgun route matching  match_recipient(".*@inbox.styled.app")
//      with action  forward("https://<region>-<project>.cloudfunctions.net/receiptInbox")
//   4. Deploy: firebase deploy --only functions:receiptInbox
//
// The recipient address carries the user's token: receipts+<token>@inbox...
// Tokens live in receiptInboxTokens/{token} and are minted per user by the app.

/**
 * Verifies Mailgun's HMAC signature.
 *
 * Without this the endpoint is an open door: anyone who learns the URL could
 * post arbitrary "receipts" into any user's closet. Returns false when no
 * signing key is configured rather than defaulting open.
 */
function verifyMailgunSignature(timestamp: string, token: string, signature: string): boolean {
  const signingKey = functions.config().mailgun?.signing_key;
  if (!signingKey || !timestamp || !token || !signature) return false;

  // Reject anything older than 5 minutes so a captured request cannot be replayed.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!isFinite(age) || age > 300) return false;

  const expected = crypto
    .createHmac('sha256', signingKey)
    .update(timestamp + token)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Pulls the inbox token out of a `receipts+<token>@host` recipient address. */
function extractInboxToken(recipient: string): string | null {
  const match = (recipient || '').match(/\+([A-Za-z0-9_-]{8,})@/);
  return match ? match[1] : null;
}

export const receiptInbox = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120 })
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    try {
      const body: any = req.body || {};

      if (!verifyMailgunSignature(body.timestamp, body.token, body.signature)) {
        console.warn('Rejected receipt inbox POST with an invalid signature');
        // 406 tells Mailgun not to retry a request that will never be accepted.
        res.status(406).send('Invalid signature');
        return;
      }

      const recipient: string = body.recipient || body.To || body.to || '';
      const inboxToken = extractInboxToken(recipient);
      if (!inboxToken) {
        console.warn('Receipt inbox POST with no token in recipient:', recipient);
        res.status(406).send('No inbox token');
        return;
      }

      const tokenDoc = await db.collection('receiptInboxTokens').doc(inboxToken).get();
      if (!tokenDoc.exists) {
        console.warn('Receipt inbox POST for unknown token');
        res.status(406).send('Unknown inbox');
        return;
      }
      const userId = (tokenDoc.data() as any).userId as string;

      const subject: string = body.subject || body.Subject || '';
      const emailText: string = body['body-plain'] || body.text || body['stripped-text'] || '';

      if (!emailText.trim()) {
        res.status(200).send('Nothing to parse');
        return;
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `Read this order-confirmation email and extract only the clothing, footwear and accessory lines that were purchased.

Subject: ${subject}

${emailText.slice(0, 12000)}

Rules:
- Ignore shipping, tax, discounts, totals, loyalty points and marketing copy.
- Never invent a line that is not in the email. If nothing was purchased, return an empty items array.
- If a field is absent, use null. Do not guess a brand or colour.
- category must be one of: tops, bottoms, dresses, outerwear, shoes, accessories, bags.
- confidence: "high" only when the line is unambiguous.

Return ONLY valid JSON:
{
  "retailer": "store name or null",
  "purchaseDate": "YYYY-MM-DD or null",
  "items": [{ "description": "as written", "category": "category", "brand": "brand or null", "color": "colour or null", "price": number or null, "confidence": "high"|"medium"|"low" }]
}`,
          },
        ],
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(content);

      const validCategories = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'bags'];
      const items = (Array.isArray(parsed.items) ? parsed.items : [])
        .filter((i: any) => i?.description && validCategories.includes(i.category))
        .map((i: any) => ({
          description: i.description,
          category: i.category,
          brand: i.brand || null,
          color: i.color || null,
          price: typeof i.price === 'number' ? i.price : null,
          confidence: ['high', 'medium', 'low'].includes(i.confidence) ? i.confidence : 'low',
        }));

      if (items.length === 0) {
        console.log('Receipt email had no apparel lines');
        res.status(200).send('No apparel lines');
        return;
      }

      // Staged, never written straight into the closet: an email the user did
      // not expect should not silently add items they have to hunt down later.
      await db.collection('pendingReceiptImports').add({
        userId,
        retailer: parsed.retailer || null,
        purchaseDate: parsed.purchaseDate || null,
        subject,
        items,
        source: 'email',
        status: 'pending',
        createdAt: admin.firestore.Timestamp.now(),
      });

      console.log(`Staged ${items.length} apparel lines from forwarded email for ${userId}`);
      res.status(200).send('OK');
    } catch (error: any) {
      console.error('Error handling receipt inbox POST:', error);
      // 500 so the provider retries - a transient model or Firestore failure
      // should not silently drop the user's receipt.
      res.status(500).send('Error');
    }
  });

// ==================== STYLE EDITS ====================

/**
 * Drafts a set of looks from a client's real closet for a stylist to review.
 *
 * This is the engine behind Edits - the answer to Indyx's Lookbooks. The
 * difference is where the work starts: a stylist there builds every look from
 * scratch, which is why it costs $110-150 and takes days. Here the model does
 * the first pass and the stylist edits, so the human spends their time on
 * judgement rather than assembly.
 *
 * The model never sees a price and is told not to suggest purchases inside a
 * look - an Edit is explicitly about what the client already owns. Anything
 * genuinely missing goes in `gaps`, separately and visibly.
 */
export const draftStyleEdit = functions
  .runWith({ memory: '1GB', timeoutSeconds: 300, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const {
        focus,
        brief,
        lookCount = 10,
        closetItems = [],
        styleProfile,
      }: {
        focus: string;
        brief?: string;
        lookCount: number;
        closetItems: PackingClosetItem[];
        styleProfile?: StoreCheckProfileContext;
      } = data;

      if (!focus) {
        throw new functions.https.HttpsError('invalid-argument', 'focus is required');
      }
      if (closetItems.length < 4) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'An Edit needs at least a few closet items to work with.'
        );
      }

      const profileLines: string[] = [];
      if (styleProfile?.colorSeason) profileLines.push(`Color season: ${styleProfile.colorSeason}.`);
      if (styleProfile?.recommendedColors?.length) {
        profileLines.push(`Colors that work for them: ${styleProfile.recommendedColors.join(', ')}.`);
      }
      if (styleProfile?.bodyType) profileLines.push(`Body/fit type: ${styleProfile.bodyType}.`);
      if (styleProfile?.bodyRecommendedSilhouettes?.length) {
        profileLines.push(`Silhouettes that suit them: ${styleProfile.bodyRecommendedSilhouettes.join(', ')}.`);
      }
      if (styleProfile?.styleArchetypes?.length) {
        profileLines.push(`Style archetypes: ${styleProfile.styleArchetypes.join(', ')}.`);
      }
      if (styleProfile?.avoidRules?.length) {
        profileLines.push(`HARD CONSTRAINT - avoid: ${styleProfile.avoidRules.join(', ')}.`);
      }

      const closetLines = closetItems
        .map(i =>
          `- ${i.id} | ${i.color} ${i.subcategory || i.category} | category: ${i.category}` +
          `${i.style ? ` | style: ${i.style}` : ''}${i.fabricTexture ? ` | fabric: ${i.fabricTexture}` : ''}`
        )
        .join('\n');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `You are a personal stylist drafting an Edit - a set of finished looks built entirely from one client's existing wardrobe. A human stylist will review and adjust your draft before it reaches the client, so be specific and opinionated rather than safe.

The focus of this Edit: ${focus}.
${brief ? `What the client asked for, in their words: "${brief}"` : ''}
${profileLines.length ? `\nAbout them:\n${profileLines.join('\n')}` : ''}

Their closet (use these exact ids):
${closetLines}

Build ${lookCount} distinct looks.

Rules:
- Only use item ids from the list above. Never invent an item.
- Each look needs at least a top and a bottom, or a dress. Add outerwear, shoes and accessories where they genuinely improve it.
- Reuse pieces across looks - that is the point of an Edit, and a wardrobe that works hard is the outcome the client is paying for.
- Every look must be genuinely different. Do not produce two looks that differ only by an accessory.
- rationale: 1-2 sentences on why this works - name the specific reason (proportion, colour relationship, texture contrast, occasion fit). Never use the word "flattering". Never pad with compliments.
- title: a short evocative name, 2-4 words, no emoji.
- Do NOT suggest buying anything inside a look. If something is genuinely missing across the whole Edit, put it in gaps.
- stylistNote: one paragraph to the client about the through-line of this Edit - what you saw in their wardrobe and how you approached it.

Return ONLY valid JSON:
{
  "looks": [{ "title": "string", "itemIds": ["ids"], "occasion": "short label", "rationale": "1-2 sentences" }],
  "gaps": [{ "category": "category", "description": "what's missing", "whyNeeded": "1 sentence" }],
  "stylistNote": "one paragraph"
}`,
          },
        ],
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);

      const validIds = new Set(closetItems.map(i => i.id));
      const looks = (Array.isArray(result.looks) ? result.looks : [])
        .map((look: any, index: number) => ({
          id: `look-${index + 1}`,
          title: look?.title || `Look ${index + 1}`,
          itemIds: Array.isArray(look?.itemIds) ? look.itemIds.filter((id: string) => validIds.has(id)) : [],
          occasion: look?.occasion || '',
          rationale: look?.rationale || '',
        }))
        // A look that lost most of its pieces to id validation is not a look.
        .filter((look: any) => look.itemIds.length >= 2);

      if (looks.length === 0) {
        throw new functions.https.HttpsError('internal', 'The draft produced no usable looks.');
      }

      console.log(`Drafted Edit: ${looks.length} looks from ${closetItems.length} closet items`);

      return {
        success: true,
        data: {
          looks,
          gaps: Array.isArray(result.gaps) ? result.gaps : [],
          stylistNote: result.stylistNote || '',
        },
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error drafting style edit:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== RECEIPT IMPORT ====================

/**
 * Reads a purchase receipt and returns the clothing lines on it, so a new
 * wardrobe can be populated from what someone actually bought instead of
 * photographing every garment one at a time.
 */
export const parseReceipt = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const { imageUrl }: { imageUrl: string } = data;
      if (!imageUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'imageUrl is required');
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Read this purchase receipt and extract only the clothing, footwear and accessory lines.

Rules:
- Ignore tax, shipping, discounts, totals, loyalty points and any non-apparel line.
- Never invent a line that is not printed on the receipt. If you cannot read it, leave it out.
- If a field is not printed, use null. Do not guess a brand or colour that is not there.
- category must be one of: tops, bottoms, dresses, outerwear, shoes, accessories, bags.
- purchaseDate: ISO YYYY-MM-DD if a date is printed, otherwise null.
- confidence: "high" only when the line is clearly legible and unambiguous.

Return ONLY valid JSON:
{
  "retailer": "store name or null",
  "purchaseDate": "YYYY-MM-DD or null",
  "items": [{ "description": "as printed", "category": "category", "brand": "brand or null", "color": "colour or null", "price": number or null, "confidence": "high"|"medium"|"low" }]
}`,
              },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);

      const validCategories = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'bags'];
      const items = (Array.isArray(result.items) ? result.items : [])
        .filter((i: any) => i?.description && validCategories.includes(i.category))
        .map((i: any) => ({
          description: i.description,
          category: i.category,
          brand: i.brand || null,
          color: i.color || null,
          price: typeof i.price === 'number' ? i.price : null,
          confidence: ['high', 'medium', 'low'].includes(i.confidence) ? i.confidence : 'low',
        }));

      console.log(`Parsed receipt: ${items.length} apparel lines from ${result.retailer || 'unknown retailer'}`);

      return {
        success: true,
        data: {
          retailer: result.retailer || null,
          purchaseDate: result.purchaseDate || null,
          items,
        },
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error parsing receipt:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== TRIP PACKING ====================

interface PackingClosetItem {
  id: string;
  category: string;
  subcategory?: string;
  color: string;
  seasons?: string[];
  style?: string;
  fabricTexture?: string;
}

interface PackingForecastDay {
  date: string;
  high: number;
  low: number;
  condition: string;
  precipitationChance: number;
}

/**
 * Builds a packing list as a coverage problem: the fewest pieces from the
 * user's real closet that still dress every day of the trip against the real
 * destination forecast.
 *
 * The model selects item ids and explains each choice; it is explicitly told
 * not to count outfit combinations, because that arithmetic is done
 * deterministically on the client from the ids it returns.
 */
export const generatePackingList = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const {
        destination,
        tripType,
        startDate,
        endDate,
        forecast = [],
        closetItems = [],
        styleProfile,
        notes,
      }: {
        destination: string;
        tripType: string;
        startDate: string;
        endDate: string;
        forecast: PackingForecastDay[];
        closetItems: PackingClosetItem[];
        styleProfile?: StoreCheckProfileContext;
        notes?: string;
      } = data;

      if (!destination || !startDate || !endDate) {
        throw new functions.https.HttpsError('invalid-argument', 'destination, startDate and endDate are required');
      }
      if (closetItems.length === 0) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Add a few items to your closet first - a packing list is built from what you already own.'
        );
      }

      const dayCount = forecast.length || 1;
      const highs = forecast.map(d => d.high);
      const lows = forecast.map(d => d.low);
      const tempLine =
        forecast.length > 0
          ? `Forecast at the destination: ${Math.min(...lows)}-${Math.max(...highs)}°F across ${dayCount} day(s). Day by day: ${forecast
              .map(d => `${d.date} ${d.low}-${d.high}°F ${d.condition}${d.precipitationChance >= 40 ? ` (${d.precipitationChance}% rain)` : ''}`)
              .join('; ')}.`
          : 'No forecast available - pack for mild, variable conditions.';

      const profileLines: string[] = [];
      if (styleProfile?.colorSeason) {
        profileLines.push(`Color season: ${styleProfile.colorSeason}.`);
      }
      if (styleProfile?.bodyType) {
        profileLines.push(`Body/fit type: ${styleProfile.bodyType}.`);
      }
      if (styleProfile?.styleArchetypes?.length) {
        profileLines.push(`Style archetypes: ${styleProfile.styleArchetypes.join(', ')}.`);
      }
      if (styleProfile?.avoidRules?.length) {
        profileLines.push(`HARD CONSTRAINT - avoid: ${styleProfile.avoidRules.join(', ')}.`);
      }

      const closetLines = closetItems
        .map(i =>
          `- ${i.id} | ${i.color} ${i.subcategory || i.category} | category: ${i.category}` +
          `${i.style ? ` | style: ${i.style}` : ''}${i.fabricTexture ? ` | fabric: ${i.fabricTexture}` : ''}` +
          `${i.seasons?.length ? ` | seasons: ${i.seasons.join('/')}` : ''}`
        )
        .join('\n');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `You are packing a suitcase for someone, choosing only from the clothes they already own.

Trip: ${tripType} to ${destination}, ${startDate} to ${endDate} (${dayCount} day(s)).
${tempLine}
${profileLines.length ? `\nAbout them:\n${profileLines.join('\n')}` : ''}
${notes ? `\nTheir own notes about this trip: ${notes}` : ''}

Their closet (use these exact ids):
${closetLines}

Pack the FEWEST pieces that still dress every day and every occasion on this trip. Optimise hard for mix-and-match: prefer neutral bottoms that pair with several tops over one-outfit statement pieces, and prefer layers when the daily range is wide. Respect the forecast - do not pack for weather that is not happening.

Rules:
- Only use item ids from the list above. Never invent an item.
- Assign each packed piece a role: "top", "bottom", "dress", "outerwear", "shoes" or "accessory".
- Do NOT state how many outfits the set makes. That is calculated separately.
- Give every day of the trip a dayPlan referencing packed item ids.
- If something genuinely necessary is missing from their closet, list it under gaps. Do not invent gaps to pad the list - an empty gaps array is a good outcome.
- headline: one warm, specific sentence about the strategy you used (e.g. "Two neutral bottoms carry every top, so three days of meetings and two of sightseeing fit in a carry-on.").

Return ONLY valid JSON:
{
  "items": [{ "itemId": "exact id", "role": "top|bottom|dress|outerwear|shoes|accessory", "reason": "1 short sentence on why this piece earns its place" }],
  "dayPlans": [{ "date": "YYYY-MM-DD", "itemIds": ["ids worn that day"], "occasion": "short label", "note": "1 short sentence tying it to that day's weather or plans" }],
  "gaps": [{ "category": "category", "description": "what's missing", "whyNeeded": "1 sentence" }],
  "headline": "1 sentence"
}`,
          },
        ],
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);

      if (!Array.isArray(result.items) || result.items.length === 0) {
        throw new functions.https.HttpsError('internal', 'Packing list generation did not return any items.');
      }

      // Drop anything hallucinated: only ids that exist in the real closet survive.
      const validIds = new Set(closetItems.map(i => i.id));
      const items = result.items.filter((i: any) => i?.itemId && validIds.has(i.itemId));
      const packedIds = new Set(items.map((i: any) => i.itemId));

      if (items.length === 0) {
        throw new functions.https.HttpsError('internal', 'Packing list referenced no items from your closet.');
      }

      const dayPlans = Array.isArray(result.dayPlans)
        ? result.dayPlans.map((d: any) => ({
            date: d?.date || '',
            itemIds: Array.isArray(d?.itemIds) ? d.itemIds.filter((id: string) => packedIds.has(id)) : [],
            occasion: d?.occasion || '',
            note: d?.note || '',
          }))
        : [];

      console.log(`Packing list for ${destination}: ${items.length} items across ${dayPlans.length} days`);

      return {
        success: true,
        data: {
          items,
          dayPlans,
          gaps: Array.isArray(result.gaps) ? result.gaps : [],
          headline: result.headline || '',
        },
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error generating packing list:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== SCHEDULE-AWARE OUTFIT PLANNING ====================

interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  location?: string;
  allDay?: boolean;
}

/**
 * Assigns an outfit from the user's real closet to each event on their calendar,
 * reading the dress code out of the event itself and checking it against that
 * day's forecast and what they have recently worn.
 */
export const planOutfitsForSchedule = functions
  .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const {
        events = [],
        forecast = [],
        closetItems = [],
        styleProfile,
        recentlyWorn = [],
      }: {
        events: ScheduleEvent[];
        forecast: PackingForecastDay[];
        closetItems: PackingClosetItem[];
        styleProfile?: StoreCheckProfileContext;
        recentlyWorn: string[];
      } = data;

      if (events.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'At least one event is required');
      }
      if (closetItems.length === 0) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Add a few items to your closet first - outfits are built from what you already own.'
        );
      }

      const forecastByDate = new Map(forecast.map(d => [d.date, d]));
      const eventLines = events
        .map(e => {
          const w = forecastByDate.get(e.date);
          return `- ${e.id} | ${e.date}${e.time ? ` ${e.time}` : ''} | "${e.title}"${e.location ? ` at ${e.location}` : ''}` +
            `${w ? ` | weather ${w.low}-${w.high}°F ${w.condition}${w.precipitationChance >= 40 ? `, ${w.precipitationChance}% rain` : ''}` : ''}`;
        })
        .join('\n');

      const closetLines = closetItems
        .map(i => `- ${i.id} | ${i.color} ${i.subcategory || i.category} | category: ${i.category}${i.style ? ` | style: ${i.style}` : ''}`)
        .join('\n');

      const profileLines: string[] = [];
      if (styleProfile?.colorSeason) profileLines.push(`Color season: ${styleProfile.colorSeason}.`);
      if (styleProfile?.bodyType) profileLines.push(`Body/fit type: ${styleProfile.bodyType}.`);
      if (styleProfile?.styleArchetypes?.length) profileLines.push(`Style archetypes: ${styleProfile.styleArchetypes.join(', ')}.`);
      if (styleProfile?.avoidRules?.length) profileLines.push(`HARD CONSTRAINT - avoid: ${styleProfile.avoidRules.join(', ')}.`);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `You are dressing someone for their actual calendar, using only clothes they own.

Their upcoming events:
${eventLines}
${profileLines.length ? `\nAbout them:\n${profileLines.join('\n')}` : ''}
${recentlyWorn.length ? `\nThey wore these item ids in the last few days - avoid repeating them where you reasonably can: ${recentlyWorn.join(', ')}.` : ''}

Their closet (use these exact ids):
${closetLines}

For each event, infer the dress code from the event title, time and location - a 9am "Client kickoff" and a 8pm "Dinner with Sam" are not the same brief. Then build an outfit that suits both that dress code and that day's weather.

Rules:
- Only use item ids from the list above. Never invent an item.
- Every event gets exactly one assignment.
- Each outfit needs at least a top and a bottom, or a dress. Add outerwear when the forecast calls for it.
- dressCode: 2-4 words (e.g. "smart business casual").
- reason: one warm, specific sentence naming why it suits that event and that weather. Never use the word "flattering".

Return ONLY valid JSON:
{
  "assignments": [{ "eventId": "exact id", "date": "YYYY-MM-DD", "itemIds": ["ids"], "dressCode": "short label", "reason": "1 sentence" }]
}`,
          },
        ],
        max_tokens: 1600,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);

      const validIds = new Set(closetItems.map(i => i.id));
      const validEventIds = new Set(events.map(e => e.id));

      const assignments = (Array.isArray(result.assignments) ? result.assignments : [])
        .filter((a: any) => a?.eventId && validEventIds.has(a.eventId))
        .map((a: any) => ({
          eventId: a.eventId,
          date: a.date || events.find(e => e.id === a.eventId)?.date || '',
          itemIds: Array.isArray(a.itemIds) ? a.itemIds.filter((id: string) => validIds.has(id)) : [],
          dressCode: a.dressCode || '',
          reason: a.reason || '',
        }))
        .filter((a: any) => a.itemIds.length > 0);

      if (assignments.length === 0) {
        throw new functions.https.HttpsError('internal', 'Schedule planning returned no usable outfits.');
      }

      console.log(`Planned ${assignments.length} outfits across ${events.length} events`);

      return { success: true, data: { assignments } };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error planning outfits for schedule:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

// ==================== RESALE VALUATION ====================

/**
 * Estimates what a garment would fetch secondhand and drafts the listing.
 *
 * Deliberately returns a range plus an explicit confidence rather than a single
 * number: resale price depends on condition and demand this cannot see, and a
 * confident-looking point estimate would be the wrong shape of answer.
 */
export const estimateResaleValue = functions
  .runWith({ memory: '512MB', timeoutSeconds: 60, enforceAppCheck: false })
  .https.onCall(async (data, context) => {
    try {
      const {
        category,
        subcategory,
        color,
        brand,
        originalPrice,
        wornCount,
        ageMonths,
        condition,
      }: {
        category: string;
        subcategory?: string;
        color?: string;
        brand?: string;
        originalPrice?: number | null;
        wornCount?: number;
        ageMonths?: number | null;
        condition?: string;
      } = data;

      if (!category) {
        throw new functions.https.HttpsError('invalid-argument', 'category is required');
      }

      const facts = [
        `Item: ${color || ''} ${subcategory || category}`.trim(),
        `Category: ${category}`,
        brand ? `Brand: ${brand}` : 'Brand: unbranded or unknown',
        typeof originalPrice === 'number' ? `Original retail price: $${originalPrice.toFixed(2)}` : 'Original price: unknown',
        typeof wornCount === 'number' ? `Worn ${wornCount} time(s)` : 'Wear count unknown',
        typeof ageMonths === 'number' ? `Owned for about ${ageMonths} month(s)` : 'Age unknown',
        condition ? `Stated condition: ${condition}` : 'Condition not stated',
      ].join('\n');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `You value secondhand clothing for a resale marketplace in the United States, in USD.

${facts}

Estimate what this would realistically sell for secondhand today, and draft a listing for it.

Rules:
- Give a range, not a point estimate. Resale depends on condition and demand you cannot verify from this description.
- confidence must honestly reflect how much you actually know: "low" when brand or original price is unknown, since those drive resale value more than anything else.
- If the item is very likely worth less than the effort of listing it, say so plainly in rationale and set suggestedPrice to the low end.
- bestPlatforms: 1-3 real US resale platforms that suit this specific item (e.g. Poshmark, Depop, The RealReal, eBay, Vinted, ThredUp). Match the platform to the item - luxury goes to The RealReal, streetwear to Depop.
- listingTitle: how a good seller would title it - brand, item, color, size placeholder. Under 80 characters.
- listingDescription: 2-3 sentences, honest about wear, no invented details like size or measurements you were not given.

Return ONLY valid JSON:
{
  "estimatedLow": number,
  "estimatedHigh": number,
  "suggestedPrice": number,
  "confidence": "high" | "medium" | "low",
  "rationale": "1-2 sentences explaining the range",
  "bestPlatforms": ["platform"],
  "listingTitle": "string",
  "listingDescription": "string"
}`,
          },
        ],
        max_tokens: 700,
        response_format: { type: 'json_object' },
      });

      let content = response.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(content);

      if (typeof result.estimatedLow !== 'number' || typeof result.estimatedHigh !== 'number') {
        throw new functions.https.HttpsError('internal', 'Resale valuation did not return a usable range.');
      }

      return {
        success: true,
        data: {
          estimatedLow: Math.max(0, Math.round(result.estimatedLow * 100) / 100),
          estimatedHigh: Math.max(0, Math.round(result.estimatedHigh * 100) / 100),
          suggestedPrice: Math.max(0, Math.round((result.suggestedPrice ?? result.estimatedLow) * 100) / 100),
          confidence: ['high', 'medium', 'low'].includes(result.confidence) ? result.confidence : 'low',
          rationale: result.rationale || '',
          bestPlatforms: Array.isArray(result.bestPlatforms) ? result.bestPlatforms.slice(0, 3) : [],
          listingTitle: result.listingTitle || '',
          listingDescription: result.listingDescription || '',
          estimatedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('Error estimating resale value:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

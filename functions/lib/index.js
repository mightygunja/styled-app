"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapAffiliateLink = exports.searchMarketplaceProducts = exports.seedStylists = exports.shopMyCloset = exports.chatWithStylist = exports.findSimilarItems = exports.generateImageEmbedding = exports.analyzeStoreItem = exports.analyzeBodyType = exports.analyzeColorSeason = exports.classifyGarmentImage = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const openai_1 = __importDefault(require("openai"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
// Initialize OpenAI
const openai = new openai_1.default({
    apiKey: functions.config().openai.key,
});
// ==================== AI CLASSIFICATION ====================
exports.classifyGarmentImage = functions
    .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b;
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
        let content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
        // Strip markdown code fences if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const classification = JSON.parse(content);
        console.log('Classification result:', classification);
        return {
            success: true,
            data: classification,
        };
    }
    catch (error) {
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
exports.analyzeColorSeason = functions
    .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b;
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
        let content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(content);
        if (result.error === 'no_face_detected') {
            throw new functions.https.HttpsError('invalid-argument', 'No clear face was detected in the photo. Please try again with a well-lit, front-facing selfie.');
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error analyzing color season:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ==================== BODY & FIT ANALYSIS ====================
const BODY_TYPES = [
    'hourglass', 'topHourglass', 'bottomHourglass',
    'pear', 'invertedTriangle', 'rectangle', 'apple', 'diamond',
];
exports.analyzeBodyType = functions
    .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b;
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
        let content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(content);
        if (result.error === 'no_figure_detected') {
            throw new functions.https.HttpsError('invalid-argument', 'We couldn\'t clearly see a full standing figure in that photo. Please try again with a full-length, front-facing photo.');
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error analyzing body type:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
exports.analyzeStoreItem = functions
    .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b, _c;
    try {
        const { imageUrl, profile } = data;
        if (!imageUrl) {
            throw new functions.https.HttpsError('invalid-argument', 'imageUrl is required');
        }
        console.log('Analyzing store item for:', imageUrl);
        const profileLines = [];
        if (profile === null || profile === void 0 ? void 0 : profile.colorSeason) {
            profileLines.push(`Their color season: ${profile.colorSeason}.`);
            if (profile.recommendedColors && profile.recommendedColors.length > 0) {
                profileLines.push(`Colors that work for them: ${profile.recommendedColors.join(', ')}.`);
            }
            if (profile.colorsToAvoid && profile.colorsToAvoid.length > 0) {
                profileLines.push(`Colors to avoid: ${profile.colorsToAvoid.join(', ')}.`);
            }
        }
        if (profile === null || profile === void 0 ? void 0 : profile.bodyType) {
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
        if ((profile === null || profile === void 0 ? void 0 : profile.styleArchetypes) && profile.styleArchetypes.length > 0) {
            profileLines.push(`Their style archetypes: ${profile.styleArchetypes.join(', ')}.`);
        }
        if ((profile === null || profile === void 0 ? void 0 : profile.avoidRules) && profile.avoidRules.length > 0) {
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
        let content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(content);
        if (!result.classification || !result.overallVerdict) {
            throw new functions.https.HttpsError('internal', 'Store item analysis did not return a valid result.');
        }
        console.log('Store check result:', (_c = result.classification) === null || _c === void 0 ? void 0 : _c.category, result.overallVerdict);
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error analyzing store item:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ==================== IMAGE EMBEDDINGS ====================
// Using OpenAI's text embeddings on image descriptions for similarity
// This is lighter than CLIP and works well for Cloud Functions
async function generateImageDescription(imageUrl) {
    var _a, _b;
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
    return ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
}
exports.generateImageEmbedding = functions
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
    }
    catch (error) {
        console.error('Error generating embedding:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ==================== FIND SIMILAR ITEMS ====================
function cosineSimilarity(embedding1, embedding2) {
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
exports.findSimilarItems = functions
    .runWith({ memory: '1GB', timeoutSeconds: 60, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    try {
        const { itemId, userId, limit = 10, minSimilarity = 0.7 } = data;
        if (!itemId || !userId) {
            throw new functions.https.HttpsError('invalid-argument', 'itemId and userId are required');
        }
        // Get target item
        const targetDoc = await db.collection('closetItems').doc(itemId).get();
        if (!targetDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Item not found');
        }
        const targetItem = targetDoc.data();
        const targetEmbedding = targetItem === null || targetItem === void 0 ? void 0 : targetItem.embedding;
        if (!targetEmbedding || targetEmbedding.length === 0) {
            throw new functions.https.HttpsError('failed-precondition', 'Item does not have an embedding');
        }
        // Get all user's items except the target
        const itemsSnapshot = await db
            .collection('closetItems')
            .where('userId', '==', userId)
            .get();
        const similarItems = [];
        itemsSnapshot.forEach((doc) => {
            if (doc.id === itemId)
                return; // Skip target item
            const item = doc.data();
            const embedding = item.embedding;
            if (embedding && embedding.length > 0) {
                const similarity = cosineSimilarity(targetEmbedding, embedding);
                if (similarity >= minSimilarity) {
                    similarItems.push({
                        item: Object.assign({ id: doc.id }, item),
                        similarity,
                    });
                }
            }
        });
        // Sort by similarity (highest first) and limit
        similarItems.sort((a, b) => b.similarity - a.similarity);
        const limitedItems = similarItems.slice(0, limit);
        return {
            success: true,
            data: limitedItems,
            count: limitedItems.length,
        };
    }
    catch (error) {
        console.error('Error finding similar items:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
exports.chatWithStylist = functions
    .runWith({ memory: '512MB', timeoutSeconds: 60, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b;
    try {
        const { message, history = [], closetItems = [], weather, occasion, mood, styleProfile, timeOfDay, dayType, } = data;
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
                var _a;
                const parts = [
                    `id:${item.id}`,
                    item.category || 'item',
                    item.color || 'unknown color',
                ];
                if (item.brand)
                    parts.push(item.brand);
                if (item.style)
                    parts.push(`${item.style} style`);
                if (item.seasons && item.seasons.length > 0)
                    parts.push(`seasons:${item.seasons.join('/')}`);
                parts.push(`worn ${(_a = item.wornCount) !== null && _a !== void 0 ? _a : 0}x`);
                if (typeof item.daysSinceWorn === 'number') {
                    parts.push(item.daysSinceWorn <= 2
                        ? `worn ${item.daysSinceWorn}d ago (recent)`
                        : `last worn ${item.daysSinceWorn}d ago`);
                }
                else {
                    parts.push('never worn');
                }
                return `- ${parts.join(' | ')}`;
            })
                .join('\n')
            : '(the user has no items in their closet yet)';
        const contextLines = [];
        if (occasion)
            contextLines.push(`Occasion: ${occasion}`);
        if (mood)
            contextLines.push(`User's mood/vibe today: ${mood}`);
        if (weather)
            contextLines.push(`Current weather: ${weather.condition}, ${weather.temperature}°F`);
        if (timeOfDay)
            contextLines.push(`Time of day: ${timeOfDay}`);
        if (dayType)
            contextLines.push(`Day: ${dayType}`);
        const styleProfileLines = [];
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.styleArchetypes) && styleProfile.styleArchetypes.length > 0) {
            styleProfileLines.push(`Their style archetypes: ${styleProfile.styleArchetypes.join(', ')} - lean into these when choosing between options.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.preferredColors) && styleProfile.preferredColors.length > 0) {
            styleProfileLines.push(`Their go-to colors: ${styleProfile.preferredColors.join(', ')} - prefer these when multiple items fit equally well.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.stretchColors) && styleProfile.stretchColors.length > 0) {
            styleProfileLines.push(`Colors they're open to experimenting with: ${styleProfile.stretchColors.join(', ')} - occasionally suggest these to help them stretch, but don't force it.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.avoidRules) && styleProfile.avoidRules.length > 0) {
            styleProfileLines.push(`HARD CONSTRAINT - they explicitly want to avoid: ${styleProfile.avoidRules.join(', ')}. Never recommend items/styles matching these.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.fitHighlight) && styleProfile.fitHighlight.length > 0) {
            styleProfileLines.push(`They like to highlight: ${styleProfile.fitHighlight.join(', ')}.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.fitDownplay) && styleProfile.fitDownplay.length > 0) {
            styleProfileLines.push(`They prefer to downplay: ${styleProfile.fitDownplay.join(', ')}.`);
        }
        const guidanceStyle = {
            inspiration: 'They prefer INSPIRATION over instruction: present 1-2 options and let them choose, keep it light and exploratory.',
            guided: 'They prefer GUIDED advice: give one clear recommendation with a brief explanation of why.',
            directive: 'They prefer DIRECTIVE advice: give one confident, specific pick with minimal hedging - tell them exactly what to wear.',
        }[(styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.guidanceLevel) || 'guided'];
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
- Respect their Style Profile above, especially any HARD CONSTRAINT avoid-list - never violate it.
- Favor items with a lower wear count AND items not worn in the last couple days, when multiple options fit equally well, so the user rotates their closet instead of repeating the same pieces or what they just wore.
- Briefly explain WHY the outfit works (1-2 short sentences covering the most relevant factors: weather/occasion/mood/style), don't just list items.
- Keep replies tight: under 100 words for outfit recommendations, under 60 for quick questions.

Respond with a JSON object shaped exactly like: {"reply": string, "itemIds": string[]}.
- "reply" is your conversational message to show the user. Refer to items by name only (e.g. "the camel coat", "your black boots") - NEVER include an item's id, database key, or any bracketed/parenthetical code in "reply", under any circumstance.
- "itemIds" is the ONLY place item ids belong: list every real closet item id you recommended in "reply" (from the inventory above only). Use an empty array if you didn't recommend specific owned items (e.g. general advice, greetings, shopping suggestions).`;
        const messages = [
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
        const raw = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
        let reply = "Sorry, I couldn't come up with a response. Please try again.";
        let itemIds = [];
        try {
            const parsed = JSON.parse(raw);
            reply = typeof parsed.reply === 'string' ? parsed.reply : reply;
            itemIds = Array.isArray(parsed.itemIds)
                ? parsed.itemIds.filter((id) => typeof id === 'string' && closetItems.some((item) => item.id === id))
                : [];
        }
        catch (parseError) {
            console.error('Failed to parse model JSON output:', raw, parseError);
        }
        return {
            success: true,
            reply,
            itemIds,
        };
    }
    catch (error) {
        console.error('Error in chatWithStylist:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ==================== SHOP MY CLOSET ====================
exports.shopMyCloset = functions
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
        let lookEmbedding = look === null || look === void 0 ? void 0 : look.embedding;
        // Generate embedding if doesn't exist
        if (!lookEmbedding || lookEmbedding.length === 0) {
            console.log('Generating embedding for look:', lookId);
            // Generate description and embedding
            const description = await generateImageDescription(look === null || look === void 0 ? void 0 : look.imageUrl);
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
        const similarItems = [];
        itemsSnapshot.forEach((doc) => {
            const item = doc.data();
            const embedding = item.embedding;
            if (embedding && embedding.length > 0) {
                const similarity = cosineSimilarity(lookEmbedding, embedding);
                if (similarity >= minSimilarity) {
                    similarItems.push({
                        item: Object.assign({ id: doc.id }, item),
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
                title: look === null || look === void 0 ? void 0 : look.title,
                imageUrl: look === null || look === void 0 ? void 0 : look.imageUrl,
            },
        };
    }
    catch (error) {
        console.error('Error in shop my closet:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ==================== STYLIST MARKETPLACE SEED ====================
// One-time (idempotent) seed of the stylists catalog into Firestore. Safe to
// call more than once - it upserts by fixed doc ID rather than appending.
// Not wired to any client button; invoke once via `firebase functions:shell`
// or a direct callable-function invocation after deploy.
const SEED_STYLISTS = {
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
exports.seedStylists = functions
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
function getSovrnConfig() {
    const cfg = functions.config().sovrn;
    if (!(cfg === null || cfg === void 0 ? void 0 : cfg.key) || !(cfg === null || cfg === void 0 ? void 0 : cfg.pubid))
        return null;
    return { key: cfg.key, pubId: cfg.pubid };
}
exports.searchMarketplaceProducts = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    const sovrn = getSovrnConfig();
    if (!sovrn) {
        throw new functions.https.HttpsError('failed-precondition', 'Sovrn Commerce is not configured yet. Set sovrn.key and sovrn.pubid via firebase functions:config:set, then implement the product search call in searchMarketplaceProducts.');
    }
    // TODO: call Sovrn's Product Search API with `data.query`/`data.category`/
    // `data.maxPrice`/`data.onSaleOnly`, map the response into Product[]
    // (see src/models/product.ts on the client for the exact shape expected).
    throw new functions.https.HttpsError('unimplemented', 'Sovrn product search not yet implemented.');
});
exports.wrapAffiliateLink = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    const sovrn = getSovrnConfig();
    if (!sovrn) {
        throw new functions.https.HttpsError('failed-precondition', 'Sovrn Commerce is not configured yet. Set sovrn.key and sovrn.pubid via firebase functions:config:set, then implement the link-wrapping call in wrapAffiliateLink.');
    }
    const { sourceUrl } = data;
    if (!sourceUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'sourceUrl is required');
    }
    // TODO: call Sovrn's link-wrapping endpoint with sourceUrl + pubId/key,
    // return the resulting monetized redirect URL as { wrappedUrl }.
    throw new functions.https.HttpsError('unimplemented', 'Sovrn link wrapping not yet implemented.');
});
//# sourceMappingURL=index.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateResaleValue = exports.planOutfitsForSchedule = exports.generatePackingList = exports.parseReceipt = exports.draftStyleEdit = exports.receiptInbox = exports.onUserDeleted = exports.seedChallenges = exports.rotateChallenges = exports.renderTryOn = exports.removeGarmentBackground = exports.wrapAffiliateLink = exports.searchRakutenProducts = exports.searchMarketplaceProducts = exports.seedStylists = exports.shopMyCloset = exports.chatWithStylist = exports.findSimilarItems = exports.generateImageEmbedding = exports.analyzeStoreItem = exports.analyzeBodyType = exports.analyzeColorSeason = exports.classifyGarmentImage = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const fast_xml_parser_1 = require("fast-xml-parser");
const openai_1 = __importStar(require("openai"));
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
    var _a, _b, _c, _d, _e, _f, _g;
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
        // AI-derived color season analysis is the authoritative color signal when present -
        // it's a real seasonal-color-analysis result, more precise than the hand-picked
        // go-to colors below, so state it first and have it take priority.
        if (styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.colorSeason) {
            const undertoneNote = styleProfile.undertone ? ` (${styleProfile.undertone} undertone)` : '';
            styleProfileLines.push(`Their AI color season analysis: ${styleProfile.colorSeason}${undertoneNote}. This is their authoritative color guidance - prioritize it over generic color preference below.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.seasonalPalette) && styleProfile.seasonalPalette.length > 0) {
            styleProfileLines.push(`Colors that flatter their season: ${styleProfile.seasonalPalette.join(', ')} - strongly prefer these.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.colorsToAvoid) && styleProfile.colorsToAvoid.length > 0) {
            styleProfileLines.push(`Colors that clash with their season: ${styleProfile.colorsToAvoid.join(', ')} - avoid recommending these unless nothing else in their closet works.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.preferredColors) && styleProfile.preferredColors.length > 0) {
            styleProfileLines.push(`Their go-to colors: ${styleProfile.preferredColors.join(', ')} - prefer these when multiple items fit equally well${styleProfile.colorSeason ? ' and the color season guidance above doesn\'t decide it' : ''}.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.stretchColors) && styleProfile.stretchColors.length > 0) {
            styleProfileLines.push(`Colors they're open to experimenting with: ${styleProfile.stretchColors.join(', ')} - occasionally suggest these to help them stretch, but don't force it.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.avoidRules) && styleProfile.avoidRules.length > 0) {
            styleProfileLines.push(`HARD CONSTRAINT - they explicitly want to avoid: ${styleProfile.avoidRules.join(', ')}. Never recommend items/styles matching these.`);
        }
        // AI/quiz-derived body & fit analysis - concrete per-category silhouette guidance,
        // more actionable than the flat highlight/downplay list below.
        if (styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.bodyType) {
            styleProfileLines.push(`Their body type analysis: ${styleProfile.bodyType}. Use the silhouette and per-category guidance below to steer fit choices, not just color/style.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.recommendedSilhouettes) && styleProfile.recommendedSilhouettes.length > 0) {
            styleProfileLines.push(`Silhouettes that work well for them: ${styleProfile.recommendedSilhouettes.join(', ')}.`);
        }
        if (styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.categoryGuidance) {
            const cg = styleProfile.categoryGuidance;
            const cgLines = [];
            if ((_a = cg.tops) === null || _a === void 0 ? void 0 : _a.length)
                cgLines.push(`tops - ${cg.tops.join('; ')}`);
            if ((_b = cg.bottoms) === null || _b === void 0 ? void 0 : _b.length)
                cgLines.push(`bottoms - ${cg.bottoms.join('; ')}`);
            if ((_c = cg.dresses) === null || _c === void 0 ? void 0 : _c.length)
                cgLines.push(`dresses - ${cg.dresses.join('; ')}`);
            if ((_d = cg.shoes) === null || _d === void 0 ? void 0 : _d.length)
                cgLines.push(`shoes - ${cg.shoes.join('; ')}`);
            if ((_e = cg.outerwear) === null || _e === void 0 ? void 0 : _e.length)
                cgLines.push(`outerwear - ${cg.outerwear.join('; ')}`);
            if (cgLines.length > 0) {
                styleProfileLines.push(`Fit guidance by category:\n${cgLines.map(l => `  - ${l}`).join('\n')}`);
            }
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.bodyHighlight) && styleProfile.bodyHighlight.length > 0) {
            styleProfileLines.push(`They like to highlight: ${styleProfile.bodyHighlight.join(', ')}.`);
        }
        else if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.fitHighlight) && styleProfile.fitHighlight.length > 0) {
            styleProfileLines.push(`They like to highlight: ${styleProfile.fitHighlight.join(', ')}.`);
        }
        if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.bodyDownplay) && styleProfile.bodyDownplay.length > 0) {
            styleProfileLines.push(`They prefer to downplay: ${styleProfile.bodyDownplay.join(', ')}.`);
        }
        else if ((styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.fitDownplay) && styleProfile.fitDownplay.length > 0) {
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
- If they have a color season analysis, use it as the primary color filter for picks - items in their flattering palette outrank items in their generic go-to colors, and items in their "colors to avoid" list should only be picked if nothing else in the relevant category works.
- If they have a body type / fit analysis, use the per-category fit guidance (necklines, cuts, silhouettes) to choose between otherwise-similar items, not just color or style-archetype fit.
- Respect their Style Profile above, especially any HARD CONSTRAINT avoid-list - never violate it.
- Favor items with a lower wear count AND items not worn in the last couple days, when multiple options fit equally well, so the user rotates their closet instead of repeating the same pieces or what they just wore.
- Briefly explain WHY the outfit works (1-2 short sentences covering the most relevant factors: weather/occasion/mood/color season/fit), don't just list items.
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
        const raw = ((_g = (_f = response.choices[0]) === null || _f === void 0 ? void 0 : _f.message) === null || _g === void 0 ? void 0 : _g.content) || '{}';
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
    // pubid is optional: Sovrn's link format authenticates on `key` alone. It is
    // still read so an existing config keeps working and so a publisher id can be
    // threaded through as `cuid` for attribution if you want it later.
    if (!(cfg === null || cfg === void 0 ? void 0 : cfg.key))
        return null;
    return { key: cfg.key, pubId: cfg.pubid || '' };
}
const SOVRN_PRODUCTS_URL = 'https://shopping-gallery.prd-commerce.sovrnservices.com/ai-orchestration/products';
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
function buildRecommendationContent(data) {
    const parts = [];
    if (data.query)
        parts.push(data.query);
    if (data.category)
        parts.push(`Category: ${data.category}.`);
    if (data.subcategory)
        parts.push(`Specifically ${data.subcategory}.`);
    if (Array.isArray(data.colors) && data.colors.length) {
        parts.push(`Colours that suit them: ${data.colors.join(', ')}.`);
    }
    if (Array.isArray(data.styleArchetypes) && data.styleArchetypes.length) {
        parts.push(`Their style reads ${data.styleArchetypes.join(' and ')}.`);
    }
    if (Array.isArray(data.silhouettes) && data.silhouettes.length) {
        parts.push(`Cuts that work for them: ${data.silhouettes.join(', ')}.`);
    }
    if (data.condition === 'secondhand')
        parts.push('Prefer secondhand or resale listings.');
    if (data.onSaleOnly)
        parts.push('Prefer items currently on sale.');
    const content = parts.join(' ').trim();
    // Never send an empty brief - the endpoint requires content, and a blank
    // string would return arbitrary products presented as recommendations.
    return content || 'Everyday wardrobe staples in versatile neutral colours.';
}
/** Sovrn's `priceRange` uses "min-max" with `*` for an open end. */
function buildPriceRange(minPrice, maxPrice) {
    if (typeof minPrice !== 'number' && typeof maxPrice !== 'number')
        return undefined;
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
function mapSovrnProduct(raw, requestedCategory) {
    const price = typeof raw.salePrice === 'number' ? raw.salePrice : raw.retailPrice;
    if (typeof price !== 'number' || !raw.name)
        return null;
    const onSale = typeof raw.retailPrice === 'number' &&
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
exports.searchMarketplaceProducts = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    const sovrn = getSovrnConfig();
    if (!sovrn) {
        throw new functions.https.HttpsError('failed-precondition', 'Sovrn Commerce is not configured yet. Set sovrn.key and sovrn.pubid via firebase functions:config:set, then implement the product search call in searchMarketplaceProducts.');
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
        if (priceRange)
            params.set('priceRange', priceRange);
        if (data.market)
            params.set('market', data.market);
        if (data.cuid)
            params.set('cuid', data.cuid);
        const response = await fetch(`${SOVRN_PRODUCTS_URL}?${params.toString()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({ content: buildRecommendationContent(data) }, (data.title ? { title: data.title } : {}))),
        });
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            console.error('Sovrn product request failed', response.status, detail.slice(0, 400));
            throw new functions.https.HttpsError('unavailable', `Sovrn returned ${response.status}. ${detail.slice(0, 200)}`);
        }
        const payload = await response.json();
        // The docs describe a bare array, but tolerate the common wrapper shapes
        // rather than silently returning nothing if their envelope differs.
        const rawProducts = Array.isArray(payload)
            ? payload
            : (payload === null || payload === void 0 ? void 0 : payload.products) || (payload === null || payload === void 0 ? void 0 : payload.data) || (payload === null || payload === void 0 ? void 0 : payload.results);
        if (!Array.isArray(rawProducts)) {
            // Fail loudly. A silent empty result here would look exactly like "no
            // matches" and could sit unnoticed for weeks.
            console.error('Unexpected Sovrn response shape:', JSON.stringify(payload).slice(0, 500));
            throw new functions.https.HttpsError('internal', 'Sovrn returned an unexpected response shape. Check the mapping in searchMarketplaceProducts.');
        }
        const products = rawProducts
            .map(p => mapSovrnProduct(p, data.category))
            .filter((p) => p !== null)
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
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
function getRakutenConfig() {
    const cfg = functions.config().rakuten;
    if (!(cfg === null || cfg === void 0 ? void 0 : cfg.client_id) || !(cfg === null || cfg === void 0 ? void 0 : cfg.client_secret) || !(cfg === null || cfg === void 0 ? void 0 : cfg.sid))
        return null;
    return { clientId: cfg.client_id, clientSecret: cfg.client_secret, sid: cfg.sid };
}
/**
 * Rakuten access tokens are valid for hours, so one is cached in module scope
 * and reused across invocations that land on a warm instance. Re-authenticating
 * on every search would add a round trip to every page of results.
 */
let rakutenToken = null;
async function getRakutenToken(cfg) {
    if (rakutenToken && Date.now() < rakutenToken.expiresAt - 60000) {
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
        throw new functions.https.HttpsError('unauthenticated', `Rakuten token request failed (${response.status}). ${detail.slice(0, 200)}`);
    }
    const payload = await response.json();
    const token = payload.access_token;
    if (!token) {
        throw new functions.https.HttpsError('internal', 'Rakuten token response contained no access_token.');
    }
    const ttlSeconds = Number(payload.expires_in) || 3600;
    rakutenToken = { value: token, expiresAt: Date.now() + ttlSeconds * 1000 };
    return token;
}
/** Rakuten prices arrive as either a bare value or `{ '#text': n, '@_currency': 'USD' }`. */
function rakutenPrice(node) {
    var _a;
    if (node === undefined || node === null)
        return { amount: null, currency: 'USD' };
    if (typeof node === 'number')
        return { amount: node, currency: 'USD' };
    if (typeof node === 'string') {
        const parsed = parseFloat(node);
        return { amount: isNaN(parsed) ? null : parsed, currency: 'USD' };
    }
    const raw = (_a = node['#text']) !== null && _a !== void 0 ? _a : node.value;
    const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw));
    return {
        amount: isNaN(parsed) ? null : parsed,
        currency: String(node['@_currency'] || 'USD').toUpperCase(),
    };
}
function textOf(node) {
    var _a;
    if (node === undefined || node === null)
        return '';
    if (typeof node === 'string' || typeof node === 'number')
        return String(node);
    return String((_a = node['#text']) !== null && _a !== void 0 ? _a : '');
}
exports.searchRakutenProducts = functions
    .runWith({ memory: '512MB', timeoutSeconds: 30, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    const cfg = getRakutenConfig();
    if (!cfg) {
        throw new functions.https.HttpsError('failed-precondition', 'Rakuten Advertising is not configured. Set rakuten.client_id, rakuten.client_secret and rakuten.sid via firebase functions:config:set.');
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
        if (data.category)
            params.set('cat', String(data.category));
        if (typeof data.maxPrice === 'number')
            params.set('maxprice', String(Math.ceil(data.maxPrice)));
        if (typeof data.minPrice === 'number')
            params.set('minprice', String(Math.floor(data.minPrice)));
        const response = await fetch(`${RAKUTEN_ENDPOINTS.productSearch}?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/xml' },
        });
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            // A 401 here usually means the cached token went stale early; clear it
            // so the next call re-authenticates rather than failing repeatedly.
            if (response.status === 401)
                rakutenToken = null;
            throw new functions.https.HttpsError('unavailable', `Rakuten returned ${response.status}. ${detail.slice(0, 200)}`);
        }
        const xml = await response.text();
        const parser = new fast_xml_parser_1.XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        const parsed = parser.parse(xml);
        let node = parsed;
        for (const key of RAKUTEN_FIELDS.itemPath) {
            node = node === null || node === void 0 ? void 0 : node[key];
        }
        // A single result parses to an object rather than an array.
        const items = Array.isArray(node) ? node : node ? [node] : [];
        if (items.length === 0) {
            // Distinguish "no matches" from "we misread the response". If the
            // payload clearly contained products but our path missed them, that is
            // a mapping bug and must not look like an empty search.
            if (/<item[\s>]/i.test(xml)) {
                console.error('Rakuten XML contained items but itemPath missed them:', xml.slice(0, 600));
                throw new functions.https.HttpsError('internal', 'Rakuten response shape did not match RAKUTEN_FIELDS.itemPath. Correct the mapping in searchRakutenProducts.');
            }
            return { products: [], hasMore: false, totalCount: 0 };
        }
        const products = items
            .map(item => {
            var _a;
            const price = rakutenPrice(item[RAKUTEN_FIELDS.price]);
            const sale = rakutenPrice(item[RAKUTEN_FIELDS.salePrice]);
            const name = textOf(item[RAKUTEN_FIELDS.productName]);
            const link = textOf(item[RAKUTEN_FIELDS.linkUrl]);
            // Sale price of 0 means "not on sale" in this feed, not "free".
            const effective = sale.amount && sale.amount > 0 ? sale.amount : price.amount;
            if (!name || !link || effective === null)
                return null;
            const onSale = sale.amount !== null && sale.amount > 0 && price.amount !== null && price.amount > sale.amount;
            return {
                id: `rakuten-${textOf(item[RAKUTEN_FIELDS.merchantId])}-${textOf(item[RAKUTEN_FIELDS.sku])}`,
                name,
                // Rakuten gives a merchant, not a manufacturer brand. Using it as
                // the retailer is accurate; using it as the brand would not be.
                brand: '',
                retailer: textOf(item[RAKUTEN_FIELDS.merchantName]),
                category: data.category || 'tops',
                price: effective,
                originalPrice: onSale ? (_a = price.amount) !== null && _a !== void 0 ? _a : undefined : undefined,
                currency: price.currency || 'USD',
                imageUrl: textOf(item[RAKUTEN_FIELDS.imageUrl]),
                // linkurl is already the tracking link, so it needs no further wrap.
                sourceUrl: link,
                inStock: true,
            };
        })
            .filter((p) => p !== null);
        console.log(`Rakuten returned ${items.length} items, ${products.length} usable`);
        return {
            products,
            hasMore: items.length >= Math.min(100, data.pageSize || 24),
            totalCount: null,
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error calling Rakuten product search:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
exports.wrapAffiliateLink = functions
    .runWith({ memory: '256MB', timeoutSeconds: 30, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    const sovrn = getSovrnConfig();
    if (!sovrn) {
        throw new functions.https.HttpsError('failed-precondition', 'Sovrn Commerce is not configured yet. Set sovrn.key and sovrn.pubid via firebase functions:config:set, then implement the link-wrapping call in wrapAffiliateLink.');
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
    if (cuid)
        params.set('cuid', String(cuid).slice(0, 2048));
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
async function fetchAsUploadable(imageUrl, filename) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new functions.https.HttpsError('invalid-argument', `Could not read image at ${imageUrl}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return (0, openai_1.toFile)(buffer, filename, { type: 'image/png' });
}
/**
 * Cuts a garment out of its background and returns it on transparency.
 *
 * Returns base64 rather than writing to Storage: the client already has a
 * proven upload path (uploadImageToFirebase) with the right security rules, and
 * routing the write through it keeps bucket permissions in one place.
 */
exports.removeGarmentBackground = functions
    .runWith({ memory: '1GB', timeoutSeconds: 300, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b;
    try {
        const { imageUrl } = data;
        if (!imageUrl) {
            throw new functions.https.HttpsError('invalid-argument', 'imageUrl is required');
        }
        const file = await fetchAsUploadable(imageUrl, 'garment.png');
        const result = await openai.images.edit({
            model: 'gpt-image-1',
            image: file,
            prompt: 'Isolate only the clothing item in this photo on a fully transparent background. ' +
                'Remove the person, hanger, floor, and every background element. Keep the garment ' +
                'exactly as it is - do not restyle it, recolour it, change its pattern, or alter its ' +
                'shape. Preserve the original fabric texture and true colour. Present it flat and ' +
                'centred, as a clean catalogue cutout.',
            background: 'transparent',
            size: '1024x1024',
        });
        const b64 = (_b = (_a = result.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.b64_json;
        if (!b64) {
            throw new functions.https.HttpsError('internal', 'Background removal returned no image.');
        }
        console.log('Removed background for:', imageUrl);
        return { success: true, data: { imageBase64: `data:image/png;base64,${b64}` } };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
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
exports.renderTryOn = functions
    .runWith({ memory: '1GB', timeoutSeconds: 300, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b;
    try {
        const { personImageUrl, garmentDescriptions = [], } = data;
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
            prompt: `Show this exact person wearing the following outfit: ${garmentDescriptions.join('; ')}. ` +
                'Keep their face, hair, skin tone, body proportions and pose completely unchanged - ' +
                'this must still clearly be the same person. Replace only their clothing. Render the ' +
                'garments realistically with natural fabric drape and lighting consistent with the ' +
                'original photo. Keep the background simple and neutral.',
            size: '1024x1536',
        });
        const b64 = (_b = (_a = result.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.b64_json;
        if (!b64) {
            throw new functions.https.HttpsError('internal', 'Try-on render returned no image.');
        }
        console.log('Rendered try-on with', garmentDescriptions.length, 'garments');
        return { success: true, data: { imageBase64: `data:image/png;base64,${b64}` } };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error rendering try-on:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
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
        description: 'Pick the hardest-working item in your closet and show five genuinely different outfits built around it. Bonus points if two of them are for completely different occasions.',
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
        description: 'Build an outfit entirely from pieces you have not worn in the last three months. The ones you forgot you owned are usually the most interesting.',
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
        description: 'Cream, camel, charcoal, bone. Prove a restricted palette is a discipline rather than a limitation - texture and silhouette have to do all the work.',
        rules: ['Neutrals only', 'No accent colours', 'Texture is your friend'],
    },
    {
        slug: 'lowest-cost-per-wear',
        title: 'Your lowest cost-per-wear',
        type: 'monthly',
        prize: 'Featured on the community feed',
        hashtags: ['costperwear', 'value'],
        description: 'An outfit made only from the pieces you wear most. Share the cost-per-wear if you have it - the best answers here are usually the oldest things you own.',
        rules: ['Only your most-worn pieces', 'Share the cost-per-wear if you track it'],
    },
    {
        slug: 'one-colour-head-to-toe',
        title: 'One colour, head to toe',
        type: 'weekly',
        prize: 'Featured on the community feed',
        hashtags: ['monochrome', 'colour'],
        description: 'Commit to one colour for the whole outfit. The trick is varying the shade and texture so it reads considered rather than uniform.',
        rules: ['A single colour family', 'Vary the shade and texture', 'Neutrals count as a colour'],
    },
    {
        slug: 'secondhand-only',
        title: 'Secondhand only',
        type: 'monthly',
        prize: 'Featured on the community feed',
        hashtags: ['secondhand', 'sustainability'],
        description: 'An outfit where nothing was bought new. Tell us where you found the best piece - half the pleasure is in the hunt.',
        rules: ['Nothing bought new', 'Name where you found it'],
    },
    {
        slug: 'dress-for-the-weather',
        title: 'Dress for the actual weather',
        type: 'daily',
        prize: 'Featured on the community feed',
        hashtags: ['dressfortheweather', 'practical'],
        description: 'No styling for an imaginary climate. Whatever it is doing outside your window right now - dress for that, and make it look good anyway.',
        rules: ['Must suit the real weather where you are today', 'Say what it is doing outside'],
    },
    {
        slug: 'carry-on-only',
        title: 'Carry-on only',
        type: 'monthly',
        prize: 'Featured on the community feed',
        hashtags: ['carryononly', 'travel'],
        description: 'Nine pieces, seven days, one bag. Show the pieces and how they recombine - this is the closest thing styling has to a puzzle.',
        rules: ['Nine pieces maximum', 'Show at least five outfits from them'],
    },
    {
        slug: 'oldest-thing-you-own',
        title: 'The oldest thing you own',
        type: 'weekly',
        prize: 'Featured on the community feed',
        hashtags: ['oldestthingyouown', 'longevity'],
        description: 'Build a look around the piece you have had longest. Anything that survived that many wardrobe clear-outs has earned its place.',
        rules: ['Feature your longest-owned piece', 'Tell us how long you have had it'],
    },
    {
        slug: 'texture-over-pattern',
        title: 'Texture over pattern',
        type: 'weekly',
        prize: 'Featured on the community feed',
        hashtags: ['textureoverpattern', 'craft'],
        description: 'Knit, suede, denim, silk, corduroy. Make an outfit interesting without a single print in it.',
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
async function rotateChallengesNow() {
    const now = new Date();
    const nowIso = now.toISOString();
    const collection = db.collection('challenges');
    // Remove anything written in the old, unreadable shape. Those documents can
    // never be returned by getChallenges(), so leaving them would both hide them
    // from users and block new ones being created for the same slug.
    let repaired = 0;
    const all = await collection.get();
    for (const doc of all.docs) {
        const data = doc.data();
        if (!data.startDate || !data.type) {
            await doc.ref.delete();
            repaired++;
        }
    }
    const live = await collection.where('status', 'in', ['active', 'upcoming']).get();
    let retired = 0;
    let promoted = 0;
    for (const doc of live.docs) {
        const data = doc.data();
        if (data.endDate && data.endDate < nowIso) {
            await doc.ref.update({ status: 'completed' });
            retired++;
        }
        else if (data.status === 'upcoming' && data.startDate && data.startDate <= nowIso) {
            await doc.ref.update({ status: 'active' });
            promoted++;
        }
    }
    const stillLive = await collection.where('status', 'in', ['active', 'upcoming']).get();
    const activeCount = stillLive.docs.filter(d => d.data().status === 'active').length;
    const upcomingCount = stillLive.docs.filter(d => d.data().status === 'upcoming').length;
    const activeNeeded = Math.max(0, TARGET_ACTIVE - activeCount);
    const needed = activeNeeded + Math.max(0, TARGET_UPCOMING - upcomingCount);
    if (needed === 0) {
        return { retired, promoted, created: 0, repaired };
    }
    // Cursor into the pool so challenges cycle rather than repeating. Stored
    // rather than derived, so adding to the pool never replays old ones.
    const cursorRef = db.collection('challengeRotation').doc('state');
    const cursorDoc = await cursorRef.get();
    let cursor = cursorDoc.exists ? cursorDoc.data().cursor || 0 : 0;
    // Never re-open something already running.
    const liveSlugs = new Set(stillLive.docs.map(d => d.data().slug).filter(Boolean));
    let created = 0;
    for (let attempt = 0; attempt < CHALLENGE_POOL.length && created < needed; attempt++) {
        const template = CHALLENGE_POOL[cursor % CHALLENGE_POOL.length];
        cursor++;
        if (liveSlugs.has(template.slug))
            continue;
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
exports.rotateChallenges = functions
    .runWith({ memory: '256MB', timeoutSeconds: 120 })
    .pubsub.schedule('every 24 hours')
    .timeZone('America/Chicago')
    .onRun(async () => {
    const result = await rotateChallengesNow();
    console.log(`Challenge rotation: ${result.repaired} malformed removed, ${result.retired} retired, ${result.promoted} promoted, ${result.created} created`);
    return null;
});
/**
 * Manual trigger for the same logic, so the board can be filled immediately
 * rather than waiting for the first scheduled run.
 */
exports.seedChallenges = functions
    .runWith({ memory: '256MB', timeoutSeconds: 120, enforceAppCheck: false })
    .https.onCall(async () => {
    const result = await rotateChallengesNow();
    console.log(`Manual challenge seed: ${result.repaired} malformed removed, ${result.retired} retired, ${result.promoted} promoted, ${result.created} created`);
    return Object.assign({ success: true }, result);
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
const USER_OWNED_COLLECTIONS = [
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
async function deleteQueryBatch(collectionName, field, uid) {
    let deleted = 0;
    // Batched in pages so a user with thousands of closet items cannot exceed
    // Firestore's 500-writes-per-batch limit or the function's memory.
    for (;;) {
        const snapshot = await db.collection(collectionName).where(field, '==', uid).limit(400).get();
        if (snapshot.empty)
            break;
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        deleted += snapshot.size;
        if (snapshot.size < 400)
            break;
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
exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
    const uid = user.uid;
    console.log(`Erasing data for deleted user ${uid}`);
    let totalDeleted = 0;
    for (const { name, field } of USER_OWNED_COLLECTIONS) {
        try {
            const count = await deleteQueryBatch(name, field, uid);
            totalDeleted += count;
            if (count > 0)
                console.log(`  ${name}.${field}: ${count}`);
        }
        catch (error) {
            console.error(`  Failed clearing ${name}.${field}`, error);
        }
    }
    for (const name of USER_KEYED_DOCS) {
        try {
            await db.collection(name).doc(uid).delete();
        }
        catch (error) {
            console.error(`  Failed deleting ${name}/${uid}`, error);
        }
    }
    // The inbox token is keyed by the token, not the uid, so it needs a lookup
    // rather than a direct delete - otherwise a forwarded receipt could still
    // resolve to a user who no longer exists.
    try {
        const tokens = await db.collection('receiptInboxTokens').where('userId', '==', uid).get();
        await Promise.all(tokens.docs.map(d => d.ref.delete()));
    }
    catch (error) {
        console.error('  Failed clearing receipt inbox tokens', error);
    }
    // Everything the user uploaded: closet photos, selfies, body shots, receipts,
    // try-on renders. Storage is not covered by Firestore deletion.
    try {
        await admin.storage().bucket().deleteFiles({ prefix: `images/${uid}/` });
        await admin.storage().bucket().deleteFiles({ prefix: `${uid}/` });
    }
    catch (error) {
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
function verifyMailgunSignature(timestamp, token, signature) {
    var _a;
    const signingKey = (_a = functions.config().mailgun) === null || _a === void 0 ? void 0 : _a.signing_key;
    if (!signingKey || !timestamp || !token || !signature)
        return false;
    // Reject anything older than 5 minutes so a captured request cannot be replayed.
    const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!isFinite(age) || age > 300)
        return false;
    const expected = crypto
        .createHmac('sha256', signingKey)
        .update(timestamp + token)
        .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
/** Pulls the inbox token out of a `receipts+<token>@host` recipient address. */
function extractInboxToken(recipient) {
    const match = (recipient || '').match(/\+([A-Za-z0-9_-]{8,})@/);
    return match ? match[1] : null;
}
exports.receiptInbox = functions
    .runWith({ memory: '1GB', timeoutSeconds: 120 })
    .https.onRequest(async (req, res) => {
    var _a, _b;
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    try {
        const body = req.body || {};
        if (!verifyMailgunSignature(body.timestamp, body.token, body.signature)) {
            console.warn('Rejected receipt inbox POST with an invalid signature');
            // 406 tells Mailgun not to retry a request that will never be accepted.
            res.status(406).send('Invalid signature');
            return;
        }
        const recipient = body.recipient || body.To || body.to || '';
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
        const userId = tokenDoc.data().userId;
        const subject = body.subject || body.Subject || '';
        const emailText = body['body-plain'] || body.text || body['stripped-text'] || '';
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
        let content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(content);
        const validCategories = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'bags'];
        const items = (Array.isArray(parsed.items) ? parsed.items : [])
            .filter((i) => (i === null || i === void 0 ? void 0 : i.description) && validCategories.includes(i.category))
            .map((i) => ({
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
    }
    catch (error) {
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
exports.draftStyleEdit = functions
    .runWith({ memory: '1GB', timeoutSeconds: 300, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { focus, brief, lookCount = 10, closetItems = [], styleProfile, } = data;
        if (!focus) {
            throw new functions.https.HttpsError('invalid-argument', 'focus is required');
        }
        if (closetItems.length < 4) {
            throw new functions.https.HttpsError('failed-precondition', 'An Edit needs at least a few closet items to work with.');
        }
        const profileLines = [];
        if (styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.colorSeason)
            profileLines.push(`Color season: ${styleProfile.colorSeason}.`);
        if ((_a = styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.recommendedColors) === null || _a === void 0 ? void 0 : _a.length) {
            profileLines.push(`Colors that work for them: ${styleProfile.recommendedColors.join(', ')}.`);
        }
        if (styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.bodyType)
            profileLines.push(`Body/fit type: ${styleProfile.bodyType}.`);
        if ((_b = styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.bodyRecommendedSilhouettes) === null || _b === void 0 ? void 0 : _b.length) {
            profileLines.push(`Silhouettes that suit them: ${styleProfile.bodyRecommendedSilhouettes.join(', ')}.`);
        }
        if ((_c = styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.styleArchetypes) === null || _c === void 0 ? void 0 : _c.length) {
            profileLines.push(`Style archetypes: ${styleProfile.styleArchetypes.join(', ')}.`);
        }
        if ((_d = styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.avoidRules) === null || _d === void 0 ? void 0 : _d.length) {
            profileLines.push(`HARD CONSTRAINT - avoid: ${styleProfile.avoidRules.join(', ')}.`);
        }
        const closetLines = closetItems
            .map(i => `- ${i.id} | ${i.color} ${i.subcategory || i.category} | category: ${i.category}` +
            `${i.style ? ` | style: ${i.style}` : ''}${i.fabricTexture ? ` | fabric: ${i.fabricTexture}` : ''}`)
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
        let content = ((_f = (_e = response.choices[0]) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.content) || '{}';
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(content);
        const validIds = new Set(closetItems.map(i => i.id));
        const looks = (Array.isArray(result.looks) ? result.looks : [])
            .map((look, index) => ({
            id: `look-${index + 1}`,
            title: (look === null || look === void 0 ? void 0 : look.title) || `Look ${index + 1}`,
            itemIds: Array.isArray(look === null || look === void 0 ? void 0 : look.itemIds) ? look.itemIds.filter((id) => validIds.has(id)) : [],
            occasion: (look === null || look === void 0 ? void 0 : look.occasion) || '',
            rationale: (look === null || look === void 0 ? void 0 : look.rationale) || '',
        }))
            // A look that lost most of its pieces to id validation is not a look.
            .filter((look) => look.itemIds.length >= 2);
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
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
exports.parseReceipt = functions
    .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b;
    try {
        const { imageUrl } = data;
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
        let content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(content);
        const validCategories = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'bags'];
        const items = (Array.isArray(result.items) ? result.items : [])
            .filter((i) => (i === null || i === void 0 ? void 0 : i.description) && validCategories.includes(i.category))
            .map((i) => ({
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error parsing receipt:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
/**
 * Builds a packing list as a coverage problem: the fewest pieces from the
 * user's real closet that still dress every day of the trip against the real
 * destination forecast.
 *
 * The model selects item ids and explains each choice; it is explicitly told
 * not to count outfit combinations, because that arithmetic is done
 * deterministically on the client from the ids it returns.
 */
exports.generatePackingList = functions
    .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    try {
        const { destination, tripType, startDate, endDate, forecast = [], closetItems = [], styleProfile, notes, } = data;
        if (!destination || !startDate || !endDate) {
            throw new functions.https.HttpsError('invalid-argument', 'destination, startDate and endDate are required');
        }
        if (closetItems.length === 0) {
            throw new functions.https.HttpsError('failed-precondition', 'Add a few items to your closet first - a packing list is built from what you already own.');
        }
        const dayCount = forecast.length || 1;
        const highs = forecast.map(d => d.high);
        const lows = forecast.map(d => d.low);
        const tempLine = forecast.length > 0
            ? `Forecast at the destination: ${Math.min(...lows)}-${Math.max(...highs)}°F across ${dayCount} day(s). Day by day: ${forecast
                .map(d => `${d.date} ${d.low}-${d.high}°F ${d.condition}${d.precipitationChance >= 40 ? ` (${d.precipitationChance}% rain)` : ''}`)
                .join('; ')}.`
            : 'No forecast available - pack for mild, variable conditions.';
        const profileLines = [];
        if (styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.colorSeason) {
            profileLines.push(`Color season: ${styleProfile.colorSeason}.`);
        }
        if (styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.bodyType) {
            profileLines.push(`Body/fit type: ${styleProfile.bodyType}.`);
        }
        if ((_a = styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.styleArchetypes) === null || _a === void 0 ? void 0 : _a.length) {
            profileLines.push(`Style archetypes: ${styleProfile.styleArchetypes.join(', ')}.`);
        }
        if ((_b = styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.avoidRules) === null || _b === void 0 ? void 0 : _b.length) {
            profileLines.push(`HARD CONSTRAINT - avoid: ${styleProfile.avoidRules.join(', ')}.`);
        }
        const closetLines = closetItems
            .map(i => {
            var _a;
            return `- ${i.id} | ${i.color} ${i.subcategory || i.category} | category: ${i.category}` +
                `${i.style ? ` | style: ${i.style}` : ''}${i.fabricTexture ? ` | fabric: ${i.fabricTexture}` : ''}` +
                `${((_a = i.seasons) === null || _a === void 0 ? void 0 : _a.length) ? ` | seasons: ${i.seasons.join('/')}` : ''}`;
        })
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
        let content = ((_d = (_c = response.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) || '{}';
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(content);
        if (!Array.isArray(result.items) || result.items.length === 0) {
            throw new functions.https.HttpsError('internal', 'Packing list generation did not return any items.');
        }
        // Drop anything hallucinated: only ids that exist in the real closet survive.
        const validIds = new Set(closetItems.map(i => i.id));
        const items = result.items.filter((i) => (i === null || i === void 0 ? void 0 : i.itemId) && validIds.has(i.itemId));
        const packedIds = new Set(items.map((i) => i.itemId));
        if (items.length === 0) {
            throw new functions.https.HttpsError('internal', 'Packing list referenced no items from your closet.');
        }
        const dayPlans = Array.isArray(result.dayPlans)
            ? result.dayPlans.map((d) => ({
                date: (d === null || d === void 0 ? void 0 : d.date) || '',
                itemIds: Array.isArray(d === null || d === void 0 ? void 0 : d.itemIds) ? d.itemIds.filter((id) => packedIds.has(id)) : [],
                occasion: (d === null || d === void 0 ? void 0 : d.occasion) || '',
                note: (d === null || d === void 0 ? void 0 : d.note) || '',
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
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error generating packing list:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
/**
 * Assigns an outfit from the user's real closet to each event on their calendar,
 * reading the dress code out of the event itself and checking it against that
 * day's forecast and what they have recently worn.
 */
exports.planOutfitsForSchedule = functions
    .runWith({ memory: '1GB', timeoutSeconds: 120, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    try {
        const { events = [], forecast = [], closetItems = [], styleProfile, recentlyWorn = [], } = data;
        if (events.length === 0) {
            throw new functions.https.HttpsError('invalid-argument', 'At least one event is required');
        }
        if (closetItems.length === 0) {
            throw new functions.https.HttpsError('failed-precondition', 'Add a few items to your closet first - outfits are built from what you already own.');
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
        const profileLines = [];
        if (styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.colorSeason)
            profileLines.push(`Color season: ${styleProfile.colorSeason}.`);
        if (styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.bodyType)
            profileLines.push(`Body/fit type: ${styleProfile.bodyType}.`);
        if ((_a = styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.styleArchetypes) === null || _a === void 0 ? void 0 : _a.length)
            profileLines.push(`Style archetypes: ${styleProfile.styleArchetypes.join(', ')}.`);
        if ((_b = styleProfile === null || styleProfile === void 0 ? void 0 : styleProfile.avoidRules) === null || _b === void 0 ? void 0 : _b.length)
            profileLines.push(`HARD CONSTRAINT - avoid: ${styleProfile.avoidRules.join(', ')}.`);
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
        let content = ((_d = (_c = response.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) || '{}';
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(content);
        const validIds = new Set(closetItems.map(i => i.id));
        const validEventIds = new Set(events.map(e => e.id));
        const assignments = (Array.isArray(result.assignments) ? result.assignments : [])
            .filter((a) => (a === null || a === void 0 ? void 0 : a.eventId) && validEventIds.has(a.eventId))
            .map((a) => {
            var _a;
            return ({
                eventId: a.eventId,
                date: a.date || ((_a = events.find(e => e.id === a.eventId)) === null || _a === void 0 ? void 0 : _a.date) || '',
                itemIds: Array.isArray(a.itemIds) ? a.itemIds.filter((id) => validIds.has(id)) : [],
                dressCode: a.dressCode || '',
                reason: a.reason || '',
            });
        })
            .filter((a) => a.itemIds.length > 0);
        if (assignments.length === 0) {
            throw new functions.https.HttpsError('internal', 'Schedule planning returned no usable outfits.');
        }
        console.log(`Planned ${assignments.length} outfits across ${events.length} events`);
        return { success: true, data: { assignments } };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
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
exports.estimateResaleValue = functions
    .runWith({ memory: '512MB', timeoutSeconds: 60, enforceAppCheck: false })
    .https.onCall(async (data, context) => {
    var _a, _b, _c;
    try {
        const { category, subcategory, color, brand, originalPrice, wornCount, ageMonths, condition, } = data;
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
        let content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
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
                suggestedPrice: Math.max(0, Math.round(((_c = result.suggestedPrice) !== null && _c !== void 0 ? _c : result.estimatedLow) * 100) / 100),
                confidence: ['high', 'medium', 'low'].includes(result.confidence) ? result.confidence : 'low',
                rationale: result.rationale || '',
                bestPlatforms: Array.isArray(result.bestPlatforms) ? result.bestPlatforms.slice(0, 3) : [],
                listingTitle: result.listingTitle || '',
                listingDescription: result.listingDescription || '',
                estimatedAt: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('Error estimating resale value:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
//# sourceMappingURL=index.js.map
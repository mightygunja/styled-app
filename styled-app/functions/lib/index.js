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
exports.shopMyCloset = exports.findSimilarItems = exports.generateImageEmbedding = exports.classifyGarmentImage = void 0;
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
//# sourceMappingURL=index.js.map
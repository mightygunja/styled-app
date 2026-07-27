import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import OpenAI from 'openai';

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

export const findSimilarItems = functions
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
      const targetEmbedding = targetItem?.embedding;

      if (!targetEmbedding || targetEmbedding.length === 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Item does not have an embedding');
      }

      // Get all user's items except the target
      const itemsSnapshot = await db
        .collection('closetItems')
        .where('userId', '==', userId)
        .get();

      const similarItems: any[] = [];

      itemsSnapshot.forEach((doc) => {
        if (doc.id === itemId) return; // Skip target item

        const item = doc.data();
        const embedding = item.embedding;

        if (embedding && embedding.length > 0) {
          const similarity = cosineSimilarity(targetEmbedding, embedding);

          if (similarity >= minSimilarity) {
            similarItems.push({
              item: { id: doc.id, ...item },
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
    } catch (error: any) {
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

interface StyleDNAContext {
  styleArchetypes?: string[];
  avoidRules?: string[];
  preferredColors?: string[];
  stretchColors?: string[];
  guidanceLevel?: 'inspiration' | 'guided' | 'directive';
  fitHighlight?: string[];
  fitDownplay?: string[];
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
        styleDNA,
        timeOfDay,
        dayType,
      }: {
        message: string;
        history: ChatHistoryEntry[];
        closetItems: ClosetItemSummary[];
        weather?: WeatherContext;
        occasion?: string;
        mood?: string;
        styleDNA?: StyleDNAContext;
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

      const styleDNALines: string[] = [];
      if (styleDNA?.styleArchetypes && styleDNA.styleArchetypes.length > 0) {
        styleDNALines.push(`Their style archetypes: ${styleDNA.styleArchetypes.join(', ')} - lean into these when choosing between options.`);
      }
      if (styleDNA?.preferredColors && styleDNA.preferredColors.length > 0) {
        styleDNALines.push(`Their go-to colors: ${styleDNA.preferredColors.join(', ')} - prefer these when multiple items fit equally well.`);
      }
      if (styleDNA?.stretchColors && styleDNA.stretchColors.length > 0) {
        styleDNALines.push(`Colors they're open to experimenting with: ${styleDNA.stretchColors.join(', ')} - occasionally suggest these to help them stretch, but don't force it.`);
      }
      if (styleDNA?.avoidRules && styleDNA.avoidRules.length > 0) {
        styleDNALines.push(`HARD CONSTRAINT - they explicitly want to avoid: ${styleDNA.avoidRules.join(', ')}. Never recommend items/styles matching these.`);
      }
      if (styleDNA?.fitHighlight && styleDNA.fitHighlight.length > 0) {
        styleDNALines.push(`They like to highlight: ${styleDNA.fitHighlight.join(', ')}.`);
      }
      if (styleDNA?.fitDownplay && styleDNA.fitDownplay.length > 0) {
        styleDNALines.push(`They prefer to downplay: ${styleDNA.fitDownplay.join(', ')}.`);
      }

      const guidanceStyle = {
        inspiration: 'They prefer INSPIRATION over instruction: present 1-2 options and let them choose, keep it light and exploratory.',
        guided: 'They prefer GUIDED advice: give one clear recommendation with a brief explanation of why.',
        directive: 'They prefer DIRECTIVE advice: give one confident, specific pick with minimal hedging - tell them exactly what to wear.',
      }[styleDNA?.guidanceLevel || 'guided'];

      const systemPrompt = `You are a fast, sharp personal fashion stylist inside a wardrobe app called Styled. You know the user's real closet inventory below and give specific, confident outfit advice grounded in what they actually own - never generic platitudes.

${contextLines.length > 0 ? `Today's context:\n${contextLines.join('\n')}\n` : ''}
${styleDNALines.length > 0 ? `What you know about their personal style (from their saved Style Profile):\n${styleDNALines.join('\n')}\n` : ''}
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
- "reply" is your conversational message to show the user (do not mention IDs or JSON in it).
- "itemIds" lists every real closet item id you recommended in "reply" (from the inventory above only). Use an empty array if you didn't recommend specific owned items (e.g. general advice, greetings, shopping suggestions).`;

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

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../config/firebase';
import { closetService, looksService, palettesService, shopMyClosetService } from './firestore';
import { uploadImageToFirebase } from './firebaseStorage';
import { ColorAnalysisResult, BodyType, PersonalStyleProfile, BODY_TYPE_GUIDES } from '../models/personalStyleProfile';
import { StoreCheckResult } from '../models/storeCheck';

// Set to a uid only for local testing (paired with DEV_SKIP_AUTH in AppNavigator.tsx)
// to force every screen to read a specific seeded account's data regardless of the
// real Firebase session. Must stay null in anything committed/shipped.
const DEV_FORCE_USER_ID: string | null = null;

// The real signed-in user's uid. Auth is required before the main app is reachable
// (see AppNavigator), so auth.currentUser is always set here in practice; the
// 'anonymous' fallback only guards against a theoretical race on cold start.
export function getCurrentUserId(): string {
  if (DEV_FORCE_USER_ID) return DEV_FORCE_USER_ID;
  return auth.currentUser?.uid || 'anonymous';
}

// Display name for the signed-in user, for attributing content they create (reviews, posts, etc).
export function getCurrentUserName(): string {
  return auth.currentUser?.displayName || 'You';
}

// ==================== CLOUD FUNCTIONS ====================

const classifyGarmentImageFn = httpsCallable(functions, 'classifyGarmentImage');
const generateImageEmbeddingFn = httpsCallable(functions, 'generateImageEmbedding');
const findSimilarItemsFn = httpsCallable(functions, 'findSimilarItems');
const shopMyClosetFn = httpsCallable(functions, 'shopMyCloset');
const analyzeColorSeasonFn = httpsCallable(functions, 'analyzeColorSeason');
const analyzeBodyTypeFn = httpsCallable(functions, 'analyzeBodyType');
const analyzeStoreItemFn = httpsCallable(functions, 'analyzeStoreItem');
const removeGarmentBackgroundFn = httpsCallable(functions, 'removeGarmentBackground');
const renderTryOnFn = httpsCallable(functions, 'renderTryOn');
const parseReceiptFn = httpsCallable(functions, 'parseReceipt');

// ==================== CLOSET API ====================

export const closetAPI = {
  // Get all closet items
  getAll: async (userId: string) => {
    const items = await closetService.getAll(userId);
    return { success: true, data: items };
  },

  // Get items (alias for getAll, with optional category filter)
  getItems: async (userId: string, category?: string) => {
    let items = await closetService.getAll(userId);
    
    // Filter by category if provided
    if (category) {
      items = items.filter(item => item.category === category);
    }
    
    return { success: true, data: items, count: items.length };
  },

  // Get single item
  getById: async (id: string) => {
    const item = await closetService.getById(id);
    return { success: true, data: item };
  },

  // Get item by ID (alias for getById)
  getItemById: async (id: string) => {
    const item = await closetService.getById(id);
    return { success: true, data: item };
  },

  // Create closet item with AI classification and embeddings
  create: async (userId: string, data: any) => {
    try {
      // Upload image to Firebase Storage
      const imageUrl = await uploadImageToFirebase(data.imageBase64, userId);
      console.log('Image uploaded, calling AI classification...');

      // Call AI classification
      const classificationResult = await classifyGarmentImageFn({ imageUrl });
      console.log('Classification result:', classificationResult);
      const classification = (classificationResult.data as any).data;
      console.log('Classification data:', classification);

      // Generate embedding
      console.log('Generating embedding...');
      const embeddingResult = await generateImageEmbeddingFn({ imageUrl });
      console.log('Embedding result:', embeddingResult);
      const embedding = (embeddingResult.data as any).embedding;
      console.log('Embedding length:', embedding?.length);

      // Create item in Firestore. The user's explicit selections beat the
      // AI's guess - the Add Item form promises "AI will detect if not
      // selected", which means a selection is a correction, not a hint.
      const itemData = {
        imageUrl,
        thumbnailUrl: imageUrl, // Could add thumbnail generation later
        category: data.category || classification.category,
        subcategory: classification.subcategory,
        color: data.color || classification.color,
        secondaryColors: classification.secondaryColors || [],
        pattern: classification.pattern,
        neckline: classification.neckline,
        sleeveLength: classification.sleeveLength,
        fitType: classification.fitType,
        fabricTexture: classification.fabricTexture,
        style: classification.style,
        brand: data.brand || null,
        seasons: classification.seasons || [],
        tags: classification.tags || [],
        notes: data.notes || null,
        price: typeof data.price === 'number' ? data.price : null,
        embedding,
      };

      const item = await closetService.create(userId, itemData);
      return { success: true, data: item };
    } catch (error: any) {
      console.error('Error creating closet item:', error);
      throw error;
    }
  },

  // Create item (alias for create)
  createItem: async (data: any) => {
    return closetAPI.create(getCurrentUserId(), data);
  },

  // Update item
  update: async (id: string, updates: any) => {
    await closetService.update(id, updates);
    return { success: true };
  },

  // Delete item
  deleteItem: async (id: string) => {
    await closetService.delete(id);
    return { success: true };
  },

  // Mark worn
  markWorn: async (id: string) => {
    await closetService.markWorn(id);
    return { success: true };
  },

  // Get stats
  getStats: async (userId: string) => {
    const stats = await closetService.getStats(userId);
    return { success: true, data: stats };
  },

  // Find similar items
  // minSimilarity is a composite facet score now, not a raw embedding cosine.
  // The old 0.7 was a cosine floor that filtered almost nothing, because
  // descriptions from one prompt template all embed close together.
  findSimilar: async (id: string, limit: number = 10) => {
    const result = await findSimilarItemsFn({
      itemId: id,
      userId: getCurrentUserId(),
      limit,
      minSimilarity: 0.3,
    });
    return result.data as any;
  },

  // Shop my closet
  shopMyCloset: async (lookId: string, userId: string, limit: number = 10) => {
    const result = await shopMyClosetFn({
      lookId,
      userId,
      limit,
      minSimilarity: 0.6,
    });
    return result.data as any;
  },
};

// ==================== LOOKS API ====================

export const lookAPI = {
  // Get all looks by occasion
  getAll: async (params: { occasion?: string; occasions?: string[]; limit?: number }) => {
    // Handle both 'occasion' (string) and 'occasions' (array) for backward compatibility
    let occasion = params.occasion || 'home';
    if (params.occasions && params.occasions.length > 0) {
      occasion = params.occasions[0];
    }
    const limit = params.limit || 20;
    const looks = await looksService.getByOccasion(occasion, limit);
    return { success: true, data: looks };
  },

  // Get single look
  getById: async (id: string) => {
    const look = await looksService.getById(id);
    return { success: true, data: look };
  },

  // Toggle favorite
  toggleFavorite: async (lookId: string, userId: string) => {
    const result = await looksService.toggleFavorite(lookId, userId);
    return { success: true, isFavorited: result.isFavorited };
  },

  // Check if favorited
  isFavorited: async (lookId: string, userId: string) => {
    const isFavorited = await looksService.isFavorited(lookId, userId);
    return { success: true, isFavorited };
  },

  // Get user's favorite looks
  getFavorites: async (userId: string) => {
    const looks = await looksService.getFavorites(userId);
    return { success: true, data: looks };
  },
};

// ==================== PALETTES API ====================

export const paletteAPI = {
  // Get active palettes
  getActive: async () => {
    const palettes = await palettesService.getActive();
    return { success: true, data: palettes };
  },

  // Get palette by ID
  getById: async (id: string) => {
    const palette = await palettesService.getById(id);
    return { success: true, data: palette };
  },

  // Get looks for palette
  getLooks: async (paletteId: string) => {
    const looks = await palettesService.getLooks(paletteId);
    return { success: true, data: looks };
  },
};

// ==================== PERSONAL COLOR ANALYSIS API ====================

export const colorAnalysisAPI = {
  // Uploads a selfie and runs AI seasonal color analysis (12-season method)
  analyze: async (imageBase64: string, userId: string): Promise<ColorAnalysisResult> => {
    const imageUrl = await uploadImageToFirebase(imageBase64, userId, 'colorAnalysis');
    const result = await analyzeColorSeasonFn({ imageUrl });
    return (result.data as any).data as ColorAnalysisResult;
  },
};

// ==================== BODY & FIT ANALYSIS API ====================

export interface PhotoBodyEstimate {
  bodyType: BodyType;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  agreesWithQuiz: boolean | null;
}

export const bodyAnalysisAPI = {
  // Uploads a full-length photo and runs an AI body-type estimate. Pass the
  // quiz-derived type (if any) so the model gives an independent read and the
  // result can surface agreement/disagreement instead of silently overwriting it.
  analyzePhoto: async (
    imageBase64: string,
    userId: string,
    quizBodyType?: BodyType
  ): Promise<PhotoBodyEstimate> => {
    const imageUrl = await uploadImageToFirebase(imageBase64, userId, 'bodyAnalysis');
    const result = await analyzeBodyTypeFn({ imageUrl, quizBodyType });
    return (result.data as any).data as PhotoBodyEstimate;
  },
};

// ==================== IN-STORE SNAP-TO-CHECK API ====================

export const storeCheckAPI = {
  // Uploads a photo of an item you're considering buying and returns a
  // buy/maybe/skip verdict grounded in the user's color season, body/fit
  // guidance, style archetypes, and avoid rules (whatever they've completed -
  // any missing piece is judged as unknown rather than guessed).
  analyze: async (
    imageBase64: string,
    userId: string,
    profile: PersonalStyleProfile | null
  ): Promise<StoreCheckResult> => {
    const imageUrl = await uploadImageToFirebase(imageBase64, userId, 'storeCheck');

    const bodyGuide = profile?.bodyAnalysis ? BODY_TYPE_GUIDES[profile.bodyAnalysis.bodyType] : null;

    const profilePayload = profile
      ? {
          colorSeason: profile.colorAnalysis?.season,
          recommendedColors: profile.colorAnalysis?.palette.map(s => s.name),
          colorsToAvoid: profile.colorAnalysis?.colorsToAvoid.map(s => s.name),
          bodyType: bodyGuide?.label,
          bodyHighlight: profile.bodyAnalysis?.highlight,
          bodyDownplay: profile.bodyAnalysis?.downplay,
          bodyRecommendedSilhouettes: profile.bodyAnalysis?.recommendedSilhouettes,
          styleArchetypes: profile.styleArchetypes,
          avoidRules: profile.avoidRules,
        }
      : undefined;

    const result = await analyzeStoreItemFn({ imageUrl, profile: profilePayload });
    return (result.data as any).data as StoreCheckResult;
  },
};

// ==================== GARMENT CUTOUT API ====================

export const garmentImageAPI = {
  /**
   * Cuts a garment out of its background and stores the result, returning the
   * new URL. The original is left untouched so a poor cutout is always
   * recoverable - background removal is destructive-looking to users and
   * silently replacing their photo would be the wrong default.
   */
  removeBackground: async (imageUrl: string, userId: string): Promise<string> => {
    const result = await removeGarmentBackgroundFn({ imageUrl });
    const base64 = (result.data as any).data.imageBase64 as string;
    return uploadImageToFirebase(base64, userId, 'cutouts');
  },
};

// ==================== VIRTUAL TRY-ON API ====================

export const tryOnAPI = {
  /**
   * Renders an outfit onto the user's own full-length photo and stores the
   * render, returning its URL.
   */
  render: async (
    personImageUrl: string,
    garmentDescriptions: string[],
    userId: string
  ): Promise<string> => {
    const result = await renderTryOnFn({ personImageUrl, garmentDescriptions });
    const base64 = (result.data as any).data.imageBase64 as string;
    return uploadImageToFirebase(base64, userId, 'tryOn');
  },
};

// ==================== RECEIPT IMPORT API ====================

export interface ParsedReceiptItem {
  description: string;
  category: string;
  brand: string | null;
  color: string | null;
  price: number | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface ParsedReceipt {
  retailer: string | null;
  purchaseDate: string | null;
  items: ParsedReceiptItem[];
}

export const receiptAPI = {
  /** Reads a photographed receipt and returns only its apparel lines. */
  parse: async (imageBase64: string, userId: string): Promise<ParsedReceipt> => {
    const imageUrl = await uploadImageToFirebase(imageBase64, userId, 'receipts');
    const result = await parseReceiptFn({ imageUrl });
    return (result.data as any).data as ParsedReceipt;
  },
};

export { getCurrentUserId as default };

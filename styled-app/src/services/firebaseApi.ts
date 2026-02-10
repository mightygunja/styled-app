import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { closetService, looksService, palettesService, shopMyClosetService } from './firestore';
import { uploadImageToFirebase } from './firebaseStorage';

// Mock user ID (replace with real auth later)
export const MOCK_USER_ID = 'mock-user-123';

// ==================== CLOUD FUNCTIONS ====================

const classifyGarmentImageFn = httpsCallable(functions, 'classifyGarmentImage');
const generateImageEmbeddingFn = httpsCallable(functions, 'generateImageEmbedding');
const findSimilarItemsFn = httpsCallable(functions, 'findSimilarItems');
const shopMyClosetFn = httpsCallable(functions, 'shopMyCloset');

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

      // Create item in Firestore
      const itemData = {
        imageUrl,
        thumbnailUrl: imageUrl, // Could add thumbnail generation later
        category: classification.category,
        subcategory: classification.subcategory,
        color: classification.color,
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
        embedding,
        aiConfidence: 0.9,
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
    return closetAPI.create(MOCK_USER_ID, data);
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
  findSimilar: async (id: string, limit: number = 10) => {
    const result = await findSimilarItemsFn({
      itemId: id,
      userId: MOCK_USER_ID,
      limit,
      minSimilarity: 0.7,
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

export { MOCK_USER_ID as default };

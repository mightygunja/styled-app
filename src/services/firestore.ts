import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ClosetItem, Look, TrendPalette } from '../types';
import { StyleDNA } from '../models/styleDNA';

// ==================== CLOSET ITEMS ====================

export const closetService = {
  // Get all closet items for a user
  getAll: async (userId: string) => {
    const q = query(
      collection(db, 'closetItems'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClosetItem));
  },

  // Get single closet item
  getById: async (itemId: string) => {
    const docRef = doc(db, 'closetItems', itemId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Item not found');
    return { id: docSnap.id, ...docSnap.data() } as ClosetItem;
  },

  // Create closet item
  create: async (userId: string, itemData: Partial<ClosetItem>) => {
    const docRef = await addDoc(collection(db, 'closetItems'), {
      ...itemData,
      userId,
      wornCount: 0,
      isFavorite: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { id: docRef.id, ...itemData } as ClosetItem;
  },

  // Update closet item
  update: async (itemId: string, updates: Partial<ClosetItem>) => {
    const docRef = doc(db, 'closetItems', itemId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  // Delete closet item
  delete: async (itemId: string) => {
    await deleteDoc(doc(db, 'closetItems', itemId));
  },

  // Mark item as worn
  markWorn: async (itemId: string) => {
    const docRef = doc(db, 'closetItems', itemId);
    await updateDoc(docRef, {
      wornCount: increment(1),
      lastWornDate: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  },

  // Get closet stats
  getStats: async (userId: string) => {
    const items = await closetService.getAll(userId);
    
    const categoryCount: Record<string, number> = {};
    items.forEach(item => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    });

    const favorites = items.filter(item => item.isFavorite);
    const mostWorn = [...items]
      .sort((a, b) => (b.wornCount || 0) - (a.wornCount || 0))
      .slice(0, 5);

    return {
      totalItems: items.length,
      byCategory: categoryCount,
      favorites: favorites.length,
      mostWorn,
    };
  },

  // Find similar items (using embeddings)
  findSimilar: async (itemId: string, limitCount: number = 10) => {
    // This will be implemented with Cloud Functions for vector similarity
    // For now, return empty array
    console.log('Similar items search - will be implemented with Cloud Functions');
    return [];
  },
};

// ==================== LOOKS ====================

export const looksService = {
  // Get looks by occasion
  getByOccasion: async (occasion: string, limitCount: number = 20) => {
    const q = query(
      collection(db, 'looks'),
      where('occasion', '==', occasion),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Look));
  },

  // Get single look
  getById: async (lookId: string) => {
    const docRef = doc(db, 'looks', lookId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Look not found');
    
    const lookData = { id: docSnap.id, ...docSnap.data() } as Look;
    
    // Fetch palette if exists
    if (lookData.paletteId) {
      const paletteDoc = await getDoc(doc(db, 'palettes', lookData.paletteId));
      if (paletteDoc.exists()) {
        lookData.palette = { id: paletteDoc.id, ...paletteDoc.data() } as TrendPalette;
      }
    }
    
    // Fetch items
    const itemsQuery = query(
      collection(db, 'lookItems'),
      where('lookId', '==', lookId)
    );
    const itemsSnapshot = await getDocs(itemsQuery);
    
    const items = await Promise.all(
      itemsSnapshot.docs.map(async (itemDoc) => {
        const lookItem = itemDoc.data();
        const itemRef = doc(db, 'items', lookItem.itemId);
        const itemSnap = await getDoc(itemRef);
        return {
          ...itemSnap.data(),
          id: itemSnap.id,
          itemType: lookItem.itemType,
        };
      })
    );
    
    lookData.items = items;
    return lookData;
  },

  // Toggle favorite
  toggleFavorite: async (lookId: string, userId: string) => {
    const favRef = doc(db, 'favoriteLooks', `${userId}_${lookId}`);
    const favSnap = await getDoc(favRef);
    
    if (favSnap.exists()) {
      await deleteDoc(favRef);
      return { isFavorited: false };
    } else {
      await addDoc(collection(db, 'favoriteLooks'), {
        userId,
        lookId,
        createdAt: Timestamp.now(),
      });
      return { isFavorited: true };
    }
  },

  // Check if favorited
  isFavorited: async (lookId: string, userId: string) => {
    const q = query(
      collection(db, 'favoriteLooks'),
      where('userId', '==', userId),
      where('lookId', '==', lookId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  },

  // Get user's favorite looks
  getFavorites: async (userId: string) => {
    const q = query(
      collection(db, 'favoriteLooks'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    
    // Deduplicate lookIds
    const uniqueLookIds = new Set<string>();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.lookId) {
        uniqueLookIds.add(data.lookId);
      }
    });
    
    // Fetch the actual look data for each unique favorite
    const looks = await Promise.all(
      Array.from(uniqueLookIds).map(async (lookId) => {
        const lookDoc = await getDoc(doc(db, 'looks', lookId));
        if (lookDoc.exists()) {
          return { id: lookDoc.id, ...lookDoc.data() } as Look;
        }
        return null;
      })
    );
    
    return looks.filter(look => look !== null) as Look[];
  },
};

// ==================== PALETTES ====================

export const palettesService = {
  // Get active palettes
  getActive: async () => {
    const q = query(
      collection(db, 'palettes'),
      where('isActive', '==', true),
      orderBy('weekStartDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrendPalette));
  },

  // Get palette by ID
  getById: async (paletteId: string) => {
    const docRef = doc(db, 'palettes', paletteId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Palette not found');
    return { id: docSnap.id, ...docSnap.data() } as TrendPalette;
  },

  // Get looks for a palette
  getLooks: async (paletteId: string) => {
    const q = query(
      collection(db, 'looks'),
      where('paletteId', '==', paletteId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Look));
  },
};

// ==================== SHOP MY CLOSET ====================

export const shopMyClosetService = {
  findSimilarToLook: async (lookId: string, userId: string, limitCount: number = 10) => {
    // This will be implemented with Cloud Functions for vector similarity
    console.log('Shop My Closet - will be implemented with Cloud Functions');
    return [];
  },
};

// ==================== USER PROFILE / STYLE DNA ====================

export const styleDnaService = {
  // Get a user's saved Style DNA profile (null if never saved)
  getStyleDNA: async (userId: string): Promise<StyleDNA | null> => {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return (data.styleDNA as StyleDNA) || null;
  },

  // Save/overwrite a user's Style DNA profile
  saveStyleDNA: async (userId: string, styleDNA: StyleDNA): Promise<void> => {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        styleDNA,
        updatedAt: Timestamp.now(),
      });
    } else {
      await setDoc(docRef, {
        styleDNA,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
  },
};

// ==================== SAVED OUTFITS ====================

export interface SavedOutfit {
  id: string;
  userId: string;
  name: string;
  itemIds: string[];
  occasion?: string;
  createdAt?: any;
}

export const outfitsService = {
  // Get all saved outfits for a user
  getAll: async (userId: string): Promise<SavedOutfit[]> => {
    const q = query(
      collection(db, 'outfits'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SavedOutfit));
  },

  // Save a new outfit
  create: async (userId: string, itemIds: string[], occasion?: string, name?: string): Promise<SavedOutfit> => {
    const outfitData = {
      userId,
      itemIds,
      occasion: occasion || 'casual',
      name: name || `Outfit - ${new Date().toLocaleDateString()}`,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'outfits'), outfitData);
    return { id: docRef.id, ...outfitData } as SavedOutfit;
  },

  // Delete a saved outfit
  delete: async (outfitId: string): Promise<void> => {
    await deleteDoc(doc(db, 'outfits', outfitId));
  },
};

// ==================== SHOPPING LIST ====================

export interface ShoppingListEntry {
  id: string;
  userId: string;
  item: Record<string, any>;
  addedAt?: any;
}

export const shoppingListService = {
  // Get all items in the user's shopping list
  getAll: async (userId: string): Promise<ShoppingListEntry[]> => {
    const q = query(
      collection(db, 'shoppingListItems'),
      where('userId', '==', userId),
      orderBy('addedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ShoppingListEntry));
  },

  // Add an item to the shopping list
  add: async (userId: string, item: Record<string, any>): Promise<ShoppingListEntry> => {
    const entryData = {
      userId,
      item,
      addedAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'shoppingListItems'), entryData);
    return { id: docRef.id, ...entryData } as ShoppingListEntry;
  },

  // Remove an item from the shopping list
  remove: async (entryId: string): Promise<void> => {
    await deleteDoc(doc(db, 'shoppingListItems', entryId));
  },
};

// ==================== AI STYLIST CHAT ====================

export interface ChatMessageDoc {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  type: 'text' | 'outfit' | 'items' | 'image';
  content: string;
  itemIds?: string[];
  timestamp?: any;
}

export const chatService = {
  // Get full conversation history for a user, oldest first
  getConversation: async (userId: string): Promise<ChatMessageDoc[]> => {
    const q = query(
      collection(db, 'chatMessages'),
      where('userId', '==', userId),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessageDoc));
  },

  // Append a message to the conversation
  addMessage: async (
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    type: 'text' | 'outfit' | 'items' | 'image' = 'text',
    itemIds?: string[]
  ): Promise<ChatMessageDoc> => {
    const messageData = {
      userId,
      role,
      type,
      content,
      itemIds: itemIds || [],
      timestamp: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'chatMessages'), messageData);
    return { id: docRef.id, ...messageData } as ChatMessageDoc;
  },

  // Clear a user's conversation history
  clearConversation: async (userId: string): Promise<void> => {
    const q = query(collection(db, 'chatMessages'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
  },
};

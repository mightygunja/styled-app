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
import { ClosetItem, Look, TrendPalette, Stylist, StylingSession, StylistReview, SessionType } from '../types';
import { PersonalStyleProfile } from '../models/personalStyleProfile';
import { Product } from '../models/product';

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

// ==================== USER PROFILE / STYLE PROFILE ====================

export const styleProfileService = {
  // Get a user's saved Style Profile (null if never saved). Reads the legacy
  // `styleDNA` field as a fallback so profiles saved before the rename still load.
  getStyleProfile: async (userId: string): Promise<PersonalStyleProfile | null> => {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return (data.styleProfile as PersonalStyleProfile) || (data.styleDNA as PersonalStyleProfile) || null;
  },

  // Save/overwrite a user's Style Profile
  saveStyleProfile: async (userId: string, styleProfile: PersonalStyleProfile): Promise<void> => {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        styleProfile,
        updatedAt: Timestamp.now(),
      });
    } else {
      await setDoc(docRef, {
        styleProfile,
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

// ==================== STYLIST MARKETPLACE ====================

// Catalog content, seeded server-side (see seedStylists Cloud Function) - read-only for clients, same pattern as looksService/palettesService.
export const stylistsService = {
  getAll: async (): Promise<Stylist[]> => {
    const snapshot = await getDocs(collection(db, 'stylists'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Stylist));
  },

  getById: async (stylistId: string): Promise<Stylist | null> => {
    const docSnap = await getDoc(doc(db, 'stylists', stylistId));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Stylist;
  },
};

export const stylistBookingsService = {
  // Create a booking for the given user, resolving price from the stylist's real hourly rate
  create: async (
    userId: string,
    stylistId: string,
    sessionType: SessionType,
    date: string,
    time: string,
    duration: number
  ): Promise<StylingSession> => {
    const stylist = await stylistsService.getById(stylistId);
    const price = stylist ? stylist.hourlyRate * (duration / 60) : 0;

    const sessionData = {
      userId,
      stylistId,
      sessionType,
      scheduledDate: `${date} ${time}`,
      duration,
      status: 'pending' as const,
      price,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'stylistBookings'), sessionData);
    return {
      id: docRef.id,
      ...sessionData,
      stylist: stylist || undefined,
      createdAt: sessionData.createdAt.toDate().toISOString(),
    } as StylingSession;
  },

  // Get a user's sessions, most recent first, with each stylist's real profile attached
  getForUser: async (userId: string): Promise<StylingSession[]> => {
    const q = query(
      collection(db, 'stylistBookings'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const sessions = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      } as StylingSession;
    });

    const stylistIds = Array.from(new Set(sessions.map(s => s.stylistId)));
    const stylists = await Promise.all(stylistIds.map(id => stylistsService.getById(id)));
    const stylistById = new Map(stylists.filter((s): s is Stylist => !!s).map(s => [s.id, s]));

    return sessions.map(s => ({ ...s, stylist: stylistById.get(s.stylistId) }));
  },
};

export const reviewsService = {
  // Submit a review for a stylist, under the real authenticated user
  submit: async (
    userId: string,
    userName: string,
    stylistId: string,
    sessionId: string,
    sessionType: SessionType,
    rating: number,
    comment: string
  ): Promise<StylistReview> => {
    const reviewData = {
      stylistId,
      userId,
      userName,
      rating,
      comment,
      sessionType,
      sessionId,
      helpful: 0,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'reviews'), reviewData);
    return {
      id: docRef.id,
      ...reviewData,
      createdAt: reviewData.createdAt.toDate().toISOString(),
    } as StylistReview;
  },

  // Get all reviews for a stylist, newest first
  getForStylist: async (stylistId: string): Promise<StylistReview[]> => {
    const q = query(
      collection(db, 'reviews'),
      where('stylistId', '==', stylistId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      } as StylistReview;
    });
  },

  // Get one user's review of one stylist, if they left one
  getForUser: async (stylistId: string, userId: string): Promise<StylistReview | null> => {
    const q = query(
      collection(db, 'reviews'),
      where('stylistId', '==', stylistId),
      where('userId', '==', userId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
    } as StylistReview;
  },

  markHelpful: async (reviewId: string): Promise<void> => {
    await updateDoc(doc(db, 'reviews', reviewId), { helpful: increment(1) });
  },

  update: async (reviewId: string, rating: number, comment: string): Promise<void> => {
    await updateDoc(doc(db, 'reviews', reviewId), { rating, comment });
  },

  delete: async (reviewId: string): Promise<void> => {
    await deleteDoc(doc(db, 'reviews', reviewId));
  },
};

// ==================== SHOPPING MARKETPLACE ====================

export interface WishlistDoc {
  id: string;
  userId: string;
  productId: string;
  product: Product; // snapshot at save time - the live catalog isn't warehoused, so we keep what the user saw
  addedAt: string;
}

export const wishlistService = {
  getAll: async (userId: string): Promise<WishlistDoc[]> => {
    const q = query(
      collection(db, 'wishlistItems'),
      where('userId', '==', userId),
      orderBy('addedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        addedAt: data.addedAt instanceof Timestamp ? data.addedAt.toDate().toISOString() : data.addedAt,
      } as WishlistDoc;
    });
  },

  isSaved: async (userId: string, productId: string): Promise<string | null> => {
    const q = query(
      collection(db, 'wishlistItems'),
      where('userId', '==', userId),
      where('productId', '==', productId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].id;
  },

  add: async (userId: string, product: Product): Promise<string> => {
    const docRef = await addDoc(collection(db, 'wishlistItems'), {
      userId,
      productId: product.id,
      product,
      addedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  remove: async (wishlistDocId: string): Promise<void> => {
    await deleteDoc(doc(db, 'wishlistItems', wishlistDocId));
  },
};

/** Where in the app the outbound click originated. */
export type AffiliateSurface = 'shop' | 'explore' | 'similar' | 'chat' | 'wishlist' | 'unknown';

export interface AffiliateClickDoc {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  retailer: string;
  price: number;
  estimatedCommission: number;
  clickedAt: string;
  /** Which surface sent the click. Without this you cannot tell whether
   *  Explore or Shop is earning, which is the first question worth asking. */
  surface?: AffiliateSurface;
  /** The headline reason shown next to the product when it was tapped, so
   *  reason types can be compared against each other. */
  reason?: string;
  matchScore?: number;
  /** mock | sovrn | rakuten - which provider supplied the product. */
  provider?: string;
}

// Commission rate used for the earnings estimate shown in Advanced Analytics.
// Real networks report actual confirmed commission on their own dashboard -
// this is a passive, order-of-magnitude estimate, not a reconciled figure.
const ESTIMATED_COMMISSION_RATE = 0.08;

export interface AffiliateClickContext {
  surface?: AffiliateSurface;
  reason?: string;
  matchScore?: number;
  provider?: string;
}

export const affiliateClicksService = {
  record: async (
    userId: string,
    product: Product,
    context: AffiliateClickContext = {}
  ): Promise<void> => {
    await addDoc(collection(db, 'affiliateClicks'), {
      userId,
      productId: product.id,
      productName: product.name,
      retailer: product.retailer,
      price: product.price,
      // An estimate at a flat rate, and named as one. Real commission varies
      // by advertiser and is reversed on returns; only the network's own
      // report is authoritative. Reconcile against recordAffiliateRevenue.
      estimatedCommission: Math.round(product.price * ESTIMATED_COMMISSION_RATE * 100) / 100,
      surface: context.surface || 'unknown',
      reason: context.reason || null,
      matchScore: typeof context.matchScore === 'number' ? context.matchScore : null,
      provider: context.provider || null,
      clickedAt: Timestamp.now(),
    });
  },

  getForUser: async (userId: string): Promise<AffiliateClickDoc[]> => {
    const q = query(
      collection(db, 'affiliateClicks'),
      where('userId', '==', userId),
      orderBy('clickedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        clickedAt: data.clickedAt instanceof Timestamp ? data.clickedAt.toDate().toISOString() : data.clickedAt,
      } as AffiliateClickDoc;
    });
  },
};

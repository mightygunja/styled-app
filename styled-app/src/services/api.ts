// API service - now using Firebase!
// Old REST API code kept for reference but not used

import { API_CONFIG } from '../constants';
import { TrendPalette, Look, FilterOptions } from '../types';

// Import Firebase API
import { 
  closetAPI as firebaseClosetAPI,
  lookAPI as firebaseLookAPI,
  paletteAPI as firebasePaletteAPI,
  MOCK_USER_ID as FIREBASE_MOCK_USER_ID
} from './firebaseApi';

export interface ClosetItem {
  id: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: string;
  subcategory?: string;
  color: string;
  secondaryColors?: string[];
  pattern?: string;
  neckline?: string;
  sleeveLength?: string;
  fitType?: string;
  fabricTexture?: string;
  style?: string;
  brand?: string;
  seasons?: string[];
  tags?: string[];
  isFavorite: boolean;
  wornCount: number;
  lastWornDate?: string;
  purchaseDate?: string;
  notes?: string;
  aiConfidence?: number;
  createdAt: string;
  updatedAt: string;
}

const BASE_URL = API_CONFIG.BASE_URL;

// Generic fetch wrapper
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// OLD REST API - NOT USED ANYMORE (kept for reference)
// Palette API
const oldPaletteAPI = {
  getAll: async (occasion?: string) => {
    const query = occasion ? `?occasion=${occasion}` : '';
    return fetchAPI<{ success: boolean; data: TrendPalette[]; count: number }>(
      `/palettes${query}`
    );
  },

  getCurrent: async () => {
    return fetchAPI<{ success: boolean; data: TrendPalette[]; count: number }>(
      '/palettes/current'
    );
  },

  getById: async (id: string) => {
    return fetchAPI<{ success: boolean; data: TrendPalette }>(
      `/palettes/${id}`
    );
  },
};

// Look API
const oldLookAPI = {
  getAll: async (filters?: FilterOptions & { limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    
    if (filters?.occasions && filters.occasions.length > 0) {
      params.append('occasion', filters.occasions[0]);
    }
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<{
      success: boolean;
      data: Look[];
      pagination: { limit: number; offset: number; total: number };
    }>(`/looks${query}`);
  },

  getById: async (id: string) => {
    return fetchAPI<{ success: boolean; data: Look }>(`/looks/${id}`);
  },

  toggleFavorite: async (lookId: string, userId: string) => {
    return fetchAPI<{ success: boolean; isFavorited: boolean; message: string }>(
      `/looks/${lookId}/favorite`,
      {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }
    );
  },

  getFavorites: async (userId: string) => {
    return fetchAPI<{ success: boolean; data: Look[]; count: number }>(
      `/looks/favorites?userId=${userId}`
    );
  },
};

// Mock user ID for now (will be replaced with auth)
const OLD_MOCK_USER_ID = 'mock-user-123';

// Closet API
const oldClosetAPI = {
  getItems: async (userId: string, category?: string) => {
    const params = new URLSearchParams({ userId });
    if (category) params.append('category', category);
    
    return fetchAPI<{ success: boolean; data: ClosetItem[]; count: number }>(
      `/closet/items?${params.toString()}`
    );
  },

  getItemById: async (id: string) => {
    return fetchAPI<{ success: boolean; data: ClosetItem }>(
      `/closet/items/${id}`
    );
  },

  createItem: async (data: {
    userId: string;
    imageUrl: string;
    category: string;
    color: string;
    brand?: string;
    notes?: string;
    tags?: string[];
    seasons?: string[];
  }) => {
    return fetchAPI<{ success: boolean; data: ClosetItem }>(
      '/closet/items',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  updateItem: async (id: string, data: Partial<ClosetItem>) => {
    return fetchAPI<{ success: boolean; data: ClosetItem }>(
      `/closet/items/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  deleteItem: async (id: string) => {
    return fetchAPI<{ success: boolean; message: string }>(
      `/closet/items/${id}`,
      {
        method: 'DELETE',
      }
    );
  },

  markWorn: async (id: string) => {
    return fetchAPI<{ success: boolean; data: ClosetItem }>(
      `/closet/items/${id}/worn`,
      {
        method: 'POST',
      }
    );
  },

  getStats: async (userId: string) => {
    return fetchAPI<{
      success: boolean;
      data: {
        totalItems: number;
        itemsByCategory: Array<{ category: string; _count: number }>;
        favoriteItems: number;
        mostWornItems: ClosetItem[];
      };
    }>(`/closet/stats?userId=${userId}`);
  },

  findSimilar: async (id: string, limit: number = 10) => {
    return fetchAPI<{
      success: boolean;
      data: Array<{ item: ClosetItem; similarity: number }>;
      count: number;
    }>(`/closet/items/${id}/similar?limit=${limit}`);
  },

  shopMyCloset: async (lookId: string, userId: string, limit: number = 10) => {
    return fetchAPI<{
      success: boolean;
      data: Array<{ item: ClosetItem; similarity: number }>;
      count: number;
      look: { id: string; title: string; imageUrl: string };
    }>(`/closet/shop-my-closet/${lookId}?userId=${userId}&limit=${limit}`);
  },
};

// ==================== EXPORT FIREBASE APIs ====================
// These replace the old REST API calls above

export { firebaseClosetAPI as closetAPI };
export { firebaseLookAPI as lookAPI };
export { firebasePaletteAPI as paletteAPI };
export { FIREBASE_MOCK_USER_ID as MOCK_USER_ID };

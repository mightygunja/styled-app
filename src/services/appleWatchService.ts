/**
 * Apple Watch Service
 * 
 * Manages Apple Watch companion app integration including
 * outfit viewing, complications, and activity tracking.
 */

export type ComplicationType = 'modular' | 'circular' | 'rectangular' | 'graphic';
export type WatchFacePosition = 'top' | 'center' | 'bottom' | 'corner';

export interface WatchSettings {
  userId: string;
  paired: boolean;
  watchModel: string;
  watchOS: string;
  complications: {
    enabled: boolean;
    type: ComplicationType;
    position: WatchFacePosition;
    showOutfit: boolean;
    showWeather: boolean;
  };
  notifications: {
    enabled: boolean;
    outfitReminders: boolean;
    weatherAlerts: boolean;
    styleUpdates: boolean;
  };
  standalone: {
    enabled: boolean;
    cacheOutfits: boolean;
    cacheImages: boolean;
  };
}

export interface TodaysOutfit {
  id: string;
  name: string;
  imageUrl: string;
  items: {
    id: string;
    name: string;
    category: string;
  }[];
  weather: {
    temp: number;
    condition: string;
    icon: string;
  };
  occasion: string;
  rating?: number;
}

export interface OutfitSuggestion {
  id: string;
  name: string;
  imageUrl: string;
  matchScore: number;
  reason: string;
  weather: {
    temp: number;
    condition: string;
  };
}

export interface WatchActivity {
  id: string;
  type: 'view' | 'rate' | 'log' | 'suggestion';
  outfitId: string;
  timestamp: string;
  data: any;
}

export interface WatchComplication {
  id: string;
  type: ComplicationType;
  position: WatchFacePosition;
  data: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    value?: string;
  };
  updatedAt: string;
}

export interface WatchStats {
  totalViews: number;
  totalRatings: number;
  totalLogs: number;
  averageRating: number;
  mostViewedOutfit: string;
  lastActivity?: string;
}

class AppleWatchService {
  /**
   * Get watch settings
   */
  async getWatchSettings(userId: string): Promise<WatchSettings> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      userId,
      paired: true,
      watchModel: 'Apple Watch Series 9',
      watchOS: 'watchOS 10.2',
      complications: {
        enabled: true,
        type: 'modular',
        position: 'top',
        showOutfit: true,
        showWeather: true,
      },
      notifications: {
        enabled: true,
        outfitReminders: true,
        weatherAlerts: true,
        styleUpdates: false,
      },
      standalone: {
        enabled: true,
        cacheOutfits: true,
        cacheImages: true,
      },
    };
  }

  /**
   * Update watch settings
   */
  async updateWatchSettings(
    userId: string,
    updates: Partial<WatchSettings>
  ): Promise<WatchSettings> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const current = await this.getWatchSettings(userId);
    return { ...current, ...updates };
  }

  /**
   * Check if watch is paired
   */
  async isWatchPaired(): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return true;
  }

  /**
   * Get today's outfit
   */
  async getTodaysOutfit(userId: string): Promise<TodaysOutfit> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      id: 'outfit-today',
      name: 'Business Casual',
      imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
      items: [
        { id: 'item-1', name: 'Navy Blazer', category: 'Outerwear' },
        { id: 'item-2', name: 'White Oxford Shirt', category: 'Tops' },
        { id: 'item-3', name: 'Khaki Chinos', category: 'Bottoms' },
        { id: 'item-4', name: 'Brown Leather Loafers', category: 'Shoes' },
      ],
      weather: {
        temp: 72,
        condition: 'Partly Cloudy',
        icon: '⛅',
      },
      occasion: 'Work',
      rating: 4.5,
    };
  }

  /**
   * Get outfit suggestions
   */
  async getOutfitSuggestions(userId: string): Promise<OutfitSuggestion[]> {
    await new Promise(resolve => setTimeout(resolve, 600));

    return [
      {
        id: 'sug-1',
        name: 'Smart Casual',
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
        matchScore: 95,
        reason: 'Perfect for today\'s weather',
        weather: { temp: 72, condition: 'Partly Cloudy' },
      },
      {
        id: 'sug-2',
        name: 'Weekend Comfort',
        imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
        matchScore: 88,
        reason: 'Comfortable and stylish',
        weather: { temp: 72, condition: 'Partly Cloudy' },
      },
      {
        id: 'sug-3',
        name: 'Evening Out',
        imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
        matchScore: 82,
        reason: 'Great for dinner plans',
        weather: { temp: 68, condition: 'Clear' },
      },
    ];
  }

  /**
   * Rate outfit
   */
  async rateOutfit(outfitId: string, rating: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Mock rating
  }

  /**
   * Log outfit wear
   */
  async logOutfitWear(outfitId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Mock log
  }

  /**
   * Get watch activity
   */
  async getWatchActivity(userId: string): Promise<WatchActivity[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
      {
        id: 'act-1',
        type: 'view',
        outfitId: 'outfit-today',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        data: { duration: 15 },
      },
      {
        id: 'act-2',
        type: 'rate',
        outfitId: 'outfit-today',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        data: { rating: 4.5 },
      },
      {
        id: 'act-3',
        type: 'log',
        outfitId: 'outfit-yesterday',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        data: { occasion: 'Work' },
      },
      {
        id: 'act-4',
        type: 'suggestion',
        outfitId: 'sug-1',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        data: { viewed: true },
      },
    ];
  }

  /**
   * Get watch stats
   */
  async getWatchStats(userId: string): Promise<WatchStats> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      totalViews: 127,
      totalRatings: 45,
      totalLogs: 89,
      averageRating: 4.3,
      mostViewedOutfit: 'Business Casual',
      lastActivity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Get complications
   */
  async getComplications(userId: string): Promise<WatchComplication[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return [
      {
        id: 'comp-1',
        type: 'modular',
        position: 'top',
        data: {
          title: 'Today\'s Outfit',
          subtitle: 'Business Casual',
          imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=100',
        },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'comp-2',
        type: 'circular',
        position: 'corner',
        data: {
          title: 'Weather',
          value: '72°F',
        },
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Update complication
   */
  async updateComplication(
    complicationId: string,
    data: any
  ): Promise<WatchComplication> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      id: complicationId,
      type: 'modular',
      position: 'top',
      data,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Send notification to watch
   */
  async sendWatchNotification(
    userId: string,
    notification: {
      title: string;
      body: string;
      category?: string;
      actions?: string[];
    }
  ): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Mock notification
  }

  /**
   * Sync with watch
   */
  async syncWithWatch(userId: string): Promise<{
    success: boolean;
    synced: number;
    failed: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      success: true,
      synced: 5,
      failed: 0,
    };
  }

  /**
   * Get watch battery level
   */
  async getWatchBatteryLevel(): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return 87; // percentage
  }

  /**
   * Check watch connectivity
   */
  async isWatchConnected(): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return true;
  }

  /**
   * Enable standalone mode
   */
  async enableStandaloneMode(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Mock enable
  }

  /**
   * Disable standalone mode
   */
  async disableStandaloneMode(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Mock disable
  }

  /**
   * Cache outfits for watch
   */
  async cacheOutfitsForWatch(userId: string, outfitIds: string[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Mock cache
  }

  /**
   * Get cached outfits count
   */
  async getCachedOutfitsCount(): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return 12;
  }

  /**
   * Clear watch cache
   */
  async clearWatchCache(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Mock clear
  }

  /**
   * Get watch storage usage
   */
  async getWatchStorageUsage(): Promise<{
    used: number; // MB
    available: number; // MB
    total: number; // MB
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      used: 45.2,
      available: 186.8,
      total: 232,
    };
  }

  /**
   * Test watch connection
   */
  async testWatchConnection(): Promise<{
    connected: boolean;
    latency: number; // ms
    signal: 'excellent' | 'good' | 'fair' | 'poor';
  }> {
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      connected: true,
      latency: 45,
      signal: 'excellent',
    };
  }

  /**
   * Get available watch faces
   */
  async getAvailableWatchFaces(): Promise<{
    id: string;
    name: string;
    supportsComplications: boolean;
    complicationSlots: number;
  }[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return [
      { id: 'modular', name: 'Modular', supportsComplications: true, complicationSlots: 5 },
      { id: 'infograph', name: 'Infograph', supportsComplications: true, complicationSlots: 8 },
      { id: 'california', name: 'California', supportsComplications: true, complicationSlots: 4 },
      { id: 'meridian', name: 'Meridian', supportsComplications: true, complicationSlots: 4 },
    ];
  }
}

export const appleWatchService = new AppleWatchService();

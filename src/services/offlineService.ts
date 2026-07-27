/**
 * Offline Mode Service
 * 
 * Manages offline data caching, sync queue, and offline functionality.
 */

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';
export type CacheStatus = 'cached' | 'stale' | 'missing';
export type DataType = 'wardrobe' | 'outfits' | 'favorites' | 'profile' | 'settings';

export interface OfflineSettings {
  userId: string;
  enabled: boolean;
  autoSync: boolean;
  syncOnWifi: boolean;
  cacheImages: boolean;
  cacheVideos: boolean;
  maxCacheSize: number; // MB
  syncInterval: number; // minutes
}

export interface CachedData {
  id: string;
  type: DataType;
  data: any;
  cachedAt: string;
  expiresAt: string;
  size: number; // bytes
  status: CacheStatus;
}

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  dataType: DataType;
  data: any;
  timestamp: string;
  status: SyncStatus;
  retryCount: number;
  error?: string;
}

export interface OfflineStats {
  totalCached: number;
  cacheSize: number; // MB
  maxCacheSize: number; // MB
  pendingSync: number;
  lastSyncAt?: string;
  syncSuccessRate: number; // percentage
  offlineTime: number; // minutes
}

export interface NetworkStatus {
  isConnected: boolean;
  isWifi: boolean;
  connectionType: 'wifi' | 'cellular' | 'none';
  speed: 'slow' | 'medium' | 'fast';
}

export interface DownloadableContent {
  id: string;
  type: DataType;
  title: string;
  size: number; // MB
  downloaded: boolean;
  downloadedAt?: string;
}

class OfflineService {
  private isOnline: boolean = true;
  private syncQueue: SyncQueueItem[] = [];
  private cachedData: Map<string, CachedData> = new Map();

  /**
   * Get offline settings
   */
  async getOfflineSettings(userId: string): Promise<OfflineSettings> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      userId,
      enabled: true,
      autoSync: true,
      syncOnWifi: true,
      cacheImages: true,
      cacheVideos: false,
      maxCacheSize: 500, // MB
      syncInterval: 30, // minutes
    };
  }

  /**
   * Update offline settings
   */
  async updateOfflineSettings(
    userId: string,
    updates: Partial<OfflineSettings>
  ): Promise<OfflineSettings> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const current = await this.getOfflineSettings(userId);
    return { ...current, ...updates };
  }

  /**
   * Get network status
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      isConnected: this.isOnline,
      isWifi: true,
      connectionType: this.isOnline ? 'wifi' : 'none',
      speed: 'fast',
    };
  }

  /**
   * Check if online
   */
  async isNetworkAvailable(): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.isOnline;
  }

  /**
   * Get cached data
   */
  async getCachedData(type?: DataType): Promise<CachedData[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const mockData: CachedData[] = [
      {
        id: 'cache-1',
        type: 'wardrobe',
        data: { items: 127 },
        cachedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
        size: 15.3 * 1024 * 1024, // bytes
        status: 'cached',
      },
      {
        id: 'cache-2',
        type: 'outfits',
        data: { outfits: 45 },
        cachedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
        size: 8.7 * 1024 * 1024,
        status: 'cached',
      },
      {
        id: 'cache-3',
        type: 'favorites',
        data: { favorites: 23 },
        cachedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 23.5 * 60 * 60 * 1000).toISOString(),
        size: 3.2 * 1024 * 1024,
        status: 'cached',
      },
      {
        id: 'cache-4',
        type: 'profile',
        data: { user: 'current' },
        cachedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 23.9 * 60 * 60 * 1000).toISOString(),
        size: 0.5 * 1024 * 1024,
        status: 'cached',
      },
      {
        id: 'cache-5',
        type: 'settings',
        data: { settings: {} },
        cachedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 23.8 * 60 * 60 * 1000).toISOString(),
        size: 0.1 * 1024 * 1024,
        status: 'cached',
      },
    ];

    if (type) {
      return mockData.filter(d => d.type === type);
    }

    return mockData;
  }

  /**
   * Cache data
   */
  async cacheData(type: DataType, data: any): Promise<CachedData> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const cached: CachedData = {
      id: `cache-${Date.now()}`,
      type,
      data,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      size: JSON.stringify(data).length,
      status: 'cached',
    };

    this.cachedData.set(cached.id, cached);
    return cached;
  }

  /**
   * Clear cache
   */
  async clearCache(type?: DataType): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (type) {
      // Clear specific type
      const keys = Array.from(this.cachedData.keys());
      keys.forEach(key => {
        const data = this.cachedData.get(key);
        if (data?.type === type) {
          this.cachedData.delete(key);
        }
      });
    } else {
      // Clear all
      this.cachedData.clear();
    }
  }

  /**
   * Get sync queue
   */
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return [
      {
        id: 'sync-1',
        type: 'create',
        dataType: 'wardrobe',
        data: { itemId: 'item-123' },
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        status: 'pending',
        retryCount: 0,
      },
      {
        id: 'sync-2',
        type: 'update',
        dataType: 'outfits',
        data: { outfitId: 'outfit-456' },
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        status: 'pending',
        retryCount: 0,
      },
      {
        id: 'sync-3',
        type: 'delete',
        dataType: 'favorites',
        data: { favoriteId: 'fav-789' },
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        status: 'pending',
        retryCount: 0,
      },
    ];
  }

  /**
   * Add to sync queue
   */
  async addToSyncQueue(
    type: 'create' | 'update' | 'delete',
    dataType: DataType,
    data: any
  ): Promise<SyncQueueItem> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const item: SyncQueueItem = {
      id: `sync-${Date.now()}`,
      type,
      dataType,
      data,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };

    this.syncQueue.push(item);
    return item;
  }

  /**
   * Sync now
   */
  async syncNow(): Promise<{
    success: number;
    failed: number;
    total: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const queue = await this.getSyncQueue();
    const total = queue.length;
    const success = Math.floor(total * 0.9); // 90% success rate
    const failed = total - success;

    // Clear synced items
    this.syncQueue = this.syncQueue.filter(item => Math.random() > 0.9);

    return { success, failed, total };
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.syncQueue = [];
  }

  /**
   * Get offline stats
   */
  async getOfflineStats(userId: string): Promise<OfflineStats> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const cached = await this.getCachedData();
    const totalSize = cached.reduce((sum, item) => sum + item.size, 0);
    const queue = await this.getSyncQueue();

    return {
      totalCached: cached.length,
      cacheSize: totalSize / (1024 * 1024), // Convert to MB
      maxCacheSize: 500,
      pendingSync: queue.length,
      lastSyncAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      syncSuccessRate: 94,
      offlineTime: 0,
    };
  }

  /**
   * Get downloadable content
   */
  async getDownloadableContent(): Promise<DownloadableContent[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return [
      {
        id: 'dl-1',
        type: 'wardrobe',
        title: 'My Wardrobe (127 items)',
        size: 15.3,
        downloaded: true,
        downloadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'dl-2',
        type: 'outfits',
        title: 'My Outfits (45 outfits)',
        size: 8.7,
        downloaded: true,
        downloadedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'dl-3',
        type: 'favorites',
        title: 'Favorites (23 items)',
        size: 3.2,
        downloaded: true,
        downloadedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: 'dl-4',
        type: 'profile',
        title: 'Profile Data',
        size: 0.5,
        downloaded: true,
        downloadedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ];
  }

  /**
   * Download content for offline
   */
  async downloadContent(contentId: string): Promise<DownloadableContent> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      id: contentId,
      type: 'wardrobe',
      title: 'Downloaded Content',
      size: 10.0,
      downloaded: true,
      downloadedAt: new Date().toISOString(),
    };
  }

  /**
   * Delete downloaded content
   */
  async deleteDownloadedContent(contentId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Get cache expiration
   */
  async getCacheExpiration(cacheId: string): Promise<Date> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  /**
   * Refresh cache
   */
  async refreshCache(type?: DataType): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Mock refresh
  }

  /**
   * Check cache validity
   */
  async isCacheValid(cacheId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const data = this.cachedData.get(cacheId);
    if (!data) return false;

    const expiresAt = new Date(data.expiresAt);
    return expiresAt > new Date();
  }

  /**
   * Get storage usage
   */
  async getStorageUsage(): Promise<{
    used: number; // MB
    available: number; // MB
    total: number; // MB
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      used: 27.8,
      available: 472.2,
      total: 500,
    };
  }

  /**
   * Optimize cache
   */
  async optimizeCache(): Promise<{
    before: number; // MB
    after: number; // MB
    saved: number; // MB
  }> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      before: 27.8,
      after: 22.1,
      saved: 5.7,
    };
  }

  /**
   * Enable offline mode
   */
  async enableOfflineMode(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    this.isOnline = false;
  }

  /**
   * Disable offline mode
   */
  async disableOfflineMode(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    this.isOnline = true;
  }

  /**
   * Simulate network change
   */
  setNetworkStatus(online: boolean): void {
    this.isOnline = online;
  }
}

export const offlineService = new OfflineService();

/**
 * Quick Access Service
 * 
 * Manages user's pinned features for quick access on Home screen.
 * Users can customize which features appear as quick action buttons.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QuickAccessItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  color: string;
}

const STORAGE_KEY = '@styled_quick_access';
const MAX_QUICK_ACCESS_ITEMS = 8;

// Default quick access items (shown to new users)
const DEFAULT_QUICK_ACCESS: QuickAccessItem[] = [
  {
    id: 'outfit-builder',
    title: 'Outfit Builder',
    subtitle: 'Create new looks',
    icon: '◈',
    route: 'SmartOutfitBuilder',
    color: '#2B1F1A',
  },
  {
    id: 'recommendations',
    title: 'For You',
    subtitle: 'Personalized picks',
    icon: '◉',
    route: 'Recommendations',
    color: '#2B1F1A',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    subtitle: 'Wardrobe insights',
    icon: '▭',
    route: 'ClosetAnalytics',
    color: '#2B1F1A',
  },
  // SUSPENDED: Book Stylist feature - can be reactivated when ready
  // {
  //   id: 'stylists',
  //   title: 'Book Stylist',
  //   subtitle: 'Get expert help',
  //   icon: '◻',
  //   route: 'StylistMarketplace',
  //   color: '#2B1F1A',
  // },
];

// All available items that can be added to quick access
export const AVAILABLE_QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    id: 'outfit-builder',
    title: 'Outfit Builder',
    subtitle: 'Create new looks',
    icon: '◈',
    route: 'SmartOutfitBuilder',
    color: '#2B1F1A',
  },
  {
    id: 'recommendations',
    title: 'For You',
    subtitle: 'Personalized picks',
    icon: '◉',
    route: 'Recommendations',
    color: '#2B1F1A',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    subtitle: 'Wardrobe insights',
    icon: '▭',
    route: 'ClosetAnalytics',
    color: '#2B1F1A',
  },
  // SUSPENDED: Book Stylist feature - can be reactivated when ready
  // {
  //   id: 'stylists',
  //   title: 'Book Stylist',
  //   subtitle: 'Get expert help',
  //   icon: '◻',
  //   route: 'StylistMarketplace',
  //   color: '#2B1F1A',
  // },
  {
    id: 'planner',
    title: 'Outfit Planner',
    subtitle: 'Schedule outfits',
    icon: '▢',
    route: 'OutfitPlanner',
    color: '#2B1F1A',
  },
  {
    id: 'social',
    title: 'Social Feed',
    subtitle: 'See what\'s trending',
    icon: '◎',
    route: 'SocialFeed',
    color: '#2B1F1A',
  },
  {
    id: 'challenges',
    title: 'Challenges',
    subtitle: 'Join style challenges',
    icon: '◆',
    route: 'Challenges',
    color: '#2B1F1A',
  },
  {
    id: 'virtual-stylist',
    title: 'AI Stylist',
    subtitle: 'Get AI suggestions',
    icon: '◐',
    route: 'PremiumStylist',
    color: '#2B1F1A',
  },
  {
    id: 'smart-mirror',
    title: 'Smart Mirror',
    subtitle: 'Virtual try-on',
    icon: '▯',
    route: 'SmartMirror',
    color: '#2B1F1A',
  },
  {
    id: 'subscription',
    title: 'Subscription',
    subtitle: 'Manage plan',
    icon: '◇',
    route: 'Subscription',
    color: '#2B1F1A',
  },
  {
    id: 'widgets',
    title: 'Widgets',
    subtitle: 'Home screen widgets',
    icon: '▭',
    route: 'Widgets',
    color: '#2B1F1A',
  },
  {
    id: 'apple-watch',
    title: 'Apple Watch',
    subtitle: 'Companion app',
    icon: '○',
    route: 'AppleWatch',
    color: '#2B1F1A',
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    subtitle: 'Inclusive features',
    icon: '◍',
    route: 'AccessibilitySettings',
    color: '#2B1F1A',
  },
  {
    id: 'language',
    title: 'Language',
    subtitle: 'Multi-language',
    icon: '◯',
    route: 'LanguageSettings',
    color: '#2B1F1A',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Manage alerts',
    icon: '◔',
    route: 'PushNotifications',
    color: '#2B1F1A',
  },
  {
    id: 'email',
    title: 'Email',
    subtitle: 'Email preferences',
    icon: '▢',
    route: 'EmailCampaigns',
    color: '#2B1F1A',
  },
];

class QuickAccessService {
  /**
   * Get user's quick access items
   */
  async getQuickAccessItems(): Promise<QuickAccessItem[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        let items = JSON.parse(stored);
        
        // Migration: Fix VirtualStylist route to PremiumStylist
        let needsSave = false;
        items = items.map((item: QuickAccessItem) => {
          if (item.route === 'VirtualStylist') {
            needsSave = true;
            return { ...item, route: 'PremiumStylist' };
          }
          return item;
        });
        
        // Save migrated data
        if (needsSave) {
          await this.saveQuickAccessItems(items);
        }
        
        return items;
      }
      // Return defaults for new users
      return DEFAULT_QUICK_ACCESS;
    } catch (error) {
      console.error('Error loading quick access items:', error);
      return DEFAULT_QUICK_ACCESS;
    }
  }

  /**
   * Save quick access items
   */
  async saveQuickAccessItems(items: QuickAccessItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving quick access items:', error);
      throw error;
    }
  }

  /**
   * Add item to quick access
   */
  async addQuickAccessItem(item: QuickAccessItem): Promise<boolean> {
    try {
      const current = await this.getQuickAccessItems();
      
      // Check if already added
      if (current.find(i => i.id === item.id)) {
        return false;
      }

      // Check max limit
      if (current.length >= MAX_QUICK_ACCESS_ITEMS) {
        throw new Error(`Maximum ${MAX_QUICK_ACCESS_ITEMS} quick access items allowed`);
      }

      current.push(item);
      await this.saveQuickAccessItems(current);
      return true;
    } catch (error) {
      console.error('Error adding quick access item:', error);
      throw error;
    }
  }

  /**
   * Remove item from quick access
   */
  async removeQuickAccessItem(itemId: string): Promise<void> {
    try {
      const current = await this.getQuickAccessItems();
      const filtered = current.filter(i => i.id !== itemId);
      await this.saveQuickAccessItems(filtered);
    } catch (error) {
      console.error('Error removing quick access item:', error);
      throw error;
    }
  }

  /**
   * Reorder quick access items
   */
  async reorderQuickAccessItems(items: QuickAccessItem[]): Promise<void> {
    try {
      await this.saveQuickAccessItems(items);
    } catch (error) {
      console.error('Error reordering quick access items:', error);
      throw error;
    }
  }

  /**
   * Reset to defaults
   */
  async resetToDefaults(): Promise<void> {
    try {
      await this.saveQuickAccessItems(DEFAULT_QUICK_ACCESS);
    } catch (error) {
      console.error('Error resetting quick access:', error);
      throw error;
    }
  }

  /**
   * Check if item is pinned
   */
  async isItemPinned(itemId: string): Promise<boolean> {
    try {
      const current = await this.getQuickAccessItems();
      return current.some(i => i.id === itemId);
    } catch (error) {
      console.error('Error checking if item is pinned:', error);
      return false;
    }
  }

  /**
   * Get available items (not yet pinned)
   */
  async getAvailableItems(): Promise<QuickAccessItem[]> {
    try {
      const current = await this.getQuickAccessItems();
      const currentIds = current.map(i => i.id);
      return AVAILABLE_QUICK_ACCESS_ITEMS.filter(i => !currentIds.includes(i.id));
    } catch (error) {
      console.error('Error getting available items:', error);
      return [];
    }
  }

  /**
   * Get max items allowed
   */
  getMaxItems(): number {
    return MAX_QUICK_ACCESS_ITEMS;
  }
}

export const quickAccessService = new QuickAccessService();

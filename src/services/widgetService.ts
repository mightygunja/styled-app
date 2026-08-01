/**
 * Widget Service
 * 
 * Manages home screen widgets for iOS and Android.
 * Supports outfit widgets, wardrobe stats, and quick actions.
 */

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetType = 'outfit' | 'stats' | 'calendar' | 'quick-actions';
export type WidgetTheme = 'light' | 'dark' | 'auto';

export interface Widget {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  title: string;
  description: string;
  enabled: boolean;
  theme: WidgetTheme;
  refreshInterval: number; // minutes
  lastUpdated?: string;
  data?: any;
}

export interface WidgetSettings {
  userId: string;
  autoRefresh: boolean;
  refreshInterval: number; // minutes
  theme: WidgetTheme;
  showImages: boolean;
  showWeather: boolean;
  tapAction: 'open-app' | 'open-outfit' | 'open-wardrobe';
}

export interface OutfitWidget {
  id: string;
  outfitId: string;
  outfitName: string;
  imageUrl: string;
  weather: {
    temp: number;
    condition: string;
    icon: string;
  };
  items: number;
  occasion?: string;
}

export interface StatsWidget {
  id: string;
  totalItems: number;
  totalOutfits: number;
  favoriteItems: number;
  recentlyAdded: number;
  mostWornCategory: string;
  wardrobeValue: number;
}

export interface CalendarWidget {
  id: string;
  date: string;
  outfits: {
    id: string;
    name: string;
    imageUrl: string;
    time: string;
  }[];
}

export interface QuickActionsWidget {
  id: string;
  actions: {
    id: string;
    title: string;
    icon: string;
    action: string;
  }[];
}

export interface WidgetAnalytics {
  totalViews: number;
  totalTaps: number;
  mostViewedWidget: string;
  averageRefreshRate: number;
  lastInteraction?: string;
}

class WidgetService {
  /**
   * Get widget settings
   */
  async getWidgetSettings(userId: string): Promise<WidgetSettings> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      userId,
      autoRefresh: true,
      refreshInterval: 30, // minutes
      theme: 'auto',
      showImages: true,
      showWeather: true,
      tapAction: 'open-app',
    };
  }

  /**
   * Update widget settings
   */
  async updateWidgetSettings(
    userId: string,
    updates: Partial<WidgetSettings>
  ): Promise<WidgetSettings> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const current = await this.getWidgetSettings(userId);
    return { ...current, ...updates };
  }

  /**
   * Get available widgets
   */
  async getAvailableWidgets(): Promise<Widget[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return [
      {
        id: 'widget-outfit-small',
        type: 'outfit',
        size: 'small',
        title: 'Today\'s Outfit',
        description: 'See your outfit for today',
        enabled: true,
        theme: 'auto',
        refreshInterval: 30,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'widget-outfit-medium',
        type: 'outfit',
        size: 'medium',
        title: 'Outfit with Weather',
        description: 'Outfit + weather info',
        enabled: true,
        theme: 'auto',
        refreshInterval: 30,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'widget-outfit-large',
        type: 'outfit',
        size: 'large',
        title: 'Detailed Outfit',
        description: 'Full outfit with items',
        enabled: false,
        theme: 'auto',
        refreshInterval: 30,
      },
      {
        id: 'widget-stats-small',
        type: 'stats',
        size: 'small',
        title: 'Wardrobe Stats',
        description: 'Quick wardrobe overview',
        enabled: true,
        theme: 'auto',
        refreshInterval: 60,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'widget-stats-medium',
        type: 'stats',
        size: 'medium',
        title: 'Detailed Stats',
        description: 'Full wardrobe statistics',
        enabled: false,
        theme: 'auto',
        refreshInterval: 60,
      },
      {
        id: 'widget-calendar-medium',
        type: 'calendar',
        size: 'medium',
        title: 'Outfit Calendar',
        description: 'Upcoming planned outfits',
        enabled: true,
        theme: 'auto',
        refreshInterval: 60,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'widget-actions-small',
        type: 'quick-actions',
        size: 'small',
        title: 'Quick Actions',
        description: 'Fast access to features',
        enabled: true,
        theme: 'auto',
        refreshInterval: 0, // No refresh needed
        lastUpdated: new Date().toISOString(),
      },
    ];
  }

  /**
   * Get enabled widgets
   */
  async getEnabledWidgets(userId: string): Promise<Widget[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const all = await this.getAvailableWidgets();
    return all.filter(w => w.enabled);
  }

  /**
   * Enable widget
   */
  async enableWidget(widgetId: string): Promise<Widget> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const widgets = await this.getAvailableWidgets();
    const widget = widgets.find(w => w.id === widgetId);
    
    if (!widget) {
      throw new Error('Widget not found');
    }

    return { ...widget, enabled: true };
  }

  /**
   * Disable widget
   */
  async disableWidget(widgetId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  /**
   * Get outfit widget data
   */
  async getOutfitWidgetData(userId: string): Promise<OutfitWidget> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      id: 'outfit-widget-1',
      outfitId: 'outfit-today',
      outfitName: 'Business Casual',
      imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
      weather: {
        temp: 72,
        condition: 'Partly Cloudy',
        icon: '⛅',
      },
      items: 4,
      occasion: 'Work',
    };
  }

  /**
   * Get stats widget data
   */
  async getStatsWidgetData(userId: string): Promise<StatsWidget> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      id: 'stats-widget-1',
      totalItems: 127,
      totalOutfits: 45,
      favoriteItems: 23,
      recentlyAdded: 8,
      mostWornCategory: 'Tops',
      wardrobeValue: 12450,
    };
  }

  /**
   * Get calendar widget data
   */
  async getCalendarWidgetData(userId: string): Promise<CalendarWidget> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      id: 'calendar-widget-1',
      date: new Date().toISOString(),
      outfits: [
        {
          id: 'outfit-1',
          name: 'Business Casual',
          imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200',
          time: '9:00 AM',
        },
        {
          id: 'outfit-2',
          name: 'Gym Workout',
          imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200',
          time: '6:00 PM',
        },
      ],
    };
  }

  /**
   * Get quick actions widget data
   */
  async getQuickActionsWidgetData(): Promise<QuickActionsWidget> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      id: 'actions-widget-1',
      actions: [
        { id: 'action-1', title: 'Add Item', icon: '➕', action: 'add-item' },
        { id: 'action-2', title: 'Wardrobe', icon: '👔', action: 'open-wardrobe' },
        { id: 'action-3', title: 'Outfits', icon: '👗', action: 'open-outfits' },
        { id: 'action-4', title: 'Camera', icon: '📷', action: 'open-camera' },
      ],
    };
  }

  /**
   * Refresh widget
   */
  async refreshWidget(widgetId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  /**
   * Refresh all widgets
   */
  async refreshAllWidgets(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  /**
   * Get widget analytics
   */
  async getWidgetAnalytics(userId: string): Promise<WidgetAnalytics> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      totalViews: 1247,
      totalTaps: 342,
      mostViewedWidget: 'Today\'s Outfit',
      averageRefreshRate: 28.5,
      lastInteraction: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Log widget interaction
   */
  async logWidgetInteraction(
    widgetId: string,
    action: 'view' | 'tap' | 'refresh'
  ): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  /**
   * Get widget preview
   */
  async getWidgetPreview(widgetId: string): Promise<{
    id: string;
    type: WidgetType;
    size: WidgetSize;
    previewUrl: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      id: widgetId,
      type: 'outfit',
      size: 'small',
      previewUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300',
    };
  }

  /**
   * Check widget support
   */
  async isWidgetSupported(): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return true; // iOS 14+ and Android 12+
  }

  /**
   * Get widget sizes for platform
   */
  async getSupportedSizes(): Promise<{
    platform: 'ios' | 'android';
    sizes: {
      size: WidgetSize;
      dimensions: { width: number; height: number };
    }[];
  }> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      platform: 'ios',
      sizes: [
        { size: 'small', dimensions: { width: 155, height: 155 } },
        { size: 'medium', dimensions: { width: 329, height: 155 } },
        { size: 'large', dimensions: { width: 329, height: 345 } },
      ],
    };
  }

  /**
   * Test widget rendering
   */
  async testWidgetRendering(widgetId: string): Promise<{
    success: boolean;
    renderTime: number; // ms
    errors?: string[];
  }> {
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      success: true,
      renderTime: 45,
    };
  }
}

export const widgetService = new WidgetService();

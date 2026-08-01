/**
 * Push Notifications Service
 * 
 * Manages push notifications for iOS and Android.
 * Handles notification preferences, scheduling, and delivery.
 */

export type NotificationCategory = 'outfits' | 'wardrobe' | 'social' | 'promotions' | 'reminders' | 'updates';
export type NotificationPriority = 'low' | 'normal' | 'high';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  scheduledFor?: string;
  sentAt?: string;
  readAt?: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionButtons?: {
    id: string;
    title: string;
    action: string;
  }[];
}

export interface NotificationSettings {
  userId: string;
  enabled: boolean;
  categories: {
    outfits: boolean;
    wardrobe: boolean;
    social: boolean;
    promotions: boolean;
    reminders: boolean;
    updates: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  };
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  preview: boolean;
}

export interface NotificationSchedule {
  id: string;
  type: 'daily' | 'weekly' | 'custom';
  time: string; // HH:mm
  days?: number[]; // 0-6 (Sunday-Saturday)
  enabled: boolean;
  title: string;
  body: string;
  category: NotificationCategory;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  deliveryRate: number; // percentage
  readRate: number; // percentage
  avgTimeToRead: number; // minutes
  mostEngagingCategory: string;
  lastSent?: string;
}

export interface DeviceToken {
  token: string;
  platform: 'ios' | 'android';
  registeredAt: string;
  lastUsed?: string;
}

class PushNotificationsService {
  /**
   * Get notification settings
   */
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      userId,
      enabled: true,
      categories: {
        outfits: true,
        wardrobe: true,
        social: true,
        promotions: false,
        reminders: true,
        updates: true,
      },
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
      },
      sound: true,
      vibration: true,
      badge: true,
      preview: true,
    };
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    userId: string,
    updates: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const current = await this.getNotificationSettings(userId);
    return { ...current, ...updates };
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(userId: string): Promise<PushNotification[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
      {
        id: 'notif-1',
        title: 'Today\'s Outfit Ready!',
        body: 'Check out your personalized outfit for today',
        category: 'outfits',
        priority: 'normal',
        status: 'read',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        readAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
        actionButtons: [
          { id: 'view', title: 'View Outfit', action: 'open-outfit' },
          { id: 'dismiss', title: 'Dismiss', action: 'dismiss' },
        ],
      },
      {
        id: 'notif-2',
        title: 'New Item Added',
        body: 'Navy Blazer was added to your wardrobe',
        category: 'wardrobe',
        priority: 'low',
        status: 'read',
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        readAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-3',
        title: 'Sarah liked your outfit',
        body: 'Your "Business Casual" outfit got a like!',
        category: 'social',
        priority: 'normal',
        status: 'read',
        sentAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        readAt: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-4',
        title: 'Plan Tomorrow\'s Outfit',
        body: 'Don\'t forget to plan your outfit for tomorrow',
        category: 'reminders',
        priority: 'normal',
        status: 'delivered',
        sentAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-5',
        title: 'New Feature: Smart Mirror',
        body: 'Try our new virtual try-on feature!',
        category: 'updates',
        priority: 'high',
        status: 'delivered',
        sentAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
      },
    ];
  }

  /**
   * Get scheduled notifications
   */
  async getScheduledNotifications(userId: string): Promise<NotificationSchedule[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return [
      {
        id: 'schedule-1',
        type: 'daily',
        time: '09:00',
        enabled: true,
        title: 'Morning Outfit',
        body: 'Your outfit for today is ready!',
        category: 'outfits',
      },
      {
        id: 'schedule-2',
        type: 'daily',
        time: '20:00',
        enabled: true,
        title: 'Plan Tomorrow',
        body: 'Time to plan tomorrow\'s outfit',
        category: 'reminders',
      },
      {
        id: 'schedule-3',
        type: 'weekly',
        time: '10:00',
        days: [1], // Monday
        enabled: false,
        title: 'Weekly Wardrobe Review',
        body: 'Review your wardrobe analytics',
        category: 'wardrobe',
      },
    ];
  }

  /**
   * Create scheduled notification
   */
  async createScheduledNotification(
    userId: string,
    schedule: Omit<NotificationSchedule, 'id'>
  ): Promise<NotificationSchedule> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      id: `schedule-${Date.now()}`,
      ...schedule,
    };
  }

  /**
   * Update scheduled notification
   */
  async updateScheduledNotification(
    scheduleId: string,
    updates: Partial<NotificationSchedule>
  ): Promise<NotificationSchedule> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const schedules = await this.getScheduledNotifications('user-1');
    const schedule = schedules.find(s => s.id === scheduleId);
    
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    return { ...schedule, ...updates };
  }

  /**
   * Delete scheduled notification
   */
  async deleteScheduledNotification(scheduleId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  /**
   * Send push notification
   */
  async sendPushNotification(
    userId: string,
    notification: Omit<PushNotification, 'id' | 'status' | 'sentAt'>
  ): Promise<PushNotification> {
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      id: `notif-${Date.now()}`,
      ...notification,
      status: 'sent',
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(userId: string): Promise<NotificationAnalytics> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      totalSent: 247,
      totalDelivered: 241,
      totalRead: 189,
      deliveryRate: 97.6,
      readRate: 78.4,
      avgTimeToRead: 23,
      mostEngagingCategory: 'Outfits',
      lastSent: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<{
    granted: boolean;
    status: 'granted' | 'denied' | 'undetermined';
  }> {
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      granted: true,
      status: 'granted',
    };
  }

  /**
   * Check notification permissions
   */
  async checkPermissions(): Promise<{
    granted: boolean;
    status: 'granted' | 'denied' | 'undetermined';
  }> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      granted: true,
      status: 'granted',
    };
  }

  /**
   * Register device token
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android'
  ): Promise<DeviceToken> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      token,
      platform,
      registeredAt: new Date().toISOString(),
    };
  }

  /**
   * Get device token
   */
  async getDeviceToken(userId: string): Promise<DeviceToken | null> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      platform: 'ios',
      registeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Test notification
   */
  async sendTestNotification(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Get notification categories
   */
  async getNotificationCategories(): Promise<{
    id: NotificationCategory;
    name: string;
    description: string;
    icon: string;
  }[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return [
      {
        id: 'outfits',
        name: 'Outfit Suggestions',
        description: 'Daily outfit recommendations',
        icon: '👗',
      },
      {
        id: 'wardrobe',
        name: 'Wardrobe Updates',
        description: 'New items and changes',
        icon: '👔',
      },
      {
        id: 'social',
        name: 'Social Activity',
        description: 'Likes, comments, follows',
        icon: '❤️',
      },
      {
        id: 'promotions',
        name: 'Promotions',
        description: 'Special offers and deals',
        icon: '🎁',
      },
      {
        id: 'reminders',
        name: 'Reminders',
        description: 'Planning and tasks',
        icon: '⏰',
      },
      {
        id: 'updates',
        name: 'App Updates',
        description: 'New features and improvements',
        icon: '🔔',
      },
    ];
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const history = await this.getNotificationHistory(userId);
    return history.filter(n => n.status === 'delivered').length;
  }

  /**
   * Get badge count
   */
  async getBadgeCount(userId: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return await this.getUnreadCount(userId);
  }

  /**
   * Clear badge
   */
  async clearBadge(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

export const pushNotificationsService = new PushNotificationsService();

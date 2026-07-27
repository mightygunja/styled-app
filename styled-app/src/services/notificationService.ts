/**
 * Notification Service
 * 
 * Manages in-app notifications for user activities.
 */

import { UserProfile } from './userProfileService';

export type NotificationType = 
  | 'like' 
  | 'comment' 
  | 'follow' 
  | 'mention' 
  | 'message' 
  | 'post_share'
  | 'stylist_booking'
  | 'session_reminder'
  | 'challenge_invite'
  | 'group_invite';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string;
  actor?: UserProfile;
  targetId?: string;
  targetType?: 'post' | 'comment' | 'message' | 'session' | 'challenge' | 'group';
  title: string;
  message: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  userId: string;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
  messages: boolean;
  shares: boolean;
  bookings: boolean;
  reminders: boolean;
  challenges: boolean;
  groups: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

class NotificationService {
  private notifications: Map<string, Notification[]> = new Map();
  private settings: Map<string, NotificationSettings> = new Map();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.isRead).length;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.isRead = true;
      this.notifications.set(userId, userNotifications);
      return true;
    }
    
    return false;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.forEach(n => n.isRead = true);
    this.notifications.set(userId, userNotifications);
    
    return true;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const userNotifications = this.notifications.get(userId) || [];
    const filtered = userNotifications.filter(n => n.id !== notificationId);
    this.notifications.set(userId, filtered);
    
    return true;
  }

  /**
   * Clear all notifications
   */
  async clearAll(userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this.notifications.set(userId, []);
    return true;
  }

  /**
   * Get notification settings
   */
  async getSettings(userId: string): Promise<NotificationSettings> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let settings = this.settings.get(userId);
    if (!settings) {
      settings = {
        userId,
        likes: true,
        comments: true,
        follows: true,
        mentions: true,
        messages: true,
        shares: true,
        bookings: true,
        reminders: true,
        challenges: true,
        groups: true,
        pushEnabled: true,
        emailEnabled: false,
      };
      this.settings.set(userId, settings);
    }
    
    return settings;
  }

  /**
   * Update notification settings
   */
  async updateSettings(userId: string, updates: Partial<NotificationSettings>): Promise<NotificationSettings> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const current = await this.getSettings(userId);
    const updated = { ...current, ...updates };
    this.settings.set(userId, updated);
    
    return updated;
  }

  /**
   * Create a notification (for testing)
   */
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    
    const userNotifications = this.notifications.get(notification.userId) || [];
    userNotifications.unshift(newNotification);
    this.notifications.set(notification.userId, userNotifications);
    
    return newNotification;
  }

  /**
   * Initialize mock data
   */
  private initializeMockData() {
    const mockNotifications: Notification[] = [
      {
        id: 'notif-1',
        userId: 'current-user',
        type: 'like',
        actorId: 'user-1',
        targetId: 'post-1',
        targetType: 'post',
        title: 'New Like',
        message: 'Emma Style liked your post',
        imageUrl: 'https://picsum.photos/seed/user1/200',
        isRead: false,
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-2',
        userId: 'current-user',
        type: 'comment',
        actorId: 'user-2',
        targetId: 'post-1',
        targetType: 'post',
        title: 'New Comment',
        message: 'Fashion Forward commented: "Love this outfit! 😍"',
        imageUrl: 'https://picsum.photos/seed/user2/200',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-3',
        userId: 'current-user',
        type: 'follow',
        actorId: 'user-3',
        title: 'New Follower',
        message: 'Vintage Vibes started following you',
        imageUrl: 'https://picsum.photos/seed/user3/200',
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-4',
        userId: 'current-user',
        type: 'message',
        actorId: 'user-1',
        targetId: 'conv-1',
        targetType: 'message',
        title: 'New Message',
        message: 'Emma Style sent you a message',
        imageUrl: 'https://picsum.photos/seed/user1/200',
        isRead: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-5',
        userId: 'current-user',
        type: 'stylist_booking',
        actorId: 'stylist-1',
        targetId: 'session-1',
        targetType: 'session',
        title: 'Booking Confirmed',
        message: 'Your styling session with Sarah Johnson is confirmed for tomorrow',
        imageUrl: 'https://picsum.photos/seed/stylist1/200',
        isRead: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-6',
        userId: 'current-user',
        type: 'post_share',
        actorId: 'user-2',
        targetId: 'post-2',
        targetType: 'post',
        title: 'Post Shared',
        message: 'Fashion Forward shared your post',
        imageUrl: 'https://picsum.photos/seed/user2/200',
        isRead: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    this.notifications.set('current-user', mockNotifications);
  }
}

export const notificationService = new NotificationService();

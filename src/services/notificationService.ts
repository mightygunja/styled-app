/**
 * Notification Service
 *
 * Manages in-app notifications for user activities.
 * Backed by Firestore (`notifications` + `notificationSettings` collections).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
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
  | 'group_invite'
  // Written by the backend (e.g. stylist approval) - no acting user behind it.
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  actorId?: string;
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

const DEFAULT_SETTINGS: Omit<NotificationSettings, 'userId'> = {
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

function toNotification(id: string, data: any): Notification {
  return {
    id,
    ...data,
    createdAt:
      data.createdAt && typeof data.createdAt.toDate === 'function'
        ? data.createdAt.toDate().toISOString()
        : data.createdAt || new Date().toISOString(),
  };
}

class NotificationService {
  /**
   * Get notifications for a user
   */
  async getNotifications(userId: string, limitCount: number = 50): Promise<Notification[]> {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      fsLimit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => toNotification(d.id, d.data()));
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
    return true;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('isRead', '==', false));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(d => updateDoc(d.ref, { isRead: true })));
    return true;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    await deleteDoc(doc(db, 'notifications', notificationId));
    return true;
  }

  /**
   * Clear all notifications
   */
  async clearAll(userId: string): Promise<boolean> {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
    return true;
  }

  /**
   * Get notification settings
   */
  async getSettings(userId: string): Promise<NotificationSettings> {
    const ref = doc(db, 'notificationSettings', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { userId, ...snap.data() } as NotificationSettings;
    }
    const defaults = { userId, ...DEFAULT_SETTINGS };
    await setDoc(ref, DEFAULT_SETTINGS);
    return defaults;
  }

  /**
   * Update notification settings
   */
  async updateSettings(userId: string, updates: Partial<NotificationSettings>): Promise<NotificationSettings> {
    await this.getSettings(userId); // ensure doc exists
    await updateDoc(doc(db, 'notificationSettings', userId), updates as any);
    return this.getSettings(userId);
  }

  /**
   * Create a notification
   */
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
    const data = { ...notification, createdAt: Timestamp.now() };
    const docRef = await addDoc(collection(db, 'notifications'), data);
    return toNotification(docRef.id, data);
  }
}

export const notificationService = new NotificationService();

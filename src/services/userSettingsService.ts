/**
 * Single real Firestore-backed settings document per user, replacing five
 * separate mock screens (Language, Accessibility, Push Notifications, Email
 * Campaigns, Offline Mode) that each simulated their own fake persistence.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserSettings {
  language: string;
  region: string;
  largeText: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  pushNotifications: boolean;
  emailUpdates: boolean;
  offlineCacheEnabled: boolean;
  feedShowFollowingOnly: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  language: 'English',
  region: 'United States',
  largeText: false,
  reduceMotion: false,
  highContrast: false,
  pushNotifications: true,
  emailUpdates: true,
  offlineCacheEnabled: false,
  feedShowFollowingOnly: false,
};

export const userSettingsService = {
  get: async (userId: string): Promise<UserSettings> => {
    const snap = await getDoc(doc(db, 'userSettings', userId));
    if (!snap.exists()) return DEFAULT_USER_SETTINGS;
    return { ...DEFAULT_USER_SETTINGS, ...snap.data() } as UserSettings;
  },

  update: async (userId: string, updates: Partial<UserSettings>): Promise<void> => {
    await setDoc(doc(db, 'userSettings', userId), updates, { merge: true });
  },
};

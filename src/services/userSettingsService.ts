/**
 * Single real Firestore-backed settings document per user.
 *
 * Deliberately small: every setting here is read by the surface it names.
 * The old accessibility, language, push/email and offline-cache toggles
 * persisted bits that no screen or service ever read back - switches that
 * saved and reloaded but changed nothing. They are gone until the behavior
 * they name actually exists.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserSettings {
  // Read by SocialFeedScreen: when true the feed keeps only posts from
  // people the user follows (and their own).
  feedShowFollowingOnly: boolean;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  feedShowFollowingOnly: false,
};

export const userSettingsService = {
  get: async (userId: string): Promise<UserSettings> => {
    const snap = await getDoc(doc(db, 'userSettings', userId));
    if (!snap.exists()) return DEFAULT_USER_SETTINGS;
    const data = snap.data();
    return {
      feedShowFollowingOnly: Boolean(data.feedShowFollowingOnly),
    };
  },

  update: async (userId: string, updates: Partial<UserSettings>): Promise<void> => {
    await setDoc(doc(db, 'userSettings', userId), updates, { merge: true });
  },
};

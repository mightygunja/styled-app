import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import {
  initializeAuth,
  getReactNativePersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
// TODO: Replace with your Firebase project credentials
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
/**
 * `ignoreUndefinedProperties` makes Firestore drop undefined fields instead of
 * throwing on them.
 *
 * Without it, any write containing an optional field that happens to be absent
 * fails the whole document. That is how a user with no profile photo could not
 * get a profile created at all: `profileImageUrl: photoURL || undefined` threw
 * rather than simply omitting the field.
 *
 * Optional fields are pervasive in this app's models - brand, price,
 * purchaseDate, location - so treating "absent" as an error rather than as
 * absence was always going to surface eventually, and it surfaces as a total
 * write failure rather than a partial one.
 */
function createFirestore() {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    // initializeFirestore throws if Firestore was already started for this app.
    // In development that happens on every Fast Refresh, since the module
    // re-evaluates against an app instance that survived the reload. Falling
    // back to the existing instance keeps the reload working; the setting is
    // already applied on it from the cold start.
    return getFirestore(app);
  }
}

export const db = createFirestore();
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Auth with platform-appropriate persistence. On native, the
// AsyncStorage wrapper - without it the SDK defaults to in-memory state and
// silently logs users out on every restart. On web, the browser's own
// localStorage persistence; the RN wrapper is not built for a DOM
// environment and web is where popup/redirect sign-in flows live.
//
// The resolver matters: unlike getAuth(), initializeAuth registers NO
// popup/redirect machinery unless one is passed. Without it every
// signInWithPopup call rejects immediately with auth/argument-error before
// any window opens - which is how "Continue with Google" on web was failing
// for everyone.
export const auth = initializeAuth(
  app,
  Platform.OS === 'web'
    ? {
        persistence: browserLocalPersistence,
        popupRedirectResolver: browserPopupRedirectResolver,
      }
    : {
        persistence: getReactNativePersistence(AsyncStorage),
      }
);

export default app;

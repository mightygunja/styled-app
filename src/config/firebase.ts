import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
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
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Auth with AsyncStorage-backed persistence - without this, the Firebase JS
// SDK defaults to in-memory auth state on React Native, silently logging users out on
// every app restart.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export default app;

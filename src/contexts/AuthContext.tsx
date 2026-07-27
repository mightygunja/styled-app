import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure Google Sign-In once at first use. The web client ID comes from
// Firebase Console -> Authentication -> Sign-in method -> Google (after enabling it).
let googleSigninConfigured = false;
function ensureGoogleConfigured() {
  if (googleSigninConfigured) return;
  // Lazy require so this file doesn't crash to load in environments (like Expo Go)
  // where the native module isn't linked - only touched when the user actually
  // taps "Continue with Google".
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
  googleSigninConfigured = true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Update profile with display name
      if (result.user) {
        await updateProfile(result.user, { displayName });
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signInWithGoogle = async () => {
    if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      throw new Error(
        'Google Sign-In is not configured yet (missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).'
      );
    }

    try {
      ensureGoogleConfigured();
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      const idToken = response.data?.idToken ?? response.idToken;
      if (!idToken) {
        throw new Error('Google did not return an ID token.');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (error: any) {
      if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === -5) {
        return; // user closed the picker - not an error worth surfacing
      }
      if (error?.message?.includes('RNGoogleSignin') || error?.message?.includes('native module')) {
        throw new Error(
          "Google Sign-In needs the full app build (EAS dev client) - it can't run inside Expo Go."
        );
      }
      throw new Error(error.message || 'Google sign-in failed');
    }
  };

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Sign in with Apple is only available on iOS.');
    }

    try {
      // Lazy require for the same reason as Google above.
      const AppleAuthentication = require('expo-apple-authentication');

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error(
          "Sign in with Apple needs the full app build (EAS dev client) - it can't run inside Expo Go."
        );
      }

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!appleCredential.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }

      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: appleCredential.identityToken,
      });

      const result = await signInWithCredential(auth, firebaseCredential);

      // Apple only sends the user's name on the very first sign-in - capture it then.
      const fullName = appleCredential.fullName;
      if (fullName && (fullName.givenName || fullName.familyName) && result.user && !result.user.displayName) {
        const displayName = [fullName.givenName, fullName.familyName].filter(Boolean).join(' ');
        if (displayName) {
          await updateProfile(result.user, { displayName });
        }
      }
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return; // user closed the picker - not an error worth surfacing
      }
      throw new Error(error.message || 'Apple sign-in failed');
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

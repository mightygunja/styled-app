import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  FacebookAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  getAdditionalUserInfo,
  fetchSignInMethodsForEmail,
  deleteUser,
  reauthenticateWithCredential,
} from 'firebase/auth';
import * as Crypto from 'expo-crypto';
import { auth } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
  clearIsNewUser: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Required by App Store Guideline 5.1.1(v) for any app offering Sign in with Apple. */
  deleteAccount: () => Promise<void>;
  isFacebookConfigured: boolean;
}

/**
 * Turns Firebase's account-collision error into something a person can act on.
 *
 * This fires when someone signed up with, say, Google and later taps Facebook
 * with the same email address. Firebase refuses the second credential and
 * returns an opaque code; without this the user just sees a failure and has no
 * idea which button to press instead.
 */
async function describeAccountCollision(error: any): Promise<string> {
  const email = error?.customData?.email;
  if (!email) {
    return 'An account already exists with this email using a different sign-in method.';
  }

  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    const friendly = methods
      .map(m => {
        if (m.includes('google')) return 'Google';
        if (m.includes('apple')) return 'Apple';
        if (m.includes('facebook')) return 'Facebook';
        if (m.includes('password')) return 'email and password';
        return m;
      })
      .filter(Boolean);

    if (friendly.length > 0) {
      return `You already have an account for ${email}. Sign in with ${friendly.join(' or ')} instead.`;
    }
  } catch {
    // Falls through to the generic message below - a lookup failure here
    // should not replace the original, more useful error.
  }

  return `An account already exists for ${email} using a different sign-in method.`;
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
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
  googleSigninConfigured = true;
}

/** Whether Facebook sign-in can work in this build. Mirrors the condition in
 *  app.config.js that decides whether the native plugin is included at all. */
const isFacebookConfigured = !!(
  process.env.EXPO_PUBLIC_FACEBOOK_APP_ID && process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN
);

/** Cryptographically random nonce for Sign in with Apple. */
async function generateRawNonce(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const clearIsNewUser = () => setIsNewUser(false);

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
      setIsNewUser(true);
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
      const result = await signInWithCredential(auth, credential);
      if (getAdditionalUserInfo(result)?.isNewUser) {
        setIsNewUser(true);
      }
    } catch (error: any) {
      if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === -5) {
        return; // user closed the picker - not an error worth surfacing
      }
      if (error?.code === 'auth/account-exists-with-different-credential') {
        throw new Error(await describeAccountCollision(error));
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

      // Nonce binds this specific sign-in to this specific request. Apple is
      // given the SHA-256 hash and embeds it in the identity token; Firebase is
      // given the raw value and checks the two agree. Without it, an identity
      // token intercepted from another session could be replayed here.
      const rawNonce = await generateRawNonce();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!appleCredential.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }

      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: appleCredential.identityToken,
        rawNonce,
      });

      const result = await signInWithCredential(auth, firebaseCredential);
      if (getAdditionalUserInfo(result)?.isNewUser) {
        setIsNewUser(true);
      }

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
      if (error?.code === 'auth/account-exists-with-different-credential') {
        throw new Error(await describeAccountCollision(error));
      }
      throw new Error(error.message || 'Apple sign-in failed');
    }
  };

  const signInWithFacebook = async () => {
    if (!isFacebookConfigured) {
      throw new Error(
        'Facebook sign-in is not configured yet (missing EXPO_PUBLIC_FACEBOOK_APP_ID / EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN).'
      );
    }

    try {
      // Lazy require for the same reason as Google and Apple above.
      const { LoginManager, AccessToken, Settings } = require('react-native-fbsdk-next');

      // Explicit opt-in rather than relying on plugin defaults, so tracking
      // stays off regardless of how the native side was configured.
      Settings.setAdvertiserTrackingEnabled(false);

      const loginResult = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (loginResult.isCancelled) {
        return; // user backed out - not an error worth surfacing
      }

      const tokenData = await AccessToken.getCurrentAccessToken();
      if (!tokenData?.accessToken) {
        throw new Error('Facebook did not return an access token.');
      }

      const credential = FacebookAuthProvider.credential(tokenData.accessToken.toString());
      const result = await signInWithCredential(auth, credential);
      if (getAdditionalUserInfo(result)?.isNewUser) {
        setIsNewUser(true);
      }
    } catch (error: any) {
      if (error?.code === 'auth/account-exists-with-different-credential') {
        throw new Error(await describeAccountCollision(error));
      }
      if (error?.message?.includes('RNFBSDK') || error?.message?.includes('native module')) {
        throw new Error(
          "Facebook sign-in needs the full app build (EAS dev client) - it can't run inside Expo Go."
        );
      }
      throw new Error(error.message || 'Facebook sign-in failed');
    }
  };

  /**
   * Deletes the account and signs the user out.
   *
   * Apple requires this for any app offering Sign in with Apple (App Store
   * Guideline 5.1.1(v)) - offering the button without a way to delete the
   * account is a rejection.
   *
   * Firebase refuses to delete a user whose sign-in is stale, so the caller is
   * told to sign in again rather than being left with a silent failure. The
   * user's Firestore documents are intentionally NOT removed here: that is a
   * multi-collection cascade that belongs in a Cloud Function triggered on
   * user deletion, where it can complete even if the app is closed.
   */
  const deleteAccount = async () => {
    const current = auth.currentUser;
    if (!current) {
      throw new Error('You are not signed in.');
    }

    try {
      await deleteUser(current);
    } catch (error: any) {
      if (error?.code === 'auth/requires-recent-login') {
        throw new Error(
          'For your security, please sign out and sign in again, then delete your account.'
        );
      }
      throw new Error(error.message || 'Could not delete your account.');
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
    isNewUser,
    clearIsNewUser,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signInWithFacebook,
    signOut,
    deleteAccount,
    isFacebookConfigured,
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

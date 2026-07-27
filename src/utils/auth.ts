import { auth } from '../config/firebase';

/**
 * Get the current user's ID. Auth is required before the main app is reachable,
 * so auth.currentUser is always set here in practice.
 */
export function getCurrentUserId(): string {
  return auth.currentUser?.uid || 'anonymous';
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}

/**
 * Get current user's display name
 */
export function getCurrentUserName(): string | null {
  return auth.currentUser?.displayName || null;
}

/**
 * Get current user's email
 */
export function getCurrentUserEmail(): string | null {
  return auth.currentUser?.email || null;
}

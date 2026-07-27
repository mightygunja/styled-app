import { auth } from '../config/firebase';

/**
 * Get the current user's ID
 * Falls back to MOCK_USER_ID if not authenticated (for development)
 */
export function getCurrentUserId(): string {
  return auth.currentUser?.uid || 'mock-user-123';
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

/**
 * Plain-English messages for Firebase auth failures.
 *
 * Firebase throws messages like "Firebase: Error (auth/email-already-in-use)."
 * which the app was surfacing verbatim. That tells a user nothing about what
 * to do next, and it leaks the fact that a given email is registered in a
 * shape that reads like a crash.
 */

/**
 * Apple's own failures, which arrive as opaque strings from the system.
 *
 * "Sign Up Not Completed" in particular tells the user nothing - it is what
 * iOS shows when Sign in with Apple cannot proceed, and in practice that is
 * almost always the signed-in Apple ID lacking two-factor authentication
 * (Apple requires it), account changes being blocked under Screen Time, or
 * the App ID missing the Sign In with Apple capability.
 */
export function appleErrorMessage(error: any): string | null {
  const raw: string = error?.message || '';
  const code: string = error?.code || '';

  if (code === 'ERR_REQUEST_CANCELED' || /canceled|cancelled/i.test(raw)) return null;

  if (/sign\s*up not completed/i.test(raw)) {
    return 'Apple could not complete the sign-in. This usually means the Apple ID on this device does not have two-factor authentication turned on, which Apple requires — or that account changes are blocked under Screen Time.';
  }
  if (/not handled|unknown/i.test(raw)) {
    return 'Apple could not complete the sign-in. Check that you are signed into iCloud on this device and try again.';
  }
  if (/not available|unsupported/i.test(raw)) {
    return 'Sign in with Apple is not available on this device.';
  }
  return null;
}

export function authErrorMessage(error: any): string {
  const code: string = error?.code || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'There is already an account with that email. Try signing in instead.';
    case 'auth/invalid-email':
      return "That email address doesn't look right.";
    case 'auth/weak-password':
      return 'Passwords need to be at least 6 characters.';
    case 'auth/missing-password':
      return 'Enter a password.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      // Deliberately one message for all three. Distinguishing "no such
      // account" from "wrong password" tells an attacker which emails are
      // registered.
      return 'That email and password combination did not work.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your network and try again.';
    case 'auth/operation-not-allowed':
      // Almost always a console misconfiguration rather than user error, so
      // it says so rather than blaming the person typing.
      return 'Email sign-in is not enabled for this app yet.';
    case 'auth/user-disabled':
      return 'That account has been disabled.';
    default:
      break;
  }

  // Strip Firebase's wrapper if an unmapped code slips through, so the user
  // sees the sentence rather than the plumbing.
  const raw: string = error?.message || '';
  const cleaned = raw.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\.?$/, '');
  return cleaned || 'Something went wrong. Please try again.';
}

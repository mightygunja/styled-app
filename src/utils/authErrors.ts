/**
 * Plain-English messages for Firebase auth failures.
 *
 * Firebase throws messages like "Firebase: Error (auth/email-already-in-use)."
 * which the app was surfacing verbatim. That tells a user nothing about what
 * to do next, and it leaks the fact that a given email is registered in a
 * shape that reads like a crash.
 */

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

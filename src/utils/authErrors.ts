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

  // Apple's failures are indistinguishable from each other in the UI, so the
  // identifying detail is appended. It is not sensitive - it names the failure
  // mode, not the account - and without it every report is "it said sign up
  // not completed", which fits four different causes.
  const detail = [code, error?.domain, error?.nativeStackIOS ? null : undefined]
    .filter(Boolean)
    .join(' ');
  const suffix = detail ? `\n\n(${detail})` : '';

  if (/sign\s*up not completed/i.test(raw)) {
    return (
      'Apple could not complete the sign-in.\n\n' +
      'Three things cause this, in order of likelihood:\n' +
      '1. The Apple ID on this device has no two-factor authentication. Apple requires it. ' +
      'Settings → your name → Sign-In & Security.\n' +
      '2. Screen Time is blocking account changes. Settings → Screen Time → Content & Privacy ' +
      'Restrictions → Account Changes → Allow.\n' +
      '3. This app is already listed under Settings → your name → Sign in with Apple. ' +
      'Choose it and Stop Using Apple ID, then try again.' +
      suffix
    );
  }
  if (/not handled|unknown/i.test(raw)) {
    return (
      'Apple could not complete the sign-in. Check that you are signed into iCloud on this ' +
      'device and try again.' + suffix
    );
  }
  if (/not available|unsupported/i.test(raw)) {
    return 'Sign in with Apple is not available on this device.' + suffix;
  }

  // Anything unmapped still carries its code, so a report is actionable.
  if (raw) return `${raw}${suffix}`;
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
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
    case 'auth/unauthorized-domain':
      return 'Sign-in is not authorized for this address yet. Please write to support@thirtythreetrends.com.';
    default:
      break;
  }

  // Strip Firebase's wrapper if an unmapped code slips through, so the user
  // sees the sentence rather than the plumbing. Firebase's generic shape is
  // "Firebase: Error (auth/some-code)." - stripping both halves used to leave
  // just the word "Error" on screen, which hid the code that identified the
  // popup-resolver bug. Unmapped codes now stay visible so reports are
  // actionable.
  const raw: string = error?.message || '';
  const cleaned = raw.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\.?$/, '');
  if (cleaned && cleaned !== 'Error') return cleaned;
  return error?.code
    ? `Something went wrong (${error.code}). Please try again.`
    : 'Something went wrong. Please try again.';
}

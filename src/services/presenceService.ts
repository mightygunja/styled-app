/**
 * Presence: one small write per session so Admin > Members can say when a
 * member was last in the app and on what. Firebase Auth only records fresh
 * sign-ins, which a returning user with a live session never performs, so
 * without this the admin page could not tell "signed up and left" from
 * "opens it every day".
 *
 * Writes only to the member's own users/{uid} document (owner-writable by
 * the rules) and never blocks anything: a failure is swallowed.
 */

import { Platform } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_VERSION: string = require('../../app.json').expo?.version ?? 'unknown';

let recordedFor: string | null = null;

/** Records the session once per app launch per account. */
export async function recordSession(uid: string): Promise<void> {
  if (recordedFor === uid) return;
  recordedFor = uid;
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        lastActiveAt: serverTimestamp(),
        lastPlatform: Platform.OS,
        lastAppVersion: APP_VERSION,
      },
      { merge: true }
    );
  } catch {
    // Presence is a nicety; never surface a failure to the member.
  }
}

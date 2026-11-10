/**
 * Garment care: the writes and the one AI call behind the item page's
 * "Life" card and the revive list. The rules live in garmentLife.ts (pure);
 * this file only moves data.
 *
 *   - care log and revive flag are fields on the user's own closet item
 *     (`careLog`, `reviveUntil`) - the owner can already write those, so no
 *     new collection and no rules change;
 *   - "passed on" is a per-user tally on users/{uid}.passedOn, counted only
 *     when someone removes a piece from here and says where it went.
 */

import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, increment, setDoc } from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { CareIssue, CareIssueId, careIssue } from '../data/careGuide';
import { readImageAsBase64 } from '../utils/imageData';
import { closetAPI, getCurrentUserId } from './api';
import { uploadImageToFirebase } from './firebaseStorage';
import { CareRecord, readCareLog, reviveUntilFrom } from './garmentLife';

const diagnoseGarmentIssueFn = httpsCallable(functions, 'diagnoseGarmentIssue');

export interface IssueReading {
  /** The issue the photo most looks like, or null when it shows none or cannot be told. */
  issue: CareIssue | null;
  confidence: 'high' | 'medium' | 'low';
  /** What the model could actually see, in one sentence. */
  seen: string;
}

/**
 * Looks at a photo of the problem and says what it most resembles. A reading,
 * not a diagnosis: the caller shows it as "looks like", with the confidence,
 * and the user can always pick the issue themselves.
 */
export async function readIssueFromPhoto(uri: string, category?: string): Promise<IssueReading> {
  const base64 = await readImageAsBase64(uri);
  const imageUrl = await uploadImageToFirebase(`data:image/jpeg;base64,${base64}`, getCurrentUserId());
  const result = await diagnoseGarmentIssueFn({ imageUrl, category });
  const data = (result.data as any)?.data || {};
  const confidence = ['high', 'medium', 'low'].includes(data.confidence) ? data.confidence : 'low';
  return { issue: careIssue(data.issue), confidence, seen: String(data.seen || '').slice(0, 200) };
}

/**
 * Adds a fix to a piece's life record. `changes` carries what an alteration
 * did to the garment itself (its fit, its colour); the outfit engine and the
 * matchers read those fields, so the altered piece is styled as it now is.
 */
export async function logCare(
  itemId: string,
  existing: unknown,
  record: CareRecord,
  changes: { fitType?: string; color?: string } = {}
): Promise<CareRecord[]> {
  const careLog = [record, ...readCareLog(existing)].slice(0, 40);
  const updates: Record<string, unknown> = { careLog };
  if (changes.fitType) updates.fitType = changes.fitType;
  if (changes.color) updates.color = changes.color.trim().toLowerCase();
  await closetAPI.update(itemId, updates);
  return careLog;
}

/** Puts a piece on the "wear it this week" list. Returns the date stored. */
export async function reviveThisWeek(itemId: string): Promise<string> {
  const reviveUntil = reviveUntilFrom();
  await closetAPI.update(itemId, { reviveUntil });
  return reviveUntil;
}

export type PassedOnKind = 'sold' | 'swapped' | 'donated';

/** Counts a piece that left the closet for another wearer. Never blocks the removal it follows. */
export async function recordPassedOn(kind: PassedOnKind): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', getCurrentUserId()),
      { passedOn: { [kind]: increment(1) } },
      { merge: true }
    );
  } catch (error) {
    console.log('Could not record a passed-on piece', error);
  }
}

/** How many pieces this user has passed on from the app. Zero on any failure. */
export async function getPassedOnCount(): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'users', getCurrentUserId()));
    const tally = (snap.data() as any)?.passedOn || {};
    return ['sold', 'swapped', 'donated'].reduce((sum, key) => sum + (Number(tally[key]) || 0), 0);
  } catch {
    return 0;
  }
}

export const garmentCareService = {
  readIssueFromPhoto,
  logCare,
  reviveThisWeek,
  recordPassedOn,
  getPassedOnCount,
};

export type { CareIssueId };

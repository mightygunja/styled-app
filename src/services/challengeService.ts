/**
 * Real Firestore-backed style challenges, entries, and voting.
 */

import {
  collection, doc, getDoc, getDocs, addDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp, increment, updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from './userProfileService';

export type ChallengeStatus = 'upcoming' | 'active' | 'completed';
export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'special';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  status: ChallengeStatus;
  imageUrl?: string;
  prize?: string;
  startDate: string;
  endDate: string;
  participants: number;
  entries: number;
  rules: string[];
  hashtags: string[];
  createdBy: string;
  createdAt: string;
}

export interface ChallengeEntry {
  id: string;
  challengeId: string;
  userId: string;
  postId: string;
  imageUrl: string;
  caption: string;
  votes: number;
  hasVoted?: boolean;
  user?: UserProfile;
  createdAt: string;
}

function toIso(v: any): string {
  return v instanceof Timestamp ? v.toDate().toISOString() : v;
}

class ChallengeService {
  async getChallenges(status?: ChallengeStatus): Promise<Challenge[]> {
    const constraints = status
      ? [where('status', '==', status), orderBy('startDate', 'desc')]
      : [orderBy('startDate', 'desc')];
    const snapshot = await getDocs(query(collection(db, 'challenges'), ...constraints, limit(50)));
    return snapshot.docs.map(d => ({
      id: d.id, ...d.data(),
      startDate: toIso(d.data().startDate), endDate: toIso(d.data().endDate), createdAt: toIso(d.data().createdAt),
    } as Challenge));
  }

  async getChallenge(challengeId: string): Promise<Challenge | null> {
    const snap = await getDoc(doc(db, 'challenges', challengeId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { id: snap.id, ...data, startDate: toIso(data.startDate), endDate: toIso(data.endDate), createdAt: toIso(data.createdAt) } as Challenge;
  }

  async hasJoinedChallenge(challengeId: string, userId: string): Promise<boolean> {
    const snap = await getDocs(query(
      collection(db, 'challengeParticipants'),
      where('challengeId', '==', challengeId),
      where('userId', '==', userId),
      limit(1)
    ));
    return !snap.empty;
  }

  async joinChallenge(challengeId: string, userId: string): Promise<boolean> {
    const already = await this.hasJoinedChallenge(challengeId, userId);
    if (already) return true;
    await addDoc(collection(db, 'challengeParticipants'), { challengeId, userId, joinedAt: Timestamp.now() });
    await updateDoc(doc(db, 'challenges', challengeId), { participants: increment(1) });
    return true;
  }

  async getChallengeEntries(challengeId: string, currentUserId: string): Promise<ChallengeEntry[]> {
    const snapshot = await getDocs(query(
      collection(db, 'challengeEntries'),
      where('challengeId', '==', challengeId),
      orderBy('votes', 'desc')
    ));
    const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toIso(d.data().createdAt) } as ChallengeEntry));
    const voteSnap = await getDocs(query(collection(db, 'challengeVotes'), where('userId', '==', currentUserId), where('challengeId', '==', challengeId)));
    const votedEntryIds = new Set(voteSnap.docs.map(d => d.data().entryId));
    return entries.map(e => ({ ...e, hasVoted: votedEntryIds.has(e.id) }));
  }

  async submitEntry(challengeId: string, userId: string, postId: string, imageUrl: string, caption: string): Promise<ChallengeEntry> {
    const data = { challengeId, userId, postId, imageUrl, caption, votes: 0, createdAt: Timestamp.now() };
    const docRef = await addDoc(collection(db, 'challengeEntries'), data);
    await updateDoc(doc(db, 'challenges', challengeId), { entries: increment(1) });
    return { id: docRef.id, ...data, createdAt: data.createdAt.toDate().toISOString() };
  }

  async voteForEntry(entryId: string, userId: string): Promise<void> {
    const entrySnap = await getDoc(doc(db, 'challengeEntries', entryId));
    if (!entrySnap.exists()) return;
    const challengeId = entrySnap.data().challengeId;
    const existing = await getDocs(query(
      collection(db, 'challengeVotes'),
      where('entryId', '==', entryId),
      where('userId', '==', userId),
      limit(1)
    ));
    if (!existing.empty) return;
    await addDoc(collection(db, 'challengeVotes'), { entryId, challengeId, userId, votedAt: Timestamp.now() });
    await updateDoc(doc(db, 'challengeEntries', entryId), { votes: increment(1) });
  }

  async unvoteForEntry(entryId: string, userId: string): Promise<void> {
    const existing = await getDocs(query(
      collection(db, 'challengeVotes'),
      where('entryId', '==', entryId),
      where('userId', '==', userId),
      limit(1)
    ));
    if (existing.empty) return;
    await deleteDoc(doc(db, 'challengeVotes', existing.docs[0].id));
    await updateDoc(doc(db, 'challengeEntries', entryId), { votes: increment(-1) });
  }
}

export const challengeService = new ChallengeService();

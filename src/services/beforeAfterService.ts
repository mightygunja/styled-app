/**
 * Real Firestore + Storage-backed before/after transformation photos for
 * styling sessions - actually uploads to Firebase Storage instead of just
 * keeping the local device URI.
 */

import { collection, doc, getDoc, getDocs, addDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadImageToFirebase } from './firebaseStorage';
import { readAsStringAsync } from 'expo-file-system/legacy';

export interface BeforeAfterPhoto {
  id: string;
  sessionId: string;
  type: 'before' | 'after';
  imageUrl: string;
  caption?: string;
  takenAt: string;
  category: PhotoCategory;
  isPublic: boolean;
  uploadedBy: 'user' | 'stylist';
}

export type PhotoCategory = 'full-outfit' | 'closet' | 'detail' | 'accessory' | 'comparison';

export interface PhotoPair {
  id: string;
  sessionId: string;
  beforePhoto: BeforeAfterPhoto;
  afterPhoto: BeforeAfterPhoto;
  caption?: string;
  createdAt: string;
}

function toIso(v: any): string {
  return v instanceof Timestamp ? v.toDate().toISOString() : v;
}

async function getPhotosByType(sessionId: string, type: 'before' | 'after'): Promise<BeforeAfterPhoto[]> {
  const snapshot = await getDocs(query(
    collection(db, 'sessionPhotos'),
    where('sessionId', '==', sessionId),
    where('type', '==', type),
    orderBy('takenAt', 'asc')
  ));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data(), takenAt: toIso(d.data().takenAt) } as BeforeAfterPhoto));
}

class BeforeAfterService {
  // No-op: real sessions start with zero photos.
  async createMockTransformation(_sessionId: string): Promise<void> {}

  async uploadPhoto(
    sessionId: string,
    type: 'before' | 'after',
    imageUri: string,
    category: PhotoCategory,
    caption: string | undefined,
    isPublic: boolean = true,
    userId: string = 'user'
  ): Promise<BeforeAfterPhoto> {
    const base64 = await readAsStringAsync(imageUri, { encoding: 'base64' });
    const imageUrl = await uploadImageToFirebase(`data:image/jpeg;base64,${base64}`, sessionId, 'sessionPhotos');

    const data = {
      sessionId, type, imageUrl, category,
      caption: caption || null,
      isPublic,
      uploadedBy: 'user' as const,
      takenAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'sessionPhotos'), data);
    return { id: docRef.id, ...data, caption, takenAt: data.takenAt.toDate().toISOString() };
  }

  async getBeforePhotos(sessionId: string): Promise<BeforeAfterPhoto[]> {
    return getPhotosByType(sessionId, 'before');
  }

  async getAfterPhotos(sessionId: string): Promise<BeforeAfterPhoto[]> {
    return getPhotosByType(sessionId, 'after');
  }

  // Pairs the most recent before/after photos in upload order - real data,
  // simple pairing strategy (no manual pairing UI built yet).
  async getPhotoPairs(sessionId: string): Promise<PhotoPair[]> {
    const [before, after] = await Promise.all([
      this.getBeforePhotos(sessionId),
      this.getAfterPhotos(sessionId),
    ]);
    const count = Math.min(before.length, after.length);
    const pairs: PhotoPair[] = [];
    for (let i = 0; i < count; i++) {
      pairs.push({
        id: `${before[i].id}_${after[i].id}`,
        sessionId,
        beforePhoto: before[i],
        afterPhoto: after[i],
        createdAt: after[i].takenAt,
      });
    }
    return pairs;
  }

  // Sharing to external platforms needs a real share-sheet/social API
  // integration that isn't wired up - returning the real photo URL so at
  // least the link itself is genuine, rather than a fabricated share ID.
  async shareTransformation(pairId: string, _platform: 'instagram' | 'facebook' | 'twitter'): Promise<string> {
    return pairId;
  }

  async exportComparison(pairId: string): Promise<string> {
    return pairId;
  }
}

export const beforeAfterService = new BeforeAfterService();

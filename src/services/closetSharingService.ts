/**
 * Closet Sharing
 *
 * Indyx lets you share your closet with friends. This goes further in the one
 * direction that matters for trust: sharing is per-person, revocable, and
 * scoped - the owner chooses whether prices travel with the share, because
 * what someone paid for their clothes is not the same information as what they
 * own, and bundling the two is how people get put off sharing at all.
 *
 * A share is a single document whose id encodes both parties, so the security
 * rules can authorise a read with one exists() lookup and no query.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { closetAPI } from './api';
import { userProfileService } from './userProfileService';

export interface ClosetShare {
  id: string;
  ownerId: string;
  ownerName: string;
  viewerId: string;
  /** Display name captured at share time so the owner's share list shows a person, not a uid. */
  viewerName?: string;
  /** When false, prices and cost-per-wear are stripped before the viewer sees anything. */
  includePrices: boolean;
  createdAt: string;
}

export interface SharedClosetItem {
  id: string;
  imageUrl: string;
  category: string;
  subcategory?: string;
  color: string;
  brand?: string;
  price?: number | null;
  wornCount?: number;
}

function shareId(ownerId: string, viewerId: string): string {
  return `${ownerId}_${viewerId}`;
}

export const closetSharingService = {
  /** Grants (or updates) one person's access to the signed-in user's closet. */
  share: async (
    ownerId: string,
    ownerName: string,
    viewerId: string,
    viewerName: string,
    includePrices: boolean
  ): Promise<ClosetShare> => {
    if (ownerId === viewerId) {
      throw new Error('You already have access to your own closet.');
    }

    const share: ClosetShare = {
      id: shareId(ownerId, viewerId),
      ownerId,
      ownerName,
      viewerId,
      viewerName,
      includePrices,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'closetShares', share.id), share);
    return share;
  },

  revoke: async (ownerId: string, viewerId: string): Promise<void> => {
    await deleteDoc(doc(db, 'closetShares', shareId(ownerId, viewerId)));
  },

  /** People the signed-in user has shared their closet with. */
  getMyShares: async (ownerId: string): Promise<ClosetShare[]> => {
    const snapshot = await getDocs(query(collection(db, 'closetShares'), where('ownerId', '==', ownerId)));
    return snapshot.docs.map(d => d.data() as ClosetShare);
  },

  /** Closets other people have shared with the signed-in user. */
  getSharedWithMe: async (viewerId: string): Promise<ClosetShare[]> => {
    const snapshot = await getDocs(query(collection(db, 'closetShares'), where('viewerId', '==', viewerId)));
    return snapshot.docs.map(d => d.data() as ClosetShare);
  },

  /**
   * Reads a closet that has been shared with the viewer.
   *
   * The share document is re-checked here rather than trusted from the caller,
   * and price fields are stripped client-side when the owner withheld them -
   * the Firestore rules gate access to the collection, this gates the shape of
   * what comes back.
   */
  getSharedCloset: async (ownerId: string, viewerId: string): Promise<SharedClosetItem[]> => {
    const shareDoc = await getDoc(doc(db, 'closetShares', shareId(ownerId, viewerId)));
    if (!shareDoc.exists()) {
      throw new Error('That closet is no longer shared with you.');
    }
    const share = shareDoc.data() as ClosetShare;

    const response = await closetAPI.getItems(ownerId);
    return (response.data || []).map((item: any) => ({
      id: item.id,
      imageUrl: item.imageUrl || '',
      category: item.category || '',
      subcategory: item.subcategory,
      color: item.color || '',
      brand: item.brand || undefined,
      ...(share.includePrices
        ? { price: typeof item.price === 'number' ? item.price : null, wornCount: item.wornCount ?? 0 }
        : {}),
    }));
  },

  /** Finds someone to share with by display name or handle. */
  findPeople: async (queryText: string) => {
    return userProfileService.searchUsers(queryText);
  },
};

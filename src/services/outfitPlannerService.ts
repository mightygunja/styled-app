/**
 * Real Firestore-backed calendar outfit planning - one doc per user+date.
 */

import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface PlannedOutfitItem {
  id: string;
  imageUrl: string;
  category: string;
}

export interface PlannedOutfit {
  id: string;
  date: string; // YYYY-MM-DD
  items: PlannedOutfitItem[];
  occasion?: string;
  notes?: string;
  worn?: boolean;
}

function docId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

export const outfitPlannerService = {
  getForUser: async (userId: string): Promise<Record<string, PlannedOutfit>> => {
    const snapshot = await getDocs(query(collection(db, 'plannedOutfits'), where('userId', '==', userId)));
    const result: Record<string, PlannedOutfit> = {};
    snapshot.docs.forEach(d => {
      const data = d.data();
      result[data.date] = { id: d.id, date: data.date, items: data.items || [], occasion: data.occasion, notes: data.notes, worn: data.worn || false };
    });
    return result;
  },

  save: async (userId: string, date: string, items: PlannedOutfitItem[], occasion?: string, notes?: string): Promise<void> => {
    await setDoc(doc(db, 'plannedOutfits', docId(userId, date)), {
      userId, date, items, occasion: occasion || null, notes: notes || null, worn: false,
    });
  },

  markWorn: async (userId: string, date: string): Promise<void> => {
    await setDoc(doc(db, 'plannedOutfits', docId(userId, date)), { worn: true }, { merge: true });
  },

  delete: async (userId: string, date: string): Promise<void> => {
    await deleteDoc(doc(db, 'plannedOutfits', docId(userId, date)));
  },
};

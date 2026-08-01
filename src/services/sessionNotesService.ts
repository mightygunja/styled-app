/**
 * Real Firestore-backed notes for a stylist session.
 */

import { collection, doc, getDocs, addDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export type NoteCategory = 'observation' | 'recommendation' | 'action-item' | 'style-tip' | 'product-suggestion';

export interface SessionNote {
  id: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  category: NoteCategory;
  createdBy: 'user' | 'stylist';
}

export interface StyleRecommendation {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  category: 'color' | 'style' | 'fit' | 'occasion' | 'accessory';
  priority: 'high' | 'medium' | 'low';
  imageUrl?: string;
  productLinks?: string[];
  createdAt: string;
}

export interface SessionDeliverable {
  id: string;
  sessionId: string;
  type: 'lookbook' | 'shopping-list' | 'style-guide' | 'capsule-plan';
  title: string;
  description: string;
  fileUrl?: string;
  items?: any[];
  createdAt: string;
}

function toIso(v: any): string {
  return v instanceof Timestamp ? v.toDate().toISOString() : v;
}

export const sessionNotesService = {
  // No-op: real sessions start with zero notes, not seeded mock content.
  createMockSessionData: async (_sessionId: string): Promise<void> => {},

  getSessionNotes: async (sessionId: string): Promise<SessionNote[]> => {
    const snapshot = await getDocs(query(collection(db, 'sessionNotes'), where('sessionId', '==', sessionId), orderBy('createdAt', 'asc')));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toIso(d.data().createdAt), updatedAt: toIso(d.data().updatedAt) } as SessionNote));
  },

  addNote: async (sessionId: string, content: string, category: NoteCategory, createdBy: 'user' | 'stylist'): Promise<SessionNote> => {
    const now = Timestamp.now();
    const data = { sessionId, content, category, createdBy, createdAt: now, updatedAt: now };
    const docRef = await addDoc(collection(db, 'sessionNotes'), data);
    return { id: docRef.id, ...data, createdAt: now.toDate().toISOString(), updatedAt: now.toDate().toISOString() };
  },

  deleteNote: async (noteId: string): Promise<void> => {
    await deleteDoc(doc(db, 'sessionNotes', noteId));
  },

  // Real query against a collection a stylist-side tool would populate -
  // returns empty today since that tool doesn't exist yet, which is the
  // honest answer rather than fabricated recommendations.
  getRecommendations: async (sessionId: string): Promise<StyleRecommendation[]> => {
    const snapshot = await getDocs(query(collection(db, 'sessionRecommendations'), where('sessionId', '==', sessionId)));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toIso(d.data().createdAt) } as StyleRecommendation));
  },

  getDeliverables: async (sessionId: string): Promise<SessionDeliverable[]> => {
    const snapshot = await getDocs(query(collection(db, 'sessionDeliverables'), where('sessionId', '==', sessionId)));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toIso(d.data().createdAt) } as SessionDeliverable));
  },

  // Builds a real plain-text summary of the session's actual notes - not a
  // real PDF (no PDF generation library wired up), but genuinely real content.
  exportNotes: async (sessionId: string): Promise<string> => {
    const notes = await sessionNotesService.getSessionNotes(sessionId);
    return notes.map(n => `[${n.category}] ${n.content}`).join('\n\n');
  },
};

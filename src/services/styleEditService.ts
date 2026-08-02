/**
 * Edits
 *
 * Styled's answer to Indyx's Lookbooks, and deliberately a different shape.
 *
 * Indyx sells a stylist ten looks built from scratch for $110-150, delivered
 * over days. An Edit is drafted by AI from the client's real closet in about a
 * minute, then reviewed, cut and rewritten by a human stylist before it ships.
 * The stylist spends their time on judgement instead of assembly, so the same
 * money buys a deeper Edit or the same Edit costs less.
 *
 * Three things Indyx's version does not do:
 *   - every look carries a written rationale, not just a photo grid
 *   - the coverage maths is stated: how many looks came out of how few pieces
 *   - gaps are separated from looks, so an Edit never doubles as a sales pitch
 */

import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { closetAPI } from './api';
import { styleProfileService } from './firestore';
import { BODY_TYPE_GUIDES } from '../models/personalStyleProfile';

const draftStyleEditFn = httpsCallable(functions, 'draftStyleEdit');

export const EDIT_FOCUSES = [
  'Capsule wardrobe',
  'Seasonal refresh',
  'Work wardrobe',
  'Event styling',
  'Wear what I own more',
] as const;

export type EditFocus = (typeof EDIT_FOCUSES)[number];

/**
 * `drafted` exists so a stylist never sees a blank page, and the client never
 * sees the raw draft - an Edit is only visible to them once a human publishes.
 */
export type EditStatus =
  | 'requested'
  | 'drafted'
  | 'delivered'
  | 'revision-requested';

export interface EditLookItem {
  id: string;
  imageUrl: string;
  category: string;
  subcategory?: string;
  color: string;
}

export interface EditLook {
  id: string;
  title: string;
  itemIds: string[];
  occasion: string;
  rationale: string;
}

export interface EditGap {
  category: string;
  description: string;
  whyNeeded: string;
}

export interface StyleEdit {
  id: string;
  userId: string;
  stylistId: string;
  stylistName: string;
  focus: EditFocus | string;
  brief: string;
  status: EditStatus;
  looks: EditLook[];
  gaps: EditGap[];
  stylistNote: string;
  /** Snapshot of the closet items referenced, so a deleted item does not break a delivered Edit. */
  items: EditLookItem[];
  price: number;
  revisionNote?: string;
  requestedAt: string;
  deliveredAt?: string;
}

async function buildProfilePayload(userId: string) {
  const profile = await styleProfileService.getStyleProfile(userId);
  if (!profile) return undefined;

  const bodyGuide = profile.bodyAnalysis ? BODY_TYPE_GUIDES[profile.bodyAnalysis.bodyType] : null;
  return {
    colorSeason: profile.colorAnalysis?.season,
    recommendedColors: profile.colorAnalysis?.palette.map(s => s.name),
    colorsToAvoid: profile.colorAnalysis?.colorsToAvoid.map(s => s.name),
    bodyType: bodyGuide?.label,
    bodyRecommendedSilhouettes: profile.bodyAnalysis?.recommendedSilhouettes,
    styleArchetypes: profile.styleArchetypes,
    avoidRules: profile.avoidRules,
  };
}

/**
 * Distinct pieces used across every look in an Edit.
 *
 * This is the number that makes an Edit feel worth paying for: twelve looks
 * out of nine pieces says something a photo grid cannot.
 */
export function coverageStats(edit: StyleEdit): { looks: number; pieces: number } {
  const pieces = new Set<string>();
  edit.looks.forEach(look => look.itemIds.forEach(id => pieces.add(id)));
  return { looks: edit.looks.length, pieces: pieces.size };
}

export const styleEditService = {
  /** Client requests an Edit. Nothing is drafted until a stylist picks it up. */
  request: async (
    userId: string,
    stylistId: string,
    stylistName: string,
    focus: EditFocus | string,
    brief: string,
    price: number
  ): Promise<StyleEdit> => {
    const id = `${userId}_${stylistId}_${Date.now()}`;
    const edit: StyleEdit = {
      id,
      userId,
      stylistId,
      stylistName,
      focus,
      brief,
      status: 'requested',
      looks: [],
      gaps: [],
      stylistNote: '',
      items: [],
      price,
      requestedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'styleEdits', id), edit);
    return edit;
  },

  /**
   * Stylist-side: drafts looks from the client's closet.
   *
   * The closet snapshot is written onto the Edit so the delivered document
   * stays intact even if the client later deletes or re-photographs an item.
   */
  draft: async (editId: string): Promise<StyleEdit> => {
    const snapshot = await getDoc(doc(db, 'styleEdits', editId));
    if (!snapshot.exists()) throw new Error('That Edit no longer exists.');
    const edit = snapshot.data() as StyleEdit;

    const [closetResponse, styleProfile] = await Promise.all([
      closetAPI.getItems(edit.userId),
      buildProfilePayload(edit.userId),
    ]);

    const closetItems: any[] = (closetResponse.data || []).filter((i: any) => i.imageUrl);
    if (closetItems.length < 4) {
      throw new Error("This client's closet is too small to build an Edit from yet.");
    }

    const result = await draftStyleEditFn({
      focus: edit.focus,
      brief: edit.brief,
      lookCount: 10,
      closetItems: closetItems.map(i => ({
        id: i.id,
        category: i.category,
        subcategory: i.subcategory,
        color: i.color,
        style: i.style,
        fabricTexture: i.fabricTexture,
      })),
      styleProfile,
    });

    const drafted = (result.data as any).data as {
      looks: EditLook[];
      gaps: EditGap[];
      stylistNote: string;
    };

    const usedIds = new Set(drafted.looks.flatMap(l => l.itemIds));
    const items: EditLookItem[] = closetItems
      .filter(i => usedIds.has(i.id))
      .map(i => ({
        id: i.id,
        imageUrl: i.imageUrl,
        category: i.category || '',
        subcategory: i.subcategory,
        color: i.color || '',
      }));

    const updated: StyleEdit = {
      ...edit,
      looks: drafted.looks,
      gaps: drafted.gaps,
      stylistNote: drafted.stylistNote,
      items,
      status: 'drafted',
    };

    await setDoc(doc(db, 'styleEdits', editId), updated);
    return updated;
  },

  /** Stylist-side: saves their edits to the draft without publishing. */
  saveDraft: async (
    editId: string,
    looks: EditLook[],
    stylistNote: string
  ): Promise<void> => {
    await updateDoc(doc(db, 'styleEdits', editId), { looks, stylistNote });
  },

  /** Stylist-side: publishes. Only now does the client see it. */
  deliver: async (editId: string): Promise<void> => {
    await updateDoc(doc(db, 'styleEdits', editId), {
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
    });
  },

  /** Client-side: asks for another pass, with a reason the stylist can act on. */
  requestRevision: async (editId: string, note: string): Promise<void> => {
    await updateDoc(doc(db, 'styleEdits', editId), {
      status: 'revision-requested',
      revisionNote: note,
    });
  },

  getForUser: async (userId: string): Promise<StyleEdit[]> => {
    const snapshot = await getDocs(query(collection(db, 'styleEdits'), where('userId', '==', userId)));
    return snapshot.docs
      .map(d => d.data() as StyleEdit)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  },

  getForStylist: async (stylistId: string): Promise<StyleEdit[]> => {
    const snapshot = await getDocs(
      query(collection(db, 'styleEdits'), where('stylistId', '==', stylistId))
    );
    return snapshot.docs
      .map(d => d.data() as StyleEdit)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  },

  getById: async (editId: string): Promise<StyleEdit | null> => {
    const snapshot = await getDoc(doc(db, 'styleEdits', editId));
    return snapshot.exists() ? (snapshot.data() as StyleEdit) : null;
  },
};

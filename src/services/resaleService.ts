/**
 * Resale Service
 *
 * Turns dead wardrobe weight into money. Which pieces are worth reselling is
 * decided here, deterministically, from real wear data - the AI is only asked
 * to price the one the user picked and draft its listing, because that is the
 * part that genuinely needs market knowledge.
 *
 * Nothing in this file invents a sale, a buyer, or a completed transaction. It
 * produces a valuation and listing copy the user takes to a real marketplace.
 */

import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db, functions } from '../config/firebase';

const estimateResaleValueFn = httpsCallable(functions, 'estimateResaleValue');

export interface ResaleValuation {
  id: string;
  userId: string;
  itemId: string;
  estimatedLow: number;
  estimatedHigh: number;
  suggestedPrice: number;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
  bestPlatforms: string[];
  listingTitle: string;
  listingDescription: string;
  estimatedAt: string;
}

export interface ResaleCandidate {
  itemId: string;
  imageUrl: string;
  category: string;
  subcategory?: string;
  color: string;
  brand?: string;
  price: number | null;
  wornCount: number;
  ageMonths: number | null;
  /** 0-100. Higher means more worth listing. Computed, not model-supplied. */
  score: number;
  reason: string;
}

function monthsSince(iso?: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (isNaN(then)) return null;
  return Math.max(0, Math.round((Date.now() - then) / (1000 * 60 * 60 * 24 * 30.44)));
}

/**
 * Ranks closet items by how much sense reselling them makes.
 *
 * The signal is dead capital: something expensive that was bought a while ago
 * and has barely been worn. A cheap item worn constantly scores near zero no
 * matter how old it is, which is the correct answer - it is doing its job.
 */
export function rankResaleCandidates(items: any[]): ResaleCandidate[] {
  const candidates = items.map(item => {
    const wornCount = typeof item.wornCount === 'number' ? item.wornCount : 0;
    const price = typeof item.price === 'number' ? item.price : null;
    const ageMonths = monthsSince(item.purchaseDate || item.createdAt);

    // Unworn is the dominant signal, then value at risk, then how long it has sat.
    const wearScore = wornCount === 0 ? 55 : wornCount <= 2 ? 35 : wornCount <= 5 ? 15 : 0;
    const valueScore = price === null ? 8 : price >= 200 ? 30 : price >= 100 ? 22 : price >= 50 ? 14 : 6;
    const ageScore = ageMonths === null ? 4 : ageMonths >= 24 ? 15 : ageMonths >= 12 ? 11 : ageMonths >= 6 ? 6 : 0;

    const score = Math.min(100, wearScore + valueScore + ageScore);

    let reason: string;
    if (wornCount === 0 && ageMonths !== null && ageMonths >= 6) {
      reason = `Never worn in ${ageMonths} months`;
    } else if (wornCount === 0) {
      reason = 'Never worn';
    } else if (wornCount <= 2) {
      reason = `Worn just ${wornCount} time${wornCount === 1 ? '' : 's'}`;
    } else {
      reason = `Worn ${wornCount} times`;
    }

    return {
      itemId: item.id,
      imageUrl: item.imageUrl || '',
      category: item.category || '',
      subcategory: item.subcategory,
      color: item.color || '',
      brand: item.brand || undefined,
      price,
      wornCount,
      ageMonths,
      score,
      reason,
    };
  });

  return candidates
    .filter(c => c.score >= 30)
    .sort((a, b) => b.score - a.score);
}

/** Total original spend sitting in items that qualify as resale candidates. */
export function dormantValue(candidates: ResaleCandidate[]): number {
  return candidates.reduce((sum, c) => sum + (c.price ?? 0), 0);
}

export const resaleService = {
  /** Prices a single item and drafts its listing. */
  valuate: async (userId: string, candidate: ResaleCandidate): Promise<ResaleValuation> => {
    const result = await estimateResaleValueFn({
      category: candidate.category,
      subcategory: candidate.subcategory,
      color: candidate.color,
      brand: candidate.brand,
      originalPrice: candidate.price,
      wornCount: candidate.wornCount,
      ageMonths: candidate.ageMonths,
      condition: candidate.wornCount === 0 ? 'new without tags, never worn' : `worn ${candidate.wornCount} times`,
    });

    const data = (result.data as any).data;
    const valuation: ResaleValuation = {
      id: `${userId}_${candidate.itemId}`,
      userId,
      itemId: candidate.itemId,
      ...data,
    };

    await setDoc(doc(db, 'resaleValuations', valuation.id), valuation);
    return valuation;
  },

  getForUser: async (userId: string): Promise<ResaleValuation[]> => {
    const snapshot = await getDocs(query(collection(db, 'resaleValuations'), where('userId', '==', userId)));
    return snapshot.docs.map(d => d.data() as ResaleValuation);
  },
};

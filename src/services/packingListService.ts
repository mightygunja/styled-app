/**
 * Trip Packing Service
 *
 * Builds a packing list from the user's real closet against the real forecast
 * at their destination, then persists it so the list survives the trip.
 *
 * Division of labour is deliberate: the Cloud Function decides *which* pieces
 * to pack and why, this file joins those ids back to the real closet records
 * (so image URLs and colors can never be hallucinated) and computes the outfit
 * coverage number locally.
 */

import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { closetAPI } from './api';
import { styleProfileService } from './firestore';
import { BODY_TYPE_GUIDES } from '../models/personalStyleProfile';
import {
  DailyForecast,
  getDestinationForecast,
  DestinationMatch,
  formatDestination,
} from './weatherService';
import {
  PackingList,
  PackingItem,
  PackingPlanResponse,
  PackingRole,
  TripType,
  countOutfitCombinations,
} from '../models/tripPacking';

const generatePackingListFn = httpsCallable(functions, 'generatePackingList');

const VALID_ROLES: PackingRole[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'];

/** Falls back to the item's own category when the model returns an unexpected role. */
function normalizeRole(role: string, category: string): PackingRole {
  if (VALID_ROLES.includes(role as PackingRole)) return role as PackingRole;
  const c = (category || '').toLowerCase();
  if (c === 'dresses') return 'dress';
  if (c === 'bottoms') return 'bottom';
  if (c === 'outerwear') return 'outerwear';
  if (c === 'shoes') return 'shoes';
  if (c === 'accessories' || c === 'bags') return 'accessory';
  return 'top';
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
    bodyHighlight: profile.bodyAnalysis?.highlight,
    bodyDownplay: profile.bodyAnalysis?.downplay,
    bodyRecommendedSilhouettes: profile.bodyAnalysis?.recommendedSilhouettes,
    styleArchetypes: profile.styleArchetypes,
    avoidRules: profile.avoidRules,
  };
}

export interface GeneratePackingListInput {
  userId: string;
  destination: DestinationMatch;
  startDate: string;
  endDate: string;
  tripType: TripType;
  notes?: string;
}

export const packingListService = {
  /**
   * Generates a packing list end to end: destination forecast, closet read,
   * AI selection, then local hydration and coverage math.
   */
  generate: async (input: GeneratePackingListInput): Promise<PackingList> => {
    const { userId, destination, startDate, endDate, tripType, notes } = input;

    const [forecast, closetResponse, styleProfile] = await Promise.all([
      getDestinationForecast(destination.latitude, destination.longitude, startDate, endDate),
      closetAPI.getItems(userId),
      buildProfilePayload(userId),
    ]);

    const closetItems: any[] = closetResponse.data || [];
    if (closetItems.length === 0) {
      throw new Error('Add a few items to your closet first — a packing list is built from what you already own.');
    }

    const result = await generatePackingListFn({
      destination: formatDestination(destination),
      tripType,
      startDate,
      endDate,
      forecast: forecast.map(d => ({
        date: d.date,
        high: d.high,
        low: d.low,
        condition: d.condition,
        precipitationChance: d.precipitationChance,
      })),
      closetItems: closetItems.map(i => ({
        id: i.id,
        category: i.category,
        subcategory: i.subcategory,
        color: i.color,
        seasons: i.seasons,
        style: i.style,
        fabricTexture: i.fabricTexture,
      })),
      styleProfile,
      notes,
    });

    const plan = (result.data as any).data as PackingPlanResponse;
    const byId = new Map(closetItems.map(i => [i.id, i]));

    // Join back to the real closet record so nothing rendered came from the model.
    const items: PackingItem[] = plan.items
      .map((planned): PackingItem | null => {
        const source = byId.get(planned.itemId);
        if (!source) return null;
        return {
          itemId: source.id,
          imageUrl: source.imageUrl || '',
          category: source.category || '',
          subcategory: source.subcategory,
          color: source.color || '',
          role: normalizeRole((planned as any).role, source.category),
          reason: planned.reason || '',
        };
      })
      .filter((i): i is PackingItem => i !== null);

    if (items.length === 0) {
      throw new Error("We couldn't match that plan to your closet. Please try again.");
    }

    const list: PackingList = {
      id: `${userId}_${startDate}_${destination.id}`,
      userId,
      destinationLabel: formatDestination(destination),
      latitude: destination.latitude,
      longitude: destination.longitude,
      startDate,
      endDate,
      tripType,
      forecast,
      items,
      dayPlans: plan.dayPlans || [],
      gaps: plan.gaps || [],
      outfitCount: countOutfitCombinations(items),
      headline: plan.headline || '',
      createdAt: new Date().toISOString(),
    };

    await packingListService.save(list);
    return list;
  },

  save: async (list: PackingList): Promise<void> => {
    await setDoc(doc(db, 'packingLists', list.id), list);
  },

  getForUser: async (userId: string): Promise<PackingList[]> => {
    const snapshot = await getDocs(query(collection(db, 'packingLists'), where('userId', '==', userId)));
    return snapshot.docs
      .map(d => d.data() as PackingList)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  delete: async (listId: string): Promise<void> => {
    await deleteDoc(doc(db, 'packingLists', listId));
  },
};

export type { DailyForecast };

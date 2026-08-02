/**
 * Trip Packing
 *
 * Packing as a coverage problem rather than a checklist: pick the smallest set
 * of pieces the user already owns that still covers every day of the trip and
 * every occasion on it, against the real forecast at the destination.
 *
 * The AI chooses which pieces to take and why. The outfit-coverage number is
 * computed here, deterministically, from the pieces it actually chose - a model
 * asked to both pick items and count their combinations will confidently get
 * the arithmetic wrong, and that number is the whole promise of the feature.
 */

import { DailyForecast } from '../services/weatherService';

export const TRIP_TYPES = [
  'business',
  'city break',
  'beach',
  'outdoors',
  'formal event',
  'mixed',
] as const;

export type TripType = (typeof TRIP_TYPES)[number];

/** Where a piece sits in the packing plan, which drives how it is grouped in the UI. */
export type PackingRole = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory';

export interface PackingItem {
  itemId: string;
  imageUrl: string;
  category: string;
  subcategory?: string;
  color: string;
  role: PackingRole;
  /** Why this specific piece earned a place in the bag. */
  reason: string;
}

export interface PackingGap {
  category: string;
  description: string;
  whyNeeded: string;
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  itemIds: string[];
  occasion: string;
  note: string;
}

export interface PackingList {
  id: string;
  userId: string;
  destinationLabel: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  tripType: TripType;
  forecast: DailyForecast[];
  items: PackingItem[];
  dayPlans: DayPlan[];
  gaps: PackingGap[];
  /** Distinct outfits the packed set can produce - computed, never model-supplied. */
  outfitCount: number;
  headline: string;
  createdAt: string;
}

/** Shape the Cloud Function returns, before coverage math is applied locally. */
export interface PackingPlanResponse {
  items: PackingItem[];
  dayPlans: DayPlan[];
  gaps: PackingGap[];
  headline: string;
}

const TOP_ROLES: PackingRole[] = ['top'];
const BOTTOM_ROLES: PackingRole[] = ['bottom'];

/**
 * Distinct wearable outfits from a packed set: every top x bottom pairing, plus
 * each dress as an outfit in its own right. Shoes, outerwear and accessories are
 * deliberately excluded as multipliers - counting them would inflate the number
 * into meaninglessness (3 pairs of shoes does not make an outfit three times
 * over), and the honest figure is the one the user can actually picture.
 */
export function countOutfitCombinations(items: PackingItem[]): number {
  const tops = items.filter(i => TOP_ROLES.includes(i.role)).length;
  const bottoms = items.filter(i => BOTTOM_ROLES.includes(i.role)).length;
  const dresses = items.filter(i => i.role === 'dress').length;
  return tops * bottoms + dresses;
}

/** Compact "9 pieces → 14 outfits" summary used on the list header and share sheet. */
export function coverageSummary(items: PackingItem[]): string {
  const outfits = countOutfitCombinations(items);
  const pieces = items.length;
  if (outfits === 0) return `${pieces} ${pieces === 1 ? 'piece' : 'pieces'}`;
  return `${pieces} ${pieces === 1 ? 'piece' : 'pieces'} → ${outfits} ${outfits === 1 ? 'outfit' : 'outfits'}`;
}

/** Temperature band across the whole trip, used for the header and the AI prompt. */
export function forecastRange(forecast: DailyForecast[]): { low: number; high: number } | null {
  if (forecast.length === 0) return null;
  return {
    low: Math.min(...forecast.map(d => d.low)),
    high: Math.max(...forecast.map(d => d.high)),
  };
}

/** True when any day of the trip is beyond the provider's real forecast horizon. */
export function hasEstimatedDays(forecast: DailyForecast[]): boolean {
  return forecast.some(d => d.estimated);
}

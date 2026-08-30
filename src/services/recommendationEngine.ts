/**
 * Shared recommendation types.
 *
 * The engine that used to live here is gone, deliberately: its four outfit
 * "variants" all called one deterministic item picker with identical
 * arguments, so they were the same garments under different headlines.
 * dailyOutfitService is the one outfit engine now - it scores pairs jointly
 * and diversifies the set - and both Home's Dress Me Today and Smart
 * Recommendations run on it. What remains here are the shared types that
 * several services and screens still speak in.
 */

import { Item } from '../types';

export type OccasionType =
  | 'work'
  | 'casual'
  | 'formal'
  | 'date'
  | 'workout'
  | 'party'
  | 'travel'
  | 'outdoor';

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'cold' | 'hot';

export interface OutfitRecommendation {
  id: string;
  title: string;
  description: string;
  occasion: OccasionType;
  items: Item[];
  suitabilityScore: number; // 0-100
  reasoning: string[];
  weatherSuitable: boolean;
  styleMatch: number; // 0-100
  missingPieces?: string[];
  alternatives?: Item[][];
  tags: string[];
}

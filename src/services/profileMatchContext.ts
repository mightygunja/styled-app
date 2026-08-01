/**
 * Shared "what do we know about this user's styling preferences" shape,
 * used to score both capsule wardrobe candidates (closetOrganizationService)
 * and marketplace products (marketplaceMatchingService) the same way.
 */

import { styleProfileService } from './firestore';
import { BODY_TYPE_GUIDES } from '../models/personalStyleProfile';

export interface ProfileMatchContext {
  recommendedColors?: string[];
  colorsToAvoid?: string[];
  bodyMatchKeywords?: string[];
  styleArchetypes?: string[];
  avoidRules?: string[];
}

export async function buildProfileMatchContext(userId: string): Promise<ProfileMatchContext | undefined> {
  try {
    const savedProfile = await styleProfileService.getStyleProfile(userId);
    if (!savedProfile) return undefined;
    const bodyGuide = savedProfile.bodyAnalysis ? BODY_TYPE_GUIDES[savedProfile.bodyAnalysis.bodyType] : null;
    return {
      recommendedColors: savedProfile.colorAnalysis?.palette.map(s => s.name),
      colorsToAvoid: savedProfile.colorAnalysis?.colorsToAvoid.map(s => s.name),
      bodyMatchKeywords: bodyGuide?.matchKeywords,
      styleArchetypes: savedProfile.styleArchetypes,
      avoidRules: savedProfile.avoidRules,
    };
  } catch (error) {
    console.error('Error loading style profile context:', error);
    return undefined;
  }
}

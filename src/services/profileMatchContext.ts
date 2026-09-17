/**
 * Shared "what do we know about this user's styling preferences" shape,
 * used to score both capsule wardrobe candidates (closetOrganizationService)
 * and marketplace products (marketplaceMatchingService) the same way.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { styleProfileService } from './firestore';
import { BODY_TYPE_GUIDES } from '../models/personalStyleProfile';

export interface ProfileMatchContext {
  recommendedColors?: string[];
  colorsToAvoid?: string[];
  bodyMatchKeywords?: string[];
  styleArchetypes?: string[];
  avoidRules?: string[];
  /**
   * The named specifics below exist so a match can say *why* rather than
   * merely *that*. "Sits in your True Autumn palette" is a reason someone can
   * act on; "in your color season" is a label.
   */
  colorSeason?: string;
  bodyTypeLabel?: string;
  recommendedSilhouettes?: string[];
  /** Per-category fit guidance, e.g. categoryGuidance.bottoms -> ["high-waisted", "wide-leg"]. */
  categoryGuidance?: Record<string, string[]>;
  /** Whose wardrobe: womenswear, menswear, or both. Absent reads as 'all'. */
  wardrobeFocus?: 'womens' | 'mens' | 'all';
  /**
   * True when the profile could NOT be read and this context carries only the
   * last department we successfully loaded for this user. Every taste field
   * is absent; `wardrobeFocus` is the remembered one.
   */
  profileReadFailed?: boolean;
}

/**
 * The department gate must not fail open. Consumers read an absent focus as
 * 'all', so a transient profile read failure used to hand a menswear user a
 * mixed rack (and the reverse). The last successfully loaded focus is kept in
 * memory and in AsyncStorage, per user, and used when the read throws.
 */
type Focus = 'womens' | 'mens' | 'all';
const FOCUS_CACHE_PREFIX = '@styled_last_wardrobe_focus_';
const focusMemory = new Map<string, Focus>();
const isFocus = (value: unknown): value is Focus =>
  value === 'womens' || value === 'mens' || value === 'all';

/** Records the user's department after a successful profile read or save. Never throws. */
export function rememberWardrobeFocus(userId: string, focus: Focus | undefined): void {
  if (!userId || !isFocus(focus)) return;
  if (focusMemory.get(userId) === focus) return;
  focusMemory.set(userId, focus);
  AsyncStorage.setItem(FOCUS_CACHE_PREFIX + userId, focus).catch(() => {});
}

async function recallWardrobeFocus(userId: string): Promise<Focus | undefined> {
  const inMemory = focusMemory.get(userId);
  if (inMemory) return inMemory;
  try {
    const stored = await AsyncStorage.getItem(FOCUS_CACHE_PREFIX + userId);
    return isFocus(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

export async function buildProfileMatchContext(userId: string): Promise<ProfileMatchContext | undefined> {
  try {
    const savedProfile = await styleProfileService.getStyleProfile(userId);
    if (!savedProfile) return undefined;
    rememberWardrobeFocus(userId, savedProfile.wardrobeFocus);
    const bodyGuide = savedProfile.bodyAnalysis ? BODY_TYPE_GUIDES[savedProfile.bodyAnalysis.bodyType] : null;
    return {
      recommendedColors: savedProfile.colorAnalysis?.palette.map(s => s.name),
      colorsToAvoid: savedProfile.colorAnalysis?.colorsToAvoid.map(s => s.name),
      bodyMatchKeywords: bodyGuide?.matchKeywords,
      styleArchetypes: savedProfile.styleArchetypes,
      avoidRules: savedProfile.avoidRules,
      colorSeason: savedProfile.colorAnalysis?.season,
      bodyTypeLabel: bodyGuide?.label,
      recommendedSilhouettes: savedProfile.bodyAnalysis?.recommendedSilhouettes,
      categoryGuidance: savedProfile.bodyAnalysis?.categoryGuidance as
        | Record<string, string[]>
        | undefined,
      wardrobeFocus: savedProfile.wardrobeFocus,
    };
  } catch (error) {
    console.error('Error loading style profile context:', error);
    // Read ERROR (not "no profile"): fall back to the last department we know
    // for this user so the gate stays closed. With nothing remembered there is
    // nothing safe to assert, so the old `undefined` stands.
    const remembered = await recallWardrobeFocus(userId);
    return remembered ? { wardrobeFocus: remembered, profileReadFailed: true } : undefined;
  }
}

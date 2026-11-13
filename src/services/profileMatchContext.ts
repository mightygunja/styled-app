/**
 * Shared "what do we know about this user's styling preferences" shape,
 * used to score both capsule wardrobe candidates (closetOrganizationService)
 * and marketplace products (marketplaceMatchingService) the same way.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { closetService, styleProfileService } from './firestore';
import { departmentFromCloset, departmentFromProfile } from './departmentInference';
import { BODY_TYPE_GUIDES, PersonalStyleProfile } from '../models/personalStyleProfile';

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
   * True when the profile could NOT be read. Every taste field is absent and
   * `wardrobeFocus` is the last department successfully loaded for this user
   * (absent when there is none remembered).
   *
   * A failed read ALWAYS comes back as a context carrying this flag, never
   * as `undefined`: `undefined` means the server confirmed the account has
   * no profile, and only that may prompt anyone (see profilePrompts.ts).
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

/**
 * The department of an account whose saved profile does not state one, read
 * off what the member has already told us (departmentInference.ts): the body
 * type in their profile, the department this device last loaded for them, or
 * the clothes in their closet. Undefined when none of those settles it - and
 * only then may a screen ask.
 *
 * A settled answer is SAVED to the profile, once, so every screen and every
 * later session reads it as the member's own. Home shows it with a "Change"
 * link beside it, so an answer read off a closet is one tap to correct.
 */
const settling = new Map<string, Promise<Focus | undefined>>();

function settleWardrobeFocus(userId: string, savedProfile: PersonalStyleProfile | null): Promise<Focus | undefined> {
  const inFlight = settling.get(userId);
  if (inFlight) return inFlight;
  const work = (async (): Promise<Focus | undefined> => {
    let focus: Focus | undefined = departmentFromProfile(savedProfile)?.focus;
    if (!focus) focus = await recallWardrobeFocus(userId);
    if (!focus) {
      try {
        focus = departmentFromCloset(await closetService.getAll(userId))?.focus;
      } catch {
        // The closet could not be read: no evidence, so no answer from it.
      }
    }
    if (!focus) return undefined;
    // Saved in the background; this read does not wait for the write, and a
    // failed write only means it is settled again on the next load.
    saveWardrobeFocus(userId, focus).catch(error => console.error('Could not save the settled department:', error));
    return focus;
  })().finally(() => settling.delete(userId));
  settling.set(userId, work);
  return work;
}

export async function buildProfileMatchContext(userId: string): Promise<ProfileMatchContext | undefined> {
  try {
    const savedProfile = await styleProfileService.getStyleProfile(userId);
    if (!savedProfile) {
      // No profile, but a closet can still say whose wardrobe this is - and a
      // member who has built one is never asked what it already shows.
      const settled = await settleWardrobeFocus(userId, null);
      return settled ? { wardrobeFocus: settled } : undefined;
    }
    const wardrobeFocus = savedProfile.wardrobeFocus ?? (await settleWardrobeFocus(userId, savedProfile));
    rememberWardrobeFocus(userId, wardrobeFocus);
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
      wardrobeFocus,
    };
  } catch (error) {
    console.error('Error loading style profile context:', error);
    // Read ERROR (not "no profile"): fall back to the last department we know
    // for this user so the gate stays closed. With nothing remembered the
    // context carries no department - but it still says the read FAILED, so
    // no screen mistakes this for an account that has never been asked.
    const remembered = await recallWardrobeFocus(userId);
    return remembered ? { wardrobeFocus: remembered, profileReadFailed: true } : { profileReadFailed: true };
  }
}

/**
 * Saves the one-tap department answer.
 *
 * Read-modify-write: the answer is laid over the saved profile, so nothing
 * else in it changes. An account with no profile gets a minimal one carrying
 * only the answer - empty taste fields read as "no signal" to every engine,
 * so nothing about the member is invented.
 *
 * Throws when the profile cannot be read (getStyleProfile rejects on an
 * unconfirmed read), which is what stops a blank profile being written over
 * a real one that simply did not load.
 */
export async function saveWardrobeFocus(userId: string, focus: Focus): Promise<void> {
  const profile = await styleProfileService.getStyleProfile(userId);
  const next: PersonalStyleProfile = profile
    ? { ...profile, wardrobeFocus: focus }
    : {
        lifestyleWeights: { work: 0.25, casual: 0.35, social: 0.25, travel: 0.15 },
        styleArchetypes: [],
        avoidRules: [],
        colorProfile: { primary: [], secondary: [], stretch: [] },
        fitPreferences: {},
        guidanceLevel: 'guided',
        wardrobeFocus: focus,
      };
  await styleProfileService.saveStyleProfile(userId, next);
  rememberWardrobeFocus(userId, focus);
}

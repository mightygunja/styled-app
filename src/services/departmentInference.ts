/**
 * Knowing the department without asking for it again.
 *
 * `wardrobeFocus` is the one answer the app cannot work without, and the
 * Home screen asks for it when the saved profile does not carry it. But a
 * profile can lack that field and still have told us:
 *
 *   - questionnaires completed before the department question existed have
 *     no `wardrobeFocus`, and neither does one whose first step was passed
 *     without a tap;
 *   - yet the same questionnaire asks for a body type, and the body types
 *     are department-specific: 'hourglass' and 'pear' are the womenswear
 *     set, 'mTrapezoid' and 'mOval' the menswear set;
 *   - and a closet says it too: a member who has photographed their dresses
 *     and skirts has told us whose wardrobe this is.
 *
 * Asking such a member "whose wardrobe are we dressing?" is asking what they
 * already answered (reported, angrily and rightly, 2026-11-13). So before
 * any screen asks, the answer is read off what is saved. Only evidence that
 * points one way counts:
 *
 *   - a body type from one department's set;
 *   - failing that, a closet with pieces that belong to one department and
 *     none that belong to the other.
 *
 * A closet with both, or with nothing telling (jeans and tees), settles
 * nothing - that member is still asked, once. Never a name, never a guess.
 *
 * Pure - no Firebase, no React Native - so scripts/auditSurveyGate.ts runs
 * the real thing.
 */

import { MENS_BODY_TYPES, WOMENS_BODY_TYPES } from '../models/personalStyleProfile';
import { titleFitsDepartment } from './departmentFit';

export type SettledFocus = 'womens' | 'mens';

export interface DepartmentEvidence {
  focus: SettledFocus;
  /** What it was read from - for the log, and for the tests. */
  from: 'body type' | 'closet';
}

/**
 * The department a saved body type belongs to, if the profile has one.
 *
 * Also read: the fit areas a body type leaves behind. "Bust" is written into
 * a profile only by a womenswear body type (the questionnaire's own list of
 * areas says "chest"), so it survives as evidence even where the body-type
 * result itself was later cleared.
 */
export function departmentFromProfile(
  profile:
    | {
        bodyAnalysis?: { bodyType?: string } | null;
        fitPreferences?: { highlight?: string[]; downplay?: string[] } | null;
      }
    | null
    | undefined
): DepartmentEvidence | undefined {
  const bodyType = profile?.bodyAnalysis?.bodyType;
  if (bodyType && (WOMENS_BODY_TYPES as readonly string[]).includes(bodyType)) return { focus: 'womens', from: 'body type' };
  if (bodyType && (MENS_BODY_TYPES as readonly string[]).includes(bodyType)) return { focus: 'mens', from: 'body type' };
  const areas = [...(profile?.fitPreferences?.highlight || []), ...(profile?.fitPreferences?.downplay || [])];
  if (areas.some(area => String(area).toLowerCase() === 'bust')) return { focus: 'womens', from: 'body type' };
  return undefined;
}

interface ClosetPiece {
  name?: string | null;
  category?: string | null;
  subcategory?: string | null;
}

/**
 * The department a closet belongs to, when its pieces point one way only.
 * A piece counts for womenswear when it is a dress or its words name a
 * womenswear garment or say "women's"; for menswear when its words name a
 * menswear garment or say "men's" (the same word lists every rail is held
 * to, departmentFit.ts). Most pieces - jeans, tees, trainers - count for
 * neither, and that is fine: one dress is enough, a mixed closet is not.
 */
export function departmentFromCloset(items: ClosetPiece[] | null | undefined): DepartmentEvidence | undefined {
  let womens = 0;
  let mens = 0;
  (items || []).forEach(item => {
    const text = [item.name, item.subcategory, item.category].filter(Boolean).join(' ');
    const isDress = String(item.category || '').toLowerCase() === 'dresses';
    // A piece that could not be shown on the menswear rail is womenswear,
    // and the other way round.
    if (isDress || !titleFitsDepartment(text, 'men')) womens += 1;
    else if (!titleFitsDepartment(text, 'women')) mens += 1;
  });
  if (womens > 0 && mens === 0) return { focus: 'womens', from: 'closet' };
  if (mens > 0 && womens === 0) return { focus: 'mens', from: 'closet' };
  return undefined;
}

/** The profile's own answer first; the closet only when the profile says nothing. */
export function inferDepartment(
  profile: Parameters<typeof departmentFromProfile>[0],
  closet: ClosetPiece[] | null | undefined
): DepartmentEvidence | undefined {
  return departmentFromProfile(profile) ?? departmentFromCloset(closet);
}

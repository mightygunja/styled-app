/**
 * When the app may ask a member about themselves.
 *
 * The rule, in one line: only on positive evidence that there is something
 * left to ask - never because a read failed, and never an established
 * account for the survey.
 *
 *   - The SURVEY (six questions) is for a new account. Outside first run it
 *     is offered once, on Home, and only to an account the server confirms
 *     has no style profile AND no clothes in its closet. A member who has
 *     taken it, or who has already built a closet, is never asked.
 *   - The DEPARTMENT question (one tap: womenswear, menswear, both) is the
 *     single thing the app cannot work without - it decides whose clothes
 *     every surface shows (see departmentFit.ts). It is asked only when the
 *     server confirms the account has not answered it.
 *   - When the profile could not be read, nothing is asked. "We could not
 *     check" is not "you have not told us".
 *
 * Pure, so scripts/auditSurveyGate.ts checks the real decisions.
 */

/** What is known about the account's style profile after trying to read it. */
export type ProfileKnowledge =
  /** The server returned a saved profile. */
  | 'has'
  /** The server confirmed there is none. */
  | 'none'
  /** The read failed or could not be confirmed. */
  | 'unknown';

/** Reads the three states off what buildProfileMatchContext returned. */
export function profileKnowledge(context: { profileReadFailed?: boolean } | undefined | null): ProfileKnowledge {
  if (!context) return 'none';
  return context.profileReadFailed ? 'unknown' : 'has';
}

export interface HomePromptInput {
  profile: ProfileKnowledge;
  /** The saved profile carries a department answer. */
  hasWardrobeFocus: boolean;
  /** Pieces in the closet, from a confirmed read. */
  closetCount: number;
  /** "Not now" was tapped on the survey offer (or the flag could not be read). */
  surveyDismissed: boolean;
}

export interface HomePrompts {
  /** Offer the six-question survey. */
  survey: boolean;
  /** Ask the one-tap department question. */
  department: boolean;
}

export function homePrompts(input: HomePromptInput): HomePrompts {
  if (input.profile === 'unknown') return { survey: false, department: false };
  if (input.profile === 'has') return { survey: false, department: !input.hasWardrobeFocus };
  // No profile at all. A brand-new, empty account is offered the survey
  // (whose first step is the department question). Anyone with clothes in
  // their closet, or who has said "not now", gets the single tap instead.
  const survey = input.closetCount === 0 && !input.surveyDismissed;
  return { survey, department: !survey };
}

/**
 * Whether a screen may show the inline department question: only when the
 * read succeeded and the answer is genuinely missing.
 */
export function departmentQuestionDue(profile: ProfileKnowledge, hasWardrobeFocus: boolean): boolean {
  return profile !== 'unknown' && !hasWardrobeFocus;
}

/**
 * Whether a screen may invite the member to build a style profile: only a
 * confirmed empty account. `closetCount` undefined means the closet has not
 * been read (or the read failed) - no evidence, no invitation.
 */
export function profileInviteDue(profile: ProfileKnowledge, closetCount: number | undefined): boolean {
  return profile === 'none' && closetCount === 0;
}

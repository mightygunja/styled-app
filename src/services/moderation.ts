/**
 * Community safety: what can be posted, what a member sees, and how a report
 * or a block is recorded.
 *
 * The owner's call (2026-11-13): Community ships at launch, so it has to
 * carry what any place with other people's words needs - and what App Review
 * requires of one (guideline 1.2):
 *
 *   1. FILTER   - screenText refuses a post, comment or message that contains
 *                 slurs, explicit sexual language, strong profanity or a
 *                 threat, before it is ever saved.
 *   2. REPORT   - any member can report a post, a comment, a message or a
 *                 person, with a reason. The reporter stops seeing that thing
 *                 at once; three different members reporting the same post or
 *                 comment hides it from everyone until an admin has looked
 *                 (functions: onContentReported). Reports go to an admin
 *                 queue (AdminReportsScreen), not to an inbox nobody reads.
 *   3. BLOCK    - blocking a member hides everything they have posted from
 *                 the blocker, everywhere, and stops them messaging the
 *                 blocker. It can be undone from Settings.
 *
 * Nothing here hides a member's own content from themselves: an author can
 * always see - and delete - what they wrote.
 *
 * Pure: no Firebase, no React Native. scripts/auditModeration.ts runs it.
 */

export type ReportTarget = 'post' | 'comment' | 'message' | 'user';

export const REPORT_REASONS: Array<{ key: string; label: string }> = [
  { key: 'harassment', label: 'Harassment or bullying' },
  { key: 'hate', label: 'Hate speech or symbols' },
  { key: 'sexual', label: 'Nudity or sexual content' },
  { key: 'violence', label: 'Violence or threats' },
  { key: 'spam', label: 'Spam or a scam' },
  { key: 'other', label: 'Something else' },
];

/** Different members who must report a post or comment before it is hidden from everyone. */
export const REPORTS_TO_HIDE = 3;

/** One block per pair, one report per member per thing: the ids say so. */
export const blockDocId = (blockerId: string, blockedId: string) => `${blockerId}_${blockedId}`;
export const reportDocId = (reporterId: string, type: ReportTarget, targetId: string) =>
  `${reporterId}_${type}_${targetId}`;
export const reportKey = (type: ReportTarget, targetId: string) => `${type}:${targetId}`;

// ---------------------------------------------------------------- filter

/** Letters people swap in to get a word past a filter. */
const LOOKALIKES: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };

/**
 * Words that are never allowed, matched as whole words (so "Scunthorpe",
 * "cocktail dress" and "assess" pass) with common endings. Slurs, explicit
 * sexual words and strong profanity. This list is the filter, not copy -
 * nothing in it is ever shown.
 */
const BLOCKED_WORDS = [
  // slurs
  'nigger', 'nigga', 'faggot', 'fag', 'dyke', 'tranny', 'retard', 'retarded', 'spic', 'kike', 'chink', 'gook',
  'wetback', 'paki', 'coon', 'towelhead', 'raghead',
  // explicit sexual
  'porn', 'porno', 'pornography', 'blowjob', 'handjob', 'cum', 'cumshot', 'dildo', 'anal', 'pussy', 'cock',
  'dick', 'tits', 'titties', 'whore', 'slut', 'onlyfans', 'horny', 'jizz', 'rape', 'rapist',
  // strong profanity
  'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bullshit', 'bitch', 'cunt', 'asshole', 'bastard', 'wanker',
  'twat', 'prick',
];
const ENDINGS = '(?:s|es|ed|er|ers|ing|in)?';
const BLOCKED = new RegExp(`\\b(?:${BLOCKED_WORDS.join('|')})${ENDINGS}\\b`, 'i');

/** Things said to a person that are never allowed, whatever the words around them. */
const THREATS = /\b(?:kill yourself|kys|go die|i(?:'| wi)ll kill you|i will find you|hope you die|you should die|neck yourself|send (?:me |us )?nudes)\b/i;

/**
 * Fashion's own words that would otherwise trip the list. "Nudes" is a
 * colour family and a pussy-bow is a blouse; this is a styling app, and a
 * filter that refuses its own vocabulary gets switched off in people's heads.
 */
const FASHION_TERMS = /\bpussy[- ]?bows?\b/gi;

export const FILTER_MESSAGE =
  "That can't be posted: it contains language our community rules don't allow. Please rewrite it.";

/** The text as the filter reads it: lower case, look-alike characters undone, letters spaced or stretched to dodge it closed up. */
export function normalizeForFilter(text: string): string {
  const plain = String(text || '')
    .toLowerCase()
    .replace(/[0134578@$!]/g, ch => LOOKALIKES[ch] ?? ch)
    // "f.u.c.k" and "f u c k" -> "fuck": single letters separated by one mark.
    .replace(/\b(?:[a-z][.\-_* ]){2,}[a-z]\b/g, run => run.replace(/[.\-_* ]/g, ''))
    // "fuuuuck" -> "fuuck": a letter repeated three or more times is cut to two.
    .replace(/([a-z])\1{2,}/g, '$1$1');
  // ...and a doubled letter is also tried single ("fuuck" -> "fuck").
  return `${plain} ${plain.replace(/([a-z])\1/g, '$1')}`;
}

/** Whether a post, comment or message may be saved. */
export function screenText(text: string): { ok: true } | { ok: false; message: string } {
  const read = normalizeForFilter(String(text || '').replace(FASHION_TERMS, ' '));
  if (BLOCKED.test(read) || THREATS.test(read)) return { ok: false, message: FILTER_MESSAGE };
  return { ok: true };
}

/** Thrown by the services so a screen can show the reason instead of a generic failure. */
export class NotAllowedError extends Error {
  readonly notAllowed = true;
  constructor(message: string = FILTER_MESSAGE) {
    super(message);
    this.name = 'NotAllowedError';
  }
}

/** Throws NotAllowedError when the text may not be saved. */
export function assertAllowed(text: string): void {
  const result = screenText(text);
  if (!result.ok) throw new NotAllowedError(result.message);
}

export function isNotAllowed(error: unknown): error is NotAllowedError {
  return !!error && typeof error === 'object' && (error as any).notAllowed === true;
}

// ---------------------------------------------------------------- what a member sees

export interface ModerationState {
  /** Members this viewer has blocked. */
  blocked: ReadonlySet<string>;
  /** Things this viewer has reported, as reportKey(type, id). */
  reported: ReadonlySet<string>;
}

export const NO_MODERATION: ModerationState = { blocked: new Set(), reported: new Set() };

export interface Moderated {
  type: ReportTarget;
  id: string;
  ownerId: string;
  /** Set by the server once enough members have reported it. */
  hidden?: boolean;
}

/** Whether this viewer should be shown this piece of content. */
export function isVisible(item: Moderated, viewerId: string, state: ModerationState): boolean {
  // An author always sees their own content, hidden or not: they may want to delete it.
  if (item.ownerId === viewerId) return true;
  if (item.hidden === true) return false;
  if (state.blocked.has(item.ownerId)) return false;
  if (state.reported.has(reportKey(item.type, item.id))) return false;
  return true;
}

/** The items of a list this viewer should be shown, in their order. */
export function visibleOnly<T>(items: T[], describe: (item: T) => Moderated, viewerId: string, state: ModerationState): T[] {
  return items.filter(item => isVisible(describe(item), viewerId, state));
}

/** Whether enough different members have reported a thing for it to be hidden from everyone. */
export function shouldHide(reporterIds: string[]): boolean {
  return new Set(reporterIds.filter(Boolean)).size >= REPORTS_TO_HIDE;
}

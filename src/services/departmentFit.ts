/**
 * Department fit - the one rule for "does this belong on this person's
 * screen?", shared by every surface that shows clothing or names a garment.
 *
 * The account's wardrobe choice (PersonalStyleProfile.wardrobeFocus) is the
 * only thing the app knows about whose clothes it is showing:
 *
 *   'womens'    womenswear and cross-department pieces. Never menswear.
 *   'mens'      menswear and cross-department pieces. Never womenswear.
 *   'all'       "A bit of both" - an explicit choice to see everything.
 *   undefined   not answered yet. Cross-department pieces ONLY.
 *
 * The last line is the one that used to be wrong: an account with no saved
 * choice (or a profile that failed to load) was treated like 'all', so it
 * got a mixed rack - menswear on a woman's screen and the reverse. Not
 * knowing is not permission to show everything.
 *
 * Words matter as much as photos: a menswear account must not be told to buy
 * "a flowing maxi skirt", or handed a search for "men's pleated skirt". The
 * word lists below say which garment words belong to one department only.
 *
 * Pure (no app imports) so scripts/auditDepartment.ts runs exactly this.
 */

export type WardrobeFocus = 'womens' | 'mens' | 'all' | undefined;
export type Department = 'women' | 'men' | 'unisex' | undefined;

/**
 * Whether a piece of a given department may be shown to this wardrobe focus.
 * A piece with no department (a live feed that does not report one) is
 * treated as cross-department, as it always has been.
 */
export function departmentVisible(department: Department, focus: WardrobeFocus): boolean {
  if (focus === 'all') return true;
  const unisex = !department || department === 'unisex';
  if (unisex) return true;
  if (focus === 'womens') return department === 'women';
  if (focus === 'mens') return department === 'men';
  return false; // not answered yet: nothing gendered
}

/** The opposite department, for "is this shown only to the other side?" checks. */
export function otherFocus(focus: WardrobeFocus): 'womens' | 'mens' | null {
  return focus === 'womens' ? 'mens' : focus === 'mens' ? 'womens' : null;
}

/**
 * Garment words that are womenswear and nothing else. Matched as whole
 * words; "dress" does not fire inside "dress shirt" or "dress trousers",
 * and "flat" counts only as the shoe ("ballet flat", "flats") - not in
 * "flat cap", "flat-front" or "a flat sandal".
 */
const WOMENSWEAR_ONLY: RegExp[] = [
  /\bskirts?\b/,
  /\bdress(?:es)?\b(?![\s-]+(?:shirts?|trousers|pants|shoes?|belts?|boots?|watch(?:es)?|socks?|code))/,
  /\bgowns?\b/,
  /\bblouses?\b/,
  /\bcamisoles?\b/,
  /\bcamis?\b/,
  /\bbras?\b/,
  /\bbralettes?\b/,
  /\bbodysuits?\b/,
  /\bcorsets?\b/,
  /\bpeplum\b/,
  /\bpeasant\b/,
  /\bprairie\b/,
  /\bheels?\b/,
  /\bheeled\b/,
  /\bpumps?\b/,
  /\bstilettos?\b/,
  /\bslingbacks?\b/,
  /\bmary[\s-]janes?\b/,
  /\bballet\b/,
  /\bflats\b/,
  // "mesh flat", "split-toe flat" - a flat as the shoe, not "a flat sandal".
  /\b[\w-]+\s+flat\b(?![\s-]+(?:shoes?|sandals?|caps?|front|soles?|lay))/,
  /\btights\b/,
  /\bhosiery\b/,
  /\bclutch(?:es)?\b/,
  /\bhandbags?\b/,
  /\bearrings?\b/,
  /\bhoops?\b/,
  /\bheadscarf\b/,
  /\bheadscarves\b/,
  /\bhair scarf\b/,
  /\bkaftans?\b/,
  /\babayas?\b/,
  /\bleggings\b/,
  /\bculottes\b/,
  /\bpalazzo\b/,
  /\bjumpsuits?\b/,
  /\brompers?\b/,
  /\bhalter\b/,
  /\bcrop top\b/,
  /\bsheer\b/,
  /\bchiffon\b/,
  /\borganza\b/,
  /\bmaxi\b/,
  /\bmidi\b/,
  /\bbucket bag\b/,
  /\bshoulder bag\b/,
  /\btop-handle\b/,
  /\bhobo\b/,
  /\bwomen'?s\b/,
  /\bwomenswear\b/,
];

/** Garment words that are menswear and nothing else. */
const MENSWEAR_ONLY: RegExp[] = [
  /(?<!wo)\bmen'?s\b/,
  /\bmenswear\b/,
  /\bneckties?\b/,
  /\b(?:silk|knit|wool|bow)[\s-]ties?\b/,
  /\bcufflinks?\b/,
  /\bpocket squares?\b/,
  /\btie (?:bar|clip)s?\b/,
];

function names(text: string, patterns: RegExp[]): boolean {
  const lower = (text || '').toLowerCase().replace(/[’`]/g, "'");
  return patterns.some(pattern => pattern.test(lower));
}

/** True when the text names a womenswear-only garment. */
export function namesWomenswear(text: string): boolean {
  return names(text, WOMENSWEAR_ONLY);
}

/** True when the text names a menswear-only garment. */
export function namesMenswear(text: string): boolean {
  return names(text, MENSWEAR_ONLY);
}

/**
 * Whether a garment word or phrase may be put in front of this wardrobe
 * focus. 'all' sees everything; an unanswered focus sees nothing gendered.
 */
export function wordFitsFocus(text: string, focus: WardrobeFocus): boolean {
  if (focus === 'all') return true;
  const w = namesWomenswear(text);
  const m = namesMenswear(text);
  if (focus === 'womens') return !m;
  if (focus === 'mens') return !w;
  return !w && !m;
}

/** The department qualifier a search phrase gets: "men's ", "women's " or nothing. */
export function searchQualifier(focus: WardrobeFocus): string {
  return focus === 'mens' ? "men's " : focus === 'womens' ? "women's " : '';
}

/**
 * Whether womenswear-only content - the Lookbook and the favourites drawn
 * from it, which carry no department - may be offered to this focus. Only
 * to someone who has chosen womenswear or "a bit of both"; never to a
 * menswear account, and not to one that has not said.
 */
export function womenswearContentVisible(focus: WardrobeFocus): boolean {
  return focus === 'womens' || focus === 'all';
}

/**
 * Whether a closet category should be offered as a choice. Dresses are not
 * offered to a menswear account - unless it already owns one, which the
 * caller passes as `owned` so nothing the user has is ever hidden from them.
 */
export function categoryOffered(category: string, focus: WardrobeFocus, owned: boolean = false): boolean {
  if ((category || '').toLowerCase() !== 'dresses') return true;
  return focus !== 'mens' || owned;
}

export const departmentFit = {
  womenswearContentVisible,
  categoryOffered,
  departmentVisible,
  otherFocus,
  namesWomenswear,
  namesMenswear,
  wordFitsFocus,
  searchQualifier,
};

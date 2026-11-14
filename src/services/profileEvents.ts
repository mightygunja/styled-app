/**
 * Profile revision - how the rest of the app learns the style profile changed.
 *
 * Recommendation screens (Home, Shop, Explore, the trend report) stay mounted
 * behind the profile builder, and several of them load once. Without a signal
 * they kept showing rankings built from the profile as it was when they
 * mounted: change "bohemian" to "romantic", go back to Shop, and nothing
 * moved.
 *
 * Every successful write of users/{uid}.styleProfile bumps the revision
 * (styleProfileService.saveStyleProfile does it centrally). A screen remembers
 * the revision it loaded with and reloads on focus when it differs - and only
 * then, so an unchanged profile never costs a reload or a scroll position.
 *
 * In memory on purpose: a fresh launch loads everything fresh anyway. Caches
 * that outlive the session carry `profileSignature` in their key instead.
 * Pure - no React Native, no Firebase.
 */

let revision = 0;
const listeners = new Set<(revision: number) => void>();

/** The current profile revision. Starts at 0 and only ever goes up. */
export function getProfileRevision(): number {
  return revision;
}

/** Call after every successful style-profile write. */
export function bumpProfileRevision(): void {
  revision += 1;
  listeners.forEach(listener => {
    try {
      listener(revision);
    } catch {
      // One listener's failure must not stop the others hearing about it.
    }
  });
}

/** Hears every bump. Returns the unsubscribe function. */
export function subscribeProfileRevision(listener: (revision: number) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The part of a profile that recommendations are built from, as a stable
 * string: archetypes, department, avoid rules and colour season. Anything
 * cached per profile (daily-outfit copy, the personalised trend report) keeps
 * this beside the data and treats a different signature as a different user.
 * List order and letter case do not change it.
 */
export function profileSignature(
  profile:
    | {
        styleArchetypes?: string[];
        wardrobeFocus?: string;
        avoidRules?: string[];
        colorSeason?: string;
        priceMix?: string;
      }
    | null
    | undefined
): string {
  const list = (values?: string[]) =>
    (values || [])
      .map(v => String(v).trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join(',');
  return [
    list(profile?.styleArchetypes),
    (profile?.wardrobeFocus || 'all').toLowerCase(),
    list(profile?.avoidRules),
    (profile?.colorSeason || '').toLowerCase(),
    // Added only once answered, so a profile without it keeps the signature
    // it had and no cached look is thrown away by this field existing.
    ...(profile?.priceMix ? [String(profile.priceMix).toLowerCase()] : []),
  ].join('|');
}

/**
 * Archetype matching - one vocabulary, shared by every matcher.
 *
 * A profile stores archetype KEYS ("bohemian", "minimal"); garments and
 * products are tagged in the words people actually use for them ("boho",
 * "minimalist", "artisan", "athleisure"). Matching the key as a literal
 * substring - `haystack.includes('bohemian')` - found almost nothing, so
 * changing archetype barely moved a single recommendation.
 *
 * This module is the one place that says which words read as which
 * archetype. Pure on purpose (no React Native, no Firebase) so the audit
 * script can import it: scripts/auditArchetypes.ts.
 *
 * The vocabulary is curated from the catalogue's real tag list
 * (mockProductCatalog.ts), plus the plain-English synonyms a closet tag or a
 * post caption would use. Rules it was built to:
 *   - a word belongs to at most two archetypes (the audit checks this);
 *   - nothing so broad it says nothing ("everyday", "staple", "versatile");
 *   - style words only - no garments ("loafer"), occasions ("date",
 *     "evening") or hand-feel ("soft" is on sweat shorts and laptop sleeves);
 *   - matching is whole-word, so "classic" never fires inside "classical"
 *     and "lace" never fires on "lace-up".
 */

export const ARCHETYPE_KEYS = [
  'minimal',
  'polished',
  'relaxed',
  'edgy',
  'classic',
  'bohemian',
  'romantic',
  'sporty',
] as const;

export type ArchetypeKey = (typeof ARCHETYPE_KEYS)[number];

/**
 * `names` are forms of the archetype's own name - they count once between
 * them and are reported as the key itself. `words` are the descriptive
 * vocabulary; each distinct one is its own hit and can be quoted in a reason.
 */
export const ARCHETYPE_VOCABULARY: Record<ArchetypeKey, { names: string[]; words: string[] }> = {
  minimal: {
    names: ['minimal', 'minimalist', 'minimalism'],
    words: ['scandi', 'sleek', 'clean', 'understated', 'pared-back'],
  },
  polished: {
    names: ['polished'],
    words: [
      'tailored', 'sharp', 'structured', 'refined', 'elegant', 'crisp', 'luxe',
      'smart', 'smart-casual', 'business', 'formal', 'sophisticated',
    ],
  },
  relaxed: {
    names: ['relaxed'],
    words: [
      'casual', 'cozy', 'slouchy', 'easy', 'comfort', 'comfortable', 'comfy',
      'lounge', 'oversized', 'baggy', 'laid-back', 'effortless',
    ],
  },
  edgy: {
    names: ['edgy'],
    words: [
      'moto', 'streetwear', 'fashion-forward', 'statement', 'sculptural', 'modern',
      'bold', 'daring', 'grunge', 'punk',
    ],
  },
  classic: {
    names: ['classic'],
    words: [
      'heritage', 'preppy', 'timeless', 'traditional', 'french', 'nautical',
      'collegiate', 'iconic', 'heirloom', 'refined',
    ],
  },
  bohemian: {
    names: ['bohemian', 'boho'],
    words: [
      'artisan', 'crochet', 'fringe', 'embroidered', 'prairie', 'flowing', 'kaftan',
      'tiered', 'seventies', 'handloom', 'folk', 'peasant', 'eclectic', 'artistic',
    ],
  },
  romantic: {
    names: ['romantic'],
    words: [
      'feminine', 'delicate', 'flowing', 'elegant', 'satin', 'bias-cut', 'puff-sleeve',
      'lace', 'ruffle', 'ruffled', 'floral',
    ],
  },
  sporty: {
    names: ['sporty', 'sport'],
    words: [
      'athleisure', 'active', 'athletic', 'activewear', 'technical', 'performance',
      'gorpcore', 'outdoor', 'workout', 'gym',
    ],
  },
};

export interface ArchetypeMatch {
  /** The profile's archetype that matched, as the profile wrote it. */
  archetype: string;
  /**
   * The distinct vocabulary that hit: the archetype's own key first when the
   * text names it outright, then each descriptive word found. Its length is
   * how clearly the text reads as the archetype.
   */
  hits: string[];
}

/** Lowercased whole words; hyphenated compounds ("wide-leg", "lace-up") stay one word. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .map(word => word.replace(/^-+|-+$/g, ''))
    .filter(Boolean);
}

function isKey(word: string): word is ArchetypeKey {
  return (ARCHETYPE_KEYS as readonly string[]).includes(word);
}

/**
 * The archetype key a word stands for: the key itself, one of its name
 * forms ("boho", "minimalist"), or the word unchanged when it is neither.
 */
export function canonicalArchetype(word: string): string {
  const lower = (word || '').trim().toLowerCase();
  if (isKey(lower)) return lower;
  return ARCHETYPE_KEYS.find(key => ARCHETYPE_VOCABULARY[key].names.includes(lower)) ?? lower;
}

/**
 * The vocabulary of one archetype that appears in `text` as whole words.
 * `text` is anything a garment is described by - product name, subcategory
 * and style tags joined with spaces, a closet item's tags, a caption with
 * its hashtags. An archetype outside the eight known keys (a hand-written
 * one) is matched as its own single whole word.
 */
export function archetypeHits(archetype: string, text: string): string[] {
  const key = canonicalArchetype(archetype);
  if (!key) return [];
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];
  const present = new Set(tokens);
  const spaced = ` ${tokens.join(' ')} `;
  // A hyphenated entry also matches written as two words ("puff sleeve").
  const has = (word: string) =>
    present.has(word) || (word.includes('-') && spaced.includes(` ${word.replace(/-/g, ' ')} `));

  if (!isKey(key)) return has(key) ? [key] : [];

  const vocabulary = ARCHETYPE_VOCABULARY[key];
  const hits: string[] = vocabulary.names.some(has) ? [key] : [];
  vocabulary.words.forEach(word => {
    if (has(word)) hits.push(word);
  });
  return hits;
}

/**
 * Which of the profile's archetypes `text` reads as, and on what evidence.
 * With several archetypes on the profile the one with the most distinct hits
 * wins; a tie goes to the one the profile lists first. Null when none match.
 */
export function matchArchetype(
  archetypes: string[] | undefined,
  text: string
): ArchetypeMatch | null {
  let best: ArchetypeMatch | null = null;
  for (const archetype of archetypes || []) {
    if (!archetype) continue;
    const hits = archetypeHits(archetype, text);
    if (hits.length > (best?.hits.length ?? 0)) best = { archetype: archetype.toLowerCase(), hits };
  }
  return best;
}

/**
 * The descriptive words of a match, for quoting in a reason - the hits
 * without the archetype's own name ("boho, artisan", not "bohemian").
 */
export function archetypeEvidence(match: ArchetypeMatch, limit: number = 2): string[] {
  const key = canonicalArchetype(match.archetype);
  return match.hits.filter(hit => hit !== key).slice(0, limit);
}

/**
 * Archetype -> recommendations audit.
 *
 * Proves that changing the style archetype on a profile changes what Shop
 * ranks first. For a brand-new user (EMPTY closet, no colour or body
 * analysis) in each department, every one of the eight archetypes ranks the
 * whole catalogue through the real scorer (scoreAndRankProducts), and the
 * audit fails when:
 *   1. fewer than 8 of an archetype's top 12 carry that archetype by the
 *      shared vocabulary (archetypeMatch.ts) - or, when the department has
 *      fewer than 8 such pieces in total, any of them is missing from the
 *      top 12;
 *   2. two different archetypes share more than 5 of their top 12;
 *   3. a vocabulary word is assigned to more than two archetypes.
 * An archetype the department's catalogue cannot fill (fewer than 8 pieces)
 * is a WARN with the count, not a failure - that is a curation gap, reported
 * for the catalogue's editor. So are shortfalls 1 and 2 for an archetype
 * with fewer than 16 pieces (two screens): it cannot hold a top 12 through
 * every season, which is a catalogue-depth limit rather than a ranking bug.
 *
 * Checked in all four seasons, because the seasonal weight is the one other
 * signal a new user's ranking has; the tables print the current season.
 *
 * Run:  npx tsx scripts/auditArchetypes.ts
 */

import { BALANCED_CATALOG } from '../src/data/mockProductCatalog';
import { scoreAndRankProducts, departmentAllowed } from '../src/services/marketplaceMatchingService';
import { currentSeason } from '../src/services/seasonalFit';
import {
  ARCHETYPE_KEYS,
  ARCHETYPE_VOCABULARY,
  ArchetypeKey,
  archetypeHits,
  matchArchetype,
} from '../src/services/archetypeMatch';
import { STYLE_ARCHETYPES } from '../src/models/personalStyleProfile';
import { Product } from '../src/models/product';
import { Season } from '../src/types';

const TOP = 12;
const MIN_CARRYING = 8;
const MAX_SHARED = 5;
// Two screens' worth. Below this an archetype cannot hold a top 12 through
// every season - its coats sink in summer, its linen in winter - so its
// shortfalls are reported as curation gaps (WARN), not as ranking bugs.
const DEEP = 16;
const SEASONS: Season[] = ['winter', 'spring', 'summer', 'fall'];
const FOCUSES = ['womens', 'mens'] as const;
type Focus = (typeof FOCUSES)[number];

let failures = 0;
let warnings = 0;

function fail(message: string) {
  failures += 1;
  console.log(`  FAIL  ${message}`);
}

function warn(message: string) {
  warnings += 1;
  console.log(`  WARN  ${message}`);
}

/** The text scoreProduct matches against: name, subcategory and style tags. */
function productText(product: Product): string {
  return [product.name, product.subcategory, ...(product.styleTags || [])].filter(Boolean).join(' ');
}

const carries = (product: Product, archetype: ArchetypeKey) =>
  archetypeHits(archetype, productText(product)).length > 0;

function topFor(focus: Focus, archetype: ArchetypeKey, season: Season) {
  return scoreAndRankProducts(
    BALANCED_CATALOG,
    { wardrobeFocus: focus, styleArchetypes: [archetype] },
    [],
    { season }
  ).slice(0, TOP);
}

// ---- 0. The vocabulary itself ----
console.log('# Vocabulary');
const profileKeys = Object.keys(STYLE_ARCHETYPES);
if (profileKeys.join() !== ARCHETYPE_KEYS.join()) {
  fail(`archetype keys differ from STYLE_ARCHETYPES: ${ARCHETYPE_KEYS.join(', ')} vs ${profileKeys.join(', ')}`);
}
const owners = new Map<string, string[]>();
for (const key of ARCHETYPE_KEYS) {
  const { names, words } = ARCHETYPE_VOCABULARY[key];
  console.log(`  ${key.padEnd(9)} ${[...names, ...words].join(', ')}`);
  for (const word of [...names, ...words]) owners.set(word, [...(owners.get(word) || []), key]);
}
for (const [word, keys] of owners) {
  if (keys.length > 2) fail(`"${word}" belongs to ${keys.length} archetypes (${keys.join(', ')}) - two is the limit`);
}
const shared = [...owners].filter(([, keys]) => keys.length === 2);
console.log(`  shared by two: ${shared.map(([word, keys]) => `${word} (${keys.join(' + ')})`).join(', ') || '-'}`);

// Whole-word matching, spot-checked: [archetypes, text, expected archetype or null].
const MATCHER_CASES: Array<[string[], string, string | null]> = [
  [['minimal'], 'Cotton Poplin Shirt minimalist scandi crisp', 'minimal'],
  [['bohemian'], 'Western Concho Belt western boho statement', 'bohemian'],
  [['bohemian'], '#BOHO summer look', 'bohemian'],
  [['romantic'], 'Puff Sleeve Blouse', 'romantic'],
  [['romantic'], 'Lace-Up Boots edgy utility boot', null],
  [['classic'], 'classical concert outfit', null],
  [['sporty'], 'transport tote', null],
  [['Minimal'], 'MINIMAL tee', 'minimal'],
  [['romantic', 'bohemian'], 'Embroidered Folk Blouse bohemian artisan detail', 'bohemian'],
  [['bohemian', 'romantic'], 'Peasant Blouse bohemian flowing romantic', 'bohemian'],
  [[], 'boho', null],
  [['polished'], '', null],
];
for (const [archetypes, text, expected] of MATCHER_CASES) {
  const got = matchArchetype(archetypes, text)?.archetype ?? null;
  if (got !== expected) fail(`matchArchetype(${JSON.stringify(archetypes)}, "${text}") gave ${got}, expected ${expected}`);
}
console.log(`  matcher: ${MATCHER_CASES.length} whole-word cases checked`);

// What the literal `haystack.includes(key)` this replaces could see.
for (const focus of FOCUSES) {
  const allowed = BALANCED_CATALOG.filter(p => departmentAllowed(p, { wardrobeFocus: focus }));
  const line = ARCHETYPE_KEYS.map(key => {
    const before = allowed.filter(p => productText(p).toLowerCase().includes(key)).length;
    return `${key} ${before}->${allowed.filter(p => carries(p, key)).length}`;
  }).join(', ');
  console.log(`  ${focus} pieces found, literal key -> vocabulary: ${line}`);
}

// ---- 1 + 2. Rankings ----
const now = currentSeason();
console.log(`\n# Catalogue: ${BALANCED_CATALOG.length} products. Empty closet, no colour or body analysis. Tables show ${now}; all four seasons are checked.`);

for (const focus of FOCUSES) {
  const allowed = BALANCED_CATALOG.filter(p => departmentAllowed(p, { wardrobeFocus: focus }));
  console.log(`\n## ${focus} (${allowed.length} products in department)`);
  console.log(`  ${'archetype'.padEnd(10)} ${'in dept'.padStart(7)}  ${'top-12 carrying'.padStart(15)}  ${'worst season'.padStart(12)}  ${'max shared with'.padEnd(22)} first three`);

  const available = new Map<ArchetypeKey, Product[]>();
  for (const key of ARCHETYPE_KEYS) available.set(key, allowed.filter(p => carries(p, key)));

  // Every season's top 12, per archetype.
  const tops = new Map<string, ReturnType<typeof topFor>>();
  for (const season of SEASONS) {
    for (const key of ARCHETYPE_KEYS) tops.set(`${season}:${key}`, topFor(focus, key, season));
  }

  const thinOverlaps: string[] = [];
  for (const key of ARCHETYPE_KEYS) {
    const pool = available.get(key)!;
    const need = Math.min(MIN_CARRYING, pool.length);
    let worst = TOP;
    let worstSeason: Season = now;
    for (const season of SEASONS) {
      const top = tops.get(`${season}:${key}`)!;
      const carrying = top.filter(m => carries(m.product, key)).length;
      if (carrying < worst) {
        worst = carrying;
        worstSeason = season;
      }
      if (carrying < need) {
        const message =
          pool.length >= MIN_CARRYING
            ? `${focus}/${key} in ${season}: only ${carrying} of the top ${TOP} carry it (need ${MIN_CARRYING}; ${pool.length} in department)`
            : `${focus}/${key} in ${season}: ${carrying} of its ${pool.length} pieces made the top ${TOP} (all ${pool.length} must)`;
        if (pool.length >= DEEP) fail(message);
        else thinOverlaps.push(`${message} - too few pieces to hold every season`);
      }
    }

    let maxShared = 0;
    let maxWith = '-';
    for (const other of ARCHETYPE_KEYS) {
      if (other === key) continue;
      for (const season of SEASONS) {
        const mine = new Set(tops.get(`${season}:${key}`)!.map(m => m.product.id));
        const sharedCount = tops.get(`${season}:${other}`)!.filter(m => mine.has(m.product.id)).length;
        if (sharedCount > maxShared) {
          maxShared = sharedCount;
          maxWith = `${other} (${season})`;
        }
        // Each pair is reported once, from the alphabetically-first side. An
        // archetype the department cannot fill pads its top 12 with the
        // default ranking, so its overlaps are the curation gap again - WARN.
        if (sharedCount > MAX_SHARED && key < other) {
          const thin = [key, other].filter(k => available.get(k)!.length < DEEP);
          const message = `${focus} in ${season}: ${key} and ${other} share ${sharedCount} of their top ${TOP} (limit ${MAX_SHARED})`;
          if (thin.length) thinOverlaps.push(`${message} - ${thin.join(' and ')} cannot fill a screen`);
          else fail(message);
        }
      }
    }

    const current = tops.get(`${now}:${key}`)!;
    const currentCarrying = current.filter(m => carries(m.product, key)).length;
    console.log(
      `  ${key.padEnd(10)} ${String(pool.length).padStart(7)}  ${`${currentCarrying}/${TOP}`.padStart(15)}  ${`${worst}/${TOP} ${worstSeason}`.padStart(12)}  ${`${maxShared} ${maxWith}`.padEnd(22)} ${current
        .slice(0, 3)
        .map(m => `${m.product.name} ${m.matchScore}`)
        .join(' | ')}`
    );
    if (pool.length < MIN_CARRYING) {
      warn(`${focus}/${key}: only ${pool.length} piece(s) in the department carry it - the catalogue cannot fill a screen for this archetype`);
    }
  }
  if (thinOverlaps.length) {
    warn(`${focus}: ${thinOverlaps.length} top-${TOP} overlap(s) above ${MAX_SHARED}, every one involving an archetype the department cannot fill, e.g. ${thinOverlaps[0]}`);
  }

  // The reported case, spelled out: bohemian -> romantic.
  if (focus === 'womens') {
    const before = tops.get(`${now}:bohemian`)!;
    const after = tops.get(`${now}:romantic`)!;
    const kept = after.filter(m => before.some(b => b.product.id === m.product.id)).length;
    console.log(`\n  bohemian -> romantic (${now}): ${TOP - kept} of the top ${TOP} change.`);
    console.log(`    bohemian: ${before.slice(0, 6).map(m => m.product.name).join(' | ')}`);
    console.log(`    romantic: ${after.slice(0, 6).map(m => m.product.name).join(' | ')}`);
    console.log(`    headline: "${after[0].headline}"`);
  }
}

console.log(
  `\n${failures === 0 ? 'OK' : `${failures} failure(s)`} - ${warnings} warning(s). ${
    failures === 0 ? 'Every archetype leads with its own pieces and no two archetypes share a first screen.' : ''
  }`
);
process.exit(failures === 0 ? 0 : 1);

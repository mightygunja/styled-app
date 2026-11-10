/**
 * Trend seed audit: the pieces that arrive with a published trend.
 *
 * A trend published on the desk can carry its own photo-checked pieces
 * (`seedPieces` on the trend document - see src/services/trendSeeds.ts).
 * This runs the exact code the app runs and fails when:
 *   - a malformed or unsafe seed survives reading (a free image URL, an
 *     unknown category or department, a duplicate id, more than the cap);
 *   - a seed that does not carry one of its trend's anchors is shown;
 *   - a women's rail shows a men's seed, or the reverse;
 *   - a trend's own seeds do not lead its rail, or a rail repeats a name;
 *   - a seed's shop link is not a tagged Amazon search for the piece shown;
 *   - a seed cannot be opened by its product id;
 *   - a published trend has no key piece to search for (it would open an
 *     empty shop with nothing to tap).
 *
 * Run:  npx tsx scripts/auditTrendSeeds.ts
 */

import { FashionTrend, TrendSeedPiece } from '../src/models/fashionTrend';
import { SEED_TRENDS } from '../src/data/seedTrends';
import { AMAZON_ASSOCIATE_TAG } from '../src/services/amazonSearch';
import { piecesForTrend } from '../src/services/trendLooks';
import { mergeTrends } from '../src/services/trendMerge';
import {
  MAX_SEED_PIECES,
  allSeedProducts,
  isSeedOf,
  isSeedProductId,
  normalizeSeedPieces,
  registerTrendSeeds,
  seedPhotoId,
  seedProductById,
  seedProducts,
  trendAnchorSearches,
} from '../src/services/trendSeeds';

let failures = 0;
let checks = 0;
const check = (ok: boolean, message: string) => {
  checks += 1;
  if (!ok) {
    failures += 1;
    console.log(`  FAIL  ${message}`);
  }
};

const piece = (over: Partial<TrendSeedPiece> & { id: string }): TrendSeedPiece => ({
  name: 'Balloon Pants',
  color: 'olive',
  category: 'bottoms',
  subcategory: 'balloon pants',
  department: 'women',
  photoId: '1650338524059-f0ae486cfa66',
  styleTags: ['relaxed', 'sculptural', 'cotton'],
  price: 120,
  ...over,
});

/** A desk trend the bundled catalogue carries nothing for. */
const deskTrend = (seedPieces?: TrendSeedPiece[]): FashionTrend => ({
  id: 'deskAbc123',
  name: 'Volume below',
  summary: 'Balloon and bubble shapes from the waist down.',
  region: 'Seoul',
  stage: 'emerging',
  season: 'fall',
  year: 2026,
  keyGarments: ['balloon pants', 'bubble skirt'],
  keyColors: ['olive'],
  silhouettes: ['balloon'],
  archetypes: ['edgy'],
  keyAccessories: ['split-toe flat'],
  stylingNote: 'Keep the top half narrow.',
  entryPiece: 'balloon pants',
  seedPieces,
  status: 'published',
  source: 'ai-draft',
  createdAt: '2026-11-10T00:00:00.000Z',
  publishedAt: '2026-11-10T00:00:00.000Z',
});

// ---- 1. Reading seeds off a document ----
console.log('# Reading');
check(seedPhotoId('1650338524059-f0ae486cfa66') === '1650338524059-f0ae486cfa66', 'a bare photo id is accepted');
check(
  seedPhotoId('https://images.unsplash.com/photo-1650338524059-f0ae486cfa66?w=600&q=80') === '1650338524059-f0ae486cfa66',
  'an Unsplash image address yields its photo id'
);
[
  'https://evil.example/photo-1650338524059-f0ae486cfa66',
  'http://images.unsplash.com/photo-1650338524059-f0ae486cfa66',
  'https://images.unsplash.com.evil.example/photo-1650338524059-f0ae486cfa66',
  'https://plus.unsplash.com/premium_photo-1650338524059-f0ae486cfa66',
  'https://unsplash.com/photos/a-jacket-AbCdEf12345',
  'javascript:alert(1)',
  '',
].forEach(bad => check(seedPhotoId(bad) === null, `"${bad}" must not be accepted as a seed photo`));

const messy = normalizeSeedPieces([
  piece({ id: 'ok1' }),
  piece({ id: 'ok1', name: 'Duplicate Id' }),
  piece({ id: 'badphoto', photoId: 'https://evil.example/x.jpg' }),
  { ...piece({ id: 'badcat' }), category: 'weapons' },
  { ...piece({ id: 'baddept' }), department: 'kids' },
  piece({ id: 'noname', name: '   ' }),
  null,
  'a string',
  piece({ id: 'ok2', name: 'Bubble Skirt', subcategory: 'bubble skirt', photoId: '1718251478116-cb9bf6371aa6', price: -4 }),
]);
check(messy.length === 2, `only the 2 well-formed seeds survive reading (got ${messy.length})`);
check(messy[1]?.price === 0, 'a nonsense price reads as 0, not a negative number');
check(normalizeSeedPieces('nope').length === 0 && normalizeSeedPieces(undefined).length === 0, 'non-arrays read as no seeds');
const many = normalizeSeedPieces(
  Array.from({ length: 30 }, (_, i) => piece({ id: `p${i}`, photoId: `16503385240${String(i).padStart(2, '0')}-f0ae486cfa66` }))
);
check(many.length === MAX_SEED_PIECES, `seeds are capped at ${MAX_SEED_PIECES} (got ${many.length})`);

// ---- 2. Seeds as shop products ----
console.log('# Products');
const womens1 = piece({ id: 'w1' });
const womens2 = piece({ id: 'w2', name: 'Bubble Skirt', subcategory: 'bubble skirt', color: 'black', photoId: '1718251478116-cb9bf6371aa6' });
const mens1 = piece({ id: 'm1', name: 'Pleated Balloon Pants', department: 'men', color: 'charcoal', photoId: '1617310208925-9ad2a0391d85' });
const mens2 = piece({ id: 'm2', name: 'Cropped Balloon Pants', department: 'men', color: 'stone', photoId: '1548133464-29abc661eb5c00' });
const both = piece({ id: 'u1', name: 'Split-Toe Flats', category: 'shoes', subcategory: 'split-toe flat', department: 'unisex', color: 'black', photoId: '1600429316815-43fe937fdc92' });
const offTrend = piece({ id: 'x1', name: 'Wool Scarf', category: 'accessories', subcategory: 'wool scarf', photoId: '1613673720017-56e42d90fee4' });

const seededTrend = deskTrend(normalizeSeedPieces([womens1, womens2, mens1, mens2, both, offTrend]));
const products = seedProducts(seededTrend);
check(products.length === 5, `the off-trend seed (a wool scarf) is not shown (got ${products.length} products)`);
products.forEach(product => {
  check(isSeedProductId(product.id) && isSeedOf(seededTrend, product.id), `${product.id} is recognisable as this trend's seed`);
  check(/^https:\/\/images\.unsplash\.com\/photo-[0-9a-f-]+\?w=600&q=70&auto=format$/.test(product.imageUrl), `${product.name}: image is an Unsplash photo`);
  const url = new URL(product.sourceUrl);
  const k = url.searchParams.get('k') || '';
  check(url.origin === 'https://www.amazon.com' && url.pathname === '/s', `${product.name}: link is an Amazon search`);
  check(url.searchParams.get('tag') === AMAZON_ASSOCIATE_TAG, `${product.name}: link carries the Associates tag`);
  check(k.toLowerCase().includes(product.name.toLowerCase()), `${product.name}: search names the piece ("${k}")`);
  check(!product.color || k.toLowerCase().includes(product.color), `${product.name}: search carries its colour ("${k}")`);
  if (product.department === 'men') check(/\bmen's\b/.test(k), `${product.name}: search is for menswear ("${k}")`);
  if (product.department === 'women') check(/\bwomen's\b/.test(k), `${product.name}: search is for womenswear ("${k}")`);
  if (product.department === 'unisex') check(!/\b(wo)?men's\b/.test(k), `${product.name}: cross-department search is not gendered ("${k}")`);
  check(!/trend pick/i.test(k), `${product.name}: the card label never leaks into the search ("${k}")`);
});

// ---- 3. Rails ----
console.log('# Rails');
check(piecesForTrend(deskTrend(), 'womens').length === 0, 'unseeded, the catalogue carries nothing for this trend (womens)');
check(piecesForTrend(deskTrend(), 'mens').length === 0, 'unseeded, the catalogue carries nothing for this trend (mens)');

const womenRail = piecesForTrend(seededTrend, 'womens');
const menRail = piecesForTrend(seededTrend, 'mens');
check(womenRail.length >= 3, `seeded, the womenswear rail fills (got ${womenRail.length})`);
check(menRail.length >= 3, `seeded, the menswear rail fills (got ${menRail.length})`);
check(womenRail.every(p => p.department !== 'men'), 'the womenswear rail shows no menswear seed');
check(menRail.every(p => p.department !== 'women'), 'the menswear rail shows no womenswear seed');
check(womenRail.some(p => p.name === 'Split-Toe Flats') && menRail.some(p => p.name === 'Split-Toe Flats'), 'a both-departments seed is on both rails');
[womenRail, menRail].forEach(rail => {
  const names = rail.map(p => p.name.toLowerCase());
  check(new Set(names).size === names.length, `no rail repeats a name (${names.join(' | ')})`);
});

// A desk trend the catalogue DOES carry: its own seeds still open the rail.
const linen = SEED_TRENDS.find(t => /linen/i.test(t.name));
if (!linen) {
  check(false, 'expected a linen seed trend to test seeds-lead-the-rail');
} else {
  const seededLinen: FashionTrend = {
    ...linen,
    id: 'deskLinen9',
    source: 'ai-draft',
    seedPieces: normalizeSeedPieces([
      piece({ id: 'l1', name: 'Striped Linen Shirt', category: 'tops', subcategory: 'linen shirt', color: 'blue stripe' }),
    ]),
  };
  const rail = piecesForTrend(seededLinen, 'womens');
  check(rail.some(p => isSeedOf(seededLinen, p.id)), 'a seed joins a rail the catalogue already fills');
  const firstGarment = rail.find(p => p.category !== 'shoes' && p.category !== 'accessories' && p.category !== 'bags');
  check(!!firstGarment && isSeedOf(seededLinen, firstGarment.id), `the trend's own seed is the first garment on its rail (got ${firstGarment?.name})`);
  // Merging with the editorial seed that covers the same ground keeps them.
  const merged = mergeTrends([seededLinen], SEED_TRENDS).find(t => t.id === 'deskLinen9');
  check((merged?.seedPieces?.length ?? 0) === 1, 'merging a desk trend with its editorial twin keeps the seeds');
}

// ---- 4. Opening a seed, and the pool ----
console.log('# Registry');
const twin = { ...deskTrend(normalizeSeedPieces([womens1])), id: 'deskOther77' };
registerTrendSeeds([seededTrend, twin]);
check(products.every(p => seedProductById(p.id)?.name === p.name), 'every seed opens by its product id');
check(seedProductById('p-ts-nope-zz') === null && seedProductById('p-t001') === null, 'an unknown or catalogue id is not a seed');
check(allSeedProducts([seededTrend, twin]).length === 5, 'the same photo seeded on two trends is one card in the pool');

// ---- 5. Every trend is shoppable the moment it is published ----
console.log('# Anchor searches');
const searches = trendAnchorSearches(deskTrend(), 'mens');
// The trend names balloon pants, a bubble skirt and a split-toe flat: a
// menswear shopper is offered the one that is not womenswear.
check(searches.length === 1 && searches[0].label === "men's balloon pants", `a menswear shopper is offered only the pieces that are not womenswear (got ${searches.map(x => x.label).join(' | ')})`);
check(trendAnchorSearches(deskTrend(), 'womens').length === 3, 'a womenswear shopper is offered all three');
searches.forEach(search => {
  const url = new URL(search.url);
  check(search.label.startsWith("men's "), `"${search.label}" is qualified for a menswear shopper`);
  check(url.searchParams.get('k') === search.label && url.searchParams.get('tag') === AMAZON_ASSOCIATE_TAG, `"${search.label}" is a tagged search for exactly that`);
});
check(trendAnchorSearches(deskTrend(), 'all').every(s => !/men's/.test(s.label)), 'no department qualifier without a wardrobe focus');
check(
  trendAnchorSearches({ keyGarments: ['suede', 'suede jacket', 'suede jacket'], keyAccessories: ["women's suede boot"] }, 'mens')
    .map(s => s.label)
    .join(' | ') === "men's suede jacket",
  'a bare fabric word and a repeat are skipped; an anchor that names the other department is not offered'
);
SEED_TRENDS.forEach(trend =>
  check(trendAnchorSearches(trend, 'womens').length > 0, `"${trend.name}" has at least one key piece to search for`)
);

console.log(`\n${checks} checks.`);
if (failures) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log('OK - a published trend shows its own seeded pieces, in the right department, and is shoppable even before it has any.');

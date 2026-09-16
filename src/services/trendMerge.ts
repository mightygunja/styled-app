/**
 * Merging the editorial seed trends with what the trend desk publishes.
 *
 * Kept free of Firebase imports so scripts/auditTrendPieces.ts can exercise
 * the exact merge the app performs.
 */

import { FashionTrend, trendTextMatch } from '../models/fashionTrend';
import { MOCK_CATALOG } from '../data/mockProductCatalog';

const catalogById = new Map(MOCK_CATALOG.map(p => [p.id, p]));

/**
 * Of a seed's hand-checked pieces, the ones that genuinely anchor the desk
 * trend they are being lent to. A desk trend named "Retro Sport" can borrow
 * Heritage Sport's retro trainers, but not its track pants unless its own
 * anchors name them - a borrowed rail must be as spot on as a curated one.
 */
function anchoringPieces(desk: FashionTrend, pieces: string[]): string[] {
  return pieces.filter(id => {
    const product = catalogById.get(`p-${id}`);
    if (!product) return false;
    const haystack = [product.name, product.subcategory, product.category, ...(product.styleTags ?? [])].join(' ');
    return trendTextMatch(desk, haystack, product.color) === 'garment';
  });
}

function anchorWords(trend: FashionTrend): string[] {
  return [...trend.keyGarments, ...(trend.keyAccessories || [])].map(w => w.toLowerCase()).filter(Boolean);
}

/**
 * Whether a desk trend covers the same ground as a seed: the same name, or
 * two or more of the desk trend's anchor pieces already named by the seed.
 * Counted on the desk trend's side so a seed with many synonyms cannot
 * "collide" with a single shared word.
 */
function coversSameGround(desk: FashionTrend, seed: FashionTrend): boolean {
  if (desk.name.trim().toLowerCase() === seed.name.trim().toLowerCase()) return true;
  const seedWords = anchorWords(seed);
  const shared = anchorWords(desk).filter(d => seedWords.some(s => s.includes(d) || d.includes(s)));
  return shared.length >= 2;
}

/**
 * Desk trends plus the seeds they do not already cover. A desk trend that
 * overlaps a seed inherits the seed's accessories and hand-checked pieces
 * when it has none of its own, so the editor's naming wins without losing
 * the alignment work.
 */
export function mergeTrends(published: FashionTrend[], seeds: FashionTrend[]): FashionTrend[] {
  const covered = new Set<string>();
  const enriched = published.map(desk => {
    const twin = seeds.find(seed => coversSameGround(desk, seed));
    if (!twin) return desk;
    covered.add(twin.id);
    const withAccessories: FashionTrend = {
      ...desk,
      keyAccessories: desk.keyAccessories?.length ? desk.keyAccessories : twin.keyAccessories,
      regions: desk.regions?.length ? desk.regions : twin.regions,
      reach: desk.reach ?? twin.reach,
    };
    const borrowed = desk.pieces?.length ? desk.pieces : anchoringPieces(withAccessories, twin.pieces ?? []);
    return { ...withAccessories, pieces: borrowed.length ? borrowed : undefined };
  });
  return [...enriched, ...seeds.filter(seed => !covered.has(seed.id))];
}

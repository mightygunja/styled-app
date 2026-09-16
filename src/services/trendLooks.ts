/**
 * The pieces that illustrate a trend - "here is what this actually looks
 * like", as a whole look: a garment, the shoe, the bag or belt or jewellery.
 *
 * Two sources, in order:
 *   1. The trend's hand-checked `pieces` (editorial seeds, and desk trends
 *      that inherited them). These are the spot-on answer and always lead.
 *   2. Keyword scoring over the catalogue, for desk trends with no curated
 *      pieces and to fill remaining slots. A keyGarments / keyAccessories
 *      hit anchors (3); silhouette, colour and archetype each add 1; only
 *      pieces scoring >= 3 qualify - so either a named piece of the trend,
 *      or a silhouette hit corroborated by both palette and archetype. A
 *      bare silhouette word is never enough ("layered" once put a gold
 *      necklace under Sheer Layering).
 *
 * The rail is built by slot so it reads as a look rather than four of the
 * same trouser: at least one garment, one shoe and one bag/accessory when
 * the trend and the catalogue can supply them. Local staples rank first
 * inside a slot when a locale profile is given - the babouche before the
 * loafer in Marrakesh, the loafer before the babouche in Paris.
 */

import { FashionTrend } from '../models/fashionTrend';
import { Product } from '../models/product';
import { BALANCED_CATALOG } from '../data/mockProductCatalog';
import { isLocalStaple, LocaleProfile } from './localeProfile';

export type WardrobeFocus = 'womens' | 'mens' | 'all' | undefined;

type Slot = 'garment' | 'shoes' | 'finish';

const BAG_WORDS = /bag|tote|clutch|backpack|crossbody|satchel|briefcase|messenger|purse|handbag|weekender|duffle|pouch|sling/;

export function slotOf(product: Pick<Product, 'category'>): Slot {
  const c = product.category;
  if (c === 'shoes') return 'shoes';
  if (c === 'accessories' || c === 'bags') return 'finish';
  return 'garment';
}

export function isBagProduct(product: Pick<Product, 'category' | 'subcategory' | 'name'>): boolean {
  if (product.category === 'bags') return true;
  if (product.category !== 'accessories') return false;
  return BAG_WORDS.test(`${product.subcategory || ''} ${product.name}`.toLowerCase());
}

export function inDepartment(product: Product, focus: WardrobeFocus): boolean {
  if (!focus || focus === 'all') return true;
  const department = product.department;
  if (!department || department === 'unisex') return true;
  return focus === 'womens' ? department === 'women' : department === 'men';
}

function productText(product: Product): string {
  return [product.name, product.subcategory, product.category, ...(product.styleTags ?? [])].join(' ').toLowerCase();
}

/** Keyword score of a catalogue piece against a trend; 0 when it does not qualify. */
export function trendPieceScore(trend: FashionTrend, product: Product): number {
  const text = productText(product);
  const color = (product.color ?? '').toLowerCase();
  const anchorHit =
    trend.keyGarments.some(g => text.includes(g)) || (trend.keyAccessories || []).some(a => text.includes(a));
  const silhouetteHit = trend.silhouettes.some(s => text.includes(s));
  const colorHit = !!color && trend.keyColors.some(k => color.includes(k) || k.includes(color));
  const archetypeHit = (product.styleTags ?? []).some(tag => trend.archetypes.includes(tag));
  const score = (anchorHit ? 3 : 0) + (silhouetteHit ? 1 : 0) + (colorHit ? 1 : 0) + (archetypeHit ? 1 : 0);
  return score >= 3 ? score : 0;
}

const byId = new Map(BALANCED_CATALOG.map(p => [p.id, p]));

/**
 * Catalogue pieces for a trend, curated first, then scored, arranged by
 * slot. Returns [] when fewer than two pieces qualify - one lonely
 * thumbnail under a trend reads worse than no rail at all.
 */
export function piecesForTrend(
  trend: FashionTrend,
  focus: WardrobeFocus,
  options: { limit?: number; locale?: LocaleProfile; catalog?: Product[] } = {}
): Product[] {
  const limit = options.limit ?? 5;
  const catalog = options.catalog ?? BALANCED_CATALOG;
  const lookup = options.catalog ? new Map(options.catalog.map(p => [p.id, p])) : byId;

  const curated: Product[] = (trend.pieces ?? [])
    .map(id => lookup.get(id.startsWith('p-') ? id : `p-${id}`))
    .filter((p): p is Product => !!p && inDepartment(p, focus));

  const scored = catalog
    .filter(p => inDepartment(p, focus) && !curated.includes(p))
    .map(product => ({ product, score: trendPieceScore(trend, product) }))
    .filter(e => e.score > 0)
    .sort((a, b) => {
      // Local staples first inside equal scores; then stable catalogue order.
      const la = isLocalStaple(options.locale, productText(a.product)) ? 1 : 0;
      const lb = isLocalStaple(options.locale, productText(b.product)) ? 1 : 0;
      return b.score - a.score || lb - la;
    })
    .map(e => e.product);

  const picks: Product[] = [];
  const have = (slot: Slot) => picks.some(p => slotOf(p) === slot);
  // Without a wardrobe focus both departments qualify, and the catalogue
  // carries the same piece in each ("Pleated Wide-Leg Trousers" for women
  // and for men) - one rail must not show it twice.
  const take = (product: Product) => {
    if (picks.length >= limit || picks.includes(product)) return;
    if (picks.some(p => p.name.toLowerCase() === product.name.toLowerCase())) return;
    picks.push(product);
  };

  // Curated pieces lead. One garment, one shoe and one finishing piece are
  // taken first (each the earliest of its slot in editorial order) so a rail
  // limited to a handful of thumbnails still reads as a whole look; the
  // remaining curated pieces follow in order.
  (['garment', 'shoes', 'finish'] as Slot[]).forEach(slot => {
    const first = curated.find(p => slotOf(p) === slot);
    if (first) take(first);
  });
  curated.forEach(take);

  // Fill each missing slot from the scored pool, garment first so the rail
  // opens on the trend's namesake piece.
  (['garment', 'shoes', 'finish'] as Slot[]).forEach(slot => {
    if (have(slot)) return;
    const candidate = scored.find(p => slotOf(p) === slot);
    if (candidate) take(candidate);
  });

  // Then distinct categories, then anything that qualifies.
  const usedCategories = new Set(picks.map(p => p.category));
  for (const requireNewCategory of [true, false]) {
    for (const product of scored) {
      if (picks.length >= limit) break;
      if (requireNewCategory && usedCategories.has(product.category)) continue;
      take(product);
      usedCategories.add(product.category);
    }
  }

  return picks.length >= 2 ? picks : [];
}

export const trendLooks = { piecesForTrend, trendPieceScore, slotOf, isBagProduct, inDepartment };

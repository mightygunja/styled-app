/**
 * The pieces that illustrate a trend - "here is what this actually looks
 * like", as a whole look: a garment, the shoe, the bag or belt or jewellery.
 *
 * Three sources, in order:
 *   0. Pieces seeded for this very trend on the desk (`seedPieces`, see
 *      trendSeeds.ts). They were chosen for it, so they open the rail.
 *   1. The trend's hand-checked `pieces` (editorial seeds, and desk trends
 *      that inherited them). These are the spot-on answer and lead the rest.
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
import { seedProducts } from './trendSeeds';
import { departmentVisible, otherFocus, wordFitsFocus } from './departmentFit';

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
  return departmentVisible(product.department, focus);
}

function productText(product: Product): string {
  // Fields are kept apart: joined by a space, "Pink Dress Shirt" + "dress
  // shirt" read as "...shirt dress..." and put a man's shirt on the
  // shirt-dress rail.
  return [product.name, product.subcategory, product.category, ...(product.styleTags ?? [])].join(' | ').toLowerCase();
}

/** Keyword score of a catalogue piece against a trend; 0 when it does not qualify. */
export function trendPieceScore(trend: FashionTrend, product: Product): number {
  const text = productText(product);
  const color = (product.color ?? '').toLowerCase();
  const hits = anchorsOf(trend).filter(anchor => text.includes(anchor));
  // A piece qualifies only by carrying one of the trend's own garments or
  // accessories. Silhouette + colour + archetype used to add up to a pass on
  // their own, which put a navy linen shirt on the barn-jacket rail.
  if (hits.length === 0) return 0;
  const silhouetteHit = trend.silhouettes.some(s => text.includes(s));
  const colorHit = !!color && trend.keyColors.some(k => color.includes(k) || k.includes(color));
  const archetypeHit = (product.styleTags ?? []).some(tag => trend.archetypes.includes(tag));
  // How squarely it sits in the trend: a piece named by one of the trend's
  // exact phrases ("ankara print dress") outranks one that only shares a
  // general word with it ("loafer"), and one that carries several of its
  // anchors outranks one that carries a single one.
  const specific = hits.some(anchor => anchor.includes(' ')) ? 1 : 0;
  const breadth = Math.min(2, new Set(hits).size - 1);
  return 3 + specific + breadth + (silhouetteHit ? 1 : 0) + (colorHit ? 1 : 0) + (archetypeHit ? 1 : 0);
}

/** The noun a piece is - "loafers", "tote", "scarf" - so a rail is not six of one thing. */
function kindOf(product: Product): string {
  const words = product.name.toLowerCase().split(/\s+/);
  return words[words.length - 1] || product.category;
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

  const seeded = seedProducts(trend).filter(p => inDepartment(p, focus));
  // The hand-ordered pieces open the rail but do not fill it: beyond the
  // first few, the trend's other anchored pieces get their turn, so a longer
  // rail shows the breadth of the trend rather than one editor's shortlist.
  const handPicked = (trend.pieces ?? [])
    .map(id => lookup.get(id.startsWith('p-') ? id : `p-${id}`))
    .filter((p): p is Product => !!p && inDepartment(p, focus))
    .slice(0, Math.max(4, Math.ceil(limit * 0.5)));
  const curated: Product[] = [...seeded, ...handPicked];

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

  // Then the best of the rest, kept in proportion. A trend about garments
  // shows mostly garments: its shoes and finishing pieces are each held to
  // about a third of the rail, and no more than two of the same thing (two
  // loafers, not six). A shoe- or bag-led trend has no garments to protect,
  // so only the sameness rule applies. If that leaves room, the rules relax.
  const garmentLed = trend.keyGarments.length > 0;
  const slotCap = Math.max(2, Math.ceil(limit * 0.3));
  const kindCap = garmentLed ? 2 : 3;
  for (const strict of [true, false]) {
    for (const product of scored) {
      if (picks.length >= limit) break;
      if (strict) {
        const slot = slotOf(product);
        if (garmentLed && slot !== 'garment' && picks.filter(p => slotOf(p) === slot).length >= slotCap) continue;
        if (slot !== 'garment' || !garmentLed) {
          if (picks.filter(p => kindOf(p) === kindOf(product)).length >= kindCap) continue;
        }
      }
      take(product);
    }
  }

  return picks.length >= 2 ? picks : [];
}

function anchorsOf(trend: FashionTrend): string[] {
  return [...trend.keyGarments, ...(trend.keyAccessories || [])].map(w => w.toLowerCase().trim()).filter(Boolean);
}

/**
 * Whether a trend belongs in front of this wardrobe focus at all.
 *
 * "Boho, sharpened" is maxi skirts and peasant blouses; "Sheer layering" is
 * sheer blouses and slingbacks. Showing either to a menswear account - with
 * a "find the piece" button under it - is womenswear on a man's screen, in
 * words instead of photos. A trend is held back from a department when:
 *   - every piece it names belongs to the other department, or
 *   - its garments are all the other department's and the catalogue cannot
 *     show a single piece of it in this one, or
 *   - the catalogue can illustrate it for the other department only.
 * 'all' sees every trend. An account that has not chosen sees only the
 * trends that fit both departments.
 */
export function trendFitsFocus(
  trend: FashionTrend,
  focus: WardrobeFocus,
  options: { catalog?: Product[] } = {}
): boolean {
  if (focus === 'all') return true;
  // Not answered yet: only trends that belong to both departments. A trend
  // that is one department's alone is exactly what must not be guessed at.
  if (focus === undefined) {
    return trendFitsFocus(trend, 'womens', options) && trendFitsFocus(trend, 'mens', options);
  }
  const other = otherFocus(focus);
  if (!other) return true;

  const anchors = anchorsOf(trend);
  if (anchors.length > 0 && !anchors.some(a => wordFitsFocus(a, focus))) return false;

  const mine = piecesForTrend(trend, focus, { limit: 5, catalog: options.catalog });
  const garments = trend.keyGarments.map(g => g.toLowerCase());
  if (garments.length > 0 && !garments.some(g => wordFitsFocus(g, focus)) && mine.length === 0) return false;

  const theirs = piecesForTrend(trend, other, { limit: 5, catalog: options.catalog });
  if (mine.length === 0 && theirs.length > 0) return false;

  // A trend about garments has to show a garment. If the only pieces this
  // department gets are the shoes (three loafers under "The long, fluid
  // layer") while the other department gets the garments, it is the other
  // department's trend.
  const hasGarment = (rail: Product[]) => rail.some(p => slotOf(p) === 'garment');
  if (garments.length > 0 && !hasGarment(mine) && hasGarment(theirs)) return false;

  return true;
}

/** How many photographed pieces a trend needs before it is shown to anyone. */
export const MIN_ILLUSTRATED_PIECES = 3;

/**
 * Whether the app can actually show this trend to this reader: at least
 * three photographed, shoppable pieces in their department. An account that
 * has not chosen a department is judged against the whole catalogue (what
 * it then sees is cut to cross-department pieces by the rail itself).
 */
export function trendIllustrated(trend: FashionTrend, focus: WardrobeFocus, options: { catalog?: Product[] } = {}): boolean {
  return (
    piecesForTrend(trend, focus ?? 'all', { limit: MIN_ILLUSTRATED_PIECES, catalog: options.catalog }).length >=
    MIN_ILLUSTRATED_PIECES
  );
}

/**
 * Prose with every sentence that names the other department's garments
 * removed. Sentences are kept whole - nothing is rewritten - so what is left
 * always reads as it was written.
 */
export function proseForFocus(text: string, focus: WardrobeFocus): string {
  if (!text || focus === 'all') return text || '';
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(sentence => wordFitsFocus(sentence, focus))
    .join(' ')
    .trim();
}

/**
 * A trend as this wardrobe focus should read it: its own menswear wording
 * where it has some, otherwise the default text minus any sentence about
 * the other department's pieces, and a way in that fits.
 */
export function trendForFocus(trend: FashionTrend, focus: WardrobeFocus): FashionTrend {
  if (focus === 'all') return trend;
  const own = focus === 'mens' ? trend.mens : undefined;
  const summary = own?.summary ?? proseForFocus(trend.summary, focus);
  const stylingNote = own?.stylingNote ?? proseForFocus(trend.stylingNote, focus);
  const entryPiece = own?.entryPiece ?? entryPieceFor(trend, focus);
  if (summary === trend.summary && stylingNote === trend.stylingNote && entryPiece === trend.entryPiece) return trend;
  return { ...trend, summary, stylingNote, entryPiece };
}

/**
 * The trends this wardrobe focus should see, in their original order, each
 * worded for it.
 */
export function trendsForFocus(trends: FashionTrend[], focus: WardrobeFocus): FashionTrend[] {
  return trends
    .filter(trend => trendFitsFocus(trend, focus))
    .filter(trend => trendIllustrated(trend, focus))
    .map(trend => trendForFocus(trend, focus))
    // A trend that cannot be described without naming the other department's
    // pieces has nothing left to say to this reader - it is held back rather
    // than shown as a bare title. (This is mostly an account that has not
    // chosen a department yet; it sees the full report once it has.)
    .filter(trend => trend.summary.trim().length > 0);
}

/**
 * The "lowest-commitment way in", worded for this wardrobe focus.
 *
 * A trend's entry piece is written once, and several name a womenswear
 * piece ("a pair of ballet flats or Mary Janes"). For a focus it does not
 * fit, this keeps the half of the sentence that does ("..., or a western
 * belt over what you already own"), else names the first piece the trend's
 * own rail shows in that department ("penny loafers"), else a fitting
 * anchor. Empty when nothing fits - callers then show no suggestion at all
 * rather than the wrong one.
 */
export function entryPieceFor(trend: FashionTrend, focus: WardrobeFocus): string {
  const entry = (trend.entryPiece || '').trim();
  if (!entry || wordFitsFocus(entry, focus)) return entry;

  const halves = entry.split(/,\s+or\s+/).map(part => part.trim()).filter(Boolean);
  if (halves.length > 1) {
    const fitting = halves.find(part => wordFitsFocus(part, focus));
    if (fitting) return fitting;
  }

  const rail = piecesForTrend(trend, focus, { limit: 4 });
  const own = rail.find(p => p.department && p.department !== 'unisex') ?? rail[0];
  if (own && wordFitsFocus(own.name, focus)) return own.name.toLowerCase();

  return anchorsOf(trend).find(a => a.includes(' ') && wordFitsFocus(a, focus)) ?? '';
}

export const trendLooks = {
  piecesForTrend,
  trendPieceScore,
  slotOf,
  isBagProduct,
  inDepartment,
  trendFitsFocus,
  trendIllustrated,
  trendsForFocus,
  trendForFocus,
  proseForFocus,
  entryPieceFor,
};

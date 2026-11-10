/**
 * Trend seeds - the pieces that arrive WITH a trend.
 *
 * The curated catalogue ships inside the app, so a trend published on the
 * desk this morning could only ever be illustrated by pieces that were
 * already there; a direction the catalogue did not happen to carry opened an
 * empty shop. Seeds close that gap: the editor attaches photo-checked pieces
 * to the trend itself (Trend Desk > "Seed a piece"), they are stored on the
 * trend document, and every client turns them into shop cards the moment
 * the trend is read - web and iOS alike, no release.
 *
 * Pure on purpose (no Firebase, no React Native): scripts/auditTrendSeeds.ts
 * exercises exactly what the app runs.
 *
 * Guard rails, all enforced here as well as on the server:
 *   - the photo is an Unsplash photo id, never a free URL;
 *   - a piece must carry one of its trend's own anchors, or it is dropped -
 *     a seed that does not correspond to the trend is not a seed;
 *   - department is explicit, so a women's rail never shows a men's piece.
 */

import { FashionTrend, TrendSeedPiece } from '../models/fashionTrend';
import { Product } from '../models/product';
import { amazonSearchPhrase, amazonSearchUrl } from './amazonSearch';
import { searchQualifier, wordFitsFocus } from './departmentFit';

export const SEED_CATEGORIES: TrendSeedPiece['category'][] = [
  'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'bags',
];
export const SEED_DEPARTMENTS: TrendSeedPiece['department'][] = ['women', 'men', 'unisex'];
export const MAX_SEED_PIECES = 12;

const PHOTO_ID = /^\d{10,16}-[0-9a-f]{8,16}$/;
const PHOTO_URL = /^https:\/\/images\.unsplash\.com\/photo-(\d{10,16}-[0-9a-f]{8,16})(?:[?/#]|$)/;

/** The Unsplash photo id inside an image address, or null when it is anything else. */
export function seedPhotoId(input: string): string | null {
  const text = (input || '').trim();
  if (PHOTO_ID.test(text)) return text;
  return PHOTO_URL.exec(text)?.[1] ?? null;
}

export function seedPhotoUrl(photoId: string, width: number = 600): string {
  return `https://images.unsplash.com/photo-${photoId}?w=${width}`;
}

function anchorsOf(trend: Pick<FashionTrend, 'keyGarments' | 'keyAccessories'>): string[] {
  return [...trend.keyGarments, ...(trend.keyAccessories || [])]
    .map(word => word.toLowerCase().trim())
    .filter(Boolean);
}

/** The trend anchor a piece carries (in its name, subcategory or tags), or null. */
export function seedAnchor(
  trend: Pick<FashionTrend, 'keyGarments' | 'keyAccessories'>,
  piece: Pick<TrendSeedPiece, 'name' | 'subcategory' | 'styleTags'>
): string | null {
  const text = [piece.name, piece.subcategory, ...(piece.styleTags || [])].join(' ').toLowerCase();
  return anchorsOf(trend).find(anchor => text.includes(anchor)) ?? null;
}

const clean = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/**
 * Whatever a trend document holds under `seedPieces`, reduced to the pieces
 * that are safe and complete enough to show. Never throws: a malformed entry
 * is skipped, not allowed to blank a trend.
 */
export function normalizeSeedPieces(raw: unknown): TrendSeedPiece[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const pieces: TrendSeedPiece[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const photoId = seedPhotoId(String(e.photoId ?? ''));
    const name = clean(e.name, 60);
    const id = clean(e.id, 24).replace(/[^a-zA-Z0-9]/g, '');
    const category = e.category as TrendSeedPiece['category'];
    const department = e.department as TrendSeedPiece['department'];
    if (!photoId || !name || !id || seen.has(id)) continue;
    if (!SEED_CATEGORIES.includes(category) || !SEED_DEPARTMENTS.includes(department)) continue;
    const price = Number(e.price);
    seen.add(id);
    pieces.push({
      id,
      name,
      color: clean(e.color, 30).toLowerCase(),
      category,
      subcategory: clean(e.subcategory, 40).toLowerCase(),
      department,
      photoId,
      styleTags: (Array.isArray(e.styleTags) ? e.styleTags : [])
        .map(tag => clean(tag, 24).toLowerCase())
        .filter(Boolean)
        .slice(0, 5),
      price: Number.isFinite(price) && price > 0 ? Math.round(price) : 0,
      addedAt: clean(e.addedAt, 40) || undefined,
    });
    if (pieces.length >= MAX_SEED_PIECES) break;
  }
  return pieces;
}

const SEED_ID_PREFIX = 'p-ts-';

export function seedProductId(trendId: string, pieceId: string): string {
  return `${SEED_ID_PREFIX}${trendId}-${pieceId}`;
}

export function isSeedProductId(productId: string): boolean {
  return (productId || '').startsWith(SEED_ID_PREFIX);
}

/** Whether a shop product is one of this trend's own seeds. */
export function isSeedOf(trend: Pick<FashionTrend, 'id'>, productId: string): boolean {
  return (productId || '').startsWith(`${SEED_ID_PREFIX}${trend.id}-`);
}

/**
 * A trend's seeds as shop products. Pieces that carry none of the trend's
 * anchors are left out - the trend may have been edited since they were
 * seeded, and a rail must stay as spot on as a curated one.
 */
export function seedProducts(trend: FashionTrend): Product[] {
  return (trend.seedPieces ?? [])
    .filter(piece => seedAnchor(trend, piece) !== null)
    .map(piece => {
      const product: Product = {
        id: seedProductId(trend.id, piece.id),
        name: piece.name,
        // Seeds are a kind of piece, not one label's SKU; the card says so
        // instead of naming a brand the photo cannot vouch for.
        brand: 'Trend pick',
        retailer: 'Amazon',
        category: piece.category,
        subcategory: piece.subcategory || undefined,
        price: piece.price,
        currency: 'USD',
        imageUrl: seedPhotoUrl(piece.photoId),
        color: piece.color || undefined,
        styleTags: piece.styleTags,
        sourceUrl: '',
        inStock: true,
        department: piece.department,
      };
      product.sourceUrl = amazonSearchUrl(amazonSearchPhrase(product));
      return product;
    });
}

/** Every seed across a trend pool, first trend first, one card per photo. */
export function allSeedProducts(trends: FashionTrend[]): Product[] {
  const photos = new Set<string>();
  const out: Product[] = [];
  trends.forEach(trend =>
    seedProducts(trend).forEach(product => {
      if (photos.has(product.imageUrl)) return;
      photos.add(product.imageUrl);
      out.push(product);
    })
  );
  return out;
}

// ---- Session registry: lets Product Detail open a seed by id. ----

let registry = new Map<string, Product>();

/** Called whenever the trend pool is read, so seed ids resolve app-wide. */
export function registerTrendSeeds(trends: FashionTrend[]): void {
  registry = new Map(allSeedProducts(trends).map(product => [product.id, product]));
}

export function seedProductById(productId: string): Product | null {
  return registry.get(productId) ?? null;
}

// ---- Anchor searches: a trend is always shoppable, seeded or not. ----

/**
 * Anchor words that describe a piece without being one. They stay in the
 * trend (they are how pieces are matched) and are left out of the searches.
 */
const NOT_A_PIECE = new Set([
  'ankara', 'boho', 'burgundy', 'cashmere', 'crochet', 'embroidered', 'fringe', 'handloom', 'linen',
  'longline', 'merino', 'organza', 'oxblood', 'pointed', 'prairie', 'printed', 'raffia', 'slouchy',
  'suede', 'wide-leg', 'zip-up', 'oversized', 'cropped', 'tailored', 'sheer', 'quilted', 'pleated',
]);

export interface TrendAnchorSearch {
  /** What the chip says: "men's suede bomber". */
  label: string;
  url: string;
}

/**
 * A tagged Amazon search for each piece the trend itself names, qualified by
 * the shopper's department. This is what makes a trend published a minute
 * ago shoppable before anyone has seeded it: its own key pieces, searched.
 */
export function trendAnchorSearches(
  trend: Pick<FashionTrend, 'keyGarments' | 'keyAccessories'>,
  focus: 'womens' | 'mens' | 'all' | undefined,
  limit: number = 6
): TrendAnchorSearch[] {
  const qualifier = searchQualifier(focus);
  const seen = new Set<string>();
  const out: TrendAnchorSearch[] = [];
  // Garments and accessories alternate, so six chips still read as a look.
  const garments = trend.keyGarments.map(w => w.toLowerCase().trim()).filter(Boolean);
  const accessories = (trend.keyAccessories || []).map(w => w.toLowerCase().trim()).filter(Boolean);
  const ordered: string[] = [];
  for (let i = 0; i < Math.max(garments.length, accessories.length); i += 1) {
    if (garments[i]) ordered.push(garments[i]);
    if (accessories[i]) ordered.push(accessories[i]);
  }
  for (const anchor of ordered) {
    // A one-word cut, fabric or colour ("linen", "pointed", "oxblood") matches
    // pieces well but is not a thing to search for.
    if (anchor.length < 4 || seen.has(anchor) || NOT_A_PIECE.has(anchor)) continue;
    // "men's pleated skirt" is not a search anyone asked for.
    if (!wordFitsFocus(anchor, focus)) continue;
    // Skip an anchor a longer one already covers ("suede" under "suede jacket").
    if (ordered.some(other => other !== anchor && other.includes(anchor) && other.length > anchor.length)) continue;
    seen.add(anchor);
    const alreadyQualified = /\b(wo)?men'?s\b/.test(anchor);
    const label = `${alreadyQualified ? '' : qualifier}${anchor}`;
    out.push({ label, url: amazonSearchUrl(label) });
    if (out.length >= limit) break;
  }
  return out;
}

export const trendSeeds = {
  seedPhotoId,
  seedPhotoUrl,
  seedAnchor,
  normalizeSeedPieces,
  seedProducts,
  allSeedProducts,
  registerTrendSeeds,
  seedProductById,
  isSeedProductId,
  isSeedOf,
  trendAnchorSearches,
};

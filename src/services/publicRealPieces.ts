/**
 * Real products on the logged-out pages.
 *
 * A guide's rail is hand-picked: each curated piece is there because it
 * illustrates the guide ("the pieces a capsule is built on": a trench coat,
 * straight jeans, a white tee...). The piece is the point, not the stock
 * photo that stands for it. So each one is offered a real product OF THAT
 * SAME PIECE from the live feed, in the rail's own department:
 *
 *   - the piece's phrase is what the catalogue files it as ("trench coat",
 *     "penny loafers") - the curator's own words, never invented here;
 *   - a real product takes the slot only if it IS the piece (carriesPiece:
 *     every word of the phrase is in the product's name, shelf or colour);
 *   - no product is used twice on a rail;
 *   - a slot with no such product keeps its curated piece. The rail never
 *     loses a piece or changes its order.
 *
 * The public trend page uses the same pieces a signed-in member's trend
 * rail does (trendAnchors + composeLiveRail in trendLiveRail.ts).
 *
 * Pure - no Firebase, no React Native - so scripts/buildPublicPhrases.ts and
 * scripts/auditChannel3Shelf.ts run the real thing.
 */

import { Product } from '../models/product';
import { carriesPiece } from './trendLiveRail';

/** The phrase a curated piece is searched under: what the catalogue files it as. Null when it is filed as nothing usable. */
export function piecePhrase(product: Pick<Product, 'subcategory'>): string | null {
  const phrase = String(product.subcategory || '')
    .toLowerCase()
    .replace(/[^a-z0-9 '&-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return phrase.length >= 3 ? phrase : null;
}

/** Every phrase a rail of curated pieces needs, once each, in rail order. */
export function railPhrases(curated: Product[]): string[] {
  return Array.from(new Set(curated.map(piecePhrase).filter((p): p is string => !!p)));
}

/**
 * The rail with each curated piece replaced by a real product of the same
 * piece, where the feed has one. `found` is the live feed's answer by phrase.
 */
export function withRealPieces(curated: Product[], found: Record<string, Product[]>): Product[] {
  const used = new Set<string>();
  return curated.map(piece => {
    const phrase = piecePhrase(piece);
    if (!phrase) return piece;
    const real = (found[phrase] || []).find(product => !used.has(product.id) && carriesPiece(product, phrase));
    if (!real) return piece;
    used.add(real.id);
    return real;
  });
}

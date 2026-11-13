/**
 * A trend's rail, from real products.
 *
 * Each trend names its key pieces ("track jacket", "retro sneaker"). For
 * each piece the live feed returns products in the member's department
 * (affiliateNetwork.liveTrendPieces). This module decides which of them go
 * on the trend's rail and in what order:
 *
 *   - a product is on the rail for a piece only if it IS that piece: every
 *     word of the piece appears in the product's own name or shelf name. A
 *     feed's "similar items" are not the trend.
 *   - within a piece, the caller's ranking (the member's personal match) is
 *     kept;
 *   - the pieces are dealt out in turn, so the rail reads as the look - a
 *     jacket, a shoe, a jacket, a shoe - not as ten jackets;
 *   - the same product, or the same name from the same brand, appears once.
 *
 * Pure - no Firebase, no React Native - so scripts/auditChannel3Shelf.ts runs
 * the real thing.
 */

import { Product } from '../models/product';

const words = (text: string) =>
  String(text || '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** "boots" and "boot", "jackets" and "jacket" are the same word here. */
const stem = (word: string) => (word.length > 3 ? word.replace(/(?:es|s)$/, '') : word);

/**
 * Whether a product is the piece: every word of the piece is in its name,
 * its shelf name or its stated colour ("burgundy sweater" is a sweater whose
 * colour is burgundy, wherever the feed says so).
 */
export function carriesPiece(product: Pick<Product, 'name' | 'subcategory' | 'color'>, piece: string): boolean {
  const have = new Set(words(`${product.name} ${product.subcategory || ''} ${product.color || ''}`).map(stem));
  const need = words(piece).map(stem);
  return need.length > 0 && need.every(word => have.has(word));
}

/**
 * The rail. `perPiece` holds, for each of the trend's pieces in order, the
 * live products found for it, already ranked for the member.
 */
export function composeLiveRail(perPiece: Array<{ piece: string; products: Product[] }>, limit: number): Product[] {
  const lists = perPiece.map(entry => entry.products.filter(product => carriesPiece(product, entry.piece)));
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const rail: Product[] = [];
  const longest = Math.max(0, ...lists.map(list => list.length));
  for (let i = 0; i < longest && rail.length < limit; i += 1) {
    for (const list of lists) {
      const product = list[i];
      if (!product || rail.length >= limit) continue;
      const nameKey = `${(product.brand || '').toLowerCase()}|${product.name.toLowerCase()}`;
      if (seenIds.has(product.id) || seenNames.has(nameKey)) continue;
      seenIds.add(product.id);
      seenNames.add(nameKey);
      rail.push(product);
    }
  }
  return rail;
}

/** Live pieces a rail needs before the curated stand-ins are left off it. */
export const LIVE_RAIL_ENOUGH = 3;

/**
 * What the trend card shows: the live rail when it has enough real pieces to
 * stand on its own, otherwise the real pieces first and curated pieces after.
 */
export function mergeRail(live: Product[], curated: Product[], limit: number): Product[] {
  if (live.length >= LIVE_RAIL_ENOUGH) return live.slice(0, limit);
  return [...live, ...curated].slice(0, limit);
}

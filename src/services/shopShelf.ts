/**
 * Real products before stand-ins.
 *
 * The curated catalogue is hand-written: each piece has a representative
 * stock photo, a typical price and a link to a search. It exists so the Shop
 * is never empty. A live feed gives the real thing - the retailer's own
 * photo, today's price, a link to that exact product - and once enough of
 * those are on the page, a stand-in beside them is just a worse card.
 *
 * The rule, per category, on the list the shopper is about to see:
 *
 *   - a category with at least REAL_ENOUGH real products shows only real
 *     products;
 *   - a category with fewer keeps its curated pieces, so no category goes
 *     empty because a feed was thin, slow or switched off.
 *
 * "Real" is any card that shows the actual product: live listings, and the
 * catalogue's own partner pieces that carry the merchant's product photo.
 * Order is never changed, only stand-ins removed.
 *
 * Pure - no Firebase, no React Native - so scripts/auditChannel3Shelf.ts runs
 * the real thing.
 */

import { Product } from '../models/product';

/** Real products a category needs before its stand-ins are dropped. */
export const REAL_ENOUGH = 6;

/**
 * True for a curated piece shown with a representative stock photo. Every
 * such photo in the catalogue and in trend seeds is served from Unsplash;
 * partner pieces and live listings are served from the merchant.
 */
export function isStandIn(product: Product): boolean {
  return /^https:\/\/images\.unsplash\.com\//i.test(product.imageUrl || '');
}

/**
 * The list with stand-ins removed from every category that has enough real
 * products. `standInsLeft` tells the caller whether any stand-in is still on
 * the page (the notice above the grid depends on it).
 */
export function preferRealProducts<T>(
  items: T[],
  productOf: (item: T) => Product,
  enough: number = REAL_ENOUGH
): { items: T[]; standInsLeft: boolean } {
  const real = new Map<string, number>();
  items.forEach(item => {
    const product = productOf(item);
    if (!isStandIn(product)) real.set(product.category, (real.get(product.category) || 0) + 1);
  });
  const kept = items.filter(item => {
    const product = productOf(item);
    return !isStandIn(product) || (real.get(product.category) || 0) < enough;
  });
  return { items: kept, standInsLeft: kept.some(item => isStandIn(productOf(item))) };
}

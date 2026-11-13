/**
 * Real products before stand-ins.
 *
 * The curated catalogue is hand-written: each piece has a representative
 * stock photo, a typical price and a link to an Amazon search. It exists so
 * the Shop is never empty. A live feed gives the real thing - the retailer's
 * own photo, today's price, a link to that exact product - and once enough
 * of those are on the page, a rack of stand-ins beside them is just a rack
 * of worse cards.
 *
 * The rule, per category, on the list the shopper is about to see:
 *
 *   - a category with at least REAL_ENOUGH real products keeps only its
 *     STAND_INS_KEPT best-ranked curated pieces and drops the rest;
 *   - a category with fewer keeps all its curated pieces, where they were,
 *     so no category goes empty because a feed was thin, slow or off.
 *
 * Why a few are kept (the owner's call, 2026-11-13): the curated pieces are
 * the Shop's only Amazon links, and an Amazon Associates account has to keep
 * making sales to stay open. So every category keeps a few of them.
 *
 * Where the kept ones go: curated pieces carry hand-written style words and
 * so out-rank most live products; left where they ranked, the kept few from
 * six categories filled the whole first screen (seen on real shelves). They
 * are dealt back in one at a time, after every STAND_IN_EVERY other cards,
 * so real products lead and the Amazon pieces sit among them.
 *
 * "Real" is any card that shows the actual product: live listings, and the
 * catalogue's own partner pieces that carry the merchant's product photo.
 * Real products are never removed and never reordered among themselves.
 *
 * Pure - no Firebase, no React Native - so scripts/auditChannel3Shelf.ts runs
 * the real thing.
 */

import { Product } from '../models/product';

/** Real products a category needs before its stand-ins are thinned. */
export const REAL_ENOUGH = 6;

/** Curated (Amazon) pieces every category keeps once it is thinned: its best-ranked ones. */
export const STAND_INS_KEPT = 3;

/** A kept curated piece follows every this-many other cards. */
export const STAND_IN_EVERY = 5;

/**
 * True for a curated piece shown with a representative stock photo. Every
 * such photo in the catalogue and in trend seeds is served from Unsplash;
 * partner pieces and live listings are served from the merchant.
 */
export function isStandIn(product: Product): boolean {
  return /^https:\/\/images\.unsplash\.com\//i.test(product.imageUrl || '');
}

/**
 * The list with each well-stocked category's stand-ins thinned to its first
 * `keep` (the list arrives ranked, so those are its best) and dealt back in
 * among the other cards. `standInsLeft` tells the caller whether any
 * stand-in is still on the page (the notice above the grid depends on it).
 */
export function preferRealProducts<T>(
  items: T[],
  productOf: (item: T) => Product,
  options: {
    enough?: number;
    keep?: number;
    /**
     * False when the shopper chose the order (price, discount): the kept
     * pieces then stay exactly where that order put them.
     */
    spread?: boolean;
  } = {}
): { items: T[]; standInsLeft: boolean } {
  const enough = options.enough ?? REAL_ENOUGH;
  const keep = options.keep ?? STAND_INS_KEPT;
  const real = new Map<string, number>();
  items.forEach(item => {
    const product = productOf(item);
    if (!isStandIn(product)) real.set(product.category, (real.get(product.category) || 0) + 1);
  });
  const thinned = (product: Product) => isStandIn(product) && (real.get(product.category) || 0) >= enough;

  // The kept few from thinned categories, in ranked order...
  const keptSoFar = new Map<string, number>();
  const dealt: T[] = [];
  items.forEach(item => {
    const product = productOf(item);
    if (!thinned(product)) return;
    const already = keptSoFar.get(product.category) || 0;
    if (already >= keep) return;
    keptSoFar.set(product.category, already + 1);
    dealt.push(item);
  });

  if (options.spread === false) {
    const keptSet = new Set(dealt);
    const inPlace = items.filter(item => !thinned(productOf(item)) || keptSet.has(item));
    return { items: inPlace, standInsLeft: inPlace.some(item => isStandIn(productOf(item))) };
  }

  // ...dealt back in, one after every STAND_IN_EVERY other cards.
  const out: T[] = [];
  let sinceLast = 0;
  items.forEach(item => {
    if (thinned(productOf(item))) return;
    out.push(item);
    sinceLast += 1;
    if (sinceLast >= STAND_IN_EVERY && dealt.length > 0) {
      out.push(dealt.shift() as T);
      sinceLast = 0;
    }
  });
  out.push(...dealt);

  return { items: out, standInsLeft: out.some(item => isStandIn(productOf(item))) };
}

/**
 * The pieces Home's starter looks are composed from.
 *
 * A new member owns nothing in the app yet, so their first looks are
 * composed from the shop. Those looks are the first thing they see, and
 * every piece in one is a picture they will judge the app by - so the pool
 * is real products wherever the live feed has them, and the curated
 * stand-ins (stock photos) only where it does not.
 *
 * Given the candidates in ranked order (best match for this member first):
 *
 *   - per category, stand-ins are dropped once the category has enough real
 *     products (shopShelf.ts; none are kept here - a look is not a shelf);
 *   - a real product whose colour is known goes ahead of one whose colour is
 *     not: the outfit engine composes by colour, and a piece it cannot place
 *     is a wasted slot;
 *   - the best forty make the core, topped up so there are always tops,
 *     bottoms, shoes, bags and accessories to finish a look with.
 *
 * Pure - no Firebase, no React Native - so scripts/auditChannel3Shelf.ts runs
 * the real thing.
 */

import { Product } from '../models/product';
import { isStandIn, preferRealProducts } from './shopShelf';

export const STARTER_CORE = 40;

/** How many of each kind the pool must hold for the engine to finish looks. */
const MINIMUMS: Array<[string, number]> = [
  ['tops', 8],
  ['bottoms', 6],
  ['shoes', 4],
  ['bags', 3],
  ['accessories', 3],
];

export function starterPool(
  ranked: Product[],
  isBag: (product: Product) => boolean,
  options: { preferReal?: boolean } = {}
): Product[] {
  const candidates =
    options.preferReal === false ? ranked : preferRealProducts(ranked, p => p, { keep: 0, spread: false }).items;
  // Stand-ins always state a colour; among real products, known colour first.
  const placeable = (product: Product) => isStandIn(product) || !!product.color;
  const ordered = [...candidates.filter(placeable), ...candidates.filter(p => !placeable(p))];

  const kind = (product: Product): string => {
    if (product.category === 'accessories' || (product.category as string) === 'bags') {
      return isBag(product) ? 'bags' : 'accessories';
    }
    return product.category;
  };
  const core = ordered.slice(0, STARTER_CORE);
  MINIMUMS.forEach(([wanted, minimum]) => {
    const have = core.filter(product => kind(product) === wanted).length;
    if (have >= minimum) return;
    ordered
      .filter(product => !core.includes(product) && kind(product) === wanted)
      .slice(0, minimum - have)
      .forEach(product => core.push(product));
  });
  return core;
}

/** Whether any piece of the pool is a stock-photo stand-in. */
export function poolHasStandIns(pool: Product[]): boolean {
  return pool.some(isStandIn);
}

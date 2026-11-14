/**
 * The mix of prices a member wants to be shown.
 *
 * The owner's call (2026-11-13): ask what mix of prices suits someone and
 * show products in that mix. Until then price was only guessed from what a
 * closet's pieces cost - and a new member has no closet - so Shop led with
 * whatever matched on style, and the retailers' ranges run expensive: half
 * the womenswear dresses on the first page were over $500.
 *
 * How it works:
 *
 *   - every product is in one of three bands for its category - everyday,
 *     mid-range, investment (PRICE_TIERS; $60 is a mid-range top and an
 *     everyday coat, so the bands are per category);
 *   - a mix is how many of every twenty products shown come from each band
 *     (MIX_SHARES);
 *   - arrangeByPriceMix deals a ranked list out in those proportions. Inside
 *     a band the order it arrived in - best match first - is kept.
 *
 * It is an ORDER, never a filter. Nothing is hidden: when a band runs out
 * the others carry on, and a shopper who sorts by price gets exactly that.
 * A member who has not answered, or answered "no preference", sees the list
 * exactly as it was ranked.
 *
 * The server stocks every shelf a third from each band so that there is
 * something in each to show (SHELF_PRICE_BANDS in functions/src/channel3.ts,
 * the same numbers as PRICE_TIERS - the audit fails if they differ).
 *
 * Pure - no Firebase, no React Native - so scripts/auditPriceMix.ts runs the
 * real thing.
 */

import { Product } from '../models/product';

export type PriceTier = 'low' | 'mid' | 'high';
export const PRICE_TIER_ORDER: PriceTier[] = ['low', 'mid', 'high'];

/** 'any' is an answer ("no preference"); absent means never asked. */
export type PriceMix = 'affordable' | 'balanced' | 'elevated' | 'designer' | 'any';

/** Dollars. Everyday is up to `low`; investment is over `high`. */
export const PRICE_TIERS: Record<string, { low: number; high: number }> = {
  tops: { low: 60, high: 160 },
  bottoms: { low: 80, high: 200 },
  dresses: { low: 100, high: 280 },
  outerwear: { low: 150, high: 400 },
  shoes: { low: 100, high: 280 },
  accessories: { low: 80, high: 250 },
};
/** A category with no bands of its own (bags are filed under accessories). */
const OTHER_TIERS = PRICE_TIERS.accessories;

export const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  low: 'everyday',
  mid: 'mid-range',
  high: 'investment',
};

/** Of every twenty products shown: everyday, mid-range, investment. */
export const MIX_SHARES: Record<Exclude<PriceMix, 'any'>, Record<PriceTier, number>> = {
  affordable: { low: 14, mid: 5, high: 1 },
  balanced: { low: 8, mid: 8, high: 4 },
  elevated: { low: 3, mid: 9, high: 8 },
  designer: { low: 1, mid: 5, high: 14 },
};

export const PRICE_MIX_OPTIONS: Array<{ key: PriceMix; label: string; line: string }> = [
  { key: 'affordable', label: 'Mostly affordable', line: 'Everyday prices lead; a splurge only now and then' },
  { key: 'balanced', label: 'High and low', line: 'Everyday and mid-range in equal part, with some investment pieces' },
  { key: 'elevated', label: 'Mid-range and up', line: 'Mid-range and investment pieces lead; a few everyday buys' },
  { key: 'designer', label: 'Mostly investment', line: 'Designer and investment pieces lead' },
  { key: 'any', label: 'No preference', line: 'Show everything, best match first' },
];

export function isPriceMix(value: unknown): value is PriceMix {
  return typeof value === 'string' && PRICE_MIX_OPTIONS.some(option => option.key === value);
}

export function priceMixLabel(mix: PriceMix | undefined): string {
  return PRICE_MIX_OPTIONS.find(option => option.key === mix)?.label ?? 'Not set';
}

export function priceTier(product: Pick<Product, 'category' | 'price'>): PriceTier {
  const band = PRICE_TIERS[product.category as string] ?? OTHER_TIERS;
  const price = Number(product.price) || 0;
  // A product with no price cannot be placed; mid-range is the neutral seat.
  if (price <= 0) return 'mid';
  return price <= band.low ? 'low' : price <= band.high ? 'mid' : 'high';
}

/** Whether this answer changes the order of anything. */
export function shapesOrder(mix: PriceMix | undefined | null): mix is Exclude<PriceMix, 'any'> {
  return !!mix && mix !== 'any';
}

/**
 * The list dealt out in the mix's proportions. Each next place goes to the
 * band furthest behind its share; inside a band the incoming order is kept.
 * Nothing is added or dropped.
 */
export function arrangeByPriceMix<T>(
  items: T[],
  productOf: (item: T) => Pick<Product, 'category' | 'price'>,
  mix: PriceMix | undefined | null
): T[] {
  if (!shapesOrder(mix) || items.length < 2) return items;
  const shares = MIX_SHARES[mix];
  const waiting: Record<PriceTier, T[]> = { low: [], mid: [], high: [] };
  items.forEach(item => waiting[priceTier(productOf(item))].push(item));
  const next: Record<PriceTier, number> = { low: 0, mid: 0, high: 0 };
  const dealt: Record<PriceTier, number> = { low: 0, mid: 0, high: 0 };
  const out: T[] = [];
  while (out.length < items.length) {
    let pick: PriceTier | null = null;
    let pickDue = Infinity;
    for (const tier of PRICE_TIER_ORDER) {
      if (next[tier] >= waiting[tier].length) continue;
      // When this band's next product falls due: its k-th at k / share.
      const due = (dealt[tier] + 1) / shares[tier];
      if (due < pickDue || (due === pickDue && pick !== null && shares[tier] > shares[pick])) {
        pick = tier;
        pickDue = due;
      }
    }
    if (pick === null) break;
    out.push(waiting[pick][next[pick]]);
    next[pick] += 1;
    dealt[pick] += 1;
  }
  return out;
}

/**
 * The same, inside each group of a list that is already in groups (paying
 * stores before the rest; a trend's garment matches before its colour
 * matches). The groups stay where they are; only the order inside changes.
 */
export function arrangeWithinGroups<T>(
  items: T[],
  groupOf: (item: T) => string | number,
  productOf: (item: T) => Pick<Product, 'category' | 'price'>,
  mix: PriceMix | undefined | null
): T[] {
  if (!shapesOrder(mix) || items.length < 2) return items;
  const order: Array<string | number> = [];
  const groups = new Map<string | number, T[]>();
  items.forEach(item => {
    const key = groupOf(item);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    (groups.get(key) as T[]).push(item);
  });
  return order.flatMap(key => arrangeByPriceMix(groups.get(key) as T[], productOf, mix));
}

/** "About 14 in every 20 everyday, 5 mid-range, 1 investment." */
export function priceMixSummary(mix: PriceMix | undefined | null): string {
  if (!shapesOrder(mix)) return 'Everything, best match first.';
  const shares = MIX_SHARES[mix];
  return `Of every 20 pieces: about ${shares.low} everyday, ${shares.mid} mid-range, ${shares.high} investment. Nothing is hidden.`;
}

/** What "everyday" and "investment" mean in dollars, for the question's note. */
export function priceBandExamples(): string {
  const { tops, shoes, outerwear } = PRICE_TIERS;
  return (
    `Everyday means tops to $${tops.low}, shoes to $${shoes.low}, coats to $${outerwear.low}. ` +
    `Investment starts above $${tops.high}, $${shoes.high} and $${outerwear.high}.`
  );
}

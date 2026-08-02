/**
 * Predictive Cost Per Wear
 *
 * Every wardrobe app computes cost-per-wear *after* you have worn something,
 * which is the one moment the number can no longer change a decision. This
 * projects it forward instead: given what the user has actually done with the
 * items they already own in this category, how often are they likely to wear
 * this one, and what would that make it cost per wear?
 *
 * Entirely deterministic and local. There is no model call here - the answer
 * comes from the user's own wear history, which is the only evidence that
 * actually predicts their behaviour.
 */

export interface WearForecast {
  /** Projected wears in the first two years of ownership. */
  projectedWears: number;
  projectedCostPerWear: number | null;
  /** Median monthly wear rate for items already owned in this category. */
  categoryWearRate: number;
  /** How many owned items the projection was derived from. */
  sampleSize: number;
  confidence: 'high' | 'medium' | 'low';
  verdict: 'strong' | 'fair' | 'poor' | 'unknown';
  summary: string;
}

const PROJECTION_MONTHS = 24;

function monthsOwned(item: any): number | null {
  const raw = item?.purchaseDate || item?.createdAt;
  if (!raw) return null;
  const then = new Date(raw).getTime();
  if (isNaN(then)) return null;
  // Anything owned under a month has too little history to imply a rate.
  const months = (Date.now() - then) / (1000 * 60 * 60 * 24 * 30.44);
  return months >= 1 ? months : null;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Monthly wear rate for a category, from real ownership history.
 *
 * Median rather than mean on purpose: one heavily-worn staple would otherwise
 * drag the average up and make every prospective purchase look justified.
 */
export function categoryWearRate(closetItems: any[], category: string): { rate: number; sampleSize: number } {
  const rates = closetItems
    .filter(i => (i?.category || '').toLowerCase() === (category || '').toLowerCase())
    .map(i => {
      const months = monthsOwned(i);
      if (months === null) return null;
      const wears = typeof i.wornCount === 'number' ? i.wornCount : 0;
      return wears / months;
    })
    .filter((r): r is number => r !== null);

  return { rate: median(rates), sampleSize: rates.length };
}

/**
 * Projects what a prospective purchase would actually cost per wear.
 *
 * Returns `unknown` rather than a fabricated projection when there is not
 * enough history in that category to say anything honest - a made-up number
 * here would directly mislead a purchase decision.
 */
export function forecastCostPerWear(
  closetItems: any[],
  category: string,
  price: number | null
): WearForecast {
  const { rate, sampleSize } = categoryWearRate(closetItems, category);

  if (sampleSize < 3 || rate <= 0) {
    return {
      projectedWears: 0,
      projectedCostPerWear: null,
      categoryWearRate: rate,
      sampleSize,
      confidence: 'low',
      verdict: 'unknown',
      summary:
        sampleSize === 0
          ? `No history for ${category} yet — wear a few and we can predict this properly.`
          : `Only ${sampleSize} ${category} item${sampleSize === 1 ? '' : 's'} with enough history to learn from — not enough to project yet.`,
    };
  }

  const projectedWears = Math.max(1, Math.round(rate * PROJECTION_MONTHS));
  const projectedCostPerWear = price !== null && price > 0 ? price / projectedWears : null;

  const confidence: WearForecast['confidence'] = sampleSize >= 8 ? 'high' : sampleSize >= 5 ? 'medium' : 'low';

  let verdict: WearForecast['verdict'] = 'unknown';
  if (projectedCostPerWear !== null) {
    verdict = projectedCostPerWear <= 3 ? 'strong' : projectedCostPerWear <= 10 ? 'fair' : 'poor';
  }

  const cpwText =
    projectedCostPerWear !== null ? ` — about $${projectedCostPerWear.toFixed(2)} per wear` : '';

  const summary =
    `Going by your own ${category}, you'd wear this around ${projectedWears} time${projectedWears === 1 ? '' : 's'} ` +
    `over two years${cpwText}.`;

  return {
    projectedWears,
    projectedCostPerWear,
    categoryWearRate: rate,
    sampleSize,
    confidence,
    verdict,
    summary,
  };
}

export interface SpendProfile {
  /** Median price the user has actually paid in this category. */
  typical: number | null;
  /** Upper end of what they normally spend - the 75th percentile of their own history. */
  comfortable: number | null;
  sampleSize: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[index];
}

/**
 * What this user actually spends in a category, learned from their closet.
 *
 * Alta asks you to set a budget. This infers it, which is both less work and
 * more honest - what people say they spend and what they have spent are rarely
 * the same number.
 */
export function spendProfile(closetItems: any[], category: string): SpendProfile {
  const prices = closetItems
    .filter(i => (i?.category || '').toLowerCase() === (category || '').toLowerCase())
    .map(i => (typeof i.price === 'number' && i.price > 0 ? i.price : null))
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);

  if (prices.length < 3) {
    return { typical: null, comfortable: null, sampleSize: prices.length };
  }

  return {
    typical: median(prices),
    comfortable: percentile(prices, 0.75),
    sampleSize: prices.length,
  };
}

/**
 * Where a prospective price sits against what the user normally spends.
 * Returns null when there is not enough history to judge.
 */
export function budgetVerdict(
  profile: SpendProfile,
  price: number
): { label: string; withinBudget: boolean } | null {
  if (profile.comfortable === null || profile.typical === null) return null;

  if (price <= profile.typical) {
    return { label: 'Below what you usually spend', withinBudget: true };
  }
  if (price <= profile.comfortable) {
    return { label: 'In your usual range', withinBudget: true };
  }
  return {
    label: `Above your usual — you normally stop around $${profile.comfortable.toFixed(0)}`,
    withinBudget: false,
  };
}

/** Short label for the verdict chip. */
export function verdictLabel(verdict: WearForecast['verdict']): string {
  switch (verdict) {
    case 'strong':
      return 'EARNS ITS PLACE';
    case 'fair':
      return 'REASONABLE';
    case 'poor':
      return 'EXPENSIVE PER WEAR';
    default:
      return 'NOT ENOUGH HISTORY';
  }
}

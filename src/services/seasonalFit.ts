/**
 * Seasonal Relevance
 *
 * Without this, a wool overcoat ranks identically in July and October. Shop
 * had no time-based signal at all, which is why the same products appeared in
 * the same order indefinitely for anyone who wasn't changing their closet.
 *
 * Two inputs, deliberately separate:
 *
 *   - **Season** is calendar-based and slow. It shifts the ranking four times
 *     a year and is what stops linen ranking in December.
 *   - **Weather** is the live reading already fetched for daily outfits. It
 *     handles the cold snap in April that the calendar doesn't know about.
 *
 * Weather is treated as a nudge rather than an override: one warm day in
 * February should not promote sundresses to the top of the page.
 */

import { Season } from '../types';
import { Product } from '../models/product';
import { WeatherCondition } from './recommendationEngine';

/** Northern-hemisphere meteorological seasons. */
export function currentSeason(date: Date = new Date()): Season {
  const month = date.getMonth(); // 0-11
  if (month <= 1 || month === 11) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'fall';
}

/** The season after this one, so shoulder-season buying isn't penalised. */
export function nextSeason(season: Season): Season {
  const order: Season[] = ['winter', 'spring', 'summer', 'fall'];
  return order[(order.indexOf(season) + 1) % order.length];
}

/**
 * Garment keywords that imply a season. Used only when the provider hasn't
 * supplied `seasons` on the product - a real feed's own tagging always wins,
 * since it knows the fabric weight and we are guessing from a product name.
 */
const SEASON_KEYWORDS: Record<Season, string[]> = {
  winter: ['coat', 'parka', 'puffer', 'wool', 'cashmere', 'fleece', 'thermal', 'boot', 'scarf', 'glove', 'knit', 'shearling'],
  spring: ['trench', 'light jacket', 'cardigan', 'rain', 'windbreaker', 'chino'],
  summer: ['linen', 'sundress', 'shorts', 'sandal', 'tank', 'swim', 'camisole', 'seersucker', 'espadrille'],
  fall: ['jacket', 'flannel', 'corduroy', 'sweater', 'boot', 'layer', 'tweed'],
};

/** Categories with no meaningful season - scoring them either way is noise. */
const SEASON_NEUTRAL = ['accessories', 'bags'];

export function inferSeasons(product: Product): Season[] {
  if (product.seasons?.length) {
    return product.seasons.filter((s): s is Season =>
      ['spring', 'summer', 'fall', 'winter'].includes(s)
    );
  }

  const haystack = [product.name, product.subcategory, ...(product.styleTags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const matched = (Object.keys(SEASON_KEYWORDS) as Season[]).filter(season =>
    SEASON_KEYWORDS[season].some(kw => haystack.includes(kw))
  );

  // Nothing matched means the garment reads as year-round, which is the
  // honest default - most tops and trousers genuinely are.
  return matched;
}

export interface SeasonalVerdict {
  /** Added to the match score. Negative for out-of-season. */
  weight: number;
  /** User-facing reason, or null when there is nothing worth saying. */
  reason: string | null;
  /** True when the item is actively wrong for now. */
  outOfSeason: boolean;
}

/**
 * How well a product suits the moment.
 *
 * Year-round items score zero rather than positive: they are not a reason to
 * buy *now*, and inflating them would drown out the items that genuinely are.
 */
export function seasonalFit(
  product: Product,
  season: Season = currentSeason(),
  weather?: { condition: WeatherCondition; temperature: number }
): SeasonalVerdict {
  if (SEASON_NEUTRAL.includes((product.category || '').toLowerCase())) {
    return { weight: 0, reason: null, outOfSeason: false };
  }

  const seasons = inferSeasons(product);
  if (seasons.length === 0) {
    return { weight: 0, reason: null, outOfSeason: false };
  }

  const upcoming = nextSeason(season);

  if (seasons.includes(season)) {
    let weight = 14;
    let reason = `Right for ${season} — you'd wear it now`;

    // Live weather sharpens the claim when it agrees with the calendar.
    if (weather) {
      const wantsWarm = seasons.includes('winter') || seasons.includes('fall');
      const wantsCool = seasons.includes('summer');
      if (wantsWarm && (weather.temperature <= 50 || weather.condition === 'cold')) {
        weight += 6;
        reason = `It's ${weather.temperature}° out — you'd wear this this week`;
      } else if (wantsCool && (weather.temperature >= 78 || weather.condition === 'hot')) {
        weight += 6;
        reason = `It's ${weather.temperature}° out — you'd wear this this week`;
      }
    }

    return { weight, reason, outOfSeason: false };
  }

  if (seasons.includes(upcoming)) {
    return {
      weight: 6,
      reason: `Ahead of ${upcoming} — worth having before everyone else wants it`,
      outOfSeason: false,
    };
  }

  // Actively wrong for now. Penalised rather than hidden: an off-season coat
  // at 60% off is still a legitimate buy, it just shouldn't lead the page.
  return {
    weight: -12,
    reason: null,
    outOfSeason: true,
  };
}

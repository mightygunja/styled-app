/**
 * Shopper Signals
 *
 * Two jobs, both aimed at the same problem: Shop had no memory, so it showed
 * the same products in the same order forever.
 *
 *   - **Novelty decay.** A product shown repeatedly and never tapped is
 *     demoted. This is what makes the page feel alive between closet changes.
 *   - **Learned affinity.** Taps, saves and dismissals sharpen the ranking
 *     toward what this person actually reaches for, which is the one part a
 *     competitor cannot copy - it needs your users' history, not your code.
 *
 * Stored in AsyncStorage rather than Firestore on purpose. Impressions fire on
 * every scroll; writing those to Firestore would cost real money for data that
 * is per-device, low-value and safe to lose. Taps are already recorded to
 * Firestore separately by affiliateClicksService for revenue reporting - this
 * is the ranking copy, not the accounting copy.
 *
 * Loaded once into memory and scored synchronously, because the scorer runs
 * per product across a whole page of results.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../models/product';

const STORAGE_KEY = '@styled_shopper_signals';

/** Caps keep the stored blob small and bound AsyncStorage write cost. */
const MAX_TRACKED_PRODUCTS = 400;
const MAX_DISMISSED = 200;

/** Impressions older than this stop counting - stale boredom shouldn't be permanent. */
const IMPRESSION_TTL_MS = 21 * 24 * 60 * 60 * 1000;

interface ImpressionRecord {
  count: number;
  lastSeen: number;
}

export interface ShopperSignals {
  impressions: Record<string, ImpressionRecord>;
  brandAffinity: Record<string, number>;
  retailerAffinity: Record<string, number>;
  colorAffinity: Record<string, number>;
  categoryAffinity: Record<string, number>;
  dismissed: string[];
  /** Prices of tapped products, for inferring what they actually engage with. */
  tappedPrices: number[];
  /**
   * Trend engagement, keyed by trend id. Positive events (tapping into a
   * trend, shopping its stretch pick) versus explicit "not my thing"
   * dismissals. This is what widens or narrows how far the trend layer
   * stretches this user - see trendAdventurousness below.
   */
  trendTaps: Record<string, number>;
  trendDismissals: Record<string, number>;
}

export const EMPTY_SIGNALS: ShopperSignals = {
  impressions: {},
  brandAffinity: {},
  retailerAffinity: {},
  colorAffinity: {},
  categoryAffinity: {},
  dismissed: [],
  tappedPrices: [],
  trendTaps: {},
  trendDismissals: {},
};

let cache: ShopperSignals | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

async function read(): Promise<ShopperSignals> {
  if (cache) return cache;

  let loaded: ShopperSignals;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    loaded = raw ? { ...EMPTY_SIGNALS, ...JSON.parse(raw) } : { ...EMPTY_SIGNALS };
  } catch (error) {
    console.log('Could not read shopper signals', error);
    loaded = { ...EMPTY_SIGNALS };
  }

  cache = loaded;
  return loaded;
}

/**
 * Debounced write. Impressions arrive in bursts as a grid scrolls; writing on
 * each would thrash AsyncStorage for no benefit.
 */
function scheduleWrite() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(async () => {
    try {
      if (cache) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.log('Could not persist shopper signals', error);
    }
  }, 1500);
}

/** Drops the least-recently-seen entries once the store outgrows its cap. */
function prune(signals: ShopperSignals) {
  const entries = Object.entries(signals.impressions);
  if (entries.length > MAX_TRACKED_PRODUCTS) {
    const keep = entries
      .sort((a, b) => b[1].lastSeen - a[1].lastSeen)
      .slice(0, MAX_TRACKED_PRODUCTS);
    signals.impressions = Object.fromEntries(keep);
  }
  if (signals.dismissed.length > MAX_DISMISSED) {
    signals.dismissed = signals.dismissed.slice(-MAX_DISMISSED);
  }
  if (signals.tappedPrices.length > 60) {
    signals.tappedPrices = signals.tappedPrices.slice(-60);
  }
}

function bump(map: Record<string, number>, key: string | undefined, by: number) {
  if (!key) return;
  const k = key.toLowerCase();
  map[k] = (map[k] || 0) + by;
}

export const shopperSignals = {
  /** Warms the in-memory cache. Call once before scoring a page. */
  load: read,

  /** Synchronous read of the already-loaded signals. */
  current(): ShopperSignals {
    return cache || EMPTY_SIGNALS;
  },

  async recordImpressions(productIds: string[]): Promise<void> {
    const signals = await read();
    const now = Date.now();
    productIds.forEach(id => {
      const existing = signals.impressions[id];
      signals.impressions[id] = {
        count: (existing?.count || 0) + 1,
        lastSeen: now,
      };
    });
    prune(signals);
    scheduleWrite();
  },

  /**
   * A tap is the strongest positive signal available - stronger than a save,
   * because it means they went to the retailer.
   */
  async recordTap(product: Product): Promise<void> {
    const signals = await read();
    bump(signals.brandAffinity, product.brand, 3);
    bump(signals.retailerAffinity, product.retailer, 2);
    bump(signals.colorAffinity, product.color, 2);
    bump(signals.categoryAffinity, product.category, 2);
    signals.tappedPrices.push(product.price);
    prune(signals);
    scheduleWrite();
  },

  async recordSave(product: Product): Promise<void> {
    const signals = await read();
    bump(signals.brandAffinity, product.brand, 2);
    bump(signals.colorAffinity, product.color, 1);
    bump(signals.categoryAffinity, product.category, 1);
    prune(signals);
    scheduleWrite();
  },

  /** They leaned into a trend - opened its report, shopped its stretch pick. */
  async recordTrendTap(trendId: string): Promise<void> {
    const signals = await read();
    signals.trendTaps[trendId] = (signals.trendTaps[trendId] || 0) + 1;
    scheduleWrite();
  },

  /** An explicit "not my thing" on a trend. Stronger than ignoring it. */
  async recordTrendDismiss(trendId: string): Promise<void> {
    const signals = await read();
    signals.trendDismissals[trendId] = (signals.trendDismissals[trendId] || 0) + 1;
    scheduleWrite();
  },

  async recordDismiss(product: Product): Promise<void> {
    const signals = await read();
    if (!signals.dismissed.includes(product.id)) signals.dismissed.push(product.id);
    bump(signals.brandAffinity, product.brand, -2);
    bump(signals.colorAffinity, product.color, -1);
    prune(signals);
    scheduleWrite();
  },

  async reset(): Promise<void> {
    cache = { ...EMPTY_SIGNALS };
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};

export interface BehaviouralVerdict {
  weight: number;
  reason: string | null;
  /** True when the user explicitly dismissed this product. */
  suppressed: boolean;
}

/**
 * Novelty decay plus learned affinity, as a single adjustment.
 *
 * Decay is capped and TTL'd. A product should slide down the page after being
 * ignored a few times, not be buried permanently - people do come back for
 * something they scrolled past a fortnight ago.
 */
export function behaviouralAdjustment(
  product: Product,
  signals: ShopperSignals
): BehaviouralVerdict {
  if (signals.dismissed.includes(product.id)) {
    return { weight: -40, reason: null, suppressed: true };
  }

  let weight = 0;
  let reason: string | null = null;

  const impression = signals.impressions[product.id];
  if (impression && Date.now() - impression.lastSeen < IMPRESSION_TTL_MS) {
    // No penalty for the first couple of views; -3 each after, capped at -12.
    const seenTooOften = Math.max(0, impression.count - 2);
    weight -= Math.min(12, seenTooOften * 3);
  }

  const brand = signals.brandAffinity[(product.brand || '').toLowerCase()] || 0;
  const color = signals.colorAffinity[(product.color || '').toLowerCase()] || 0;
  const category = signals.categoryAffinity[(product.category || '').toLowerCase()] || 0;
  const retailer = signals.retailerAffinity[(product.retailer || '').toLowerCase()] || 0;

  const affinity = Math.max(-10, Math.min(16, brand * 2 + color + category + retailer));
  weight += affinity;

  // Only claim a learned preference once there's enough evidence to mean it.
  if (brand >= 4) {
    reason = `You keep coming back to ${product.brand}`;
  } else if (category >= 4 && color >= 2 && product.color) {
    reason = `You gravitate toward ${product.color} ${product.category}`;
  }

  return { weight, reason, suppressed: false };
}

/**
 * How adventurous this user has proven to be with trends, 0.15..1.
 *
 * Starts at a neutral 0.5 and moves with behaviour: engaging with trend
 * surfaces widens the stretch (earlier-stage trends, bolder stretch picks);
 * dismissing them narrows it. Deliberately never reaches 0 - the app's
 * promise is making people trendier, so the trend layer quiets down for a
 * reluctant user but never disappears.
 */
export function trendAdventurousness(signals: ShopperSignals): number {
  const taps = Object.values(signals.trendTaps || {}).reduce((a, b) => a + b, 0);
  const dismissals = Object.values(signals.trendDismissals || {}).reduce((a, b) => a + b, 0);
  return Math.max(0.15, Math.min(1, 0.5 + taps * 0.06 - dismissals * 0.08));
}

/** Median price of products the user has actually tapped, once there are enough. */
export function engagedPriceBand(signals: ShopperSignals): { median: number } | null {
  if (signals.tappedPrices.length < 4) return null;
  const sorted = [...signals.tappedPrices].sort((a, b) => a - b);
  return { median: sorted[Math.floor(sorted.length / 2)] };
}

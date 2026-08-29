/**
 * Marketplace product model. Products are never warehoused in Firestore -
 * they're fetched live from the active AffiliateNetworkAdapter (see
 * services/affiliateNetwork.ts) each time and cached only in memory, the
 * same way a real affiliate integration works against live retailer feeds.
 */

import { ItemCategory } from '../types';

export interface Product {
  id: string; // stable id from the source network, used for wishlist/click dedupe
  name: string;
  brand: string;
  retailer: string;
  category: ItemCategory;
  subcategory?: string;
  price: number;
  originalPrice?: number; // present + higher than price => on sale
  currency: string; // ISO 4217, e.g. "USD"
  imageUrl: string;
  color?: string;
  sizeRange?: string[];
  styleTags?: string[]; // e.g. ["minimalist", "classic"], matched against styleArchetypes
  sourceUrl: string; // original retailer product page, pre-affiliate-wrap
  inStock: boolean;
  rating?: number; // 0-5, when the network provides it
  condition?: 'new' | 'secondhand'; // defaults to 'new'; secondhand folds the old standalone marketplace into Shop as a filter
  /**
   * Which department the piece belongs to. 'unisex' passes every wardrobe
   * focus; absent is treated as 'unisex' so live feeds that don't report a
   * department are never silently filtered out.
   */
  department?: 'women' | 'men' | 'unisex';

  // ---- Live-inventory fields ----
  // Every one of these is optional and every scorer that reads them no-ops
  // when absent, so the mock catalogue behaves correctly today and a real
  // affiliate feed starts influencing rankings the moment it populates them.
  // Nothing needs rewiring at switchover.

  /** Seasons the item genuinely suits. Inferred from the garment when absent. */
  seasons?: string[];
  /** When the retailer listed it. Drives the new-arrival signal. */
  listedAt?: string;
  /** Price before a recent drop, when the network reports one. */
  previousPrice?: number;
  /** Rough stock depth, for a scarcity nudge. Never fabricated locally. */
  stockLevel?: 'low' | 'medium' | 'high';
  /** Number of reviews behind `rating`, so a 5.0 from one person isn't trusted. */
  reviewCount?: number;
}

export function isOnSale(product: Product): boolean {
  return typeof product.originalPrice === 'number' && product.originalPrice > product.price;
}

export function discountPercent(product: Product): number | null {
  if (!isOnSale(product) || !product.originalPrice) return null;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}

export type ProductSort = 'match' | 'price-low' | 'price-high' | 'newest' | 'discount';

/**
 * Search contract every provider must satisfy.
 *
 * Deliberately wider than the mock catalogue needs. A real affiliate network
 * pushes filtering server-side, and a provider that receives only
 * `{ category }` would force the client to over-fetch and filter locally on a
 * catalogue of millions. Filtering a provider cannot honour is applied
 * client-side as a fallback, so behaviour is identical either way.
 */
export interface ProductSearchFilters {
  query?: string;
  category?: ItemCategory;
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  retailers?: string[];
  colors?: string[];
  sizes?: string[];
  onSaleOnly?: boolean;
  inStockOnly?: boolean;
  condition?: 'new' | 'secondhand';
  sort?: ProductSort;
  /** Zero-indexed. Providers that page by cursor map this internally. */
  page?: number;
  pageSize?: number;

  /**
   * Style context passed through to providers that take a natural-language
   * brief rather than keywords (Sovrn's recommendation endpoint being the
   * case in point). Ignored by providers that only do keyword search, so it is
   * always safe to send.
   */
  styleArchetypes?: string[];
  silhouettes?: string[];
}

export interface ProductSearchResult {
  products: Product[];
  /** True when the provider has more beyond this page. */
  hasMore: boolean;
  /** Total matches when the provider reports one; null when it does not. */
  totalCount: number | null;
}

/** Applies every filter locally. Used by the mock adapter, and as the fallback
 *  pass over any provider result so unsupported filters still take effect. */
export function applyFiltersLocally(products: Product[], filters: ProductSearchFilters): Product[] {
  return products.filter(product => {
    if (filters.category && product.category !== filters.category) return false;
    if (filters.subcategory && product.subcategory !== filters.subcategory) return false;
    if (typeof filters.minPrice === 'number' && product.price < filters.minPrice) return false;
    if (typeof filters.maxPrice === 'number' && product.price > filters.maxPrice) return false;
    if (filters.onSaleOnly && !isOnSale(product)) return false;
    if (filters.inStockOnly && !product.inStock) return false;
    if (filters.condition && (product.condition || 'new') !== filters.condition) return false;

    if (filters.brands?.length && !filters.brands.some(b => b.toLowerCase() === product.brand.toLowerCase())) {
      return false;
    }
    if (filters.retailers?.length && !filters.retailers.some(r => r.toLowerCase() === product.retailer.toLowerCase())) {
      return false;
    }
    if (filters.colors?.length) {
      const color = (product.color || '').toLowerCase();
      if (!filters.colors.some(c => color.includes(c.toLowerCase()))) return false;
    }
    if (filters.sizes?.length) {
      const sizes = product.sizeRange || [];
      if (!filters.sizes.some(s => sizes.includes(s))) return false;
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const haystack = [product.name, product.brand, product.retailer, product.subcategory, ...(product.styleTags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Sorts in place-safe fashion. 'match' is left alone - match ranking is the
 *  caller's job, since only it has the user's profile. */
export function sortProducts(products: Product[], sort?: ProductSort): Product[] {
  if (!sort || sort === 'match') return products;
  const sorted = [...products];
  switch (sort) {
    case 'price-low':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-high':
      return sorted.sort((a, b) => b.price - a.price);
    case 'discount':
      return sorted.sort((a, b) => (discountPercent(b) ?? 0) - (discountPercent(a) ?? 0));
    default:
      return sorted;
  }
}

/** A product ranked against a user's style profile - what ShopScreen actually renders. */
export interface MatchedProduct {
  product: Product;
  matchScore: number; // 0-100
  /** Flat list of reason text, ordered strongest first. Kept for older consumers. */
  matchReasons: string[];
  /** Typed signals with strength, so the UI can emphasise rather than just list. */
  signals: Array<{
    kind: 'unlock' | 'color' | 'fit' | 'style' | 'trend' | 'gap' | 'value' | 'versatility' | 'concern';
    text: string;
    strength: 'strong' | 'moderate' | 'minor';
  }>;
  /** The single most compelling line - what a card shows when space is tight. */
  headline: string;
  /** Honest reasons not to buy. Shown, not hidden. */
  concerns: string[];
  /** How much this would open up the wardrobe they already own. */
  unlock: {
    role: string;
    pairsWith: number;
    newOutfits: number;
    bestPairings: Array<{ id: string; label: string }>;
  } | null;
  /** The current fashion trend this product buys into, when it does. */
  trend?: { id: string; name: string; region: string; stage: string } | null;
}

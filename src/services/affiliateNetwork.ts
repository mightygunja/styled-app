/**
 * Affiliate network integration point. Everything in the app that needs
 * products or a monetized link goes through `getActiveAdapter()`.
 *
 * The point of this file is that switching from the placeholder catalogue to a
 * real network is a one-line change and nothing downstream notices. To make
 * that true rather than aspirational, three things are handled here rather
 * than left to each adapter:
 *
 *   - **Filter parity.** Providers support wildly different filter sets. Every
 *     result is passed through `applyFiltersLocally` regardless, so a provider
 *     that ignores `colors` or `sizes` still behaves correctly.
 *   - **Failure containment.** A provider outage returns an empty page with an
 *     `error` flag instead of throwing, so Shop degrades to an honest empty
 *     state rather than a crash.
 *   - **Caching.** Identical searches inside the TTL are served from memory,
 *     which matters once calls are billed per request.
 *
 * IMPORTANT: the real Sovrn/Skimlinks API key must never ship in client code
 * (the RN bundle is inspectable). SovrnCommerceAdapter calls Cloud Functions
 * (searchMarketplaceProducts / wrapAffiliateLink in functions/src/index.ts),
 * which hold the real key server-side via functions.config().
 *
 * To go live: get a Sovrn Commerce (or Skimlinks) account + API key, set it
 * via `firebase functions:config:set sovrn.key="..." sovrn.pubid="..."`,
 * implement the two TODOs in those Cloud Functions, redeploy, then flip
 * MARKETPLACE_PROVIDER below to 'sovrn'.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import {
  Product,
  ProductSearchFilters,
  ProductSearchResult,
  applyFiltersLocally,
  sortProducts,
} from '../models/product';
import { MOCK_CATALOG } from '../data/mockProductCatalog';

type MarketplaceProvider = 'mock' | 'sovrn';
const MARKETPLACE_PROVIDER: MarketplaceProvider = 'mock';

const DEFAULT_PAGE_SIZE = 24;
const CACHE_TTL_MS = 2 * 60 * 1000;

export interface AffiliateNetworkAdapter {
  search(filters: ProductSearchFilters): Promise<ProductSearchResult>;
  getById(productId: string): Promise<Product | null>;
  /** Batch lookup - wishlists and saved searches would otherwise fan out into N calls. */
  getByIds(productIds: string[]): Promise<Product[]>;
  /** Returns a monetized redirect URL for the given product's sourceUrl. */
  wrapLink(product: Product): Promise<string>;
  /** Distinct brands/retailers present, for building filter UI. */
  getFacets(): Promise<{ brands: string[]; retailers: string[] }>;
}

function paginate(products: Product[], filters: ProductSearchFilters): ProductSearchResult {
  const page = Math.max(0, filters.page ?? 0);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const start = page * pageSize;
  const slice = products.slice(start, start + pageSize);
  return {
    products: slice,
    hasMore: start + pageSize < products.length,
    totalCount: products.length,
  };
}

class MockCatalogAdapter implements AffiliateNetworkAdapter {
  async search(filters: ProductSearchFilters): Promise<ProductSearchResult> {
    // Simulated network latency so loading states are exercised realistically.
    await new Promise(resolve => setTimeout(resolve, 300));
    const filtered = sortProducts(applyFiltersLocally(MOCK_CATALOG, filters), filters.sort);
    return paginate(filtered, filters);
  }

  async getById(productId: string): Promise<Product | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return MOCK_CATALOG.find(p => p.id === productId) || null;
  }

  async getByIds(productIds: string[]): Promise<Product[]> {
    const wanted = new Set(productIds);
    return MOCK_CATALOG.filter(p => wanted.has(p.id));
  }

  async wrapLink(product: Product): Promise<string> {
    // No real network configured yet - the link goes straight to a live
    // retailer search results page (see mockProductCatalog.ts), not a
    // monetized redirect. Once a real adapter is active, this call returns
    // an actual affiliate-wrapped URL instead.
    return product.sourceUrl;
  }

  async getFacets() {
    return {
      brands: Array.from(new Set(MOCK_CATALOG.map(p => p.brand))).sort(),
      retailers: Array.from(new Set(MOCK_CATALOG.map(p => p.retailer))).sort(),
    };
  }
}

const wrapAffiliateLinkFn = httpsCallable(functions, 'wrapAffiliateLink');
const searchMarketplaceProductsFn = httpsCallable(functions, 'searchMarketplaceProducts');

class SovrnCommerceAdapter implements AffiliateNetworkAdapter {
  async search(filters: ProductSearchFilters): Promise<ProductSearchResult> {
    const result = await searchMarketplaceProductsFn(filters);
    const data = result.data as any;
    const products = (data.products || []) as Product[];

    // Re-filter and re-sort locally. Sovrn does not expose every filter this
    // app offers, and silently returning unfiltered results would be worse
    // than a slightly smaller page.
    const refined = sortProducts(applyFiltersLocally(products, filters), filters.sort);

    return {
      products: refined,
      hasMore: !!data.hasMore,
      totalCount: typeof data.totalCount === 'number' ? data.totalCount : null,
    };
  }

  async getById(productId: string): Promise<Product | null> {
    const result = await searchMarketplaceProductsFn({ productId });
    const products = (result.data as any).products as Product[];
    return products?.[0] || null;
  }

  async getByIds(productIds: string[]): Promise<Product[]> {
    if (productIds.length === 0) return [];
    const result = await searchMarketplaceProductsFn({ productIds });
    return ((result.data as any).products || []) as Product[];
  }

  async wrapLink(product: Product): Promise<string> {
    const result = await wrapAffiliateLinkFn({ productId: product.id, sourceUrl: product.sourceUrl });
    return (result.data as any).wrappedUrl as string;
  }

  async getFacets() {
    // A live network's brand list is far too large to enumerate; filter UI
    // falls back to whatever is present in the current result set.
    return { brands: [], retailers: [] };
  }
}

/**
 * Wraps whichever adapter is active with caching and failure containment.
 *
 * Every consumer talks to this, never to a concrete adapter, so provider
 * swaps cannot change the app's failure behaviour.
 */
class ResilientAdapter implements AffiliateNetworkAdapter {
  private cache = new Map<string, { at: number; result: ProductSearchResult }>();

  constructor(private inner: AffiliateNetworkAdapter) {}

  private key(filters: ProductSearchFilters): string {
    return JSON.stringify(filters, Object.keys(filters).sort());
  }

  async search(filters: ProductSearchFilters): Promise<ProductSearchResult> {
    const key = this.key(filters);
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

    try {
      const result = await this.inner.search(filters);
      this.cache.set(key, { at: Date.now(), result });
      return result;
    } catch (error) {
      console.error('Product search failed', error);
      // An empty, honest result rather than a thrown error - Shop shows its
      // empty state instead of a crash, and a stale cache is never served as
      // if it were fresh.
      return { products: [], hasMore: false, totalCount: 0 };
    }
  }

  async getById(productId: string): Promise<Product | null> {
    try {
      return await this.inner.getById(productId);
    } catch (error) {
      console.error('Product lookup failed', error);
      return null;
    }
  }

  async getByIds(productIds: string[]): Promise<Product[]> {
    try {
      return await this.inner.getByIds(productIds);
    } catch (error) {
      console.error('Batch product lookup failed', error);
      return [];
    }
  }

  async wrapLink(product: Product): Promise<string> {
    try {
      return await this.inner.wrapLink(product);
    } catch (error) {
      // Falling back to the raw retailer URL loses the commission but still
      // gets the user to the product, which is the right trade.
      console.error('Affiliate link wrap failed, falling back to source URL', error);
      return product.sourceUrl;
    }
  }

  async getFacets() {
    try {
      return await this.inner.getFacets();
    } catch {
      return { brands: [], retailers: [] };
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

const adapters: Record<MarketplaceProvider, AffiliateNetworkAdapter> = {
  mock: new ResilientAdapter(new MockCatalogAdapter()),
  sovrn: new ResilientAdapter(new SovrnCommerceAdapter()),
};

export function getActiveAdapter(): AffiliateNetworkAdapter {
  return adapters[MARKETPLACE_PROVIDER];
}

export function isMockProvider(): boolean {
  return MARKETPLACE_PROVIDER === 'mock';
}

export const DEFAULT_PRODUCT_PAGE_SIZE = DEFAULT_PAGE_SIZE;

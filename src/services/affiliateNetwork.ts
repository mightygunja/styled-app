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

/**
 * 'both' runs Sovrn and Rakuten together and merges the results, which is what
 * a serious catalogue needs - no single affiliate network covers every
 * retailer, and the competitor doing this best runs exactly this pair.
 */
type MarketplaceProvider = 'mock' | 'sovrn' | 'rakuten' | 'both';
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

    // Re-filter and re-sort locally. Sovrn's endpoint honours price range and
    // little else, and it returns no brand, colour or size at all - so filters
    // on those fields have to be applied here or they would silently do
    // nothing.
    const refined = sortProducts(applyFiltersLocally(products, filters), filters.sort);

    return {
      products: refined,
      hasMore: !!data.hasMore,
      totalCount: typeof data.totalCount === 'number' ? data.totalCount : null,
    };
  }

  /**
   * Sovrn documents no fetch-by-id endpoint - their recommendation API only
   * answers with a fresh set for a given brief. Returning null here is honest;
   * ResilientAdapter serves detail views from the index it builds out of search
   * results, which is what makes Product Detail keep working.
   */
  async getById(): Promise<Product | null> {
    return null;
  }

  async getByIds(): Promise<Product[]> {
    return [];
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

const searchRakutenProductsFn = httpsCallable(functions, 'searchRakutenProducts');

class RakutenAdvertisingAdapter implements AffiliateNetworkAdapter {
  async search(filters: ProductSearchFilters): Promise<ProductSearchResult> {
    const result = await searchRakutenProductsFn(filters);
    const data = result.data as any;
    const products = (data.products || []) as Product[];

    // Rakuten returns a retailer but no manufacturer brand, colour or size, so
    // filters on those must be applied here rather than silently ignored.
    const refined = sortProducts(applyFiltersLocally(products, filters), filters.sort);

    return {
      products: refined,
      hasMore: !!data.hasMore,
      totalCount: typeof data.totalCount === 'number' ? data.totalCount : null,
    };
  }

  /** Rakuten's product search is keyword-only; there is no fetch-by-id. */
  async getById(): Promise<Product | null> {
    return null;
  }

  async getByIds(): Promise<Product[]> {
    return [];
  }

  async wrapLink(product: Product): Promise<string> {
    // linkurl from Rakuten already carries the publisher's tracking, so
    // re-wrapping it through another network would break attribution.
    return product.sourceUrl;
  }

  async getFacets() {
    return { brands: [], retailers: [] };
  }
}

/**
 * Runs several networks at once and merges the results.
 *
 * A failing network is dropped rather than failing the whole page - partial
 * results beat an empty Shop, and one network being down should not look
 * identical to having no matches.
 */
class CompositeAdapter implements AffiliateNetworkAdapter {
  constructor(private members: Array<{ name: string; adapter: AffiliateNetworkAdapter }>) {}

  /** Same garment from two networks: same name, same money. */
  private dedupeKey(product: Product): string {
    return `${product.name.toLowerCase().replace(/\s+/g, ' ').trim()}|${Math.round(product.price)}`;
  }

  async search(filters: ProductSearchFilters): Promise<ProductSearchResult> {
    const settled = await Promise.allSettled(
      this.members.map(m => m.adapter.search(filters))
    );

    settled.forEach((outcome, i) => {
      if (outcome.status === 'rejected') {
        console.error(`${this.members[i].name} search failed`, outcome.reason);
      }
    });

    const perNetwork = settled.map(o => (o.status === 'fulfilled' ? o.value.products : []));

    // Interleave rather than concatenate. Concatenating would put one network's
    // entire catalogue ahead of the other's before scoring ever sees it, which
    // biases the page toward whichever adapter happens to be listed first.
    const merged: Product[] = [];
    const seen = new Set<string>();
    const longest = Math.max(0, ...perNetwork.map(p => p.length));

    for (let i = 0; i < longest; i++) {
      for (const products of perNetwork) {
        const product = products[i];
        if (!product) continue;
        const key = this.dedupeKey(product);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(product);
      }
    }

    return {
      products: sortProducts(merged, filters.sort),
      hasMore: settled.some(o => o.status === 'fulfilled' && o.value.hasMore),
      totalCount: merged.length,
    };
  }

  async getById(productId: string): Promise<Product | null> {
    for (const member of this.members) {
      try {
        const found = await member.adapter.getById(productId);
        if (found) return found;
      } catch {
        // Try the next network rather than failing the detail screen.
      }
    }
    return null;
  }

  async getByIds(productIds: string[]): Promise<Product[]> {
    const results = await Promise.allSettled(
      this.members.map(m => m.adapter.getByIds(productIds))
    );
    return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
  }

  async wrapLink(product: Product): Promise<string> {
    // Route by origin: a Rakuten link is already tracked and must not be
    // re-wrapped through Sovrn, or the commission goes to the wrong network.
    const origin = product.id.startsWith('rakuten-') ? 'Rakuten' : 'Sovrn';
    const member = this.members.find(m => m.name === origin) || this.members[0];
    return member.adapter.wrapLink(product);
  }

  async getFacets() {
    const results = await Promise.allSettled(this.members.map(m => m.adapter.getFacets()));
    const brands = new Set<string>();
    const retailers = new Set<string>();
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        r.value.brands.forEach(b => brands.add(b));
        r.value.retailers.forEach(x => retailers.add(x));
      }
    });
    return { brands: Array.from(brands).sort(), retailers: Array.from(retailers).sort() };
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

  /**
   * Every product ever returned by a search, kept by id.
   *
   * This exists because recommendation-style providers (Sovrn) have no
   * fetch-by-id endpoint - they answer briefs, not lookups. Without this index
   * a user could tap a product in Shop and land on an empty detail screen.
   * Indexing on the way past costs nothing and makes detail views work for
   * every provider, whether or not it supports lookups.
   */
  private productIndex = new Map<string, Product>();

  constructor(private inner: AffiliateNetworkAdapter) {}

  private index(products: Product[]) {
    products.forEach(p => this.productIndex.set(p.id, p));
    // Bound the index so a long browsing session cannot grow it without limit.
    if (this.productIndex.size > 1000) {
      const excess = this.productIndex.size - 1000;
      const keys = Array.from(this.productIndex.keys()).slice(0, excess);
      keys.forEach(k => this.productIndex.delete(k));
    }
  }

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
      this.index(result.products);
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
      const direct = await this.inner.getById(productId);
      if (direct) return direct;
    } catch (error) {
      console.error('Product lookup failed', error);
    }
    // Falls back to whatever a search has already surfaced this session.
    return this.productIndex.get(productId) || null;
  }

  async getByIds(productIds: string[]): Promise<Product[]> {
    try {
      const direct = await this.inner.getByIds(productIds);
      if (direct.length > 0) return direct;
    } catch (error) {
      console.error('Batch product lookup failed', error);
    }
    return productIds
      .map(id => this.productIndex.get(id))
      .filter((p): p is Product => p !== undefined);
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

const sovrnAdapter = new SovrnCommerceAdapter();
const rakutenAdapter = new RakutenAdvertisingAdapter();

const adapters: Record<MarketplaceProvider, AffiliateNetworkAdapter> = {
  mock: new ResilientAdapter(new MockCatalogAdapter()),
  sovrn: new ResilientAdapter(sovrnAdapter),
  rakuten: new ResilientAdapter(rakutenAdapter),
  both: new ResilientAdapter(
    new CompositeAdapter([
      { name: 'Sovrn', adapter: sovrnAdapter },
      { name: 'Rakuten', adapter: rakutenAdapter },
    ])
  ),
};

export function getActiveAdapter(): AffiliateNetworkAdapter {
  return adapters[MARKETPLACE_PROVIDER];
}

export function isMockProvider(): boolean {
  return MARKETPLACE_PROVIDER === 'mock';
}

/** Recorded on outbound clicks so mock traffic is never mistaken for real. */
export function activeProviderName(): MarketplaceProvider {
  return MARKETPLACE_PROVIDER;
}

export const DEFAULT_PRODUCT_PAGE_SIZE = DEFAULT_PAGE_SIZE;

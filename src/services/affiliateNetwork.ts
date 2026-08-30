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
 * IMPORTANT: real network credentials must never ship in client code (the RN
 * bundle is inspectable). Every adapter here calls Cloud Functions
 * (functions/src/index.ts), which hold the keys server-side in functions/.env.
 *
 * To go live with Skimlinks (the application in flight as of 2026-08-24):
 *   1. Once approved, note the publisher site ID and request a Product API
 *      key in the Skimlinks hub.
 *   2. Put SKIMLINKS_PUBID=... and SKIMLINKS_KEY=... in functions/.env.
 *   3. firebase deploy --only functions:searchSkimlinksProducts,functions:wrapAffiliateLink
 *   4. Flip MARKETPLACE_PROVIDER below to 'skimlinks'.
 * Sovrn ('sovrn') and Rakuten ('rakuten') activate the same way with their
 * own credentials - see the matching sections in functions/src/index.ts.
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
import { MOCK_CATALOG, BALANCED_CATALOG } from '../data/mockProductCatalog';

/**
 * 'both' runs Sovrn and Rakuten together and merges the results, which is what
 * a serious catalogue needs - no single affiliate network covers every
 * retailer, and the competitor doing this best runs exactly this pair.
 *
 * 'amazon' is the low-barrier starter network: Amazon Associates issues a
 * tracking tag at signup with no site review up front (the review happens
 * after the first 3 qualifying sales, with 180 days to make them). It serves
 * the curated catalogue but monetizes every outbound click as an Amazon
 * search link carrying the associate tag - a legitimate, attributable
 * affiliate link that needs no API access and no server-side secret (the tag
 * is public by design; it appears in every URL).
 */
/**
 * 'ebay' is the second low-barrier network: eBay Partner Network approval is
 * straightforward, the Browse API returns real, in-stock items (including
 * secondhand - it is what powers our secondhand filter properly), and links
 * come back already affiliatized when the campaign id is set server-side.
 * To activate: EPN account -> campaign id, plus an eBay developer keyset;
 * put EBAY_CLIENT_ID / EBAY_CLIENT_SECRET / EBAY_CAMPAIGN_ID in
 * functions/.env, deploy functions, then flip the provider to 'ebay' - or
 * 'starter', which merges the curated Amazon picks with live eBay results.
 */
type MarketplaceProvider =
  | 'mock'
  | 'amazon'
  | 'ebay'
  | 'starter'
  | 'sovrn'
  | 'rakuten'
  | 'skimlinks'
  | 'both';
const MARKETPLACE_PROVIDER: MarketplaceProvider = 'amazon';

/**
 * The Amazon Associates tracking tag, e.g. 'thirtythree-20'.
 * Get one at affiliate-program.amazon.com (instant at signup). Empty tag =
 * links still work as plain Amazon searches, they just don't earn yet.
 *
 * Amazon requires the disclosure "As an Amazon Associate we earn from
 * qualifying purchases" wherever its links appear - curatedCatalogNotice()
 * below carries it, and the Shop/Explore screens render it.
 */
const AMAZON_ASSOCIATE_TAG = 'thirtythreetr-20';

/**
 * Awin: the boutique-merchant layer. Awin monetizes per-merchant deeplinks -
 * an awin1.com redirect wrapping the retailer's own URL - so unlike the
 * Amazon fallback, the user lands on the actual boutique's site and the
 * commission comes from that merchant's program (often 10%+ vs Amazon's ~4%).
 *
 * Both values are public identifiers (they appear in every link), so client
 * code is the right place for them:
 *   AWIN_AFFILIATE_ID - your publisher id, shown in the Awin dashboard header
 *     after signup.
 *   AWIN_MERCHANTS - retailer name (exactly as it appears in the catalogue)
 *     -> that merchant's Awin advertiser id (awinmid), added one by one as
 *     merchant applications are approved. Etsy is the first target.
 *
 * Any catalogue product whose retailer is in the map monetizes through Awin
 * automatically; everything else falls back to the tagged Amazon search.
 */
const AWIN_AFFILIATE_ID = '3063969';
const AWIN_MERCHANTS: Record<string, string> = {
  // 'Etsy': '<awinmid>',  <- paste the advertiser id once the Etsy program approves
};

function awinDeeplink(product: Product): string | null {
  if (!AWIN_AFFILIATE_ID) return null;
  const merchantId = AWIN_MERCHANTS[product.retailer];
  if (!merchantId) return null;
  return `https://www.awin1.com/cread.php?awinmid=${merchantId}&awinaffid=${encodeURIComponent(AWIN_AFFILIATE_ID)}&ued=${encodeURIComponent(product.sourceUrl)}`;
}

/**
 * Rakuten Advertising: same shape as the Awin layer, different network.
 * Etsy moved its affiliate program here (verified 2026-08-29 - their apply
 * flow hands off to an affiliatehub run by Rakuten Advertising), so Etsy's
 * catalogue items monetize through this the moment the publisher account
 * and the Etsy program approve. Ids are public link parameters.
 *   RAKUTEN_PUBLISHER_ID - the publisher/site id from the Rakuten dashboard.
 *   RAKUTEN_MERCHANTS - retailer name -> Rakuten advertiser id (mid).
 */
const RAKUTEN_PUBLISHER_ID = '';
const RAKUTEN_MERCHANTS: Record<string, string> = {
  // 'Etsy': '<mid>',  <- paste Etsy's advertiser id once the program approves
};

function rakutenDeeplink(product: Product): string | null {
  if (!RAKUTEN_PUBLISHER_ID) return null;
  const merchantId = RAKUTEN_MERCHANTS[product.retailer];
  if (!merchantId) return null;
  return `https://click.linksynergy.com/deeplink?id=${encodeURIComponent(RAKUTEN_PUBLISHER_ID)}&mid=${merchantId}&murl=${encodeURIComponent(product.sourceUrl)}`;
}

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
    // BALANCED_CATALOG, not MOCK_CATALOG: pagination truncates, and the raw
    // catalogue is grouped by category, so a page of the raw order is all
    // tops - which starved the outfit engine of bottoms and blanked the
    // starter Home. The balanced order makes every page a category mix.
    const filtered = sortProducts(applyFiltersLocally(BALANCED_CATALOG, filters), filters.sort);
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

/**
 * Amazon Associates over the curated catalogue.
 *
 * Same product set as the mock adapter - the difference is the money: every
 * outbound link becomes an Amazon search for that garment with the associate
 * tag attached, so a purchase within Amazon's attribution window pays
 * commission. No Product API involved: Amazon locks live search behind the
 * first 3 sales, but tag-on-search-link works from day one, which is the
 * entire point of starting here.
 */
class AmazonAssociatesAdapter extends MockCatalogAdapter {
  async wrapLink(product: Product): Promise<string> {
    // Best monetization first: a merchant deeplink lands the user on the
    // actual retailer at the retailer's commission rate. Awin and Rakuten
    // merchant maps are disjoint (a retailer lives on one network), so
    // order between them is moot; both beat the Amazon fallback.
    const awin = awinDeeplink(product);
    if (awin) return awin;
    const rakuten = rakutenDeeplink(product);
    if (rakuten) return rakuten;

    // The department qualifier keeps Amazon's results in the right aisle - a
    // search for a men's oxford shirt without it comes back mixed.
    const dept =
      product.department === 'men' ? "men's " : product.department === 'women' ? "women's " : '';
    const query = encodeURIComponent(`${dept}${product.brand} ${product.name}`.trim());
    const tag = AMAZON_ASSOCIATE_TAG ? `&tag=${encodeURIComponent(AMAZON_ASSOCIATE_TAG)}` : '';
    return `https://www.amazon.com/s?k=${query}${tag}`;
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

const searchSkimlinksProductsFn = httpsCallable(functions, 'searchSkimlinksProducts');

class SkimlinksAdapter implements AffiliateNetworkAdapter {
  async search(filters: ProductSearchFilters): Promise<ProductSearchResult> {
    const result = await searchSkimlinksProductsFn(filters);
    const data = result.data as any;
    const products = (data.products || []) as Product[];

    // Skimlinks honours query and price range; brand, colour and size filters
    // have to be applied here or they would silently do nothing.
    const refined = sortProducts(applyFiltersLocally(products, filters), filters.sort);

    return {
      products: refined,
      hasMore: !!data.hasMore,
      totalCount: typeof data.totalCount === 'number' ? data.totalCount : null,
    };
  }

  /**
   * Skimlinks' Product API is search-only; there is no fetch-by-id.
   * ResilientAdapter serves detail views from the index it builds out of
   * search results, which is what keeps Product Detail working.
   */
  async getById(): Promise<Product | null> {
    return null;
  }

  async getByIds(): Promise<Product[]> {
    return [];
  }

  async wrapLink(product: Product): Promise<string> {
    // Search results carry the plain merchant URL; monetization happens here,
    // at click time. The product id rides along as xcust so per-product
    // performance shows up in Skimlinks reporting.
    const result = await wrapAffiliateLinkFn({
      network: 'skimlinks',
      productId: product.id,
      sourceUrl: product.sourceUrl,
      cuid: product.id,
    });
    return (result.data as any).wrappedUrl as string;
  }

  async getFacets() {
    // A live network's brand list is far too large to enumerate; filter UI
    // falls back to whatever is present in the current result set.
    return { brands: [], retailers: [] };
  }
}

const searchEbayProductsFn = httpsCallable(functions, 'searchEbayProducts');

/**
 * eBay Partner Network over the Browse API.
 *
 * The Cloud Function holds the developer keys and the EPN campaign id; with
 * the campaign id in the request context, eBay returns item URLs that are
 * already affiliatized - so wrapLink is a pass-through, and re-wrapping
 * would break attribution.
 */
class EbayPartnerNetworkAdapter implements AffiliateNetworkAdapter {
  async search(filters: ProductSearchFilters): Promise<ProductSearchResult> {
    const result = await searchEbayProductsFn(filters);
    const data = result.data as any;
    const products = (data.products || []) as Product[];

    // Browse honours keyword, price and condition; colour, size and brand
    // filters have to land here or they would silently do nothing.
    const refined = sortProducts(applyFiltersLocally(products, filters), filters.sort);

    return {
      products: refined,
      hasMore: !!data.hasMore,
      totalCount: typeof data.totalCount === 'number' ? data.totalCount : null,
    };
  }

  /** Browse search is the only surface we use; detail views come from the
   *  ResilientAdapter's session index, same as Sovrn and Skimlinks. */
  async getById(): Promise<Product | null> {
    return null;
  }

  async getByIds(): Promise<Product[]> {
    return [];
  }

  async wrapLink(product: Product): Promise<string> {
    return product.sourceUrl;
  }

  async getFacets() {
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
    // Route by origin: a Rakuten or eBay link is already tracked, a
    // Skimlinks product must wrap through Skimlinks, and a curated-catalogue
    // id wraps through Amazon when that member is present - crossing
    // networks sends the commission to the wrong place or breaks
    // attribution entirely.
    const origin = product.id.startsWith('rakuten-')
      ? 'Rakuten'
      : product.id.startsWith('skimlinks-')
        ? 'Skimlinks'
        : product.id.startsWith('ebay-')
          ? 'eBay'
          : this.members.some(m => m.name === 'Amazon')
            ? 'Amazon'
            : 'Sovrn';
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
const skimlinksAdapter = new SkimlinksAdapter();
const amazonAdapter = new AmazonAssociatesAdapter();
const ebayAdapter = new EbayPartnerNetworkAdapter();

const adapters: Record<MarketplaceProvider, AffiliateNetworkAdapter> = {
  mock: new ResilientAdapter(new MockCatalogAdapter()),
  amazon: new ResilientAdapter(amazonAdapter),
  ebay: new ResilientAdapter(ebayAdapter),
  // The low-barrier pair together: curated Amazon picks plus live eBay
  // inventory (which also lights up the secondhand filter for real).
  starter: new ResilientAdapter(
    new CompositeAdapter([
      { name: 'Amazon', adapter: amazonAdapter },
      { name: 'eBay', adapter: ebayAdapter },
    ])
  ),
  sovrn: new ResilientAdapter(sovrnAdapter),
  rakuten: new ResilientAdapter(rakutenAdapter),
  skimlinks: new ResilientAdapter(skimlinksAdapter),
  both: new ResilientAdapter(
    new CompositeAdapter([
      { name: 'Skimlinks', adapter: skimlinksAdapter },
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

/**
 * A tagged Amazon search for an arbitrary phrase - the bridge over the
 * bootstrap gap: until Amazon's Product API unlocks (3 qualifying sales),
 * the app cannot pull Amazon's catalogue in, but it can always send the
 * user out to exactly what they're looking for, monetized. Used by trend
 * surfaces to search the gap phrase ("camel wide-leg trousers") directly.
 */
export function amazonSearchUrl(query: string): string {
  const tag = AMAZON_ASSOCIATE_TAG ? `&tag=${encodeURIComponent(AMAZON_ASSOCIATE_TAG)}` : '';
  return `https://www.amazon.com/s?k=${encodeURIComponent(query.trim())}${tag}`;
}

/**
 * The honesty line for curated-catalogue providers, or null on a live feed.
 * Under Amazon it also carries the disclosure wording Amazon's operating
 * agreement requires wherever its links appear.
 */
export function curatedCatalogNotice(): string | null {
  if (MARKETPLACE_PROVIDER === 'mock') {
    return (
      'Showing a sample catalogue with representative photos, not exact product shots. Connect ' +
      'a retail partner and these become live, purchasable products — the scoring is already real.'
    );
  }
  if (MARKETPLACE_PROVIDER === 'amazon') {
    return (
      'Picks curated by us; photos are representative, not exact product shots, and each piece ' +
      'links to a matching search on Amazon rather than a specific in-stock item. As an Amazon ' +
      'Associate we earn from qualifying purchases.'
    );
  }
  if (MARKETPLACE_PROVIDER === 'starter') {
    return (
      'A mix of picks curated by us (representative photos, linking to matching Amazon ' +
      'searches) and live eBay listings. As an Amazon Associate we earn from qualifying purchases.'
    );
  }
  return null;
}

/** Recorded on outbound clicks so mock traffic is never mistaken for real. */
export function activeProviderName(): MarketplaceProvider {
  return MARKETPLACE_PROVIDER;
}

export const DEFAULT_PRODUCT_PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * Affiliate network integration point. Everything in the app that needs
 * products or a monetized link goes through `getActiveAdapter()` - swapping
 * from the mock catalog to a real network is a one-line change here, nothing
 * else in the app needs to know which provider is active.
 *
 * IMPORTANT: the real Sovrn/Skimlinks API key must never ship in client code
 * (the RN bundle is inspectable). SovrnCommerceAdapter calls Cloud Functions
 * (searchMarketplaceProducts / wrapAffiliateLink in functions/src/index.ts),
 * which hold the real key server-side via functions.config().
 *
 * To go live: get a Sovrn Commerce (or Skimlinks) account + API key, set it
 * via `firebase functions:config:set sovrn.key="..." sovrn.pubid="..."`,
 * redeploy functions, then flip MARKETPLACE_PROVIDER below to 'sovrn'.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { Product, ProductSearchFilters } from '../models/product';
import { MOCK_CATALOG } from '../data/mockProductCatalog';

type MarketplaceProvider = 'mock' | 'sovrn';
const MARKETPLACE_PROVIDER: MarketplaceProvider = 'mock';

export interface AffiliateNetworkAdapter {
  search(filters: ProductSearchFilters): Promise<Product[]>;
  getById(productId: string): Promise<Product | null>;
  // Returns a monetized redirect URL for the given product's sourceUrl.
  wrapLink(product: Product): Promise<string>;
}

function matchesFilters(product: Product, filters: ProductSearchFilters): boolean {
  if (filters.category && product.category !== filters.category) return false;
  if (typeof filters.maxPrice === 'number' && product.price > filters.maxPrice) return false;
  if (filters.onSaleOnly && !(product.originalPrice && product.originalPrice > product.price)) return false;
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const haystack = [product.name, product.brand, product.retailer, ...(product.styleTags || [])]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

class MockCatalogAdapter implements AffiliateNetworkAdapter {
  async search(filters: ProductSearchFilters): Promise<Product[]> {
    // Simulated network latency so loading states are exercised realistically.
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_CATALOG.filter(p => matchesFilters(p, filters));
  }

  async getById(productId: string): Promise<Product | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return MOCK_CATALOG.find(p => p.id === productId) || null;
  }

  async wrapLink(product: Product): Promise<string> {
    // No real network configured yet - the deep link goes straight to the
    // (fictional) retailer page. Once a real adapter is active, this call
    // returns an actual monetized redirect URL instead.
    return product.sourceUrl;
  }
}

const wrapAffiliateLinkFn = httpsCallable(functions, 'wrapAffiliateLink');
const searchMarketplaceProductsFn = httpsCallable(functions, 'searchMarketplaceProducts');

class SovrnCommerceAdapter implements AffiliateNetworkAdapter {
  async search(filters: ProductSearchFilters): Promise<Product[]> {
    const result = await searchMarketplaceProductsFn(filters);
    return (result.data as any).products as Product[];
  }

  async getById(productId: string): Promise<Product | null> {
    const result = await searchMarketplaceProductsFn({ productId });
    const products = (result.data as any).products as Product[];
    return products[0] || null;
  }

  async wrapLink(product: Product): Promise<string> {
    const result = await wrapAffiliateLinkFn({ productId: product.id, sourceUrl: product.sourceUrl });
    return (result.data as any).wrappedUrl as string;
  }
}

const adapters: Record<MarketplaceProvider, AffiliateNetworkAdapter> = {
  mock: new MockCatalogAdapter(),
  sovrn: new SovrnCommerceAdapter(),
};

export function getActiveAdapter(): AffiliateNetworkAdapter {
  return adapters[MARKETPLACE_PROVIDER];
}

export function isMockProvider(): boolean {
  return MARKETPLACE_PROVIDER === 'mock';
}

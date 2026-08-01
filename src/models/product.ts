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
}

export function isOnSale(product: Product): boolean {
  return typeof product.originalPrice === 'number' && product.originalPrice > product.price;
}

export function discountPercent(product: Product): number | null {
  if (!isOnSale(product) || !product.originalPrice) return null;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}

export interface ProductSearchFilters {
  query?: string;
  category?: ItemCategory;
  maxPrice?: number;
  onSaleOnly?: boolean;
  condition?: 'new' | 'secondhand';
}

/** A product ranked against a user's style profile - what ShopScreen actually renders. */
export interface MatchedProduct {
  product: Product;
  matchScore: number; // 0-100
  matchReasons: string[]; // e.g. ["In your color season", "Fills a gap: you have 0 shoes"]
}

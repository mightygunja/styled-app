/**
 * Turning a live Channel3 product into a piece the app may show - or
 * refusing it. Same contract as ebayListing.ts: nobody at 33 Trends has
 * looked at these, so the rules are applied by code and the default is no.
 *
 * Channel3 labels every product itself (docs: guides/response-overview):
 * `gender` is 'male', 'female' or 'unisex', `age` is an age group, and
 * `category` is a place in its taxonomy. So:
 *
 *   - DEPARTMENT is Channel3's own gender label and must be exactly the
 *     department that was searched. No label, or 'unisex', is refused -
 *     a live feed has no "for everyone" rack in this app.
 *   - AGE must be adult (or unstated, with a title that does not say kids).
 *   - The TITLE must agree with the department (titleFitsDepartment), and
 *     must be one wearable piece.
 *   - It must land in one of the app's clothing categories; a phone case
 *     that matched a search is not filed as a top.
 *   - Photo, price and buy link must all be present, over https.
 *
 * The photo and title are the retailer's own, and the link is Channel3's
 * tracked link to that same listing.
 *
 * Pure - no Firebase, no React Native - so scripts/auditChannel3Listings.ts
 * runs the real thing.
 */

import { Product } from '../models/product';
import { ItemCategory } from '../types';
import { titleFitsDepartment } from './departmentFit';
import { KIDS, NOT_ONE_PIECE, ListingDepartment, listingCategory } from './ebayListing';

/** What the searchChannel3Products function returns per product. */
export interface RawChannel3Listing {
  id?: string;
  name?: string;
  brand?: string;
  /** Channel3's own label: 'male' | 'female' | 'unisex' | null. */
  gender?: string | null;
  /** 'newborn' | 'infant' | 'toddler' | 'kids' | 'adult' | null. */
  age?: string | null;
  /** Channel3's category title and path, by name. */
  categoryNames?: string[];
  imageUrl?: string;
  price?: number;
  originalPrice?: number | null;
  currency?: string;
  /** Channel3's tracked buy link for the chosen offer. */
  sourceUrl?: string;
  /** The store the offer is from, e.g. "nordstrom.com". */
  domain?: string;
  condition?: string | null;
}

/** The label Channel3 uses for each of the app's departments. */
export const CHANNEL3_GENDER: Record<ListingDepartment, 'female' | 'male'> = { women: 'female', men: 'male' };

const https = (url: string | undefined) => /^https:\/\/[a-z0-9.-]+\//i.test(url || '');

/**
 * "www.nordstrom.com" -> "nordstrom.com", "us.sunspel.com" -> "sunspel.com":
 * what the Shop button names. Only a storefront prefix is dropped; a country
 * ending ("next.co.uk", "oakandfort.ca") is part of which store it is and stays.
 */
function storeName(domain: string | undefined): string {
  const host = String(domain || '').trim().toLowerCase();
  const labels = host.split('.');
  return labels.length > 2 && /^(www|us|shop|store|global|en)$/.test(labels[0]) ? labels.slice(1).join('.') : host;
}

/**
 * The piece to show for a product searched for `department`, or null.
 * `category`, when the shopper has chosen one, must match.
 */
export function acceptChannel3Listing(
  raw: RawChannel3Listing,
  department: ListingDepartment,
  options: { category?: ItemCategory } = {}
): Product | null {
  const title = String(raw.name || '').replace(/\s+/g, ' ').trim();
  const price = Number(raw.price);
  const store = storeName(raw.domain);
  if (!raw.id || !title || !(price > 0) || !store) return null;
  if (!https(raw.imageUrl) || !https(raw.sourceUrl)) return null;

  // Channel3's own label must say this department, and only this one.
  if (String(raw.gender || '').toLowerCase() !== CHANNEL3_GENDER[department]) return null;
  const age = String(raw.age || '').toLowerCase();
  if (age && age !== 'adult') return null;

  // ...and the retailer's words must not say otherwise.
  const text = title.toLowerCase().replace(/[’`]/g, "'");
  if (KIDS.test(text) || NOT_ONE_PIECE.test(text)) return null;
  if (!titleFitsDepartment(title, department)) return null;

  const category = listingCategory(title, raw.categoryNames);
  if (!category) return null;
  if (options.category && options.category !== category) return null;

  const original = Number(raw.originalPrice);
  const used = /used|refurbished|pre-?owned/i.test(String(raw.condition || ''));
  return {
    id: String(raw.id).startsWith('c3-') ? String(raw.id) : `c3-${raw.id}`,
    name: title.length > 90 ? `${title.slice(0, 87).trimEnd()}...` : title,
    brand: String(raw.brand || '').trim(),
    retailer: store,
    category,
    price,
    ...(original > price ? { originalPrice: original } : {}),
    currency: String(raw.currency || 'USD'),
    imageUrl: String(raw.imageUrl),
    sourceUrl: String(raw.sourceUrl),
    inStock: true,
    condition: used ? 'secondhand' : 'new',
    department,
  };
}

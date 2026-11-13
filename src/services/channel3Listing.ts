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
import { colorFromDescription } from './colorName';
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
  /** Channel3's `max_commission_rate` for the chosen offer; 0 = the store pays nothing. */
  commissionRate?: number | null;
  /** Channel3's own descriptive attributes, as short phrases ("relaxed fit", "linen"). */
  tags?: string[];
  /** False when a re-read found the product sold out. Absent = in stock. */
  inStock?: boolean;
  /** The kind of photo `imageUrl` is, as Channel3 classifies it ('hero', 'on_model', ...). */
  shot?: string | null;
  /** Who Channel3's photo descriptions name across ALL of the product's photos. */
  people?: Array<'woman' | 'man'>;
  /** Who the description of `imageUrl` itself names, if anyone. */
  imageWho?: 'woman' | 'man' | null;
  /** A photo of the product alone, when it has one. */
  productOnlyUrl?: string | null;
  /** Channel3's description of `imageUrl` and of `productOnlyUrl`: what each photo shows. */
  imageAlt?: string | null;
  productOnlyAlt?: string | null;
}

/** The label Channel3 uses for each of the app's departments. */
export const CHANNEL3_GENDER: Record<ListingDepartment, 'female' | 'male'> = { women: 'female', men: 'male' };

/** Who a department's photos may show, in the words the photo descriptions use. */
const CHANNEL3_PERSON: Record<ListingDepartment, 'woman' | 'man'> = { women: 'woman', men: 'man' };

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

/** Shots of the product alone, with nobody in them. */
const PRODUCT_ONLY = new Set(['hero', 'flat_lay', 'angle_view']);

/**
 * The photo a card may show, or null when the product has none that is safe.
 *
 * A photo with a person in it is shown only when Channel3's description of
 * that photo names the right person ("Man wearing a linen shirt"). "Model
 * wearing..." says nothing, so the product's own product-only photo is used
 * instead; a product with neither is not shown. The same contract as the
 * catalogue's shared pieces: no person unless the person is known.
 */
function cardPhoto(raw: RawChannel3Listing, own: 'woman' | 'man'): { url: string; description: string } | null {
  const shot = raw.shot ? String(raw.shot) : null;
  if (https(raw.imageUrl) && ((shot && PRODUCT_ONLY.has(shot)) || raw.imageWho === own)) {
    return { url: String(raw.imageUrl), description: String(raw.imageAlt || '') };
  }
  if (https(raw.productOnlyUrl || undefined)) {
    return { url: String(raw.productOnlyUrl), description: String(raw.productOnlyAlt || '') };
  }
  return null;
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

  // The PHOTOS must agree as well. Channel3 describes every photo; a product
  // any of whose photos shows the other department's person is refused, and
  // a feed that does not say who is in the photos is refused outright.
  if (!Array.isArray(raw.people)) return null;
  const own = CHANNEL3_PERSON[department];
  if (raw.people.some(person => person !== own)) return null;
  const photo = cardPhoto(raw, own);
  if (!photo) return null;

  // ...and the retailer's words must not say otherwise.
  const text = title.toLowerCase().replace(/[’`]/g, "'");
  if (KIDS.test(text) || NOT_ONE_PIECE.test(text)) return null;
  // "Unisex" in the title: a live feed has no for-everyone rack in this app.
  if (/\bunisex\b/.test(text)) return null;
  if (!titleFitsDepartment(title, department)) return null;

  const category = listingCategory(title, raw.categoryNames);
  if (!category) return null;
  if (options.category && options.category !== category) return null;

  // Where Channel3 files it must agree with the department too: a product
  // labelled male but filed under Skirts is refused whatever its title says.
  const shelf = String(raw.categoryNames?.[0] || '').replace(/\s+/g, ' ').trim();
  if (shelf && !titleFitsDepartment(shelf, department)) return null;

  // Channel3's descriptive attributes feed the personal match. Each is kept
  // only if it is a short phrase that fits the department on its own.
  const tags = (Array.isArray(raw.tags) ? raw.tags : [])
    .map(tag => String(tag || '').toLowerCase().replace(/\s+/g, ' ').trim())
    .filter(tag => tag.length > 1 && tag.length <= 28 && titleFitsDepartment(tag, department))
    .slice(0, 12);
  // The colour of the photo the card shows, when its description makes that clear.
  const color = colorFromDescription(photo.description, `${title} ${shelf}`);

  const original = Number(raw.originalPrice);
  const used = /used|refurbished|pre-?owned/i.test(String(raw.condition || ''));
  return {
    id: String(raw.id).startsWith('c3-') ? String(raw.id) : `c3-${raw.id}`,
    name: title.length > 90 ? `${title.slice(0, 87).trimEnd()}...` : title,
    brand: String(raw.brand || '').trim(),
    retailer: store,
    category,
    ...(shelf ? { subcategory: shelf.toLowerCase() } : {}),
    // Stated only when the photo's description makes it clear (see colorName.ts).
    ...(color ? { color } : {}),
    ...(tags.length ? { styleTags: tags } : {}),
    price,
    ...(original > price ? { originalPrice: original } : {}),
    currency: String(raw.currency || 'USD'),
    imageUrl: photo.url,
    sourceUrl: String(raw.sourceUrl),
    inStock: raw.inStock !== false,
    condition: used ? 'secondhand' : 'new',
    department,
    // Only stated when Channel3 stated it: an unknown rate is not "unpaid".
    ...(typeof raw.commissionRate === 'number' ? { paysCommission: raw.commissionRate > 0 } : {}),
  };
}

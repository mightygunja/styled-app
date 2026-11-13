/**
 * Turning a live eBay listing into a piece the app may show - or refusing it.
 *
 * A live feed is the first source of pieces nobody at 33 Trends has looked
 * at, so the rules a person applied to the curated catalogue are applied
 * here by code, and the default is refusal:
 *
 *   - DEPARTMENT comes from eBay's own category path ("Women's Clothing",
 *     "Men's Shoes"), never from a guess. A listing eBay files under
 *     neither - or under both, or under kids' or unisex categories - is not
 *     shown to anyone. There is no "unknown, so show it to everybody".
 *   - The TITLE must agree. Sellers mis-file listings, so a piece in a men's
 *     category whose title says "women's" or names a skirt is dropped, and
 *     the reverse.
 *   - It has to be ONE wearable piece the app can place in a category: no
 *     job lots, costumes, sewing patterns or spare parts.
 *   - It needs a photo, a price and a link back to eBay.
 *
 * The photo and the words on the card are the seller's own listing, and the
 * link goes to that exact listing - which is what makes them agree.
 *
 * Pure - no Firebase, no React Native - so scripts/auditEbayListings.ts
 * runs the real thing.
 */

import { Product } from '../models/product';
import { ItemCategory } from '../types';
import { titleFitsDepartment } from './departmentFit';

/** What the searchEbayProducts function returns per listing. */
export interface RawEbayListing {
  id?: string;
  name?: string;
  brand?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  color?: string;
  sourceUrl?: string;
  condition?: 'new' | 'secondhand';
  /** eBay's category path for the listing, every level, by name. */
  categoryNames?: string[];
}

export type ListingDepartment = 'women' | 'men';

export const KIDS = /\b(?:kids?|boys?|girls?|toddlers?|bab(?:y|ies)|infants?|youth|juniors?|newborns?|child(?:ren)?(?:'s)?)\b/;
export const NOT_ONE_PIECE =
  /\b(?:lots?|bundles?|wholesale|bulk|(?:\d+|two|three|four|five|six)[\s-]?packs?|pack of (?:\d+|two|three|four|five|six)|multi-?packs?|gift sets?|costumes?|cosplay|halloween|sewing pattern|pattern only|replacement|repair kit|fabric by|patch(?:es)?|dolls?|mannequins?|hangers?)\b/;

const lower = (text: string) => (text || '').toLowerCase().replace(/[’`]/g, "'");

/**
 * The department eBay itself files a listing under, or null when it is not
 * exactly one of the two.
 */
export function listingDepartment(categoryNames: string[] | undefined): ListingDepartment | null {
  const names = (categoryNames || []).map(lower).map(n => n.trim()).filter(Boolean);
  if (names.length === 0) return null;
  if (names.some(n => KIDS.test(n) || /\bunisex\b/.test(n))) return null;
  const women = names.some(n => /^women(?:'s)?\b/.test(n));
  const men = names.some(n => /^men(?:'s)?\b/.test(n));
  if (women === men) return null;
  return women ? 'women' : 'men';
}

const CATEGORY_RULES: Array<[ItemCategory, RegExp]> = [
  ['shoes', /\b(?:shoes?|sneakers?|boots?|loafers?|sandals?|heels|pumps|flats|oxfords?|slippers?|mules?|espadrilles?|trainers?|clogs?)\b/],
  [
    'accessories',
    /\b(?:bags?|handbags?|totes?|backpacks?|wallets?|belts?|scarf|scarves|hats?|caps?|beanies?|gloves|sunglasses|watch(?:es)?|ties?|jewelry|jewellery|necklaces?|earrings?|bracelets?|socks|tights|accessories)\b/,
  ],
  // "dress shirt", "dress pants" and "dress shoes" are not dresses.
  ['dresses', /\b(?:dress(?:es)?(?![\s-]+(?:shirts?|pants|trousers|shoes?|socks?|belts?|boots?))|gowns?|jumpsuits?|rompers?)\b/],
  ['outerwear', /\b(?:coats?|jackets?|blazers?|parkas?|vests?|trench|puffers?|overcoats?|windbreakers?|suits?)\b/],
  ['bottoms', /\b(?:pants|trousers|jeans|shorts|skirts?|leggings|chinos|joggers|sweatpants)\b/],
  [
    'tops',
    /\b(?:shirts?|tees?|t-shirts?|tops?|blouses?|sweaters?|cardigans?|hoodies?|sweatshirts?|polos?|tanks?|tunics?|pullovers?|henleys?|jerseys?|knitwear)\b/,
  ],
];

/**
 * Which of the app's categories a listing belongs in. eBay's leaf category
 * is trusted first ("Dresses", "Coats, Jackets & Vests"); the title only
 * decides when the category path names no kind of piece. Null when neither
 * does - the listing is then not shown rather than filed as a top.
 */
export function listingCategory(title: string, categoryNames: string[] | undefined): ItemCategory | null {
  // Department headers ("Men's Clothing", "Women's Shoes") say which rack,
  // and the leaf says which piece - so read the path from the leaf inwards.
  for (const name of [...(categoryNames || [])].map(lower)) {
    if (/^(?:women|men)(?:'s)?\s+clothing$|^clothing, shoes/.test(name.trim())) continue;
    const hit = CATEGORY_RULES.find(([, pattern]) => pattern.test(name));
    if (hit) return hit[0];
  }
  const hit = CATEGORY_RULES.find(([, pattern]) => pattern.test(lower(title)));
  return hit ? hit[0] : null;
}

const isEbayUrl = (url: string): boolean => {
  const match = /^https:\/\/([a-z0-9.-]+)\//i.exec(url || '');
  return !!match && /(^|\.)ebay\.com$/i.test(match[1]);
};

/**
 * The piece to show for a listing searched for `department`, or null.
 * `category`, when the shopper has chosen one, must match.
 */
export function acceptListing(
  raw: RawEbayListing,
  department: ListingDepartment,
  options: { category?: ItemCategory } = {}
): Product | null {
  const title = String(raw.name || '').replace(/\s+/g, ' ').trim();
  const price = Number(raw.price);
  if (!raw.id || !title || !(price > 0)) return null;
  if (!/^https:\/\//i.test(raw.imageUrl || '') || !isEbayUrl(raw.sourceUrl || '')) return null;

  // eBay's own filing must say this department, and only this one.
  if (listingDepartment(raw.categoryNames) !== department) return null;

  // ...and the seller's words must not say otherwise.
  const text = lower(title);
  if (KIDS.test(text) || NOT_ONE_PIECE.test(text)) return null;
  if (!titleFitsDepartment(title, department)) return null;

  const category = listingCategory(title, raw.categoryNames);
  if (!category) return null;
  if (options.category && options.category !== category) return null;

  return {
    id: String(raw.id).startsWith('ebay-') ? String(raw.id) : `ebay-${raw.id}`,
    name: title.length > 90 ? `${title.slice(0, 87).trimEnd()}...` : title,
    brand: String(raw.brand || '').trim(),
    retailer: 'eBay',
    category,
    price,
    currency: String(raw.currency || 'USD'),
    imageUrl: String(raw.imageUrl),
    color: raw.color ? lower(String(raw.color)) : undefined,
    sourceUrl: String(raw.sourceUrl),
    inStock: true,
    condition: raw.condition === 'secondhand' ? 'secondhand' : 'new',
    department,
  };
}

/** The departments a live feed is searched for, per wardrobe choice. None until one is chosen. */
export function departmentsFor(focus: 'womens' | 'mens' | 'all' | undefined): ListingDepartment[] {
  if (focus === 'womens') return ['women'];
  if (focus === 'mens') return ['men'];
  if (focus === 'all') return ['women', 'men'];
  return [];
}

/**
 * The Amazon search a curated-catalogue card opens.
 *
 * A curated card links to a tagged Amazon SEARCH, not a product page (the
 * Product API unlocks after three qualifying sales), so the search phrase is
 * the whole product: it has to land the shopper on the piece the card shows.
 * It used to be `<department> <brand> <name>`, which had two faults:
 *
 *   - no colour. The card showed olive wide-leg trousers and the search was
 *     for "women's Everlane Wide-Leg Trousers" - any colour;
 *   - a brand Amazon does not sell. Everlane, COS, Zara, Mango and most of
 *     the catalogue's labels are not on Amazon, so the brand word was noise
 *     that steered results away from the garment.
 *
 * The phrase is now `<department> <brand, only if Amazon stocks it> <colour>
 * <name>`, with colour words the name already says left out. Pure string
 * work with no app imports, so scripts/auditShopLinks.ts can check every
 * card's link.
 */

import { Product } from '../models/product';

/**
 * The Amazon Associates tracking tag. Get one at
 * affiliate-program.amazon.com (instant at signup). Empty tag = links still
 * work as plain Amazon searches, they just don't earn yet.
 *
 * Amazon requires the disclosure "As an Amazon Associate we earn from
 * qualifying purchases" wherever its links appear - curatedCatalogNotice()
 * in affiliateNetwork.ts carries it, and the Shop/Explore screens render it.
 */
export const AMAZON_ASSOCIATE_TAG = 'thirtythreetr-20';

/**
 * Labels in the catalogue that Amazon carries, so naming them narrows the
 * search to the real thing. Anything not listed is left out of the phrase.
 * Add a brand only after confirming it has a storefront on amazon.com.
 */
const AMAZON_STOCKED_BRANDS = new Set(
  [
    "Levi's", 'Lee', 'Dockers', 'Dickies', 'Carhartt', 'Champion', 'Gap', 'Columbia', 'The North Face',
    'Barbour', 'Schott', 'London Fog', 'Lacoste', 'Free People', 'Theory', 'Vince', 'Eileen Fisher',
    'Rains', 'Spanx', 'Nike', 'Adidas', 'Puma', 'Converse', 'Clarks', 'Birkenstock', 'Dansko',
    'Dr. Martens', 'G.H. Bass', 'Thursday Boot Co', 'Allen Edmonds', 'Red Wing', 'Danner', 'Steve Madden',
    'Sam Edelman', 'Vince Camuto', 'Frye', 'Coach', 'Kate Spade', 'Bellroy', 'Ray-Ban', 'Le Specs', 'Seiko',
  ].map(brand => brand.toLowerCase())
);

/** Colour words that describe nothing a search can use. */
const VAGUE_COLOUR_WORDS = new Set(['multi', 'print', 'printed', 'bold']);

const words = (text: string): string[] => text.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);

/** The colour as the card states it, minus words the name already carries. */
function colourFor(product: Product): string {
  const inName = new Set(words(product.name));
  return words(product.color || '')
    .filter(word => !VAGUE_COLOUR_WORDS.has(word) && !inName.has(word))
    .join(' ');
}

/** The search phrase for a catalogue product: whose aisle, which label, what colour, what piece. */
export function amazonSearchPhrase(product: Product): string {
  // A name that already says whose aisle it is ("Women's Linen Blazer")
  // needs no second qualifier; cross-department pieces get none at all.
  const alreadyQualified = /\b(wo)?men'?s\b/i.test(product.name);
  const department = alreadyQualified
    ? ''
    : product.department === 'men'
      ? "men's"
      : product.department === 'women'
        ? "women's"
        : '';
  const brand = AMAZON_STOCKED_BRANDS.has((product.brand || '').toLowerCase()) ? product.brand : '';
  return [department, brand, colourFor(product), product.name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
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

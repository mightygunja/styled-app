/**
 * Channel3 (docs: channel3.ai/docs) - the parts that do not need Firebase:
 * turning Channel3's product into the row the app reads, and building the
 * "shelves" the Shop browses.
 *
 * Nothing here touches the network or the database directly. The caller
 * passes in `search` and `product`, so scripts/tryChannel3Shelves.cjs can run
 * exactly this code against the real API.
 *
 * Why shelves exist. A search costs a credit (1,000 a month are free) and
 * returns 30 products at most, so filling the Shop's browse view from
 * searches on every visit would spend the month's allowance in days.
 * Channel3's own rules (docs/guides/caching) are: product ids may be kept as
 * long as we like; prices, stock and buy links may not be kept for long and
 * are refreshed for free by product id. So a shelf is:
 *   - a list of product ids for one department and one category, found by a
 *     few searches and kept for a week;
 *   - a snapshot of those products, re-read by id (free) every few hours.
 */

export type Channel3Department = 'women' | 'men';
export type ShelfCategory = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'shoes' | 'accessories';

export const CHANNEL3_API = 'https://api.trychannel3.com/v1';

/** What searchChannel3Products returns per product (see src/services/channel3Listing.ts). */
export interface Channel3Row {
  id: string;
  name: string;
  brand: string;
  gender: string | null;
  age: string | null;
  categoryNames: string[];
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  currency: string;
  sourceUrl: string;
  domain: string;
  condition: string | null;
  /** 0 = this store pays nothing on this product; the Shop lists those last. */
  commissionRate: number;
  /** Channel3's own descriptive attributes ("relaxed fit", "linen", "midi"), for the personal match. */
  tags: string[];
  inStock: boolean;
  /** The kind of photo `imageUrl` is ('hero', 'on_model', ...), as Channel3 classifies it. */
  shot: string | null;
  /**
   * Who Channel3's own photo descriptions say appears in ANY of the
   * product's photos: 'woman', 'man', both or neither. The app refuses a
   * product whose photos show the other department's person, whatever its
   * gender label says (9 of 270 "male" products on the first real shelves
   * were photographed on a woman).
   */
  people: Array<'woman' | 'man'>;
  /** Who the description of `imageUrl` itself names, if anyone. */
  imageWho: 'woman' | 'man' | null;
  /** A photo of the product alone (no person), when the product has one. */
  productOnlyUrl: string | null;
  /** Channel3's description of `imageUrl` and of `productOnlyUrl` - what each photo actually shows. */
  imageAlt: string | null;
  productOnlyAlt: string | null;
}

/** Shots that do not show the piece as a whole. */
const POOR_SHOTS = new Set(['detail', 'size_chart', 'packaging', 'scale_reference', 'product_information']);

/** Shots of the product alone, with nobody in them. */
const PRODUCT_ONLY_SHOTS = new Set(['hero', 'flat_lay', 'angle_view']);

const SAYS_WOMAN = /\b(?:woman|women|female|girls?|lady|ladies|womenswear)\b/i;
const SAYS_MAN = /\b(?:man|men|male|boys?|guys?|gentleman|gentlemen|menswear)\b/i;

/** Who a photo's description names: 'woman', 'man', or null when it names neither or both. */
export function describedPerson(altText: any): 'woman' | 'man' | null {
  const text = String(altText || '');
  const woman = SAYS_WOMAN.test(text);
  const man = SAYS_MAN.test(text);
  return woman === man ? null : woman ? 'woman' : 'man';
}

/**
 * Womenswear worn in a photo says a woman is in it even when the description
 * only says "model" ("Model wearing brown boots, denim skirt, and plaid
 * blazer" - on a boot Channel3 labelled male). "Dress" does not fire inside
 * "dress shirt", "dress shoes" and the like.
 */
const WEARS_WOMENSWEAR =
  /\b(?:skirts?|blouses?|gowns?|bras?|bralettes?|lingerie|heels|stilettos?|dress(?:es)?(?![\s-]+(?:shirts?|shoes?|pants|trousers|slacks|socks?|boots?|belts?|watch(?:es)?|code|loafers?|oxfords?)))\b/i;

/** Everyone named across all of a product's photo descriptions. */
export function photoPeople(images: any[]): Array<'woman' | 'man'> {
  const texts = (Array.isArray(images) ? images : []).map(i => String(i?.alt_text || ''));
  const people: Array<'woman' | 'man'> = [];
  if (texts.some(t => SAYS_WOMAN.test(t) || WEARS_WOMENSWEAR.test(t))) people.push('woman');
  if (texts.some(t => SAYS_MAN.test(t))) people.push('man');
  return people;
}

/**
 * The photo to show: the retailer's own main photo, unless it is a close-up,
 * a size chart or the box. Checked against real answers (2026-11-13):
 * `cleaned_url` is framed tight to the product, and the app's 4:5 card then
 * cuts the ends off shoes and the shoulders off jackets, so the original is
 * used.
 */
export function channel3Photo(images: any[]): {
  url: string;
  shot: string | null;
  who: 'woman' | 'man' | null;
  productOnlyUrl: string | null;
  alt: string | null;
  productOnlyAlt: string | null;
} {
  const list = (Array.isArray(images) ? images : []).filter(i => i?.url);
  const whole = list.filter(i => !POOR_SHOTS.has(String(i.shot_type)));
  const pick = whole.find(i => i.is_main_image) || whole.find(i => i.shot_type === 'hero') || whole[0] || list[0];
  const alone = whole.find(i => PRODUCT_ONLY_SHOTS.has(String(i.shot_type)));
  const said = (image: any) => (image?.alt_text ? String(image.alt_text).replace(/\s+/g, ' ').trim().slice(0, 160) : null);
  if (!pick) return { url: '', shot: null, who: null, productOnlyUrl: null, alt: null, productOnlyAlt: null };
  return {
    url: String(pick.url),
    shot: pick.shot_type ? String(pick.shot_type) : null,
    who: describedPerson(pick.alt_text),
    productOnlyUrl: alone ? String(alone.url) : null,
    alt: said(pick),
    productOnlyAlt: alone ? said(alone) : null,
  };
}

export function channel3Image(images: any[]): string {
  return channel3Photo(images).url;
}

/**
 * Channel3's structured attributes, as short phrases the app's matching can
 * read. Only attributes that describe how the piece looks or is worn; a bare
 * "long" or "high" is tied to what it measures ("long sleeve", "high rise")
 * so it cannot be mistaken for something else. Never invented: every phrase
 * is a value Channel3 attached to this product.
 */
export function channel3Tags(attributes: any): string[] {
  if (!attributes || typeof attributes !== 'object') return [];
  const tags: string[] = [];
  const add = (value: any, suffix = '') => {
    const word = String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!word || word.length > 28) return;
    const tag = suffix && !word.includes(suffix.trim()) ? `${word}${suffix}` : word;
    if (!tags.includes(tag)) tags.push(tag);
  };
  for (const [key, raw] of Object.entries(attributes)) {
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (key === 'pattern') {
        if (String(value).toLowerCase() !== 'solid') add(value);
      } else if (key === 'fabric' || key === 'neckline' || key === 'occasion-style') add(value);
      else if (/(^|-)fit$/.test(key) && key !== 'shoe-fit') add(value, ' fit');
      else if (key === 'sleeve-length-type') add(value, ' sleeve');
      else if (key === 'skirt-dress-length-type') add(value, ' length');
      else if (key === 'waist-rise') add(value, ' rise');
      // Left out on purpose after reading real answers: 'activity' and the
      // shoe-style attributes are too often wrong ("yoga" and "peep toe" on
      // a brocade loafer) to quote back to a shopper as a reason.
    }
  }
  return tags.slice(0, 12);
}

/**
 * One Channel3 product as the row the app reads, or null when it cannot be
 * shown (no id, no title, no usable offer, no photo, no price).
 *
 * `anyAvailability` is for re-reading one product the shopper is looking at:
 * an out-of-stock product is still returned, marked `inStock: false`, so the
 * page can say so instead of showing an old in-stock snapshot.
 */
export function mapChannel3Product(
  item: any,
  options: { wantUsed?: boolean; anyAvailability?: boolean } = {}
): Channel3Row | null {
  const wantUsed = !!options.wantUsed;
  const usable = (Array.isArray(item?.offers) ? item.offers : []).filter(
    (o: any) => o?.url && o?.domain && wantUsed === /used|refurbished/i.test(String(o?.condition || ''))
  );
  // An offer with no availability data counts as in stock (Channel3's own rule).
  const available = (o: any) => !o?.availability || o.availability === 'InStock';
  const inStockOffers = usable.filter(available);
  const offers = inStockOffers.length > 0 ? inStockOffers : options.anyAvailability ? usable : [];
  // The offer that pays the most, when one pays; otherwise the first in stock.
  const rate = (o: any) => Number(o?.max_commission_rate) || 0;
  const offer = offers.reduce((best: any, o: any) => (rate(o) > rate(best) ? o : best), offers[0]);
  if (!item?.id || !item?.title || !offer) return null;
  // The docs show the amount under either name.
  const amount = Number(offer.price?.price ?? offer.price?.amount);
  const pathNames = Array.isArray(item.category?.path)
    ? item.category.path.map((n: any) => String(n?.title || n?.name || n || ''))
    : String(item.category?.path || '').split(/\s*[>/]\s*/);
  const photo = channel3Photo(item.images);
  const row: Channel3Row = {
    id: `c3-${item.id}`,
    name: String(item.title),
    brand: String(item.brands?.[0]?.name || ''),
    gender: item.gender ?? null,
    age: item.age ?? null,
    // Leaf first: the piece, then where it sits.
    categoryNames: [String(item.category?.title || ''), ...pathNames.reverse()].filter(Boolean),
    imageUrl: photo.url,
    price: amount,
    originalPrice: Number(offer.price?.compare_at_price) || null,
    currency: String(offer.price?.currency || 'USD'),
    sourceUrl: String(offer.url),
    domain: String(offer.domain),
    condition: offer.condition ?? null,
    commissionRate: rate(offer),
    tags: channel3Tags(item.structured_attributes),
    inStock: inStockOffers.length > 0,
    shot: photo.shot,
    people: photoPeople(item.images),
    imageWho: photo.who,
    productOnlyUrl: photo.productOnlyUrl,
    imageAlt: photo.alt,
    productOnlyAlt: photo.productOnlyAlt,
  };
  return row.imageUrl && row.price > 0 ? row : null;
}

/** The filters every Channel3 request carries: one gender, adults, in stock. */
export function channel3Filters(department: Channel3Department): Record<string, any> {
  return {
    gender: department === 'men' ? 'male' : 'female',
    age: ['adult'],
    availability: ['InStock'],
  };
}

// ==================== Shelves ====================

/**
 * What is searched to stock each shelf. Plain garment words: the department
 * comes from the gender filter, never from the words. Each is searched once
 * per price band (SHELF_PRICE_BANDS), so a full restock of every shelf, both
 * departments, is 99 credits a week.
 */
export const SHELF_QUERIES: Record<Channel3Department, Partial<Record<ShelfCategory, string[]>>> = {
  women: {
    tops: ['blouses and shirts', 'sweaters and knitwear', 't-shirts and tank tops'],
    bottoms: ['trousers and pants', 'jeans', 'skirts'],
    dresses: ['day dresses', 'evening dresses', 'jumpsuits'],
    outerwear: ['coats', 'jackets', 'blazers'],
    shoes: ['sneakers', 'boots', 'flats loafers and heels'],
    accessories: ['handbags', 'belts scarves and hats', 'sunglasses and jewelry'],
  },
  men: {
    tops: ['shirts', 'sweaters and knitwear', 't-shirts and polo shirts'],
    bottoms: ['trousers and chinos', 'jeans', 'shorts'],
    outerwear: ['coats', 'jackets', 'blazers and suit jackets'],
    shoes: ['sneakers', 'boots', 'loafers and oxfords'],
    accessories: ['bags and backpacks', 'belts ties and hats', 'watches and sunglasses'],
  },
};

export const SHELF_DEPARTMENTS: Channel3Department[] = ['women', 'men'];

/**
 * The three price bands of each shelf, in dollars: everyday is up to `low`,
 * investment is over `high`, mid-range is between.
 *
 * Left to themselves the retailers' own rankings stock a shelf top-heavy -
 * measured on the first page of the live shelves (2026-11-13): half the
 * womenswear dresses were over $500, a quarter over $2,600. A member who shops at
 * everyday prices had almost nothing to be shown. So every shelf is stocked
 * a third from each band, and the app then arranges what a member sees to
 * the mix of prices they asked for (src/services/priceMix.ts).
 *
 * The same numbers as PRICE_TIERS in src/services/priceMix.ts - the audit
 * fails if the two ever differ.
 */
export const SHELF_PRICE_BANDS: Record<ShelfCategory, { low: number; high: number }> = {
  tops: { low: 60, high: 160 },
  bottoms: { low: 80, high: 200 },
  dresses: { low: 100, high: 280 },
  outerwear: { low: 150, high: 400 },
  shoes: { low: 100, high: 280 },
  accessories: { low: 80, high: 250 },
};

export type ShelfPriceTier = 'low' | 'mid' | 'high';
const SHELF_PRICE_TIERS: ShelfPriceTier[] = ['low', 'mid', 'high'];

export function shelfPriceTier(category: ShelfCategory, price: number): ShelfPriceTier {
  const band = SHELF_PRICE_BANDS[category];
  return price <= band.low ? 'low' : price <= band.high ? 'mid' : 'high';
}

/** Channel3's price filter for each band (its limits are inclusive, in dollars). */
function priceFilters(category: ShelfCategory): Array<Record<string, number>> {
  const band = SHELF_PRICE_BANDS[category];
  return [
    { max_price: band.low },
    { min_price: band.low + 0.01, max_price: band.high },
    { min_price: band.high + 0.01 },
  ];
}

/**
 * A shelf of `size` from the rows found: a third from each price band, by
 * the price each product actually carries (not the band it was searched
 * under - a product can have several offers). Stores that pay come first
 * within a band. A band that cannot fill its third gives the places to the
 * others. The bands are dealt in turn, so any front part of the shelf is
 * even too.
 */
export function evenByPrice(rows: Channel3Row[], category: ShelfCategory, size: number = SHELF_SIZE): Channel3Row[] {
  const bands: Record<ShelfPriceTier, Channel3Row[]> = { low: [], mid: [], high: [] };
  payingFirst(rows).forEach(row => bands[shelfPriceTier(category, row.price)].push(row));
  const share = Math.floor(size / SHELF_PRICE_TIERS.length);
  const first = interleave(SHELF_PRICE_TIERS.map(tier => bands[tier].slice(0, share)));
  const spare = interleave(SHELF_PRICE_TIERS.map(tier => bands[tier].slice(share)));
  return [...first, ...spare].slice(0, size);
}

/**
 * Bump this whenever SHELF_QUERIES or SHELF_RETAILERS change: a shelf stocked
 * under another version is restocked by search at its next refresh instead
 * of waiting out the week.
 */
export const SHELF_VERSION = 3;

/**
 * The stores the shelves are stocked from. An open search answers with
 * whoever matches the words, and on real answers (2026-11-13) that meant
 * drop-shippers and bulk sellers beside the department stores. The browse
 * view is the app's own shop window, so it is stocked from retailers a
 * shopper already knows. Typed searches stay open to every store.
 * Channel3 takes plain domains here (filters.website_ids).
 */
export const SHELF_RETAILERS = [
  'nordstrom.com', 'nordstromrack.com', 'bloomingdales.com', 'macys.com', 'saksfifthavenue.com',
  'jcrew.com', 'bananarepublic.com', 'gap.com', 'uniqlo.com', 'madewell.com', 'abercrombie.com',
  'bonobos.com', 'everlane.com', 'cos.com', 'mango.com', 'massimodutti.com', 'levi.com',
  'ralphlauren.com', 'huckberry.com', 'rag-bone.com', 'theory.com', 'vince.com', 'clubmonaco.com',
  'revolve.com', 'shopbop.com', 'anthropologie.com', 'freepeople.com', 'thereformation.com',
  'net-a-porter.com', 'ssense.com', 'asos.com', 'hm.com', 'colehaan.com', 'zappos.com',
  'toryburch.com', 'coach.com', 'katespade.com', 'lululemon.com', 'nike.com', 'adidas.com',
  'jjill.com', 'chicos.com', 'whitehouseblackmarket.com', 'luckybrand.com', 'gant.com',
  'etonshirts.com', 'selfridges.com', 'modaoperandi.com', 'endclothing.com',
];

export function shelfCategories(department: Channel3Department): ShelfCategory[] {
  return Object.keys(SHELF_QUERIES[department]) as ShelfCategory[];
}

/** Products kept per shelf. */
export const SHELF_SIZE = 54;
/** Ids are found again by search (credits) this often. */
export const SHELF_IDS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** The snapshot (prices, stock, buy links) is re-read by id (free) this often. */
export const SHELF_SNAPSHOT_MAX_AGE_MS = 4 * 60 * 60 * 1000;
/** A snapshot older than this is not shown at all; the Shop falls back to a live search. */
export const SHELF_SERVE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface Shelf {
  department: Channel3Department;
  category: ShelfCategory;
  /** Channel3 product ids (without the app's "c3-" prefix), in shelf order. */
  ids: string[];
  idsAt: number;
  products: Channel3Row[];
  productsAt: number;
  /** SHELF_VERSION the ids were found under. */
  version?: number;
}

export interface ShelfDeps {
  /** One search (costs a credit). Null when the call failed. */
  search(body: Record<string, any>): Promise<any[] | null>;
  /** One product by Channel3 id (free). Null when it is gone or the call failed. */
  product(id: string): Promise<any | null>;
  now(): number;
}

export const shelfDocId = (department: Channel3Department, category: ShelfCategory) => `${department}-${category}`;

/** Whether a shelf can be shown as it stands. */
export function shelfServable(shelf: Shelf | null | undefined, now: number): shelf is Shelf {
  return !!shelf && Array.isArray(shelf.products) && shelf.products.length > 0 && now - shelf.productsAt < SHELF_SERVE_MAX_AGE_MS;
}

/** Whether a shelf should be refreshed (missing, or its snapshot has aged). */
export function shelfStale(shelf: Shelf | null | undefined, now: number): boolean {
  return (
    !shelf ||
    !shelf.products?.length ||
    shelf.version !== SHELF_VERSION ||
    now - shelf.productsAt >= SHELF_SNAPSHOT_MAX_AGE_MS
  );
}

/** a1 b1 c1 a2 b2 c2 ...: every search contributes to the front of the shelf. */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < longest; i++) lists.forEach(list => i < list.length && out.push(list[i]));
  return out;
}

/** Stores that pay first; order otherwise kept. */
function payingFirst(rows: Channel3Row[]): Channel3Row[] {
  return [...rows.filter(r => r.commissionRate > 0), ...rows.filter(r => !(r.commissionRate > 0))];
}

async function inBatches<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(run))));
  }
  return out;
}

/** Finds the shelf's products by search. Null when no search answered. */
async function discover(department: Channel3Department, category: ShelfCategory, deps: ShelfDeps): Promise<Channel3Row[] | null> {
  const queries = SHELF_QUERIES[department][category] || [];
  const answers: Channel3Row[][] = [];
  for (const query of queries) {
    // One search per price band, the three together: three requests at once
    // is well inside Channel3's ten a second.
    const banded = await Promise.all(
      priceFilters(category).map(price =>
        deps.search({
          query,
          filters: { ...channel3Filters(department), website_ids: SHELF_RETAILERS, price },
          limit: 30,
        })
      )
    );
    banded.forEach(items => {
      if (!items) return;
      answers.push(items.map(item => mapChannel3Product(item)).filter((r): r is Channel3Row => r !== null));
    });
  }
  if (answers.length === 0) return null;
  const seen = new Set<string>();
  const rows = interleave(answers).filter(row => (seen.has(row.id) ? false : (seen.add(row.id), true)));
  return evenByPrice(rows, category);
}

/**
 * Brings one shelf up to date and returns it, or returns `previous`
 * unchanged when nothing needed doing (or nothing could be done).
 *
 *   - snapshot still fresh                -> nothing to do;
 *   - ids fresh, snapshot aged            -> re-read every product by id (free);
 *   - ids aged or missing                 -> search again (credits); the
 *     search answers ARE a fresh snapshot, so no re-read is needed;
 *   - search unavailable                  -> keep the ids we have and re-read.
 *
 * Products that have gone or sold out drop off the shelf; when fewer than
 * half survive a re-read the shelf is restocked by search early.
 */
export async function refreshShelf(
  previous: Shelf | null,
  department: Channel3Department,
  category: ShelfCategory,
  deps: ShelfDeps,
  options: { force?: boolean } = {}
): Promise<Shelf | null> {
  const now = deps.now();
  if (!options.force && previous && !shelfStale(previous, now)) return previous;

  const idsFresh =
    !!previous &&
    previous.ids.length > 0 &&
    previous.version === SHELF_VERSION &&
    now - previous.idsAt < SHELF_IDS_MAX_AGE_MS;
  if (idsFresh && previous) {
    const rows = (
      await inBatches(previous.ids, 6, async id => {
        const item = await deps.product(id);
        return item ? mapChannel3Product(item) : null;
      })
    ).filter((r): r is Channel3Row => r !== null);
    if (rows.length * 2 >= previous.ids.length) {
      return { ...previous, products: payingFirst(rows), productsAt: deps.now() };
    }
    // Too many have gone: fall through and restock.
  }

  const found = await discover(department, category, deps);
  if (found && found.length > 0) {
    const at = deps.now();
    return {
      department,
      category,
      ids: found.map(r => r.id.replace(/^c3-/, '')),
      idsAt: at,
      products: found,
      productsAt: at,
      version: SHELF_VERSION,
    };
  }

  // No search available. Old ids are still good ids: re-read them.
  if (previous && previous.ids.length > 0 && !idsFresh) {
    const rows = (
      await inBatches(previous.ids, 6, async id => {
        const item = await deps.product(id);
        return item ? mapChannel3Product(item) : null;
      })
    ).filter((r): r is Channel3Row => r !== null);
    if (rows.length > 0) return { ...previous, products: payingFirst(rows), productsAt: deps.now() };
  }
  return previous;
}

/**
 * The rows to answer a browse (no typed search) with: one category's shelf,
 * or every category's dealt out in turn so the page is not all tops.
 */
export function shelfRows(shelves: Shelf[], limit: number): Channel3Row[] {
  const seen = new Set<string>();
  return interleave(shelves.map(s => s.products))
    .filter(row => (seen.has(row.id) ? false : (seen.add(row.id), true)))
    .slice(0, Math.max(1, limit));
}

// ==================== Kept searches (a trend's key pieces) ====================

/**
 * A trend page shows real products for each of the trend's key pieces
 * ("track jacket", "chelsea boot"). Searching for them on every visit would
 * cost a credit per piece per visit; the pieces a trend names do not change
 * from one visit to the next. So each (department, phrase) is searched once,
 * its product ids kept for thirty days, and its snapshot re-read by id (free)
 * when it has aged - the same bargain as the shelves, for a phrase instead
 * of a category.
 *
 * The rail shows a photo, a name and a store - never a price - and the
 * product page re-reads the product when it is opened, so a snapshot may be
 * up to twelve hours old here.
 */
export const KEPT_VERSION = 1;
export const KEPT_SIZE = 18;
export const KEPT_IDS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const KEPT_SNAPSHOT_MAX_AGE_MS = 12 * 60 * 60 * 1000;
/** Fewer than this from the named retailers and the search is widened to every store. */
export const KEPT_THIN = 6;

export interface KeptSearch {
  department: Channel3Department;
  query: string;
  ids: string[];
  idsAt: number;
  products: Channel3Row[];
  productsAt: number;
  version: number;
}

/** A phrase as it is searched and stored: lower case, plain characters, at most 60 long. Null when nothing usable is left. */
export function keptQuery(raw: any): string | null {
  const query = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9 '&-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .trim();
  return query.length >= 3 ? query : null;
}

export const keptDocId = (department: Channel3Department, query: string) =>
  `${department}-${query.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;

/**
 * Whether a kept search can be answered as it stands. An empty answer counts:
 * "nothing found for this phrase" is worth remembering too, or every visit
 * would pay to learn it again.
 */
export function keptFresh(kept: KeptSearch | null | undefined, now: number): boolean {
  return !!kept && kept.version === KEPT_VERSION && Array.isArray(kept.products) && now - kept.productsAt < KEPT_SNAPSHOT_MAX_AGE_MS;
}

/**
 * Brings one kept search up to date. Returns `previous` when it is still
 * fresh, a new record when it was refreshed, and null when it could not be
 * (no search answered and nothing kept).
 */
export async function refreshKept(
  previous: KeptSearch | null,
  department: Channel3Department,
  query: string,
  deps: ShelfDeps
): Promise<KeptSearch | null> {
  const now = deps.now();
  if (previous && keptFresh(previous, now)) return previous;

  const reread = async (ids: string[]) =>
    (
      await inBatches(ids, 6, async id => {
        const item = await deps.product(id);
        return item ? mapChannel3Product(item) : null;
      })
    ).filter((r): r is Channel3Row => r !== null);

  const idsFresh = !!previous && previous.version === KEPT_VERSION && now - previous.idsAt < KEPT_IDS_MAX_AGE_MS;
  if (idsFresh && previous) {
    // Nothing was found last time, and that is still recent: nothing to re-read.
    if (previous.ids.length === 0) return { ...previous, productsAt: deps.now() };
    const rows = await reread(previous.ids);
    if (rows.length * 2 >= previous.ids.length) return { ...previous, products: payingFirst(rows), productsAt: deps.now() };
  }

  const ask = async (retailersOnly: boolean) => {
    const items = await deps.search({
      query,
      filters: { ...channel3Filters(department), ...(retailersOnly ? { website_ids: SHELF_RETAILERS } : {}) },
      limit: 30,
    });
    return items ? items.map(item => mapChannel3Product(item)).filter((r): r is Channel3Row => r !== null) : null;
  };
  const named = await ask(true);
  if (named) {
    // A phrase the named retailers barely stock is widened to every store, once.
    const wider = named.length < KEPT_THIN ? await ask(false) : null;
    const seen = new Set<string>();
    const rows = [...named, ...(wider || [])].filter(row => (seen.has(row.id) ? false : (seen.add(row.id), true)));
    const kept = payingFirst(rows).slice(0, KEPT_SIZE);
    const at = deps.now();
    return { department, query, ids: kept.map(r => r.id.replace(/^c3-/, '')), idsAt: at, products: kept, productsAt: at, version: KEPT_VERSION };
  }

  // No search available. Ids already kept are still good ids: re-read them.
  if (previous && previous.ids.length > 0) {
    const rows = await reread(previous.ids);
    if (rows.length > 0) return { ...previous, products: payingFirst(rows), productsAt: deps.now() };
  }
  return null;
}

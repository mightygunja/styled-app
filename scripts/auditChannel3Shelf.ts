/**
 * Real products in the Shop's browse view: the shelves that stock it, the
 * photo and colour rules that guard it, and the rule that lets real products
 * replace the catalogue's stand-ins.
 *
 * Everything here runs the real code (functions/src/channel3.ts,
 * src/services/channel3Listing.ts, colorName.ts, shopShelf.ts) on fixtures
 * shaped like Channel3's real answers. The rules were first checked against
 * 594 real products stocked from the live API on 2026-11-13
 * (scripts/tryChannel3Shelves.cjs does that again on demand).
 *
 * Fails when:
 *   - a product whose photos show the other department's person is shown,
 *     or a photo with a person in it is shown without the description
 *     naming the right person;
 *   - a product whose feed does not say who is in its photos is shown;
 *   - a colour is stated that the photo's description does not make clear;
 *   - a fresh shelf is refreshed, an aged one is restocked by search when a
 *     free re-read would do, or a search is made past the budget;
 *   - stand-ins are dropped from a category without enough real products,
 *     or more than a few are kept beside enough of them;
 *   - the Shop reads a shelf by spending a credit, or the product page shows
 *     a live product without re-reading it.
 *
 * Run:  npx tsx scripts/auditChannel3Shelf.ts
 */

import fs from 'fs';
import path from 'path';
import {
  Channel3Row,
  Shelf,
  SHELF_DEPARTMENTS,
  SHELF_IDS_MAX_AGE_MS,
  SHELF_QUERIES,
  SHELF_RETAILERS,
  SHELF_SERVE_MAX_AGE_MS,
  SHELF_SIZE,
  SHELF_SNAPSHOT_MAX_AGE_MS,
  SHELF_VERSION,
  channel3Tags,
  describedPerson,
  mapChannel3Product,
  photoPeople,
  refreshShelf,
  shelfCategories,
  shelfRows,
  shelfServable,
  shelfStale,
  KEPT_IDS_MAX_AGE_MS,
  KEPT_SIZE,
  KEPT_SNAPSHOT_MAX_AGE_MS,
  KEPT_VERSION,
  KeptSearch,
  keptDocId,
  keptFresh,
  keptQuery,
  refreshKept,
} from '../functions/src/channel3';
import { carriesPiece, composeLiveRail, mergeRail, LIVE_RAIL_ENOUGH } from '../src/services/trendLiveRail';
import { trendAnchors, trendAnchorSearches } from '../src/services/trendSeeds';
import { starterPool, poolHasStandIns, STARTER_CORE } from '../src/services/starterPool';
import { acceptChannel3Listing } from '../src/services/channel3Listing';
import { colorFromDescription } from '../src/services/colorName';
import { REAL_ENOUGH, STAND_INS_KEPT, STAND_IN_EVERY, isStandIn, preferRealProducts } from '../src/services/shopShelf';
import { Product } from '../src/models/product';

let failures = 0;
let checks = 0;
const check = (ok: boolean, message: string) => {
  checks += 1;
  if (!ok) {
    failures += 1;
    console.log(`  FAIL  ${message}`);
  }
};
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');

// ---- A product as Channel3 answers it ----
const image = (shot: string, alt: string, main = false) => ({
  url: `https://cdn.trychannel3.com/${shot}-${Math.abs(alt.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}`,
  cleaned_url: 'https://cdn.trychannel3.com/cleaned/x',
  is_main_image: main,
  shot_type: shot,
  alt_text: alt,
});
const item = (id: string, title: string, gender: string | null, leaf: string, images: any[], extra: Record<string, any> = {}) => ({
  id,
  title,
  gender,
  age: 'adult',
  brands: [{ name: 'Brand' }],
  category: { title: leaf, path: [{ title: 'Apparel & Accessories' }, { title: 'Clothing' }, { title: leaf }] },
  images,
  offers: [
    { url: `https://buy.trychannel3.com/${id}`, domain: 'www.nordstrom.com', price: { price: 120, compare_at_price: null, currency: 'USD' }, availability: 'InStock', condition: 'new', max_commission_rate: 0.07 },
  ],
  structured_attributes: {},
  ...extra,
});
const shown = (raw: any, department: 'women' | 'men'): Product | null => {
  const row = mapChannel3Product(raw);
  return row ? acceptChannel3Listing(row, department) : null;
};

console.log('# Who is in the photos');
check(describedPerson('Woman wearing a white linen shirt.') === 'woman' && describedPerson('Man wearing linen shirt and shorts.') === 'man', 'a description naming a woman or a man is read as such');
check(describedPerson('Model wearing black chinos and a tan top.') === null && describedPerson('Black leather loafer on a white background.') === null, '"model" and a product alone name nobody');
check(describedPerson('Male model wearing a grey sweater.') === 'man' && describedPerson('Female model wearing pink shorts.') === 'woman', '"male model" is a man, "female model" a woman (never the other way)');
check(photoPeople([{ alt_text: 'Brown boot on white.' }, { alt_text: 'Model wearing brown boots, denim skirt, and plaid blazer.' }]).join() === 'woman', 'womenswear worn in a photo counts as a woman being in it');
check(photoPeople([{ alt_text: 'Man wearing a white dress shirt and dress shoes.' }]).join() === 'man', '"dress shirt" and "dress shoes" are not a dress');

const mensShirt = item('m1', 'Linen Shirt', 'male', 'Shirts', [image('on_model', 'Man wearing a white linen shirt.', true), image('hero', 'White linen shirt laid flat.')]);
check(shown(mensShirt, 'men')?.imageUrl === mensShirt.images[0].url, "a men's product photographed on a man is shown with that photo");
const onWoman = item('m2', 'Leather Boots', 'male', 'Boots', [image('hero', 'Brown leather boot on a white background.', true), image('lifestyle', 'Woman wearing dark ankle boots and a light jacket.')]);
check(shown(onWoman, 'men') === null, "a product labelled male with a woman in ANY of its photos is refused, even when the card photo shows no one");
const onMan = item('w2', 'Wool Coat', 'female', 'Coats', [image('on_model', 'Man wearing a dark hooded wool coat and jeans.', true)]);
check(shown(onMan, 'women') === null, 'a product labelled female photographed on a man is refused');
const inSkirt = item('m3', 'Distressed Leather Boots', 'male', 'Boots', [image('hero', 'Brown boot on a white background.', true), image('lifestyle', 'Model wearing brown boots, denim skirt, and plaid blazer.')]);
check(shown(inSkirt, 'men') === null, 'a product labelled male whose photo shows a model in a skirt is refused');
const modelOnly = item('m4', 'Straight Chinos', 'male', 'Chinos', [image('on_model', 'Model wearing black chinos and tan top.', true)]);
check(shown(modelOnly, 'men') === null, 'a photo of an unnamed "model", with no product-only photo to use instead, is refused');
const modelPlusHero = item('m5', 'Straight Chinos', 'male', 'Chinos', [image('on_model', 'Model wearing black chinos and tan top.', true), image('hero', 'Black chinos on a plain background.')]);
check(shown(modelPlusHero, 'men')?.imageUrl === modelPlusHero.images[1].url, 'an unnamed "model" photo is swapped for the product-only photo');
const heroOnly = item('w3', 'Leather Tote Bag', 'female', 'Tote Bags', [image('hero', 'Tan leather tote bag on a plain background.', true)]);
check(shown(heroOnly, 'women')?.imageUrl === heroOnly.images[0].url, 'a product-only photo is shown as it is');
const noPeopleField = { ...(mapChannel3Product(heroOnly) as Channel3Row) } as any;
delete noPeopleField.people;
check(acceptChannel3Listing(noPeopleField, 'women') === null, 'a feed that does not say who is in the photos is refused outright');
check(shown(item('u1', 'Unisex Cashmere V-neck Sweater', 'female', 'Sweaters', [image('hero', 'Grey sweater.', true)]), 'women') === null, '"unisex" in the title is refused');
check(shown(item('m6', 'Colorful Pleats', 'male', 'Skirts', [image('hero', 'Pleated piece on white.', true)]), 'men') === null, 'a product labelled male but filed under Skirts is refused whatever its title says');
check(shown(item('m7', '3-pack Regular Fit T-shirts', 'male', 'T-Shirts', [image('hero', 'Three t-shirts.', true)]), 'men') === null && shown(item('m8', 'Three-pack cotton T-shirt', 'male', 'T-Shirts', [image('hero', 'Three t-shirts.', true)]), 'men') === null, 'a multi-pack is not one piece');

console.log('# Colour, from the photo on the card');
const colour = (alt: string | null, words: string) => colorFromDescription(alt, words);
check(colour('Woman wearing royal blue trousers with a yellow top.', 'Seamed Slash Pocket Trousers Trousers') === 'blue', "the colour beside the product's own word is the product's (blue trousers, not the yellow top)");
check(colour('Woman wearing a white linen shirt and beige pants.', "Women's Linen Shirt Shirts") === 'white', 'white shirt, beige trousers: the shirt is white');
check(colour('Dark green leather small tote handbag with gold chain strap.', 'Leno Leather Small Tote Handbags') === 'forest green', '"dark green" is read whole, and the gold chain is not the colour');
check(colour('Black wool-blend plush coat hanging on a hanger against a white background.', 'Laura Wool-blend Plush Coat Overcoats') === 'black', 'the backdrop is not the colour');
check(colour('Silver oval sunglasses on a white background.', 'Oval Sunglasses Sunglasses') === null, 'a description naming only the backdrop names no colour');
check(colour('Woman wearing a black and white double-knit jacket.', 'Double-knit Contrast Jacket Jackets') === null, 'two colours for one piece is no single colour');
check(colour('Man wearing a tropical print shirt and khaki shorts.', 'Classic Fit Everyday Shirt Shirts') === null, "the one colour named belongs to the shorts, not the shirt");
check(colour('Navy floral midi dress on a model.', 'Floral Midi Dress Dresses') === null, 'a patterned piece is not simply navy');
check(colour('Model wearing a sweater.', 'Knit Sweater Sweaters') === null && colour('', 'Knit Sweater') === null && colour(null, 'x') === null, 'no colour named, no colour stated');
check(colour('Brown suede Adidas Samba OG sneaker on a plain background.', 'Samba OG Sneakers Sneakers') === 'brown', 'a single colour, product alone: that colour');
const blueTrousers = item('w4', 'Seamed Slash Pocket Trousers', 'female', 'Trousers', [image('on_model', 'Woman wearing royal blue trousers with a yellow top.', true)], { colors: [{ hex: '#c7042e', percentage: 0.76 }] });
check(shown(blueTrousers, 'women')?.color === 'blue', "the card's colour is the photo's (blue), not a measurement from another colourway (red)");
check(shown(modelPlusHero, 'men')?.color === 'black', 'when the photo is swapped, the colour comes from the photo that is shown');
check(shown(item('w5', 'Cable Sweater', 'female', 'Sweaters', [image('hero', 'Sweater laid flat.', true)]), 'women')?.color === undefined, 'a product whose photo names no colour gets none');

console.log('# What the piece is called and how it is described');
const tagged = mapChannel3Product(item('w6', 'Linen Shirt', 'female', 'Shirts', [image('hero', 'White shirt.', true)], {
  structured_attributes: { 'top-fit': ['Relaxed'], fabric: ['Linen'], pattern: ['Solid'], 'sleeve-length-type': ['Long'], 'waist-rise': ['High'], activity: ['Yoga'], 'toe-style': ['Peep toe'], 'care-instructions': ['Machine washable'] },
}))!;
check(tagged.tags.join('|') === 'relaxed fit|linen|long sleeve|high rise', `attributes become short phrases tied to what they measure; noisy ones are left out (got ${tagged.tags.join('|')})`);
check(channel3Tags(null).length === 0 && channel3Tags({ fabric: ['x'.repeat(40)] }).length === 0, 'missing or absurd attributes give no tags');
const piece = acceptChannel3Listing(tagged, 'women')!;
check(piece.subcategory === 'shirts' && piece.styleTags?.includes('relaxed fit') === true, "Channel3's shelf name and attributes reach the personal match");
const mensWithSkirtTag = { ...(mapChannel3Product(mensShirt) as Channel3Row), tags: ['cotton', 'midi length skirt', 'regular fit'] };
check(acceptChannel3Listing(mensWithSkirtTag, 'men')?.styleTags?.join('|') === 'cotton|regular fit', "an attribute naming the other department's garment is dropped");
const soldOut = mapChannel3Product({ ...heroOnly, offers: [{ ...heroOnly.offers[0], availability: 'OutOfStock' }] });
check(soldOut === null, 'a sold-out product is not put on a shelf');
const soldOutReread = mapChannel3Product({ ...heroOnly, offers: [{ ...heroOnly.offers[0], availability: 'OutOfStock' }] }, { anyAvailability: true });
check(soldOutReread?.inStock === false && acceptChannel3Listing(soldOutReread!, 'women')?.inStock === false, 'a sold-out product re-read for its own page comes back marked out of stock, not as an old in-stock copy');

console.log('# Shelves');
check(SHELF_DEPARTMENTS.join() === 'women,men' && !shelfCategories('men').includes('dresses') && shelfCategories('women').includes('dresses'), 'every category has a shelf; menswear has no dresses shelf');
const allQueries = SHELF_DEPARTMENTS.flatMap(d => Object.values(SHELF_QUERIES[d]).flat());
check(allQueries.length <= 36 && allQueries.every(q => !/\b(?:women|men|woman|man|girl|boy)/i.test(q)), `a full restock is ${allQueries.length} searches, and no search words name a department (the gender filter does that)`);
check(SHELF_RETAILERS.length >= 30 && SHELF_RETAILERS.every(d => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) && new Set(SHELF_RETAILERS).size === SHELF_RETAILERS.length, 'shelves are stocked from a list of named retailers');

const NOW = 1_800_000_000_000;
const rawFor = (id: string, rate = 0.07) => item(id, `Wool Coat ${id}`, 'female', 'Coats', [image('hero', 'Black wool coat.', true)], { offers: [{ url: `https://buy.trychannel3.com/${id}`, domain: 'nordstrom.com', price: { price: 100 }, availability: 'InStock', max_commission_rate: rate }] });
const world = (options: { search?: boolean; gone?: string[] } = {}) => {
  const log = { searches: [] as any[], reads: [] as string[] };
  let clock = NOW;
  return {
    log,
    deps: {
      search: async (body: any) => {
        log.searches.push(body);
        if (options.search === false) return null;
        const n = log.searches.length;
        return Array.from({ length: 30 }, (_, i) => rawFor(`s${n}-${i}`, i % 3 === 0 ? 0 : 0.07));
      },
      product: async (id: string) => {
        log.reads.push(id);
        return (options.gone || []).includes(id) ? null : rawFor(id);
      },
      now: () => clock++,
    },
  };
};
const shelfOf = (ids: string[], idsAt: number, productsAt: number, version: number = SHELF_VERSION): Shelf => ({
  department: 'women',
  category: 'outerwear',
  ids,
  idsAt,
  products: ids.map(id => mapChannel3Product(rawFor(id))!),
  productsAt,
  version,
});

(async () => {
  // First stock: searches, and their answers are the snapshot.
  let w = world();
  const first = await refreshShelf(null, 'women', 'outerwear', w.deps);
  check(!!first && w.log.searches.length === 3 && w.log.reads.length === 0, 'an empty shelf is stocked by its three searches, with no extra reads');
  check(!!first && first.products.length === SHELF_SIZE && first.ids.length === SHELF_SIZE && first.version === SHELF_VERSION, `a shelf holds ${SHELF_SIZE} products`);
  check(w.log.searches.every(b => b.filters.gender === 'female' && b.filters.age.join() === 'adult' && b.filters.website_ids === SHELF_RETAILERS && b.limit === 30), 'every shelf search is for one gender, adults, in stock, from the named retailers');
  // 90 answers, 60 of them from paying stores: the 54 kept are all paying.
  check(!!first && first.products.every(r => r.commissionRate > 0), 'paying stores take the places on a shelf first');
  check(!!first && new Set(first.products.slice(0, 6).map(r => r.id.split('-')[1])).size === 3, 'every search contributes to the front of the shelf');

  // Fresh: nothing happens.
  w = world();
  const fresh = shelfOf(['a', 'b', 'c', 'd'], NOW - 1000, NOW - 1000);
  check((await refreshShelf(fresh, 'women', 'outerwear', w.deps)) === fresh && w.log.searches.length + w.log.reads.length === 0, 'a fresh shelf is left alone: no search, no read');

  // Snapshot aged, ids fresh: free re-read only.
  w = world();
  const aged = shelfOf(['a', 'b', 'c', 'd'], NOW - 1000, NOW - SHELF_SNAPSHOT_MAX_AGE_MS - 1);
  const reread = await refreshShelf(aged, 'women', 'outerwear', w.deps);
  check(w.log.searches.length === 0 && w.log.reads.join() === 'a,b,c,d' && !!reread && reread.productsAt >= NOW && reread.idsAt === aged.idsAt, 'an aged snapshot is re-read by id - free - and no search is made');

  // A product gone: it drops off; the rest stay.
  w = world({ gone: ['b'] });
  const dropped = await refreshShelf(aged, 'women', 'outerwear', w.deps);
  check(!!dropped && dropped.products.map(r => r.id).join() === 'c3-a,c3-c,c3-d' && w.log.searches.length === 0, 'a product that has gone drops off the shelf');

  // More than half gone: restock by search.
  w = world({ gone: ['a', 'b', 'c'] });
  const restocked = await refreshShelf(aged, 'women', 'outerwear', w.deps);
  check(w.log.searches.length === 3 && !!restocked && restocked.products.length === SHELF_SIZE, 'a shelf that has lost more than half its products is restocked');

  // Ids a week old: search.
  w = world();
  const week = shelfOf(['a', 'b'], NOW - SHELF_IDS_MAX_AGE_MS - 1, NOW - SHELF_SNAPSHOT_MAX_AGE_MS - 1);
  await refreshShelf(week, 'women', 'outerwear', w.deps);
  check(w.log.searches.length === 3, 'after a week a shelf is restocked by search');

  // Stocked under an older version: restock even though it is fresh.
  w = world();
  const old = shelfOf(['a', 'b'], NOW - 1000, NOW - 1000, SHELF_VERSION - 1);
  check(shelfStale(old, NOW), 'a shelf stocked under older searches counts as stale');
  await refreshShelf(old, 'women', 'outerwear', w.deps);
  check(w.log.searches.length === 3, 'a shelf stocked under older searches is restocked at its next refresh');

  // Budget spent: old ids are re-read, nothing is lost.
  w = world({ search: false });
  const kept = await refreshShelf(week, 'women', 'outerwear', w.deps);
  check(!!kept && kept.products.length === 2 && w.log.reads.join() === 'a,b' && kept.idsAt === week.idsAt, 'with the search budget spent, the shelf keeps its products and re-reads them for free');
  w = world({ search: false });
  check((await refreshShelf(null, 'women', 'outerwear', w.deps)) === null, 'with the budget spent and nothing on the shelf, there is no shelf (the Shop falls back)');

  // Serving.
  check(shelfServable(fresh, NOW) && !shelfServable(shelfOf(['a'], NOW, NOW - SHELF_SERVE_MAX_AGE_MS - 1), NOW) && !shelfServable(null, NOW) && !shelfServable(shelfOf([], NOW, NOW), NOW), 'a shelf is shown only while its snapshot is under twelve hours old and not empty');
  check(SHELF_SNAPSHOT_MAX_AGE_MS <= 4 * 3600 * 1000 && SHELF_SERVE_MAX_AGE_MS <= 12 * 3600 * 1000, 'prices and buy links on a shelf are refreshed every four hours and never shown past twelve');
  const dealt = shelfRows([shelfOf(['a1', 'a2', 'a3'], NOW, NOW), shelfOf(['b1', 'b2'], NOW, NOW), shelfOf(['a1', 'c1'], NOW, NOW)], 5);
  check(dealt.map(r => r.id.slice(3)).join() === 'a1,b1,a2,b2,c1', `a browse of every category deals the shelves out in turn, each product once (got ${dealt.map(r => r.id.slice(3)).join()})`);

  console.log('# Real products before stand-ins');
  const card = (id: string, category: string, real: boolean): Product => ({
    id, name: id, brand: 'b', retailer: 'r', category: category as any, price: 50, currency: 'USD',
    imageUrl: real ? `https://cdn.trychannel3.com/${id}` : `https://images.unsplash.com/photo-${id}?w=600`,
    sourceUrl: 'https://example.org/p', inStock: true,
  });
  check(isStandIn(card('p-t001', 'tops', false)) && !isStandIn(card('c3-x', 'tops', true)) && !isStandIn({ ...card('p-t141', 'tops', true), imageUrl: 'https://cdn.shopify.com/s/files/1/x.jpg' }), 'a stand-in is a curated piece with a stock photo; live listings and partner pieces with the merchant photo are real');
  // Twelve real tops and five curated ones (t1 ranked best, all of them above
  // every real top, as on real shelves); five real shoes and one curated.
  const realTops = Array.from({ length: 12 }, (_, i) => card(`c3-t${i}`, 'tops', true));
  const curatedTops = Array.from({ length: 5 }, (_, i) => card(`p-t${i + 1}`, 'tops', false));
  const realShoes = Array.from({ length: REAL_ENOUGH - 1 }, (_, i) => card(`c3-s${i}`, 'shoes', true));
  const mixed = [...curatedTops, card('p-s1', 'shoes', false), ...realTops, ...realShoes];
  const preferred = preferRealProducts(mixed, p => p);
  const ids = preferred.items.map(p => p.id);
  const keptTops = preferred.items.filter(p => p.category === 'tops' && isStandIn(p)).map(p => p.id);
  check(STAND_INS_KEPT >= 2 && STAND_INS_KEPT <= 4 && keptTops.join() === 'p-t1,p-t2,p-t3', `a category with ${REAL_ENOUGH}+ real products keeps only its ${STAND_INS_KEPT} best-ranked Amazon pieces (got ${keptTops.join()})`);
  check(ids.filter(id => id.startsWith('c3-')).join() === mixed.filter(p => p.id.startsWith('c3-')).map(p => p.id).join(), 'no real product is removed, and real products keep their order');
  check(ids.includes('p-s1') && ids.indexOf('p-s1') === 0 && preferred.standInsLeft, `a category with fewer than ${REAL_ENOUGH} real products keeps all its curated pieces where they were, so it cannot go empty`);
  const gaps = keptTops.map(id => ids.indexOf(id));
  check(gaps[0] === STAND_IN_EVERY && gaps[1] - gaps[0] === STAND_IN_EVERY + 1 && gaps[2] - gaps[1] === STAND_IN_EVERY + 1, `the kept Amazon pieces are dealt in one after every ${STAND_IN_EVERY} other cards, not stacked at the top (positions ${gaps.join()})`);
  check(preferred.items.slice(0, STAND_IN_EVERY).filter(p => isStandIn(p) && p.category === 'tops').length === 0, 'the first cards of a well-stocked category are real products');
  const short = preferRealProducts([...curatedTops, ...realTops.slice(0, REAL_ENOUGH)], p => p).items.map(p => p.id);
  check(short.filter(id => id.startsWith('p-')).length === STAND_INS_KEPT && short.slice(-2).join() === 'p-t2,p-t3', 'on a short list the kept pieces that found no slot go at the end rather than being lost');
  const curatedOnly = [card('p-a', 'tops', false), card('p-b', 'shoes', false)];
  check(preferRealProducts(curatedOnly, p => p).items.map(p => p.id).join() === 'p-a,p-b' && preferRealProducts([], (p: Product) => p).standInsLeft === false, 'with no live feed the catalogue is shown exactly as before');
  check(preferRealProducts(realTops, p => p).standInsLeft === false && preferRealProducts([...realTops, curatedTops[0]], p => p).standInsLeft === true, 'the page knows whether an Amazon piece is on it, so the Amazon disclosure shows exactly when one is');
  check(preferRealProducts([...realTops, ...curatedTops], p => p, { keep: 0 }).items.every(p => !isStandIn(p)), 'keeping none is still possible (the rule, not the code, decides how many)');
  const priced = [curatedTops[3], realTops[0], curatedTops[0], realTops[1], curatedTops[4], curatedTops[1], ...realTops.slice(2), curatedTops[2]];
  const asSorted = preferRealProducts(priced, p => p, { spread: false }).items.map(p => p.id);
  check(asSorted.join() === priced.filter(p => p.id !== 'p-t3' && p.id !== 'p-t2').map(p => p.id).join(), `under a shopper's own sort the kept pieces stay where that sort put them (got ${asSorted.slice(0, 6).join()})`);

  console.log("# A trend's rail, from real products");
  const trend = { keyGarments: ['track jacket', 'suede', 'pleated skirt', 'retro sneaker'], keyAccessories: ['bucket hat', 'crew socks'] };
  check(trendAnchors(trend, 'mens', 2).join() === 'track jacket,bucket hat' && trendAnchors(trend, 'womens', 6).includes('pleated skirt') && !trendAnchors(trend, 'mens', 6).includes('pleated skirt') && !trendAnchors(trend, 'womens', 6).includes('suede'), "a trend's pieces are its own named garments and accessories, in turn - never a bare fabric, never the other department's");
  check(trendAnchorSearches(trend, 'mens', 1)[0].label === "men's track jacket" && /amazon\./.test(trendAnchorSearches(trend, 'mens', 1)[0].url), 'the Amazon search for a piece still names the department (the live search does not: its gender filter does)');
  const live = (id: string, name: string, subcategory: string, brand = 'Brand'): Product => ({ ...card(id, 'outerwear', true), name, subcategory, brand });
  check(carriesPiece(live('1', 'Adicolor Classics Track Jacket', 'track jackets'), 'track jacket') && carriesPiece(live('2', 'Leather Chelsea Boots', 'boots'), 'chelsea boot') && carriesPiece(live('3', 'Wide-Leg Wool Trousers', 'trousers'), 'wide-leg trousers'), 'a product whose name says the piece is the piece (boots/boot, wide-leg trousers)');
  check(!carriesPiece(live('4', 'Zip Fleece Jacket', 'jackets'), 'track jacket') && !carriesPiece(live('5', 'Track Pants', 'joggers'), 'track jacket') && !carriesPiece(live('6', 'Anything', ''), ''), "a feed's similar item is not the piece (a fleece jacket is not a track jacket)");
  const jackets = [live('j1', 'Track Jacket One', ''), live('j2', 'Track Jacket Two', ''), live('jx', 'Fleece Jacket', ''), live('j3', 'Track Jacket Three', '')];
  const hats = [live('h1', 'Bucket Hat One', ''), live('h2', 'Bucket Hat One', ''), live('j1', 'Track Jacket One', '')];
  const rail = composeLiveRail([{ piece: 'track jacket', products: jackets }, { piece: 'bucket hat', products: hats }], 10).map(p => p.id);
  check(rail.join() === 'j1,h1,j2,j3', `the rail deals the pieces out in turn, keeps the member's ranking within a piece, and shows each product (and each brand's same-named product) once (got ${rail.join()})`);
  check(composeLiveRail([{ piece: 'track jacket', products: jackets }], 2).length === 2 && composeLiveRail([], 10).length === 0, 'the rail stops at its limit and is empty when nothing was found');
  const curatedRail = [card('p-o1', 'outerwear', false), card('p-o2', 'outerwear', false)];
  check(mergeRail(jackets.slice(0, LIVE_RAIL_ENOUGH), curatedRail, 10).every(p => !isStandIn(p)), `a rail with ${LIVE_RAIL_ENOUGH} real pieces shows only real pieces`);
  check(mergeRail(jackets.slice(0, 1), curatedRail, 10).map(p => p.id).join() === 'j1,p-o1,p-o2' && mergeRail([], curatedRail, 10).length === 2, 'a rail short of real pieces shows them first and the curated pieces after - never an empty rail where there was one');

  console.log("# Home's starter looks, from real products");
  const piece = (id: string, category: string, real: boolean, color?: string, name = id): Product => ({ ...card(id, category, real), name, color });
  const isBag = (p: Product) => /bag|tote/i.test(p.name);
  const realRack = [
    ...Array.from({ length: 12 }, (_, i) => piece(`c3-top${i}`, 'tops', true, i % 2 ? 'navy' : undefined)),
    ...Array.from({ length: 8 }, (_, i) => piece(`c3-bot${i}`, 'bottoms', true, 'black')),
    ...Array.from({ length: 6 }, (_, i) => piece(`c3-shoe${i}`, 'shoes', true, 'brown')),
    ...Array.from({ length: 6 }, (_, i) => piece(`c3-acc${i}`, 'accessories', true, 'tan', i < 3 ? `tote bag ${i}` : `belt ${i}`)),
  ];
  const curatedRack = [
    ...Array.from({ length: 10 }, (_, i) => piece(`p-t${i}`, 'tops', false, 'white')),
    ...Array.from({ length: 6 }, (_, i) => piece(`p-b${i}`, 'bottoms', false, 'grey')),
    ...Array.from({ length: 4 }, (_, i) => piece(`p-d${i}`, 'dresses', false, 'red')),
  ];
  // Curated pieces out-rank live ones (they carry hand-written style words), as on real data.
  const starter = starterPool([...curatedRack, ...realRack], isBag);
  check(starter.filter(p => ['tops', 'bottoms', 'shoes', 'accessories'].includes(p.category)).every(p => !isStandIn(p)), 'where the feed has real products for a category, the starter pool takes only real ones');
  check(starter.filter(p => p.category === 'dresses').length === 4 && poolHasStandIns(starter), 'a category the feed has nothing for keeps its curated pieces (no category is lost)');
  const firstTops = starter.filter(p => p.category === 'tops').slice(0, 6);
  check(firstTops.every(p => !!p.color), 'real pieces whose colour is known come first: the outfit engine composes by colour');
  check(starter.length <= STARTER_CORE + 10 && starter.some(p => p.category === 'shoes') && starter.some(p => isBag(p)) && starter.some(p => p.category === 'accessories' && !isBag(p)), 'the pool arrives with shoes, a bag and an accessory to finish a look');
  const noFeed = starterPool(curatedRack, isBag);
  check(noFeed.length === curatedRack.length && noFeed.every(isStandIn) && noFeed[0].id === 'p-t0', 'with no live feed the starter pool is the catalogue, in its ranked order, as before');
  check(starterPool([...curatedRack, ...realRack], isBag, { preferReal: false })[0].id === 'p-t0', 'the catalogue-first pool is still there for the engine to fall back on');
  const discovery = read('src/services/discoveryService.ts');
  const starterFn = discovery.slice(discovery.indexOf('export async function buildStarterPools'), discovery.indexOf('const REAL_POOL_WORTH_HAVING'));
  check(/if \(!profile\?\.wardrobeFocus\) return \[\];/.test(starterFn) && /\.search\(\{ wardrobeFocus: profile\.wardrobeFocus, pageSize: 160 \}\)/.test(starterFn), "Home asks the live feed only once the member's department is known");
  check(/await liveProductsStillComing\(7000\)/.test(starterFn), 'a feed waking from idle is waited for, briefly, before starter looks fall back to stand-ins');
  check(/if \(Object\.values\(pools\)\.some\(candidates => candidates\.length > 0\)\) return pools;/.test(starterFn) && /preferReal: false/.test(starterFn), 'if no look can be finished from real products, the catalogue composes one - Home is never empty');
  check(/ranked\.filter\(\(\{ product \}\) => !product\.department \|\| product\.department === 'unisex'\)/.test(starterFn), 'an account with no department still gets cross-department pieces only');

  console.log('# Kept searches (trend pieces)');
  check(keptQuery('  Track   JACKET ') === 'track jacket' && keptQuery("Men's <b>suede</b> bomber!!") === "men's b suede b bomber" && keptQuery('x') === null && keptQuery(null) === null && (keptQuery('a'.repeat(200)) || '').length === 60, 'a phrase is cleaned before it is searched or stored');
  check(keptDocId('men', 'track jacket') === 'men-track-jacket' && keptDocId('women', "wide-leg trousers") === 'women-wide-leg-trousers' && keptDocId('men', 'track jacket') !== keptDocId('women', 'track jacket'), 'each department keeps its own record of a phrase');
  w = world();
  const keptFirst = (await refreshKept(null, 'men', 'track jacket', w.deps)) as KeptSearch;
  check(w.log.searches.length === 1 && w.log.searches[0].query === 'track jacket' && w.log.searches[0].filters.gender === 'male' && w.log.searches[0].filters.website_ids === SHELF_RETAILERS && keptFirst.products.length === KEPT_SIZE && keptFirst.version === KEPT_VERSION, `a phrase is searched once, for one gender, at the named retailers, and ${KEPT_SIZE} products are kept`);
  check(keptFresh(keptFirst, keptFirst.productsAt + 1000) && !keptFresh(keptFirst, keptFirst.productsAt + KEPT_SNAPSHOT_MAX_AGE_MS + 1) && !keptFresh(null, NOW) && !keptFresh({ ...keptFirst, version: KEPT_VERSION - 1 }, keptFirst.productsAt), 'a kept search is answered as it stands for twelve hours');
  w = world();
  check((await refreshKept(keptFirst, 'men', 'track jacket', { ...w.deps, now: () => keptFirst.productsAt + 1000 })) === keptFirst && w.log.searches.length + w.log.reads.length === 0, 'a fresh kept search costs nothing: no search, no read');
  w = world();
  let later = keptFirst.productsAt + KEPT_SNAPSHOT_MAX_AGE_MS + 1;
  const keptReread = await refreshKept(keptFirst, 'men', 'track jacket', { ...w.deps, now: () => later++ });
  check(w.log.searches.length === 0 && w.log.reads.length === keptFirst.ids.length && !!keptReread && keptReread.idsAt === keptFirst.idsAt && keptReread.productsAt > keptFirst.productsAt, 'an aged one is re-read by id - free - and not searched again');
  w = world();
  later = keptFirst.idsAt + KEPT_IDS_MAX_AGE_MS + 1;
  await refreshKept(keptFirst, 'men', 'track jacket', { ...w.deps, now: () => later++ });
  check(w.log.searches.length === 1, 'after a fortnight the phrase is searched again');
  // A phrase the named retailers barely stock is widened to every store, once.
  const thin = world();
  let thinCalls = 0;
  const thinDeps = { ...thin.deps, search: async (body: any) => { thinCalls += 1; thin.log.searches.push(body); return body.filters.website_ids ? [rawFor('n1')] : [rawFor('n1'), rawFor('o1'), rawFor('o2')]; } };
  const widened = (await refreshKept(null, 'women', 'babouche', thinDeps)) as KeptSearch;
  check(thinCalls === 2 && !thin.log.searches[1].filters.website_ids && widened.products.map(r => r.id).join() === 'c3-n1,c3-o1,c3-o2', 'a phrase the named retailers barely stock is widened to every store, once, and nothing is listed twice');
  // Nothing found is remembered too.
  const none = world();
  const noneDeps = { ...none.deps, search: async (body: any) => { none.log.searches.push(body); return []; } };
  const empty = (await refreshKept(null, 'men', 'babouche', noneDeps)) as KeptSearch;
  check(!!empty && empty.products.length === 0 && keptFresh(empty, empty.productsAt + 1000), '"nothing found" is kept too, so the next visit does not pay to learn it again');
  const again = world();
  let soon = empty.productsAt + KEPT_SNAPSHOT_MAX_AGE_MS + 1;
  const stillEmpty = await refreshKept(empty, 'men', 'babouche', { ...again.deps, now: () => soon++ });
  check(again.log.searches.length === 0 && again.log.reads.length === 0 && !!stillEmpty && stillEmpty.productsAt > empty.productsAt, 'and is not searched again until the fortnight is up');
  w = world({ search: false });
  check((await refreshKept(null, 'men', 'track jacket', w.deps)) === null, 'with the search budget spent and nothing kept, there is no answer (the page keeps its curated pieces)');

  console.log('# Wiring');
  const scorer = read('src/services/marketplaceMatchingService.ts');
  check(/const strength = \{ garment: 3, silhouette: 2, color: 1 \} as const;/.test(scorer) && /if \(kind === 'garment'\) break;/.test(scorer), 'a product is credited to the trend that names it as a piece before one that only shares its cut');
  const fn = read('functions/src/index.ts');
  const keptFn = fn.slice(fn.indexOf('export const searchChannel3Kept'), fn.indexOf('// ==================== PERSONAL TREND REPORT'));
  check(/if \(!department\) return \{ results: \{\}, pending: 0 \};/.test(keptFn) && /\.slice\(0, KEPT_QUERIES_PER_CALL\)/.test(keptFn) && /keptQuery\(q\)/.test(keptFn), 'the trend-pieces function answers nothing without a department, and cleans and caps what it is asked');
  check(/if \(keptFresh\(kept, started\)\) results\[queries\[index\]\] = /.test(keptFn) && keptFn.indexOf('keptFresh(kept, started)') < keptFn.indexOf('refreshKept('), 'fresh pieces are answered before anything is refreshed');
  check(/if \(Date\.now\(\) - started > KEPT_TIME_ALLOWED_MS\) \{/.test(keptFn) && /channel3Search\(apiKey, body\)/.test(keptFn), 'refreshing stops when its time is up, and every search it makes is counted against the monthly budget');
  const trendsPage = read('src/screens/TrendInsightsScreen.tsx');
  check(/const allPieces = Array\.from\(new Set\(Array\.from\(piecesByTrend\.values\(\)\)\.flat\(\)\)\);/.test(trendsPage) && /await liveTrendPieces\(missing, profile\?\.wardrobeFocus\);/.test(trendsPage) && /scoreAndRankProducts\(found\[piece\] \|\| \[\], profile, closetItems, \{ trends: \[remix\.trend\] \}\)/.test(trendsPage), "the Trends page asks for every trend's pieces in one request, in the member's department, and ranks them against the member's profile and closet");
  check(/const hasLivePieces = \(liveRails\.get\(trend\.id\)\?\.length \?\? 0\) > 0;\s*\n\s*const amazonFirst = !!gap && !hasLivePieces;/.test(trendsPage) && /onPress=\{\(\) => \(amazonFirst \? searchAmazon\(remix\) : browseTrend\(remix\)\)\}/.test(trendsPage), "a trend with real pieces leads with the Shop that shows them; Amazon leads only when there are none");
  check(/'Also on Amazon'/.test(trendsPage) && /onPress=\{\(\) => \(amazonFirst \? browseTrend\(remix\) : searchAmazon\(remix\)\)\}/.test(trendsPage), 'the Amazon search stays on every trend that names a missing piece, as the second choice');
  check(/if \(Object\.keys\(found\)\.length > before\) await fillRails\(round \+ 1\);/.test(trendsPage) && /const missing = allPieces\.filter\(piece => !\(piece in found\)\);/.test(trendsPage), 'pieces the server had not reached are asked for again, while each answer brings something new');
  check(/const rail = mergeRail\(liveRails\.get\(trend\.id\) \?\? \[\], trendLooks\.get\(trend\.id\) \?\? \[\], RAIL_LIMIT\);/.test(trendsPage), "each trend's rail shows its real pieces");
  check(!/\$\{product\.price|product\.price/.test(trendsPage.slice(trendsPage.indexOf('THE LOOK, IN PIECES'), trendsPage.indexOf('styles.actionRow'))), 'a rail card shows no price (the snapshot may be hours old; the product page re-reads it)');
  const trendAdapter = read('src/services/affiliateNetwork.ts');
  const piecesFn = trendAdapter.slice(trendAdapter.indexOf('async trendPieces('), trendAdapter.indexOf('/**', trendAdapter.indexOf('async trendPieces(') + 20) > 0 ? trendAdapter.indexOf('async getById(productId: string): Promise<Product | null> {\n    if (!productId.startsWith') : undefined);
  check(/if \(departments\.length === 0 \|\| queries\.length === 0\) return out;/.test(piecesFn) && /\.map\(listing => acceptChannel3Listing\(listing, department\)\)/.test(piecesFn) && /this\.shownUnder\.set\(product\.id, department\)/.test(piecesFn) && /adapter\.remember\(found\)/.test(piecesFn), "trend pieces go through the same acceptance rule, per department, and can be opened on the product page");
  const search = fn.slice(fn.indexOf('export const searchChannel3Products'), fn.indexOf('const channel3ProductMemory'));
  check(search.indexOf('browseShelves(') > -1 && search.indexOf('browseShelves(') < search.indexOf('channel3Search(apiKey, body)') && /if \(!typed && !priced && condition !== 'secondhand'\)/.test(search), 'a browse is answered from the shelves before any search is made');
  const browse = fn.slice(fn.indexOf('async function browseShelves'), fn.indexOf('export const searchChannel3Products'));
  check(!/channel3Search|spendChannel3Search|fetch\(/.test(browse) && /shelfServable\(shelf, now\)/.test(browse) && /if \(servable\.length === 0\) return null;/.test(browse), 'reading a shelf spends no credit, and an unservable shelf falls back to a live search');
  check(/if \(shelves\.some\(shelf => shelfStale\(shelf, now\)\)\) await requestShelfRefresh\(\);/.test(browse), 'a browse that finds a shelf missing or aged asks for a refresh');
  check(/\.pubsub\.schedule\('every 4 hours'\)/.test(fn) && /\.firestore\.document\('channel3ShelfRequests\/\{id\}'\)/.test(fn), 'shelves are refreshed on a timer and on request');
  const run = fn.slice(fn.indexOf('async function refreshChannel3ShelvesNow'), fn.indexOf('async function refreshEveryShelf'));
  check(/if \(\(Number\(snap\.data\(\)\?\.until\) \|\| 0\) > Date\.now\(\)\) return false;/.test(run) && /if \(!mine\) return/.test(run), 'two refresh runs cannot restock the same shelves at once');
  const byId = fn.slice(fn.indexOf('async function channel3ProductById'), fn.indexOf('// ---- Shelves'));
  check(!/spendChannel3Search/.test(byId) && /\/products\/\$\{encodeURIComponent\(id\)\}/.test(byId), 'a re-read by id is not charged to the search budget');
  check(/export const getChannel3Product = /.test(fn) && /mapChannel3Product\(item, \{ anyAvailability: true \}\)/.test(fn), 'the product page has a function to re-read one product');

  const adapter = read('src/services/affiliateNetwork.ts');
  const c3 = adapter.slice(adapter.indexOf('class Channel3Adapter'), adapter.indexOf('const searchRakutenProductsFn'));
  check(/const department = this\.shownUnder\.get\(productId\);\s*\n\s*if \(!department \|\| channel3Status !== 'live'\) return null;/.test(c3) && /return raw \? acceptChannel3Listing\(raw, department\) : null;/.test(c3), 'a re-read product goes through the same rule, under the department it was shown under');
  // A function that has been idle takes longer to start than the page will
  // wait. That used to switch the feed off for two minutes, every visit.
  const ask = c3.slice(c3.indexOf('private async searchDepartment'), c3.indexOf('private shownUnder'));
  const slowPath = ask.slice(ask.indexOf("if (first !== 'slow') return first;"));
  check(/const first = await Promise\.race\(\[answer, waitedEnough\]\);/.test(ask) && !/rememberChannel3Off|channel3Status = 'off'/.test(ask), 'a slow answer does not switch the feed off');
  check(/this\.arrivedLate\.set\(key, \{ at: Date\.now\(\), products \}\);/.test(slowPath) && /announceLiveProducts\(\);/.test(slowPath) && /\.catch\(error => channel3Failed\(error\)\);\s*\n\s*return \[\];\s*\n\s*\}/.test(slowPath), 'an answer that lands after the wait is kept and announced, and the page is not held for it');
  check(/const late = this\.arrivedLate\.get\(key\);\s*\n\s*if \(late && Date\.now\(\) - late\.at < CHANNEL3_LATE_ANSWER_KEPT_MS\) return late\.products;/.test(ask), 'asking again finds the late answer already in hand');
  check(/let answer = this\.inFlight\.get\(key\);\s*\n\s*if \(!answer\) \{/.test(ask), 'the same question is never asked twice while its answer is on the way');
  check(/\.catch\(error => channel3Failed\(error\)\);/.test(slowPath), 'a call that fails after the wait is still treated as a failure');
  check(/resilientAdapters\.forEach\(adapter => adapter\.forgetSearches\(\)\);/.test(adapter), 'when live products arrive late, the searches cached without them are dropped');
  check(/if \(options\.stockCards === false && provider === 'starter' && channel3IsLive\(\)\)/.test(adapter), 'the notice drops the stand-in sentences only when no stand-in is on the page');
  const shop = read('src/screens/ShopScreen.tsx');
  check(/return preferRealProducts\(matched, m => m\.product, \{ spread: !isShopperSort\(sort\) \}\);/.test(shop) && /const visibleProducts = shelf\.items;/.test(shop), 'the Shop shows real products in place of stand-ins, and leaves a price sort in price order');
  check(/curatedCatalogNotice\(\{ stockCards: shelf\.standInsLeft \|\| shelf\.items\.length === 0 \}\)/.test(shop), 'the Shop tells the notice whether a stand-in is still on the page');
  check(/useEffect\(\(\) => onLiveProductsArrived\(\(\) => loadRef\.current\(\)\), \[\]\);/.test(shop), 'the Shop loads again when live products arrive late');
  const rules = fs.existsSync(path.join(__dirname, '..', 'firestore.rules')) ? read('firestore.rules') : '';
  check(!/channel3Shelves|channel3ShelfRequests/.test(rules), 'the shelves are server-only: no client rule opens them');

  console.log(`\n${checks} checks.`);
  if (failures) {
    console.log(`${failures} failure(s).`);
    process.exit(1);
  }
  console.log('OK - the browse view is stocked with real products for the right department, with a safe photo and an honest colour, without spending a credit per visit.');
})().catch(error => {
  console.error('FAILED', error);
  process.exit(1);
});

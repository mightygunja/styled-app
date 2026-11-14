/**
 * Live Channel3 products audit: nothing from the feed reaches the wrong
 * department, and nothing is shown that Channel3 does not label as exactly
 * one department, for an adult, in a clothing category.
 *
 * The products below are shaped as the searchChannel3Products function
 * returns them. They are fixtures, not a live call. The shape was checked
 * against 288 real products from the live API on 2026-11-13 (12 searches,
 * both departments): 261 shown, and every skirt, dress and unlabelled
 * product returned to a men's search was refused.
 *
 * Fails when:
 *   - a product labelled for the other department, 'unisex', or not
 *     labelled at all is accepted;
 *   - a kids' product, a job lot, or something that is not clothing is
 *     accepted;
 *   - a product whose title names the other department is accepted;
 *   - an accepted product lacks a department, a category, a photo, a price,
 *     a store or an https buy link;
 *   - the feed could be searched without a department, could spend past
 *     the monthly budget, or could appear without its required disclosure;
 *   - a price or discount sort the shopper chose is not the order shown
 *     (scoring re-ranks by match, so the Shop must re-apply it afterwards).
 *
 * Run:  npx tsx scripts/auditChannel3Listings.ts
 */

import fs from 'fs';
import path from 'path';
import { acceptChannel3Listing, CHANNEL3_GENDER, RawChannel3Listing } from '../src/services/channel3Listing';
import { departmentVisible } from '../src/services/departmentFit';
import { payingStoresFirst, orderMatchedForSort, isShopperSort, discountPercent } from '../src/models/product';
import { channel3Filters, channel3Photo, mapChannel3Product } from '../functions/src/channel3';

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

const product = (name: string, gender: string | null, categoryNames: string[], extra: Partial<RawChannel3Listing> = {}): RawChannel3Listing => ({
  id: `c3-${Math.abs(name.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}`,
  name,
  brand: 'Brand',
  gender,
  age: 'adult',
  categoryNames,
  imageUrl: 'https://cdn.trychannel3.com/0b8f2b1a-883f-436c-ab53-d80c68241a59',
  price: 88,
  originalPrice: null,
  currency: 'USD',
  sourceUrl: 'https://www.buy.trychannel3.com/abc123',
  domain: 'www.nordstrom.com',
  condition: 'new',
  // A product-only photo and nobody named in any photo: the photo rules
  // (scripts/auditChannel3Shelf.ts) pass, so these fixtures test the rest.
  shot: 'hero',
  people: [],
  imageWho: null,
  ...extra,
});

console.log('# Accepted');
check(CHANNEL3_GENDER.women === 'female' && CHANNEL3_GENDER.men === 'male', "each department maps to Channel3's own label");
const accepted: Array<[RawChannel3Listing, 'women' | 'men', string]> = [
  [product('Silk Wrap Blouse', 'female', ['Blouses', 'Tops', 'Clothing']), 'women', 'tops'],
  [product('Pleated Midi Skirt', 'female', ['Skirts', 'Clothing']), 'women', 'bottoms'],
  [product('Floral Maxi Dress', 'female', ['Dresses', 'Clothing']), 'women', 'dresses'],
  [product('Leather Ballet Flats', 'female', ['Flats', 'Shoes']), 'women', 'shoes'],
  [product('Oxford Button-Down Shirt', 'male', ['Shirts', 'Tops', 'Clothing']), 'men', 'tops'],
  [product('Slim Fit Dress Shirt', 'male', ['Dress Shirts', 'Shirts', 'Clothing']), 'men', 'tops'],
  [product('Suede Bomber Jacket', 'male', ['Jackets', 'Outerwear', 'Clothing']), 'men', 'outerwear'],
  [product('Suede Penny Loafers', 'male', ['Loafers', 'Shoes']), 'men', 'shoes'],
  [product('Pleated Wide-Leg Trousers', 'male', ['Trousers', 'Pants', 'Clothing']), 'men', 'bottoms'],
];
for (const [raw, department, category] of accepted) {
  const piece = acceptChannel3Listing(raw, department);
  check(!!piece, `accepted: "${raw.name}" for ${department}`);
  if (!piece) continue;
  check(piece.department === department && piece.category === category, `"${raw.name}" is ${department} / ${category} (got ${piece.department} / ${piece.category})`);
  check(piece.id.startsWith('c3-') && piece.retailer === 'nordstrom.com' && piece.sourceUrl === raw.sourceUrl && piece.imageUrl === raw.imageUrl, `"${raw.name}" keeps the retailer's photo, the store name and the tracked link`);
  const other = department === 'women' ? 'mens' : 'womens';
  check(!departmentVisible(piece.department, other) && !departmentVisible(piece.department, undefined), `"${raw.name}" is invisible to the other department and to an account that has not chosen`);
  check(acceptChannel3Listing(raw, department === 'women' ? 'men' : 'women') === null, `"${raw.name}" is refused when searched for the other department`);
}

console.log('# Refused');
const TOPS = ['Shirts', 'Tops', 'Clothing'];
const refused: Array<[RawChannel3Listing, 'women' | 'men', string]> = [
  [product('Cotton Tee', 'unisex', TOPS), 'men', "a product Channel3 labels unisex (men's search)"],
  [product('Cotton Tee', 'unisex', TOPS), 'women', "a product Channel3 labels unisex (women's search)"],
  [product('Cotton Tee', null, TOPS), 'men', 'a product with no gender label'],
  [product('Cotton Tee', '', TOPS), 'women', 'a product with an empty gender label'],
  [product('Silk Wrap Blouse', 'female', TOPS), 'men', "a product labelled female, on a men's search"],
  [product('Oxford Shirt', 'male', TOPS), 'women', "a product labelled male, on a women's search"],
  [product("Women's Linen Shirt", 'male', TOPS), 'men', "a male-labelled product whose title says women's"],
  [product('Pleated Midi Skirt', 'male', ['Skirts', 'Clothing']), 'men', 'a male-labelled product that is a skirt'],
  [product("Men's Flannel Shirt", 'female', TOPS), 'women', "a female-labelled product whose title says men's"],
  [product('Polo Shirt', 'male', TOPS, { age: 'kids' }), 'men', "a kids' product"],
  [product('Romper', 'female', ['Rompers', 'Clothing'], { age: 'toddler' }), 'women', "a toddler's product"],
  [product('Boys Polo Shirt', 'male', TOPS, { age: null }), 'men', "a product with no age whose title says boys"],
  [product('Lot of 5 Dress Shirts', 'male', TOPS), 'men', 'a job lot'],
  [product('Phone Case with Card Slot', 'female', ['Phone Cases', 'Electronics']), 'women', 'something that is not clothing'],
  [product('Scented Candle', 'female', ['Candles', 'Home']), 'women', 'a homeware product'],
  [product('Blouse', 'female', TOPS, { imageUrl: '' }), 'women', 'a product with no photo'],
  [product('Blouse', 'female', TOPS, { imageUrl: 'http://cdn.example.com/a.jpg' }), 'women', 'a photo not served over https'],
  [product('Blouse', 'female', TOPS, { price: 0 }), 'women', 'a product with no price'],
  [product('Blouse', 'female', TOPS, { sourceUrl: '' }), 'women', 'a product with no buy link'],
  [product('Blouse', 'female', TOPS, { domain: '' }), 'women', 'a product with no store'],
];
for (const [raw, department, why] of refused) {
  check(acceptChannel3Listing(raw, department) === null, `refused: ${why} ("${raw.name}")`);
}
const named = (domain: string) => acceptChannel3Listing(product('Wool Coat', 'female', ['Coats'], { domain }), 'women')?.retailer;
check(named('us.sunspel.com') === 'sunspel.com' && named('shop.mango.com') === 'mango.com' && named('next.co.uk') === 'next.co.uk' && named('oakandfort.ca') === 'oakandfort.ca', 'a storefront prefix is dropped from the store name; a country ending is kept');
check(acceptChannel3Listing(product('Floral Maxi Dress', 'female', ['Dresses']), 'women', { category: 'tops' }) === null, "the shopper's chosen category is respected");
check(acceptChannel3Listing(product('Wool Coat', 'female', ['Coats'], { age: null }), 'women')?.category === 'outerwear', 'an unstated age is accepted when nothing says kids');
const sale = acceptChannel3Listing(product('Wool Coat', 'female', ['Coats'], { price: 120, originalPrice: 200 }), 'women');
check(sale?.originalPrice === 200 && sale.price === 120, 'a real sale price is carried through');
const notSale = acceptChannel3Listing(product('Wool Coat', 'female', ['Coats'], { price: 120, originalPrice: 100 }), 'women');
check(!!notSale && notSale.originalPrice === undefined, 'a "compare at" price below the price is not shown as a discount');
check(acceptChannel3Listing(product('Leather Jacket', 'male', ['Jackets'], { condition: 'used' }), 'men')?.condition === 'secondhand', 'a used offer is labelled secondhand');

console.log('# Paying stores first');
const coat = (name: string, commissionRate?: number | null) =>
  acceptChannel3Listing(product(name, 'female', ['Coats'], commissionRate === undefined ? {} : { commissionRate }), 'women')!;
check(coat('Paid Coat', 0.07).paysCommission === true, 'a store that pays is marked as paying');
check(coat('Unpaid Coat', 0).paysCommission === false, 'a store that pays nothing is marked as unpaid');
check(coat('Unknown Coat').paysCommission === undefined && coat('Null Coat', null).paysCommission === undefined, 'an unknown rate is not treated as unpaid');
const curated = { ...coat('Curated Coat'), id: 't001' };
const mixed = [coat('A', 0), curated, coat('B', 0.05), coat('C', 0), coat('D', 0.1)];
const ordered = payingStoresFirst(mixed, p => p).map(p => p.name);
check(ordered.join(',') === 'Curated Coat,B,D,A,C', `paying stores and curated picks lead, unpaid stores follow, each group in its own order (got ${ordered.join(',')})`);
check(payingStoresFirst([] as typeof mixed, p => p).length === 0 && mixed.map(p => p.name).join(',') === 'A,Curated Coat,B,C,D', 'the original list is left untouched');
const shop = read('src/screens/ShopScreen.tsx');
check(/const ranked = sort === 'match' \? payingStoresFirst\(scored, m => m\.product\) : orderMatchedForSort\(scored, sort\);/.test(shop), 'the Shop lists paying stores first in its default order, and in the chosen order otherwise');
check(/a\.order - b\.order \|\|\s*Number\(a\.m\.product\.paysCommission === false\) - Number\(b\.m\.product\.paysCommission === false\) \|\|\s*b\.m\.matchScore - a\.m\.matchScore/.test(shop), 'under a trend, paying stores lead within each kind of match');
check(/Stores that ' \+\s*\n\s*'pay us a commission are listed ahead of stores that do not\. /.test(read('src/services/affiliateNetwork.ts')), 'the page says paying stores are listed first');
const fnText = read('functions/src/index.ts');
const twoOffers = mapChannel3Product({
  id: 'x1', title: 'Wool Coat', gender: 'female', images: [{ url: 'https://cdn.trychannel3.com/a', is_main_image: true, shot_type: 'hero' }],
  offers: [
    { url: 'https://buy.trychannel3.com/a', domain: 'a.com', price: { price: 100 }, availability: 'InStock', max_commission_rate: 0 },
    { url: 'https://buy.trychannel3.com/b', domain: 'b.com', price: { price: 110 }, availability: 'InStock', max_commission_rate: 0.07 },
    { url: 'https://buy.trychannel3.com/c', domain: 'c.com', price: { price: 90 }, availability: 'OutOfStock', max_commission_rate: 0.2 },
  ],
});
check(twoOffers?.domain === 'b.com' && twoOffers.commissionRate === 0.07 && twoOffers.price === 110, "the function picks the best-paying in-stock offer and passes its rate on");

console.log("# The shopper's sort");
// Scored as the Shop receives them from scoreAndRankProducts: best match
// first, which is NOT price order. An unpaid store sits in the middle, and
// two pieces share a price.
const scoredCoat = (name: string, price: number, matchScore: number, extra: Partial<RawChannel3Listing> = {}) => ({
  product: acceptChannel3Listing(product(name, 'female', ['Coats'], { price, ...extra }), 'women')!,
  matchScore,
});
const byMatch = [
  scoredCoat('P70', 70, 95),
  scoredCoat('P35', 35, 90, { commissionRate: 0 }),
  scoredCoat('P50-weak', 50, 60),
  scoredCoat('P320', 320, 85, { originalPrice: 400 }),
  scoredCoat('P50-strong', 50, 80, { originalPrice: 100 }),
  scoredCoat('P36', 36, 40, { originalPrice: 40 }),
].sort((a, b) => b.matchScore - a.matchScore);
const names = (list: typeof byMatch) => list.map(m => m.product.name).join(',');
const before = names(byMatch);
const rising = orderMatchedForSort(byMatch, 'price-low');
const falling = orderMatchedForSort(byMatch, 'price-high');
const deepest = orderMatchedForSort(byMatch, 'discount');
const neverRises = (values: number[]) => values.every((v, i) => i === 0 || values[i - 1] >= v);
const neverFalls = (values: number[]) => values.every((v, i) => i === 0 || values[i - 1] <= v);
check(neverFalls(rising.map(m => m.product.price)) && names(rising) === 'P35,P36,P50-strong,P50-weak,P70,P320', `"Price ↑" lists cheapest first, the better match first at the same price (got ${names(rising)})`);
check(neverRises(falling.map(m => m.product.price)) && names(falling) === 'P320,P70,P50-strong,P50-weak,P36,P35', `"Price ↓" lists dearest first, the better match first at the same price (got ${names(falling)})`);
check(neverRises(deepest.map(m => discountPercent(m.product) ?? 0)) && names(deepest) === 'P50-strong,P320,P36,P70,P35,P50-weak', `"Biggest discount" lists the deepest cut first, then full-price pieces by match (got ${names(deepest)})`);
check(rising.length === byMatch.length && names(byMatch) === before, 'no piece is dropped and the scored list is left untouched');
check(orderMatchedForSort(byMatch, 'match') === byMatch && orderMatchedForSort(byMatch, undefined) === byMatch && orderMatchedForSort(byMatch, 'newest') === byMatch, 'the default match order is passed through unchanged');
check(isShopperSort('price-low') && isShopperSort('price-high') && isShopperSort('discount') && !isShopperSort('match') && !isShopperSort('newest') && !isShopperSort(undefined), 'only the price and discount chips count as a chosen order');
check(shop.indexOf('const scored = scoreAndRankProducts(') > 0 && shop.indexOf('const scored = scoreAndRankProducts(') < shop.indexOf('orderMatchedForSort(scored, sort)'), 'the chosen order is applied after scoring, which re-ranks by match');
check(/if \(isShopperSort\(sort\)\) return orderMatchedForSort\(carrying\.map\(x => x\.m\), sort\);\s*\n\s*const ordered = carrying\s*\n/.test(shop) && /\}, \[products, focusTrend, route\.params\?\.trendGap, sort, priceMix\]\);/.test(shop), 'under a trend, a chosen price order wins over the trend order');
check(/\.sort\(\(a, b\) => b\.matchScore - a\.matchScore\);\s*\n\}/.test(read('src/services/marketplaceMatchingService.ts')), 'scoring itself still ranks by match for every other caller');

console.log('# Wiring');
const adapter = read('src/services/affiliateNetwork.ts');
const c3 = adapter.slice(adapter.indexOf('class Channel3Adapter'), adapter.indexOf("const searchRakutenProductsFn"));
const noDepartment = c3.slice(c3.indexOf('if (departments.length === 0) {'), c3.indexOf('try {', c3.indexOf('if (departments.length === 0) {')));
check(/^if \(departments\.length === 0\) \{[\s\S]*?searchChannel3ProductsFn\(\{\}\)[\s\S]*?return empty;\s*\n\s*\}/.test(noDepartment) && !/searchDepartment/.test(noDepartment) && c3.indexOf('if (departments.length === 0) {') < c3.indexOf('departments.map(d => this.searchDepartment(filters, d))'), 'no department chosen = the feed is not searched (the one call made asks for nothing, to wake the function)');
check(/\.map\(listing => acceptChannel3Listing\(listing, department, \{ category: filters\.category \}\)\)/.test(c3) && !/as Product\[\]/.test(c3), 'every product goes through acceptChannel3Listing');
check(/searchChannel3ProductsFn\(\{ \.\.\.rest, department \}\)/.test(c3), 'each call names one department');
check(/if \(channel3Status === 'off' && Date\.now\(\) < channel3RetryAt\) return empty;/.test(c3), 'a feed that is not answering is left alone');
check(/\(channel3IsLive\(\) \? CHANNEL3_NOTICE : ''\)/.test(adapter) && /'We may earn a commission when you buy through links on this page\. /.test(adapter), "Channel3's required disclosure is shown, word for word, whenever its products are on the page");
check(/product\.id\.startsWith\('c3-'\)\s*\n?\s*\? 'Channel3'/.test(adapter), "a Channel3 link is never re-wrapped by another network");

const fn = read('functions/src/index.ts');
const search = fn.slice(fn.indexOf('export const searchChannel3Products'), fn.indexOf('// ==================== PERSONAL TREND REPORT'));
check(/if \(!department\) return \{ products: \[\], hasMore: false, totalCount: 0 \};/.test(search), 'the function answers nothing without a department');
check(JSON.stringify(channel3Filters('men')) === JSON.stringify({ gender: 'male', age: ['adult'], availability: ['InStock'] }) && channel3Filters('women').gender === 'female' && /const filters: Record<string, any> = channel3Filters\(department\);/.test(search), 'it asks Channel3 for one gender, adults (as a list), in stock');
const budget = fn.slice(fn.indexOf('async function channel3Search'), fn.indexOf('async function channel3ProductById'));
// The owner's call (2026-11-13): no cap on searches. They are still counted.
check(!/CHANNEL3_MONTHLY_SEARCH_LIMIT|CHANNEL3_FREE_SEARCHES|spendChannel3Search|capped: true/.test(fn), 'there is no monthly cap on searches: none is refused for the number already made');
check(budget.indexOf('countChannel3Search();') > -1 && budget.indexOf('countChannel3Search();') < budget.indexOf('fetch(') && /FieldValue\.increment\(1\)/.test(fn) && /\.catch\(error => console\.error\('Channel3: could not count a search', error\)\);/.test(fn), 'every search is counted in the month\'s tally, and a count that fails cannot fail the search');
check(search.indexOf('if (!context.auth) return { products: [], department, hasMore: false, totalCount: 0 };') > -1 && search.indexOf('if (!context.auth) return { products: [], department, hasMore: false, totalCount: 0 };') < search.indexOf('channel3Search(apiKey, body)'), 'with no cap, who may cause a search still holds: a typed search needs a signed-in member');
check(search.indexOf('channel3Cache.get(cacheKey)') > -1 && search.indexOf('channel3Cache.get(cacheKey)') < search.indexOf('channel3Search(apiKey, body)'), 'a repeated search is answered from memory before any credit is spent');
const passed = mapChannel3Product({
  id: 'x2', title: 'Linen Shirt', gender: 'male', age: 'adult',
  category: { title: 'Shirts', path: [{ title: 'Clothing' }, { title: 'Shirts & Tops' }, { title: 'Shirts' }] },
  images: [{ url: 'https://cdn.trychannel3.com/a', is_main_image: true, shot_type: 'hero' }],
  offers: [{ url: 'https://buy.trychannel3.com/a', domain: 'a.com', price: { price: 100 }, availability: 'InStock' }],
});
check(passed?.gender === 'male' && passed.age === 'adult' && passed.categoryNames.join('>') === 'Shirts>Shirts>Shirts & Tops>Clothing' && passed.id === 'c3-x2', "Channel3's own gender, age and category are passed on for the client to check");
const photoPick = channel3Photo([
  { url: 'https://cdn.trychannel3.com/detail', cleaned_url: 'https://cdn.trychannel3.com/cleaned/detail', is_main_image: true, shot_type: 'detail' },
  { url: 'https://cdn.trychannel3.com/chart', shot_type: 'size_chart' },
  { url: 'https://cdn.trychannel3.com/model', cleaned_url: 'https://cdn.trychannel3.com/cleaned/model', shot_type: 'on_model', alt_text: 'Man wearing a linen shirt.' },
  { url: 'https://cdn.trychannel3.com/hero', shot_type: 'hero' },
]);
check(photoPick.url === 'https://cdn.trychannel3.com/hero' && !/cleaned/.test(photoPick.url), "the card shows the retailer's own photo of the whole piece, never a close-up, a size chart or the tight 'cleaned' cut-out");
check(!/CHANNEL3_API_KEY/.test(read('src/services/affiliateNetwork.ts')) && !/CHANNEL3_API_KEY/.test(read('src/services/channel3Listing.ts')), 'the key lives only on the server');

console.log(`\n${checks} checks.`);
if (failures) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log("OK - a Channel3 product is shown only to the department Channel3 labels it for, to adults, in a clothing category.");

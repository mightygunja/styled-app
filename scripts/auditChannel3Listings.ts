/**
 * Live Channel3 products audit: nothing from the feed reaches the wrong
 * department, and nothing is shown that Channel3 does not label as exactly
 * one department, for an adult, in a clothing category.
 *
 * The products below are shaped as the searchChannel3Products function
 * returns them (built from Channel3's documented response). They are
 * fixtures, not a live call - the real feed has to be checked by eye once
 * the key is in.
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
 *     the monthly budget, or could appear without its required disclosure.
 *
 * Run:  npx tsx scripts/auditChannel3Listings.ts
 */

import fs from 'fs';
import path from 'path';
import { acceptChannel3Listing, CHANNEL3_GENDER, RawChannel3Listing } from '../src/services/channel3Listing';
import { departmentVisible } from '../src/services/departmentFit';

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
check(acceptChannel3Listing(product('Floral Maxi Dress', 'female', ['Dresses']), 'women', { category: 'tops' }) === null, "the shopper's chosen category is respected");
check(acceptChannel3Listing(product('Wool Coat', 'female', ['Coats'], { age: null }), 'women')?.category === 'outerwear', 'an unstated age is accepted when nothing says kids');
const sale = acceptChannel3Listing(product('Wool Coat', 'female', ['Coats'], { price: 120, originalPrice: 200 }), 'women');
check(sale?.originalPrice === 200 && sale.price === 120, 'a real sale price is carried through');
const notSale = acceptChannel3Listing(product('Wool Coat', 'female', ['Coats'], { price: 120, originalPrice: 100 }), 'women');
check(!!notSale && notSale.originalPrice === undefined, 'a "compare at" price below the price is not shown as a discount');
check(acceptChannel3Listing(product('Leather Jacket', 'male', ['Jackets'], { condition: 'used' }), 'men')?.condition === 'secondhand', 'a used offer is labelled secondhand');

console.log('# Wiring');
const adapter = read('src/services/affiliateNetwork.ts');
const c3 = adapter.slice(adapter.indexOf('class Channel3Adapter'), adapter.indexOf("const searchRakutenProductsFn"));
check(/const departments = departmentsFor\(filters\.wardrobeFocus\);[\s\S]*?if \(departments\.length === 0\) return empty;/.test(c3), 'no department chosen = the feed is not searched');
check(/\.map\(listing => acceptChannel3Listing\(listing, department, \{ category: filters\.category \}\)\)/.test(c3) && !/as Product\[\]/.test(c3), 'every product goes through acceptChannel3Listing');
check(/searchChannel3ProductsFn\(\{ \.\.\.rest, department \}\)/.test(c3), 'each call names one department');
check(/if \(channel3Status === 'off' && Date\.now\(\) < channel3RetryAt\) return empty;/.test(c3), 'a feed that is not answering is left alone');
check(/\(channel3IsLive\(\) \? CHANNEL3_NOTICE : ''\)/.test(adapter) && /'We may earn a commission when you buy through links on this page\. /.test(adapter), "Channel3's required disclosure is shown, word for word, whenever its products are on the page");
check(/product\.id\.startsWith\('c3-'\)\s*\n?\s*\? 'Channel3'/.test(adapter), "a Channel3 link is never re-wrapped by another network");

const fn = read('functions/src/index.ts');
const search = fn.slice(fn.indexOf('export const searchChannel3Products'), fn.indexOf('// ==================== PERSONAL TREND REPORT'));
check(/if \(!department\) return \{ products: \[\], hasMore: false, totalCount: 0 \};/.test(search), 'the function answers nothing without a department');
check(/gender: department === 'men' \? 'male' : 'female',\s*\n\s*age: 'adult',\s*\n\s*availability: \['InStock'\],/.test(search), 'it asks Channel3 for one gender, adults, in stock');
check(/if \(!\(await spendChannel3Search\(limit\)\)\) \{/.test(search) && /capped: true/.test(search), 'a search past the monthly budget is not made');
check(/Number\(process\.env\.CHANNEL3_MONTHLY_SEARCH_LIMIT\) \|\| CHANNEL3_FREE_SEARCHES/.test(search) && /const CHANNEL3_FREE_SEARCHES = 1000;/.test(fn), "the budget defaults to Channel3's free allowance");
check(search.indexOf('channel3Cache.get(cacheKey)') < search.indexOf('spendChannel3Search(limit)'), 'a repeated search is answered from memory before any credit is spent');
check(/gender: item\.gender \?\? null,/.test(search) && /age: item\.age \?\? null,/.test(search) && /categoryNames:/.test(search), "Channel3's own gender, age and category are passed on for the client to check");
check(!/CHANNEL3_API_KEY/.test(read('src/services/affiliateNetwork.ts')) && !/CHANNEL3_API_KEY/.test(read('src/services/channel3Listing.ts')), 'the key lives only on the server');

console.log(`\n${checks} checks.`);
if (failures) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log("OK - a Channel3 product is shown only to the department Channel3 labels it for, to adults, in a clothing category.");

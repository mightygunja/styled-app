/**
 * Live eBay listings audit: nothing from the live feed reaches the wrong
 * department, and nothing is shown that eBay does not file under exactly
 * one department.
 *
 * The listings below are shaped like eBay's Browse API results as the
 * searchEbayProducts function returns them. They are fixtures, not a live
 * call - the real feed has to be checked by eye once the keys are in.
 *
 * Fails when:
 *   - a listing eBay files under the other department, both, neither, kids'
 *     or unisex is accepted;
 *   - a listing whose title names the other department, or the other
 *     department's garments, is accepted;
 *   - a job lot, costume, pattern or spare part is accepted;
 *   - an accepted listing lacks a department, a category, a photo, a price
 *     or a link to eBay;
 *   - a listing is filed in the wrong category of the app ("dress shirt" as
 *     a dress), or the shopper's chosen category is ignored;
 *   - an account with no department chosen would be searched for at all;
 *   - the live feed could be called without a department, shown in the
 *     iPhone app before eBay approves it, or described as live when it is
 *     not answering.
 *
 * Run:  npx tsx scripts/auditEbayListings.ts
 */

import fs from 'fs';
import path from 'path';
import {
  acceptListing,
  departmentsFor,
  listingCategory,
  listingDepartment,
  RawEbayListing,
} from '../src/services/ebayListing';
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

const ROOT = 'Clothing, Shoes & Accessories';
const listing = (name: string, categoryNames: string[], extra: Partial<RawEbayListing> = {}): RawEbayListing => ({
  id: `v1|${Math.abs(name.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}|0`,
  name,
  brand: 'Brand',
  price: 48,
  currency: 'USD',
  imageUrl: 'https://i.ebayimg.com/images/g/abc/s-l500.jpg',
  sourceUrl: 'https://www.ebay.com/itm/123456789012?mkcid=1&campid=5339199339',
  condition: 'new',
  categoryNames,
  ...extra,
});

const WOMEN_TOPS = ['Tops', "Women's Clothing", 'Women', ROOT];
const WOMEN_DRESSES = ['Dresses', "Women's Clothing", 'Women', ROOT];
const WOMEN_SHOES = ['Flats', "Women's Shoes", 'Women', ROOT];
const WOMEN_BAGS = ["Women's Bags & Handbags", 'Women', ROOT];
const MEN_SHIRTS = ['Casual Button-Down Shirts', 'Shirts', "Men's Clothing", 'Men', ROOT];
const MEN_DRESS_SHIRTS = ['Dress Shirts', 'Shirts', "Men's Clothing", 'Men', ROOT];
const MEN_COATS = ['Coats, Jackets & Vests', "Men's Clothing", 'Men', ROOT];
const MEN_SHOES = ['Casual Shoes', "Men's Shoes", 'Men', ROOT];
const MEN_PANTS = ['Pants', "Men's Clothing", 'Men', ROOT];

// ---- 1. Department comes from eBay's filing ----
console.log('# Department');
check(listingDepartment(WOMEN_TOPS) === 'women' && listingDepartment(MEN_SHIRTS) === 'men', "a women's and a men's category path are read as such");
check(listingDepartment([]) === null && listingDepartment(undefined) === null, 'no category path = no department');
check(listingDepartment(['Tops', ROOT]) === null, 'a path that names neither department = no department');
check(listingDepartment(['Tops', "Women's Clothing", "Men's Clothing", ROOT]) === null, 'a path that names both = no department');
check(listingDepartment(["Unisex Adult Clothing", 'Unisex Clothing, Shoes & Accs', ROOT]) === null, 'unisex categories are not shown to either department');
check(listingDepartment(["Girls' Clothing", "Kids' Clothing, Shoes & Accs", ROOT]) === null && listingDepartment(["Boys' Shoes", 'Kids', ROOT]) === null, "kids' categories are not shown");
check(listingDepartment(['Mentoring Books']) === null && listingDepartment(['Womenswear Patterns', 'Crafts']) === null, 'a word that merely starts like a department is not one');
check(departmentsFor('womens').join() === 'women' && departmentsFor('mens').join() === 'men' && departmentsFor('all').join() === 'women,men', 'each wardrobe choice searches its own department(s)');
check(departmentsFor(undefined).length === 0, 'an account that has not chosen is searched for nothing');

// ---- 2. Accepting and refusing ----
console.log('# Listings');
const accepted: Array<[RawEbayListing, 'women' | 'men', string]> = [
  [listing('Silk Blend Wrap Blouse Ivory Size M', WOMEN_TOPS), 'women', 'tops'],
  [listing('Floral Midi Dress Long Sleeve', WOMEN_DRESSES), 'women', 'dresses'],
  [listing('Leather Ballet Flats Black 8', WOMEN_SHOES), 'women', 'shoes'],
  [listing('Slouchy Leather Shoulder Bag Chocolate', WOMEN_BAGS), 'women', 'accessories'],
  [listing('Oxford Button Down Shirt Blue Large', MEN_SHIRTS), 'men', 'tops'],
  [listing('Slim Fit Dress Shirt White 16 34', MEN_DRESS_SHIRTS), 'men', 'tops'],
  [listing('Suede Bomber Jacket Tan', MEN_COATS), 'men', 'outerwear'],
  [listing('Suede Penny Loafers Brown 10', MEN_SHOES), 'men', 'shoes'],
  [listing('Pleated Wide Leg Trousers Charcoal 34', MEN_PANTS), 'men', 'bottoms'],
];
for (const [raw, department, category] of accepted) {
  const product = acceptListing(raw, department);
  check(!!product, `accepted: "${raw.name}" for ${department}`);
  if (!product) continue;
  check(product.department === department, `"${raw.name}" carries its department (${product.department})`);
  check(product.category === category, `"${raw.name}" is filed as ${category} (got ${product.category})`);
  check(product.id.startsWith('ebay-') && product.retailer === 'eBay' && product.sourceUrl === raw.sourceUrl && product.imageUrl === raw.imageUrl, `"${raw.name}" keeps the listing's own photo and link`);
  const other = department === 'women' ? 'mens' : 'womens';
  check(!departmentVisible(product.department, other) && !departmentVisible(product.department, undefined), `"${raw.name}" is invisible to the other department and to an account that has not chosen`);
  check(acceptListing(raw, department === 'women' ? 'men' : 'women') === null, `"${raw.name}" is refused when searched for the other department`);
}

const refused: Array<[RawEbayListing, 'women' | 'men', string]> = [
  [listing("Women's Linen Shirt Relaxed Fit", MEN_SHIRTS), 'men', "a men's-category listing whose title says women's"],
  [listing('Ladies Cardigan Cable Knit', MEN_SHIRTS), 'men', '...or ladies'],
  [listing('Pleated Midi Skirt Black', MEN_PANTS), 'men', "...or names a skirt"],
  [listing('Oxford Shirt Blue (womens fit)', MEN_SHIRTS), 'men', '...or womens without the apostrophe'],
  [listing("Men's Flannel Shirt Plaid XL", WOMEN_TOPS), 'women', "a women's-category listing whose title says men's"],
  [listing('Mens Leather Belt Brown', WOMEN_BAGS), 'women', '...or mens'],
  [listing('Silk Necktie Navy Dots', WOMEN_TOPS), 'women', '...or names a necktie'],
  [listing('Boys Polo Shirt Navy Size 10', MEN_SHIRTS), 'men', "a kids' piece filed under men's"],
  [listing('Girls Party Dress Pink', WOMEN_DRESSES), 'women', "a kids' piece filed under women's"],
  [listing('Lot of 5 Dress Shirts Mixed Brands', MEN_DRESS_SHIRTS), 'men', 'a job lot'],
  [listing('Pirate Costume Shirt Halloween', MEN_SHIRTS), 'men', 'a costume'],
  [listing('Vintage Sewing Pattern Wrap Dress', WOMEN_DRESSES), 'women', 'a sewing pattern'],
  [listing('Cotton Tee White', ['Tops', ROOT]), 'women', 'a listing with no department in its category path'],
  [listing('Cotton Tee White', []), 'women', 'a listing with no category path'],
  [listing('Unisex Hoodie Grey', ['Hoodies', 'Unisex Adult Clothing', ROOT]), 'men', 'a unisex-category listing'],
  [listing('Blouse Ivory', WOMEN_TOPS, { imageUrl: '' }), 'women', 'a listing with no photo'],
  [listing('Blouse Ivory', WOMEN_TOPS, { price: 0 }), 'women', 'a listing with no price'],
  [listing('Blouse Ivory', WOMEN_TOPS, { sourceUrl: 'https://ebay.com.evil.example/itm/1' }), 'women', 'a link that is not on ebay.com'],
  [listing('Blouse Ivory', WOMEN_TOPS, { sourceUrl: 'http://www.ebay.com/itm/1' }), 'women', 'a link that is not https'],
  [listing('Handmade Ceramic Mug', ["Women's Clothing", 'Women', ROOT]), 'women', 'something that is not a piece of clothing'],
];
for (const [raw, department, why] of refused) {
  check(acceptListing(raw, department) === null, `refused: ${why} ("${raw.name}")`);
}

check(acceptListing(listing('Boyfriend Jeans Light Wash', ['Jeans', "Women's Clothing", 'Women', ROOT]), 'women')?.category === 'bottoms', '"boyfriend jeans" is not mistaken for a boys\' or a men\'s piece');
check(acceptListing(listing('Menswear-Inspired Blazer Grey', ['Blazers', "Women's Clothing", 'Women', ROOT]), 'women') === null, 'a women\'s listing that calls itself menswear is left out rather than argued with');
check(acceptListing(listing('Floral Midi Dress', WOMEN_DRESSES), 'women', { category: 'tops' }) === null, "the shopper's chosen category is respected");
check(acceptListing(listing('Floral Midi Dress', WOMEN_DRESSES), 'women', { category: 'dresses' })?.category === 'dresses', '...and matches when it should');
check(listingCategory('Slim Fit Dress Shirt', ['Dress Shirts', "Men's Clothing"]) === 'tops' && listingCategory('Dress Pants Navy', []) === 'bottoms', 'a dress shirt and dress pants are not dresses');
check(listingCategory('Leather Chelsea Boots', ["Men's Shoes", 'Men']) === 'shoes' && listingCategory('Wool Overcoat', ['Coats, Jackets & Vests']) === 'outerwear', 'shoes and coats land where they belong');
check(listingCategory('Something Nice', ["Women's Clothing", 'Women', ROOT]) === null, 'a listing that names no kind of piece has no category');
const long = acceptListing(listing('A'.repeat(40) + ' Shirt ' + 'B'.repeat(80), MEN_SHIRTS), 'men');
check(!!long && long.name.length <= 90, 'a very long seller title is shortened, not dropped');

// ---- 3. Wiring ----
console.log('# Wiring');
const adapter = read('src/services/affiliateNetwork.ts');
const ebay = adapter.slice(adapter.indexOf('class EbayPartnerNetworkAdapter'), adapter.indexOf("const searchRakutenProductsFn"));
check(/const departments = departmentsFor\(filters\.wardrobeFocus\);[\s\S]*?if \(departments\.length === 0\) return empty;/.test(ebay), 'no department chosen = the live feed is not searched');
check(/\.map\(listing => acceptListing\(listing, department, \{ category: filters\.category \}\)\)/.test(ebay) && !/as Product\[\]/.test(ebay), 'every listing goes through acceptListing; none is passed along as it came');
check(/searchEbayProductsFn\(\{ \.\.\.rest, department \}\)/.test(ebay), 'each call to the function names one department');
check(/if \(ebayStatus === 'off' && Date\.now\(\) < ebayRetryAt\) return empty;/.test(ebay) && /EBAY_TIMEOUT_MS/.test(ebay), 'a feed that is not answering is left alone, and a slow one cannot hold the page');
check(/const EBAY_APPROVED_FOR_MOBILE_APPS = false;/.test(adapter) && /if \(usesEbay && Platform\.OS !== 'web' && !EBAY_APPROVED_FOR_MOBILE_APPS\) return 'amazon';/.test(adapter), 'eBay stays off in the iPhone app until eBay approves it');
check(/if \(provider === 'starter' && !ebayIsLive\(\)\) \{/.test(adapter), 'the page says "live eBay listings" only once they are on it');
check(/return \(provider === 'ebay' \|\| provider === 'starter'\) && ebayIsLive\(\);/.test(adapter), 'the Secondhand filter appears only while eBay is answering');

const fn = read('functions/src/index.ts');
const search = fn.slice(fn.indexOf('export const searchEbayProducts'), fn.indexOf('// ==================== PERSONAL TREND REPORT'));
check(/if \(!department\) return \{ products: \[\], hasMore: false, totalCount: 0 \};/.test(search), 'the function answers nothing without a department');
check(/'buyingOptions:\{FIXED_PRICE\}'/.test(search) && /categoryNames: Array\.isArray\(item\.categories\)/.test(search), "the function asks for fixed-price listings and returns eBay's category path");
check(/item\.itemAffiliateWebUrl \|\| item\.itemWebUrl/.test(search), 'the tracked link is used when eBay supplies it');
check(!/category: category \|\| 'tops'/.test(search), 'the function no longer files everything as a top');

const discovery = read('src/services/discoveryService.ts');
const searches = discovery.match(/\.search\(\{[\s\S]*?\}\)/g) || [];
check(searches.length >= 3 && searches.every(call => !/wardrobeFocus/.test(call)), 'composed looks and gap picks are built from the curated catalogue only (no live listings in an outfit)');
check(/wardrobeFocus: profile\?\.wardrobeFocus,/.test(read('src/screens/ShopScreen.tsx')), 'Shop searches the live feed for the account\'s own department');

console.log(`\n${checks} checks.`);
if (failures) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log("OK - a live listing is shown only to the department eBay files it under, and only when its title agrees.");

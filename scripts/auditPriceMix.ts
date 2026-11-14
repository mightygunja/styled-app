/**
 * Audit: the mix of prices a member asks for is the mix they are shown.
 *
 *   npx tsx scripts/auditPriceMix.ts
 *
 * Runs the real arranging code (src/services/priceMix.ts, starterPool.ts)
 * and reads the screens that use it. No network, no Firebase.
 */

import fs from 'fs';
import path from 'path';
import {
  MIX_SHARES,
  PRICE_MIX_OPTIONS,
  PRICE_TIERS,
  PriceMix,
  PriceTier,
  arrangeByPriceMix,
  arrangeWithinGroups,
  isPriceMix,
  priceTier,
  shapesOrder,
} from '../src/services/priceMix';
import { starterPool } from '../src/services/starterPool';
import { profileSignature } from '../src/services/profileEvents';
import { SHELF_PRICE_BANDS } from '../functions/src/channel3';
import { Product } from '../src/models/product';

let checks = 0;
let failures = 0;
function check(ok: boolean, label: string) {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok ' : 'FAIL '} ${label}`);
}
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');

const PRICE_OF: Record<PriceTier, number> = { low: 40, mid: 120, high: 600 };
let made = 0;
const product = (tier: PriceTier, extra: Partial<Product> = {}): Product =>
  ({
    id: `c3-p${made++}`,
    name: `Shirt ${made}`,
    brand: 'Brand',
    category: 'tops',
    price: PRICE_OF[tier],
    imageUrl: 'https://cdn.store.example/p.jpg',
    color: 'white',
    ...extra,
  }) as Product;
/** A ranked list with the bands in thirds, expensive first - the worst case for an affordable member. */
const ranked = (each: number): Product[] =>
  Array.from({ length: each }, () => [product('high'), product('mid'), product('low')]).flat();
const count = (list: Product[], tier: PriceTier) => list.filter(p => priceTier(p) === tier).length;
const ids = (list: Product[]) => list.map(p => p.id).join();

console.log('# Bands');
check(JSON.stringify(PRICE_TIERS) === JSON.stringify(SHELF_PRICE_BANDS), 'the app and the server use the same price bands, category for category');
check(Object.values(PRICE_TIERS).every(band => band.low > 0 && band.high > band.low), 'every band has an everyday limit below its investment limit');
check(priceTier({ category: 'tops', price: 60 }) === 'low' && priceTier({ category: 'tops', price: 61 }) === 'mid' && priceTier({ category: 'tops', price: 161 }) === 'high', 'a top is everyday to $60, investment above $160');
check(priceTier({ category: 'outerwear', price: 140 }) === 'low' && priceTier({ category: 'tops', price: 140 }) === 'mid', 'the bands are per category: $140 is an everyday coat and a mid-range top');
check(priceTier({ category: 'bags' as any, price: 300 }) === 'high' && priceTier({ category: 'tops', price: 0 }) === 'mid', 'a category with no bands of its own uses the accessories bands; a product with no price sits in the middle');

console.log('# Mixes');
check(Object.values(MIX_SHARES).every(s => s.low + s.mid + s.high === 20 && s.low > 0 && s.mid > 0 && s.high > 0), 'every mix is shares of twenty, and no mix leaves a band out altogether');
check(MIX_SHARES.affordable.low > MIX_SHARES.balanced.low && MIX_SHARES.balanced.low > MIX_SHARES.elevated.low && MIX_SHARES.elevated.low > MIX_SHARES.designer.low && MIX_SHARES.affordable.high < MIX_SHARES.balanced.high && MIX_SHARES.balanced.high < MIX_SHARES.elevated.high && MIX_SHARES.elevated.high < MIX_SHARES.designer.high, 'from affordable to investment, each mix shows fewer everyday pieces and more investment ones');
check(PRICE_MIX_OPTIONS.map(o => o.key).join() === 'affordable,balanced,elevated,designer,any' && PRICE_MIX_OPTIONS.every(o => o.label && o.line), 'the question offers the four mixes and "no preference"');
check(isPriceMix('balanced') && isPriceMix('any') && !isPriceMix('cheap') && !isPriceMix(undefined) && shapesOrder('affordable') && !shapesOrder('any') && !shapesOrder(undefined), 'only a known answer is honoured, and "no preference" shapes nothing');

console.log('# Arranging');
const list = ranked(40);
(Object.keys(MIX_SHARES) as Array<Exclude<PriceMix, 'any'>>).forEach(mix => {
  const first = arrangeByPriceMix(list, p => p, mix).slice(0, 20);
  const shares = MIX_SHARES[mix];
  check(count(first, 'low') === shares.low && count(first, 'mid') === shares.mid && count(first, 'high') === shares.high, `"${mix}": the first twenty are ${shares.low} everyday, ${shares.mid} mid-range, ${shares.high} investment`);
});
const affordable = arrangeByPriceMix(list, p => p, 'affordable');
check(affordable.length === list.length && new Set(affordable).size === list.length, 'nothing is added and nothing is hidden: every product is still on the list');
check(priceTier(affordable[0]) === 'low' && priceTier(arrangeByPriceMix(list, p => p, 'designer')[0]) === 'high', 'the list opens with the band the member leans to');
const onlyLow = (l: Product[]) => l.filter(p => priceTier(p) === 'low');
check(ids(onlyLow(affordable)) === ids(onlyLow(list)), 'inside a band the order it arrived in - best match first - is kept');
check(arrangeByPriceMix(list, p => p, 'any') === list && arrangeByPriceMix(list, p => p, undefined) === list && arrangeByPriceMix(list, p => p, null) === list, 'no answer, or "no preference", leaves the list exactly as ranked');
const thin = [...Array.from({ length: 2 }, () => product('low')), ...Array.from({ length: 10 }, () => product('high'))];
const thinOut = arrangeByPriceMix(thin, p => p, 'affordable');
check(thinOut.length === 12 && count(thinOut.slice(0, 3), 'low') === 2 && count(thinOut.slice(3), 'high') === 9, 'when a band runs out the others carry on: the page is never short');
const grouped = [...ranked(4).map(p => ({ p, group: 'pays' })), ...ranked(4).map(p => ({ p, group: 'free' }))];
const inGroups = arrangeWithinGroups(grouped, x => x.group, x => x.p, 'affordable');
check(inGroups.slice(0, 12).every(x => x.group === 'pays') && inGroups.slice(12).every(x => x.group === 'free') && priceTier(inGroups[0].p) === 'low' && priceTier(inGroups[12].p) === 'low', 'groups stay where they are (paying stores first); the mix is dealt inside each');

console.log('# Starter looks');
const isBag = () => false;
const poolList = [
  ...ranked(30),
  ...Array.from({ length: 30 }, (_, i) => product((['high', 'mid', 'low'] as PriceTier[])[i % 3], { category: 'bottoms' as any, price: [700, 150, 50][i % 3] })),
];
const plainPool = starterPool(poolList, isBag);
const affordablePool = starterPool(poolList, isBag, { priceMix: 'affordable' });
const designerPool = starterPool(poolList, isBag, { priceMix: 'designer' });
check(count(affordablePool, 'low') > count(plainPool, 'low') && count(affordablePool, 'low') >= 24 && count(affordablePool, 'high') <= 4, `an affordable member's starter pool is mostly everyday pieces (${count(affordablePool, 'low')} of ${affordablePool.length}, ${count(affordablePool, 'high')} investment)`);
check(count(designerPool, 'high') >= 24 && count(designerPool, 'low') <= 4, `and an investment member's is mostly investment pieces (${count(designerPool, 'high')} of ${designerPool.length})`);
check(ids(starterPool(poolList, isBag, { priceMix: 'any' })) === ids(plainPool), 'with no preference the pool is what it was');
const discovery = read('src/services/discoveryService.ts');
check((discovery.match(/priceMix: profile\?\.priceMix/g) || []).length === 2, "both starter pools (real products, and the catalogue fallback) are built in the member's mix");

console.log('# Profile');
const model = read('src/models/personalStyleProfile.ts');
check(/priceMix\?: PriceMix;/.test(model), 'the answer is an optional field of the style profile: older profiles stay valid');
const context = read('src/services/profileMatchContext.ts');
check(/priceMix: isPriceMix\(savedProfile\.priceMix\) \? savedProfile\.priceMix : undefined,/.test(context), 'the answer reaches every screen through the match context, and an unknown value is ignored');
const save = context.slice(context.indexOf('export async function savePriceMix'));
check(/const profile = await styleProfileService\.getStyleProfile\(userId\);/.test(save) && /\? \{ \.\.\.profile, priceMix: mix \}/.test(save), 'saving the answer lays it over the saved profile and changes nothing else');
check(profileSignature({ styleArchetypes: ['classic'] }) === profileSignature({ styleArchetypes: ['classic'], priceMix: undefined }) && profileSignature({ priceMix: 'affordable' }) !== profileSignature({ priceMix: 'designer' }) && profileSignature({ priceMix: 'affordable' }) !== profileSignature({}), 'a changed answer rebuilds the cached looks; a profile without one keeps the signature it had');
const builder = read('src/screens/StyleProfileBuilderScreen.tsx');
check(/\.\.\.existing,/.test(builder), 'the profile editor starts from the saved profile, so saving there keeps the answer');

console.log('# Survey');
const survey = read('src/screens/OnboardingScreen.tsx');
check(/const SURVEY_STEPS: Step\[\] = \['focus', 'body', 'words', 'occasion', 'budget', 'never'\];/.test(survey) && /budget: 'occasion',\n  never: 'budget',/.test(survey), 'the first-run survey asks it, between the occasion and the hard lines, and Back works through it');
check(/\{PRICE_MIX_OPTIONS\.map\(option => \(/.test(survey) && /disabled=\{priceMix === null\}/.test(survey) && /\.\.\.\(priceMix \? \{ priceMix \} : \{\}\),/.test(survey), 'the survey offers every option, waits for one, and saves it with the other answers');
const prompts = read('src/services/profilePrompts.ts');
check(!/priceMix/.test(prompts), 'no prompt is raised for it: an established member is never sent back to a survey for this answer');

console.log('# Shop');
const shop = read('src/screens/ShopScreen.tsx');
check(/const mixed = focusTrend \|\| isShopperSort\(sort\) \? matched : inPriceMix\(matched, priceMix\);\n\s*return preferRealProducts\(mixed, m => m\.product, \{ spread: !isShopperSort\(sort\) \}\);/.test(shop), "the grid is dealt out in the member's mix - and a shopper's own price or discount sort is left exactly as sorted");
check(/arrangeWithinGroups\(list, m => \(m\.product\.paysCommission === false \? 1 : 0\), m => m\.product, mix\)/.test(shop), 'stores that pay still come first; the mix is dealt inside each group');
check(/x => `\$\{x\.order\}\|\$\{Number\(x\.m\.product\.paysCommission === false\)\}`,\n\s*x => x\.m\.product,\n\s*priceMix/.test(shop), "under a trend, the mix is dealt inside each kind of trend match, so the trend's own order holds");
check(/label=\{priceMix \? `Prices: \$\{priceMixLabel\(priceMix\)\}` : 'Set price mix'\}/.test(shop) && /onPress=\{\(\) => choosePriceMix\(option\.key\)\}/.test(shop), 'the answer can be given or changed in the Shop itself, one tap');
const choose = shop.slice(shop.indexOf('const choosePriceMix'), shop.indexOf('const openDetails'));
check(/setPriceMix\(mix\);\s*\n\s*try \{\s*\n\s*await savePriceMix\(getCurrentUserId\(\), mix\);/.test(choose) && /setPriceMix\(before\);/.test(choose), 'a choice shows at once and is undone on screen if it could not be saved');
check(/if \(!profile\?\.profileReadFailed\) setPriceMix\(profile\?\.priceMix\);/.test(shop), 'a profile that failed to load does not wipe the answer on screen');

console.log('# Trends');
const trends = read('src/screens/TrendInsightsScreen.tsx');
check(/products: arrangeByPriceMix\(\s*\n\s*scoreAndRankProducts\(found\[piece\] \|\| \[\], profile, closetItems, \{ trends: \[remix\.trend\] \}\)\.map\(/.test(trends) && /profile\?\.priceMix\s*\n\s*\),/.test(trends), "each trend's real pieces are ranked for the member, then dealt out in their mix");

console.log(`\n${checks} checks.`);
if (failures) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log('OK - a member is shown products in the mix of prices they asked for, nothing is hidden, and nobody who has not answered sees any change.');

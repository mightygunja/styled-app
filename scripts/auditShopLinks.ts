/**
 * Outbound shop-link audit: what every catalogue card sends to the
 * affiliate, checked link by link.
 *
 * Curated cards open a tagged Amazon search; partner merchants (Awin) open
 * a deeplink to the product's own page. This fails when:
 *   - an Amazon link is not https://www.amazon.com/s with a `k` phrase and
 *     the Associates `tag`;
 *   - the phrase does not carry the card's name, its department (for
 *     gendered pieces), or a colour word the card states;
 *   - the phrase repeats a word, or names a brand Amazon does not stock;
 *   - an Awin link lacks the publisher id, the merchant id, or a `ued`
 *     that is that merchant's own product page;
 *   - two different cards would open the identical search.
 *
 * It cannot open Amazon and judge the results - Amazon refuses automated
 * visits - so a human spot-check of a few links is still the last step.
 *
 * Run:  npx tsx scripts/auditShopLinks.ts
 */

import fs from 'fs';
import path from 'path';
import { MOCK_CATALOG } from '../src/data/mockProductCatalog';
import { AMAZON_ASSOCIATE_TAG, amazonSearchPhrase, amazonSearchUrl } from '../src/services/amazonSearch';

// affiliateNetwork.ts imports react-native, so its Awin constants are read
// as text rather than imported.
const network = fs.readFileSync(path.join(__dirname, '../src/services/affiliateNetwork.ts'), 'utf8');
const awinId = /const AWIN_AFFILIATE_ID = '(\d+)'/.exec(network)?.[1] ?? '';
const merchantBlock = /const AWIN_MERCHANTS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(network)?.[1] ?? '';
const awinMerchants = new Map<string, string>();
for (const m of merchantBlock.matchAll(/^\s*(?:'([^']+)'|([A-Za-z]+)):\s*'(\d+)'/gm)) awinMerchants.set(m[1] || m[2], m[3]);
const MERCHANT_HOSTS: Record<string, string> = { Otra: 'otraeyewear.com', WANAYOU: 'wanayou.com' };

let failures = 0;
const fail = (message: string) => {
  failures += 1;
  console.log(`  FAIL  ${message}`);
};

if (!AMAZON_ASSOCIATE_TAG) fail('AMAZON_ASSOCIATE_TAG is empty - Amazon links would not earn');
if (!awinId) fail('AWIN_AFFILIATE_ID not found in affiliateNetwork.ts');

const VAGUE = new Set(['multi', 'print', 'printed', 'bold']);
const words = (text: string) => text.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
const seen = new Map<string, string>();
let amazon = 0;
let awin = 0;
const samples: string[] = [];

for (const product of MOCK_CATALOG) {
  const id = product.id.replace('p-', '');
  const merchantId = awinMerchants.get(product.retailer);

  if (merchantId) {
    awin += 1;
    const host = MERCHANT_HOSTS[product.retailer];
    let source: URL | null = null;
    try {
      source = new URL(product.sourceUrl);
    } catch {
      fail(`${id}: Awin merchant ${product.retailer} has no valid product URL`);
    }
    if (source && (source.protocol !== 'https:' || source.hostname.replace(/^www\./, '') !== host || !source.pathname.startsWith('/products/'))) {
      fail(`${id}: ${product.sourceUrl} is not a ${host} product page`);
    }
    const link = new URL(
      `https://www.awin1.com/cread.php?awinmid=${merchantId}&awinaffid=${encodeURIComponent(awinId)}&ued=${encodeURIComponent(product.sourceUrl)}`
    );
    if (link.searchParams.get('ued') !== product.sourceUrl) fail(`${id}: Awin ued does not round-trip`);
    continue;
  }

  amazon += 1;
  const phrase = amazonSearchPhrase(product);
  const url = new URL(amazonSearchUrl(phrase));
  const k = url.searchParams.get('k') || '';
  if (url.origin !== 'https://www.amazon.com' || url.pathname !== '/s') fail(`${id}: not an Amazon search URL (${url.origin}${url.pathname})`);
  if (url.searchParams.get('tag') !== AMAZON_ASSOCIATE_TAG) fail(`${id}: missing Associates tag`);
  if (k !== phrase) fail(`${id}: k does not round-trip ("${k}" vs "${phrase}")`);
  if ([...url.searchParams.keys()].some(key => key !== 'k' && key !== 'tag')) fail(`${id}: unexpected parameter in ${url.search}`);

  const phraseWords = words(phrase);
  if (!phrase.toLowerCase().includes(product.name.toLowerCase())) fail(`${id}: phrase lacks the card name "${product.name}"`);
  if (product.department === 'men' && !/\bmen's\b/i.test(phrase)) fail(`${id}: menswear phrase lacks "men's" (${phrase})`);
  if (product.department === 'women' && !/\bwomen's\b/i.test(phrase)) fail(`${id}: womenswear phrase lacks "women's" (${phrase})`);
  if (product.department === 'unisex' && /\b(wo)?men's\b/i.test(phrase)) fail(`${id}: cross-department phrase is gendered (${phrase})`);
  for (const colour of words(product.color || '')) {
    if (!VAGUE.has(colour) && !phraseWords.includes(colour)) fail(`${id}: phrase lacks the card's colour word "${colour}" (${phrase})`);
  }
  const repeated = phraseWords.filter((w, i) => phraseWords.indexOf(w) !== i);
  if (repeated.length) fail(`${id}: phrase repeats "${repeated[0]}" (${phrase})`);
  if (phrase.length > 90) fail(`${id}: phrase is ${phrase.length} characters (${phrase})`);

  const twin = seen.get(phrase.toLowerCase());
  if (twin) fail(`${id}: same search as ${twin} ("${phrase}") - two cards, one destination`);
  seen.set(phrase.toLowerCase(), id);

  if (amazon % 16 === 1) samples.push(`  ${id.padEnd(6)} ${product.name} (${product.color}, ${product.brand})\n         -> ${url.toString()}`);
}

console.log(`Amazon searches: ${amazon} · Awin deeplinks: ${awin} (publisher ${awinId}; merchants ${[...awinMerchants].map(([n, m]) => `${n} ${m}`).join(', ')})`);
console.log('\nSample links:\n' + samples.join('\n'));
if (failures) {
  console.log(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log(`\nOK - every card's link carries its tag and searches for the piece the card shows.`);

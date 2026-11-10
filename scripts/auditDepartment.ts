/**
 * Department audit: nothing from the other department reaches an account.
 *
 * Runs the code the app runs - shop ranking, trend rails, the trend list and
 * its wording, the Amazon search chips - once per wardrobe choice, and fails
 * on any piece or any garment word that belongs to the other department.
 *
 *   womens     womenswear + cross-department. Never menswear.
 *   mens       menswear + cross-department. Never womenswear.
 *   all        "a bit of both" - everything (an explicit choice).
 *   (unset)    cross-department ONLY. Not knowing is not "show everything".
 *
 * What it cannot check is the photograph itself: whether a "cross-department"
 * photo really shows no one of either gender. That was done by eye on
 * 2026-11-10 (all 336 photos); the ids moved as a result are pinned below so
 * they cannot drift back.
 *
 * Run:  npx tsx scripts/auditDepartment.ts
 */

import fs from 'fs';
import path from 'path';
import { MOCK_CATALOG } from '../src/data/mockProductCatalog';
import { SEED_TRENDS } from '../src/data/seedTrends';
import { FashionTrend } from '../src/models/fashionTrend';
import {
  WardrobeFocus,
  categoryOffered,
  departmentVisible,
  namesMenswear,
  namesWomenswear,
  womenswearContentVisible,
  wordFitsFocus,
} from '../src/services/departmentFit';
import { departmentAllowed, scoreAndRankProducts } from '../src/services/marketplaceMatchingService';
import { piecesForTrend, trendFitsFocus, trendsForFocus } from '../src/services/trendLooks';
import { allSeedProducts, normalizeSeedPieces, trendAnchorSearches } from '../src/services/trendSeeds';

let failures = 0;
let checks = 0;
const check = (ok: boolean, message: string) => {
  checks += 1;
  if (!ok) {
    failures += 1;
    console.log(`  FAIL  ${message}`);
  }
};
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const short = (id: string) => id.replace('p-', '');

const FOCUSES: WardrobeFocus[] = ['womens', 'mens', 'all', undefined];
const label = (focus: WardrobeFocus) => focus ?? 'unset';
const wrongFor = (focus: WardrobeFocus) => (focus === 'womens' ? 'men' : focus === 'mens' ? 'women' : null);

// ---- 1. The rule itself ----
console.log('# Rule');
check(departmentVisible('women', 'womens') && !departmentVisible('men', 'womens'), 'womens: womenswear yes, menswear no');
check(departmentVisible('men', 'mens') && !departmentVisible('women', 'mens'), 'mens: menswear yes, womenswear no');
check(departmentVisible('women', 'all') && departmentVisible('men', 'all'), '"a bit of both" sees everything');
check(!departmentVisible('women', undefined) && !departmentVisible('men', undefined), 'no choice yet: nothing gendered');
FOCUSES.forEach(focus => check(departmentVisible('unisex', focus) && departmentVisible(undefined, focus), `${label(focus)}: cross-department pieces are always shown`));

// ---- 2. Catalogue ----
console.log('# Catalogue');
const counts = { women: 0, men: 0, unisex: 0 } as Record<string, number>;
MOCK_CATALOG.forEach(p => {
  counts[p.department || 'unisex'] += 1;
  check(!!p.department, `${short(p.id)} ${p.name}: has a department`);
  if (p.category === 'dresses') check(p.department === 'women', `${short(p.id)} ${p.name}: a dress is womenswear`);
  const words = `${p.name} ${p.subcategory || ''}`;
  if (p.department === 'men') check(!namesWomenswear(words), `${short(p.id)} "${p.name}" is filed under menswear but names a womenswear piece`);
  if (p.department === 'women') check(!namesMenswear(words), `${short(p.id)} "${p.name}" is filed under womenswear but names a menswear piece`);
  if (p.department === 'unisex') {
    check(!namesWomenswear(words) && !namesMenswear(words), `${short(p.id)} "${p.name}" is cross-department but names one department's piece`);
  }
});
console.log(`  ${counts.women} womenswear · ${counts.men} menswear · ${counts.unisex} cross-department`);

// Pinned from the 2026-11-10 photo sweep: what each photo actually shows.
const PINNED: Record<string, 'women' | 'men'> = {
  a009: 'women', // a top-handle handbag
  s012: 'women', // a woman tying her shoe
  s052: 'women', // studded platform boots
  a032: 'men', // a man's arm carrying it
  b041: 'men', // a man's hand and build in frame
  o005: 'men', // a man's hand and chest in frame
  t011: 'men', // a man's torso
};
Object.entries(PINNED).forEach(([id, department]) => {
  const product = MOCK_CATALOG.find(p => p.id === `p-${id}`);
  check(product?.department === department, `${id} ${product?.name}: stays ${department}swear (photo sweep 2026-11-10), got ${product?.department}`);
});

// ---- 3. Shop ranking ----
console.log('# Shop ranking');
FOCUSES.forEach(focus => {
  const profile = focus ? ({ wardrobeFocus: focus } as any) : undefined;
  const ranked = scoreAndRankProducts(MOCK_CATALOG, profile, [], {});
  const wrong = wrongFor(focus);
  if (wrong) {
    const leaked = ranked.filter(r => r.product.department === wrong);
    check(leaked.length === 0, `${label(focus)}: shop shows ${leaked.length} ${wrong}swear piece(s), e.g. ${leaked[0]?.product.name}`);
    check(ranked.length > 100, `${label(focus)}: shop still has a full rack (${ranked.length})`);
  } else if (focus === 'all') {
    check(ranked.length === MOCK_CATALOG.length, `"a bit of both": shop shows the whole catalogue (${ranked.length})`);
  } else {
    check(ranked.every(r => r.product.department === 'unisex'), 'no choice yet: shop shows cross-department pieces only');
    check(ranked.length === counts.unisex, `no choice yet: all ${counts.unisex} cross-department pieces are there (${ranked.length})`);
  }
});
// A profile that exists but has no wardrobe choice is "unset", not "all".
check(!departmentAllowed(MOCK_CATALOG.find(p => p.department === 'men')!, { styleArchetypes: ['classic'] } as any), 'a profile without a wardrobe choice is not shown menswear');
check(!departmentAllowed(MOCK_CATALOG.find(p => p.department === 'women')!, { styleArchetypes: ['classic'] } as any), 'a profile without a wardrobe choice is not shown womenswear');

// ---- 4. Trends: which are shown, their rails, their wording, their searches ----
console.log('# Trends');
const desk: FashionTrend = {
  ...SEED_TRENDS[0],
  id: 'deskDept1',
  name: 'Volume below',
  source: 'ai-draft',
  summary: 'Balloon shapes from the waist down. In womenswear it is the bubble skirt; in menswear a pleated balloon trouser.',
  stylingNote: 'Keep the top half narrow. A bubble skirt with a fitted knit is the easy version.',
  entryPiece: 'a bubble skirt in black, or balloon trousers in olive',
  keyGarments: ['balloon trousers', 'bubble skirt'],
  keyAccessories: ['ballet flat'],
  pieces: undefined,
  mens: undefined,
  seedPieces: normalizeSeedPieces([
    { id: 'w1', name: 'Bubble Skirt', color: 'black', category: 'bottoms', subcategory: 'bubble skirt', department: 'women', photoId: '1718251478116-cb9bf6371aa6', styleTags: ['sculptural'], price: 90 },
    { id: 'm1', name: 'Pleated Balloon Trousers', color: 'olive', category: 'bottoms', subcategory: 'balloon trousers', department: 'men', photoId: '1617310208925-9ad2a0391d85', styleTags: ['relaxed'], price: 120 },
    { id: 'm2', name: 'Cropped Balloon Trousers', color: 'stone', category: 'bottoms', subcategory: 'balloon trousers', department: 'men', photoId: '1548133464-29abc661eb5c00', styleTags: ['relaxed'], price: 110 },
    { id: 'w2', name: 'Balloon Trousers', color: 'cream', category: 'bottoms', subcategory: 'balloon trousers', department: 'women', photoId: '1600429316815-43fe937fdc92', styleTags: ['relaxed'], price: 110 },
  ]),
};
const womensOnlyDesk: FashionTrend = {
  ...desk,
  id: 'deskDept2',
  name: 'The slip, again',
  summary: 'Bias-cut slip dresses under knits.',
  stylingNote: 'A slip dress under a chunky cardigan.',
  entryPiece: 'a satin slip dress',
  keyGarments: ['slip dress', 'satin skirt'],
  keyAccessories: ['kitten heel'],
  seedPieces: undefined,
};
const pool = [desk, womensOnlyDesk, ...SEED_TRENDS];

(['womens', 'mens', undefined] as WardrobeFocus[]).forEach(focus => {
  const shown = trendsForFocus(pool, focus);
  const hidden = pool.filter(t => !shown.some(s => s.id === t.id)).map(t => t.name);
  console.log(`  ${label(focus)}: ${shown.length} trends shown; held back: ${hidden.join(', ') || 'none'}`);
  check(shown.length >= (focus ? 12 : 10), `${label(focus)}: still has a full trend report (${shown.length})`);
  const wrong = wrongFor(focus);

  shown.forEach(trend => {
    // Wording
    (['summary', 'stylingNote', 'entryPiece'] as const).forEach(field => {
      check(wordFitsFocus(trend[field] || '', focus), `${label(focus)} · ${trend.name} · ${field} names the other department: "${trend[field]}"`);
    });
    check((trend.summary || '').length > 30, `${label(focus)} · ${trend.name}: still has a summary after filtering`);
    // Rail
    const rail = piecesForTrend(trend, focus);
    if (wrong) check(!rail.some(p => p.department === wrong), `${label(focus)} · ${trend.name}: rail shows ${wrong}swear (${rail.filter(p => p.department === wrong).map(p => p.name).join(', ')})`);
    else check(rail.every(p => p.department === 'unisex'), `no choice yet · ${trend.name}: rail is cross-department only`);
    // Searches
    trendAnchorSearches(trend, focus).forEach(search => {
      check(wordFitsFocus(search.label, focus), `${label(focus)} · ${trend.name}: offers the search "${search.label}"`);
      if (focus === 'mens') check(search.label.startsWith("men's "), `mens · ${trend.name}: search "${search.label}" is qualified`);
      if (focus === 'womens') check(search.label.startsWith("women's "), `womens · ${trend.name}: search "${search.label}" is qualified`);
    });
  });

  // Seeds the Shop merges in come from shown trends and are filtered again by the ranking.
  const seeded = scoreAndRankProducts(allSeedProducts(shown), focus ? ({ wardrobeFocus: focus } as any) : undefined, [], {});
  if (wrong) check(!seeded.some(r => r.product.department === wrong), `${label(focus)}: a seeded ${wrong}swear piece reaches the shop`);
});

check(!trendFitsFocus(womensOnlyDesk, 'mens'), 'a trend made only of womenswear pieces is not shown to menswear');
check(trendFitsFocus(womensOnlyDesk, 'womens'), '...and is shown to womenswear');
check(trendFitsFocus(desk, 'mens') && trendFitsFocus(desk, 'womens'), 'a trend with pieces for both is shown to both');
const deskForMen = trendsForFocus([desk], 'mens')[0];
check(deskForMen.entryPiece === 'balloon trousers in olive', `the way in keeps the half that fits ("${deskForMen.entryPiece}")`);
check(deskForMen.summary === 'Balloon shapes from the waist down.' && deskForMen.stylingNote === 'Keep the top half narrow.', `sentences about the other department's pieces are dropped whole ("${deskForMen.summary}" / "${deskForMen.stylingNote}")`);
['Boho, sharpened', 'Sheer layering', 'The long, fluid layer'].forEach(name => {
  const trend = SEED_TRENDS.find(t => t.name === name)!;
  check(!trendFitsFocus(trend, 'mens') && trendFitsFocus(trend, 'womens'), `"${name}" is womenswear: shown to womens, not to mens`);
});
check(trendsForFocus(SEED_TRENDS, 'all').every((t, i) => t === SEED_TRENDS[i]), '"a bit of both" reads every trend exactly as written');

// ---- 5. Words ----
console.log('# Words');
const womens = ['maxi skirt', 'slip dress', 'shirt dress', 'peasant blouse', 'ballet flats', 'mesh flat', 'Mary Janes', 'kitten heel', 'slingback', 'hoop earrings', 'silk headscarf', "women's loafers", 'a print midi'];
const neither = ['dress shirt', 'dress trousers', 'dress shoes', 'leather dress belt', 'flat cap', 'flat-front chinos', 'a flat sandal', 'the flat shoe', 'penny loafers', 'linen shirt', 'wide-leg trousers', 'suede jacket', 'tote', 'crew socks', 'addressed'];
const mens = ['silk tie', 'knit tie', 'necktie', "men's suede boots", 'menswear tailoring', 'pocket square'];
womens.forEach(w => check(namesWomenswear(w) && !wordFitsFocus(w, 'mens') && wordFitsFocus(w, 'womens'), `"${w}" is womenswear`));
mens.forEach(w => check(namesMenswear(w) && !wordFitsFocus(w, 'womens') && wordFitsFocus(w, 'mens'), `"${w}" is menswear`));
neither.forEach(w => check(!namesWomenswear(w) && !namesMenswear(w), `"${w}" belongs to neither department alone`));
check(!namesMenswear("women's coat") && !namesMenswear('womenswear'), '"women\'s" is never read as "men\'s"');
check(wordFitsFocus('maxi skirt', 'all') && !wordFitsFocus('maxi skirt', undefined) && !wordFitsFocus('silk tie', undefined), '"a bit of both" sees every word; no choice yet sees none that are gendered');

// ---- 6. Womenswear-only content and categories ----
console.log('# Lookbook and categories');
check(womenswearContentVisible('womens') && womenswearContentVisible('all'), 'the womenswear Lookbook is offered to womens and "a bit of both"');
check(!womenswearContentVisible('mens') && !womenswearContentVisible(undefined), '...and not to mens or an account that has not chosen');
check(!categoryOffered('dresses', 'mens') && categoryOffered('dresses', 'mens', true), 'Dresses is not offered to menswear unless they own one');
check(categoryOffered('dresses', 'womens') && categoryOffered('dresses', undefined) && categoryOffered('tops', 'mens'), 'every other case is offered');

// ---- 7. Wiring: the screens and prompts use the shared rule ----
console.log('# Wiring');
check(/departmentVisible\(product\.department, profile\?\.wardrobeFocus\)/.test(read('src/services/marketplaceMatchingService.ts')), 'shop ranking uses the shared rule');
check(/departmentVisible\(product\.department, focus\)/.test(read('src/services/trendLooks.ts')), 'trend rails use the shared rule');
check(/trendFitsFocus\(t, focus\)/.test(read('src/services/trendRemixService.ts')) && /trendForFocus\(t, focus\)/.test(read('src/services/trendRemixService.ts')), 'Home, the Trend Report and chat build from department-filtered trends');
check(/trendsForFocus\(publishedTrends, profile\?\.wardrobeFocus\)/.test(read('src/screens/ShopScreen.tsx')), 'Shop filters its trends');
check(/trendsForFocus\(publishedTrends, profile\?\.wardrobeFocus\)/.test(read('src/services/discoveryService.ts')), 'Explore filters its trends');
check(/womenswearContentVisible/.test(read('src/screens/MoreScreen.tsx')) && /womenswearContentVisible/.test(read('src/screens/PaletteDetailScreen.tsx')), 'the Lookbook entry points use the shared rule');
['src/screens/ClosetScreen.tsx', 'src/screens/AddClosetItemScreen.tsx', 'src/screens/ClosetItemDetailScreen.tsx'].forEach(file =>
  check(/categoryOffered\(/.test(read(file)), `${file} offers categories through the shared rule`)
);
['src/screens/EditDetailScreen.tsx', 'src/screens/PackingListScreen.tsx'].forEach(file =>
  check(/wordFitsFocus\(`\$\{gap\.category\} \$\{gap\.description\}`, wardrobeFocus\)/.test(read(file)), `${file} drops AI-suggested purchases from the other department`)
);
['src/services/packingListService.ts', 'src/services/styleEditService.ts', 'src/services/schedulePlanningService.ts'].forEach(file =>
  check(/wardrobeFocus: profile\.wardrobeFocus/.test(read(file)), `${file} tells the stylist prompt the department`)
);
const fn = read('functions/src/index.ts');
check((fn.match(/departmentLine\(/g) || []).length >= 4, 'the Edit, packing and week-plan prompts carry the department line');
// No screen or service may compare departments by hand any more.
const handRolled: string[] = [];
const walk = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const rel = path.relative(path.join(__dirname, '..'), full).replace(/\\/g, '/');
      if (['src/services/departmentFit.ts', 'src/data/mockProductCatalog.ts', 'src/services/amazonSearch.ts', 'src/services/affiliateNetwork.ts', 'src/components/TrendSeedPanel.tsx'].includes(rel)) continue;
      if (/department === '(?:women|men)'|focus === 'womens' \? department/.test(fs.readFileSync(full, 'utf8'))) handRolled.push(rel);
    }
  }
};
walk(path.join(__dirname, '../src'));
check(handRolled.length === 0, `department is compared by hand in: ${handRolled.join(', ')}`);

console.log(`\n${checks} checks.`);
if (failures) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log('OK - no piece and no garment word from the other department reaches a womenswear or menswear account, and an account that has not chosen sees only cross-department pieces.');

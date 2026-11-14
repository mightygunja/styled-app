/**
 * Trend path audit: trends are matched to a person on what the app really
 * knows, the path moves slowly, every trend shown has real pieces under it,
 * and the weekly generator can only name pieces the app can show.
 *
 * Fails when:
 *   - a match reason is claimed that the profile or closet does not support,
 *     or the score leaves 0..1;
 *   - the path moves more than one step, or sooner than a week, or a first
 *     reading starts above step 3;
 *   - a step reaches further from someone's taste than the step below it;
 *   - the "next step" piece is from the other department, is not on its
 *     trend's rail, is something they own, or is a bigger commitment than
 *     the step calls for;
 *   - a trend that fits a department shows fewer than six pieces, repeats a
 *     piece, shows one that does not carry the trend, or is mostly shoes
 *     under a trend about garments;
 *   - a trend the app cannot illustrate would still be listed;
 *   - two catalogue pieces share a photograph;
 *   - functions/src/trendVocabulary.ts is out of date, or a term in it is
 *     not found by the app's own matcher;
 *   - the generator is not held to that vocabulary, or the wiring is gone.
 *
 * Run:  npx tsx scripts/auditTrendPath.ts
 */

import fs from 'fs';
import path from 'path';
import { SEED_TRENDS } from '../src/data/seedTrends';
import { BALANCED_CATALOG } from '../src/data/mockProductCatalog';
import { FashionTrend } from '../src/models/fashionTrend';
import {
  piecesForTrend,
  trendPieceScore,
  trendFitsFocus,
  trendIllustrated,
  trendsForFocus,
  slotOf,
} from '../src/services/trendLooks';
import { departmentVisible } from '../src/services/departmentFit';
import {
  profileMatch,
  evidenceLevel,
  advancePath,
  pathWeight,
  nextStep,
  stepFor,
  PATH_STEPS,
  PATH_STEP_INTERVAL_MS,
  PathLevel,
  PathState,
} from '../src/services/trendPath';
import { buildVocabulary, renderVocabulary } from './buildTrendVocabulary';

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
const trend = (id: string) => SEED_TRENDS.find(t => t.id === id)!;

// ---- 1. Match ----
console.log('# Match');
{
  const wide = trend('seed-wide-leg-tailoring'); // polished, minimal, classic; grey, charcoal, camel, navy
  const none = profileMatch(wide, undefined, { owned: 0, supporting: 0 });
  check(none.reasons.length === 0 && none.score > 0.3 && none.score < 0.6, `no profile, no closet: neutral and silent (${none.score})`);

  const taste = profileMatch(wide, { styleArchetypes: ['polished', 'minimal'], recommendedColors: ['Camel', 'Navy'], recommendedSilhouettes: ['high-rise'] }, { owned: 2, supporting: 0 });
  check(taste.score > 0.9 && taste.score <= 1, `a trend in their lane, palette, cut and closet scores at the top (${taste.score})`);
  check(taste.reasons[0] === 'You already own 2 pieces of it', `ownership is said first (${taste.reasons[0]})`);
  check(taste.reasons.some(r => /polished and minimal lane/.test(r)) && taste.reasons.some(r => /your colours: camel and navy/.test(r)) && taste.reasons.some(r => /high-rise/.test(r)), 'each further reason names the real overlap');

  const far = profileMatch(wide, { styleArchetypes: ['bohemian'], recommendedColors: ['coral'] }, { owned: 0, supporting: 0 });
  check(far.reasons.length === 0 && far.score < 0.3, `a trend outside their taste scores low and claims nothing (${far.score})`);
  check(far.score < none.score && none.score < taste.score, 'far < unknown < near');

  const crossed = profileMatch(wide, { styleArchetypes: ['polished'] }, { owned: 0, supporting: 0 }, 'wide-leg');
  const plain = profileMatch(wide, { styleArchetypes: ['polished'] }, { owned: 0, supporting: 0 });
  check(crossed.score < plain.score, 'crossing a "never wear" lowers the match');
  const boho = profileMatch(wide, { styleArchetypes: ['boho'] }, { owned: 0, supporting: 0 });
  const bohoTrend = profileMatch(trend('seed-boho-redux'), { styleArchetypes: ['boho'] }, { owned: 0, supporting: 0 });
  check(bohoTrend.score > boho.score && bohoTrend.reasons.length === 1, '"boho" on a profile meets a trend filed under "bohemian"');
  for (const t of SEED_TRENDS) {
    for (const owned of [0, 1, 5]) {
      const m = profileMatch(t, { styleArchetypes: t.archetypes, recommendedColors: t.keyColors, recommendedSilhouettes: t.silhouettes, avoidRules: [] }, { owned, supporting: 3 }, owned ? null : 'x');
      check(m.score >= 0 && m.score <= 1, `${t.id}: score within 0..1 (${m.score})`);
      check(owned > 0 === m.reasons.some(r => r.startsWith('You already own')), `${t.id}: ownership is claimed only when owned (${owned})`);
    }
  }
}

// ---- 2. Pace ----
console.log('# Pace');
{
  check(evidenceLevel({ trendTaps: 0, trendDismissals: 0, trendsWorn: 0 }) === 1, 'no engagement = step 1');
  check(evidenceLevel({ trendTaps: 500, trendDismissals: 0, trendsWorn: 0 }) < 5, 'tapping alone cannot reach the top step');
  check(evidenceLevel({ trendTaps: 0, trendDismissals: 0, trendsWorn: 50 }) < 5, 'owning alone cannot reach the top step');
  check(evidenceLevel({ trendTaps: 12, trendDismissals: 0, trendsWorn: 6 }) === 5, 'engaging AND owning reaches it');
  check(evidenceLevel({ trendTaps: 8, trendDismissals: 4, trendsWorn: 0 }) < evidenceLevel({ trendTaps: 8, trendDismissals: 0, trendsWorn: 0 }), '"not my thing" counts against it');
  let previous = 1;
  for (let taps = 0; taps <= 14; taps++) {
    const level = evidenceLevel({ trendTaps: taps, trendDismissals: 0, trendsWorn: 2 });
    check(level >= previous, `evidence never falls as engagement rises (${taps} taps)`);
    previous = level;
  }

  const first = advancePath(undefined, 5, 1000);
  check(first.level === 3 && first.since === 1000, `a first reading starts no higher than step 3 (${first.level})`);
  check(advancePath(undefined, 1, 0).level === 1, 'and as low as the evidence says');
  const held = advancePath(first, 5, 1000 + PATH_STEP_INTERVAL_MS - 1);
  check(held === first, 'no move inside a week');
  const up = advancePath(first, 5, 1000 + PATH_STEP_INTERVAL_MS);
  check(up.level === 4 && up.since === 1000 + PATH_STEP_INTERVAL_MS, 'after a week it moves by exactly one');
  check(advancePath(up, 1, up.since + PATH_STEP_INTERVAL_MS).level === 3, 'and one step down when the evidence falls');
  check(advancePath(up, 4, up.since + 10 * PATH_STEP_INTERVAL_MS) === up, 'it does not move when the evidence agrees');

  // A year of daily opens with the strongest possible evidence, then the weakest.
  let state: PathState = advancePath(undefined, 1, 0);
  const day = 24 * 60 * 60 * 1000;
  let moves = 0;
  let lastMove = 0;
  for (let d = 1; d <= 364; d++) {
    const next = advancePath(state, (d <= 200 ? 5 : 1) as PathLevel, d * day);
    if (next.level !== state.level) {
      check(Math.abs(next.level - state.level) === 1, `day ${d}: moved by one`);
      check(d * day - lastMove >= PATH_STEP_INTERVAL_MS || moves === 0, `day ${d}: at least a week since the last move`);
      moves += 1;
      lastMove = d * day;
    }
    check(next.level >= 1 && next.level <= 5, `day ${d}: step within 1..5`);
    state = next;
  }
  check(moves === 8 && state.level === 1, `it climbed to the top and came back down, one week at a time (${moves} moves, ends at ${state.level})`);
}

// ---- 3. Reach ----
console.log('# Reach');
{
  check(PATH_STEPS.length === 5 && PATH_STEPS.every((s, i) => s.level === i + 1), 'five steps, in order');
  for (let i = 1; i < PATH_STEPS.length; i++) {
    check(PATH_STEPS[i].minMatch < PATH_STEPS[i - 1].minMatch, `step ${i + 1} reaches further from their taste than step ${i}`);
    check(pathWeight(i + 1, 0.1, 'peak') >= pathWeight(i, 0.1, 'peak'), `step ${i + 1} holds a far trend back no more than step ${i}`);
    check(pathWeight(i + 1, 0.9, 'emerging') >= pathWeight(i, 0.9, 'emerging'), `step ${i + 1} is shown emerging trends no later than step ${i}`);
  }
  check(pathWeight(1, 0.1, 'peak') < pathWeight(1, 0.9, 'peak'), 'at step 1 a trend outside their taste is held back');
  check(pathWeight(5, 0.0, 'peak') === pathWeight(5, 0.9, 'peak'), 'at step 5 nothing is held back for being unfamiliar');
  check(pathWeight(1, 0.9, 'emerging') < pathWeight(1, 0.9, 'peak') && pathWeight(5, 0.9, 'emerging') > pathWeight(5, 0.9, 'peak'), 'step 1 leads with what has peaked; step 5 with what is emerging');
  check(PATH_STEPS[0].commitment[0] === 'finish' && PATH_STEPS[1].commitment[0] === 'shoes' && PATH_STEPS[2].commitment[0] === 'garment', 'the first piece offered grows: accessory, then shoe, then garment');
  check(stepFor(0).level === 1 && stepFor(9).level === 5 && stepFor(2.6).level === 3, 'a step outside the range is clamped');
}

// ---- 4. The next step ----
console.log('# Next step');
for (const focus of ['womens', 'mens'] as const) {
  const candidates = trendsForFocus(SEED_TRENDS, focus).map(t => ({ trend: t, wearableToday: false, adjacency: 0.6, challengesAvoidRule: null }));
  for (const step of PATH_STEPS) {
    const next = nextStep(candidates, step.level, focus);
    check(!!next, `${focus} step ${step.level}: there is a next step`);
    if (!next) continue;
    const rail = piecesForTrend(next.trend, focus, { limit: 10 });
    check(departmentVisible(next.piece.department, focus), `${focus} step ${step.level}: "${next.piece.name}" is in their department`);
    check(rail.includes(next.piece), `${focus} step ${step.level}: "${next.piece.name}" is on the ${next.trend.name} rail`);
    check(step.stages.includes(next.trend.stage), `${focus} step ${step.level}: ${next.trend.name} (${next.trend.stage}) is a stage this step is ready for`);
    const wanted = step.commitment.find(slot => rail.some(p => slotOf(p) === slot));
    check(slotOf(next.piece) === wanted, `${focus} step ${step.level}: offers a ${wanted} first, got ${slotOf(next.piece)} ("${next.piece.name}")`);
    const without = nextStep(candidates, step.level, focus, { ownedNames: [next.piece.name] });
    check(!!without && without.piece.name !== next.piece.name, `${focus} step ${step.level}: a piece they own is not offered`);
  }
  const worn = candidates.map((c, i) => ({ ...c, wearableToday: i === 0 }));
  check(nextStep(worn, 3, focus)?.trend.id !== worn[0].trend.id, `${focus}: the next step is a trend they are not yet wearing`);
  const guarded = candidates.map((c, i) => ({ ...c, challengesAvoidRule: i === 0 ? 'skirts' : null }));
  check(nextStep(guarded, 1, focus)?.trend.id !== guarded[0].trend.id, `${focus}: a trend that crosses a "never wear" is not the next step while another is open`);
}
check(nextStep([], 3, 'womens') === null, 'nothing to offer = no next step, not an invented one');

// ---- 5. Rails ----
console.log('# Rails');
const photoOf = (url: string) => /photo-(\d{10,16}-[0-9a-f]{8,16})/.exec(url)?.[1];
const photos = new Map<string, string>();
for (const product of BALANCED_CATALOG) {
  const id = photoOf(product.imageUrl);
  if (!id) continue;
  check(!photos.has(id), `${product.id} shares its photograph with ${photos.get(id)}`);
  photos.set(id, product.id);
}
for (const t of SEED_TRENDS) {
  for (const focus of ['womens', 'mens'] as const) {
    if (!trendFitsFocus(t, focus)) continue;
    const rail = piecesForTrend(t, focus, { limit: 10 });
    check(rail.length >= 6, `${t.id} ${focus}: shows ${rail.length} pieces (needs 6)`);
    check(new Set(rail.map(p => p.name.toLowerCase())).size === rail.length, `${t.id} ${focus}: no piece twice`);
    check(rail.every(p => departmentVisible(p.department, focus)), `${t.id} ${focus}: every piece is in the department`);
    const curated = new Set((t.pieces ?? []).map(id => `p-${id}`));
    const stray = rail.filter(p => !curated.has(p.id) && trendPieceScore(t, p) === 0).map(p => p.name);
    check(stray.length === 0, `${t.id} ${focus}: pieces that do not carry the trend: ${stray.join(', ')}`);
    if (t.keyGarments.length > 0) {
      const garments = rail.filter(p => slotOf(p) === 'garment').length;
      // As many as exist, up to three: a trend like suede has two women's
      // garments in the catalogue and is carried by its shoes and bags.
      const available = BALANCED_CATALOG.filter(
        p => departmentVisible(p.department, focus) && slotOf(p) === 'garment' && (curated.has(p.id) || trendPieceScore(t, p) > 0)
      ).length;
      check(garments >= Math.min(3, available), `${t.id} ${focus}: a trend about garments shows garments (${garments} of ${rail.length}, ${available} exist)`);
    }
  }
}
const invented: FashionTrend = { ...trend('seed-suede-texture'), id: 'x', name: 'Techno tailoring', keyGarments: ['3d-printed jacket', 'laser-cut shirt'], keyAccessories: [], pieces: undefined };
check(!trendIllustrated(invented, 'womens') && !trendIllustrated(invented, 'mens') && !trendIllustrated(invented, undefined), 'a trend written in words no product carries is not illustrated');
check(!trendsForFocus([invented, trend('seed-suede-texture')], 'womens').some(t => t.id === 'x'), 'and is not listed');
check(trendsForFocus(SEED_TRENDS, 'womens').length >= 15 && trendsForFocus(SEED_TRENDS, 'mens').length >= 12, 'the editorial set is still listed for both departments');

// ---- 6. Vocabulary ----
console.log('# Vocabulary');
const vocabulary = buildVocabulary();
check(read('functions/src/trendVocabulary.ts') === renderVocabulary(vocabulary), 'functions/src/trendVocabulary.ts is up to date (run: npx tsx scripts/buildTrendVocabulary.ts)');
check(vocabulary.length >= 120, `the generator has a usable vocabulary (${vocabulary.length} terms)`);
const textOf = (p: (typeof BALANCED_CATALOG)[number]) => [p.name, p.subcategory, p.category, ...(p.styleTags ?? [])].join(' | ').toLowerCase();
for (const v of vocabulary) {
  const found = BALANCED_CATALOG.filter(p => textOf(p).includes(v.term));
  const women = found.filter(p => p.department !== 'men').length;
  const men = found.filter(p => p.department !== 'women').length;
  check(women >= v.women && men >= v.men && Math.max(women, men) >= 2, `"${v.term}": the app's matcher finds its pieces (W ${women}/${v.women}, M ${men}/${v.men})`);
  check(v.term.split(' ').length >= 2, `"${v.term}" is a phrase, not a single word`);
}

// ---- 7. Wiring ----
console.log('# Wiring');
const fn = read('functions/src/index.ts');
const reportFile = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'trendReport.ts'), 'utf8').replace(/\r\n/g, '\n');
check(/THE PIECES WE CAN SHOW\n\$\{TREND_PIECE_LIST\}/.test(reportFile) && /copied EXACTLY, character for character/.test(reportFile), 'the generator is given the vocabulary and told to copy from it');
check(/trends: illustratedTrendsOnly\(drafts\)\.filter\(t => !taken\.has\(t\.name\.toLowerCase\(\)\)\),/.test(reportFile), 'whatever the model returns is cut to pieces the app can show');
check(/source: 'ai-auto'/.test(fn) && /pubsub\.schedule\('every day 06:00'\)/.test(fn) && /trendListDue\(lastPublished \|\| null, now\.getTime\(\)\)/.test(fn) && /if \(fresh\.length === 0\) \{/.test(fn), 'the weekly run (looked at daily) publishes as ai-auto and leaves the list alone when nothing usable comes back');
check(/const drafts = await draftTrends\(existingNames, season, year, 6\);/.test(fn), 'the desk\'s "Draft" uses the same generator');
const remix = read('src/services/trendRemixService.ts');
check(/\.filter\(t => trendIllustrated\(t, focus\)\)/.test(remix), 'the report drops trends it cannot illustrate');
check(/profileMatch\(trend, taste,/.test(remix) && /pathWeight\(level, e\.remix\.adjacency, e\.remix\.trend\.stage\)/.test(remix), 'ranking uses the match and the path step');
check(/await shopperSignals\.advanceTrendPath\(worn\)/.test(remix), 'the step is moved (slowly) before each ranking');
const signals = read('src/services/shopperSignals.ts');
check(/advancePath\(signals\.trendPath, evidenceLevel\(pathEvidence\(signals, trendsWorn\)\), Date\.now\(\)\)/.test(signals), 'the stored step only ever moves through advancePath');
const report = read('src/screens/TrendInsightsScreen.tsx');
check(/const RAIL_LIMIT = 10;/.test(report) && /trendRemixService\.trendPathView\(remixes, focus\)/.test(report) && /YOUR NEXT STEP/.test(report) && /remix\.matchReasons/.test(report), 'the Trend Report shows ten pieces a trend, the path, the next step and why a trend matches');
const publicTrendPage = read('src/screens/TrendsPublicScreen.tsx');
check(/const curatedWomen = piecesForTrend\(trend, 'womens', \{ limit: 8 \}\);\s*\n\s*const curatedMen = piecesForTrend\(trend, 'mens', \{ limit: 8 \}\);/.test(publicTrendPage) && /mergeRail\(live, curatedWomen, 8\)/.test(publicTrendPage) && /mergeRail\(live, curatedMen, 8\)/.test(publicTrendPage), 'the public trend page shows eight pieces a trend, curated or real');

console.log(`\n${checks} checks.`);
if (failures) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log('OK - trends are matched on what is known, the path moves one step a week, and every trend shown has real pieces under it.');

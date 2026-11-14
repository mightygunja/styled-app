/**
 * Audit: the trend list writes itself, from current reporting, with no
 * person in between - and reaches each member through their own profile.
 *
 *   npx tsx scripts/auditTrendReport.ts
 *
 * Runs the real report code (functions/src/trendReport.ts) with made-up
 * feeds and a made-up model answer, and reads the server and app files that
 * use it. No network, no Firebase.
 */

import fs from 'fs';
import path from 'path';
import {
  MAX_NEW_PIECES,
  MAX_STANDING_RETIRED_PER_RUN,
  MIN_SIGNALS,
  MIN_SOURCES,
  MIN_STANDING_LIVE,
  NEW_PIECE_MIN_PRODUCTS,
  SIGNALS_PER_SOURCE,
  SIGNAL_MAX_AGE_MS,
  STANDING_STRIKES_TO_RETIRE,
  TREND_CAPITALS,
  TREND_FEEDS,
  TREND_LIST_EVERY_MS,
  TrendSignal,
  aboutClothes,
  feedText,
  newPiecePhrase,
  parseFeed,
  parseTrendReport,
  recentSignals,
  signalsBrief,
  signalsGrounded,
  standingChanges,
  trendListDue,
  trendReportPrompt,
  trendStockQuestions,
  withVerifiedPieces,
  writeTrendReport,
} from '../functions/src/trendReport';
import { STANDING_TRENDS } from '../functions/src/standingTrends';
import { TREND_VOCABULARY } from '../functions/src/trendVocabulary';
import { standingTrends, standingTrendsSource } from './buildStandingTrends';

let checks = 0;
let failures = 0;
function check(ok: boolean, label: string) {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok ' : 'FAIL '} ${label}`);
}
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');

const NOW = Date.parse('2026-11-13T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const feed = TREND_FEEDS[0];

console.log('# What is read');
check(TREND_FEEDS.length >= 15 && TREND_FEEDS.every(f => /^https:\/\//.test(f.url) && f.source && TREND_CAPITALS.includes(f.city)) && new Set(TREND_FEEDS.map(f => f.source)).size === TREND_FEEDS.length && new Set(TREND_FEEDS.map(f => f.url)).size === TREND_FEEDS.length, `the report reads ${TREND_FEEDS.length} public feeds, each a named publication in a city the app knows`);
const cities = new Set(TREND_FEEDS.map(f => f.city));
check(['Mumbai', 'Lagos', 'São Paulo', 'Mexico City', 'Seoul'].every(c => cities.has(c)) && TREND_FEEDS.some(f => /GQ|Esquire|Permanent Style/.test(f.source)), 'the feeds reach beyond New York and London, and include menswear titles');

const rss = `<?xml version="1.0"?><rss><channel>
<item><title>The &amp;quot;Barrel&amp;quot; Jean Is Everywhere</title><description><![CDATA[<p>Editors are <b>wearing</b> a curved leg&#8217;s new shape.</p>]]></description><pubDate>Thu, 12 Nov 2026 10:00:00 GMT</pubDate></item>
<item><title>Horoscope Today: what to wear</title><description>Stars.</description><pubDate>Thu, 12 Nov 2026 09:00:00 GMT</pubDate></item>
</channel></rss>`;
const parsedRss = parseFeed(rss, feed);
check(parsedRss.length === 2 && parsedRss[0].title === 'The "Barrel" Jean Is Everywhere' && parsedRss[0].summary === 'Editors are wearing a curved leg\u2019s new shape.' && parsedRss[0].source === feed.source && parsedRss[0].at === Date.parse('2026-11-12T10:00:00Z'), 'an RSS item is read as plain text - no markup, no entities - with its publication and date');
const atom = `<feed><entry><title type="html">Suede jackets return</title><summary>The jacket of the season.</summary><updated>2026-11-10T08:00:00Z</updated></entry></feed>`;
check(parseFeed(atom, feed).length === 1 && parseFeed(atom, feed)[0].title === 'Suede jackets return' && parseFeed(atom, feed)[0].at === Date.parse('2026-11-10T08:00:00Z'), 'an Atom feed is read the same way, single entry included');
check(parseFeed('<html><body>Access denied', feed).length === 0 && parseFeed('', feed).length === 0, 'a feed that answers with something else gives nothing, and does not stop the run');
check(feedText('x'.repeat(40) + ' ' + 'y'.repeat(200), 60).length <= 63 && feedText({ '#text': ' A  <i>b</i> ' }, 50) === 'A b', 'long text is cut at a word and whitespace is tidied');

check(aboutClothes({ title: 'There Are Good Coats and There Are Great Coats', summary: '' }) && aboutClothes({ title: '지금 가장 급부상 중인 스웨터', summary: '' }) && aboutClothes({ title: 'Las tendencias de moda del invierno', summary: '' }), 'an item about what people wear is kept, in the Spanish and Korean feeds too');
check(!aboutClothes({ title: 'Nationwide Ground Stop Freezes US Flights', summary: '' }) && !aboutClothes({ title: 'Horoscope Today: what to wear', summary: '' }) && !aboutClothes({ title: 'The Best Black Friday Coat Deals', summary: '' }) && !aboutClothes({ title: 'ESP Showroom Is Hiring A Fashion Sales Intern', summary: '' }), 'news, horoscopes, sales and job adverts are not evidence, even when they mention clothes');

const signal = (source: string, title: string, at: number, city = 'London'): TrendSignal => ({ source, city, title, summary: 'What people are wearing.', at });
const many = (sources: number, each: number): TrendSignal[] =>
  Array.from({ length: sources }, (_, s) => Array.from({ length: each }, (_, i) => signal(`Pub ${s}`, `Pub ${s} on coat trend ${i}`, NOW - (i + 1) * 3600 * 1000))).flat();
const recent = recentSignals(
  [
    ...many(6, 12),
    signal('Old', 'An old coat trend story', NOW - SIGNAL_MAX_AGE_MS - DAY),
    signal('Future', 'A coat trend from next month', NOW + 30 * DAY),
    signal('Undated', 'A coat trend with no date', 0),
    signal('Pub 0', 'Pub 0 on coat trend 0', NOW - 5000),
  ],
  NOW
);
check(recent.every(s => !['Old', 'Future', 'Undated'].includes(s.source)), 'only items from the last three weeks are used; undated and post-dated ones are not');
check(Math.max(...Array.from(new Set(recent.map(s => s.source))).map(src => recent.filter(s => s.source === src).length)) === SIGNALS_PER_SOURCE && recent.filter(s => s.title === 'Pub 0 on coat trend 0').length === 1, 'no publication crowds out the rest, and a headline is read once');
check(new Set(recent.slice(0, 6).map(s => s.source)).size === 6, 'the items are dealt one publication at a time');
check(signalsGrounded(many(MIN_SOURCES, Math.ceil(MIN_SIGNALS / MIN_SOURCES))) && !signalsGrounded(many(MIN_SOURCES - 1, 20)) && !signalsGrounded(many(MIN_SOURCES, 2)) && !signalsGrounded([]), `the report is written from the press only with at least ${MIN_SIGNALS} items from ${MIN_SOURCES} publications`);

console.log('# What is asked');
const garments = TREND_VOCABULARY.filter(v => v.slot === 'garment' && v.women >= 3 && v.men >= 3).map(v => v.term);
const finishes = TREND_VOCABULARY.filter(v => v.slot !== 'garment' && v.women >= 3).map(v => v.term);
const evidence = recentSignals(many(8, 8), NOW);
const request = { existingNames: ['Quiet Suede'], season: 'fall', year: 2026, count: 6, signals: evidence, standing: STANDING_TRENDS };
const prompt = trendReportPrompt(request);
check(prompt.includes(signalsBrief(evidence)) && /This is your evidence\./.test(prompt) && /Never copy their wording/.test(prompt), 'the model is given the reports as its evidence and told not to copy them');
check(/published exactly as you write it, with no editor in between/.test(prompt) && !/for a human editor to review/.test(prompt), 'the prompt no longer promises a human review that does not happen');
check(/A trend here is a way of dressing/.test(prompt) && /never an industry story/.test(prompt), 'a trend is a way of dressing, not a piece of industry news');
check(/At least 3 of the 6 must be ones a menswear reader can wear/.test(prompt) && /must serve both menswear and womenswear readers/.test(prompt), 'half of every report has to be wearable by a menswear reader');
check(/THE PIECES WE CAN SHOW\n/.test(prompt) && /copied EXACTLY, character for character/.test(prompt) && garments.slice(0, 3).every(g => prompt.includes(g)), 'the generator is given the pieces the app can show and told to copy from them');
check(/newPieces: 0-2 further pieces/.test(prompt) && /checked against what stores actually stock/.test(prompt), 'it may name up to two pieces the app has not photographed, to be checked against the stores');
check(/THE STANDING TRENDS/.test(prompt) && STANDING_TRENDS.every(s => prompt.includes(`- ${s.id}: ${s.name}`)) && /When unsure, say "current"/.test(prompt), 'every built-in trend is put up for review, with "current" as the answer when in doubt');
const blind = trendReportPrompt({ ...request, signals: [] });
check(/No current reporting could be read this week/.test(blind) && !/THE STANDING TRENDS/.test(blind) && /sources: leave empty\./.test(blind), 'with no reports read, the model is told so, cites nothing, and reviews nothing');

console.log('# What is kept');
const answer = (trends: any[], standing: any[] = []) => JSON.stringify({ trends, standing });
const trend = (extra: Record<string, any> = {}) => ({
  name: 'Curved Denim',
  summary: 'A curved leg replaces the straight one.',
  sources: ['Pub 1', 'Pub 2'],
  region: 'London',
  regions: ['Seoul', 'Atlantis'],
  reach: 'global',
  stage: 'rising',
  keyGarments: garments.slice(0, 3),
  keyAccessories: finishes.slice(0, 1),
  newPieces: [],
  keyColors: ['indigo'],
  silhouettes: ['curved'],
  archetypes: ['relaxed', 'made-up'],
  stylingNote: 'Wear it with a fitted knit.',
  entryPiece: 'one pair',
  ...extra,
});
const kept = parseTrendReport(answer([trend()]), request, new Date(NOW));
check(kept.trends.length === 1 && kept.grounded && kept.trends[0].sources.join() === 'Pub 1,Pub 2' && kept.trends[0].grounded === true && kept.trends[0].status === 'draft', 'a trend written from the reports is kept, with the publications behind it');
check(kept.trends[0].regions.join() === 'Seoul' && kept.trends[0].archetypes.join() === 'relaxed' && kept.trends[0].coverage.women >= 6, 'cities and tastes the app does not know are dropped; the photographed pieces behind it are counted');
const cited = parseTrendReport(answer([trend({ sources: ['Pub 1, London', 'pub 2', 'The Daily Invention'] })]), request).trends[0];
check(cited?.sources.join() === 'Pub 1,Pub 2', 'a source copied with its city is recognised; one that was never among the reports is not');
check(parseTrendReport(answer([trend({ sources: ['The Daily Invention'] })]), request).trends.length === 0 && parseTrendReport(answer([trend({ sources: [] })]), request).trends.length === 0, 'a trend that cites none of the reports it was given is dropped');
const longNames = recentSignals([...many(5, 8), ...Array.from({ length: 6 }, (_, i) => signal('Pub 1 Brasil', `Brasil coat trend ${i}`, NOW - (i + 1) * 1000))], NOW);
check(parseTrendReport(answer([trend({ sources: ['Pub 1 Brasil, São Paulo'] })]), { ...request, signals: longNames }).trends[0]?.sources.join() === 'Pub 1 Brasil', 'a longer publication name is not mistaken for a shorter one it starts with');
const unseen = parseTrendReport(answer([trend({ sources: [] })]), { ...request, signals: [] });
check(unseen.trends.length === 1 && unseen.trends[0].grounded === false && !unseen.grounded, 'written from memory (no reports), a trend is still kept - and marked as not grounded');
check(parseTrendReport(answer([trend({ keyGarments: ['hoverboard trousers', 'glass shirt'], keyAccessories: [] })]), request).trends.length === 0, 'a trend the app cannot illustrate is dropped');
check(parseTrendReport(answer([trend({ name: 'quiet suede' })]), request).trends.length === 0, 'a trend already on the list is not written twice');
check(parseTrendReport(answer([trend({ stage: 'viral' })]), request).trends.length === 0 && parseTrendReport('not json at all', request).trends.length === 0 && parseTrendReport('{"trends": "none"}', request).trends.length === 0, 'an unknown stage or an unreadable answer gives nothing - the current list stands');
const proposing = parseTrendReport(answer([trend({ newPieces: [{ piece: 'Barrel Jeans!', kind: 'garment' }, { piece: garments[0], kind: 'garment' }, { piece: 'jelly sandal', kind: 'accessory' }, { piece: 'barrel jeans', kind: 'garment' }, { piece: 'a very long description of a garment nobody sells', kind: 'garment' }, { piece: 'mesh flat', kind: 'accessory' }] })]), request).trends[0];
check(proposing.newPieces.map((p: any) => `${p.piece}:${p.kind}`).join() === 'barrel jeans:garment,jelly sandal:accessory' && MAX_NEW_PIECES === 2, 'new pieces are cleaned to plain phrases, never repeat the list or each other, and stop at two');
check(newPiecePhrase('  Barrel-Leg JEANS ') === 'barrel-leg jeans' && newPiecePhrase('ab') === null && newPiecePhrase('one two three four five') === null && newPiecePhrase(undefined) === null, 'a new piece is a short retail phrase or it is nothing');
const verdicts = parseTrendReport(answer([trend()], [{ id: STANDING_TRENDS[0].id, verdict: 'over' }, { id: 'seed-invented', verdict: 'over' }, { id: STANDING_TRENDS[1].id, verdict: 'maybe' }, { id: STANDING_TRENDS[2].id, verdict: 'current' }]), request).standing;
check(verdicts.map(v => `${v.id}:${v.verdict}`).join() === `${STANDING_TRENDS[0].id}:over,${STANDING_TRENDS[2].id}:current`, 'a verdict counts only for a real built-in trend and only as "current" or "over"');
check(parseTrendReport(answer([trend({ sources: [] })], [{ id: STANDING_TRENDS[0].id, verdict: 'over' }]), { ...request, signals: [] }).standing.length === 0, 'with no reports read, no built-in trend is judged at all');

console.log('# Pieces checked against the stores');
const drafted = { ...kept.trends[0], newPieces: [{ piece: 'barrel jeans', kind: 'garment' }, { piece: 'jelly sandal', kind: 'accessory' }], coverage: { women: 9, men: 0 } };
const questions = trendStockQuestions(drafted);
check(questions.every(q => q.department === 'women') && questions.length === drafted.keyGarments.length + drafted.keyAccessories.length + 2 && questions.some(q => q.phrase === 'barrel jeans'), 'every named piece, new ones included, is asked of the stores - in the departments the trend is for');
check(trendStockQuestions({ ...drafted, coverage: { women: 9, men: 7 } }).length === questions.length * 2, 'a trend for both departments is stocked for both');
const stocked: Record<string, { women: number; men: number }> = { 'barrel jeans': { women: NEW_PIECE_MIN_PRODUCTS, men: 0 }, 'jelly sandal': { women: NEW_PIECE_MIN_PRODUCTS - 1, men: 0 } };
drafted.keyGarments.forEach((g: string, i: number) => (stocked[g] = { women: i === 0 ? 2 : 12, men: 0 }));
const published = withVerifiedPieces(drafted, stocked);
check(published.keyGarments.includes('barrel jeans') && !published.keyAccessories.includes('jelly sandal') && published.addedPieces.join() === 'barrel jeans' && !('newPieces' in published), 'a new piece the stores really stock joins the trend; one they do not is dropped before anyone sees it');
check(published.live.women === drafted.keyGarments.length - 1 + 1 && published.live.men === 0, 'each trend records how many of its pieces have real products behind them');
const unanswered = withVerifiedPieces(drafted, {});
check(unanswered.keyGarments.join() === drafted.keyGarments.join() && !unanswered.addedPieces && unanswered.live.women === 0, 'when the stores do not answer, the trend is published on its photographed pieces and adds nothing unchecked');

console.log('# The built-in trends');
const src = standingTrends();
check(JSON.stringify(src) === JSON.stringify(STANDING_TRENDS) && read('functions/src/standingTrends.ts') === standingTrendsSource().replace(/\r\n/g, '\n'), `functions/src/standingTrends.ts is up to date with the app's ${STANDING_TRENDS.length} built-in trends (run scripts/buildStandingTrends.ts after any change to them)`);
const over = (ids: string[]) => ids.map(id => ({ id, verdict: 'over' as const }));
const ids = STANDING_TRENDS.map(s => s.id);
const first = standingChanges(over(ids.slice(0, 3)), {}, STANDING_TRENDS);
check(first.retire.length === 0 && first.warn.join() === ids.slice(0, 3).join() && STANDING_STRIKES_TO_RETIRE === 2, "one week's verdict retires nothing: a first \"over\" is only noted");
const struck = Object.fromEntries(ids.slice(0, 5).map(id => [id, { status: 'published', by: 'auto', strikes: 1 }]));
const second = standingChanges(over(ids.slice(0, 5)), struck, STANDING_TRENDS);
check(second.retire.join() === ids.slice(0, MAX_STANDING_RETIRED_PER_RUN).join() && second.warn.length === 0, `a second "over" running retires it - at most ${MAX_STANDING_RETIRED_PER_RUN} in a week`);
const thin = Object.fromEntries([...ids.slice(0, STANDING_TRENDS.length - MIN_STANDING_LIVE).map(id => [id, { status: 'archived', by: 'auto' }]), ...ids.slice(-2).map(id => [id, { status: 'published', by: 'auto', strikes: 1 }])]);
check(standingChanges(over(ids.slice(-2)), thin, STANDING_TRENDS).retire.length === 0, `the built-in list is never reviewed below ${MIN_STANDING_LIVE} live trends`);
const editor = { [ids[0]]: { status: 'published' }, [ids[1]]: { status: 'archived' } };
const respected = standingChanges([{ id: ids[0], verdict: 'over' }, { id: ids[0], verdict: 'over' }, { id: ids[1], verdict: 'current' }], editor, STANDING_TRENDS);
check(respected.retire.length + respected.warn.length + respected.restore.length + respected.clear.length === 0, "an editor's own decision - to keep one or to retire one - is never touched");
const back = standingChanges([{ id: ids[0], verdict: 'current' }, { id: ids[1], verdict: 'current' }, { id: ids[2], verdict: 'current' }], { [ids[0]]: { status: 'archived', by: 'auto' }, [ids[1]]: { status: 'published', by: 'auto', strikes: 1 } }, STANDING_TRENDS);
check(back.restore.join() === ids[0] && back.clear.join() === ids[1] && back.retire.length === 0, 'a trend the review retired comes back when it is current again, and a single strike is wiped by a "current"');
check(standingChanges([{ id: 'seed-invented', verdict: 'over' }], {}, STANDING_TRENDS).warn.length === 0, 'a verdict on something that is not a built-in trend does nothing');

console.log('# When it runs');
check(trendListDue(null, NOW) && trendListDue(0, NOW) && trendListDue(NOW - TREND_LIST_EVERY_MS, NOW) && !trendListDue(NOW - 2 * DAY, NOW) && TREND_LIST_EVERY_MS < 7 * DAY, 'the list is due when there has never been one, or the last is about a week old');
const fn = read('functions/src/index.ts');
const run = fn.slice(fn.indexOf('async function refreshTrendListNow'), fn.indexOf('/** The same run, on demand from the Trend Desk. */'));
check(/\.pubsub\.schedule\('every day 06:00'\)/.test(run) && /if \(!options\.force && !trendListDue\(lastPublished \|\| null, now\.getTime\(\)\)\) \{\s*\n\s*return \{ published: 0, retired: 0, skipped: 'not due' \};/.test(run) && run.indexOf('trendListDue(') < run.indexOf('await writeReport('), 'the run is looked at every morning and does its work only when due - so a first deploy publishes within a day, and a failed week is tried again the next morning');
check(/const report = await writeReport\(existingNames, season, now\.getFullYear\(\), 6\);/.test(run) && /if \(fresh\.length === 0\) \{/.test(run) && /return \{ published: 0, retired: 0 \};/.test(run) && run.indexOf('if (fresh.length === 0)') < run.indexOf('batch.commit()'), 'when nothing usable comes back, nothing is changed: the current list stands');
check(/status: 'published',\s*\n\s*source: 'ai-auto',\s*\n\s*publishedAt: now\.toISOString\(\),/.test(run) && !/requireAdmin/.test(run), 'the trends are published directly, marked as machine-written, with no approval step');
check(/const stocked = report\.trends\.length \? await stockTrendPieces\(report\.trends\) : \{\};\s*\n\s*const fresh = report\.trends\.map\(trend => withVerifiedPieces\(trend, stocked\)\);/.test(run), 'every piece is checked against the stores before the trends are published');
check(/reviewStandingTrends\(report\.standing, now\)\.catch\(/.test(run) && run.indexOf('await batch.commit()') < run.indexOf('reviewStandingTrends(report.standing'), 'the built-in trends are reviewed after the list is published, and a failure there cannot undo it');
check(/\.collection\('trendRuns'\)/.test(run) && /publications: signalSources\(report\.signals\)/.test(run) && /grounded: report\.grounded/.test(run), 'every run leaves a record of what it read and what it published');
check(/data: await refreshTrendListNow\(\{ force: true \}\)/.test(fn), 'the Trend Desk button still runs it at once - an option, not a step');
const gather = fn.slice(fn.indexOf('async function gatherTrendSignals'), fn.indexOf('const completeTrendReport'));
check(/TREND_FEEDS\.map\(async feed =>/.test(gather) && /setTimeout\(\(\) => controller\.abort\(\), 10000\)/.test(gather) && /\} catch \{\s*\n\s*return \[\] as TrendSignal\[\];/.test(gather) && /if \(!response\.ok\) return \[\] as TrendSignal\[\];/.test(gather), 'a feed that is slow, refuses or fails is skipped; reading the press can never stop the run');
const stock = fn.slice(fn.indexOf('async function stockTrendPieces'), fn.indexOf('async function reviewStandingTrends'));
check(/if \(!apiKey\) return stocked;/.test(stock) && /db\.collection\('channel3Kept'\)\.doc\(keptDocId\(question\.department, question\.query\)\)/.test(stock) && /await refreshKept\(previous, question\.department, question\.query, deps\)/.test(stock) && /if \(Date\.now\(\) - started > TREND_STOCK_TIME_MS\) break;/.test(stock), "the stores' answers are kept where a member's Trends page reads them, so a new trend's rail opens stocked");
const review = fn.slice(fn.indexOf('async function reviewStandingTrends'), fn.indexOf('async function refreshTrendListNow'));
check(/standingChanges\(verdicts, overrides, STANDING_TRENDS\)/.test(review) && /by: 'auto',/.test(review) && /db\.collection\(SEED_OVERRIDES\)/.test(review), "the review writes to the same record the Trend Desk's Retire and Restore write, marked as its own");
check(/return report\.trends\.map\(\(\{ newPieces: _unchecked, \.\.\.trend \}: any\) => trend\);/.test(fn) && /const drafts = await draftTrends\(existingNames, season, year, 6\);/.test(fn), 'the desk\'s "Draft" uses the same generator, without the unchecked pieces');

(async () => {
  let asked = '';
  const report = await writeTrendReport(request, async given => {
    asked = given;
    return answer([trend()]);
  });
  check(asked === prompt && report.trends.length === 1, 'the report is one question to the model and one checked answer');

  console.log('# Reaching each member');
  const service = read('src/services/trendService.ts');
  check(/getDocs\(collection\(db, 'trendSeedOverrides'\)\)/.test(service) && /d\.data\(\)\.status === 'archived'/.test(service) && /SEED_TRENDS\.filter\(seed => !retired\.has\(seed\.id\)\)/.test(service), 'the app drops a built-in trend the review has retired - no release needed');
  check(/where\('status', '==', 'published'\)/.test(service) && /mergeTrends\(/.test(service), 'the app reads the published list and merges it with the built-in trends by itself');
  const remix = read('src/services/trendRemixService.ts');
  const build = remix.slice(remix.indexOf('export function buildRemixes'), remix.indexOf('export function trendPathView'));
  check(/trendAdventurousness\(signals\)/.test(build) && /localeFit\(trend, locale\)/.test(build) && /profileMatch\(trend, taste,/.test(build) && /pathWeight\(level,/.test(build) && /stageWeight\(e\.remix\.trend\.stage, adventurousness\)/.test(build) && /challengesAvoidRule/.test(build), "which trends a member sees, and in what order, is worked out on their device: their taste, closet, city and weather, how adventurous their own behaviour is, where they are on their path, and the things they said they don't wear");
  check(/trendsForFocus\(|trendIllustrated\(/.test(remix) && /trendWeatherFit\(trend, temperature\)/.test(remix), 'their department and the temperature where they are decide it too');
  const rules = read('firestore.rules');
  check(!/trendRuns/.test(rules), "the run's records are the server's own: no client rule opens them");

  console.log(`\n${checks} checks.`);
  if (failures) {
    console.log(`${failures} failure(s).`);
    process.exit(1);
  }
  console.log('OK - the trend list is written from current reporting, checked, published and pruned with no person in between, and each member is shown it through their own profile.');
})().catch(error => {
  console.error('FAILED', error);
  process.exit(1);
});

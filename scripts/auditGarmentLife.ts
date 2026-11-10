/**
 * Garment life audit: the life record, the revive queue, the longevity
 * score, the care guide and the brand repair table - the exact code the app
 * runs, against closets built to hit every edge.
 *
 * Fails when:
 *   - a life record invents a fact (cost per wear with no wears or no price,
 *     "last worn" on a piece never worn);
 *   - the revive queue lists a piece too new to judge, one the user chose to
 *     keep, or one worn recently - or nudges an out-of-season piece;
 *   - "wear it this week" keeps boosting a piece after it has been worn, or
 *     after the week is over, or by enough to beat an occasion's fit;
 *   - the longevity score is not derived from its inputs, exceeds 0-100,
 *     scores a closet with no wears, or marks a new account down for having
 *     nothing a year old;
 *   - a care issue has no route to a fix, or a brand programme link is not
 *     https, is duplicated, or matches a brand it should not.
 *
 * Run:  npx tsx scripts/auditGarmentLife.ts
 */

import { BRAND_REPAIR_PROGRAMS, repairProgramFor } from '../src/data/brandRepairPrograms';
import { CARE_ISSUES, careIssuesFor } from '../src/data/careGuide';
import {
  LifeItem,
  REVIVE_WINDOW_DAYS,
  careLine,
  isReviving,
  lifeFacts,
  lifeRecord,
  longevityScore,
  newCareRecord,
  readCareLog,
  reviveBonus,
  reviveQueue,
  reviveUntilFrom,
  seasonOf,
} from '../src/services/garmentLife';

let failures = 0;
let checks = 0;
const check = (ok: boolean, message: string) => {
  checks += 1;
  if (!ok) {
    failures += 1;
    console.log(`  FAIL  ${message}`);
  }
};

const DAY = 86_400_000;
// A fixed "now" in mid-November, so season logic is deterministic: fall.
const NOW = new Date('2026-11-10T12:00:00Z').getTime();
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();
const item = (over: Partial<LifeItem> & { id: string }): LifeItem => ({ category: 'tops', createdAt: daysAgo(200), ...over });

// ---- 1. Life record ----
console.log('# Life record');
const fresh = lifeRecord(item({ id: 'a', price: 80, wornCount: 0 }), NOW);
check(fresh.costPerWear === null, 'no cost per wear before the first wear');
check(fresh.daysSinceWorn === null, 'no "last worn" on a piece never worn');
check(lifeFacts(fresh).map(f => f.label).join('|') === 'Worn|In your closet', `an unworn piece shows two facts only (${lifeFacts(fresh).map(f => f.label).join('|')})`);
check(lifeFacts(fresh)[0].value === 'Not yet', 'unworn reads "Not yet", not "0 times"');

const worn = lifeRecord(item({ id: 'b', price: 90, wornCount: 12, lastWornDate: daysAgo(3), purchaseDate: daysAgo(800) }), NOW);
check(worn.costPerWear === 7.5, `cost per wear is price / wears (got ${worn.costPerWear})`);
check(worn.sinceIsAddedDate === false && worn.monthsOwned === 26, `a purchase date is used for ownership (got ${worn.monthsOwned} months)`);
check(lifeFacts(worn).map(f => `${f.label}=${f.value}`).join('|') === 'Worn=12 times|Last worn=3 days ago|Owned=2 years|Cost per wear=$7.50', lifeFacts(worn).map(f => `${f.label}=${f.value}`).join('|'));
check(lifeRecord(item({ id: 'c', wornCount: 4, lastWornDate: daysAgo(1) }), NOW).costPerWear === null, 'no cost per wear without a price');
check(lifeRecord(item({ id: 'd', price: 0, wornCount: 4 }), NOW).costPerWear === null, 'a zero price is no price');
check(lifeRecord({ id: 'e' }, NOW).monthsOwned === null && lifeFacts(lifeRecord({ id: 'e' }, NOW)).length === 1, 'an item with no dates claims no ownership length');
check(lifeRecord(item({ id: 'f', wornCount: 2, lastWornDate: 'not a date' }), NOW).daysSinceWorn === null, 'a malformed date is ignored, not rendered');

const log = readCareLog([
  newCareRecord('hem', 'pro', '  took it up an inch  ', NOW - 40 * DAY),
  newCareRecord('button', 'self', undefined, NOW - 5 * DAY),
  { id: 'x', date: 'nope', issue: 'hem', by: 'self' },
  { id: 'y', date: daysAgo(1), issue: 'teleport', by: 'self' },
  null,
]);
check(log.length === 2 && log[0].issue === 'button', 'the care log keeps well-formed records, newest first');
check(log[1].note === 'took it up an inch', 'a note is trimmed');
check(/^Hem restitched, [A-Z][a-z]+ 2026 · done professionally$/.test(careLine(log[1])), `a care line reads plainly ("${careLine(log[1])}")`);
check(readCareLog('nope').length === 0 && readCareLog(undefined).length === 0, 'anything that is not a list reads as no care log');

// ---- 2. Revive queue ----
console.log('# Revive queue');
check(seasonOf(NOW) === 'fall', 'the audit clock is in fall');
const closet: LifeItem[] = [
  item({ id: 'new-unworn', createdAt: daysAgo(20), wornCount: 0 }),
  item({ id: 'old-unworn', createdAt: daysAgo(90), wornCount: 0 }),
  item({ id: 'heirloom-just-added', createdAt: daysAgo(5), purchaseDate: daysAgo(3000), wornCount: 0 }),
  item({ id: 'dormant', wornCount: 6, lastWornDate: daysAgo(200) }),
  item({ id: 'very-dormant', wornCount: 2, lastWornDate: daysAgo(500) }),
  item({ id: 'recent', wornCount: 9, lastWornDate: daysAgo(10) }),
  item({ id: 'kept', createdAt: daysAgo(300), wornCount: 0, declutterKeep: true }),
  item({ id: 'summer-only', createdAt: daysAgo(300), wornCount: 0, seasons: ['summer'] }),
  item({ id: 'fall-piece', createdAt: daysAgo(100), wornCount: 0, seasons: ['Fall', 'Winter'] }),
];
const queue = reviveQueue(closet, NOW);
const ids = queue.map(c => c.item.id);
check(!ids.includes('new-unworn'), 'a piece added three weeks ago is too new to judge');
check(!ids.includes('heirloom-just-added'), 'an old piece photographed this week has had no chance to be logged as worn');
check(!ids.includes('recent'), 'a piece worn ten days ago is not quiet');
check(!ids.includes('kept'), 'a piece the user chose to keep is left alone');
check(ids.includes('old-unworn') && ids.includes('dormant') && ids.includes('very-dormant'), 'never-worn and long-dormant pieces are listed');
check(ids[ids.length - 1] === 'summer-only' && queue[queue.length - 1].outOfSeason, 'an out-of-season piece is listed last and marked');
check(queue.find(c => c.item.id === 'fall-piece')?.outOfSeason === false, 'season tags are read case-insensitively');
check(ids.indexOf('very-dormant') < ids.indexOf('dormant'), 'the longest idle comes first');
check(queue.find(c => c.item.id === 'dormant')?.line === 'Worn 6 times, last 7 months ago', `a dormant line states the facts ("${queue.find(c => c.item.id === 'dormant')?.line}")`);
check(queue.find(c => c.item.id === 'old-unworn')?.line === 'In your closet 2 months and not worn yet', `a never-worn line states the facts ("${queue.find(c => c.item.id === 'old-unworn')?.line}")`);

// "Wear it this week"
const until = reviveUntilFrom(NOW);
const chosen = item({ id: 'chosen', wornCount: 6, lastWornDate: daysAgo(200), reviveUntil: until });
check(isReviving(chosen, NOW) && reviveBonus(chosen, NOW) > 8, 'a chosen piece outranks ordinary rotation (max 8)');
check(reviveBonus(chosen, NOW) < 14, 'the boost stays under one step of formality mismatch (14), so fit still wins');
check(reviveQueue([...closet, chosen], NOW)[0].item.id === 'chosen', 'a chosen piece tops the list');
check(!isReviving(chosen, NOW + (REVIVE_WINDOW_DAYS + 1) * DAY), 'the boost ends when the week does');
const wornSince = { ...chosen, lastWornDate: new Date(NOW + 2 * DAY).toISOString(), wornCount: 7 };
check(!isReviving(wornSince, NOW + 3 * DAY) && reviveBonus(wornSince, NOW + 3 * DAY) === 0, 'the boost ends the moment the piece is worn');
check(reviveBonus(item({ id: 'plain', wornCount: 1 }), NOW) === 0 && reviveBonus(item({ id: 'bad', reviveUntil: 'x' }), NOW) === 0, 'no flag, or a malformed one, is no boost');

// ---- 3. Longevity score ----
console.log('# Longevity score');
const empty = longevityScore([], {}, NOW);
check(empty.score === null, 'an empty closet has no score');
const unworn = longevityScore([item({ id: '1' }), item({ id: '2' })], {}, NOW);
check(unworn.score === null && /Log a wear/.test(unworn.headline), 'a closet with no wears logged has no score, and says how to start');

const young: LifeItem[] = Array.from({ length: 10 }, (_, i) =>
  item({ id: `y${i}`, createdAt: daysAgo(100), wornCount: 30, lastWornDate: daysAgo(4) })
);
const youngScore = longevityScore(young, {}, NOW);
check(youngScore.inputs.find(i => i.key === 'kept')?.measured === false, 'nothing a year old: that input is unmeasured');
check(youngScore.score === Math.round(((35 + 30) / (35 + 30 + 10 + 5)) * 100), `a young, well-worn closet is scored over what can be measured (got ${youngScore.score})`);

const mixed: LifeItem[] = [
  item({ id: 'm1', createdAt: daysAgo(900), wornCount: 60, lastWornDate: daysAgo(2), careLog: [newCareRecord('sole', 'pro', undefined, NOW - 90 * DAY)] }),
  item({ id: 'm2', createdAt: daysAgo(900), wornCount: 0 }),
  item({ id: 'm3', createdAt: daysAgo(30), wornCount: 3, lastWornDate: daysAgo(1) }),
  item({ id: 'm4', createdAt: daysAgo(500), wornCount: 5, lastWornDate: daysAgo(400) }),
];
const result = longevityScore(mixed, { passedOn: 2 }, NOW);
const byKey = Object.fromEntries(result.inputs.map(i => [i.key, i]));
check(byKey.wears.value === '17 on average' && Math.abs(byKey.wears.points - (17 / 30) * 35) < 1e-9, `wears: ${byKey.wears.value}, ${byKey.wears.points.toFixed(2)} points`);
check(byKey.active.value === '50% of your closet' && byKey.active.points === 15, `in rotation: ${byKey.active.value}`);
check(byKey.kept.value === '1 of 3' && Math.abs(byKey.kept.points - 20 / 3) < 1e-9, `kept and worn: ${byKey.kept.value}`);
check(byKey.care.points === 2.5 && byKey.passedOn.points === 2, 'one fix is 2.5 points, two pieces passed on is 2');
const earned = result.inputs.filter(i => i.measured).reduce((s, i) => s + i.points, 0);
const available = result.inputs.filter(i => i.measured).reduce((s, i) => s + i.max, 0);
check(result.score === Math.round((earned / available) * 100), `the score is exactly its inputs (got ${result.score})`);
check(available === 100, 'with everything measurable the inputs total 100');
check(/older pieces/.test(result.headline), `the headline names the weakest input - here, older pieces going unworn ("${result.headline}")`);
check(/three months/.test(longevityScore(mixed.filter(i => i.id !== 'm2' && i.id !== 'm4').concat([item({ id: 'm5', wornCount: 1, lastWornDate: daysAgo(120) }), item({ id: 'm6', wornCount: 1, lastWornDate: daysAgo(150) })]), {}, NOW).headline), 'when rotation is the weakest input the headline points at the revive list');

const maxed = longevityScore(
  Array.from({ length: 6 }, (_, i) =>
    item({
      id: `x${i}`,
      createdAt: daysAgo(800),
      wornCount: 400,
      lastWornDate: daysAgo(1),
      careLog: [newCareRecord('hem', 'self', undefined, NOW - DAY), newCareRecord('button', 'self', undefined, NOW - 2 * DAY)],
    })
  ),
  { passedOn: 50 },
  NOW
);
check(maxed.score === 100 && maxed.inputs.every(i => i.points <= i.max), 'no input exceeds its maximum and the score tops out at 100');
check(longevityScore(mixed, { passedOn: -3 }, NOW).inputs.find(i => i.key === 'passedOn')?.points === 0, 'a negative count is zero');
[empty, unworn, youngScore, result, maxed].forEach(s =>
  check(s.inputs.length === 5 && s.inputs.every(i => i.label && i.value && i.how), 'every input is shown with its measurement and how it counts')
);

// ---- 4. Care guide ----
console.log('# Care guide');
check(new Set(CARE_ISSUES.map(i => i.id)).size === CARE_ISSUES.length, 'care issue ids are unique');
CARE_ISSUES.forEach(issue => {
  check(!!issue.handOver && !!issue.done && !!issue.summary, `${issue.id}: has a summary, a hand-over line and a logged name`);
  check(issue.tier === 'diy' ? issue.steps.length >= 2 && issue.steps.length <= 4 : issue.steps.length === 0, `${issue.id}: a home fix has 2-4 steps, a professional one has none`);
  const text = [issue.summary, issue.handOver, ...issue.steps].join(' ');
  check(!/guarantee|will fix|good as new|always works|100%/i.test(text), `${issue.id}: promises no outcome`);
});
check(!careIssuesFor('tops').some(i => i.id === 'sole'), 'nobody resoles a top');
check(careIssuesFor('shoes').some(i => i.id === 'sole') && !careIssuesFor('shoes').some(i => i.id === 'pilling'), 'shoes get shoe problems');
check(careIssuesFor(undefined).length >= 6, 'an unknown category still gets the general list');

// ---- 5. Brand repair programmes ----
console.log('# Brand programmes');
const aliases = BRAND_REPAIR_PROGRAMS.flatMap(p => p.aliases);
check(new Set(aliases).size === aliases.length, 'no alias belongs to two brands');
BRAND_REPAIR_PROGRAMS.forEach(program => {
  let url: URL | null = null;
  try {
    url = new URL(program.url);
  } catch {
    /* reported below */
  }
  check(!!url && url.protocol === 'https:' && !url.search, `${program.brand}: link is a plain https page`);
  check(/^\d{4}-\d{2}-\d{2}$/.test(program.checked), `${program.brand}: records when its page was confirmed`);
  check(program.aliases.every(a => a === a.toLowerCase()), `${program.brand}: aliases are lowercase`);
  check(repairProgramFor(program.brand)?.brand === program.brand, `${program.brand}: finds itself`);
  check(!/free|guarantee|lifetime/i.test(program.offer), `${program.brand}: the offer line claims no price or guarantee`);
});
const expect = (brand: string | undefined, want: string | null) =>
  check((repairProgramFor(brand)?.brand ?? null) === want, `"${brand}" -> ${want} (got ${repairProgramFor(brand)?.brand ?? null})`);
expect("Levi's", "Levi's");
expect('LEVI’S®', "Levi's");
expect('levis premium', "Levi's");
expect('Patagonia Worn Wear', 'Patagonia');
expect('The North Face', 'The North Face');
expect('North Face', 'The North Face');
expect('Arcteryx', "Arc'teryx");
expect('Fjallraven', 'Fjällräven');
expect('Northern Reflections', null);
expect('Dannerton', null);
expect('Red', null);
expect('Zara', null);
expect('', null);
expect(undefined, null);

console.log(`\n${checks} checks.`);
if (failures) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log('OK - the life record states only what was counted, the revive list leaves new and kept pieces alone, and the score is exactly its inputs.');

/**
 * Lifestyle split audit.
 *
 * Fuzzes the rebalancing maths behind the profile builder's lifestyle step
 * (snapLifestyleSplit / adjustLifestyleSplit in models/personalStyleProfile)
 * and fails when, after any snap or any accepted +/- step:
 *   - the four shares do not sum to exactly 100;
 *   - a share is not a whole multiple of 5, or is negative;
 *   - the edited share did not move by exactly +5 / -5;
 *   - another share moved the wrong way (up on a raise, down on a lower);
 * or when a step is refused although the share had room to move, or accepted
 * although it had none. Also replays the split a tester reported
 * (78 / 17 / 12 / 8) and checks what is saved is what is shown.
 *
 * Run:  npx tsx scripts/auditLifestyleSplit.ts
 */

import {
  LIFESTYLE_KEYS,
  LIFESTYLE_STEP,
  LifestyleKey,
  LifestyleSplit,
  adjustLifestyleSplit,
  lifestyleWeightsFromSplit,
  normalizeLifestyleWeights,
  snapLifestyleSplit,
} from '../src/models/personalStyleProfile';

let failures = 0;
let checks = 0;

function fail(message: string) {
  failures += 1;
  if (failures <= 20) console.log(`  FAIL  ${message}`);
}

// Seeded so a failure can be replayed.
let seed = 0x33c0ffee;
function random(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
}

const show = (s: LifestyleSplit) => LIFESTYLE_KEYS.map(k => `${k} ${s[k]}`).join(' / ');

function assertWhole(split: LifestyleSplit, context: string) {
  checks += 1;
  const sum = LIFESTYLE_KEYS.reduce((total, k) => total + split[k], 0);
  if (sum !== 100) fail(`${context}: sums to ${sum} (${show(split)})`);
  for (const key of LIFESTYLE_KEYS) {
    const value = split[key];
    if (!Number.isInteger(value) || value % LIFESTYLE_STEP !== 0) fail(`${context}: ${key} is ${value}, not a multiple of ${LIFESTYLE_STEP}`);
    if (value < 0) fail(`${context}: ${key} is negative (${value})`);
  }
}

/** A messy saved state: arbitrary fractions, sometimes zeros, junk or a sum far from 1. */
function randomWeights(): Record<LifestyleKey, number> {
  const mode = Math.floor(random() * 6);
  const out = {} as Record<LifestyleKey, number>;
  for (const key of LIFESTYLE_KEYS) {
    if (mode === 0) out[key] = random(); // any fractions, any sum
    else if (mode === 1) out[key] = Math.round(random() * 20) * 0.05; // 5% steps, any sum
    else if (mode === 2) out[key] = random() < 0.5 ? 0 : random(); // some zeros
    else if (mode === 3) out[key] = Math.round(random() * 100) / 100; // whole percents
    else if (mode === 4) out[key] = random() * 40 - 5; // out of range, some negative
    else out[key] = random() < 0.2 ? NaN : random() * 0.001; // tiny / not a number
  }
  return out;
}

function step(split: LifestyleSplit, key: LifestyleKey, direction: 1 | -1, context: string): LifestyleSplit {
  const next = adjustLifestyleSplit(split, key, direction);
  const room = direction === 1 ? split[key] < 100 : split[key] > 0;
  if (!next) {
    if (room) fail(`${context}: ${direction > 0 ? '+' : '-'}5 on ${key} refused with room to move (${show(split)})`);
    return split;
  }
  if (!room) fail(`${context}: ${direction > 0 ? '+' : '-'}5 on ${key} accepted with no room (${show(split)})`);
  assertWhole(next, context);
  if (next[key] - split[key] !== direction * LIFESTYLE_STEP) {
    fail(`${context}: ${key} moved ${next[key] - split[key]}, expected ${direction * LIFESTYLE_STEP} (${show(split)} -> ${show(next)})`);
  }
  for (const other of LIFESTYLE_KEYS) {
    if (other === key) continue;
    const moved = next[other] - split[other];
    if (direction === 1 ? moved > 0 : moved < 0) {
      fail(`${context}: ${other} moved ${moved} against a ${direction > 0 ? 'raise' : 'lower'} of ${key} (${show(split)} -> ${show(next)})`);
    }
  }
  return next;
}

// ---- 1. Fuzz: random saved states, then a random walk of +/- presses ----
const STARTS = 5000;
const PRESSES = 60;
let accepted = 0;
let refused = 0;
for (let i = 0; i < STARTS; i++) {
  const weights = randomWeights();
  let split = snapLifestyleSplit(weights);
  assertWhole(split, `snap #${i} of ${JSON.stringify(weights)}`);
  // Snapping an already-whole split must not move anything.
  const again = snapLifestyleSplit(lifestyleWeightsFromSplit(split));
  if (LIFESTYLE_KEYS.some(k => again[k] !== split[k])) fail(`snap #${i} is not stable: ${show(split)} -> ${show(again)}`);

  for (let p = 0; p < PRESSES; p++) {
    const key = LIFESTYLE_KEYS[Math.floor(random() * LIFESTYLE_KEYS.length)];
    const direction: 1 | -1 = random() < 0.5 ? 1 : -1;
    const next = step(split, key, direction, `start #${i} press ${p}`);
    if (next === split) refused += 1;
    else accepted += 1;
    split = next;
  }

  // What the screen saves is what it shows, to the percent.
  const saved = normalizeLifestyleWeights(lifestyleWeightsFromSplit(split));
  const savedSum = LIFESTYLE_KEYS.reduce((total, k) => total + Math.round(saved[k] * 100), 0);
  if (savedSum !== 100 || LIFESTYLE_KEYS.some(k => Math.round(saved[k] * 100) !== split[k])) {
    fail(`start #${i}: saved ${JSON.stringify(saved)} does not read back as ${show(split)}`);
  }
}

// ---- 2. Exhaustive: every whole split, every key, both directions ----
let states = 0;
for (let work = 0; work <= 100; work += 5) {
  for (let casual = 0; work + casual <= 100; casual += 5) {
    for (let social = 0; work + casual + social <= 100; social += 5) {
      const split: LifestyleSplit = { work, casual, social, travel: 100 - work - casual - social };
      states += 1;
      for (const key of LIFESTYLE_KEYS) {
        step(split, key, 1, 'exhaustive');
        step(split, key, -1, 'exhaustive');
      }
    }
  }
}

// ---- 3. Edge cases, and the reported split ----
assertWhole(snapLifestyleSplit(undefined), 'snap of undefined');
assertWhole(snapLifestyleSplit({}), 'snap of {}');
assertWhole(snapLifestyleSplit({ work: 0, casual: 0, social: 0, travel: 0 }), 'snap of all zeros');
if (adjustLifestyleSplit({ work: 100, casual: 0, social: 0, travel: 0 }, 'work', 1) !== null) fail('raise at 100 was accepted');
if (adjustLifestyleSplit({ work: 100, casual: 0, social: 0, travel: 0 }, 'casual', -1) !== null) fail('lower at 0 was accepted');

const reported = { work: 0.78, casual: 0.17, social: 0.12, travel: 0.08 };
const snapped = snapLifestyleSplit(reported);
assertWhole(snapped, 'reported split');

console.log(`# Lifestyle split audit`);
console.log(`  fuzz:        ${STARTS} random saved states x ${PRESSES} presses (${accepted} accepted, ${refused} refused at 0 or 100)`);
console.log(`  exhaustive:  ${states} whole splits x 4 shares x 2 directions`);
console.log(`  checks:      ${checks} splits verified (sum === 100, multiples of 5, none negative, edited share moved exactly 5)`);
console.log(`  reported:    work 78 / casual 17 / social 12 / travel 8 (total 115) loads as ${show(snapped)}`);
const raised = adjustLifestyleSplit(snapped, 'travel', 1);
if (raised) console.log(`               +5 travel -> ${show(raised)}`);

console.log(`\n${failures === 0 ? 'OK - the split always sums to 100 in whole 5% steps.' : `${failures} failure(s).`}`);
process.exit(failures === 0 ? 0 : 1);

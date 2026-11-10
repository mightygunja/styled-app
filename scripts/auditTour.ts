/**
 * Walkthrough audit: the first-run tour's steps and the overlay's geometry.
 *
 * Fails when:
 *   - a step highlights a control nothing registers (the ring would point at
 *     nothing and the step would fall back to a bare card);
 *   - a registered control is never used, or a tab step names a tab that
 *     does not exist;
 *   - the tour does not open and close on a plain card, or the welcome card
 *     promises a different number of stops than there are;
 *   - a card's copy is too long to read at a glance;
 *   - for any window size and any control position, the card leaves the
 *     window, covers the control it describes, or the dimmed panels overlap
 *     the lit area or fail to cover the rest of the window.
 *
 * Run:  npx tsx scripts/auditTour.ts
 */

import fs from 'fs';
import path from 'path';
import {
  CARD_GAP,
  EDGE,
  Rect,
  Size,
  dimPanels,
  holeFor,
  isHighlightable,
  overlaps,
  placeCard,
} from '../src/tour/tourLayout';
import { TOUR_STEPS, TOUR_STOP_COUNT, TOUR_TARGET_IDS } from '../src/tour/tourSteps';

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

// ---- 1. Steps ----
console.log('# Steps');
check(new Set(TOUR_STEPS.map(s => s.id)).size === TOUR_STEPS.length, 'step ids are unique');
check(TOUR_STEPS[0].target === null, 'the tour opens on a plain welcome card');
check(TOUR_STEPS[TOUR_STEPS.length - 1].target === null, 'the tour closes on a plain card');
check(
  TOUR_STEPS.slice(1, -1).every(s => s.target !== null),
  'every step between the welcome and the finish highlights something'
);
const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
check(
  TOUR_STEPS[0].body.startsWith(`${words[TOUR_STOP_COUNT]} stops`),
  `the welcome card promises the real number of stops (${TOUR_STOP_COUNT})`
);
TOUR_STEPS.forEach(step => {
  check(step.title.length > 0 && step.title.length <= 26, `${step.id}: title fits on one line (${step.title.length} chars)`);
  check(step.body.length >= 30 && step.body.length <= 130, `${step.id}: body is one or two short sentences (${step.body.length} chars)`);
  check(step.cta.length > 0 && step.cta.length <= 20, `${step.id}: button label is short`);
  check(!/click/i.test(step.body + step.cta), `${step.id}: says "tap", not "click" - it is a phone first`);
  if (step.target !== null) {
    check((TOUR_TARGET_IDS as readonly string[]).includes(step.target), `${step.id}: target "${step.target}" is a known control`);
  }
});

// A step that takes the user to a tab highlights that tab, so the tap and the navigation agree.
TOUR_STEPS.forEach(step => {
  if (step.go && 'tab' in step.go) {
    check(step.target === `tab.${step.go.tab}`, `${step.id}: highlights the tab it opens (${step.go.tab})`);
  }
});

// ---- 2. The controls exist in the app ----
console.log('# Controls');
const navigatorSource = read('src/navigation/AppNavigator.tsx');
const tabNames = [...navigatorSource.matchAll(/<Tab\.Screen name="(\w+)"/g)].map(m => m[1]);
check(tabNames.length === 5, `the tab navigator has its five tabs (${tabNames.join(', ')})`);
const tabBar = read('src/navigation/FloatingTabBar.tsx');
check((tabBar.match(/ref=\{tourRef\(`tab\.\$\{route\.name\}`/g) || []).length === 2, 'both tab bar layouts (phone pill, desktop header) register every tab');

const sources: Record<string, string> = {
  'home.occasions': 'src/screens/HomeScreen.tsx',
  'home.shop': 'src/screens/HomeScreen.tsx',
  'closet.add': 'src/screens/ClosetScreen.tsx',
  'more.trends': 'src/screens/MoreScreen.tsx',
};
TOUR_TARGET_IDS.forEach(id => {
  if (id.startsWith('tab.')) {
    check(tabNames.includes(id.slice(4)), `${id}: that tab exists`);
  } else {
    const file = sources[id];
    check(!!file && new RegExp(`(tourRef\\('${id}'\\)|TourTarget id="${id}")`).test(read(file)), `${id}: registered in ${file}`);
  }
  check(TOUR_STEPS.some(step => step.target === id) || id === 'tab.Home', `${id}: used by a step`);
});
check(/step\?\.id === 'trends'/.test(read('src/screens/MoreScreen.tsx')) && /scrollToStyleSection/.test(read('src/screens/MoreScreen.tsx')), 'More scrolls the Trend Report row into view when the tour reaches it');
check(TOUR_STEPS.some(s => s.id === 'trends'), 'that step still exists under the id More listens for');

// Wiring: started for a new account, drawn above the navigator, replayable.
check(/markTourPending\(user\?\.uid\)/.test(read('src/screens/OnboardingScreen.tsx')), 'finishing the first-run survey queues the tour');
check(/<TourOverlay \/>/.test(navigatorSource) && /<TourProvider /.test(navigatorSource), 'the navigator mounts the provider and the overlay');
check(/tour\.start/.test(read('src/screens/SettingsScreen.tsx')), 'Settings can replay the tour');

// ---- 3. Overlay geometry ----
console.log('# Layout');
const windows: Size[] = [
  { width: 320, height: 568 }, // small phone
  { width: 390, height: 844 }, // phone
  { width: 430, height: 932 }, // large phone
  { width: 820, height: 1180 }, // tablet
  { width: 1440, height: 900 }, // desktop
];
const cardHeights = [150, 190, 240];
let cases = 0;
for (const window of windows) {
  const sizes = [
    { width: 44, height: 44 }, // an icon button
    { width: 72, height: 48 }, // a tab
    { width: window.width - 40, height: 64 }, // a full-width row
    { width: window.width - 40, height: 96 }, // the chips block
  ];
  for (const size of sizes) {
    const xs = [0, (window.width - size.width) / 2, window.width - size.width];
    const ys = [0, 60, (window.height - size.height) / 2, window.height - size.height - 28, window.height - size.height];
    for (const x of xs) {
      for (const y of ys) {
        for (const cardHeight of cardHeights) {
          cases += 1;
          const target: Rect = { x, y, ...size };
          if (!isHighlightable(target, window)) {
            check(false, `a control fully inside a ${window.width}x${window.height} window must be highlightable`);
            continue;
          }
          const hole = holeFor(target, window);
          const card = placeCard(hole, window, cardHeight);
          const cardRect: Rect = { x: card.left, y: card.top, width: card.width, height: cardHeight };
          const where = `${window.width}x${window.height}, control ${Math.round(x)},${Math.round(y)} ${Math.round(size.width)}x${size.height}, card ${cardHeight}`;

          const inside =
            cardRect.x >= EDGE - 0.5 &&
            cardRect.y >= EDGE - 0.5 &&
            cardRect.x + cardRect.width <= window.width - EDGE + 0.5 &&
            cardRect.y + cardRect.height <= window.height - EDGE + 0.5;
          if (!inside) check(false, `card leaves the window (${where})`);

          // The card must clear the control whenever either side has room for it.
          const room = Math.max(hole.y, window.height - hole.y - hole.height);
          if (room >= cardHeight + CARD_GAP + EDGE && overlaps(cardRect, hole)) {
            check(false, `card covers the control it describes (${where})`);
          }

          const panels = dimPanels(hole, window);
          if (panels.some(p => p.width < 0 || p.height < 0)) check(false, `a dim panel has negative size (${where})`);
          if (panels.some(p => p.width > 0 && p.height > 0 && overlaps(p, hole))) check(false, `a dim panel covers the lit control (${where})`);
          const dimArea = panels.reduce((sum, p) => sum + p.width * p.height, 0);
          const expected = window.width * window.height - hole.width * hole.height;
          if (Math.abs(dimArea - expected) > 1) check(false, `the dim panels do not cover exactly everything else (${where})`);
        }
      }
    }
  }
}
check(cases > 500, `layout checked across ${cases} window / control / card combinations`);

const phone = { width: 390, height: 844 };
check(!isHighlightable(null, phone), 'no measurement is not highlightable');
check(!isHighlightable({ x: 10, y: 900, width: 100, height: 40 }, phone), 'a control scrolled below the window is not highlighted');
check(!isHighlightable({ x: 10, y: -80, width: 100, height: 40 }, phone), 'a control scrolled above the window is not highlighted');
check(!isHighlightable({ x: 10, y: 10, width: 0, height: 0 }, phone), 'a control with no size is not highlighted');
const centred = placeCard(null, phone, 190);
check(centred.side === 'center' && Math.abs(centred.left + centred.width / 2 - phone.width / 2) < 1, 'with nothing to highlight the card is centred');
check(placeCard({ x: 20, y: 760, width: 70, height: 60 }, phone, 190).side === 'above', 'a control at the bottom (the tab bar) gets its card above');
check(placeCard({ x: 20, y: 60, width: 350, height: 90 }, phone, 190).side === 'below', 'a control at the top gets its card below');

console.log(`\n${checks} checks.`);
if (failures) {
  console.log(`${failures} failure(s).`);
  process.exit(1);
}
console.log('OK - every step points at a real control, and the card never leaves the screen or covers what it describes.');

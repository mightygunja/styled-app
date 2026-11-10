/**
 * The first-run walkthrough, as data.
 *
 * A new account finishes the style survey and lands on Home; the tour then
 * dims the screen, puts a pulsing ring around ONE real control at a time,
 * says in a sentence what it is for, and - when that control is tapped -
 * really goes there. Eight stops, about a minute, skippable at every step
 * and replayable from Settings.
 *
 * Kept as plain data with no app imports so scripts/auditTour.ts can check
 * that every step points at a control that exists and that the copy stays
 * short enough to read at a glance.
 */

export type TourTab = 'Home' | 'Closet' | 'StyleProfile' | 'StylistChat' | 'More';

export interface TourStep {
  id: string;
  /**
   * The registered control to highlight (see TourTarget). Null shows a
   * centred card with no highlight - the welcome and the finish.
   */
  target: string | null;
  title: string;
  /** One or two short sentences. */
  body: string;
  /** The card's button. Tapping the highlighted control does the same thing. */
  cta: string;
  /** Where tapping takes the user before the next step appears. */
  go?: { tab: TourTab } | { screen: 'TrendInsights' };
}

/**
 * Every highlightable control, by id. A `tab.<Route>` id is registered by
 * the tab bar for each tab; the rest are wrapped where they are drawn.
 */
export const TOUR_TARGET_IDS = [
  'home.occasions',
  'home.shop',
  'closet.add',
  'more.trends',
  'tab.Home',
  'tab.Closet',
  'tab.StyleProfile',
  'tab.StylistChat',
  'tab.More',
] as const;

export type TourTargetId = (typeof TOUR_TARGET_IDS)[number];

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    title: 'A quick look around',
    body: 'Eight stops, about a minute. Tap whatever is glowing to move on. You can skip now and take the tour later from Settings.',
    cta: 'Show me',
  },
  {
    id: 'today',
    target: 'home.occasions',
    title: 'Dress me today',
    body: 'Say what today is. A full outfit is built for it every day, from your own closet.',
    cta: 'Next',
  },
  {
    id: 'shop',
    target: 'home.shop',
    title: 'Shop, ranked for you',
    body: 'Every piece is scored against your closet and your taste, and shows how many new outfits it would unlock.',
    cta: 'Next',
  },
  {
    id: 'closet',
    target: 'tab.Closet',
    title: 'Your closet',
    body: 'Everything here works from what you own. Tap Closet.',
    cta: 'Open Closet',
    go: { tab: 'Closet' },
  },
  {
    id: 'add',
    target: 'closet.add',
    title: 'Add a few pieces',
    body: 'Photograph a piece and it is tagged for you. Five pieces is enough for real outfits.',
    cta: 'Next',
  },
  {
    id: 'style',
    target: 'tab.StyleProfile',
    title: 'Your style profile',
    body: 'Your colours, your fit and the words you chose in the survey. Tap Style.',
    cta: 'Open Style',
    go: { tab: 'StyleProfile' },
  },
  {
    id: 'chat',
    target: 'tab.StylistChat',
    title: 'Ask your stylist',
    body: 'What to wear tonight, what goes with a piece, what to buy next. Tap Chat.',
    cta: 'Open Chat',
    go: { tab: 'StylistChat' },
  },
  {
    id: 'more',
    target: 'tab.More',
    title: 'Everything else',
    body: 'Planner, packing, resale and the Trend Report all live under More. Tap More.',
    cta: 'Open More',
    go: { tab: 'More' },
  },
  {
    id: 'trends',
    target: 'more.trends',
    title: 'The Trend Report',
    body: 'What is moving in your city right now, and the way in from your own closet. Tap it.',
    cta: 'Open the report',
    go: { screen: 'TrendInsights' },
  },
  {
    id: 'done',
    target: null,
    title: 'That is the tour',
    body: 'One thing to do now: add a few pieces to your closet, and tomorrow the outfits are yours.',
    cta: 'Add my first piece',
  },
];

/** How many steps put a ring around something - the number the welcome card promises. */
export const TOUR_STOP_COUNT = TOUR_STEPS.filter(step => step.target !== null).length;

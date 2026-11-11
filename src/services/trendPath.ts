/**
 * The trend path: matching trends to a person, and moving them toward
 * "trendy" at a pace they will actually follow.
 *
 * Two questions, answered separately and then combined:
 *
 *   1. MATCH - how well does this trend fit this person as they are today?
 *      Read off what the app genuinely knows: the style words they chose,
 *      their colour palette, the cuts their profile recommends, the pieces
 *      already in their closet, and the things they said they never wear.
 *      Every point in the score has a sentence that explains it, and only
 *      true sentences are shown ("You already own 2 pieces of it").
 *
 *   2. PATH - how far from that comfort zone should the app reach right now?
 *      Five steps. Someone at step 1 is shown trends that already sit inside
 *      their taste, at their peak, and is offered the smallest way in (a
 *      scarf, a belt, a bag). Each step widens the reach: a shoe, then a
 *      garment, then trends still on the rise, then the emerging ones first
 *      and worn as a whole look.
 *
 * The pace is deliberately slow. A person moves by what they DO - opening
 * trends, owning pieces that carry them - never by what the app wishes, and
 * no faster than one step a week in either direction. "Not my thing" counts
 * against it, so the path eases off for someone who keeps saying no.
 *
 * Pure: no storage, no network. The stored step lives in shopperSignals;
 * scripts/auditTrendPath.ts exercises everything here.
 */

import { FashionTrend, TrendStage } from '../models/fashionTrend';
import { Product } from '../models/product';
import { canonicalArchetype } from './archetypeMatch';
import { piecesForTrend, slotOf, WardrobeFocus } from './trendLooks';

// ==================== MATCH ====================

/** The slice of the style profile matching reads. Same fields as ProfileMatchContext. */
export interface PathProfile {
  styleArchetypes?: string[];
  recommendedColors?: string[];
  recommendedSilhouettes?: string[];
  avoidRules?: string[];
}

export interface TrendMatch {
  /** 0..1 - how squarely the trend sits in this person's taste and closet today. */
  score: number;
  /** Why, in plain sentences, strongest first. Empty when nothing personal is known. */
  reasons: string[];
}

const list = (words: string[]) =>
  words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;

/**
 * How well a trend fits a person. `owned` and `supporting` are how many of
 * their own pieces carry the trend outright, and on colour alone
 * (trendCoverage); `crossesRule` is the avoid rule it runs up against, if any.
 */
export function profileMatch(
  trend: FashionTrend,
  profile: PathProfile | undefined,
  closet: { owned: number; supporting: number },
  crossesRule: string | null = null
): TrendMatch {
  const reasons: string[] = [];
  // With no profile there is no taste to be near or far from: neutral.
  let score = profile ? 0.25 : 0.45;

  if (closet.owned > 0) {
    score += closet.owned >= 2 ? 0.2 : 0.15;
    reasons.push(`You already own ${closet.owned === 1 ? 'a piece' : `${closet.owned} pieces`} of it`);
  }

  if (profile) {
    const mine = (profile.styleArchetypes || []).map(canonicalArchetype);
    const shared = [...new Set(trend.archetypes.map(canonicalArchetype))].filter(a => mine.includes(a));
    if (shared.length > 0) {
      score += shared.length >= 2 ? 0.3 : 0.22;
      reasons.push(`Sits in your ${list(shared.slice(0, 2))} lane`);
    }

    const palette = (profile.recommendedColors || []).map(c => c.toLowerCase());
    const colours = trend.keyColors.filter(k => palette.some(p => p.includes(k) || k.includes(p)));
    if (colours.length > 0) {
      score += 0.18;
      reasons.push(`Comes in your colours: ${list(colours.slice(0, 3))}`);
    }

    const cuts = (profile.recommendedSilhouettes || []).map(s => s.toLowerCase());
    const sharedCuts = trend.silhouettes.filter(s => cuts.some(c => c.includes(s) || s.includes(c)));
    if (sharedCuts.length > 0) {
      score += 0.1;
      reasons.push(`Cut the way your profile recommends: ${list(sharedCuts.slice(0, 2))}`);
    }
  }

  if (closet.owned === 0 && closet.supporting > 0) {
    score += 0.05;
    reasons.push(`Your closet already has its colours`);
  }

  if (crossesRule) score -= 0.25;

  return { score: Math.max(0, Math.min(1, Number(score.toFixed(3)))), reasons };
}

// ==================== PATH ====================

export type PathLevel = 1 | 2 | 3 | 4 | 5;
type Slot = 'garment' | 'shoes' | 'finish';

export interface PathStep {
  level: PathLevel;
  name: string;
  /** What the app does for someone at this step, as it would be said to them. */
  line: string;
  /** Trends below this match are held back (demoted), not hidden. */
  minMatch: number;
  /** Stages offered as a next step, in order of preference. */
  stages: TrendStage[];
  /** Which kind of piece is offered first: the size of the commitment. */
  commitment: Slot[];
}

export const PATH_STEPS: PathStep[] = [
  {
    level: 1,
    name: 'Starting point',
    line: 'Trends that already sit inside your taste, one small piece at a time.',
    minMatch: 0.5,
    stages: ['peak'],
    commitment: ['finish', 'shoes', 'garment'],
  },
  {
    level: 2,
    name: 'Finding your lane',
    line: 'Still close to your taste - now with the shoe as well as the bag.',
    minMatch: 0.42,
    stages: ['peak', 'rising'],
    commitment: ['shoes', 'finish', 'garment'],
  },
  {
    level: 3,
    name: 'In step',
    line: 'The garment itself, in trends that are peaking and the ones about to.',
    minMatch: 0.34,
    stages: ['peak', 'rising'],
    commitment: ['garment', 'shoes', 'finish'],
  },
  {
    level: 4,
    name: 'Ahead of the curve',
    line: 'Rising trends first, and a step outside your usual lane.',
    minMatch: 0.24,
    stages: ['rising', 'emerging', 'peak'],
    commitment: ['garment', 'shoes', 'finish'],
  },
  {
    level: 5,
    name: 'Setting the pace',
    line: 'Emerging trends before they peak, whether or not they are your usual thing.',
    minMatch: 0,
    stages: ['emerging', 'rising', 'peak'],
    commitment: ['garment', 'shoes', 'finish'],
  },
];

export const stepFor = (level: number): PathStep =>
  PATH_STEPS[Math.max(1, Math.min(5, Math.round(level))) - 1];

/** One step a week, at most, in either direction. */
export const PATH_STEP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export interface PathEvidence {
  /** Times they opened or shopped a trend. */
  trendTaps: number;
  /** Explicit "not my thing". */
  trendDismissals: number;
  /** Published trends their own closet can carry today. */
  trendsWorn: number;
}

/**
 * The step a person's behaviour supports, before pacing. Engagement and
 * ownership count for it (each capped, so no single habit carries someone
 * to the top), saying no counts against it.
 */
export function evidenceLevel(evidence: PathEvidence): PathLevel {
  const points =
    Math.min(12, Math.max(0, evidence.trendTaps)) +
    Math.min(6, Math.max(0, evidence.trendsWorn)) * 2 -
    Math.max(0, evidence.trendDismissals) * 1.5;
  if (points < 3) return 1;
  if (points < 7) return 2;
  if (points < 12) return 3;
  if (points < 18) return 4;
  return 5;
}

export interface PathState {
  level: PathLevel;
  /** When the level last changed (ms). */
  since: number;
}

/**
 * The stored step, moved toward what the evidence supports - slowly.
 * A first reading starts no higher than step 3: nobody is told they are
 * "setting the pace" on the day they arrive. After that the step moves by
 * one, and only once a week has passed since it last moved.
 */
export function advancePath(previous: PathState | undefined, evidence: PathLevel, now: number): PathState {
  if (!previous || !(previous.level >= 1 && previous.level <= 5)) {
    return { level: Math.min(3, evidence) as PathLevel, since: now };
  }
  if (evidence === previous.level || now - previous.since < PATH_STEP_INTERVAL_MS) return previous;
  const level = (previous.level + (evidence > previous.level ? 1 : -1)) as PathLevel;
  return { level, since: now };
}

/**
 * Ranking multiplier for a trend at this step. Trends outside the comfort
 * zone are not removed - they are held back, less and less as the step
 * rises - and the stage a person is ready for is nudged forward.
 */
export function pathWeight(level: number, match: number, stage: TrendStage): number {
  const step = stepFor(level);
  const comfort = match >= step.minMatch ? 1 : 0.55 + 0.09 * step.level;
  let stageBias = 1;
  if (stage === 'emerging') stageBias = step.level <= 2 ? 0.6 : step.level === 3 ? 0.85 : 1.2;
  else if (stage === 'rising') stageBias = step.level === 1 ? 0.85 : step.level >= 4 ? 1.1 : 1;
  else if (stage === 'peak') stageBias = step.level >= 5 ? 0.95 : 1;
  return Number((comfort * stageBias).toFixed(3));
}

// ==================== THE NEXT STEP ====================

/** What nextStep reads off a ranked trend. TrendRemix satisfies it. */
export interface PathCandidate {
  trend: FashionTrend;
  wearableToday: boolean;
  adjacency: number;
  challengesAvoidRule: string | null;
}

export interface NextStep {
  trend: FashionTrend;
  piece: Product;
  step: PathStep;
  /** One honest sentence on why this piece, at this step. */
  why: string;
}

const SLOT_WORD: Record<Slot, string> = {
  finish: 'The smallest way in - one finishing piece, worn with what you already own.',
  shoes: 'The shoe carries it: one pair changes how the rest of your closet reads.',
  garment: 'The piece the trend is named for.',
};

/**
 * The one thing to try next: the highest-ranked trend this person is not
 * yet wearing that their step allows, and the piece of it sized to that
 * step. `candidates` must already be ranked for them. Null when there is
 * nothing honest to offer (no trend left, or no photographed piece).
 */
export function nextStep(
  candidates: PathCandidate[],
  level: number,
  focus: WardrobeFocus,
  options: { ownedNames?: string[]; catalog?: Product[] } = {}
): NextStep | null {
  const step = stepFor(level);
  const owned = new Set((options.ownedNames || []).map(n => n.toLowerCase()));
  const open = candidates.filter(c => !c.wearableToday);
  // Everything already in the closet: deepen the first trend rather than stop.
  const pool = open.length > 0 ? open : candidates;

  // Strictest first; each pass relaxes one rule so a thin week still has an answer.
  const passes: Array<(c: PathCandidate) => boolean> = [
    c => step.stages.includes(c.trend.stage) && c.adjacency >= step.minMatch && !c.challengesAvoidRule,
    c => c.trend.stage !== 'fading' && c.adjacency >= step.minMatch && !c.challengesAvoidRule,
    c => c.trend.stage !== 'fading' && !c.challengesAvoidRule,
    c => c.trend.stage !== 'fading',
  ];

  for (const allowed of passes) {
    for (const candidate of pool.filter(allowed)) {
      const rail = piecesForTrend(candidate.trend, focus, { limit: 10, catalog: options.catalog }).filter(
        p => !owned.has(p.name.toLowerCase())
      );
      for (const slot of step.commitment) {
        const piece = rail.find(p => slotOf(p) === slot);
        if (piece) return { trend: candidate.trend, piece, step, why: SLOT_WORD[slot] };
      }
    }
  }
  return null;
}

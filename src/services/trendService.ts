/**
 * Trend registry.
 *
 * The one place the app reads real fashion-trend signal from. Published
 * trends live in the Firestore `trends` collection and are written only
 * server-side: the trend desk Cloud Functions draft with AI and a human
 * publishes - same draft-then-publish shape as Edits, because a trend the
 * app asserts to thousands of users deserves an editor.
 *
 * Reads are cached in memory for the session: trends move at editorial
 * speed, and half the app (Home, Shop, Explore, Chat, the Trend Report)
 * asks for the same list.
 *
 * The shipped editorial seed set is MERGED with what the desk publishes
 * (since 2026-09-16): the seeds are the curated, global, accessory-complete
 * backbone with hand-checked pieces; the desk adds this cycle's sharper
 * material on top. Where a desk trend covers the same ground as a seed the
 * desk's entry wins - it is the editor's call - but it inherits the seed's
 * accessories and pieces so its rail stays aligned. The layer never comes
 * up blank: an empty or unreachable collection simply means seeds only.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { FashionTrend } from '../models/fashionTrend';
import { SEED_TRENDS } from '../data/seedTrends';
import { mergeTrends } from './trendMerge';

export { mergeTrends };

const draftTrendReportFn = httpsCallable(functions, 'draftTrendReport');
const listTrendDeskFn = httpsCallable(functions, 'listTrendDesk');
const publishTrendFn = httpsCallable(functions, 'publishTrend');
const archiveTrendFn = httpsCallable(functions, 'archiveTrend');

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_TRENDS = 12;

let cache: { at: number; trends: FashionTrend[] } | null = null;

function normalize(id: string, data: any): FashionTrend {
  return {
    id,
    name: String(data.name || ''),
    summary: String(data.summary || ''),
    region: String(data.region || 'Global'),
    stage: data.stage || 'rising',
    season: data.season || 'fall',
    year: Number(data.year) || new Date().getFullYear(),
    keyGarments: Array.isArray(data.keyGarments) ? data.keyGarments.map(String) : [],
    keyColors: Array.isArray(data.keyColors) ? data.keyColors.map(String) : [],
    silhouettes: Array.isArray(data.silhouettes) ? data.silhouettes.map(String) : [],
    archetypes: Array.isArray(data.archetypes) ? data.archetypes.map(String) : [],
    keyAccessories: Array.isArray(data.keyAccessories) ? data.keyAccessories.map(String) : [],
    stylingNote: String(data.stylingNote || ''),
    entryPiece: String(data.entryPiece || ''),
    regions: Array.isArray(data.regions) ? data.regions.map(String).filter(Boolean) : undefined,
    reach: ['local', 'regional', 'global'].includes(data.reach) ? data.reach : undefined,
    pieces: Array.isArray(data.pieces) ? data.pieces.map(String).filter(Boolean) : undefined,
    status: data.status || 'published',
    source: data.source || 'editorial',
    createdAt: String(data.createdAt || ''),
    publishedAt: data.publishedAt ? String(data.publishedAt) : undefined,
  };
}

/**
 * The trend pool: desk-published trends (freshest first) merged with the
 * editorial seeds. A failed read degrades to seeds only - never to a blank
 * surface.
 */
/** Seed ids the editor has retired from the Trend Desk. Empty on any failure. */
async function retiredSeedIds(): Promise<Set<string>> {
  try {
    const snapshot = await getDocs(collection(db, 'trendSeedOverrides'));
    return new Set(snapshot.docs.filter(d => d.data().status === 'archived').map(d => d.id));
  } catch {
    return new Set();
  }
}

export async function getPublishedTrends(): Promise<FashionTrend[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.trends;

  let trends: FashionTrend[] = [];
  const [retired] = await Promise.all([
    retiredSeedIds(),
    (async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, 'trends'), where('status', '==', 'published'))
        );
        trends = snapshot.docs
          .map(d => normalize(d.id, d.data()))
          .filter(t => t.name)
          .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
          .slice(0, MAX_TRENDS);
      } catch (error) {
        console.log('Trend registry unreachable, using seed trends', error);
      }
    })(),
  ]);

  // The editor can retire a shipped seed from the Trend Desk; honour that here.
  trends = mergeTrends(
    trends,
    SEED_TRENDS.filter(seed => !retired.has(seed.id))
  );

  cache = { at: Date.now(), trends };
  return trends;
}

/** Drops the session cache, so the next read sees a fresh publish. */
export function invalidateTrendCache(): void {
  cache = null;
}

// ==================== TREND DESK (admin) ====================

/**
 * Everything on the desk - drafts, published, archived - for the admin
 * screen, followed by the editorial seeds shipped in the app with the
 * status the editor has given them (published unless retired). Seeds are
 * listed because users see them: a trend the app shows must be a trend the
 * editor can see and retire.
 */
export async function listTrendDesk(): Promise<FashionTrend[]> {
  const result = await listTrendDeskFn({});
  const payload = (result.data as any)?.data || {};
  const rows = (payload.trends || []) as any[];
  const overrides = new Map<string, string>(
    ((payload.seedOverrides || []) as any[]).map(o => [String(o.id), String(o.status || 'published')])
  );
  const seeds = SEED_TRENDS.map(seed => ({
    ...seed,
    status: overrides.get(seed.id) === 'archived' ? ('archived' as const) : ('published' as const),
  }));
  return [...rows.map(r => normalize(r.id, r)), ...seeds];
}

/** Asks the AI to draft a fresh trend report. Drafts only - nothing reaches users. */
export async function draftTrendReport(): Promise<number> {
  const result = await draftTrendReportFn({});
  return Number((result.data as any)?.data?.drafted) || 0;
}

/** Human sign-off: a draft goes live for every user. */
export async function publishTrend(trendId: string, name?: string): Promise<void> {
  await publishTrendFn({ trendId, name });
  invalidateTrendCache();
}

/** Retires a trend - drafts that missed, or published trends past their moment. */
export async function archiveTrend(trendId: string, name?: string): Promise<void> {
  await archiveTrendFn({ trendId, name });
  invalidateTrendCache();
}

export const trendService = {
  getPublishedTrends,
  mergeTrends,
  invalidateTrendCache,
  listTrendDesk,
  draftTrendReport,
  publishTrend,
  archiveTrend,
};

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
 * When the collection is empty or unreachable, the shipped editorial seed
 * set answers instead - the trend layer never comes up blank.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { FashionTrend } from '../models/fashionTrend';
import { SEED_TRENDS } from '../data/seedTrends';

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
    stylingNote: String(data.stylingNote || ''),
    entryPiece: String(data.entryPiece || ''),
    status: data.status || 'published',
    source: data.source || 'editorial',
    createdAt: String(data.createdAt || ''),
    publishedAt: data.publishedAt ? String(data.publishedAt) : undefined,
  };
}

/**
 * Published trends, freshest first. Falls back to the editorial seed set on
 * an empty collection or a failed read - a missing trend feed should degrade
 * to last season's report, never to a blank surface.
 */
export async function getPublishedTrends(): Promise<FashionTrend[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.trends;

  let trends: FashionTrend[] = [];
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

  if (trends.length === 0) trends = SEED_TRENDS;

  cache = { at: Date.now(), trends };
  return trends;
}

/** Drops the session cache, so the next read sees a fresh publish. */
export function invalidateTrendCache(): void {
  cache = null;
}

// ==================== TREND DESK (admin) ====================

/** Everything on the desk - drafts, published, archived - for the admin screen. */
export async function listTrendDesk(): Promise<FashionTrend[]> {
  const result = await listTrendDeskFn({});
  const rows = ((result.data as any)?.data?.trends || []) as any[];
  return rows.map(r => normalize(r.id, r));
}

/** Asks the AI to draft a fresh trend report. Drafts only - nothing reaches users. */
export async function draftTrendReport(): Promise<number> {
  const result = await draftTrendReportFn({});
  return Number((result.data as any)?.data?.drafted) || 0;
}

/** Human sign-off: a draft goes live for every user. */
export async function publishTrend(trendId: string): Promise<void> {
  await publishTrendFn({ trendId });
  invalidateTrendCache();
}

/** Retires a trend - drafts that missed, or published trends past their moment. */
export async function archiveTrend(trendId: string): Promise<void> {
  await archiveTrendFn({ trendId });
  invalidateTrendCache();
}

export const trendService = {
  getPublishedTrends,
  invalidateTrendCache,
  listTrendDesk,
  draftTrendReport,
  publishTrend,
  archiveTrend,
};

/**
 * Explore
 *
 * Replaces a surface that fetched the 30 most recent public posts and labelled
 * them "trending". That is the same query the feed uses, so Explore was showing
 * people content they had already seen, with no discovery in it at all.
 *
 * Three real signals now, in increasing order of how hard they are to copy:
 *
 *   1. **Trending** is engagement velocity - how fast a post is gathering
 *      likes and comments relative to its age. That is what trending means.
 *      Deterministic, no model involved.
 *   2. **For you** is posts from people the user does NOT follow, scored
 *      against their style profile. Discovery has to reach outside the graph
 *      the user has already built, or it is just the feed again.
 *   3. **Collections** are AI-curated editorial groupings with a written
 *      rationale - the part that gives Explore a voice rather than a ranking.
 */

import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where, orderBy, limit as fsLimit } from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { Post } from './socialFeedService';
import { ProfileMatchContext } from './profileMatchContext';

const curateExploreCollectionsFn = httpsCallable(functions, 'curateExploreCollections');

/** How far back a post can be and still count as trending. */
const TRENDING_WINDOW_HOURS = 168; // one week

export interface TrendingPost {
  post: Post;
  /** Engagement per hour since posting. */
  velocity: number;
  /** Why it is here, for the UI to show rather than leaving the ranking opaque. */
  reason: string;
}

export interface ExploreCollection {
  title: string;
  rationale: string;
  postIds: string[];
}

export interface TrendingHashtag {
  tag: string;
  count: number;
  /** Share of this tag's uses that landed in the last 48 hours, as a percentage. */
  growth: number;
}

function hoursSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return Infinity;
  return Math.max(1, (Date.now() - then) / 3_600_000);
}

/**
 * Pulls a wide window of recent public posts once. Everything below derives
 * from this rather than issuing its own query - Firestore charges per read and
 * three separate 200-post fetches for one screen would be careless.
 */
export async function fetchExplorePool(poolSize: number = 200): Promise<Post[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'posts'),
      where('privacy', '==', 'public'),
      orderBy('createdAt', 'desc'),
      fsLimit(poolSize)
    )
  );

  return snapshot.docs.map(d => {
    const data = d.data() as any;
    return {
      id: d.id,
      ...data,
      createdAt:
        data.createdAt?.toDate?.().toISOString?.() ?? data.createdAt ?? new Date().toISOString(),
    } as Post;
  });
}

/**
 * Ranks by engagement velocity rather than recency.
 *
 * Comments weigh more than likes because they cost more to leave. The age
 * divisor has a floor of one hour so a post that gathers ten likes in its first
 * minute cannot divide its way to an absurd score.
 */
export function rankTrending(posts: Post[]): TrendingPost[] {
  return posts
    .filter(p => hoursSince(p.createdAt) <= TRENDING_WINDOW_HOURS)
    .map(post => {
      const engagement = (post.likes || 0) + (post.comments || 0) * 2 + (post.saves || 0) * 3;
      const age = hoursSince(post.createdAt);
      const velocity = engagement / age;

      let reason: string;
      if ((post.saves || 0) >= 3) {
        reason = `Saved ${post.saves} times`;
      } else if ((post.comments || 0) >= 3) {
        reason = `${post.comments} people talking about it`;
      } else if (age <= 24 && engagement > 0) {
        reason = 'Picking up fast today';
      } else {
        reason = 'Getting attention this week';
      }

      return { post, velocity, reason };
    })
    // A post with no engagement at all is not trending, however recent it is.
    .filter(t => t.velocity > 0)
    .sort((a, b) => b.velocity - a.velocity);
}

/**
 * Discovery: posts from people the user does not already follow, ranked by how
 * well they match the user's own style profile.
 *
 * Excluding followed accounts is the whole point. Including them would rebuild
 * the feed, which is exactly the bug this service exists to fix.
 */
export function rankForYou(
  posts: Post[],
  profile: ProfileMatchContext | undefined,
  followingIds: string[],
  currentUserId: string
): Array<{ post: Post; score: number; reason: string }> {
  const following = new Set(followingIds);

  return posts
    .filter(p => p.userId !== currentUserId && !following.has(p.userId))
    .map(post => {
      const haystack = [post.caption, ...(post.hashtags || [])].join(' ').toLowerCase();
      let score = 10;
      let reason = 'New to you';

      const archetype = profile?.styleArchetypes?.find(a => haystack.includes(a.toLowerCase()));
      if (archetype) {
        score += 30;
        reason = `Reads ${archetype}, like your profile`;
      }

      const colour = profile?.recommendedColors?.find(c =>
        haystack.includes(c.toLowerCase().split(' ').pop() || '')
      );
      if (colour) {
        score += 20;
        if (!archetype) reason = `${colour} is in your palette`;
      }

      // An avoid rule is a strong preference here too, same as in product
      // matching: it sinks a post rather than erasing it, so a look the user
      // "never wears" can still surface when it's genuinely resonating.
      if (profile?.avoidRules?.some(rule => haystack.includes(rule.toLowerCase()))) {
        score -= 30;
      }

      // Mild engagement weighting so a good match with some traction outranks
      // a good match nobody has looked at.
      score += Math.min(15, (post.likes || 0) + (post.comments || 0) * 2);

      return { post, score, reason };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Hashtag counts across the whole pool, with real growth.
 *
 * Growth is the share of a tag's uses that landed in the last 48 hours, which
 * is a number that can actually be computed. The previous implementation
 * hardcoded growth to 0, so the UI's trend indicator never said anything.
 */
export function rankHashtags(posts: Post[], top: number = 10): TrendingHashtag[] {
  const total = new Map<string, number>();
  const recent = new Map<string, number>();

  posts.forEach(post => {
    const isRecent = hoursSince(post.createdAt) <= 48;
    (post.hashtags || []).forEach(tag => {
      const key = tag.toLowerCase();
      total.set(key, (total.get(key) || 0) + 1);
      if (isRecent) recent.set(key, (recent.get(key) || 0) + 1);
    });
  });

  return Array.from(total.entries())
    .map(([tag, count]) => ({
      tag,
      count,
      growth: Math.round(((recent.get(tag) || 0) / count) * 100),
    }))
    .sort((a, b) => b.count - a.count || b.growth - a.growth)
    .slice(0, top);
}

/**
 * Style categories derived from what people actually post, rather than a
 * hardcoded list of six.
 *
 * Only categories with real posts behind them are returned, so the screen never
 * offers a filter that leads to an empty grid.
 */
export function deriveCategories(posts: Post[], min: number = 2): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();

  posts.forEach(post => {
    (post.hashtags || []).forEach(tag => {
      const key = tag.toLowerCase();
      // Skip tags that are just noise - single characters and pure numbers.
      if (key.length < 3 || /^\d+$/.test(key)) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count >= min)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export const exploreService = {
  fetchExplorePool,
  rankTrending,
  rankForYou,
  rankHashtags,
  deriveCategories,

  /**
   * AI-curated editorial collections over the recent pool.
   *
   * Returns [] on any failure rather than throwing: collections are the
   * enrichment layer on this screen, and Explore has to keep working without
   * them.
   */
  curateCollections: async (posts: Post[]): Promise<ExploreCollection[]> => {
    const candidates = posts.filter(p => p.caption || (p.hashtags || []).length > 0).slice(0, 60);
    if (candidates.length < 6) return [];

    try {
      const result = await curateExploreCollectionsFn({
        posts: candidates.map(p => ({
          id: p.id,
          caption: (p.caption || '').slice(0, 240),
          hashtags: p.hashtags || [],
          type: p.type,
        })),
      });

      const collections = (result.data as any).data.collections as ExploreCollection[];
      const validIds = new Set(candidates.map(p => p.id));

      // Drop hallucinated ids, then drop collections too thin to be worth a row.
      return collections
        .map(c => ({ ...c, postIds: (c.postIds || []).filter(id => validIds.has(id)) }))
        .filter(c => c.postIds.length >= 3);
    } catch (error) {
      console.log('Explore collections unavailable', error);
      return [];
    }
  },
};

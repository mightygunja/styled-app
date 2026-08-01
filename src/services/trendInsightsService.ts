/**
 * Real trend signal computed from actual community post activity (hashtag
 * frequency in recent posts) - replaces the old Math.random()-driven mock.
 */

import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface TrendingTag {
  hashtag: string;
  postCount: number;
}

const RECENT_POSTS_SAMPLE = 200;

export const trendInsightsService = {
  getTrendingHashtags: async (topN: number = 10): Promise<TrendingTag[]> => {
    const snapshot = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(RECENT_POSTS_SAMPLE)));
    const counts = new Map<string, number>();
    snapshot.docs.forEach(d => {
      const hashtags: string[] = d.data().hashtags || [];
      hashtags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1));
    });
    return Array.from(counts.entries())
      .map(([hashtag, postCount]) => ({ hashtag, postCount }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, topN);
  },
};

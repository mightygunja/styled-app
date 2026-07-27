/**
 * Social Feed Service
 *
 * Manages social posts, likes, comments, and feed generation.
 * Backed by Firestore (`posts`, `postLikes`, `postComments`, `savedPosts`,
 * `postCollections`, `feedPreferences` collections).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile, userProfileService } from './userProfileService';

export type PostType = 'transformation' | 'outfit' | 'closet' | 'tip' | 'product';
export type PostPrivacy = 'public' | 'followers' | 'private';

export interface Post {
  id: string;
  userId: string;
  user?: UserProfile;
  type: PostType;
  images: string[];
  caption: string;
  hashtags: string[];
  taggedItems?: string[];
  taggedStylist?: string;
  location?: string;
  privacy: PostPrivacy;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: string;
}

export interface Like {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user?: UserProfile;
  text: string;
  likes: number;
  isLiked?: boolean;
  parentCommentId?: string;
  replies?: Comment[];
  createdAt: string;
}

export interface SavedPost {
  id: string;
  userId: string;
  postId: string;
  collectionId?: string;
  createdAt: string;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  postCount: number;
  isPrivate: boolean;
  createdAt: string;
}

export interface FeedPreferences {
  userId: string;
  favoriteStyles: string[];
  favoriteColors: string[];
  followedHashtags: string[];
  mutedUsers: string[];
  mutedHashtags: string[];
  showTrending: boolean;
  showFollowingOnly: boolean;
  contentTypes: PostType[];
}

export interface UserInteraction {
  userId: string;
  postId: string;
  type: 'view' | 'like' | 'comment' | 'save' | 'share';
  timestamp: string;
}

const DEFAULT_PREFERENCES: Omit<FeedPreferences, 'userId'> = {
  favoriteStyles: [],
  favoriteColors: [],
  followedHashtags: [],
  mutedUsers: [],
  mutedHashtags: [],
  showTrending: true,
  showFollowingOnly: false,
  contentTypes: ['transformation', 'outfit', 'closet', 'tip', 'product'],
};

function toDateString(ts: any): string {
  return ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : ts || new Date().toISOString();
}

function toPost(id: string, data: any): Post {
  return { id, ...data, createdAt: toDateString(data.createdAt) };
}

function toComment(id: string, data: any): Comment {
  return { id, ...data, createdAt: toDateString(data.createdAt) };
}

class SocialFeedService {
  /**
   * Get feed for user (chronological, public posts only)
   */
  async getFeed(userId: string, page: number = 1, limitCount: number = 10): Promise<Post[]> {
    const q = query(
      collection(db, 'posts'),
      where('privacy', '==', 'public'),
      orderBy('createdAt', 'desc'),
      fsLimit(page * limitCount)
    );
    const snapshot = await getDocs(q);
    const start = (page - 1) * limitCount;
    const pagePosts = snapshot.docs.slice(start, start + limitCount).map(d => toPost(d.id, d.data()));

    return Promise.all(
      pagePosts.map(async post => ({
        ...post,
        isLiked: await this.isPostLiked(post.id, userId),
        isSaved: await this.isPostSaved(post.id, userId),
      }))
    );
  }

  /**
   * Get user posts
   */
  async getUserPosts(userId: string): Promise<Post[]> {
    const q = query(collection(db, 'posts'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => toPost(d.id, d.data()));
  }

  /**
   * Create post
   */
  async createPost(
    userId: string,
    type: PostType,
    images: string[],
    caption: string,
    hashtags: string[],
    privacy: PostPrivacy = 'public'
  ): Promise<Post> {
    const data = {
      userId,
      type,
      images,
      caption,
      hashtags,
      privacy,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'posts'), data);

    // Ensure the poster's profile exists and bump their post count
    await userProfileService.getUserProfile(userId);
    await updateDoc(doc(db, 'userProfiles', userId), { 'stats.posts': increment(1) }).catch(() => {});

    return toPost(docRef.id, data);
  }

  /**
   * Delete post
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    const ref = doc(db, 'posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().userId !== userId) return false;

    await deleteDoc(ref);

    const [likesSnap, commentsSnap] = await Promise.all([
      getDocs(query(collection(db, 'postLikes'), where('postId', '==', postId))),
      getDocs(query(collection(db, 'postComments'), where('postId', '==', postId))),
    ]);
    await Promise.all([
      ...likesSnap.docs.map(d => deleteDoc(d.ref)),
      ...commentsSnap.docs.map(d => deleteDoc(d.ref)),
    ]);

    return true;
  }

  /**
   * Like post
   */
  async likePost(postId: string, userId: string): Promise<boolean> {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return false;

    if (await this.isPostLiked(postId, userId)) return false;

    await addDoc(collection(db, 'postLikes'), { postId, userId, createdAt: Timestamp.now() });
    await updateDoc(postRef, { likes: increment(1) });

    return true;
  }

  /**
   * Unlike post
   */
  async unlikePost(postId: string, userId: string): Promise<boolean> {
    const q = query(collection(db, 'postLikes'), where('postId', '==', postId), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;

    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
    await updateDoc(doc(db, 'posts', postId), { likes: increment(-1) }).catch(() => {});

    return true;
  }

  /**
   * Check if post is liked by user
   */
  async isPostLiked(postId: string, userId: string): Promise<boolean> {
    const q = query(collection(db, 'postLikes'), where('postId', '==', postId), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  /**
   * Get post likes
   */
  async getPostLikes(postId: string): Promise<Like[]> {
    const q = query(collection(db, 'postLikes'), where('postId', '==', postId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toDateString((d.data() as any).createdAt) } as Like));
  }

  /**
   * Add comment
   */
  async addComment(postId: string, userId: string, text: string, parentCommentId?: string): Promise<Comment> {
    const data: any = { postId, userId, text, likes: 0, createdAt: Timestamp.now() };
    if (parentCommentId) data.parentCommentId = parentCommentId;

    const docRef = await addDoc(collection(db, 'postComments'), data);
    await updateDoc(doc(db, 'posts', postId), { comments: increment(1) }).catch(() => {});

    return toComment(docRef.id, data);
  }

  /**
   * Get post comments (top-level, with replies attached)
   */
  async getPostComments(postId: string): Promise<Comment[]> {
    const q = query(collection(db, 'postComments'), where('postId', '==', postId), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    const allComments = snapshot.docs.map(d => toComment(d.id, d.data()));

    const topLevel = allComments.filter(c => !c.parentCommentId);
    return topLevel.map(comment => ({
      ...comment,
      replies: allComments.filter(c => c.parentCommentId === comment.id),
    }));
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const ref = doc(db, 'postComments', commentId);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().userId !== userId) return false;

    const postId = snap.data().postId;
    await deleteDoc(ref);

    // Also delete any direct replies to this comment
    const repliesQ = query(collection(db, 'postComments'), where('parentCommentId', '==', commentId));
    const repliesSnap = await getDocs(repliesQ);
    await Promise.all(repliesSnap.docs.map(d => deleteDoc(d.ref)));

    await updateDoc(doc(db, 'posts', postId), { comments: increment(-1) }).catch(() => {});

    return true;
  }

  /**
   * Save post
   */
  async savePost(postId: string, userId: string, collectionId?: string): Promise<boolean> {
    if (await this.isPostSaved(postId, userId)) return false;

    const data: any = { userId, postId, createdAt: Timestamp.now() };
    if (collectionId) data.collectionId = collectionId;

    await addDoc(collection(db, 'savedPosts'), data);
    await updateDoc(doc(db, 'posts', postId), { saves: increment(1) }).catch(() => {});

    return true;
  }

  /**
   * Unsave post
   */
  async unsavePost(postId: string, userId: string): Promise<boolean> {
    const q = query(collection(db, 'savedPosts'), where('postId', '==', postId), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;

    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
    await updateDoc(doc(db, 'posts', postId), { saves: increment(-1) }).catch(() => {});

    return true;
  }

  /**
   * Record a share (bumps the post's share count)
   */
  async sharePost(postId: string): Promise<boolean> {
    const ref = doc(db, 'posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    await updateDoc(ref, { shares: increment(1) });
    return true;
  }

  /**
   * Check if post is saved by user
   */
  async isPostSaved(postId: string, userId: string): Promise<boolean> {
    const q = query(collection(db, 'savedPosts'), where('postId', '==', postId), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  /**
   * Get saved posts
   */
  async getSavedPosts(userId: string): Promise<Post[]> {
    const q = query(collection(db, 'savedPosts'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const posts = await Promise.all(
      snapshot.docs.map(async d => {
        const postSnap = await getDoc(doc(db, 'posts', (d.data() as any).postId));
        return postSnap.exists() ? toPost(postSnap.id, postSnap.data()) : null;
      })
    );
    return posts.filter((p): p is Post => Boolean(p));
  }

  /**
   * Create collection
   */
  async createCollection(
    userId: string,
    name: string,
    description?: string,
    isPrivate: boolean = false
  ): Promise<Collection> {
    const data: any = { userId, name, postCount: 0, isPrivate, createdAt: Timestamp.now() };
    if (description) data.description = description;

    const docRef = await addDoc(collection(db, 'postCollections'), data);
    return { id: docRef.id, ...data, createdAt: toDateString(data.createdAt) };
  }

  /**
   * Get user collections
   */
  async getUserCollections(userId: string): Promise<Collection[]> {
    const q = query(collection(db, 'postCollections'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toDateString((d.data() as any).createdAt) } as Collection));
  }

  /**
   * Search posts by hashtag
   */
  async searchByHashtag(hashtag: string): Promise<Post[]> {
    const q = query(
      collection(db, 'posts'),
      where('privacy', '==', 'public'),
      where('hashtags', 'array-contains', hashtag.toLowerCase()),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => toPost(d.id, d.data()));
  }

  /**
   * Get personalized feed - applies feed preferences and a relevance score
   */
  async getPersonalizedFeed(userId: string, page: number = 1, limitCount: number = 10): Promise<Post[]> {
    const [prefs, publicPostsSnap] = await Promise.all([
      this.getFeedPreferences(userId),
      getDocs(query(collection(db, 'posts'), where('privacy', '==', 'public'))),
    ]);

    let allPosts = publicPostsSnap.docs.map(d => toPost(d.id, d.data()));

    if (prefs.mutedUsers.length > 0) {
      allPosts = allPosts.filter(post => !prefs.mutedUsers.includes(post.userId));
    }
    if (prefs.mutedHashtags.length > 0) {
      allPosts = allPosts.filter(post => !post.hashtags.some(tag => prefs.mutedHashtags.includes(tag)));
    }
    if (prefs.contentTypes.length > 0) {
      allPosts = allPosts.filter(post => prefs.contentTypes.includes(post.type));
    }

    const scoredPosts = allPosts.map(post => ({
      post,
      score: this.calculateRelevanceScore(post, prefs),
    }));
    scoredPosts.sort((a, b) => b.score - a.score);

    const start = (page - 1) * limitCount;
    const pagePosts = scoredPosts.slice(start, start + limitCount).map(s => s.post);

    return Promise.all(
      pagePosts.map(async post => ({
        ...post,
        isLiked: await this.isPostLiked(post.id, userId),
        isSaved: await this.isPostSaved(post.id, userId),
      }))
    );
  }

  /**
   * Calculate relevance score for a post
   */
  private calculateRelevanceScore(post: Post, prefs?: FeedPreferences): number {
    let score = 0;

    const hoursSincePost = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 100 - hoursSincePost);

    score += post.likes * 0.5;
    score += post.comments * 1.0;
    score += post.saves * 1.5;
    score += post.shares * 2.0;

    if (prefs) {
      const matchedHashtags = post.hashtags.filter(tag => prefs.followedHashtags.includes(tag));
      score += matchedHashtags.length * 20;

      if (prefs.contentTypes.includes(post.type)) {
        score += 10;
      }
    }

    return score;
  }

  /**
   * Get feed preferences
   */
  async getFeedPreferences(userId: string): Promise<FeedPreferences> {
    const ref = doc(db, 'feedPreferences', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { userId, ...snap.data() } as FeedPreferences;
    }
    await setDoc(ref, DEFAULT_PREFERENCES);
    return { userId, ...DEFAULT_PREFERENCES };
  }

  /**
   * Update feed preferences
   */
  async updateFeedPreferences(prefs: FeedPreferences): Promise<void> {
    const { userId, ...rest } = prefs;
    await setDoc(doc(db, 'feedPreferences', userId), rest);
  }

  /**
   * Track user interaction (best-effort, non-blocking)
   */
  async trackInteraction(interaction: UserInteraction): Promise<void> {
    try {
      await addDoc(collection(db, 'userInteractions'), {
        ...interaction,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.log('Could not track interaction', error);
    }
  }

  /**
   * Get "Why you're seeing this" explanation
   */
  async getPostExplanation(postId: string, userId: string): Promise<string[]> {
    const postSnap = await getDoc(doc(db, 'posts', postId));
    if (!postSnap.exists()) return [];
    const post = toPost(postSnap.id, postSnap.data());

    const prefs = await this.getFeedPreferences(userId);
    const explanations: string[] = [];

    const matchedHashtags = post.hashtags.filter(tag => prefs.followedHashtags.includes(tag));
    if (matchedHashtags.length > 0) {
      explanations.push(`You follow #${matchedHashtags[0]}`);
    }

    if (prefs.contentTypes.includes(post.type)) {
      explanations.push(`You're interested in ${post.type} posts`);
    }

    if (post.likes > 100) {
      explanations.push('Popular in your network');
    }

    if (explanations.length === 0) {
      explanations.push('Recommended for you');
    }

    return explanations;
  }
}

export const socialFeedService = new SocialFeedService();

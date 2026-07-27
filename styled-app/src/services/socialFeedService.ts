/**
 * Social Feed Service
 * 
 * Manages social posts, likes, comments, and feed generation.
 */

import { UserProfile } from './userProfileService';

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

class SocialFeedService {
  private posts: Map<string, Post> = new Map();
  private likes: Map<string, Like[]> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private saves: Map<string, SavedPost[]> = new Map();
  private collections: Map<string, Collection[]> = new Map();
  private preferences: Map<string, FeedPreferences> = new Map();
  private interactions: Map<string, UserInteraction[]> = new Map();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Get feed for user
   */
  async getFeed(userId: string, page: number = 1, limit: number = 10): Promise<Post[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const allPosts = Array.from(this.posts.values())
      .filter(post => post.privacy === 'public')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const start = (page - 1) * limit;
    const end = start + limit;
    
    // Check if posts are liked/saved by current user
    const postsWithStatus = await Promise.all(
      allPosts.slice(start, end).map(async post => ({
        ...post,
        isLiked: await this.isPostLiked(post.id, userId),
        isSaved: await this.isPostSaved(post.id, userId),
      }))
    );
    
    return postsWithStatus;
  }

  /**
   * Get user posts
   */
  async getUserPosts(userId: string): Promise<Post[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return Array.from(this.posts.values())
      .filter(post => post.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const post: Post = {
      id: `post-${Date.now()}`,
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
      createdAt: new Date().toISOString(),
    };
    
    this.posts.set(post.id, post);
    return post;
  }

  /**
   * Delete post
   */
  async deletePost(postId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const post = this.posts.get(postId);
    if (!post || post.userId !== userId) {
      return false;
    }
    
    this.posts.delete(postId);
    this.likes.delete(postId);
    this.comments.delete(postId);
    
    return true;
  }

  /**
   * Like post
   */
  async likePost(postId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const post = this.posts.get(postId);
    if (!post) return false;
    
    const postLikes = this.likes.get(postId) || [];
    
    // Check if already liked
    if (postLikes.some(like => like.userId === userId)) {
      return false;
    }
    
    const like: Like = {
      id: `like-${Date.now()}`,
      postId,
      userId,
      createdAt: new Date().toISOString(),
    };
    
    postLikes.push(like);
    this.likes.set(postId, postLikes);
    
    post.likes++;
    this.posts.set(postId, post);
    
    return true;
  }

  /**
   * Unlike post
   */
  async unlikePost(postId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const post = this.posts.get(postId);
    if (!post) return false;
    
    const postLikes = this.likes.get(postId) || [];
    const filtered = postLikes.filter(like => like.userId !== userId);
    
    if (filtered.length === postLikes.length) {
      return false; // Wasn't liked
    }
    
    this.likes.set(postId, filtered);
    
    if (post.likes > 0) {
      post.likes--;
      this.posts.set(postId, post);
    }
    
    return true;
  }

  /**
   * Check if post is liked by user
   */
  async isPostLiked(postId: string, userId: string): Promise<boolean> {
    const postLikes = this.likes.get(postId) || [];
    return postLikes.some(like => like.userId === userId);
  }

  /**
   * Get post likes
   */
  async getPostLikes(postId: string): Promise<Like[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.likes.get(postId) || [];
  }

  /**
   * Add comment
   */
  async addComment(
    postId: string,
    userId: string,
    text: string,
    parentCommentId?: string
  ): Promise<Comment> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      postId,
      userId,
      text,
      likes: 0,
      parentCommentId,
      createdAt: new Date().toISOString(),
    };
    
    const postComments = this.comments.get(postId) || [];
    postComments.push(comment);
    this.comments.set(postId, postComments);
    
    const post = this.posts.get(postId);
    if (post) {
      post.comments++;
      this.posts.set(postId, post);
    }
    
    return comment;
  }

  /**
   * Get post comments
   */
  async getPostComments(postId: string): Promise<Comment[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const allComments = this.comments.get(postId) || [];
    
    // Organize comments with replies
    const topLevelComments = allComments.filter(c => !c.parentCommentId);
    
    return topLevelComments.map(comment => ({
      ...comment,
      replies: allComments.filter(c => c.parentCommentId === comment.id),
    }));
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    for (const [postId, comments] of this.comments.entries()) {
      const comment = comments.find(c => c.id === commentId);
      if (comment && comment.userId === userId) {
        const filtered = comments.filter(c => c.id !== commentId && c.parentCommentId !== commentId);
        this.comments.set(postId, filtered);
        
        const post = this.posts.get(postId);
        if (post && post.comments > 0) {
          post.comments--;
          this.posts.set(postId, post);
        }
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * Save post
   */
  async savePost(postId: string, userId: string, collectionId?: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const userSaves = this.saves.get(userId) || [];
    
    // Check if already saved
    if (userSaves.some(save => save.postId === postId)) {
      return false;
    }
    
    const save: SavedPost = {
      id: `save-${Date.now()}`,
      userId,
      postId,
      collectionId,
      createdAt: new Date().toISOString(),
    };
    
    userSaves.push(save);
    this.saves.set(userId, userSaves);
    
    const post = this.posts.get(postId);
    if (post) {
      post.saves++;
      this.posts.set(postId, post);
    }
    
    return true;
  }

  /**
   * Unsave post
   */
  async unsavePost(postId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const userSaves = this.saves.get(userId) || [];
    const filtered = userSaves.filter(save => save.postId !== postId);
    
    if (filtered.length === userSaves.length) {
      return false;
    }
    
    this.saves.set(userId, filtered);
    
    const post = this.posts.get(postId);
    if (post && post.saves > 0) {
      post.saves--;
      this.posts.set(postId, post);
    }
    
    return true;
  }

  /**
   * Check if post is saved by user
   */
  async isPostSaved(postId: string, userId: string): Promise<boolean> {
    const userSaves = this.saves.get(userId) || [];
    return userSaves.some(save => save.postId === postId);
  }

  /**
   * Get saved posts
   */
  async getSavedPosts(userId: string): Promise<Post[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const userSaves = this.saves.get(userId) || [];
    const savedPosts: Post[] = [];
    
    for (const save of userSaves) {
      const post = this.posts.get(save.postId);
      if (post) {
        savedPosts.push(post);
      }
    }
    
    return savedPosts;
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
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const collection: Collection = {
      id: `collection-${Date.now()}`,
      userId,
      name,
      description,
      postCount: 0,
      isPrivate,
      createdAt: new Date().toISOString(),
    };
    
    const userCollections = this.collections.get(userId) || [];
    userCollections.push(collection);
    this.collections.set(userId, userCollections);
    
    return collection;
  }

  /**
   * Get user collections
   */
  async getUserCollections(userId: string): Promise<Collection[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.collections.get(userId) || [];
  }

  /**
   * Search posts by hashtag
   */
  async searchByHashtag(hashtag: string): Promise<Post[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return Array.from(this.posts.values())
      .filter(post => 
        post.hashtags.some(tag => tag.toLowerCase() === hashtag.toLowerCase()) &&
        post.privacy === 'public'
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Initialize mock data
   */
  private initializeMockData() {
    const mockPosts: Post[] = [
      {
        id: 'post-1',
        userId: 'user-1',
        type: 'transformation',
        images: [
          'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600',
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
        ],
        caption: 'Amazing transformation after my closet audit! 😍 Feeling so much more confident in my style now. #transformation #stylejourney',
        hashtags: ['transformation', 'stylejourney', 'closetaudit'],
        privacy: 'public',
        likes: 234,
        comments: 18,
        shares: 12,
        saves: 45,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'post-2',
        userId: 'user-2',
        type: 'outfit',
        images: ['https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600'],
        caption: 'Today\'s outfit for the office 💼 Keeping it professional yet stylish! #ootd #workwear',
        hashtags: ['ootd', 'workwear', 'professional'],
        privacy: 'public',
        likes: 156,
        comments: 12,
        shares: 8,
        saves: 32,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'post-3',
        userId: 'user-3',
        type: 'closet',
        images: ['https://images.unsplash.com/photo-1558769132-cb1aea1c8e5d?w=600'],
        caption: 'Finally organized my closet! ✨ Minimalist approach is the way to go. #organization #minimalist',
        hashtags: ['organization', 'minimalist', 'closetgoals'],
        privacy: 'public',
        likes: 189,
        comments: 15,
        shares: 10,
        saves: 67,
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      },
    ];
    
    mockPosts.forEach(post => this.posts.set(post.id, post));

    // Initialize default preferences
    this.preferences.set('current-user', {
      userId: 'current-user',
      favoriteStyles: ['minimalist', 'casual'],
      favoriteColors: ['black', 'white', 'gray'],
      followedHashtags: ['minimalist', 'ootd'],
      mutedUsers: [],
      mutedHashtags: [],
      showTrending: true,
      showFollowingOnly: false,
      contentTypes: ['transformation', 'outfit', 'closet', 'tip', 'product'],
    });
  }

  /**
   * Get personalized feed
   */
  async getPersonalizedFeed(userId: string, page: number = 1, limit: number = 10): Promise<Post[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const prefs = this.preferences.get(userId);
    const userInteractions = this.interactions.get(userId) || [];
    
    let allPosts = Array.from(this.posts.values())
      .filter(post => post.privacy === 'public');

    // Filter by preferences
    if (prefs) {
      // Filter out muted users
      if (prefs.mutedUsers.length > 0) {
        allPosts = allPosts.filter(post => !prefs.mutedUsers.includes(post.userId));
      }

      // Filter out muted hashtags
      if (prefs.mutedHashtags.length > 0) {
        allPosts = allPosts.filter(post => 
          !post.hashtags.some(tag => prefs.mutedHashtags.includes(tag))
        );
      }

      // Filter by content types
      if (prefs.contentTypes.length > 0) {
        allPosts = allPosts.filter(post => prefs.contentTypes.includes(post.type));
      }
    }

    // Calculate relevance scores
    const scoredPosts = allPosts.map(post => ({
      post,
      score: this.calculateRelevanceScore(post, userId, prefs, userInteractions),
    }));

    // Sort by relevance score
    scoredPosts.sort((a, b) => b.score - a.score);

    const start = (page - 1) * limit;
    const end = start + limit;
    
    // Check if posts are liked/saved by current user
    const postsWithStatus = await Promise.all(
      scoredPosts.slice(start, end).map(async ({ post }) => ({
        ...post,
        isLiked: await this.isPostLiked(post.id, userId),
        isSaved: await this.isPostSaved(post.id, userId),
      }))
    );
    
    return postsWithStatus;
  }

  /**
   * Calculate relevance score for a post
   */
  private calculateRelevanceScore(
    post: Post,
    userId: string,
    prefs?: FeedPreferences,
    interactions: UserInteraction[] = []
  ): number {
    let score = 0;

    // Recency score (newer posts get higher scores)
    const hoursSincePost = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 100 - hoursSincePost);

    // Engagement score
    score += post.likes * 0.5;
    score += post.comments * 1.0;
    score += post.saves * 1.5;
    score += post.shares * 2.0;

    if (prefs) {
      // Hashtag match score
      const matchedHashtags = post.hashtags.filter(tag => 
        prefs.followedHashtags.includes(tag)
      );
      score += matchedHashtags.length * 20;

      // Content type preference
      if (prefs.contentTypes.includes(post.type)) {
        score += 10;
      }
    }

    // User interaction history
    const hasInteracted = interactions.some(i => i.postId === post.id);
    if (hasInteracted) {
      score += 15;
    }

    return score;
  }

  /**
   * Get feed preferences
   */
  async getFeedPreferences(userId: string): Promise<FeedPreferences> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.preferences.get(userId) || {
      userId,
      favoriteStyles: [],
      favoriteColors: [],
      followedHashtags: [],
      mutedUsers: [],
      mutedHashtags: [],
      showTrending: true,
      showFollowingOnly: false,
      contentTypes: ['transformation', 'outfit', 'closet', 'tip', 'product'],
    };
  }

  /**
   * Update feed preferences
   */
  async updateFeedPreferences(prefs: FeedPreferences): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    this.preferences.set(prefs.userId, prefs);
  }

  /**
   * Track user interaction
   */
  async trackInteraction(interaction: UserInteraction): Promise<void> {
    const userInteractions = this.interactions.get(interaction.userId) || [];
    userInteractions.push(interaction);
    
    // Keep only last 100 interactions
    if (userInteractions.length > 100) {
      userInteractions.shift();
    }
    
    this.interactions.set(interaction.userId, userInteractions);
  }

  /**
   * Get "Why you're seeing this" explanation
   */
  async getPostExplanation(postId: string, userId: string): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const post = this.posts.get(postId);
    if (!post) return [];

    const prefs = this.preferences.get(userId);
    const explanations: string[] = [];

    if (prefs) {
      // Check hashtag matches
      const matchedHashtags = post.hashtags.filter(tag => 
        prefs.followedHashtags.includes(tag)
      );
      if (matchedHashtags.length > 0) {
        explanations.push(`You follow #${matchedHashtags[0]}`);
      }

      // Check content type
      if (prefs.contentTypes.includes(post.type)) {
        explanations.push(`You're interested in ${post.type} posts`);
      }
    }

    // Check engagement
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

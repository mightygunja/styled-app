/**
 * User Profile Service
 * 
 * Manages user profiles, following system, and social connections.
 */

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  bio?: string;
  profileImageUrl?: string;
  location?: string;
  styleTags: string[];
  isPrivate: boolean;
  stats: {
    followers: number;
    following: number;
    posts: number;
    looks: number;
  };
  createdAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface FollowSuggestion {
  user: UserProfile;
  reason: string;
  mutualFollowers: number;
}

class UserProfileService {
  private profiles: Map<string, UserProfile> = new Map();
  private follows: Map<string, Follow[]> = new Map();

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let profile = this.profiles.get(userId);
    
    if (!profile) {
      // Create mock profile
      profile = this.createMockProfile(userId);
      this.profiles.set(userId, profile);
    }
    
    return profile;
  }

  /**
   * Get current user profile
   */
  async getCurrentUserProfile(): Promise<UserProfile> {
    const profile = await this.getUserProfile('current-user');
    
    if (!profile) {
      // Create default profile for current user
      const newProfile: UserProfile = {
        id: 'profile-current',
        userId: 'current-user',
        displayName: 'You',
        username: 'fashionista',
        bio: 'Fashion enthusiast 👗✨',
        profileImageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
        location: 'New York, NY',
        styleTags: ['minimalist', 'modern', 'chic'],
        isPrivate: false,
        stats: {
          followers: 234,
          following: 189,
          posts: 42,
          looks: 156,
        },
        createdAt: new Date().toISOString(),
      };
      this.profiles.set('current-user', newProfile);
      return newProfile;
    }
    
    return profile;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<Omit<UserProfile, 'id' | 'userId' | 'stats' | 'createdAt'>>
  ): Promise<UserProfile> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const profile = await this.getUserProfile(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    const updatedProfile = {
      ...profile,
      ...updates,
    };
    
    this.profiles.set(userId, updatedProfile);
    return updatedProfile;
  }

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const follow: Follow = {
      id: `follow-${Date.now()}`,
      followerId,
      followingId,
      createdAt: new Date().toISOString(),
    };
    
    const userFollows = this.follows.get(followerId) || [];
    userFollows.push(follow);
    this.follows.set(followerId, userFollows);
    
    // Update stats
    const followerProfile = await this.getUserProfile(followerId);
    const followingProfile = await this.getUserProfile(followingId);
    
    if (followerProfile) {
      followerProfile.stats.following++;
      this.profiles.set(followerId, followerProfile);
    }
    
    if (followingProfile) {
      followingProfile.stats.followers++;
      this.profiles.set(followingId, followingProfile);
    }
    
    return true;
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const userFollows = this.follows.get(followerId) || [];
    const filtered = userFollows.filter(f => f.followingId !== followingId);
    this.follows.set(followerId, filtered);
    
    // Update stats
    const followerProfile = await this.getUserProfile(followerId);
    const followingProfile = await this.getUserProfile(followingId);
    
    if (followerProfile && followerProfile.stats.following > 0) {
      followerProfile.stats.following--;
      this.profiles.set(followerId, followerProfile);
    }
    
    if (followingProfile && followingProfile.stats.followers > 0) {
      followingProfile.stats.followers--;
      this.profiles.set(followingId, followingProfile);
    }
    
    return true;
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const userFollows = this.follows.get(followerId) || [];
    return userFollows.some(f => f.followingId === followingId);
  }

  /**
   * Get followers
   */
  async getFollowers(userId: string): Promise<UserProfile[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const followers: UserProfile[] = [];
    
    for (const [followerId, follows] of this.follows.entries()) {
      if (follows.some(f => f.followingId === userId)) {
        const profile = await this.getUserProfile(followerId);
        if (profile) {
          followers.push(profile);
        }
      }
    }
    
    return followers;
  }

  /**
   * Get following
   */
  async getFollowing(userId: string): Promise<UserProfile[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const userFollows = this.follows.get(userId) || [];
    const following: UserProfile[] = [];
    
    for (const follow of userFollows) {
      const profile = await this.getUserProfile(follow.followingId);
      if (profile) {
        following.push(profile);
      }
    }
    
    return following;
  }

  /**
   * Get follow suggestions
   */
  async getFollowSuggestions(userId: string, limit: number = 10): Promise<FollowSuggestion[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Generate mock suggestions
    const suggestions: FollowSuggestion[] = [
      {
        user: {
          id: 'profile-1',
          userId: 'user-1',
          displayName: 'Emma Style',
          username: 'emmastyle',
          bio: 'Minimalist fashion lover 🤍',
          profileImageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
          styleTags: ['minimalist', 'modern'],
          isPrivate: false,
          stats: { followers: 1234, following: 456, posts: 89, looks: 234 },
          createdAt: new Date().toISOString(),
        },
        reason: 'Similar style interests',
        mutualFollowers: 12,
      },
      {
        user: {
          id: 'profile-2',
          userId: 'user-2',
          displayName: 'Fashion Forward',
          username: 'fashionforward',
          bio: 'Trendsetter | Style blogger ✨',
          profileImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
          styleTags: ['trendy', 'bold'],
          isPrivate: false,
          stats: { followers: 5678, following: 234, posts: 156, looks: 445 },
          createdAt: new Date().toISOString(),
        },
        reason: 'Popular in your area',
        mutualFollowers: 8,
      },
      {
        user: {
          id: 'profile-3',
          userId: 'user-3',
          displayName: 'Vintage Vibes',
          username: 'vintagevibes',
          bio: 'Vintage fashion enthusiast 🕰️',
          profileImageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
          styleTags: ['vintage', 'retro'],
          isPrivate: false,
          stats: { followers: 890, following: 345, posts: 67, looks: 178 },
          createdAt: new Date().toISOString(),
        },
        reason: 'Followed by people you follow',
        mutualFollowers: 5,
      },
    ];
    
    return suggestions.slice(0, limit);
  }

  /**
   * Search users
   */
  async searchUsers(query: string): Promise<UserProfile[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const allProfiles = Array.from(this.profiles.values());
    const lowerQuery = query.toLowerCase();
    
    return allProfiles.filter(profile => 
      profile.displayName.toLowerCase().includes(lowerQuery) ||
      profile.username.toLowerCase().includes(lowerQuery) ||
      profile.bio?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get mutual followers
   */
  async getMutualFollowers(userId1: string, userId2: string): Promise<UserProfile[]> {
    const [followers1, followers2] = await Promise.all([
      this.getFollowers(userId1),
      this.getFollowers(userId2),
    ]);
    
    const followerIds2 = new Set(followers2.map(f => f.userId));
    return followers1.filter(f => followerIds2.has(f.userId));
  }

  /**
   * Create mock profile
   */
  private createMockProfile(userId: string): UserProfile {
    const names = ['Alex Johnson', 'Sam Wilson', 'Jordan Lee', 'Taylor Brown'];
    const usernames = ['alexj', 'samw', 'jordanl', 'taylorbrown'];
    const bios = [
      'Fashion enthusiast 👗',
      'Style blogger ✨',
      'Minimalist wardrobe 🤍',
      'Vintage lover 🕰️',
    ];
    
    const index = parseInt(userId.slice(-1)) % names.length;
    
    return {
      id: `profile-${userId}`,
      userId,
      displayName: names[index] || 'User',
      username: usernames[index] || `user${userId}`,
      bio: bios[index],
      profileImageUrl: `https://images.unsplash.com/photo-${1494790108377 + index}?w=200`,
      location: 'New York, NY',
      styleTags: ['modern', 'chic'],
      isPrivate: false,
      stats: {
        followers: Math.floor(Math.random() * 1000),
        following: Math.floor(Math.random() * 500),
        posts: Math.floor(Math.random() * 100),
        looks: Math.floor(Math.random() * 200),
      },
      createdAt: new Date().toISOString(),
    };
  }
}

export const userProfileService = new UserProfileService();

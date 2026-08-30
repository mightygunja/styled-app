/**
 * User Profile Service
 *
 * Manages user profiles, following system, and social connections.
 * Backed by Firestore (`userProfiles` + `follows` collections).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
// Cycle-safe: notificationService imports only the UserProfile TYPE from
// this module, which TypeScript erases at emit.
import { notificationService } from './notificationService';

export interface RealUserInfo {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

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
  private buildDefaultProfile(userId: string, realUserInfo?: RealUserInfo): Omit<UserProfile, 'id'> {
    // A real signed-in user creating their own profile for the first time: seed it
    // from their actual Firebase Auth identity, not a random demo persona.
    if (realUserInfo) {
      const displayName = realUserInfo.displayName || realUserInfo.email?.split('@')[0] || 'New User';
      return {
        userId,
        displayName,
        username: (realUserInfo.email?.split('@')[0] || displayName).toLowerCase().replace(/[^a-z0-9]/g, ''),
        bio: '',
        // Omitted entirely when absent rather than set to undefined. Email
        // signups have no photoURL, and writing undefined rejects the whole
        // document - which meant those users got no profile at all.
        ...(realUserInfo.photoURL ? { profileImageUrl: realUserInfo.photoURL } : {}),
        styleTags: [],
        isPrivate: false,
        stats: { followers: 0, following: 0, posts: 0, looks: 0 },
        createdAt: new Date().toISOString(),
      };
    }

    // Another user's id with no profile doc yet. Honest placeholder, never a
    // persona: no invented name, bio, city or stock face. The old version
    // assigned real users fake identities ("Alex Johnson from New York")
    // and even persisted them - fabricated people in a real community.
    return {
      userId,
      displayName: '33 Trends member',
      username: `member-${userId.slice(0, 6).toLowerCase()}`,
      bio: '',
      styleTags: [],
      isPrivate: false,
      stats: { followers: 0, following: 0, posts: 0, looks: 0 },
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get user profile, auto-creating (and persisting) a default one if it doesn't exist yet.
   * Pass realUserInfo (from Firebase Auth) when this might be the signed-in user's own
   * profile being created for the first time, so it's seeded with their real identity.
   */
  async getUserProfile(userId: string, realUserInfo?: RealUserInfo): Promise<UserProfile | null> {
    const ref = doc(db, 'userProfiles', userId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as UserProfile;
    }

    const newProfile = this.buildDefaultProfile(userId, realUserInfo);
    // Persist only when this is the signed-in user's own first-time profile
    // (realUserInfo present). Writing the placeholder for OTHER users would
    // stamp their public profile with data they never chose.
    if (realUserInfo) {
      await setDoc(ref, newProfile);
    }
    return { id: userId, ...newProfile };
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: Partial<Omit<UserProfile, 'id' | 'userId' | 'stats' | 'createdAt'>>
  ): Promise<UserProfile> {
    await this.getUserProfile(userId); // ensure doc exists
    const ref = doc(db, 'userProfiles', userId);
    await updateDoc(ref, updates as any);
    const updated = await this.getUserProfile(userId);
    return updated as UserProfile;
  }

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<boolean> {
    const alreadyFollowing = await this.isFollowing(followerId, followingId);
    if (alreadyFollowing) return true;

    // Ensure both profiles exist before incrementing their stats
    await Promise.all([this.getUserProfile(followerId), this.getUserProfile(followingId)]);

    await addDoc(collection(db, 'follows'), {
      followerId,
      followingId,
      createdAt: Timestamp.now(),
    });

    // Stat bumps are best-effort: the other user's profile doc may not exist
    // yet (placeholders are no longer persisted on their behalf), and rules
    // only let an owner write their own profile.
    await Promise.all([
      updateDoc(doc(db, 'userProfiles', followerId), { 'stats.following': increment(1) }).catch(() => {}),
      updateDoc(doc(db, 'userProfiles', followingId), { 'stats.followers': increment(1) }).catch(() => {}),
    ]);

    // The moment that makes Notifications real: tell the person they gained
    // a follower. Fire-and-forget - a follow must never fail on this.
    (async () => {
      try {
        const follower = await this.getUserProfile(followerId);
        await notificationService.createNotification({
          userId: followingId,
          type: 'follow',
          actorId: followerId,
          title: 'New follower',
          message: `${follower?.displayName || 'A member'} started following you`,
          isRead: false,
        });
      } catch (error) {
        console.log('Could not create follow notification', error);
      }
    })();

    return true;
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', followerId),
      where('followingId', '==', followingId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return true;

    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));

    await Promise.all([
      updateDoc(doc(db, 'userProfiles', followerId), { 'stats.following': increment(-1) }).catch(() => {}),
      updateDoc(doc(db, 'userProfiles', followingId), { 'stats.followers': increment(-1) }).catch(() => {}),
    ]);

    return true;
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', followerId),
      where('followingId', '==', followingId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  /**
   * Get followers
   */
  async getFollowers(userId: string): Promise<UserProfile[]> {
    const q = query(collection(db, 'follows'), where('followingId', '==', userId));
    const snapshot = await getDocs(q);
    const profiles = await Promise.all(
      snapshot.docs.map(d => this.getUserProfile((d.data() as any).followerId))
    );
    return profiles.filter((p): p is UserProfile => Boolean(p));
  }

  /**
   * Get following
   */
  async getFollowing(userId: string): Promise<UserProfile[]> {
    const q = query(collection(db, 'follows'), where('followerId', '==', userId));
    const snapshot = await getDocs(q);
    const profiles = await Promise.all(
      snapshot.docs.map(d => this.getUserProfile((d.data() as any).followingId))
    );
    return profiles.filter((p): p is UserProfile => Boolean(p));
  }

  /**
   * Get follow suggestions - other real profiles in the app, ranked by follower count,
   * excluding the user themself and anyone already followed
   */
  async getFollowSuggestions(userId: string, limitCount: number = 10): Promise<FollowSuggestion[]> {
    const [allProfilesSnap, following] = await Promise.all([
      getDocs(query(collection(db, 'userProfiles'), orderBy('stats.followers', 'desc'), fsLimit(50))),
      this.getFollowing(userId),
    ]);
    const followingIds = new Set(following.map(f => f.userId));

    const suggestions: FollowSuggestion[] = allProfilesSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as UserProfile))
      .filter(p => p.userId !== userId && !followingIds.has(p.userId))
      .slice(0, limitCount)
      .map(user => ({
        user,
        reason: user.stats.followers > 100 ? 'Popular in the community' : 'New to 33 Trends',
        mutualFollowers: 0,
      }));

    return suggestions;
  }

  /**
   * Search users by name/username/bio
   */
  async searchUsers(searchQuery: string): Promise<UserProfile[]> {
    const snapshot = await getDocs(collection(db, 'userProfiles'));
    const lowerQuery = searchQuery.toLowerCase();

    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as UserProfile))
      .filter(
        profile =>
          // Optional chaining throughout: a profile document written before a
          // field existed would otherwise take down the whole search.
          profile.displayName?.toLowerCase().includes(lowerQuery) ||
          profile.username?.toLowerCase().includes(lowerQuery) ||
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
}

export const userProfileService = new UserProfileService();

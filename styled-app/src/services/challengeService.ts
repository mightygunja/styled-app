/**
 * Challenge Service
 * 
 * Manages style challenges and contests.
 */

import { UserProfile } from './userProfileService';

export type ChallengeStatus = 'upcoming' | 'active' | 'completed';
export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'special';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  status: ChallengeStatus;
  imageUrl?: string;
  prize?: string;
  startDate: string;
  endDate: string;
  participants: number;
  entries: number;
  rules: string[];
  hashtags: string[];
  createdBy: string;
  createdAt: string;
}

export interface ChallengeEntry {
  id: string;
  challengeId: string;
  userId: string;
  user?: UserProfile;
  postId: string;
  imageUrl: string;
  caption: string;
  votes: number;
  hasVoted?: boolean;
  createdAt: string;
}

export interface ChallengeParticipation {
  challengeId: string;
  userId: string;
  hasEntered: boolean;
  entryId?: string;
  joinedAt: string;
}

class ChallengeService {
  private challenges: Map<string, Challenge> = new Map();
  private entries: Map<string, ChallengeEntry[]> = new Map();
  private participations: Map<string, ChallengeParticipation[]> = new Map();
  private votes: Map<string, string[]> = new Map(); // entryId -> userId[]

  constructor() {
    this.initializeMockData();
  }

  /**
   * Get all challenges
   */
  async getChallenges(status?: ChallengeStatus): Promise<Challenge[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let challenges = Array.from(this.challenges.values());
    
    if (status) {
      challenges = challenges.filter(c => c.status === status);
    }
    
    return challenges.sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }

  /**
   * Get challenge by ID
   */
  async getChallenge(challengeId: string): Promise<Challenge | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.challenges.get(challengeId) || null;
  }

  /**
   * Join a challenge
   */
  async joinChallenge(challengeId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return false;
    
    const userParticipations = this.participations.get(userId) || [];
    const existing = userParticipations.find(p => p.challengeId === challengeId);
    
    if (existing) return false;
    
    const participation: ChallengeParticipation = {
      challengeId,
      userId,
      hasEntered: false,
      joinedAt: new Date().toISOString(),
    };
    
    userParticipations.push(participation);
    this.participations.set(userId, userParticipations);
    
    challenge.participants += 1;
    this.challenges.set(challengeId, challenge);
    
    return true;
  }

  /**
   * Submit entry to challenge
   */
  async submitEntry(
    challengeId: string,
    userId: string,
    postId: string,
    imageUrl: string,
    caption: string
  ): Promise<ChallengeEntry> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const entry: ChallengeEntry = {
      id: `entry-${Date.now()}`,
      challengeId,
      userId,
      postId,
      imageUrl,
      caption,
      votes: 0,
      createdAt: new Date().toISOString(),
    };
    
    const challengeEntries = this.entries.get(challengeId) || [];
    challengeEntries.push(entry);
    this.entries.set(challengeId, challengeEntries);
    
    // Update participation
    const userParticipations = this.participations.get(userId) || [];
    const participation = userParticipations.find(p => p.challengeId === challengeId);
    if (participation) {
      participation.hasEntered = true;
      participation.entryId = entry.id;
      this.participations.set(userId, userParticipations);
    }
    
    // Update challenge
    const challenge = this.challenges.get(challengeId);
    if (challenge) {
      challenge.entries += 1;
      this.challenges.set(challengeId, challenge);
    }
    
    return entry;
  }

  /**
   * Get entries for a challenge
   */
  async getChallengeEntries(challengeId: string, userId?: string): Promise<ChallengeEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const entries = this.entries.get(challengeId) || [];
    
    // Add vote status if userId provided
    if (userId) {
      return entries.map(entry => ({
        ...entry,
        hasVoted: this.votes.get(entry.id)?.includes(userId) || false,
      }));
    }
    
    return entries.sort((a, b) => b.votes - a.votes);
  }

  /**
   * Vote for an entry
   */
  async voteForEntry(entryId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const voters = this.votes.get(entryId) || [];
    
    if (voters.includes(userId)) {
      return false; // Already voted
    }
    
    voters.push(userId);
    this.votes.set(entryId, voters);
    
    // Update entry vote count
    for (const [challengeId, entries] of this.entries.entries()) {
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        entry.votes += 1;
        this.entries.set(challengeId, entries);
        break;
      }
    }
    
    return true;
  }

  /**
   * Unvote for an entry
   */
  async unvoteForEntry(entryId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const voters = this.votes.get(entryId) || [];
    const index = voters.indexOf(userId);
    
    if (index === -1) {
      return false; // Not voted
    }
    
    voters.splice(index, 1);
    this.votes.set(entryId, voters);
    
    // Update entry vote count
    for (const [challengeId, entries] of this.entries.entries()) {
      const entry = entries.find(e => e.id === entryId);
      if (entry) {
        entry.votes = Math.max(0, entry.votes - 1);
        this.entries.set(challengeId, entries);
        break;
      }
    }
    
    return true;
  }

  /**
   * Check if user has joined challenge
   */
  async hasJoinedChallenge(challengeId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const userParticipations = this.participations.get(userId) || [];
    return userParticipations.some(p => p.challengeId === challengeId);
  }

  /**
   * Get user's participations
   */
  async getUserParticipations(userId: string): Promise<ChallengeParticipation[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.participations.get(userId) || [];
  }

  /**
   * Initialize mock data
   */
  private initializeMockData() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Active challenges
    const challenge1: Challenge = {
      id: 'challenge-1',
      title: 'Minimalist Monday',
      description: 'Show us your best minimalist outfit! Less is more.',
      type: 'daily',
      status: 'active',
      imageUrl: 'https://picsum.photos/seed/challenge1/400',
      prize: '$100 Gift Card',
      startDate: now.toISOString(),
      endDate: tomorrow.toISOString(),
      participants: 234,
      entries: 89,
      rules: [
        'Must use #MinimalistMonday',
        'Outfit must feature neutral colors',
        'Maximum 3 pieces',
        'One entry per person',
      ],
      hashtags: ['MinimalistMonday', 'LessIsMore', 'NeutralStyle'],
      createdBy: 'admin',
      createdAt: lastWeek.toISOString(),
    };

    const challenge2: Challenge = {
      id: 'challenge-2',
      title: 'Sustainable Style Week',
      description: 'Create outfits using only sustainable and eco-friendly pieces.',
      type: 'weekly',
      status: 'active',
      imageUrl: 'https://picsum.photos/seed/challenge2/400',
      prize: '$250 Sustainable Brand Voucher',
      startDate: lastWeek.toISOString(),
      endDate: nextWeek.toISOString(),
      participants: 567,
      entries: 234,
      rules: [
        'All pieces must be sustainable',
        'Include brand information',
        'Use #SustainableStyleWeek',
        'Share your sustainability story',
      ],
      hashtags: ['SustainableStyleWeek', 'EcoFashion', 'GreenStyle'],
      createdBy: 'admin',
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const challenge3: Challenge = {
      id: 'challenge-3',
      title: 'Vintage Vibes',
      description: 'Style a modern outfit with at least one vintage piece.',
      type: 'weekly',
      status: 'active',
      imageUrl: 'https://picsum.photos/seed/challenge3/400',
      prize: 'Featured on Homepage',
      startDate: lastWeek.toISOString(),
      endDate: nextWeek.toISOString(),
      participants: 432,
      entries: 178,
      rules: [
        'At least one vintage piece (20+ years old)',
        'Mix vintage with modern',
        'Use #VintageVibes',
        'Tell the story of your vintage piece',
      ],
      hashtags: ['VintageVibes', 'ModernVintage', 'RetroStyle'],
      createdBy: 'admin',
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Upcoming challenge
    const challenge4: Challenge = {
      id: 'challenge-4',
      title: 'Holiday Glam',
      description: 'Show us your best holiday party outfit!',
      type: 'special',
      status: 'upcoming',
      imageUrl: 'https://picsum.photos/seed/challenge4/400',
      prize: '$500 Shopping Spree',
      startDate: nextWeek.toISOString(),
      endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      participants: 0,
      entries: 0,
      rules: [
        'Holiday-themed outfit',
        'Must be party-appropriate',
        'Use #HolidayGlam',
        'Include accessories',
      ],
      hashtags: ['HolidayGlam', 'PartyStyle', 'FestiveFashion'],
      createdBy: 'admin',
      createdAt: now.toISOString(),
    };

    this.challenges.set(challenge1.id, challenge1);
    this.challenges.set(challenge2.id, challenge2);
    this.challenges.set(challenge3.id, challenge3);
    this.challenges.set(challenge4.id, challenge4);

    // Mock entries for challenge 1
    const entries1: ChallengeEntry[] = [
      {
        id: 'entry-1',
        challengeId: 'challenge-1',
        userId: 'user-1',
        postId: 'post-1',
        imageUrl: 'https://picsum.photos/seed/entry1/400',
        caption: 'Simple white tee, black jeans, and sneakers. #MinimalistMonday',
        votes: 45,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'entry-2',
        challengeId: 'challenge-1',
        userId: 'user-2',
        postId: 'post-2',
        imageUrl: 'https://picsum.photos/seed/entry2/400',
        caption: 'Beige turtleneck and cream trousers. Less is more! #MinimalistMonday',
        votes: 38,
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'entry-3',
        challengeId: 'challenge-1',
        userId: 'user-3',
        postId: 'post-3',
        imageUrl: 'https://picsum.photos/seed/entry3/400',
        caption: 'All black everything. Classic minimalism. #MinimalistMonday',
        votes: 52,
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      },
    ];

    this.entries.set('challenge-1', entries1);
  }
}

export const challengeService = new ChallengeService();

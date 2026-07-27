/**
 * Exclusive Content Service
 * 
 * Manages premium-only content including exclusive looks, early access,
 * trend reports, and members-only collections.
 */

import { SubscriptionTier } from './subscriptionService';

export type ContentType = 'look' | 'trend-report' | 'collection' | 'tutorial' | 'event';
export type AccessLevel = 'free' | 'premium' | 'pro';

export interface ExclusiveContent {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl?: string;
  accessLevel: AccessLevel;
  featured: boolean;
  isNew: boolean;
  publishedAt: string;
  views: number;
  likes: number;
  tags: string[];
  author?: {
    name: string;
    title: string;
    imageUrl: string;
  };
}

export interface ExclusiveLook extends ExclusiveContent {
  type: 'look';
  items: {
    id: string;
    name: string;
    brand: string;
    price: number;
    imageUrl: string;
    affiliateLink: string;
  }[];
  occasion: string;
  season: string;
  styleNotes: string;
}

export interface TrendReport extends ExclusiveContent {
  type: 'trend-report';
  season: string;
  year: number;
  keyTrends: {
    name: string;
    description: string;
    confidence: number;
    imageUrl: string;
  }[];
  colorPalette: {
    name: string;
    hex: string;
    pantone: string;
  }[];
  insights: string[];
  downloadUrl?: string;
}

export interface ExclusiveCollection extends ExclusiveContent {
  type: 'collection';
  lookCount: number;
  curator: string;
  theme: string;
  looks: ExclusiveLook[];
}

export interface Tutorial extends ExclusiveContent {
  type: 'tutorial';
  duration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: {
    title: string;
    description: string;
    imageUrl?: string;
  }[];
  videoUrl?: string;
}

export interface ExclusiveEvent extends ExclusiveContent {
  type: 'event';
  eventDate: string;
  location: string;
  isVirtual: boolean;
  capacity: number;
  registered: number;
  speakers: {
    name: string;
    title: string;
    imageUrl: string;
  }[];
  agenda: {
    time: string;
    title: string;
    description: string;
  }[];
}

export interface ContentStats {
  totalContent: number;
  byType: Record<ContentType, number>;
  byAccessLevel: Record<AccessLevel, number>;
  recentlyAdded: number;
  trending: number;
}

export interface UserContentAccess {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: AccessLevel;
}

class ExclusiveContentService {
  /**
   * Get exclusive content feed
   */
  async getExclusiveContent(
    userTier: SubscriptionTier,
    filters?: {
      type?: ContentType;
      accessLevel?: AccessLevel;
      featured?: boolean;
    }
  ): Promise<ExclusiveContent[]> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const allContent: ExclusiveContent[] = [
      // Exclusive Looks
      {
        id: 'look-1',
        type: 'look',
        title: 'Spring 2026 Power Suit',
        description: 'Exclusive early access to next season\'s must-have power suit ensemble',
        imageUrl: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf',
        accessLevel: 'premium',
        featured: true,
        isNew: true,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        views: 1250,
        likes: 340,
        tags: ['Power Dressing', 'Spring 2026', 'Professional', 'Trending'],
        author: {
          name: 'Isabella Martinez',
          title: 'Celebrity Fashion Consultant',
          imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        },
      },
      {
        id: 'look-2',
        type: 'look',
        title: 'Sustainable Capsule Wardrobe',
        description: 'Pro-exclusive: Complete eco-friendly wardrobe with investment pieces',
        imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d',
        accessLevel: 'pro',
        featured: true,
        isNew: true,
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        views: 890,
        likes: 267,
        tags: ['Sustainable', 'Capsule Wardrobe', 'Eco-Friendly', 'Pro Only'],
        author: {
          name: 'Sophia Chen',
          title: 'Sustainable Fashion Expert',
          imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
        },
      },
      // Trend Reports
      {
        id: 'report-1',
        type: 'trend-report',
        title: 'Spring/Summer 2026 Trend Forecast',
        description: 'Comprehensive trend analysis with runway insights and color predictions',
        imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea3c8565',
        accessLevel: 'premium',
        featured: true,
        isNew: false,
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        views: 3420,
        likes: 892,
        tags: ['Trend Report', 'Spring 2026', 'Runway', 'Analysis'],
        author: {
          name: 'Olivia Rodriguez',
          title: 'Luxury Brand Specialist',
          imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        },
      },
      {
        id: 'report-2',
        type: 'trend-report',
        title: 'Fall/Winter 2026 Color Palette',
        description: 'Pro-exclusive: Advanced color trends with Pantone codes and styling tips',
        imageUrl: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3',
        accessLevel: 'pro',
        featured: false,
        isNew: true,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        views: 1560,
        likes: 445,
        tags: ['Color Trends', 'Fall 2026', 'Pantone', 'Pro Only'],
      },
      // Collections
      {
        id: 'collection-1',
        type: 'collection',
        title: 'Red Carpet Ready',
        description: 'Exclusive collection of celebrity-inspired formal looks',
        imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae',
        accessLevel: 'premium',
        featured: true,
        isNew: false,
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        views: 2890,
        likes: 678,
        tags: ['Red Carpet', 'Formal', 'Celebrity', 'Collection'],
        author: {
          name: 'Isabella Martinez',
          title: 'Celebrity Fashion Consultant',
          imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        },
      },
      // Tutorials
      {
        id: 'tutorial-1',
        type: 'tutorial',
        title: 'Master the Art of Layering',
        description: 'Step-by-step guide to creating sophisticated layered outfits',
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b',
        accessLevel: 'premium',
        featured: false,
        isNew: false,
        publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        views: 1780,
        likes: 423,
        tags: ['Tutorial', 'Layering', 'Styling Tips', 'How-To'],
      },
      // Events
      {
        id: 'event-1',
        type: 'event',
        title: 'Virtual Fashion Week Preview',
        description: 'Pro-exclusive: Live preview of upcoming fashion week collections',
        imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b',
        accessLevel: 'pro',
        featured: true,
        isNew: true,
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        views: 567,
        likes: 189,
        tags: ['Event', 'Fashion Week', 'Virtual', 'Pro Only'],
      },
    ];

    // Filter by user tier
    let content = allContent.filter(item => {
      if (userTier === 'pro') return true;
      if (userTier === 'premium') return item.accessLevel !== 'pro';
      return item.accessLevel === 'free';
    });

    // Apply filters
    if (filters?.type) {
      content = content.filter(item => item.type === filters.type);
    }
    if (filters?.accessLevel) {
      content = content.filter(item => item.accessLevel === filters.accessLevel);
    }
    if (filters?.featured !== undefined) {
      content = content.filter(item => item.featured === filters.featured);
    }

    return content;
  }

  /**
   * Get content details
   */
  async getContentDetails(contentId: string): Promise<ExclusiveContent | null> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const content = await this.getExclusiveContent('pro');
    return content.find(c => c.id === contentId) || null;
  }

  /**
   * Get exclusive look details
   */
  async getExclusiveLook(lookId: string): Promise<ExclusiveLook | null> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const mockLook: ExclusiveLook = {
      id: lookId,
      type: 'look',
      title: 'Spring 2026 Power Suit',
      description: 'Exclusive early access to next season\'s must-have power suit ensemble',
      imageUrl: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf',
      accessLevel: 'premium',
      featured: true,
      isNew: true,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      views: 1250,
      likes: 340,
      tags: ['Power Dressing', 'Spring 2026', 'Professional', 'Trending'],
      author: {
        name: 'Isabella Martinez',
        title: 'Celebrity Fashion Consultant',
        imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      },
      items: [
        {
          id: 'item-1',
          name: 'Tailored Blazer',
          brand: 'Theory',
          price: 495,
          imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
          affiliateLink: 'https://example.com/blazer',
        },
        {
          id: 'item-2',
          name: 'Wide-Leg Trousers',
          brand: 'Vince',
          price: 325,
          imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1',
          affiliateLink: 'https://example.com/trousers',
        },
        {
          id: 'item-3',
          name: 'Silk Blouse',
          brand: 'Equipment',
          price: 228,
          imageUrl: 'https://images.unsplash.com/photo-1618932260643-eee4a2f652a6',
          affiliateLink: 'https://example.com/blouse',
        },
      ],
      occasion: 'Professional',
      season: 'Spring 2026',
      styleNotes: 'This power suit ensemble combines modern tailoring with timeless elegance. The oversized blazer creates a strong silhouette, while the wide-leg trousers add movement and sophistication. Pair with a silk blouse for a polished finish.',
    };

    return mockLook;
  }

  /**
   * Get trend report details
   */
  async getTrendReport(reportId: string): Promise<TrendReport | null> {
    await new Promise(resolve => setTimeout(resolve, 700));

    const mockReport: TrendReport = {
      id: reportId,
      type: 'trend-report',
      title: 'Spring/Summer 2026 Trend Forecast',
      description: 'Comprehensive trend analysis with runway insights and color predictions',
      imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea3c8565',
      accessLevel: 'premium',
      featured: true,
      isNew: false,
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      views: 3420,
      likes: 892,
      tags: ['Trend Report', 'Spring 2026', 'Runway', 'Analysis'],
      author: {
        name: 'Olivia Rodriguez',
        title: 'Luxury Brand Specialist',
        imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      },
      season: 'Spring/Summer',
      year: 2026,
      keyTrends: [
        {
          name: 'Digital Lavender',
          description: 'Soft purple tones dominate the season with a futuristic edge',
          confidence: 92,
          imageUrl: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3',
        },
        {
          name: 'Oversized Tailoring',
          description: 'Exaggerated proportions in structured pieces',
          confidence: 88,
          imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
        },
        {
          name: 'Sustainable Luxury',
          description: 'High-end eco-friendly materials and ethical production',
          confidence: 85,
          imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d',
        },
      ],
      colorPalette: [
        { name: 'Digital Lavender', hex: '#B4A7D6', pantone: '16-3520' },
        { name: 'Viva Magenta', hex: '#BE3455', pantone: '18-1750' },
        { name: 'Tranquil Blue', hex: '#A3C1DA', pantone: '14-4122' },
        { name: 'Sundial', hex: '#E8B796', pantone: '15-1234' },
      ],
      insights: [
        'Sustainability continues to be a major driver in fashion choices',
        'Bold colors are making a comeback after years of neutrals',
        'Oversized silhouettes balance with fitted pieces for modern proportions',
        'Digital influence is shaping color choices and styling',
      ],
      downloadUrl: 'https://example.com/report.pdf',
    };

    return mockReport;
  }

  /**
   * Check content access
   */
  async checkContentAccess(
    contentId: string,
    userTier: SubscriptionTier
  ): Promise<UserContentAccess> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const content = await this.getContentDetails(contentId);
    if (!content) {
      return { hasAccess: false, reason: 'Content not found' };
    }

    const tierLevels = { free: 0, premium: 1, pro: 2 };
    const userLevel = tierLevels[userTier];
    const requiredLevel = tierLevels[content.accessLevel];

    if (userLevel >= requiredLevel) {
      return { hasAccess: true };
    }

    return {
      hasAccess: false,
      reason: `This content requires ${content.accessLevel} membership`,
      upgradeRequired: content.accessLevel as AccessLevel,
    };
  }

  /**
   * Get content stats
   */
  async getContentStats(userTier: SubscriptionTier): Promise<ContentStats> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const content = await this.getExclusiveContent(userTier);

    const byType: Record<ContentType, number> = {
      look: 0,
      'trend-report': 0,
      collection: 0,
      tutorial: 0,
      event: 0,
    };

    const byAccessLevel: Record<AccessLevel, number> = {
      free: 0,
      premium: 0,
      pro: 0,
    };

    content.forEach(item => {
      byType[item.type]++;
      byAccessLevel[item.accessLevel]++;
    });

    const recentlyAdded = content.filter(
      item => new Date(item.publishedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    const trending = content.filter(item => item.featured).length;

    return {
      totalContent: content.length,
      byType,
      byAccessLevel,
      recentlyAdded,
      trending,
    };
  }

  /**
   * Like content
   */
  async likeContent(contentId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Mock like action
  }

  /**
   * Unlike content
   */
  async unlikeContent(contentId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Mock unlike action
  }

  /**
   * Get early access content
   */
  async getEarlyAccessContent(userTier: SubscriptionTier): Promise<ExclusiveContent[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const content = await this.getExclusiveContent(userTier);
    return content.filter(item => item.isNew);
  }

  /**
   * Get featured content
   */
  async getFeaturedContent(userTier: SubscriptionTier): Promise<ExclusiveContent[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const content = await this.getExclusiveContent(userTier);
    return content.filter(item => item.featured);
  }

  /**
   * Search exclusive content
   */
  async searchContent(
    query: string,
    userTier: SubscriptionTier
  ): Promise<ExclusiveContent[]> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const content = await this.getExclusiveContent(userTier);
    const lowerQuery = query.toLowerCase();

    return content.filter(
      item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

export const exclusiveContentService = new ExclusiveContentService();

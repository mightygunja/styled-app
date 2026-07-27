import { Stylist, StylingSession, StylistReview, TimeSlot, SessionType } from '../types';

// Mock data for development
const MOCK_STYLISTS: Stylist[] = [
  {
    id: 'stylist-1',
    name: 'Emma Rodriguez',
    bio: 'Celebrity stylist with 10+ years of experience. Specializing in modern professional looks and sustainable fashion.',
    profileImageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    coverImageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea1c8e5d?w=800',
    specialties: ['Professional Styling', 'Sustainable Fashion', 'Color Analysis'],
    hourlyRate: 150,
    rating: 4.9,
    reviewCount: 127,
    availability: ['Mon', 'Tue', 'Wed', 'Thu'],
    yearsExperience: 12,
    certifications: ['Certified Image Consultant', 'Color Analysis Expert'],
    portfolio: [
      {
        id: 'p1',
        imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
        title: 'Executive Makeover',
        description: 'Complete wardrobe transformation for C-suite executive',
      },
      {
        id: 'p2',
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
        title: 'Sustainable Capsule',
        description: '30-piece sustainable wardrobe',
      },
    ],
    sessionTypes: ['closet-audit', 'shopping-assistance', 'event-styling', 'wardrobe-planning'],
    languages: ['English', 'Spanish'],
    location: 'New York, NY',
    isVerified: true,
    responseTime: '< 2 hours',
  },
  {
    id: 'stylist-2',
    name: 'Marcus Chen',
    bio: 'Fashion consultant specializing in minimalist wardrobes and personal branding for entrepreneurs.',
    profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    coverImageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
    specialties: ['Minimalist Style', 'Personal Branding', 'Capsule Wardrobes'],
    hourlyRate: 125,
    rating: 4.8,
    reviewCount: 89,
    availability: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    yearsExperience: 8,
    certifications: ['Personal Stylist Certification'],
    portfolio: [
      {
        id: 'p3',
        imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400',
        title: 'Minimalist Wardrobe',
        description: '20-piece capsule for tech entrepreneur',
      },
    ],
    sessionTypes: ['closet-audit', 'wardrobe-planning'],
    languages: ['English', 'Mandarin'],
    location: 'San Francisco, CA',
    isVerified: true,
    responseTime: '< 4 hours',
  },
  {
    id: 'stylist-3',
    name: 'Sophia Laurent',
    bio: 'Luxury fashion stylist with expertise in high-end brands and red carpet events.',
    profileImageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    coverImageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
    specialties: ['Luxury Fashion', 'Event Styling', 'Red Carpet'],
    hourlyRate: 200,
    rating: 5.0,
    reviewCount: 64,
    availability: ['Mon', 'Wed', 'Fri'],
    yearsExperience: 15,
    certifications: ['Luxury Brand Specialist', 'Event Styling Pro'],
    portfolio: [
      {
        id: 'p4',
        imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
        title: 'Gala Ready',
        description: 'Red carpet styling for charity gala',
      },
      {
        id: 'p5',
        imageUrl: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400',
        title: 'Luxury Wardrobe',
        description: 'High-end wardrobe curation',
      },
    ],
    sessionTypes: ['event-styling', 'shopping-assistance'],
    languages: ['English', 'French'],
    location: 'Los Angeles, CA',
    isVerified: true,
    responseTime: '< 1 hour',
  },
  {
    id: 'stylist-4',
    name: 'Jordan Taylor',
    bio: 'Body-positive stylist helping clients feel confident at any size. Specializing in plus-size fashion.',
    profileImageUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400',
    coverImageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
    specialties: ['Plus Size Fashion', 'Body Positivity', 'Confidence Building'],
    hourlyRate: 100,
    rating: 4.9,
    reviewCount: 156,
    availability: ['Mon', 'Tue', 'Thu', 'Fri', 'Sat'],
    yearsExperience: 6,
    certifications: ['Body Positive Styling'],
    portfolio: [
      {
        id: 'p6',
        imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400',
        title: 'Confidence Boost',
        description: 'Complete style transformation',
      },
    ],
    sessionTypes: ['closet-audit', 'shopping-assistance', 'wardrobe-planning'],
    languages: ['English'],
    location: 'Chicago, IL',
    isVerified: true,
    responseTime: '< 3 hours',
  },
];

const MOCK_REVIEWS: StylistReview[] = [
  {
    id: 'r1',
    stylistId: 'stylist-1',
    userId: 'user-1',
    userName: 'Sarah M.',
    rating: 5,
    comment: 'Emma completely transformed my wardrobe! Her eye for sustainable pieces that actually work for my lifestyle was incredible.',
    sessionType: 'closet-audit',
    createdAt: '2024-11-15',
    helpful: 12,
  },
  {
    id: 'r2',
    stylistId: 'stylist-1',
    userId: 'user-2',
    userName: 'Michael K.',
    rating: 5,
    comment: 'Professional, knowledgeable, and so easy to work with. Worth every penny!',
    sessionType: 'wardrobe-planning',
    createdAt: '2024-11-10',
    helpful: 8,
  },
  {
    id: 'r3',
    stylistId: 'stylist-2',
    userId: 'user-3',
    userName: 'Alex P.',
    rating: 5,
    comment: 'Marcus helped me build a capsule wardrobe that works perfectly for my startup life. Highly recommend!',
    sessionType: 'wardrobe-planning',
    createdAt: '2024-11-20',
    helpful: 15,
  },
];

// API functions
export const stylistAPI = {
  /**
   * Get all stylists
   */
  getStylists: async (): Promise<Stylist[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_STYLISTS;
  },

  /**
   * Get stylist by ID
   */
  getStylist: async (id: string): Promise<Stylist | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_STYLISTS.find(s => s.id === id) || null;
  },

  /**
   * Get reviews for a stylist
   */
  getStylistReviews: async (stylistId: string): Promise<StylistReview[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_REVIEWS.filter(r => r.stylistId === stylistId);
  },

  /**
   * Get available time slots for a stylist
   */
  getAvailableSlots: async (stylistId: string, date: string): Promise<TimeSlot[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Generate mock time slots
    const slots: TimeSlot[] = [];
    const times = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
    
    times.forEach(time => {
      slots.push({
        date,
        time,
        available: Math.random() > 0.3, // 70% chance of being available
      });
    });
    
    return slots;
  },

  /**
   * Book a session
   */
  bookSession: async (
    stylistId: string,
    sessionType: SessionType,
    date: string,
    time: string,
    duration: number
  ): Promise<StylingSession> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const stylist = MOCK_STYLISTS.find(s => s.id === stylistId);
    const price = stylist ? stylist.hourlyRate * (duration / 60) : 0;
    
    const session: StylingSession = {
      id: `session-${Date.now()}`,
      userId: 'current-user',
      stylistId,
      stylist,
      sessionType,
      scheduledDate: `${date} ${time}`,
      duration,
      status: 'pending',
      price,
      createdAt: new Date().toISOString(),
    };
    
    return session;
  },

  /**
   * Get user's sessions
   */
  getUserSessions: async (userId: string): Promise<StylingSession[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Return empty for now - would fetch from backend
    return [];
  },

  /**
   * Search stylists
   */
  searchStylists: async (query: string): Promise<Stylist[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const lowerQuery = query.toLowerCase();
    return MOCK_STYLISTS.filter(s => 
      s.name.toLowerCase().includes(lowerQuery) ||
      s.specialties.some(spec => spec.toLowerCase().includes(lowerQuery)) ||
      s.bio.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Filter stylists
   */
  filterStylists: async (filters: {
    maxRate?: number;
    minRating?: number;
    specialties?: string[];
    sessionTypes?: SessionType[];
  }): Promise<Stylist[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return MOCK_STYLISTS.filter(s => {
      if (filters.maxRate && s.hourlyRate > filters.maxRate) return false;
      if (filters.minRating && s.rating < filters.minRating) return false;
      if (filters.specialties && filters.specialties.length > 0) {
        const hasSpecialty = filters.specialties.some(spec => 
          s.specialties.includes(spec)
        );
        if (!hasSpecialty) return false;
      }
      if (filters.sessionTypes && filters.sessionTypes.length > 0) {
        const hasSessionType = filters.sessionTypes.some(type => 
          s.sessionTypes.includes(type)
        );
        if (!hasSessionType) return false;
      }
      return true;
    });
  },
};

/**
 * Premium Stylist Access Service
 * 
 * Manages premium-only stylists with exclusive booking features.
 * Provides priority booking, extended sessions, and VIP stylist access.
 */

import { SubscriptionTier } from './subscriptionService';

export type StylistTier = 'standard' | 'premium' | 'vip';
export type SessionType = 'quick-consult' | 'standard' | 'extended' | 'vip-package';

export interface PremiumStylist {
  id: string;
  name: string;
  tier: StylistTier;
  title: string;
  bio: string;
  imageUrl: string;
  rating: number;
  totalSessions: number;
  yearsExperience: number;
  specialties: string[];
  certifications: string[];
  languages: string[];
  pricing: {
    quickConsult: number; // 15 min
    standard: number; // 30 min
    extended: number; // 60 min
    vipPackage: number; // 90 min + follow-up
  };
  availability: {
    nextAvailable: string;
    prioritySlots: string[]; // Premium members only
    regularSlots: string[];
  };
  premiumFeatures: {
    priorityBooking: boolean;
    flexibleRescheduling: boolean;
    extendedSessions: boolean;
    personalizedReports: boolean;
    directMessaging: boolean;
    followUpSupport: boolean;
  };
  requiredTier: SubscriptionTier;
  featured: boolean;
  badges: string[];
}

export interface BookingRequest {
  stylistId: string;
  sessionType: SessionType;
  date: string;
  time: string;
  isPriority: boolean;
  notes?: string;
}

export interface StylistBooking {
  id: string;
  stylistId: string;
  stylist: PremiumStylist;
  userId: string;
  sessionType: SessionType;
  date: string;
  time: string;
  duration: number; // minutes
  price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'canceled';
  isPriority: boolean;
  notes?: string;
  meetingLink?: string;
  createdAt: string;
}

export interface StylistAvailability {
  date: string;
  slots: {
    time: string;
    available: boolean;
    isPriority: boolean; // Premium members only
  }[];
}

export interface StylistReview {
  id: string;
  stylistId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  sessionType: SessionType;
  date: string;
  verified: boolean;
}

export interface PremiumBenefits {
  priorityBooking: {
    enabled: boolean;
    description: string;
    icon: string;
  };
  flexibleRescheduling: {
    enabled: boolean;
    description: string;
    icon: string;
  };
  extendedSessions: {
    enabled: boolean;
    description: string;
    icon: string;
  };
  vipAccess: {
    enabled: boolean;
    description: string;
    icon: string;
  };
  directMessaging: {
    enabled: boolean;
    description: string;
    icon: string;
  };
  followUpSupport: {
    enabled: boolean;
    description: string;
    icon: string;
  };
}

class PremiumStylistService {
  /**
   * Get premium stylists
   */
  async getPremiumStylists(userTier: SubscriptionTier): Promise<PremiumStylist[]> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const allStylists: PremiumStylist[] = [
      {
        id: 'stylist-1',
        name: 'Isabella Martinez',
        tier: 'vip',
        title: 'Celebrity Fashion Consultant',
        bio: 'Former stylist for A-list celebrities with 15+ years of experience in haute couture and red carpet styling.',
        imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        rating: 4.9,
        totalSessions: 850,
        yearsExperience: 15,
        specialties: ['Red Carpet', 'Haute Couture', 'Personal Branding', 'Luxury Fashion'],
        certifications: ['FIT Graduate', 'Image Consultant Certified', 'Color Analysis Expert'],
        languages: ['English', 'Spanish', 'French'],
        pricing: {
          quickConsult: 75,
          standard: 150,
          extended: 250,
          vipPackage: 500,
        },
        availability: {
          nextAvailable: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          prioritySlots: [
            new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          ],
          regularSlots: [
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          ],
        },
        premiumFeatures: {
          priorityBooking: true,
          flexibleRescheduling: true,
          extendedSessions: true,
          personalizedReports: true,
          directMessaging: true,
          followUpSupport: true,
        },
        requiredTier: 'pro',
        featured: true,
        badges: ['Top Rated', 'Celebrity Stylist', 'VIP'],
      },
      {
        id: 'stylist-2',
        name: 'Sophia Chen',
        tier: 'premium',
        title: 'Sustainable Fashion Expert',
        bio: 'Specializing in eco-friendly fashion and ethical styling with a focus on timeless, sustainable wardrobes.',
        imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
        rating: 4.8,
        totalSessions: 620,
        yearsExperience: 10,
        specialties: ['Sustainable Fashion', 'Capsule Wardrobes', 'Ethical Brands', 'Minimalism'],
        certifications: ['Sustainable Fashion Certified', 'Personal Stylist Diploma'],
        languages: ['English', 'Mandarin'],
        pricing: {
          quickConsult: 50,
          standard: 100,
          extended: 180,
          vipPackage: 350,
        },
        availability: {
          nextAvailable: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          prioritySlots: [
            new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          ],
          regularSlots: [
            new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
          ],
        },
        premiumFeatures: {
          priorityBooking: true,
          flexibleRescheduling: true,
          extendedSessions: true,
          personalizedReports: true,
          directMessaging: true,
          followUpSupport: false,
        },
        requiredTier: 'premium',
        featured: true,
        badges: ['Eco Expert', 'Top Rated'],
      },
      {
        id: 'stylist-3',
        name: 'Marcus Thompson',
        tier: 'premium',
        title: 'Corporate Style Consultant',
        bio: 'Executive wardrobe specialist helping professionals build powerful, polished looks for the workplace.',
        imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
        rating: 4.7,
        totalSessions: 540,
        yearsExperience: 8,
        specialties: ['Corporate Fashion', 'Executive Presence', 'Business Casual', 'Interview Prep'],
        certifications: ['Image Consultant', 'Corporate Styling Certified'],
        languages: ['English'],
        pricing: {
          quickConsult: 45,
          standard: 90,
          extended: 160,
          vipPackage: 320,
        },
        availability: {
          nextAvailable: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          prioritySlots: [
            new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          ],
          regularSlots: [
            new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          ],
        },
        premiumFeatures: {
          priorityBooking: true,
          flexibleRescheduling: true,
          extendedSessions: true,
          personalizedReports: true,
          directMessaging: false,
          followUpSupport: false,
        },
        requiredTier: 'premium',
        featured: false,
        badges: ['Corporate Expert'],
      },
      {
        id: 'stylist-4',
        name: 'Olivia Rodriguez',
        tier: 'vip',
        title: 'Luxury Brand Specialist',
        bio: 'Former fashion editor with exclusive access to luxury brands and insider knowledge of high-end fashion.',
        imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        rating: 4.9,
        totalSessions: 720,
        yearsExperience: 12,
        specialties: ['Luxury Fashion', 'Designer Collections', 'Fashion Week', 'Investment Pieces'],
        certifications: ['Fashion Editor', 'Luxury Brand Consultant'],
        languages: ['English', 'Italian', 'French'],
        pricing: {
          quickConsult: 80,
          standard: 160,
          extended: 280,
          vipPackage: 550,
        },
        availability: {
          nextAvailable: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          prioritySlots: [
            new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
          ],
          regularSlots: [
            new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
            new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
          ],
        },
        premiumFeatures: {
          priorityBooking: true,
          flexibleRescheduling: true,
          extendedSessions: true,
          personalizedReports: true,
          directMessaging: true,
          followUpSupport: true,
        },
        requiredTier: 'pro',
        featured: true,
        badges: ['Luxury Expert', 'Fashion Editor', 'VIP'],
      },
    ];

    // Filter based on user tier
    return allStylists.filter(stylist => {
      if (userTier === 'pro') return true;
      if (userTier === 'premium') return stylist.requiredTier !== 'pro';
      return stylist.requiredTier === 'free';
    });
  }

  /**
   * Get stylist details
   */
  async getStylistDetails(stylistId: string): Promise<PremiumStylist | null> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const stylists = await this.getPremiumStylists('pro');
    return stylists.find(s => s.id === stylistId) || null;
  }

  /**
   * Get stylist availability
   */
  async getStylistAvailability(
    stylistId: string,
    userTier: SubscriptionTier
  ): Promise<StylistAvailability[]> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const availability: StylistAvailability[] = [];
    const hasPriorityAccess = userTier === 'premium' || userTier === 'pro';

    // Generate 7 days of availability
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      const slots = [
        { time: '09:00', available: true, isPriority: i <= 3 },
        { time: '10:00', available: i % 2 === 0, isPriority: i <= 3 },
        { time: '11:00', available: true, isPriority: false },
        { time: '14:00', available: true, isPriority: i <= 2 },
        { time: '15:00', available: i % 3 !== 0, isPriority: false },
        { time: '16:00', available: true, isPriority: false },
      ].filter(slot => !slot.isPriority || hasPriorityAccess);

      availability.push({
        date: date.toISOString().split('T')[0],
        slots,
      });
    }

    return availability;
  }

  /**
   * Book premium stylist session
   */
  async bookSession(
    userId: string,
    request: BookingRequest,
    userTier: SubscriptionTier
  ): Promise<StylistBooking> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    const stylist = await this.getStylistDetails(request.stylistId);
    if (!stylist) {
      throw new Error('Stylist not found');
    }

    // Check tier requirements
    if (userTier === 'free' && stylist.requiredTier !== 'free') {
      throw new Error('Premium subscription required');
    }
    if (userTier === 'premium' && stylist.requiredTier === 'pro') {
      throw new Error('Pro subscription required');
    }

    // Get pricing and duration
    const sessionDetails = this.getSessionDetails(request.sessionType, stylist);

    return {
      id: `booking-${Date.now()}`,
      stylistId: request.stylistId,
      stylist,
      userId,
      sessionType: request.sessionType,
      date: request.date,
      time: request.time,
      duration: sessionDetails.duration,
      price: sessionDetails.price,
      status: 'confirmed',
      isPriority: request.isPriority,
      notes: request.notes,
      meetingLink: 'https://zoom.us/j/123456789',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get session details
   */
  private getSessionDetails(
    sessionType: SessionType,
    stylist: PremiumStylist
  ): { duration: number; price: number } {
    const details = {
      'quick-consult': { duration: 15, price: stylist.pricing.quickConsult },
      'standard': { duration: 30, price: stylist.pricing.standard },
      'extended': { duration: 60, price: stylist.pricing.extended },
      'vip-package': { duration: 90, price: stylist.pricing.vipPackage },
    };

    return details[sessionType];
  }

  /**
   * Get user bookings
   */
  async getUserBookings(userId: string): Promise<StylistBooking[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock bookings
    const stylists = await this.getPremiumStylists('pro');
    
    return [
      {
        id: 'booking-1',
        stylistId: stylists[0].id,
        stylist: stylists[0],
        userId,
        sessionType: 'standard',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '14:00',
        duration: 30,
        price: 150,
        status: 'confirmed',
        isPriority: true,
        meetingLink: 'https://zoom.us/j/123456789',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    // Mock cancellation
  }

  /**
   * Reschedule booking
   */
  async rescheduleBooking(
    bookingId: string,
    newDate: string,
    newTime: string
  ): Promise<StylistBooking> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const bookings = await this.getUserBookings('current-user');
    const booking = bookings.find(b => b.id === bookingId);
    
    if (!booking) {
      throw new Error('Booking not found');
    }

    return {
      ...booking,
      date: newDate,
      time: newTime,
    };
  }

  /**
   * Get stylist reviews
   */
  async getStylistReviews(stylistId: string, limit: number = 10): Promise<StylistReview[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const reviews: StylistReview[] = [];
    for (let i = 0; i < Math.min(limit, 5); i++) {
      reviews.push({
        id: `review-${i}`,
        stylistId,
        userId: `user-${i}`,
        userName: ['Emma S.', 'Michael R.', 'Sarah K.', 'David L.', 'Jessica M.'][i],
        rating: 4.5 + Math.random() * 0.5,
        comment: [
          'Amazing experience! Really helped me refine my style.',
          'Professional and insightful. Highly recommend!',
          'Worth every penny. My wardrobe has never looked better.',
          'Great advice and very personable. Will book again!',
          'Exceeded my expectations. True fashion expert!',
        ][i],
        sessionType: ['standard', 'extended', 'vip-package', 'standard', 'extended'][i] as SessionType,
        date: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        verified: true,
      });
    }

    return reviews;
  }

  /**
   * Get premium benefits
   */
  async getPremiumBenefits(userTier: SubscriptionTier): Promise<PremiumBenefits> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const isPremium = userTier === 'premium' || userTier === 'pro';
    const isPro = userTier === 'pro';

    return {
      priorityBooking: {
        enabled: isPremium,
        description: 'Access exclusive priority booking slots up to 3 days earlier',
        icon: '⚡',
      },
      flexibleRescheduling: {
        enabled: isPremium,
        description: 'Reschedule sessions up to 24 hours before with no penalty',
        icon: '🔄',
      },
      extendedSessions: {
        enabled: isPremium,
        description: 'Book extended 60-90 minute sessions with premium stylists',
        icon: '⏱️',
      },
      vipAccess: {
        enabled: isPro,
        description: 'Exclusive access to VIP celebrity stylists',
        icon: '👑',
      },
      directMessaging: {
        enabled: isPro,
        description: 'Direct message your stylist between sessions',
        icon: '💬',
      },
      followUpSupport: {
        enabled: isPro,
        description: '30-day follow-up support after each session',
        icon: '🤝',
      },
    };
  }
}

export const premiumStylistService = new PremiumStylistService();

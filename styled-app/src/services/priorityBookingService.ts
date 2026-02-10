/**
 * Priority Booking Service
 * 
 * Manages priority booking slots for premium members including
 * early access, priority queue, express booking, and VIP reservations.
 */

import { SubscriptionTier } from './subscriptionService';

export type BookingType = 'stylist' | 'event' | 'workshop' | 'consultation' | 'fitting';
export type BookingStatus = 'confirmed' | 'pending' | 'waitlist' | 'cancelled';
export type PriorityLevel = 'standard' | 'priority' | 'vip';

export interface BookingSlot {
  id: string;
  type: BookingType;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  capacity: number;
  booked: number;
  waitlist: number;
  location: string;
  isVirtual: boolean;
  price: number;
  imageUrl: string;
  host: {
    name: string;
    title: string;
    imageUrl: string;
  };
  priorityAccess: {
    standard: string; // date when standard users can book
    priority: string; // date when priority users can book
    vip: string; // date when VIP users can book
  };
  features: string[];
  tags: string[];
}

export interface UserBooking {
  id: string;
  slotId: string;
  slot: BookingSlot;
  userId: string;
  status: BookingStatus;
  priorityLevel: PriorityLevel;
  bookedAt: string;
  confirmationCode: string;
  queuePosition?: number;
  notes?: string;
}

export interface PriorityBenefits {
  tier: SubscriptionTier;
  benefits: {
    earlyAccess: boolean;
    earlyAccessDays: number;
    priorityQueue: boolean;
    expressBooking: boolean;
    freeRescheduling: boolean;
    rescheduleHours: number;
    waitlistPriority: boolean;
    exclusiveSlots: boolean;
    conciergeSupport: boolean;
  };
}

export interface BookingStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageWaitTime: number; // minutes
  priorityBookingsUsed: number;
  priorityBookingsLimit: number;
}

export interface AvailabilityCalendar {
  date: string;
  slots: {
    time: string;
    available: boolean;
    priorityOnly: boolean;
    vipOnly: boolean;
    capacity: number;
    booked: number;
  }[];
}

class PriorityBookingService {
  /**
   * Get available booking slots
   */
  async getAvailableSlots(
    userTier: SubscriptionTier,
    filters?: {
      type?: BookingType;
      date?: string;
      priorityOnly?: boolean;
    }
  ): Promise<BookingSlot[]> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const now = new Date();
    const allSlots: BookingSlot[] = [
      // Stylist Sessions
      {
        id: 'slot-1',
        type: 'stylist',
        title: 'Personal Styling Session with Isabella',
        description: 'One-on-one styling consultation with celebrity stylist Isabella Martinez',
        date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        startTime: '14:00',
        endTime: '15:00',
        duration: 60,
        capacity: 1,
        booked: 0,
        waitlist: 0,
        location: 'Virtual',
        isVirtual: true,
        price: 180,
        imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        host: {
          name: 'Isabella Martinez',
          title: 'Celebrity Fashion Consultant',
          imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        },
        priorityAccess: {
          vip: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          standard: new Date(now.getTime()).toISOString(),
        },
        features: ['Video Call', 'Style Report', 'Follow-up Email'],
        tags: ['VIP', 'Celebrity Stylist', 'Priority Access'],
      },
      {
        id: 'slot-2',
        type: 'stylist',
        title: 'Sustainable Wardrobe Consultation',
        description: 'Build an eco-friendly capsule wardrobe with Sophia Chen',
        date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        startTime: '10:00',
        endTime: '10:30',
        duration: 30,
        capacity: 1,
        booked: 0,
        waitlist: 0,
        location: 'Virtual',
        isVirtual: true,
        price: 100,
        imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
        host: {
          name: 'Sophia Chen',
          title: 'Sustainable Fashion Expert',
          imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
        },
        priorityAccess: {
          vip: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          priority: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          standard: new Date(now.getTime()).toISOString(),
        },
        features: ['Video Call', 'Sustainability Report'],
        tags: ['Eco-Friendly', 'Premium'],
      },
      // Events
      {
        id: 'slot-3',
        type: 'event',
        title: 'Virtual Fashion Week Preview',
        description: 'Exclusive preview of Spring 2026 collections',
        date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        startTime: '18:00',
        endTime: '20:00',
        duration: 120,
        capacity: 50,
        booked: 32,
        waitlist: 5,
        location: 'Virtual Event',
        isVirtual: true,
        price: 0,
        imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b',
        host: {
          name: 'Olivia Rodriguez',
          title: 'Luxury Brand Specialist',
          imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        },
        priorityAccess: {
          vip: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          priority: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          standard: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        features: ['Live Q&A', 'Runway Access', 'Trend Report'],
        tags: ['Fashion Week', 'VIP Event', 'Pro Only'],
      },
      // Workshops
      {
        id: 'slot-4',
        type: 'workshop',
        title: 'Master the Art of Layering',
        description: 'Interactive workshop on creating sophisticated layered outfits',
        date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        startTime: '15:00',
        endTime: '16:30',
        duration: 90,
        capacity: 20,
        booked: 12,
        waitlist: 3,
        location: 'Virtual Workshop',
        isVirtual: true,
        price: 45,
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b',
        host: {
          name: 'Marcus Thompson',
          title: 'Corporate Style Consultant',
          imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        },
        priorityAccess: {
          vip: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          standard: new Date(now.getTime()).toISOString(),
        },
        features: ['Interactive Session', 'Style Guide PDF', 'Recording Access'],
        tags: ['Workshop', 'Premium'],
      },
      // Consultations
      {
        id: 'slot-5',
        type: 'consultation',
        title: 'Color Analysis Consultation',
        description: 'Discover your perfect color palette with expert analysis',
        date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        startTime: '11:00',
        endTime: '11:45',
        duration: 45,
        capacity: 1,
        booked: 0,
        waitlist: 0,
        location: 'Virtual',
        isVirtual: true,
        price: 85,
        imageUrl: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3',
        host: {
          name: 'Emma Wilson',
          title: 'Color Specialist',
          imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
        },
        priorityAccess: {
          vip: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          priority: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          standard: new Date(now.getTime()).toISOString(),
        },
        features: ['Color Palette', 'Shopping Guide', 'Follow-up Support'],
        tags: ['Consultation', 'Premium'],
      },
    ];

    // Filter by user tier and access
    const userPriorityLevel = this.getUserPriorityLevel(userTier);
    const accessibleSlots = allSlots.filter(slot => {
      const canAccess = this.canAccessSlot(slot, userPriorityLevel, now);
      return canAccess;
    });

    // Apply filters
    let filteredSlots = accessibleSlots;
    if (filters?.type) {
      filteredSlots = filteredSlots.filter(slot => slot.type === filters.type);
    }
    if (filters?.date) {
      filteredSlots = filteredSlots.filter(slot => 
        slot.date.startsWith(filters.date!)
      );
    }
    if (filters?.priorityOnly) {
      filteredSlots = filteredSlots.filter(slot => 
        slot.tags.includes('Priority Access') || slot.tags.includes('VIP Event')
      );
    }

    return filteredSlots;
  }

  /**
   * Get user priority level based on tier
   */
  private getUserPriorityLevel(tier: SubscriptionTier): PriorityLevel {
    if (tier === 'pro') return 'vip';
    if (tier === 'premium') return 'priority';
    return 'standard';
  }

  /**
   * Check if user can access slot based on priority
   */
  private canAccessSlot(
    slot: BookingSlot,
    userPriorityLevel: PriorityLevel,
    now: Date
  ): boolean {
    const accessDate = new Date(
      userPriorityLevel === 'vip' 
        ? slot.priorityAccess.vip
        : userPriorityLevel === 'priority'
        ? slot.priorityAccess.priority
        : slot.priorityAccess.standard
    );

    return now >= accessDate;
  }

  /**
   * Book a slot
   */
  async bookSlot(
    userId: string,
    slotId: string,
    userTier: SubscriptionTier,
    notes?: string
  ): Promise<UserBooking> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const slots = await this.getAvailableSlots(userTier);
    const slot = slots.find(s => s.id === slotId);

    if (!slot) {
      throw new Error('Slot not found or not accessible');
    }

    if (slot.booked >= slot.capacity) {
      throw new Error('Slot is fully booked');
    }

    const priorityLevel = this.getUserPriorityLevel(userTier);
    const booking: UserBooking = {
      id: `booking-${Date.now()}`,
      slotId,
      slot,
      userId,
      status: 'confirmed',
      priorityLevel,
      bookedAt: new Date().toISOString(),
      confirmationCode: this.generateConfirmationCode(),
      notes,
    };

    return booking;
  }

  /**
   * Join waitlist
   */
  async joinWaitlist(
    userId: string,
    slotId: string,
    userTier: SubscriptionTier
  ): Promise<UserBooking> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const slots = await this.getAvailableSlots(userTier);
    const slot = slots.find(s => s.id === slotId);

    if (!slot) {
      throw new Error('Slot not found');
    }

    const priorityLevel = this.getUserPriorityLevel(userTier);
    const queuePosition = priorityLevel === 'vip' ? 1 : priorityLevel === 'priority' ? 3 : 6;

    const booking: UserBooking = {
      id: `booking-${Date.now()}`,
      slotId,
      slot,
      userId,
      status: 'waitlist',
      priorityLevel,
      bookedAt: new Date().toISOString(),
      confirmationCode: this.generateConfirmationCode(),
      queuePosition,
    };

    return booking;
  }

  /**
   * Get user bookings
   */
  async getUserBookings(userId: string): Promise<UserBooking[]> {
    await new Promise(resolve => setTimeout(resolve, 600));

    // Mock bookings
    return [];
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Mock cancel
  }

  /**
   * Reschedule booking
   */
  async rescheduleBooking(
    bookingId: string,
    newSlotId: string
  ): Promise<UserBooking> {
    await new Promise(resolve => setTimeout(resolve, 800));
    throw new Error('Not implemented');
  }

  /**
   * Get priority benefits
   */
  async getPriorityBenefits(tier: SubscriptionTier): Promise<PriorityBenefits> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const benefits: Record<SubscriptionTier, PriorityBenefits> = {
      free: {
        tier: 'free',
        benefits: {
          earlyAccess: false,
          earlyAccessDays: 0,
          priorityQueue: false,
          expressBooking: false,
          freeRescheduling: false,
          rescheduleHours: 0,
          waitlistPriority: false,
          exclusiveSlots: false,
          conciergeSupport: false,
        },
      },
      premium: {
        tier: 'premium',
        benefits: {
          earlyAccess: true,
          earlyAccessDays: 3,
          priorityQueue: true,
          expressBooking: true,
          freeRescheduling: true,
          rescheduleHours: 24,
          waitlistPriority: true,
          exclusiveSlots: false,
          conciergeSupport: false,
        },
      },
      pro: {
        tier: 'pro',
        benefits: {
          earlyAccess: true,
          earlyAccessDays: 7,
          priorityQueue: true,
          expressBooking: true,
          freeRescheduling: true,
          rescheduleHours: 48,
          waitlistPriority: true,
          exclusiveSlots: true,
          conciergeSupport: true,
        },
      },
    };

    return benefits[tier];
  }

  /**
   * Get booking stats
   */
  async getBookingStats(userId: string, tier: SubscriptionTier): Promise<BookingStats> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const limits = {
      free: 2,
      premium: 10,
      pro: -1, // unlimited
    };

    return {
      totalBookings: 8,
      upcomingBookings: 3,
      completedBookings: 5,
      cancelledBookings: 0,
      averageWaitTime: tier === 'pro' ? 2 : tier === 'premium' ? 5 : 15,
      priorityBookingsUsed: 3,
      priorityBookingsLimit: limits[tier],
    };
  }

  /**
   * Get availability calendar
   */
  async getAvailabilityCalendar(
    type: BookingType,
    month: string,
    userTier: SubscriptionTier
  ): Promise<AvailabilityCalendar[]> {
    await new Promise(resolve => setTimeout(resolve, 700));

    const calendar: AvailabilityCalendar[] = [];
    const startDate = new Date(month);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      calendar.push({
        date: date.toISOString(),
        slots: [
          {
            time: '10:00',
            available: true,
            priorityOnly: false,
            vipOnly: false,
            capacity: 1,
            booked: 0,
          },
          {
            time: '14:00',
            available: true,
            priorityOnly: userTier === 'free',
            vipOnly: false,
            capacity: 1,
            booked: 0,
          },
          {
            time: '18:00',
            available: false,
            priorityOnly: false,
            vipOnly: false,
            capacity: 1,
            booked: 1,
          },
        ],
      });
    }

    return calendar;
  }

  /**
   * Generate confirmation code
   */
  private generateConfirmationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Check if slot is available for express booking
   */
  async canExpressBook(slotId: string, userTier: SubscriptionTier): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return userTier === 'premium' || userTier === 'pro';
  }

  /**
   * Get early access countdown
   */
  getEarlyAccessCountdown(slot: BookingSlot, userTier: SubscriptionTier): {
    hasAccess: boolean;
    daysUntilAccess: number;
    accessDate: string;
  } {
    const priorityLevel = this.getUserPriorityLevel(userTier);
    const accessDate = new Date(
      priorityLevel === 'vip'
        ? slot.priorityAccess.vip
        : priorityLevel === 'priority'
        ? slot.priorityAccess.priority
        : slot.priorityAccess.standard
    );

    const now = new Date();
    const hasAccess = now >= accessDate;
    const daysUntilAccess = Math.ceil((accessDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      hasAccess,
      daysUntilAccess: Math.max(0, daysUntilAccess),
      accessDate: accessDate.toISOString(),
    };
  }
}

export const priorityBookingService = new PriorityBookingService();

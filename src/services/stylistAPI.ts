import { Stylist, StylingSession, StylistReview, TimeSlot, SessionType } from '../types';
import { stylistsService, stylistBookingsService, reviewsService } from './firestore';
import { getCurrentUserId } from './api';

// API functions - backed by real Firestore data (stylists collection is seeded
// catalog content; bookings and reviews are real, per-user documents).
export const stylistAPI = {
  /**
   * Get all stylists
   */
  getStylists: async (): Promise<Stylist[]> => {
    return stylistsService.getAll();
  },

  /**
   * Get stylist by ID
   */
  getStylist: async (id: string): Promise<Stylist | null> => {
    return stylistsService.getById(id);
  },

  /**
   * Get reviews for a stylist
   */
  getStylistReviews: async (stylistId: string): Promise<StylistReview[]> => {
    return reviewsService.getForStylist(stylistId);
  },

  /**
   * Get available time slots for a stylist. Availability scheduling isn't backed
   * by a real calendar system yet, so this stays synthetic - randomized within
   * the stylist's own weekly availability days would need a booking-conflict
   * model this app doesn't have. Flagged for a future real scheduling pass.
   */
  getAvailableSlots: async (stylistId: string, date: string): Promise<TimeSlot[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));

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
   * Book a session for the real authenticated user
   */
  bookSession: async (
    stylistId: string,
    sessionType: SessionType,
    date: string,
    time: string,
    duration: number
  ): Promise<StylingSession> => {
    return stylistBookingsService.create(getCurrentUserId(), stylistId, sessionType, date, time, duration);
  },

  /**
   * Get user's sessions
   */
  getUserSessions: async (userId: string): Promise<StylingSession[]> => {
    return stylistBookingsService.getForUser(userId);
  },

  /**
   * Search stylists - client-side filter over the (small) real catalog
   */
  searchStylists: async (query: string): Promise<Stylist[]> => {
    const stylists = await stylistsService.getAll();
    const lowerQuery = query.toLowerCase();
    return stylists.filter(s =>
      s.name.toLowerCase().includes(lowerQuery) ||
      s.specialties.some(spec => spec.toLowerCase().includes(lowerQuery)) ||
      s.bio.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Filter stylists - client-side filter over the (small) real catalog
   */
  filterStylists: async (filters: {
    maxRate?: number;
    minRating?: number;
    specialties?: string[];
    sessionTypes?: SessionType[];
  }): Promise<Stylist[]> => {
    const stylists = await stylistsService.getAll();

    return stylists.filter(s => {
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

import { Stylist, StylingSession, StylistReview, TimeSlot, SessionType } from '../types';
import { stylistsService, stylistBookingsService, reviewsService } from './firestore';
import { getCurrentUserId } from './api';
import { stylistAvailabilityService } from './stylistAvailabilityService';

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
   * Real bookable slots, derived from the stylist's published schedule minus
   * their existing bookings, blackout dates and notice period.
   */
  getAvailableSlots: async (
    stylistId: string,
    date: string,
    durationMinutes: number = 60
  ): Promise<TimeSlot[]> => {
    return stylistAvailabilityService.getAvailableSlots(stylistId, date, durationMinutes);
  },

  /** Dates in the coming month that have at least one open slot. */
  getBookableDates: async (stylistId: string, durationMinutes: number = 60): Promise<string[]> => {
    return stylistAvailabilityService.getBookableDates(stylistId, 30, durationMinutes);
  },

  /**
   * Books a session, re-checking the slot immediately beforehand.
   *
   * Without the re-check two people who loaded the same day could both write a
   * booking for the same time; this makes the loser fail loudly instead of
   * silently double-booking the stylist.
   */
  bookSession: async (
    stylistId: string,
    sessionType: SessionType,
    date: string,
    time: string,
    duration: number
  ): Promise<StylingSession> => {
    const stillFree = await stylistAvailabilityService.isStillAvailable(stylistId, date, time, duration);
    if (!stillFree) {
      throw new Error('That time was just taken. Please pick another slot.');
    }
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

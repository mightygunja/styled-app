/**
 * Stylist Availability
 *
 * Real scheduling, replacing the placeholder that invented slots with
 * `Math.random() > 0.3`. A slot is offered only when all four of these hold:
 *
 *   1. it falls inside a window the stylist actually published for that weekday
 *   2. the date is not one they blacked out
 *   3. it is far enough ahead to respect their notice period
 *   4. it does not collide with a booking they already have
 *
 * Times are handled as minutes-from-midnight in the stylist's own published
 * schedule and only formatted for display at the edges, so arithmetic never
 * runs on "2:00 PM" strings.
 */

import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TimeSlot } from '../types';

export interface DayWindow {
  /** 24h "HH:MM". */
  start: string;
  end: string;
}

export interface StylistSchedule {
  stylistId: string;
  /** Keyed '0'(Sunday) through '6'(Saturday). A missing key means not working. */
  weekly: Record<string, DayWindow[]>;
  /** YYYY-MM-DD dates the stylist has blocked out entirely. */
  blackoutDates: string[];
  /** Granularity of offered start times. */
  slotMinutes: number;
  /** Minimum notice before a session can start. */
  leadTimeHours: number;
  updatedAt: string;
}

export const DEFAULT_SCHEDULE: Omit<StylistSchedule, 'stylistId' | 'updatedAt'> = {
  weekly: {
    '1': [{ start: '09:00', end: '17:00' }],
    '2': [{ start: '09:00', end: '17:00' }],
    '3': [{ start: '09:00', end: '17:00' }],
    '4': [{ start: '09:00', end: '17:00' }],
    '5': [{ start: '09:00', end: '17:00' }],
  },
  blackoutDates: [],
  slotMinutes: 60,
  leadTimeHours: 24,
};

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

export function fromMinutes(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Parses the "H:MM AM" display format bookings are stored in, back to minutes. */
export function displayTimeToMinutes(display: string): number | null {
  const match = display.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return hour * 60 + parseInt(match[2], 10);
}

export const stylistAvailabilityService = {
  getSchedule: async (stylistId: string): Promise<StylistSchedule | null> => {
    const snapshot = await getDoc(doc(db, 'stylistSchedules', stylistId));
    return snapshot.exists() ? (snapshot.data() as StylistSchedule) : null;
  },

  saveSchedule: async (
    stylistId: string,
    schedule: Omit<StylistSchedule, 'stylistId' | 'updatedAt'>
  ): Promise<StylistSchedule> => {
    const record: StylistSchedule = {
      ...schedule,
      stylistId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'stylistSchedules', stylistId), record);
    return record;
  },

  /** Minutes-from-midnight already taken on a given date, with each booking's length. */
  getBookedRanges: async (
    stylistId: string,
    date: string
  ): Promise<Array<{ start: number; end: number }>> => {
    // Filtered by stylistId only, then narrowed on date in memory - a
    // stylistId+date composite index would otherwise be needed for what is a
    // very small per-stylist result set.
    const snapshot = await getDocs(
      query(collection(db, 'stylistBookings'), where('stylistId', '==', stylistId))
    );

    return snapshot.docs
      .map(d => d.data() as any)
      .filter(b => b.status !== 'cancelled')
      .map(b => {
        const scheduled: string = b.scheduledDate || '';
        const spaceIndex = scheduled.indexOf(' ');
        if (spaceIndex === -1) return null;
        if (scheduled.slice(0, spaceIndex) !== date) return null;

        const start = displayTimeToMinutes(scheduled.slice(spaceIndex + 1));
        if (start === null) return null;
        return { start, end: start + (typeof b.duration === 'number' ? b.duration : 60) };
      })
      .filter((r): r is { start: number; end: number } => r !== null);
  },

  /**
   * Real bookable slots for one date.
   *
   * Returns every slot inside the stylist's published windows, each flagged
   * available or not, so the UI can show a full day with the taken times
   * visibly greyed rather than silently omitted - a day that looks empty and a
   * day that is fully booked should not look the same.
   */
  getAvailableSlots: async (
    stylistId: string,
    date: string,
    durationMinutes: number = 60
  ): Promise<TimeSlot[]> => {
    const schedule = await stylistAvailabilityService.getSchedule(stylistId);
    if (!schedule) return [];

    if (schedule.blackoutDates?.includes(date)) return [];

    const parsed = new Date(`${date}T00:00:00`);
    if (isNaN(parsed.getTime())) return [];

    const windows = schedule.weekly?.[String(parsed.getDay())] || [];
    if (windows.length === 0) return [];

    const booked = await stylistAvailabilityService.getBookedRanges(stylistId, date);

    const earliestStart = new Date(Date.now() + (schedule.leadTimeHours ?? 0) * 3600_000);
    const slotMinutes = schedule.slotMinutes || 60;

    const slots: TimeSlot[] = [];
    windows.forEach(window => {
      const windowStart = toMinutes(window.start);
      const windowEnd = toMinutes(window.end);

      for (let start = windowStart; start + durationMinutes <= windowEnd; start += slotMinutes) {
        const end = start + durationMinutes;

        const slotDateTime = new Date(parsed);
        slotDateTime.setHours(Math.floor(start / 60), start % 60, 0, 0);

        const withinNotice = slotDateTime.getTime() >= earliestStart.getTime();
        const clashes = booked.some(b => start < b.end && end > b.start);

        slots.push({
          date,
          time: fromMinutes(start),
          available: withinNotice && !clashes,
        });
      }
    });

    return slots;
  },

  /**
   * Re-checks a slot immediately before writing a booking.
   *
   * Two people can load the same day and tap the same slot; without this the
   * second write would silently double-book. Firestore has no cross-document
   * transaction that would prevent it here, so this narrows the window to
   * milliseconds and gives the loser a clear message.
   */
  isStillAvailable: async (
    stylistId: string,
    date: string,
    time: string,
    durationMinutes: number
  ): Promise<boolean> => {
    const slots = await stylistAvailabilityService.getAvailableSlots(stylistId, date, durationMinutes);
    return slots.some(s => s.time === time && s.available);
  },

  /** Dates in the next `days` that have at least one free slot. */
  getBookableDates: async (
    stylistId: string,
    days: number = 30,
    durationMinutes: number = 60
  ): Promise<string[]> => {
    const schedule = await stylistAvailabilityService.getSchedule(stylistId);
    if (!schedule) return [];

    const candidates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      if (schedule.blackoutDates?.includes(iso)) continue;
      if ((schedule.weekly?.[String(d.getDay())] || []).length === 0) continue;
      candidates.push(iso);
    }

    const results = await Promise.all(
      candidates.map(async date => ({
        date,
        open: (await stylistAvailabilityService.getAvailableSlots(stylistId, date, durationMinutes)).some(
          s => s.available
        ),
      }))
    );

    return results.filter(r => r.open).map(r => r.date);
  },
};

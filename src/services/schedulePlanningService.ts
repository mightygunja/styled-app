/**
 * Schedule-Aware Outfit Planning
 *
 * Reads the user's real calendar and dresses them for what they actually have
 * on. Alta plans against your calendar too; the difference here is that the
 * outfit comes from the closet you already own rather than a retail catalogue,
 * and the planner checks what you wore in the last few days so it does not put
 * you in the same shirt twice in one week.
 *
 * Calendar access is read-only and requested at the moment of use. Nothing is
 * written back to the user's calendar.
 */

import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { closetAPI } from './api';
import { styleProfileService } from './firestore';
import { BODY_TYPE_GUIDES } from '../models/personalStyleProfile';
import { getLocalForecast, DailyForecast } from './weatherService';
import { outfitPlannerService, PlannedOutfit, PlannedOutfitItem } from './outfitPlannerService';

const planOutfitsForScheduleFn = httpsCallable(functions, 'planOutfitsForSchedule');

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  location?: string;
  allDay: boolean;
}

export interface PlannedAssignment {
  eventId: string;
  eventTitle: string;
  date: string;
  items: PlannedOutfitItem[];
  dressCode: string;
  reason: string;
}

export class CalendarPermissionError extends Error {
  constructor() {
    super('33 Trends needs calendar access to plan around your schedule. You can grant it in Settings.');
    this.name = 'CalendarPermissionError';
  }
}

/**
 * YYYY-MM-DD in the device's own timezone. weatherService.toISODate goes
 * through toISOString() (UTC), which filed a 7pm dinner in New York under the
 * following day. The planner's date keys are the dates the user sees on their
 * calendar, so they have to be local.
 */
function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * Pulls upcoming events from every calendar on the device.
 *
 * All-day events are kept but marked - a birthday or a public holiday still
 * shapes what you wear even without a time attached.
 */
export async function getUpcomingEvents(daysAhead: number = 7): Promise<ScheduleEvent[]> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    throw new CalendarPermissionError();
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  if (calendars.length === 0) return [];

  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);

  const events = await Calendar.getEventsAsync(
    calendars.map(c => c.id),
    start,
    end
  );

  return events
    .map((event): ScheduleEvent | null => {
      const startDate = new Date(event.startDate as string);
      if (isNaN(startDate.getTime())) return null;
      return {
        id: event.id,
        title: event.title || 'Untitled event',
        // Android stores all-day events at UTC midnight, so their calendar day
        // is the UTC one; everything else is the local day the event starts on.
        date:
          event.allDay && Platform.OS === 'android'
            ? startDate.toISOString().slice(0, 10)
            : toLocalISODate(startDate),
        time: event.allDay ? undefined : formatTime(startDate),
        location: event.location || undefined,
        allDay: !!event.allDay,
      };
    })
    .filter((e): e is ScheduleEvent => e !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Item ids worn in the last `days` days, so the planner can avoid repeats. */
function recentlyWornIds(planned: Record<string, PlannedOutfit>, days: number = 7): string[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = toLocalISODate(cutoff);
  const todayIso = toLocalISODate(new Date());

  return Object.values(planned)
    .filter(p => p.date >= cutoffIso && p.date <= todayIso)
    .flatMap(p => p.items.map(i => i.id));
}

async function buildProfilePayload(userId: string) {
  const profile = await styleProfileService.getStyleProfile(userId);
  if (!profile) return undefined;

  const bodyGuide = profile.bodyAnalysis ? BODY_TYPE_GUIDES[profile.bodyAnalysis.bodyType] : null;
  return {
    colorSeason: profile.colorAnalysis?.season,
    bodyType: bodyGuide?.label,
    bodyRecommendedSilhouettes: profile.bodyAnalysis?.recommendedSilhouettes,
    styleArchetypes: profile.styleArchetypes,
    avoidRules: profile.avoidRules,
  };
}

export interface SchedulePlanResult {
  /** Outfits actually saved - at most one per date. */
  planned: PlannedAssignment[];
  /** Dates with events that were left alone because the user already had a plan there. */
  skippedDates: string[];
}

/**
 * Plans an outfit for each event and persists it to the calendar planner.
 *
 * Anything the model returns is joined back to the real closet before saving,
 * so a hallucinated id becomes a dropped item rather than a broken tile.
 */
export async function planForSchedule(
  userId: string,
  events: ScheduleEvent[]
): Promise<PlannedAssignment[]> {
  return (await planForScheduleDetailed(userId, events)).planned;
}

/**
 * Same as planForSchedule, but also reports the dates it refused to touch.
 * The planner keeps one doc per user+date and save() replaces it wholesale
 * (resetting `worn`), so a date the user already planned is never overwritten
 * here, and two events on one day produce one outfit rather than the second
 * silently replacing the first.
 */
export async function planForScheduleDetailed(
  userId: string,
  allEvents: ScheduleEvent[]
): Promise<SchedulePlanResult> {
  if (allEvents.length === 0) return { planned: [], skippedDates: [] };

  const existing = await outfitPlannerService.getForUser(userId);
  const skippedDates = Array.from(
    new Set(allEvents.filter(e => !!existing[e.date]).map(e => e.date))
  ).sort();
  const events = allEvents.filter(e => !existing[e.date]);
  if (events.length === 0) return { planned: [], skippedDates };

  const dates = events.map(e => e.date).sort();
  const [forecast, closetResponse, styleProfile] = await Promise.all([
    getLocalForecast(dates[0], dates[dates.length - 1]),
    closetAPI.getItems(userId),
    buildProfilePayload(userId),
  ]);
  const recentlyWorn = recentlyWornIds(existing);

  const closetItems: any[] = closetResponse.data || [];
  if (closetItems.length === 0) {
    throw new Error('Add a few items to your closet first — outfits are built from what you own.');
  }

  const result = await planOutfitsForScheduleFn({
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      location: e.location,
      allDay: e.allDay,
    })),
    forecast: forecast.map((d: DailyForecast) => ({
      date: d.date,
      high: d.high,
      low: d.low,
      condition: d.condition,
      precipitationChance: d.precipitationChance,
    })),
    closetItems: closetItems.map(i => ({
      id: i.id,
      category: i.category,
      subcategory: i.subcategory,
      color: i.color,
      seasons: i.seasons,
      style: i.style,
    })),
    styleProfile,
    recentlyWorn,
  });

  const assignments = (result.data as any).data.assignments as Array<{
    eventId: string;
    date: string;
    itemIds: string[];
    dressCode: string;
    reason: string;
  }>;

  const byId = new Map(closetItems.map(i => [i.id, i]));
  const eventsById = new Map(events.map(e => [e.id, e]));

  const mapped: PlannedAssignment[] = assignments
    .map(a => {
      const items: PlannedOutfitItem[] = a.itemIds
        .map(id => byId.get(id))
        .filter(Boolean)
        .map(item => ({
          id: item.id,
          imageUrl: item.imageUrl || '',
          category: item.category || '',
        }));

      if (items.length === 0) return null;

      return {
        eventId: a.eventId,
        eventTitle: eventsById.get(a.eventId)?.title || '',
        // The event's own date wins over whatever the model echoed back.
        date: eventsById.get(a.eventId)?.date || a.date,
        items,
        dressCode: a.dressCode,
        reason: a.reason,
      };
    })
    .filter((a): a is PlannedAssignment => a !== null);

  // One outfit per date, and never on a date that already holds a plan.
  const seenDates = new Set<string>();
  const planned = mapped.filter(a => {
    if (existing[a.date] || seenDates.has(a.date)) return false;
    seenDates.add(a.date);
    return true;
  });

  // Persist into the same planner the calendar screen already reads from.
  await Promise.all(
    planned.map(a =>
      outfitPlannerService.save(userId, a.date, a.items, a.dressCode, a.reason)
    )
  );

  return { planned, skippedDates };
}

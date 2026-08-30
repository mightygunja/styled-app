/**
 * Real Firestore-backed stylist dashboard - computed from the actual
 * stylistBookings and reviews collections built for the marketplace.
 */

import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { StylingSession } from '../types';
import { userProfileService } from './userProfileService';

export interface StylistEarnings {
  totalEarnings: number;
  thisMonth: number;
  lastMonth: number;
  pendingPayouts: number;
  completedSessions: number;
  upcomingSessions: number;
}

export interface ClientInfo {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  totalSessions: number;
  totalSpent: number;
  lastSessionDate: string;
  preferredSessionType: string;
}

export interface DashboardStats {
  totalClients: number;
  averageRating: number;
  totalReviews: number;
  /** Percent (0-100), computed from real bookings. */
  completionRate: number;
}

function toIso(v: any): string {
  return v instanceof Timestamp ? v.toDate().toISOString() : v;
}

async function getBookingsForStylist(stylistId: string): Promise<any[]> {
  const snapshot = await getDocs(query(collection(db, 'stylistBookings'), where('stylistId', '==', stylistId)));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toIso(d.data().createdAt) }));
}

class StylistDashboardService {
  async getEarnings(stylistId: string): Promise<StylistEarnings> {
    const bookings = await getBookingsForStylist(stylistId);
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    const completed = bookings.filter(b => b.status === 'completed');
    const upcoming = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');

    const sum = (list: any[]) => list.reduce((s, b) => s + (b.price || 0), 0);
    const thisMonth = completed.filter(b => new Date(b.createdAt).getTime() >= thisMonthStart);
    const lastMonth = completed.filter(b => {
      const t = new Date(b.createdAt).getTime();
      return t >= lastMonthStart && t < thisMonthStart;
    });

    return {
      totalEarnings: sum(completed),
      thisMonth: sum(thisMonth),
      lastMonth: sum(lastMonth),
      // No payout system exists, so nothing is ever genuinely pending -
      // reporting lifetime earnings as "pending" implied money owed.
      pendingPayouts: 0,
      completedSessions: completed.length,
      upcomingSessions: upcoming.length,
    };
  }

  async getClients(stylistId: string): Promise<ClientInfo[]> {
    const bookings = await getBookingsForStylist(stylistId);
    const byClient = new Map<string, any[]>();
    bookings.forEach(b => {
      const list = byClient.get(b.userId) || [];
      list.push(b);
      byClient.set(b.userId, list);
    });

    const clients = await Promise.all(
      Array.from(byClient.entries()).map(async ([userId, clientBookings]) => {
        const profile = await userProfileService.getUserProfile(userId);
        const sorted = [...clientBookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return {
          id: userId,
          name: profile?.displayName || 'Client',
          email: '',
          profileImageUrl: profile?.profileImageUrl,
          totalSessions: clientBookings.length,
          totalSpent: clientBookings.reduce((s, b) => s + (b.price || 0), 0),
          lastSessionDate: sorted[0]?.createdAt || '',
          preferredSessionType: sorted[0]?.sessionType || '',
        } as ClientInfo;
      })
    );
    return clients;
  }

  async getDashboardStats(stylistId: string): Promise<DashboardStats> {
    const [bookings, reviewSnap] = await Promise.all([
      getBookingsForStylist(stylistId),
      getDocs(query(collection(db, 'reviews'), where('stylistId', '==', stylistId))),
    ]);
    const clients = new Set(bookings.map(b => b.userId));
    const ratings = reviewSnap.docs.map(d => d.data().rating as number);
    const completed = bookings.filter(b => b.status === 'completed').length;

    return {
      totalClients: clients.size,
      averageRating: ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0,
      totalReviews: ratings.length,
      completionRate: bookings.length > 0 ? Math.round((completed / bookings.length) * 100) : 0,
    };
  }

  async getUpcomingSessions(stylistId: string): Promise<StylingSession[]> {
    const bookings = await getBookingsForStylist(stylistId);
    return bookings
      .filter(b => b.status === 'confirmed' || b.status === 'pending')
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()) as StylingSession[];
  }
}

export const stylistDashboardService = new StylistDashboardService();

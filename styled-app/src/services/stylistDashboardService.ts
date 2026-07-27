/**
 * Stylist Dashboard Service
 * 
 * Manages stylist-side functionality including session management,
 * earnings tracking, and client management.
 */

import { StylingSession, Stylist } from '../types';

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
  responseRate: number;
  completionRate: number;
  rebookRate: number;
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

class StylistDashboardService {
  private sessions: Map<string, StylingSession[]> = new Map();
  private clients: Map<string, ClientInfo[]> = new Map();
  private availability: Map<string, AvailabilitySlot[]> = new Map();

  /**
   * Get stylist's sessions
   */
  async getStylistSessions(
    stylistId: string,
    status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  ): Promise<StylingSession[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const allSessions = this.sessions.get(stylistId) || this.getMockSessions(stylistId);
    
    if (status) {
      return allSessions.filter(s => s.status === status);
    }
    
    return allSessions.sort((a, b) => 
      new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
  }

  /**
   * Get stylist earnings
   */
  async getEarnings(stylistId: string): Promise<StylistEarnings> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const sessions = await this.getStylistSessions(stylistId);
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const upcomingSessions = sessions.filter(s => s.status === 'confirmed');
    
    const totalEarnings = completedSessions.reduce((sum, s) => sum + s.price, 0);
    
    // Calculate this month's earnings
    const now = new Date();
    const thisMonthSessions = completedSessions.filter(s => {
      const sessionDate = new Date(s.scheduledDate);
      return sessionDate.getMonth() === now.getMonth() && 
             sessionDate.getFullYear() === now.getFullYear();
    });
    const thisMonth = thisMonthSessions.reduce((sum, s) => sum + s.price, 0);
    
    // Calculate last month's earnings
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    const lastMonthSessions = completedSessions.filter(s => {
      const sessionDate = new Date(s.scheduledDate);
      return sessionDate.getMonth() === lastMonthDate.getMonth() && 
             sessionDate.getFullYear() === lastMonthDate.getFullYear();
    });
    const lastMonth = lastMonthSessions.reduce((sum, s) => sum + s.price, 0);
    
    return {
      totalEarnings,
      thisMonth,
      lastMonth,
      pendingPayouts: thisMonth * 0.85, // 85% after platform fee
      completedSessions: completedSessions.length,
      upcomingSessions: upcomingSessions.length,
    };
  }

  /**
   * Get stylist's clients
   */
  async getClients(stylistId: string): Promise<ClientInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const clients = this.clients.get(stylistId) || this.getMockClients(stylistId);
    return clients.sort((a, b) => 
      new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime()
    );
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(stylistId: string): Promise<DashboardStats> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const sessions = await this.getStylistSessions(stylistId);
    const clients = await this.getClients(stylistId);
    
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const totalSessions = sessions.length;
    
    return {
      totalClients: clients.length,
      averageRating: 4.9,
      totalReviews: 127,
      responseRate: 0.98,
      completionRate: completedSessions.length / Math.max(totalSessions, 1),
      rebookRate: 0.75,
    };
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'confirmed' | 'cancelled' | 'completed'
  ): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In production, would update backend
    console.log(`Session ${sessionId} status updated to ${status}`);
    return true;
  }

  /**
   * Add session notes (stylist-side)
   */
  async addSessionNotes(sessionId: string, notes: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In production, would save to backend
    console.log(`Notes added to session ${sessionId}`);
    return true;
  }

  /**
   * Get availability
   */
  async getAvailability(stylistId: string): Promise<AvailabilitySlot[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.availability.get(stylistId) || this.getMockAvailability(stylistId);
  }

  /**
   * Update availability
   */
  async updateAvailability(
    stylistId: string,
    slots: AvailabilitySlot[]
  ): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.availability.set(stylistId, slots);
    return true;
  }

  /**
   * Get upcoming sessions (next 7 days)
   */
  async getUpcomingSessions(stylistId: string): Promise<StylingSession[]> {
    const sessions = await this.getStylistSessions(stylistId, 'confirmed');
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return sessions.filter(s => {
      const sessionDate = new Date(s.scheduledDate);
      return sessionDate >= now && sessionDate <= nextWeek;
    });
  }

  /**
   * Get session requests (pending approval)
   */
  async getSessionRequests(stylistId: string): Promise<StylingSession[]> {
    return this.getStylistSessions(stylistId, 'pending');
  }

  /**
   * Accept session request
   */
  async acceptSession(sessionId: string): Promise<boolean> {
    return this.updateSessionStatus(sessionId, 'confirmed');
  }

  /**
   * Decline session request
   */
  async declineSession(sessionId: string, reason: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`Session ${sessionId} declined: ${reason}`);
    return this.updateSessionStatus(sessionId, 'cancelled');
  }

  /**
   * Mock sessions for testing
   */
  private getMockSessions(stylistId: string): StylingSession[] {
    const now = new Date();
    
    return [
      {
        id: 'session-1',
        userId: 'user-1',
        stylistId,
        sessionType: 'closet-audit',
        scheduledDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 60,
        status: 'confirmed',
        price: 150,
        createdAt: now.toISOString(),
      },
      {
        id: 'session-2',
        userId: 'user-2',
        stylistId,
        sessionType: 'shopping-assistance',
        scheduledDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 90,
        status: 'confirmed',
        price: 225,
        createdAt: now.toISOString(),
      },
      {
        id: 'session-3',
        userId: 'user-3',
        stylistId,
        sessionType: 'event-styling',
        scheduledDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 120,
        status: 'completed',
        price: 300,
        createdAt: now.toISOString(),
      },
    ];
  }

  /**
   * Mock clients for testing
   */
  private getMockClients(stylistId: string): ClientInfo[] {
    return [
      {
        id: 'user-1',
        name: 'Sarah Martinez',
        email: 'sarah.m@example.com',
        profileImageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
        totalSessions: 3,
        totalSpent: 450,
        lastSessionDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        preferredSessionType: 'closet-audit',
      },
      {
        id: 'user-2',
        name: 'Michael Chen',
        email: 'michael.c@example.com',
        totalSessions: 2,
        totalSpent: 375,
        lastSessionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        preferredSessionType: 'wardrobe-planning',
      },
      {
        id: 'user-3',
        name: 'Jessica Williams',
        email: 'jessica.w@example.com',
        totalSessions: 5,
        totalSpent: 750,
        lastSessionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        preferredSessionType: 'shopping-assistance',
      },
    ];
  }

  /**
   * Mock availability for testing
   */
  private getMockAvailability(stylistId: string): AvailabilitySlot[] {
    return [
      {
        id: 'slot-1',
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '17:00',
        isRecurring: true,
      },
      {
        id: 'slot-2',
        dayOfWeek: 'Tuesday',
        startTime: '09:00',
        endTime: '17:00',
        isRecurring: true,
      },
      {
        id: 'slot-3',
        dayOfWeek: 'Wednesday',
        startTime: '09:00',
        endTime: '17:00',
        isRecurring: true,
      },
      {
        id: 'slot-4',
        dayOfWeek: 'Thursday',
        startTime: '09:00',
        endTime: '17:00',
        isRecurring: true,
      },
    ];
  }
}

export const stylistDashboardService = new StylistDashboardService();

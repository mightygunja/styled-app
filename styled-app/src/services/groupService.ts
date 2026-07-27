/**
 * Group Service
 * 
 * Manages community groups and events.
 */

import { UserProfile } from './userProfileService';

export type GroupPrivacy = 'public' | 'private';
export type MemberRole = 'owner' | 'admin' | 'member';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed';

export interface Group {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  privacy: GroupPrivacy;
  category: string;
  members: number;
  posts: number;
  createdBy: string;
  createdAt: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  user?: UserProfile;
  role: MemberRole;
  joinedAt: string;
}

export interface GroupEvent {
  id: string;
  groupId: string;
  title: string;
  description: string;
  imageUrl?: string;
  location?: string;
  isVirtual: boolean;
  startDate: string;
  endDate: string;
  status: EventStatus;
  attendees: number;
  maxAttendees?: number;
  createdBy: string;
  createdAt: string;
}

export interface EventAttendee {
  eventId: string;
  userId: string;
  user?: UserProfile;
  status: 'going' | 'maybe' | 'not_going';
  registeredAt: string;
}

class GroupService {
  private groups: Map<string, Group> = new Map();
  private members: Map<string, GroupMember[]> = new Map();
  private events: Map<string, GroupEvent[]> = new Map();
  private attendees: Map<string, EventAttendee[]> = new Map();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Get all groups
   */
  async getGroups(category?: string): Promise<Group[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let groups = Array.from(this.groups.values());
    
    if (category) {
      groups = groups.filter(g => g.category === category);
    }
    
    return groups.sort((a, b) => b.members - a.members);
  }

  /**
   * Get group by ID
   */
  async getGroup(groupId: string): Promise<Group | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.groups.get(groupId) || null;
  }

  /**
   * Get user's groups
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const userMemberships = Array.from(this.members.values())
      .flat()
      .filter(m => m.userId === userId);
    
    const groups = userMemberships
      .map(m => this.groups.get(m.groupId))
      .filter(g => g !== undefined) as Group[];
    
    return groups;
  }

  /**
   * Join a group
   */
  async joinGroup(groupId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const group = this.groups.get(groupId);
    if (!group) return false;
    
    const groupMembers = this.members.get(groupId) || [];
    const existing = groupMembers.find(m => m.userId === userId);
    
    if (existing) return false;
    
    const member: GroupMember = {
      groupId,
      userId,
      role: 'member',
      joinedAt: new Date().toISOString(),
    };
    
    groupMembers.push(member);
    this.members.set(groupId, groupMembers);
    
    group.members += 1;
    this.groups.set(groupId, group);
    
    return true;
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const groupMembers = this.members.get(groupId) || [];
    const filtered = groupMembers.filter(m => m.userId !== userId);
    
    if (filtered.length === groupMembers.length) {
      return false; // Not a member
    }
    
    this.members.set(groupId, filtered);
    
    const group = this.groups.get(groupId);
    if (group) {
      group.members = Math.max(0, group.members - 1);
      this.groups.set(groupId, group);
    }
    
    return true;
  }

  /**
   * Check if user is member
   */
  async isMember(groupId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const groupMembers = this.members.get(groupId) || [];
    return groupMembers.some(m => m.userId === userId);
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return this.members.get(groupId) || [];
  }

  /**
   * Get group events
   */
  async getGroupEvents(groupId: string): Promise<GroupEvent[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const events = this.events.get(groupId) || [];
    return events.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  /**
   * Get all upcoming events
   */
  async getUpcomingEvents(): Promise<GroupEvent[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const allEvents = Array.from(this.events.values()).flat();
    const upcoming = allEvents.filter(e => e.status === 'upcoming');
    
    return upcoming.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  /**
   * RSVP to event
   */
  async rsvpEvent(
    eventId: string,
    userId: string,
    status: 'going' | 'maybe' | 'not_going'
  ): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const eventAttendees = this.attendees.get(eventId) || [];
    const existing = eventAttendees.find(a => a.userId === userId);
    
    if (existing) {
      existing.status = status;
    } else {
      const attendee: EventAttendee = {
        eventId,
        userId,
        status,
        registeredAt: new Date().toISOString(),
      };
      eventAttendees.push(attendee);
    }
    
    this.attendees.set(eventId, eventAttendees);
    
    // Update event attendee count
    for (const [groupId, events] of this.events.entries()) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        const going = eventAttendees.filter(a => a.status === 'going').length;
        event.attendees = going;
        this.events.set(groupId, events);
        break;
      }
    }
    
    return true;
  }

  /**
   * Get event attendees
   */
  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return this.attendees.get(eventId) || [];
  }

  /**
   * Initialize mock data
   */
  private initializeMockData() {
    // Mock groups
    const group1: Group = {
      id: 'group-1',
      name: 'Minimalist Fashion',
      description: 'For lovers of simple, clean, and timeless style. Share your minimalist looks and tips!',
      imageUrl: 'https://picsum.photos/seed/group1/400',
      privacy: 'public',
      category: 'Style',
      members: 1234,
      posts: 567,
      createdBy: 'admin',
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const group2: Group = {
      id: 'group-2',
      name: 'Sustainable Style Collective',
      description: 'Building a community around sustainable and ethical fashion choices.',
      imageUrl: 'https://picsum.photos/seed/group2/400',
      privacy: 'public',
      category: 'Sustainability',
      members: 987,
      posts: 432,
      createdBy: 'admin',
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const group3: Group = {
      id: 'group-3',
      name: 'Vintage Lovers',
      description: 'Celebrating vintage fashion from all eras. Share your finds and styling tips!',
      imageUrl: 'https://picsum.photos/seed/group3/400',
      privacy: 'public',
      category: 'Style',
      members: 756,
      posts: 289,
      createdBy: 'admin',
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const group4: Group = {
      id: 'group-4',
      name: 'NYC Fashion Meetup',
      description: 'Local fashion enthusiasts in New York City. Monthly meetups and events!',
      imageUrl: 'https://picsum.photos/seed/group4/400',
      privacy: 'public',
      category: 'Local',
      members: 543,
      posts: 178,
      createdBy: 'admin',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    this.groups.set(group1.id, group1);
    this.groups.set(group2.id, group2);
    this.groups.set(group3.id, group3);
    this.groups.set(group4.id, group4);

    // Mock events
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const event1: GroupEvent = {
      id: 'event-1',
      groupId: 'group-1',
      title: 'Minimalist Wardrobe Workshop',
      description: 'Learn how to build a capsule wardrobe with just 30 pieces. Virtual workshop with Q&A!',
      imageUrl: 'https://picsum.photos/seed/event1/400',
      isVirtual: true,
      startDate: nextWeek.toISOString(),
      endDate: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
      attendees: 45,
      maxAttendees: 100,
      createdBy: 'admin',
      createdAt: now.toISOString(),
    };

    const event2: GroupEvent = {
      id: 'event-2',
      groupId: 'group-2',
      title: 'Sustainable Fashion Swap',
      description: 'Bring clothes you no longer wear and swap with others! Refreshments provided.',
      imageUrl: 'https://picsum.photos/seed/event2/400',
      location: 'Community Center, 123 Main St',
      isVirtual: false,
      startDate: twoWeeks.toISOString(),
      endDate: new Date(twoWeeks.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
      attendees: 32,
      maxAttendees: 50,
      createdBy: 'admin',
      createdAt: now.toISOString(),
    };

    const event3: GroupEvent = {
      id: 'event-3',
      groupId: 'group-4',
      title: 'NYC Fashion Week Meetup',
      description: 'Join us for coffee and fashion talk during NYFW!',
      imageUrl: 'https://picsum.photos/seed/event3/400',
      location: 'Café Noir, SoHo',
      isVirtual: false,
      startDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      status: 'upcoming',
      attendees: 18,
      maxAttendees: 25,
      createdBy: 'admin',
      createdAt: now.toISOString(),
    };

    this.events.set('group-1', [event1]);
    this.events.set('group-2', [event2]);
    this.events.set('group-4', [event3]);
  }
}

export const groupService = new GroupService();

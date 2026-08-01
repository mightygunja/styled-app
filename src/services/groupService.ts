/**
 * Real Firestore-backed community groups and events.
 */

import {
  collection, doc, getDoc, getDocs, addDoc, deleteDoc,
  query, where, orderBy, limit, Timestamp, increment, updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export type GroupPrivacy = 'public' | 'private';
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

function toIso(v: any): string {
  return v instanceof Timestamp ? v.toDate().toISOString() : v;
}

class GroupService {
  async getGroups(): Promise<Group[]> {
    const snapshot = await getDocs(query(collection(db, 'groups'), orderBy('members', 'desc'), limit(50)));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toIso(d.data().createdAt) } as Group));
  }

  async getGroupById(groupId: string): Promise<Group | null> {
    const snap = await getDoc(doc(db, 'groups', groupId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data(), createdAt: toIso(snap.data().createdAt) } as Group;
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const memberSnap = await getDocs(query(collection(db, 'groupMembers'), where('userId', '==', userId)));
    const groupIds = memberSnap.docs.map(d => d.data().groupId as string);
    if (groupIds.length === 0) return [];
    const groups = await Promise.all(groupIds.map(id => this.getGroupById(id)));
    return groups.filter((g): g is Group => g !== null);
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const snap = await getDocs(query(
      collection(db, 'groupMembers'),
      where('groupId', '==', groupId),
      where('userId', '==', userId),
      limit(1)
    ));
    return !snap.empty;
  }

  async joinGroup(groupId: string, userId: string): Promise<void> {
    const already = await this.isMember(groupId, userId);
    if (already) return;
    await addDoc(collection(db, 'groupMembers'), {
      groupId, userId, role: 'member', joinedAt: Timestamp.now(),
    });
    await updateDoc(doc(db, 'groups', groupId), { members: increment(1) });
  }

  async createGroup(userId: string, name: string, description: string, category: string, privacy: GroupPrivacy = 'public'): Promise<Group> {
    const data = {
      name, description, category, privacy,
      members: 1, posts: 0, createdBy: userId, createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'groups'), data);
    await addDoc(collection(db, 'groupMembers'), {
      groupId: docRef.id, userId, role: 'owner', joinedAt: Timestamp.now(),
    });
    return { id: docRef.id, ...data, createdAt: data.createdAt.toDate().toISOString() };
  }

  async getUpcomingEvents(): Promise<GroupEvent[]> {
    const snapshot = await getDocs(query(collection(db, 'groupEvents'), orderBy('startDate', 'asc'), limit(30)));
    const now = Date.now();
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data(), startDate: toIso(d.data().startDate), endDate: toIso(d.data().endDate), createdAt: toIso(d.data().createdAt) } as GroupEvent))
      .filter(e => new Date(e.startDate).getTime() >= now);
  }

  async getEventById(eventId: string): Promise<GroupEvent | null> {
    const snap = await getDoc(doc(db, 'groupEvents', eventId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { id: snap.id, ...data, startDate: toIso(data.startDate), endDate: toIso(data.endDate), createdAt: toIso(data.createdAt) } as GroupEvent;
  }

  async getGroupEvents(groupId: string): Promise<GroupEvent[]> {
    const snapshot = await getDocs(query(collection(db, 'groupEvents'), where('groupId', '==', groupId), orderBy('startDate', 'asc')));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data(), startDate: toIso(d.data().startDate), endDate: toIso(d.data().endDate), createdAt: toIso(d.data().createdAt) } as GroupEvent));
  }

  async isAttending(eventId: string, userId: string): Promise<boolean> {
    const snap = await getDocs(query(
      collection(db, 'eventAttendees'),
      where('eventId', '==', eventId),
      where('userId', '==', userId),
      limit(1)
    ));
    return !snap.empty;
  }

  async rsvpEvent(eventId: string, userId: string, status: 'going' | 'maybe' | 'not_going'): Promise<void> {
    const already = await this.isAttending(eventId, userId);
    if (!already && status === 'going') {
      await addDoc(collection(db, 'eventAttendees'), { eventId, userId, status, registeredAt: Timestamp.now() });
      await updateDoc(doc(db, 'groupEvents', eventId), { attendees: increment(1) });
    }
  }
}

export const groupService = new GroupService();

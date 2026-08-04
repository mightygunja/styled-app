/**
 * Stylist Applications
 *
 * The route from ordinary user to stylist. Applications are reviewed by hand -
 * this is a marketplace where the whole value is that the stylists are good,
 * so self-serve signup would be the wrong call.
 *
 * The applicant writes their own application and can read it back. Nothing here
 * can grant stylist status: approval happens server-side in the
 * reviewStylistApplication Cloud Function, which is the only thing that creates
 * a `stylists/{uid}` record. A client that could write that collection could
 * make itself a stylist.
 */

import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SessionType } from '../types';

export type ApplicationStatus = 'pending' | 'approved' | 'declined';

export const STYLIST_SPECIALTIES = [
  'Capsule wardrobes',
  'Colour analysis',
  'Body & fit',
  'Occasion dressing',
  'Sustainable styling',
  'Career wardrobes',
  'Personal shopping',
  'Closet audits',
] as const;

export const SESSION_TYPE_OPTIONS: Array<{ value: SessionType; label: string }> = [
  { value: 'closet-audit', label: 'Closet audit' },
  { value: 'shopping-assistance', label: 'Personal shopping' },
  { value: 'event-styling', label: 'Event styling' },
  { value: 'wardrobe-planning', label: 'Wardrobe planning' },
];

export interface StylistApplication {
  /** Document id IS the applicant's uid, so approval can key the stylist record off it. */
  id: string;
  userId: string;
  fullName: string;
  email: string;
  bio: string;
  yearsExperience: number;
  hourlyRate: number;
  specialties: string[];
  sessionTypes: SessionType[];
  certifications: string[];
  languages: string[];
  location: string;
  portfolioUrls: string[];
  /** Free text: why they want to work on Styled. Read by a human, not parsed. */
  statement: string;
  status: ApplicationStatus;
  /** Set by the reviewer when declining, so the applicant gets a real answer. */
  reviewNote?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface StylistApplicationInput {
  fullName: string;
  email: string;
  bio: string;
  yearsExperience: number;
  hourlyRate: number;
  specialties: string[];
  sessionTypes: SessionType[];
  certifications: string[];
  languages: string[];
  location: string;
  portfolioUrls: string[];
  statement: string;
}

export const stylistApplicationService = {
  /**
   * Submits or resubmits an application.
   *
   * Keyed by uid rather than auto-id: one person has one application, and a
   * declined applicant reapplying should replace their old submission rather
   * than accumulate a queue of them.
   */
  submit: async (userId: string, input: StylistApplicationInput): Promise<StylistApplication> => {
    const application: StylistApplication = {
      id: userId,
      userId,
      ...input,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'stylistApplications', userId), application);
    return application;
  },

  getMine: async (userId: string): Promise<StylistApplication | null> => {
    const snap = await getDoc(doc(db, 'stylistApplications', userId));
    return snap.exists() ? (snap.data() as StylistApplication) : null;
  },

  /**
   * Admin-side queue. Ordinary users cannot run this - the security rules only
   * permit reading an application whose id matches the caller's own uid.
   */
  getPending: async (): Promise<StylistApplication[]> => {
    const snapshot = await getDocs(
      query(collection(db, 'stylistApplications'), where('status', '==', 'pending'))
    );
    return snapshot.docs
      .map(d => d.data() as StylistApplication)
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  },
};

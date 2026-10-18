/**
 * Admin
 *
 * Every function here is gated server-side by an allowlist of uids in
 * `functions.config().admin.uids`. `isAdmin()` exists only so the client can
 * decide whether to render the entry point - it is a convenience, never a
 * security boundary. A user who forces their way to the admin screen sees it
 * and can do nothing, because each action re-checks.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

const getAdminStatusFn = httpsCallable(functions, 'getAdminStatus');
const getAffiliateAnalyticsFn = httpsCallable(functions, 'getAffiliateAnalytics');
const recordAffiliateRevenueFn = httpsCallable(functions, 'recordAffiliateRevenue');
const getMemberActivityFn = httpsCallable(functions, 'getMemberActivity');

export interface MemberActivity {
  uid: string;
  email: string | null;
  displayName: string | null;
  provider: string;
  disabled: boolean;
  createdAt: number | null;
  lastSignInAt: number | null;
  /** Moves whenever a signed-in app refreshes its token - "last opened". */
  lastRefreshAt: number | null;
  /** Written by the client on every session (presenceService). */
  lastActiveAt: number | null;
  lastPlatform: string | null;
  lastAppVersion: string | null;
  surveyDone: boolean;
  wardrobeFocus: string | null;
  counts: Record<'closetItems' | 'outfits' | 'wishlistItems' | 'affiliateClicks' | 'posts', number | null>;
}

export interface MemberActivityReport {
  generatedAt: number;
  summary: {
    total: number;
    newLast7Days: number;
    newLast30Days: number;
    activeLast7Days: number;
    returned: number;
    withCloset: number;
    surveyDone: number;
  };
  members: MemberActivity[];
}

export interface SurfaceStats {
  surface: string;
  clicks: number;
  clickValue: number;
  potential: number;
  impressions: number;
  impressionValue: number;
  /** null when nothing has been shown yet - not the same as zero. */
  tapThrough: number | null;
}

export interface RevenueRecord {
  id: string;
  period: string;
  network: string;
  gross: number;
  returns: number;
  net: number;
  orders: number;
  note?: string | null;
}

export interface AffiliateAnalytics {
  days: number;
  totals: {
    clicks: number;
    impressions: number;
    clickValue: number;
    potential: number;
    uniqueUsers: number;
    /** Share of clicks from the placeholder catalogue. */
    mockShare: number | null;
  };
  surfaces: SurfaceStats[];
  reasons: Array<{ reason: string; clicks: number; clickValue: number }>;
  retailers: Array<{ retailer: string; clicks: number; clickValue: number }>;
  revenue: RevenueRecord[];
  recorded: {
    net: number;
    orders: number;
    conversion: number | null;
    revenuePerClick: number | null;
  };
}

export async function isAdmin(): Promise<boolean> {
  try {
    const result = await getAdminStatusFn({});
    return !!(result.data as any)?.data?.isAdmin;
  } catch {
    return false;
  }
}

export async function getAffiliateAnalytics(days: number = 30): Promise<AffiliateAnalytics> {
  const result = await getAffiliateAnalyticsFn({ days });
  return (result.data as any).data as AffiliateAnalytics;
}

export async function recordAffiliateRevenue(input: {
  period: string;
  network: string;
  gross: number;
  returns: number;
  orders: number;
  note?: string;
}): Promise<void> {
  await recordAffiliateRevenueFn({ ...input, net: input.gross - input.returns });
}

/** Every account with what it has done. Admin only; the server re-checks. */
export async function getMemberActivity(): Promise<MemberActivityReport> {
  const result = await getMemberActivityFn({});
  return (result.data as any).data as MemberActivityReport;
}

export const adminService = { isAdmin, getAffiliateAnalytics, recordAffiliateRevenue, memberActivity: getMemberActivity };

/**
 * Reports and blocks, as saved (see moderation.ts for the rules).
 *
 *   contentReports/{reporter_type_target}  one per member per thing
 *   blocks/{blocker_blocked}               one per pair
 *
 * The viewer's own state (who they blocked, what they reported) is read once
 * and kept for the session; every change updates it in place and tells the
 * screens that are listening, so a blocked member's posts disappear from a
 * feed that is already on screen.
 *
 * A failed read never empties a feed and never breaks one: the state falls
 * back to "nothing blocked, nothing reported" and is tried again next time.
 */

import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import {
  ModerationState,
  NO_MODERATION,
  ReportTarget,
  blockDocId,
  reportDocId,
  reportKey,
} from './moderation';
import { userProfileService } from './userProfileService';

type Listener = () => void;

export interface BlockedMember {
  userId: string;
  displayName: string;
  username?: string;
  profileImageUrl?: string;
}

/** A report as the admin queue shows it. */
export interface ContentReportRow {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  targetOwnerId: string;
  targetOwnerName: string;
  reason: string;
  note: string;
  reporters: number;
  createdAt: string;
  /** What was reported: the post's caption, the comment, the message - or the member's name. */
  excerpt: string;
  imageUrl?: string;
  /** False when the content has already gone. */
  exists: boolean;
  hidden: boolean;
}

const listContentReportsFn = httpsCallable(functions, 'listContentReports');
const resolveContentReportFn = httpsCallable(functions, 'resolveContentReport');

class ModerationService {
  private cache: { userId: string; blocked: Set<string>; reported: Set<string> } | null = null;
  private loading: Promise<ModerationState> | null = null;
  private listeners = new Set<Listener>();

  /** Who this member has blocked and what they have reported. Never throws. */
  async state(userId: string): Promise<ModerationState> {
    if (!userId || userId === 'anonymous') return NO_MODERATION;
    if (this.cache?.userId === userId) return this.cache;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const [blocks, reports] = await Promise.all([
          getDocs(query(collection(db, 'blocks'), where('blockerId', '==', userId))),
          getDocs(query(collection(db, 'contentReports'), where('reporterId', '==', userId))),
        ]);
        this.cache = {
          userId,
          blocked: new Set(blocks.docs.map(d => String(d.data().blockedId))),
          reported: new Set(reports.docs.map(d => reportKey(d.data().targetType, String(d.data().targetId)))),
        };
        return this.cache as ModerationState;
      } catch (error) {
        console.error('Could not load blocks and reports:', error);
        return NO_MODERATION;
      } finally {
        this.loading = null;
      }
    })();
    return this.loading;
  }

  /** Hears every report, block and unblock made on this device. Returns the unsubscribe. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private changed(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch {
        // One screen's failure must not stop the others hearing about it.
      }
    });
  }

  /** Forget what was read (sign-out, or a different member on this device). */
  reset(): void {
    this.cache = null;
  }

  /**
   * Records a report. The reporter stops seeing the thing at once; the
   * server hides it from everyone once enough different members agree.
   * Reporting the same thing twice is the same report.
   */
  async report(
    reporterId: string,
    target: { type: ReportTarget; id: string; ownerId: string },
    reason: string,
    note: string = ''
  ): Promise<void> {
    await setDoc(doc(db, 'contentReports', reportDocId(reporterId, target.type, target.id)), {
      reporterId,
      targetType: target.type,
      targetId: target.id,
      targetOwnerId: target.ownerId,
      reason,
      note: note.slice(0, 500),
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    await this.state(reporterId);
    if (this.cache?.userId === reporterId) this.cache.reported.add(reportKey(target.type, target.id));
    this.changed();
  }

  /** Blocks a member: their content is hidden from the blocker and they can no longer message them. */
  async block(blockerId: string, blockedId: string): Promise<void> {
    if (!blockedId || blockedId === blockerId) return;
    await setDoc(doc(db, 'blocks', blockDocId(blockerId, blockedId)), {
      blockerId,
      blockedId,
      createdAt: new Date().toISOString(),
    });
    await this.state(blockerId);
    if (this.cache?.userId === blockerId) this.cache.blocked.add(blockedId);
    // A blocker should not keep following the person they blocked.
    userProfileService.unfollowUser(blockerId, blockedId).catch(() => {});
    this.changed();
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await deleteDoc(doc(db, 'blocks', blockDocId(blockerId, blockedId)));
    if (this.cache?.userId === blockerId) this.cache.blocked.delete(blockedId);
    this.changed();
  }

  async hasBlocked(blockerId: string, otherId: string): Promise<boolean> {
    return (await this.state(blockerId)).blocked.has(otherId);
  }

  /**
   * Whether `otherId` has blocked `userId`. Asked before a message is sent.
   * A failed read answers no: it must not stop members talking.
   */
  async isBlockedBy(userId: string, otherId: string): Promise<boolean> {
    try {
      const snapshot = await getDocs(
        query(collection(db, 'blocks'), where('blockedId', '==', userId), where('blockerId', '==', otherId))
      );
      return !snapshot.empty;
    } catch {
      return false;
    }
  }

  /** The members this member has blocked, for the Settings list. */
  async blockedMembers(userId: string): Promise<BlockedMember[]> {
    const { blocked } = await this.state(userId);
    const members = await Promise.all(
      Array.from(blocked).map(async blockedId => {
        const profile = await userProfileService.getUserProfile(blockedId).catch(() => null);
        return {
          userId: blockedId,
          displayName: profile?.displayName || 'Member',
          username: profile?.username,
          profileImageUrl: profile?.profileImageUrl,
        };
      })
    );
    return members.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  // ---- the admin queue (server-checked: admins only) ----

  async listReports(): Promise<ContentReportRow[]> {
    const result = await listContentReportsFn({});
    return ((result.data as any)?.data?.reports || []) as ContentReportRow[];
  }

  /** 'remove' deletes the content (or suspends the member); 'dismiss' keeps it and restores it if it was hidden. */
  async resolveReport(reportId: string, action: 'remove' | 'dismiss'): Promise<void> {
    await resolveContentReportFn({ reportId, action });
  }
}

export const moderationService = new ModerationService();

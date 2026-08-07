/**
 * E-Receipt Forwarding
 *
 * Each user gets a private address to forward order confirmations to. The
 * inbound webhook (receiptInbox in functions/src/index.ts) parses the email
 * and stages the apparel lines here; nothing reaches the closet until the user
 * approves it.
 *
 * The staging step is deliberate. Email is an address anyone can send to, and
 * a forwarded receipt is a claim about what someone bought - it should never
 * write itself into their wardrobe unreviewed.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { closetService } from './firestore';

/** Domain the inbound MX record points at. Must match the Mailgun route. */
export const RECEIPT_INBOX_DOMAIN = 'inbox.thirtythreetrends.com';

export interface PendingReceiptItem {
  description: string;
  category: string;
  brand: string | null;
  color: string | null;
  price: number | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface PendingReceiptImport {
  id: string;
  userId: string;
  retailer: string | null;
  purchaseDate: string | null;
  subject: string;
  items: PendingReceiptItem[];
  status: 'pending' | 'imported' | 'dismissed';
  createdAt: any;
}

/**
 * Generates an unguessable inbox token.
 *
 * Uses crypto-grade randomness where available. The token IS the credential -
 * anyone who knows the address can post receipts into this user's staging
 * queue - so a short or predictable value would be a real weakness.
 */
function generateToken(): string {
  const bytes = new Uint8Array(16);
  const cryptoObj: any = (globalThis as any).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const receiptForwardingService = {
  /**
   * The user's forwarding address, minting one on first use.
   *
   * The token is stored twice - keyed by token so the webhook can resolve it
   * with one lookup, and on the user's own doc so the app can show the address
   * without scanning the token collection.
   */
  getOrCreateAddress: async (userId: string): Promise<string> => {
    const userTokenRef = doc(db, 'userReceiptInbox', userId);
    const existing = await getDoc(userTokenRef);

    if (existing.exists()) {
      const token = (existing.data() as any).token as string;
      return `receipts+${token}@${RECEIPT_INBOX_DOMAIN}`;
    }

    const token = generateToken();
    await setDoc(doc(db, 'receiptInboxTokens', token), {
      userId,
      createdAt: new Date().toISOString(),
    });
    await setDoc(userTokenRef, { userId, token, createdAt: new Date().toISOString() });

    return `receipts+${token}@${RECEIPT_INBOX_DOMAIN}`;
  },

  /** Rotates the address, invalidating the old one. */
  regenerateAddress: async (userId: string): Promise<string> => {
    const userTokenRef = doc(db, 'userReceiptInbox', userId);
    const existing = await getDoc(userTokenRef);
    if (existing.exists()) {
      const oldToken = (existing.data() as any).token as string;
      await deleteDoc(doc(db, 'receiptInboxTokens', oldToken));
    }
    await deleteDoc(userTokenRef);
    return receiptForwardingService.getOrCreateAddress(userId);
  },

  getPending: async (userId: string): Promise<PendingReceiptImport[]> => {
    const snapshot = await getDocs(
      query(collection(db, 'pendingReceiptImports'), where('userId', '==', userId))
    );
    return snapshot.docs
      .map(d => ({ id: d.id, ...(d.data() as any) } as PendingReceiptImport))
      .filter(p => p.status === 'pending');
  },

  /** Approves selected lines from a staged import and writes them to the closet. */
  importItems: async (
    userId: string,
    pending: PendingReceiptImport,
    selectedIndexes: number[]
  ): Promise<number> => {
    const chosen = pending.items.filter((_, i) => selectedIndexes.includes(i));
    if (chosen.length === 0) return 0;

    await Promise.all(
      chosen.map(item =>
        closetService.create(userId, {
          imageUrl: '',
          category: item.category as any,
          subcategory: item.description,
          color: item.color || 'unknown',
          brand: item.brand || undefined,
          price: item.price ?? undefined,
          purchaseDate: pending.purchaseDate || undefined,
          notes: pending.retailer ? `Forwarded from ${pending.retailer}` : 'Forwarded receipt',
          needsPhoto: true,
        } as any)
      )
    );

    await setDoc(doc(db, 'pendingReceiptImports', pending.id), { status: 'imported' }, { merge: true });
    return chosen.length;
  },

  dismiss: async (pendingId: string): Promise<void> => {
    await setDoc(doc(db, 'pendingReceiptImports', pendingId), { status: 'dismissed' }, { merge: true });
  },
};

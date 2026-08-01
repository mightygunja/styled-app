/**
 * Real Firestore-backed saved payment method METADATA only (last4, brand,
 * expiry). This does not process real charges - there's no Stripe/payment
 * processor integration wired up yet, so nothing here actually moves money.
 * The full card number and CVC are never persisted, even though this is a
 * placeholder - storing raw PANs/CVCs is never acceptable, mock or not.
 */

import { collection, doc, getDocs, addDoc, deleteDoc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface PaymentMethod {
  id: string;
  type: 'card';
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

// No real transaction history exists without a payment processor integration
// (see getTransactions below) - kept only so the screen's types resolve.
export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'refunded' | 'failed';
  description: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
}

function detectBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (digits.startsWith('6')) return 'Discover';
  return 'Card';
}

export const paymentMethodsService = {
  validateCardNumber: (cardNumber: string): boolean => {
    const digits = cardNumber.replace(/\D/g, '');
    return digits.length >= 13 && digits.length <= 19;
  },

  formatAmount: (amount: number, currency: string = 'usd'): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  },

  getPaymentMethods: async (userId: string): Promise<PaymentMethod[]> => {
    const snapshot = await getDocs(query(collection(db, 'paymentMethods'), where('userId', '==', userId)));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PaymentMethod));
  },

  addPaymentMethod: async (
    userId: string,
    cardNumber: string,
    expiryMonth: number,
    expiryYear: number,
    _cvc: string // intentionally unused/discarded - never persisted
  ): Promise<PaymentMethod> => {
    const digits = cardNumber.replace(/\D/g, '');
    const existing = await paymentMethodsService.getPaymentMethods(userId);
    const data = {
      userId,
      type: 'card' as const,
      last4: digits.slice(-4),
      brand: detectBrand(digits),
      expiryMonth,
      expiryYear,
      isDefault: existing.length === 0,
    };
    const docRef = await addDoc(collection(db, 'paymentMethods'), data);
    return { id: docRef.id, ...data };
  },

  setDefaultPaymentMethod: async (userId: string, paymentMethodId: string): Promise<boolean> => {
    const methods = await paymentMethodsService.getPaymentMethods(userId);
    const batch = writeBatch(db);
    methods.forEach(m => {
      batch.update(doc(db, 'paymentMethods', m.id), { isDefault: m.id === paymentMethodId });
    });
    await batch.commit();
    return true;
  },

  deletePaymentMethod: async (userId: string, paymentMethodId: string): Promise<boolean> => {
    await deleteDoc(doc(db, 'paymentMethods', paymentMethodId));
    return true;
  },

  // No real transaction history exists without a real payment processor -
  // returning an empty list is the honest answer, not a fabricated one.
  getTransactions: async (_userId: string): Promise<Transaction[]> => {
    return [];
  },
};

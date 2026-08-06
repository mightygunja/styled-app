/**
 * Impression counting.
 *
 * Taps are already recorded individually - they are rare and each one is worth
 * a document. Impressions are not: a single Shop scroll produces dozens, and
 * one document each would cost more in Firestore writes than the affiliate
 * revenue they are meant to measure.
 *
 * So impressions are counted locally and flushed as a per-day, per-surface
 * increment. That gives tap-through a denominator - without it there is no way
 * to tell whether Explore converts better than Shop, only which produced more
 * raw clicks, which is just a function of traffic.
 *
 * What this deliberately does NOT do is identify who saw what. Only counts
 * leave the device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AffiliateSurface } from './firestore';

const PENDING_KEY = 'affiliateImpressions:pending';

/** Flush once this many impressions have accumulated, or on the next app open. */
const FLUSH_THRESHOLD = 40;

type Pending = Record<string, { surface: string; count: number; value: number }>;

function todayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

async function readPending(): Promise<Pending> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Pending) : {};
  } catch {
    return {};
  }
}

async function writePending(pending: Pending): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Losing a batch of impression counts is not worth surfacing to anyone.
  }
}

/**
 * Records that products were shown on a surface.
 *
 * `value` is the summed list price of what was displayed. It is not revenue
 * and must never be presented as such - it is the size of the shop window,
 * useful only as a denominator against the value of what was actually tapped.
 */
export async function recordImpressions(
  surface: AffiliateSurface,
  productPrices: number[]
): Promise<void> {
  if (productPrices.length === 0) return;

  const key = `${todayKey()}:${surface}`;
  const pending = await readPending();
  const bucket = pending[key] || { surface, count: 0, value: 0 };

  bucket.count += productPrices.length;
  bucket.value += productPrices.reduce((sum, p) => sum + (p || 0), 0);
  pending[key] = bucket;

  const total = Object.values(pending).reduce((sum, b) => sum + b.count, 0);
  if (total >= FLUSH_THRESHOLD) {
    await flush(pending);
    return;
  }

  await writePending(pending);
}

/**
 * Writes accumulated counts to Firestore and clears the local buffer.
 *
 * Increments rather than sets, so several devices and several sessions in a
 * day accumulate correctly instead of overwriting each other.
 */
export async function flush(prefetched?: Pending): Promise<void> {
  const pending = prefetched ?? (await readPending());
  const entries = Object.entries(pending);
  if (entries.length === 0) return;

  // Clear first. A failed write costs a batch of counts; a failed clear would
  // double-count every batch after it, which is worse than losing one.
  await writePending({});

  await Promise.all(
    entries.map(([key, bucket]) => {
      const [day] = key.split(':');
      return setDoc(
        doc(db, 'affiliateDaily', day),
        {
          day,
          impressions: { [bucket.surface]: increment(bucket.count) },
          impressionValue: { [bucket.surface]: increment(Math.round(bucket.value)) },
        },
        { merge: true }
      ).catch(error => {
        console.log('Impression flush failed', error);
      });
    })
  );
}

export const affiliateImpressions = { recordImpressions, flush };

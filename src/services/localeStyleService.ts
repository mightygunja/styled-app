/**
 * Locale style.
 *
 * "What does this user's city actually dress like?" - the local half of
 * trend personalization. The `getLocaleStyle` Cloud Function generates a
 * style-scene profile for a city once (GPT, validated) and caches it in
 * Firestore, so everyone in the same city shares one generation; this
 * service adds a device-side cache on top and degrades to undefined on any
 * failure, because locale flavour must never block a trend surface.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

const getLocaleStyleFn = httpsCallable(functions, 'getLocaleStyle');

const STORAGE_PREFIX = '@styled_locale_style:';
const DEVICE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface LocaleStyle {
  /** "Naperville, Illinois, United States" - as generated for. */
  label: string;
  /** Lowercase vibe words for the local scene, e.g. ["practical", "polished-casual"]. */
  vibes: string[];
  /** Style archetype keys (minimal/polished/relaxed/...) the scene leans toward. */
  archetypes: string[];
  /** Style capitals whose trends read naturally in this place. */
  regionAffinities: string[];
  /** One sentence on how people actually dress there. */
  summary: string;
}

const memoryCache = new Map<string, LocaleStyle | null>();

function keyFor(city: string, region?: string, country?: string): string {
  return [city, region, country]
    .filter(Boolean)
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, '-');
}

function normalize(data: any): LocaleStyle | null {
  if (!data || typeof data.summary !== 'string') return null;
  const strings = (v: any): string[] =>
    Array.isArray(v) ? v.filter((s: any) => typeof s === 'string' && s.trim()).map(String) : [];
  return {
    label: String(data.label || ''),
    vibes: strings(data.vibes),
    archetypes: strings(data.archetypes).map(a => a.toLowerCase()),
    regionAffinities: strings(data.regionAffinities),
    summary: data.summary,
  };
}

/**
 * The style scene for a place. Undefined when the place is unknown or the
 * function is unreachable - callers treat that as "no locale signal".
 */
export async function getLocaleStyle(
  city?: string,
  region?: string,
  country?: string
): Promise<LocaleStyle | undefined> {
  if (!city) return undefined;
  const key = keyFor(city, region, country);

  if (memoryCache.has(key)) return memoryCache.get(key) ?? undefined;

  // Device cache: a city's style scene moves slower than any TTL here.
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + key);
    if (raw) {
      const stored = JSON.parse(raw);
      if (Date.now() - (stored.at || 0) < DEVICE_TTL_MS) {
        const cached = normalize(stored.style);
        memoryCache.set(key, cached);
        return cached ?? undefined;
      }
    }
  } catch {}

  try {
    const result = await getLocaleStyleFn({ city, region, country });
    const style = normalize((result.data as any)?.data);
    memoryCache.set(key, style);
    if (style) {
      AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ at: Date.now(), style })).catch(
        () => {}
      );
    }
    return style ?? undefined;
  } catch (error) {
    console.log('Locale style unavailable', error);
    memoryCache.set(key, null);
    return undefined;
  }
}

export const localeStyleService = { getLocaleStyle };

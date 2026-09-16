/**
 * Style location.
 *
 * Where the app should dress the user for, when that is not where the
 * device says they are: a traveller landing in Marrakesh tomorrow, a user
 * whose IP resolves to the wrong city, or anyone who wants to see what the
 * report looks like somewhere else. Set from the Trend Report; read by
 * weatherService, which then hands every surface that place's weather,
 * season and street style instead of the device's.
 *
 * Stored on device only. Clearing it returns the app to device location.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@styled_style_location:v1';

export interface StyleLocation {
  city: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  setAt: string;
}

let memory: StyleLocation | null | undefined;

export async function getStyleLocation(): Promise<StyleLocation | null> {
  if (memory !== undefined) return memory;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as StyleLocation) : null;
    memory =
      parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number' && parsed.city
        ? parsed
        : null;
  } catch {
    memory = null;
  }
  return memory;
}

export async function setStyleLocation(location: Omit<StyleLocation, 'setAt'> | null): Promise<void> {
  memory = location ? { ...location, setAt: new Date().toISOString() } : null;
  try {
    if (memory) await AsyncStorage.setItem(KEY, JSON.stringify(memory));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // Losing the override only means the device location is used next time.
  }
}

export const styleLocationService = { getStyleLocation, setStyleLocation };

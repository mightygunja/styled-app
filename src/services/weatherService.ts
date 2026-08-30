/**
 * Weather Service
 *
 * Fetches real weather (no API key required):
 * - Location via device GPS (expo-location), falling back to IP geolocation
 *   (ipapi.co) when GPS permission is denied or unavailable
 * - Current conditions via Open-Meteo
 * - Destination search + multi-day forecast via Open-Meteo, used by trip
 *   packing so a packing list is built against the weather where the user is
 *   actually going rather than where they are now
 */

import * as Location from 'expo-location';
import { WeatherCondition } from './recommendationEngine';

export interface CurrentWeather {
  condition: WeatherCondition;
  temperature: number;
  city?: string;
  /** State/province, when the geocoder reports one. */
  region?: string;
  country?: string;
}

function mapWeatherCode(code: number, temperatureF: number): WeatherCondition {
  // WMO weather interpretation codes (used by Open-Meteo)
  if (code >= 71 && code <= 77) return 'snowy';
  if (code >= 85 && code <= 86) return 'snowy';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) return 'rainy';
  if (temperatureF <= 40) return 'cold';
  if (temperatureF >= 85) return 'hot';
  if (code === 0 || code === 1) return 'sunny';
  if (code >= 2 && code <= 48) return 'cloudy';
  return 'sunny';
}

interface Coords {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
}

async function getDeviceCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    let granted = status === 'granted';
    if (!granted) {
      const request = await Location.requestForegroundPermissionsAsync();
      granted = request.status === 'granted';
    }
    if (!granted) return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;

    let city: string | undefined;
    let region: string | undefined;
    let country: string | undefined;
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      city = place?.city || place?.subregion || undefined;
      region = place?.region || undefined;
      country = place?.country || undefined;
    } catch {
      // reverse geocoding is best-effort; weather still works without a city label
    }

    return { latitude, longitude, city, region, country };
  } catch (error) {
    console.log('Could not get device GPS location', error);
    return null;
  }
}

async function getIpCoords(): Promise<Coords | null> {
  try {
    const geoController = new AbortController();
    const geoTimeout = setTimeout(() => geoController.abort(), 5000);
    const geoRes = await fetch('https://ipapi.co/json/', { signal: geoController.signal });
    clearTimeout(geoTimeout);
    if (!geoRes.ok) return null;
    const geo = await geoRes.json();

    const { latitude, longitude, city, region, country_name: countryName } = geo;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    return {
      latitude,
      longitude,
      city: typeof city === 'string' ? city : undefined,
      region: typeof region === 'string' ? region : undefined,
      country: typeof countryName === 'string' ? countryName : undefined,
    };
  } catch (error) {
    console.log('Could not fetch IP-based location', error);
    return null;
  }
}

/**
 * Real conditions or nothing. Returns null when location or the forecast
 * cannot be fetched - callers render without a weather line and skip weather
 * scoring, rather than presenting an invented 72°-and-sunny as fact.
 */
export async function getCurrentWeather(): Promise<CurrentWeather | null> {
  try {
    const coords = (await getDeviceCoords()) || (await getIpCoords());
    if (!coords) return null;

    const weatherController = new AbortController();
    const weatherTimeout = setTimeout(() => weatherController.abort(), 5000);
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`,
      { signal: weatherController.signal }
    );
    clearTimeout(weatherTimeout);
    if (!weatherRes.ok) return null;
    const data = await weatherRes.json();

    const temperature = Math.round(data.current?.temperature_2m);
    const code = data.current?.weather_code;
    if (typeof temperature !== 'number' || isNaN(temperature) || typeof code !== 'number') {
      return null;
    }

    return {
      condition: mapWeatherCode(code, temperature),
      temperature,
      city: coords.city,
      region: coords.region,
      country: coords.country,
    };
  } catch (error) {
    console.log('Could not fetch real weather', error);
    return null;
  }
}

// ==================== DESTINATION SEARCH & FORECAST ====================

export interface DestinationMatch {
  id: number;
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

/** Human-readable one-liner for a destination, e.g. "Lisbon, Portugal". */
export function formatDestination(d: DestinationMatch): string {
  return [d.name, d.region, d.country].filter(Boolean).join(', ');
}

/**
 * Free-text destination lookup (Open-Meteo geocoding, no API key). Returns [] on
 * any failure so the caller can fall back to a manual temperature entry rather
 * than blocking the user out of the feature entirely.
 */
export async function searchDestinations(queryText: string): Promise<DestinationMatch[]> {
  const trimmed = queryText.trim();
  if (trimmed.length < 2) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=6&language=en&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data?.results)) return [];

    return data.results
      .filter((r: any) => typeof r?.latitude === 'number' && typeof r?.longitude === 'number')
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        region: typeof r.admin1 === 'string' ? r.admin1 : undefined,
        country: typeof r.country === 'string' ? r.country : undefined,
        latitude: r.latitude,
        longitude: r.longitude,
      }));
  } catch (error) {
    console.log('Destination search failed', error);
    return [];
  }
}

/**
 * Multi-day forecast where the user actually is, for schedule-aware outfit
 * planning. Returns [] when location is unavailable so callers can plan on
 * dress code alone rather than inventing weather.
 */
export async function getLocalForecast(startDate: string, endDate: string): Promise<DailyForecast[]> {
  const coords = (await getDeviceCoords()) || (await getIpCoords());
  if (!coords) return [];
  return getDestinationForecast(coords.latitude, coords.longitude, startDate, endDate);
}

export interface DailyForecast {
  date: string; // YYYY-MM-DD
  high: number;
  low: number;
  condition: WeatherCondition;
  precipitationChance: number;
  /**
   * True when the day falls outside Open-Meteo's ~16-day forecast horizon and
   * the values are carried from the trip's forecast days instead. Surfaced in
   * the UI so a long-lead trip never presents an estimate as a real forecast.
   */
  estimated: boolean;
}

const MS_PER_DAY = 86_400_000;

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function eachDateBetween(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return [];

  const dates: string[] = [];
  // Guard against a mistyped multi-year range turning into an unbounded loop.
  for (let t = start; t <= end && dates.length < 60; t += MS_PER_DAY) {
    dates.push(toISODate(new Date(t)));
  }
  return dates;
}

/**
 * Daily forecast for a destination across a date range. Days beyond the
 * provider's horizon are filled from the average of the days we did get and
 * flagged `estimated`, so a trip three months out still produces a usable
 * packing list without pretending to know the weather.
 */
export async function getDestinationForecast(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<DailyForecast[]> {
  const allDates = eachDateBetween(startDate, endDate);
  if (allDates.length === 0) return [];

  let fetched: DailyForecast[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max` +
        `&temperature_unit=fahrenheit&timezone=auto&start_date=${startDate}&end_date=${endDate}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const days: string[] = data?.daily?.time || [];
      fetched = days
        .map((date: string, i: number) => {
          const high = Math.round(data.daily.temperature_2m_max?.[i]);
          const low = Math.round(data.daily.temperature_2m_min?.[i]);
          const code = data.daily.weather_code?.[i];
          if (isNaN(high) || isNaN(low) || typeof code !== 'number') return null;
          return {
            date,
            high,
            low,
            condition: mapWeatherCode(code, high),
            precipitationChance: Math.round(data.daily.precipitation_probability_max?.[i] ?? 0),
            estimated: false,
          };
        })
        .filter((d: DailyForecast | null): d is DailyForecast => d !== null);
    }
  } catch (error) {
    console.log('Destination forecast failed', error);
  }

  if (fetched.length === 0) return [];

  const byDate = new Map(fetched.map(d => [d.date, d]));
  const avgHigh = Math.round(fetched.reduce((s, d) => s + d.high, 0) / fetched.length);
  const avgLow = Math.round(fetched.reduce((s, d) => s + d.low, 0) / fetched.length);
  const avgPrecip = Math.round(fetched.reduce((s, d) => s + d.precipitationChance, 0) / fetched.length);

  return allDates.map(date => {
    const real = byDate.get(date);
    if (real) return real;
    return {
      date,
      high: avgHigh,
      low: avgLow,
      condition: mapWeatherCode(avgPrecip > 50 ? 61 : 1, avgHigh),
      precipitationChance: avgPrecip,
      estimated: true,
    };
  });
}

/**
 * Weather Service
 *
 * Fetches real current weather (no API key required):
 * - Approximate location via ipapi.co (IP geolocation)
 * - Current conditions via Open-Meteo
 */

import { WeatherCondition } from './recommendationEngine';

export interface CurrentWeather {
  condition: WeatherCondition;
  temperature: number;
}

const FALLBACK_WEATHER: CurrentWeather = { condition: 'sunny', temperature: 72 };

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

export async function getCurrentWeather(): Promise<CurrentWeather> {
  try {
    const geoController = new AbortController();
    const geoTimeout = setTimeout(() => geoController.abort(), 5000);
    const geoRes = await fetch('https://ipapi.co/json/', { signal: geoController.signal });
    clearTimeout(geoTimeout);
    if (!geoRes.ok) return FALLBACK_WEATHER;
    const geo = await geoRes.json();

    const { latitude, longitude } = geo;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return FALLBACK_WEATHER;

    const weatherController = new AbortController();
    const weatherTimeout = setTimeout(() => weatherController.abort(), 5000);
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`,
      { signal: weatherController.signal }
    );
    clearTimeout(weatherTimeout);
    if (!weatherRes.ok) return FALLBACK_WEATHER;
    const data = await weatherRes.json();

    const temperature = Math.round(data.current?.temperature_2m);
    const code = data.current?.weather_code;
    if (typeof temperature !== 'number' || isNaN(temperature) || typeof code !== 'number') {
      return FALLBACK_WEATHER;
    }

    return { condition: mapWeatherCode(code, temperature), temperature };
  } catch (error) {
    console.log('Could not fetch real weather, using fallback', error);
    return FALLBACK_WEATHER;
  }
}

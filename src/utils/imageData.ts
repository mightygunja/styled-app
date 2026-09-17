/**
 * Reading a picked photo as base64, on every platform.
 *
 * Every photo flow (Add Item, Create Post, colour and body analysis, the
 * in-store check, try-on, receipt import, profile photo, before/after) read
 * the file with expo-file-system's readAsStringAsync. That module has no web
 * implementation, so on the Vercel build each of those flows threw the
 * moment a photo was chosen (full-app audit, 2026-09-17). On web the picker
 * hands back a blob: or data: URI, which the browser can read directly.
 *
 * Returns raw base64 with no data-URL prefix, exactly what
 * readAsStringAsync(uri, { encoding: 'base64' }) returned, so call sites
 * change by one line.
 */

import { Platform } from 'react-native';
import { readAsStringAsync } from 'expo-file-system/legacy';

function stripPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

export async function readImageAsBase64(uri: string): Promise<string> {
  if (Platform.OS !== 'web') {
    return readAsStringAsync(uri, { encoding: 'base64' });
  }

  // Already a data URL: the payload is the base64.
  if (uri.startsWith('data:')) return stripPrefix(uri);

  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that photo.'));
    reader.onloadend = () => resolve(stripPrefix(String(reader.result || '')));
    reader.readAsDataURL(blob);
  });
}

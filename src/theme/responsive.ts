/**
 * Web responsiveness.
 *
 * The app is phone-first; on a desktop browser it must read as a real web
 * app, not a phone screen floating in space. The approach: full-bleed
 * chrome (top nav bar), and per-surface content widths — wide for grids
 * (closet, shop), reading-width for column screens (home, settings).
 *
 * Native never hits any of this: every helper collapses to the phone
 * behaviour unless Platform.OS === 'web' and the window is desktop-sized.
 */
import { Platform, useWindowDimensions } from 'react-native';

export const DESKTOP_MIN_WIDTH = 1024;

export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
}

/** Grid column count for the closet/shop card grids. */
export function useGridColumns(): number {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return 2;
  if (width >= 1440) return 5;
  if (width >= DESKTOP_MIN_WIDTH) return 4;
  if (width >= 768) return 3;
  return 2;
}

/**
 * Pads grid data to a multiple of the column count so the last row of a
 * space-between grid doesn't fling two items to opposite edges. Render a
 * transparent placeholder for entries where `isGridSpacer` returns true.
 */
export const GRID_SPACER_PREFIX = '__grid_spacer__';

export function padToColumns<T extends { id: string }>(data: T[], columns: number): T[] {
  const remainder = data.length % columns;
  if (remainder === 0) return data;
  const spacers = Array.from({ length: columns - remainder }, (_, i) => ({
    id: `${GRID_SPACER_PREFIX}${i}`,
  })) as T[];
  return [...data, ...spacers];
}

export function isGridSpacer(item: { id?: string }): boolean {
  return typeof item?.id === 'string' && item.id.startsWith(GRID_SPACER_PREFIX);
}

/** Item width for an N-column space-between grid with modest gutters. */
export function gridItemWidth(columns: number): `${number}%` {
  // 2 -> 48%, 3 -> 31.5%, 4 -> 23.5%, 5 -> 18.5%
  const gutterShare = columns === 2 ? 4 : columns * 1.5 + 1;
  return `${(100 - gutterShare) / columns}%` as `${number}%`;
}

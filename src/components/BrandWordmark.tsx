/**
 * The 33 Trends wordmark, as a component.
 *
 * Renders the brand's actual logotype — the stacked "33." numerals over the
 * letterspaced "TRENDS" — from a single trimmed PNG
 * (assets/brand/wordmark-color.png, black + brand rust on transparent), so
 * the mark is identical everywhere it appears. A white variant
 * (wordmark-white.png) exists for dark surfaces.
 *
 * `header`: sized for a nav bar row.
 * `hero`: large, for the login screen — left-aligned to sit on the screen's
 *         editorial grid.
 */

import React from 'react';
import { Image, StyleSheet } from 'react-native';

// Trimmed to the ink bounding box; 1570x1036.
const WORDMARK_RATIO = 1570 / 1036;

interface Props {
  variant?: 'header' | 'hero';
  /** Use the white artwork on dark surfaces. */
  tone?: 'color' | 'white';
}

export default function BrandWordmark({ variant = 'header', tone = 'color' }: Props) {
  const source =
    tone === 'white'
      ? require('../../assets/brand/wordmark-white.png')
      : require('../../assets/brand/wordmark-color.png');

  return (
    <Image
      source={source}
      style={variant === 'hero' ? styles.hero : styles.header}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="33 Trends"
    />
  );
}

const styles = StyleSheet.create({
  // The stacked mark is nearly square, so a nav row carries it taller and
  // narrower than the old wide script did.
  header: {
    height: 36,
    width: 36 * WORDMARK_RATIO,
  },
  hero: {
    width: 200,
    height: 200 / WORDMARK_RATIO,
  },
});

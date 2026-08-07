/**
 * The 33 Trends wordmark, as a component.
 *
 * Exactly the same lockup as the generated icon and splash - Playfair "33",
 * camel rule, TRENDS letterspaced in Instrument Sans - so the brand is one
 * drawing everywhere it appears. Rendered as text rather than an image
 * because the fonts are already loaded, it stays crisp at any scale, and the
 * colours come from the tokens instead of being baked into pixels.
 *
 * `header`: horizontal, sized for a nav bar row.
 * `hero`: stacked, for the login screen - the splash lockup, left-aligned to
 *         sit on the screen's editorial grid.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/designSystem';

interface Props {
  variant?: 'header' | 'hero';
}

export default function BrandWordmark({ variant = 'header' }: Props) {
  if (variant === 'hero') {
    return (
      <View>
        <Text style={styles.heroNumerals}>33</Text>
        <View style={styles.heroRow}>
          <View style={styles.heroRule} />
          <Text style={styles.heroTrends}>TRENDS</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.headerRow}>
      <Text style={styles.headerNumerals}>33</Text>
      <Text style={styles.headerTrends}>TRENDS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Baseline alignment is what makes a two-font lockup read as one mark
  // rather than two labels that happen to be adjacent.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
  },
  headerNumerals: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.ink,
  },
  headerTrends: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2.6,
    color: colors.tobacco,
  },

  heroNumerals: {
    fontFamily: fonts.serif,
    fontSize: 64,
    lineHeight: 68,
    color: colors.ink,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  heroRule: {
    width: 26,
    height: 2,
    backgroundColor: colors.camel,
  },
  heroTrends: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    letterSpacing: 3.4,
    color: colors.tobacco,
  },
});

/**
 * Trend Remix card - the Home surface of the trend layer.
 *
 * One trend, one claim: here is what is moving in the world right now, and
 * here is how you already own it. When the closet can anchor the trend the
 * card costs the user nothing to act on, which is what earns the trend layer
 * its trust before Shop ever pitches a stretch piece.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendRemix, anchorDisplayLabel } from '../services/trendRemixService';
import { colors, fonts, type as textType } from '../theme/designSystem';

interface Props {
  remix: TrendRemix;
  onOpenReport: () => void;
}

export default function TrendRemixCard({ remix, onOpenReport }: Props) {
  const { trend, anchors, wearableToday, gapLine } = remix;

  const wearLine = wearableToday
    ? `You can already wear it: your ${anchors
        .slice(0, 2)
        .map(anchorDisplayLabel)
        .join(' + ')}.`
    : gapLine;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Trend remix: ${trend.name}. Open the Trend Report`}
      onPress={onOpenReport}
    >
      <Text style={styles.eyebrow}>
        TREND REMIX · {trend.stage.toUpperCase()} IN {trend.region.toUpperCase()}
      </Text>
      <Text style={styles.name}>{trend.name}</Text>
      {/* When a trend crosses one of their "nevers", the card owns it -
          that's the deal that lets trend seep past the preference at all. */}
      {!!remix.challengesAvoidRule && (
        <Text style={styles.challengeLine}>
          You usually skip {remix.challengesAvoidRule} — this might be the trend that changes your
          mind.
        </Text>
      )}
      {!!wearLine && <Text style={styles.wearLine}>{wearLine}</Text>}
      <Text style={styles.stylingNote}>{trend.stylingNote}</Text>
      <Text style={styles.cta}>The full Trend Report →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 18,
    backgroundColor: colors.paper,
    borderLeftWidth: 2,
    borderLeftColor: colors.camel,
  },
  eyebrow: { ...textType.eyebrow, fontSize: 9, color: colors.camel },
  name: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 27, color: colors.ink, marginTop: 8 },
  challengeLine: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    lineHeight: 19,
    color: colors.tobacco,
    marginTop: 6,
  },
  wearLine: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
    marginTop: 8,
  },
  stylingNote: { ...textType.body, fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginTop: 6 },
  cta: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.tobacco, marginTop: 12 },
});

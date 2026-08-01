import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, fonts } from '../theme/designSystem';
import PressableScale from './PressableScale';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function Chip({ label, active = false, onPress, style }: ChipProps) {
  return (
    <PressableScale
      style={[styles.chip, active && styles.chipActive, style]}
      onPress={onPress}
      disabled={!onPress}
      haptic="select"
      scaleTo={0.94}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label.toUpperCase()}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.ink,
  },
  labelActive: {
    color: colors.bone,
  },
});

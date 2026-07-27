import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, shadow } from '../theme/designSystem';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export default function Card({ children, style, elevated = false }: CardProps) {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 0,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  elevated: {
    ...shadow.card,
    borderWidth: 0,
  },
});

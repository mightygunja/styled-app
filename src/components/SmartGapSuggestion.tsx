/**
 * Smart Gap Suggestion Component
 * 
 * Plus tier feature: Shows subtle, optional suggestion for strategic wardrobe additions.
 * 
 * CRITICAL: Never pushy. Always "no rush."
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts } from '../theme/designSystem';

interface SmartGapSuggestionProps {
  message: string;
  onDismiss?: () => void;
}

export default function SmartGapSuggestion({ message, onDismiss }: SmartGapSuggestionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>💡</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 24,
  },
  message: {
    flex: 1,
    fontSize: 15,
    color: colors.inkMuted,
    lineHeight: 22,
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  dismissText: {
    fontSize: 28,
    color: colors.inkFaint,
    fontFamily: fonts.sans,
  },
});

/**
 * Trial Reminder Banner Component
 * 
 * Appears once on Day 5 of trial. Dismissible, low-pressure.
 * 
 * Copy principles:
 * - Reassures instead of pressures
 * - Clear timeline without anxiety
 * - Easy cancellation transparency
 * - Optional CTA, low emphasis
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, radius } from '../theme/designSystem';

interface TrialReminderBannerProps {
  daysRemaining: number;
  onDismiss: () => void;
  onViewOptions: () => void;
}

export default function TrialReminderBanner({
  daysRemaining,
  onDismiss,
  onViewOptions,
}: TrialReminderBannerProps) {
  return (
    <View style={styles.container}>
      {/* Dismiss button - top right */}
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Text style={styles.dismissIcon}>×</Text>
      </TouchableOpacity>

      {/* Primary copy - value-focused */}
      <Text style={styles.primaryCopy}>
        You're in your free trial.{'\n'}
        33 Trends will keep refining outfits based on your style profile.
      </Text>

      {/* Secondary copy - timeline + cancellation */}
      <Text style={styles.secondaryCopy}>
        Trial ends in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}.{'\n'}
        Cancel anytime in App Store settings.
      </Text>

      {/* CTA - optional, low emphasis */}
      <TouchableOpacity 
        style={styles.ctaButton} 
        onPress={onViewOptions}
      >
        <Text style={styles.ctaText}>View membership options</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.hair,
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissIcon: {
    fontSize: 28,
    color: colors.inkFaint,
    fontFamily: fonts.sans,
  },
  primaryCopy: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    lineHeight: 24,
    marginBottom: 12,
    paddingRight: 32, // Space for dismiss button
  },
  secondaryCopy: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaButton: {
    borderRadius: radius.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
  },
});

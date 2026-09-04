/**
 * Trial Status Card Component
 * 
 * Passive informational card showing trial status.
 * 
 * Placement:
 * - Settings screen (always visible)
 * - OR bottom of Outfits screen (after content)
 * 
 * NOT a modal, NOT blocking.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { colors, fonts, radius } from '../theme/designSystem';

interface TrialStatusCardProps {
  trialEndDate: Date;
  placement?: 'settings' | 'outfits';
}

export default function TrialStatusCard({
  trialEndDate,
  placement = 'settings',
}: TrialStatusCardProps) {
  const handleManageSubscription = () => {
    // Open App Store subscriptions
    Linking.openURL('https://apps.apple.com/account/subscriptions');
  };

  const now = new Date();
  const daysUntilEnd = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isEndingSoon = daysUntilEnd <= 1;

  return (
    <View style={[
      styles.container,
      placement === 'outfits' && styles.outfitsPlacement
    ]}>
      <Text style={styles.header}>
        {isEndingSoon ? 'Trial ending soon' : 'Trial Status'}
      </Text>
      
      <Text style={styles.status}>
        {isEndingSoon 
          ? 'Your free trial ends tomorrow.\nStyled will continue with your current plan unless you cancel.'
          : 'You\'re in your free trial.'
        }
      </Text>

      <Text style={styles.transparency}>
        Manage or cancel anytime in App Store settings.
      </Text>

      <View style={styles.ctaContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => {/* Continue with 33 Trends - dismiss card */}}
        >
          <Text style={styles.primaryButtonText}>
            Continue with 33 Trends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleManageSubscription}
        >
          <Text style={styles.secondaryButtonText}>
            Manage subscription
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  outfitsPlacement: {
    marginTop: 24,
    marginBottom: 32,
  },
  header: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  status: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
    marginBottom: 12,
  },
  transparency: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaContainer: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: radius.full,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: colors.sand,
  },
  secondaryButton: {
    borderRadius: radius.full,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
});

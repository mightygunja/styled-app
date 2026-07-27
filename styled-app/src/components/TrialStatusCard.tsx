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
          onPress={() => {/* Continue with Styled - dismiss card */}}
        >
          <Text style={styles.primaryButtonText}>
            Continue with Styled
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
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  outfitsPlacement: {
    marginTop: 24,
    marginBottom: 32,
  },
  header: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5E5A55',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  status: {
    fontSize: 15,
    color: '#161616',
    lineHeight: 22,
    marginBottom: 12,
  },
  transparency: {
    fontSize: 13,
    color: '#5E5A55',
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaContainer: {
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2B1F1A',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1ECE7',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2B1F1A',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B1F1A',
  },
});

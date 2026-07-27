/**
 * Soft Paywall Component
 * 
 * Shown when free users reach outfit generation limit.
 * References user's style preferences to show value.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SoftPaywallProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  userStylePreferences?: string; // e.g., "minimal and classic style"
}

export default function SoftPaywall({
  visible,
  onClose,
  onUpgrade,
  userStylePreferences = 'your style',
}: SoftPaywallProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>✨</Text>
          </View>

          <Text style={styles.title}>You're getting the hang of this!</Text>

          <Text style={styles.subtitle}>
            Based on {userStylePreferences}, Styled can keep refining this.
          </Text>

          <View style={styles.trialCallout}>
            <Text style={styles.trialText}>Try free for 7 days</Text>
            <Text style={styles.trialSubtext}>Then $8.99/month • Cancel anytime</Text>
          </View>

          <View style={styles.benefitsContainer}>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>♾️</Text>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Keep refining your style</Text>
                <Text style={styles.benefitDescription}>
                  As many outfit ideas as you need, when you need them
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>�</Text>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>Deeper personalization</Text>
                <Text style={styles.benefitDescription}>
                  We'll learn what works best for your lifestyle
                </Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>📊</Text>
              <View style={styles.benefitTextContainer}>
                <Text style={styles.benefitTitle}>See what's working</Text>
                <Text style={styles.benefitDescription}>
                  Insights about your wardrobe and style patterns
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.trustMessage}>
            No pressure—your free outfits will still be here. We just wanted to show you what's possible.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
            <Text style={styles.upgradeButtonText}>Start Free Trial</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#161616',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#5E5A55',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  benefitsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  benefitIcon: {
    fontSize: 32,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 15,
    color: '#5E5A55',
    lineHeight: 22,
  },
  trustMessage: {
    fontSize: 14,
    color: '#5E5A55',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  trialCallout: {
    backgroundColor: '#2B1F1A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  trialText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1ECE7',
    marginBottom: 4,
  },
  trialSubtext: {
    fontSize: 14,
    color: '#DED7CF',
  },
  footer: {
    padding: 20,
    gap: 12,
  },
  upgradeButton: {
    height: 56,
    backgroundColor: '#2B1F1A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1ECE7',
  },
  closeButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5E5A55',
  },
});

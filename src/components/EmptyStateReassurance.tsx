/**
 * Empty State Reassurance Component
 * 
 * Reassures users they don't need a perfect closet for 33 Trends to work.
 * Avoids suggesting shopping - focuses on what they already have.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, radius } from '../theme/designSystem';

interface EmptyStateReassuranceProps {
  type: 'closet' | 'outfits';
  onAction?: () => void;
  actionText?: string;
}

export default function EmptyStateReassurance({
  type,
  onAction,
  actionText,
}: EmptyStateReassuranceProps) {
  const content = type === 'closet' ? {
    icon: '👕',
    title: 'You\'re off to a great start.',
    message: '33 Trends works with what you already own. As your closet grows, your outfits will too.',
    tip: 'Add 1–2 more pieces when you\'re ready',
  } : {
    icon: '✨',
    title: 'Ready when you are',
    message: 'We can\'t wait to show you outfit ideas, but we need to know what\'s in your closet first.',
    tip: 'Add a few items and we\'ll create personalized combinations just for you.',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{content.icon}</Text>
      
      <Text style={styles.title}>{content.title}</Text>
      
      <Text style={styles.message}>{content.message}</Text>
      
      <View style={styles.tipContainer}>
        <Text style={styles.tipLabel}>💡 Quick tip</Text>
        <Text style={styles.tipText}>{content.tip}</Text>
      </View>

      {onAction && actionText && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.reassurance}>
        No shopping needed. Just add what you already have.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  tipContainer: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  tipLabel: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  actionButton: {
    borderRadius: radius.full,
    height: 56,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  actionButtonText: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.sand,
  },
  reassurance: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

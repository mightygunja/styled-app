/**
 * Sparse Closet Banner Component
 * 
 * Shows encouraging message for users with sparse closets.
 * Uses exact copy: "You're off to a great start."
 * 
 * CRITICAL: No shopping links. Only add from existing closet.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts } from '../theme/designSystem';

interface SparseClosetBannerProps {
  itemCount: number;
  onAddItems?: () => void;
}

export default function SparseClosetBanner({ itemCount, onAddItems }: SparseClosetBannerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.headline}>You're off to a great start.</Text>
      
      <Text style={styles.body}>
        33 Trends works with what you already own.{'\n'}
        As your closet grows, your outfits will too.
      </Text>

      {onAddItems && (
        <TouchableOpacity style={styles.ctaButton} onPress={onAddItems}>
          <Text style={styles.ctaText}>Add 1–2 more pieces when you're ready</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.note}>
        No shopping needed. Just add what you already have.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.paper,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  headline: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: colors.inkMuted,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.ink,
    alignSelf: 'center',
    marginBottom: 12,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    textAlign: 'center',
  },
  note: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

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

interface SparseClosetBannerProps {
  itemCount: number;
  onAddItems?: () => void;
}

export default function SparseClosetBanner({ itemCount, onAddItems }: SparseClosetBannerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.headline}>You're off to a great start.</Text>
      
      <Text style={styles.body}>
        Styled works with what you already own.{'\n'}
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
    backgroundColor: '#F8F6F3',
    padding: 20,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  headline: {
    fontSize: 20,
    fontWeight: '700',
    color: '#161616',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: '#5E5A55',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2B1F1A',
    alignSelf: 'center',
    marginBottom: 12,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B1F1A',
    textAlign: 'center',
  },
  note: {
    fontSize: 14,
    color: '#5E5A55',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

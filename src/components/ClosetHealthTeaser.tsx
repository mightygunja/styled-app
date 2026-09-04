/**
 * Closet Health Teaser Component
 * 
 * Shows blurred preview for free users, full insights for Plus/Premium.
 * Goal: Emotional reinforcement + upgrade incentive.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, fonts, radius } from '../theme/designSystem';

interface ClosetHealthTeaserProps {
  tier: 'free' | 'plus' | 'premium';
  score?: number;
  insights?: string[];
  onUpgrade?: () => void;
}

export default function ClosetHealthTeaser({
  tier,
  score = 85,
  insights = [],
  onUpgrade,
}: ClosetHealthTeaserProps) {
  const isFree = tier === 'free';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Closet Health</Text>
      
      {isFree ? (
        // Blurred teaser for free users
        <View style={styles.teaserContainer}>
          <View style={styles.blurredContent}>
            <Text style={styles.scoreText}>85</Text>
            <Text style={styles.scoreLabel}>Overall Score</Text>
            
            <View style={styles.insightsList}>
              <Text style={styles.insightText}>• Great versatility</Text>
              <Text style={styles.insightText}>• Strong style consistency</Text>
              <Text style={styles.insightText}>• Cohesive color palette</Text>
            </View>
          </View>
          
          {/* Blur overlay */}
          <BlurView intensity={80} style={styles.blurOverlay} />
          
          <View style={styles.unlockPrompt}>
            <Text style={styles.unlockText}>
              Unlock insights about your wardrobe's versatility and style alignment
            </Text>
            {onUpgrade && (
              <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
                <Text style={styles.upgradeButtonText}>Unlock with Plus</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        // Full insights for Plus/Premium users
        <View style={styles.insightsContainer}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{score}</Text>
            <Text style={styles.scoreLabel}>Overall Score</Text>
          </View>

          <Text style={styles.mainMessage}>
            You're building a wardrobe that works together.
          </Text>

          <View style={styles.insightsList}>
            {insights.map((insight, index) => (
              <Text key={index} style={styles.insightText}>
                • {insight}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  header: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 16,
  },
  teaserContainer: {
    position: 'relative',
    minHeight: 200,
  },
  blurredContent: {
    padding: 16,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  unlockPrompt: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unlockText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeButton: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.sand,
  },
  insightsContainer: {
    gap: 16,
  },
  scoreContainer: {
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.paper,
  },
  scoreText: {
    fontSize: 48,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  scoreLabel: {
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: 4,
  },
  mainMessage: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 26,
  },
  insightsList: {
    gap: 8,
  },
  insightText: {
    fontSize: 15,
    color: colors.inkMuted,
    lineHeight: 22,
  },
});

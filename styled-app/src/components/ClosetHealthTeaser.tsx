/**
 * Closet Health Teaser Component
 * 
 * Shows blurred preview for free users, full insights for Plus/Premium.
 * Goal: Emotional reinforcement + upgrade incentive.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#161616',
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
    borderRadius: 12,
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
    fontWeight: '600',
    color: '#161616',
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: '#2B1F1A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1ECE7',
  },
  insightsContainer: {
    gap: 16,
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#2B1F1A',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#5E5A55',
    marginTop: 4,
  },
  mainMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#161616',
    textAlign: 'center',
    lineHeight: 26,
  },
  insightsList: {
    gap: 8,
  },
  insightText: {
    fontSize: 15,
    color: '#5E5A55',
    lineHeight: 22,
  },
});

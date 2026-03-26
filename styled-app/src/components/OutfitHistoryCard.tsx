/**
 * Outfit History Card Component
 * 
 * Shows outfit with usage stats for emotional reinforcement.
 * "You wore this twice" - validation that choices work.
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Outfit } from '../services/generateOutfits';
import { getOutfitUsageMessage } from '../services/outfitHistory';

interface OutfitHistoryCardProps {
  outfit: Outfit;
  wearCount: number;
  lastWornDate?: Date;
}

export default function OutfitHistoryCard({
  outfit,
  wearCount,
  lastWornDate,
}: OutfitHistoryCardProps) {
  const usageMessage = getOutfitUsageMessage(wearCount);

  return (
    <View style={styles.card}>
      {/* Outfit Images */}
      <View style={styles.imagesContainer}>
        {outfit.items.slice(0, 3).map((item, index) => (
          <View key={item.id} style={[styles.imageWrapper, { zIndex: 3 - index }]}>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          </View>
        ))}
      </View>

      {/* Usage Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.usageMessage}>{usageMessage}</Text>
        {lastWornDate && (
          <Text style={styles.dateText}>
            Last worn {formatDate(lastWornDate)}
          </Text>
        )}
      </View>

      {/* Occasion */}
      <View style={styles.occasionTag}>
        <Text style={styles.occasionText}>{outfit.occasion}</Text>
      </View>
    </View>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    height: 100,
  },
  imageWrapper: {
    width: 80,
    height: 100,
    marginRight: -15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  statsContainer: {
    marginBottom: 12,
  },
  usageMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B1F1A',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#5E5A55',
  },
  occasionTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F4F1ED',
    borderRadius: 12,
  },
  occasionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E5A55',
    textTransform: 'capitalize',
  },
});

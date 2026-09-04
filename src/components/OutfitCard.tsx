/**
 * Outfit Card Component
 * 
 * Displays outfit with "why this works" explanation prominently but subtly.
 * Avoids technical language and focuses on building user confidence.
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { ClosetItem } from '../models/closetItem';
import { colors, fonts, radius } from '../theme/designSystem';

export interface OutfitCardProps {
  outfit: {
    id: string;
    items: ClosetItem[];
    score: number;
    occasion: string;
    reason: string;
  };
  onPress?: () => void;
}

export default function OutfitCard({ outfit, onPress }: OutfitCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
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
        {outfit.items.length > 3 && (
          <View style={styles.moreItemsBadge}>
            <Text style={styles.moreItemsText}>+{outfit.items.length - 3}</Text>
          </View>
        )}
      </View>

      {/* Occasion Tag */}
      <View style={styles.occasionTag}>
        <Text style={styles.occasionText}>{outfit.occasion}</Text>
      </View>

      {/* Why This Works - Prominent but Subtle */}
      <View style={styles.explanationContainer}>
        <Text style={styles.explanationLabel}>Why this works for you</Text>
        <Text style={styles.explanationText}>{outfit.reason}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    height: 120,
  },
  imageWrapper: {
    borderRadius: radius.sm,
    width: 100,
    height: 120,
    marginRight: -20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.card,
  },
  itemImage: {
    borderRadius: radius.sm,
    width: '100%',
    height: '100%',
  },
  moreItemsBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 8,
  },
  moreItemsText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.sand,
  },
  occasionTag: {
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.paper,
    marginBottom: 12,
  },
  occasionText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    textTransform: 'capitalize',
  },
  explanationContainer: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 16,
  },
  explanationLabel: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  explanationText: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
});

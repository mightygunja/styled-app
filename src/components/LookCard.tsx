import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Look } from '../types';
import { scale } from '../utils/animations';
import { colors, fonts, radius } from '../theme/designSystem';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

interface LookCardProps {
  look: Look;
  onPress: () => void;
  onFavorite: () => void;
  isFavorited?: boolean;
}

export default function LookCard({
  look,
  onPress,
  onFavorite,
  isFavorited = false,
}: LookCardProps) {
  const [imageError, setImageError] = useState<boolean>(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Ensure isFavorited is always a boolean
  const isFav = Boolean(isFavorited);

  const handleCardPress = () => {
    console.log('LookCard pressed:', look.id, look.title);
    onPress();
  };

  const handleFavoritePress = (e: any) => {
    e.stopPropagation(); // Prevent card press when tapping favorite
    console.log('Favorite pressed:', look.id);
    onFavorite();
  };

  const handlePressIn = () => {
    scale(scaleAnim, 0.97, 100).start();
  };

  const handlePressOut = () => {
    scale(scaleAnim, 1, 100).start();
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handleCardPress}
      activeOpacity={0.9}
      disabled={false}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.imageContainer}>
        {imageError ? (
          // Local fallback - a remote placeholder service is just a second
          // request that can fail.
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>Image unavailable</Text>
          </View>
        ) : (
          <Image
            source={{ uri: look.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}

        {/* Favorite button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          activeOpacity={0.7}
          disabled={false}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={24}
            color={colors.ink}
          />
        </TouchableOpacity>

        {/* Sponsored badge */}
        {Boolean(look.isSponsored) && (
          <View style={styles.sponsoredBadge}>
            <Text style={styles.sponsoredText}>Sponsored</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {look.title}
        </Text>
        
        {look.description && (
          <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
            {look.description}
          </Text>
        )}

        {/* Tags */}
        {look.tags && look.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {look.tags.slice(0, 3).map((tag, index) => (
              <View key={`${look.id}-${tag}-${index}`} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Item count */}
        <Text style={styles.itemCount}>
          {look.heroItem ? 1 : 0} + {look.alternateItems?.length || 0} items
        </Text>
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    marginBottom: 16,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
  },
  image: {
    borderRadius: radius.sm,
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: {
    fontSize: 13,
    color: colors.inkFaint,
    fontFamily: fonts.sansMedium,
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sponsoredBadge: {
    borderRadius: radius.full,
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sponsoredText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 12,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  tag: {
    borderRadius: radius.full,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontFamily: fonts.sansMedium,
  },
  itemCount: {
    fontSize: 12,
    color: colors.inkFaint,
    fontFamily: fonts.sansMedium,
  },
});

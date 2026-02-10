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
import { Look } from '../types';
import { scale } from '../utils/animations';

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
        <Image
          source={{ uri: imageError ? 'https://via.placeholder.com/400x500' : look.imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
        
        {/* Favorite button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          activeOpacity={0.7}
          disabled={false}
        >
          <Text style={styles.favoriteIcon}>
            {isFav ? '❤️' : '🤍'}
          </Text>
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
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
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteIcon: {
    fontSize: 24,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sponsoredText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
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
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  itemCount: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});

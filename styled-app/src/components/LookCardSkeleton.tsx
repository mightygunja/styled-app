import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

export default function LookCardSkeleton() {
  return (
    <View style={styles.card}>
      {/* Image skeleton */}
      <SkeletonLoader
        width={CARD_WIDTH}
        height={400}
        borderRadius={16}
        style={styles.image}
      />
      
      {/* Content skeleton */}
      <View style={styles.content}>
        {/* Title */}
        <SkeletonLoader width="80%" height={24} borderRadius={4} style={styles.title} />
        
        {/* Description */}
        <SkeletonLoader width="100%" height={16} borderRadius={4} style={styles.description} />
        <SkeletonLoader width="60%" height={16} borderRadius={4} style={styles.description} />
        
        {/* Tags */}
        <View style={styles.tagsContainer}>
          <SkeletonLoader width={60} height={24} borderRadius={12} style={styles.tag} />
          <SkeletonLoader width={80} height={24} borderRadius={12} style={styles.tag} />
          <SkeletonLoader width={70} height={24} borderRadius={12} style={styles.tag} />
        </View>
        
        {/* Item count */}
        <SkeletonLoader width={100} height={14} borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  image: {
    marginBottom: 0,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12,
  },
  tag: {
    marginRight: 8,
  },
});

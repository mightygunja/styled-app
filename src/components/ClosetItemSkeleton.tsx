import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 2; // 2 columns with padding

export default function ClosetItemSkeleton() {
  return (
    <View style={styles.item}>
      <SkeletonLoader
        width={ITEM_SIZE}
        height={ITEM_SIZE * 1.3}
        borderRadius={12}
      />
    </View>
  );
}

export function ClosetGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <ClosetItemSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
});

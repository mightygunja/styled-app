import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ClosetStatsProps {
  totalItems: number;
  itemsByCategory: Record<string, number>;
  mostWornItems?: Array<{ name: string; wornCount: number }>;
  leastWornItems?: Array<{ name: string; wornCount: number }>;
}

export default function ClosetStats({
  totalItems,
  itemsByCategory,
  mostWornItems = [],
  leastWornItems = [],
}: ClosetStatsProps) {
  const categories = Object.entries(itemsByCategory).sort((a, b) => b[1] - a[1]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Closet Statistics</Text>

      {/* Total Items */}
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{totalItems}</Text>
        <Text style={styles.statLabel}>Total Items</Text>
      </View>

      {/* Items by Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>By Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map(([category, count]) => (
            <View key={category} style={styles.categoryCard}>
              <Text style={styles.categoryCount}>{count}</Text>
              <Text style={styles.categoryName}>{category}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Most Worn */}
      {mostWornItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Worn</Text>
          {mostWornItems.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.wornItem}>
              <Text style={styles.wornItemName}>{item.name}</Text>
              <Text style={styles.wornItemCount}>{item.wornCount}x</Text>
            </View>
          ))}
        </View>
      )}

      {/* Least Worn */}
      {leastWornItems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Needs More Love</Text>
          <Text style={styles.sectionSubtitle}>Items you haven't worn much</Text>
          {leastWornItems.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.wornItem}>
              <Text style={styles.wornItemName}>{item.name}</Text>
              <Text style={styles.wornItemCount}>
                {item.wornCount === 0 ? 'Never worn' : `${item.wornCount}x`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#f8fafc',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  categoryCard: {
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  categoryName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  wornItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  wornItemName: {
    fontSize: 16,
    flex: 1,
  },
  wornItemCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { closetAPI, getCurrentUserId } from '../services/api';
import { colors, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  totalItems: number;
  totalValue: number;
  mostWornItems: any[];
  leastWornItems: any[];
  categoryBreakdown: { [key: string]: number };
  colorBreakdown: { [key: string]: number };
  seasonBreakdown: { [key: string]: number };
  costPerWear: { [key: string]: number };
}

export default function ClosetAnalyticsScreen() {
  const navigation = useNavigation();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await closetAPI.getItems(getCurrentUserId());
      const items = response.data;

      // Calculate analytics
      const totalItems = items.length;
      const totalValue = items.reduce((sum: number, item: any) =>sum + (item.price || 0), 0);

      // Category breakdown
      const categoryBreakdown: { [key: string]: number } = {};
      items.forEach((item: any) => {
        const cat = item.category || 'Other';
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      });

      // Color breakdown
      const colorBreakdown: { [key: string]: number } = {};
      items.forEach((item: any) => {
        const color = item.color || 'Unknown';
        colorBreakdown[color] = (colorBreakdown[color] || 0) + 1;
      });

      // Season breakdown
      const seasonBreakdown: { [key: string]: number } = {};
      items.forEach((item: any) => {
        const season = item.season || 'All Season';
        seasonBreakdown[season] = (seasonBreakdown[season] || 0) + 1;
      });

      // Most/least worn - sorted by real wornCount
      const sortedByWear = [...items].sort(
        (a: any, b: any) => (b.wornCount || 0) - (a.wornCount || 0)
      );
      const mostWornItems = sortedByWear.slice(0, 3);
      const leastWornItems = sortedByWear.slice(-3).reverse();

      // Cost per wear = purchase price / times actually worn (real wornCount)
      const costPerWear: { [key: string]: number } = {};
      items.forEach((item: any) => {
        if (item.price) {
          costPerWear[item.id] = item.price / Math.max(1, item.wornCount || 0);
        }
      });

      setAnalytics({
        totalItems,
        totalValue,
        mostWornItems,
        leastWornItems,
        categoryBreakdown,
        colorBreakdown,
        seasonBreakdown,
        costPerWear,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Analyzing your closet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load analytics</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() =>navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Closet Analytics</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Overview Cards */}
        <View style={styles.overviewSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.totalItems}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${analytics.totalValue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${(analytics.totalValue / Math.max(1, analytics.totalItems)).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Avg Value</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Category</Text>
          <View style={styles.breakdownContainer}>
            {Object.entries(analytics.categoryBreakdown)
              .sort((a, b) =>b[1] - a[1])
              .map(([category, count]) => (
                <View key={category} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{category}</Text>
                  <View style={styles.breakdownBarContainer}>
                    <View
                      style={[
                        styles.breakdownBar,
                        { width: `${(count / analytics.totalItems) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownValue}>{count}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Color Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Color</Text>
          <View style={styles.colorGrid}>
            {Object.entries(analytics.colorBreakdown)
              .sort((a, b) =>b[1] - a[1])
              .slice(0, 6)
              .map(([color, count]) => (
                <View key={color} style={styles.colorCard}>
                  <View style={[styles.colorSwatch, { backgroundColor: color.toLowerCase() }]} />
                  <Text style={styles.colorName}>{color}</Text>
                  <Text style={styles.colorCount}>{count} items</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Season Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Season</Text>
          <View style={styles.seasonGrid}>
            {Object.entries(analytics.seasonBreakdown).map(([season, count]) => (
              <View key={season} style={styles.seasonCard}>
                <Text style={styles.seasonEmoji}>
                  {season === 'Spring' ? '✿' : season === 'Summer' ? '☀' : season === 'Fall' ? '❋' : '❄'}
                </Text>
                <Text style={styles.seasonName}>{season}</Text>
                <Text style={styles.seasonCount}>{count} items</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Most Worn Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Worn Items </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {analytics.mostWornItems.map((item: any) => (
              <View key={item.id} style={styles.itemCard}>
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                <Text style={styles.itemCategory} numberOfLines={1}>
                  {item.category}
                </Text>
                <Text style={styles.itemWears}>{item.wornCount || 0} wears</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Least Worn Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Least Worn Items </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {analytics.leastWornItems.map((item: any) => (
              <View key={item.id} style={styles.itemCard}>
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                <Text style={styles.itemCategory} numberOfLines={1}>
                  {item.category}
                </Text>
                <Text style={styles.itemWears}>{item.wornCount || 0} wears</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights </Text>
          <View style={styles.insightCard}>
                        <Text style={styles.insightText}>You wear {Object.keys(analytics.categoryBreakdown)[0]} items most often
            </Text>
          </View>
          <View style={styles.insightCard}>
                        <Text style={styles.insightText}>
              {Object.keys(analytics.colorBreakdown)[0]} is your most common color
            </Text>
          </View>
          <View style={styles.insightCard}>
                        <Text style={styles.insightText}>
              {Object.keys(analytics.costPerWear).length >0
                ? `Average cost per wear: $${(
                    Object.values(analytics.costPerWear).reduce((sum, v) =>sum + v, 0) /
                    Object.values(analytics.costPerWear).length
                  ).toFixed(2)}`
                : 'Add purchase prices to your items to see cost-per-wear'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.inkMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.ink,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  backButton: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  overviewSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 16,
  },
  breakdownContainer: {
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownLabel: {
    width: 80,
    fontSize: 14,
    color: colors.inkMuted,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 24,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    backgroundColor: colors.ink,
  },
  breakdownValue: {
    width: 30,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    textAlign: 'right',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCard: {
    width: (width - 60) / 3,
    backgroundColor: colors.paper,
    padding: 12,
    alignItems: 'center',
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  colorName: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 2,
  },
  colorCount: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  seasonGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  seasonCard: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 16,
    alignItems: 'center',
  },
  seasonEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  seasonName: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 2,
  },
  seasonCount: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  itemCard: {
    width: 100,
    marginRight: 12,
  },
  itemImage: {
    width: 100,
    height: 100,
    backgroundColor: colors.paper,
    marginBottom: 8,
  },
  itemCategory: {
    fontSize: 12,
    color: colors.ink,
    marginBottom: 2,
  },
  itemWears: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    padding: 16,
    marginBottom: 12,
  },
  insightEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
  },
});

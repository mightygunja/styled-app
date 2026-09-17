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
  processColor,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { closetAPI, getCurrentUserId } from '../services/api';
import { colors, fonts, radius } from '../theme/designSystem';

const { width } = Dimensions.get('window');

// Explicit per label - anything unlisted gets a neutral icon, not a snowflake.
const SEASON_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Spring: 'flower-outline',
  Summer: 'sunny-outline',
  Fall: 'leaf-outline',
  Autumn: 'leaf-outline',
  Winter: 'snow-outline',
  'All Season': 'infinite-outline',
  'All-season': 'infinite-outline',
};

/** Free-text colour names ("navy blue", "Unknown") that can't be painted get a neutral swatch. */
function swatchColor(value: string): string | null {
  const color = value.trim().toLowerCase();
  return color && processColor(color) != null ? color : null;
}

interface AnalyticsData {
  totalItems: number;
  totalValue: number;
  /** How many items actually carry a price - the value cards only cover these. */
  pricedCount: number;
  mostWornItems: any[];
  leastWornItems: any[];
  categoryBreakdown: { [key: string]: number };
  colorBreakdown: { [key: string]: number };
  seasonBreakdown: { [key: string]: number };
  costPerWear: { [key: string]: number };
}

export default function ClosetAnalyticsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
      // Most items have no price, so the value figures cover priced items only
      // and say so, rather than averaging known prices over the whole closet.
      const pricedItems = items.filter((item: any) => typeof item.price === 'number' && item.price > 0);
      const pricedCount = pricedItems.length;
      const totalValue = pricedItems.reduce((sum: number, item: any) => sum + item.price, 0);

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

      // Season breakdown - items store a `seasons` array (from AI
      // classification), and an item can belong to more than one.
      const seasonBreakdown: { [key: string]: number } = {};
      items.forEach((item: any) => {
        const seasons: string[] = Array.isArray(item.seasons) ? item.seasons : [];
        if (seasons.length === 0) {
          seasonBreakdown['All Season'] = (seasonBreakdown['All Season'] || 0) + 1;
        } else {
          seasons.forEach(s => {
            const label = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
            seasonBreakdown[label] = (seasonBreakdown[label] || 0) + 1;
          });
        }
      });

      // Most/least worn - sorted by real wornCount
      const sortedByWear = [...items].sort(
        (a: any, b: any) => (b.wornCount || 0) - (a.wornCount || 0)
      );
      const mostWornItems = sortedByWear.slice(0, 3);
      const leastWornItems = sortedByWear.slice(-3).reverse();

      // Cost per wear = purchase price / times actually worn (real wornCount).
      // A never-worn item has no per-wear cost, so it is left out.
      const costPerWear: { [key: string]: number } = {};
      items.forEach((item: any) => {
        if (item.price && (item.wornCount || 0) > 0) {
          costPerWear[item.id] = item.price / item.wornCount;
        }
      });

      setAnalytics({
        totalItems,
        totalValue,
        pricedCount,
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
        <BackButton />
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
        <BackButton />
        <TouchableOpacity
          style={styles.errorContainer}
          onPress={loadAnalytics}
          accessibilityRole="button"
        >
          <Text style={styles.errorText}>Couldn't load your closet. Tap to retry.</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Analytics over an empty closet would be a page of zeros and blank charts,
  // so send the user to the one action that changes that.
  if (analytics.totalItems === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <BackButton />
        <View style={styles.errorContainer}>
          <Text style={styles.emptyTitle}>Nothing to analyze yet</Text>
          <Text style={styles.emptyText}>
            Add items to your closet and this page will show what you own, what you wear, and
            what it costs per wear.
          </Text>
          <Button
            title="Add an item"
            variant="primary"
            onPress={() => navigation.navigate('AddClosetItem')}
          />
        </View>
      </SafeAreaView>
    );
  }

  // The insights below read the top entry, so sort by count first -
  // object-key order is just item-iteration order.
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const topCategory = Object.entries(analytics.categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topColor = Object.entries(analytics.colorBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - pinned, and the same BackButton as the other states. */}
      <View style={styles.header}>
        <BackButton style={styles.backButton} />
        <Text style={styles.title}>Closet Analytics</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView>

        {/* Overview Cards */}
        <View style={styles.overviewSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.totalItems}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          {analytics.pricedCount > 0 && (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>${analytics.totalValue.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Total Value</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  ${(analytics.totalValue / analytics.pricedCount).toFixed(0)}
                </Text>
                <Text style={styles.statLabel}>Avg Value</Text>
              </View>
            </>
          )}
        </View>
        {analytics.pricedCount > 0 && (
          <Text style={styles.valueCaption}>
            Value figures cover the {analytics.pricedCount}{' '}
            {analytics.pricedCount === 1 ? 'item' : 'items'} with a price, out of{' '}
            {analytics.totalItems}.
          </Text>
        )}

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
                  {swatchColor(color) ? (
                    <View style={[styles.colorSwatch, { backgroundColor: swatchColor(color)! }]} />
                  ) : (
                    <View style={[styles.colorSwatch, styles.colorSwatchUnknown]} />
                  )}
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
                <Ionicons
                  name={SEASON_ICONS[season] || 'calendar-outline'}
                  size={28}
                  color={colors.tobacco}
                  style={styles.seasonIcon}
                />
                <Text style={styles.seasonName}>{season}</Text>
                <Text style={styles.seasonCount}>{count} items</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Most Worn Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Worn Items</Text>
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
          <Text style={styles.sectionTitle}>Least Worn Items</Text>
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
          <Text style={styles.sectionTitle}>Insights</Text>
          {topCategory && (
            <View style={styles.insightCard}>
              <Text style={styles.insightText}>
                {capitalize(topCategory)} is your largest category
              </Text>
            </View>
          )}
          {topColor && (
            <View style={styles.insightCard}>
              <Text style={styles.insightText}>
                {capitalize(topColor)} is your most common color
              </Text>
            </View>
          )}
          <View style={styles.insightCard}>
            <Text style={styles.insightText}>
              {Object.keys(analytics.costPerWear).length >0
                ? `Average cost per wear: $${(
                    Object.values(analytics.costPerWear).reduce((sum, v) =>sum + v, 0) /
                    Object.values(analytics.costPerWear).length
                  ).toFixed(2)}`
                : analytics.pricedCount > 0
                  ? 'Mark a priced item as worn to see cost-per-wear'
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
    backgroundColor: colors.bone,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.inkMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  // The shared BackButton, minus its standalone spacing, inside the header row.
  backButton: {
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.serif,
    color: colors.ink,
  },
  overviewSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    borderRadius: radius.md,
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
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
  },
  valueCaption: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
    paddingHorizontal: 20,
    marginTop: -8,
    marginBottom: 16,
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
    fontFamily: fonts.sans,
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
    borderRadius: radius.md,
    width: (width - 60) / 3,
    backgroundColor: colors.paper,
    padding: 12,
    alignItems: 'center',
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  colorSwatchUnknown: {
    backgroundColor: colors.card,
    borderStyle: 'dashed',
    borderColor: colors.inkFaint,
  },
  colorName: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 2,
  },
  colorCount: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.inkMuted,
  },
  seasonGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  seasonCard: {
    borderRadius: radius.md,
    flex: 1,
    backgroundColor: colors.paper,
    padding: 16,
    alignItems: 'center',
  },
  seasonIcon: {
    marginBottom: 8,
  },
  seasonName: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 2,
  },
  seasonCount: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.inkMuted,
  },
  itemCard: {
    width: 100,
    marginRight: 12,
  },
  itemImage: {
    borderRadius: radius.sm,
    width: 100,
    height: 100,
    backgroundColor: colors.paper,
    marginBottom: 8,
  },
  itemCategory: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.ink,
    marginBottom: 2,
  },
  itemWears: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.inkMuted,
  },
  insightCard: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    padding: 16,
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
  },
});

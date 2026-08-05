import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  advancedAnalyticsService,
  AnalyticsSummary,
} from '../services/advancedAnalyticsService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AdvancedAnalyticsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'patterns' | 'value' | 'style'>('overview');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await advancedAnalyticsService.getAnalyticsSummary(getCurrentUserId());
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      showToast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tobacco} />
          <Text style={styles.loadingText}>Analyzing your wardrobe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load analytics</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advanced Analytics</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Last Updated */}
      <View style={styles.updateBanner}>
        <Text style={styles.updateText}>
          Last updated: {new Date(analytics.lastUpdated).toLocaleDateString()}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'patterns' && styles.tabActive]}
          onPress={() => setSelectedTab('patterns')}
        >
          <Text style={[styles.tabText, selectedTab === 'patterns' && styles.tabTextActive]}>
            Patterns
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'value' && styles.tabActive]}
          onPress={() => setSelectedTab('value')}
        >
          <Text style={[styles.tabText, selectedTab === 'value' && styles.tabTextActive]}>
            Value
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'style' && styles.tabActive]}
          onPress={() => setSelectedTab('style')}
        >
          <Text style={[styles.tabText, selectedTab === 'style' && styles.tabTextActive]}>
            Style
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Key Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Wardrobe Overview</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{analytics.insights.totalItems}</Text>
                  <Text style={styles.metricLabel}>Total Items</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>${analytics.insights.totalValue.toLocaleString()}</Text>
                  <Text style={styles.metricLabel}>Total Value</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>${analytics.insights.averageItemCost.toFixed(0)}</Text>
                  <Text style={styles.metricLabel}>Avg Cost</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>${analytics.costPerWear.overallCostPerWear.toFixed(2)}</Text>
                  <Text style={styles.metricLabel}>Cost/Wear</Text>
                </View>
              </View>
            </View>

            {/* Category Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category Breakdown</Text>
              {analytics.insights.categoryBreakdown.map((cat, idx) => (
                <View key={idx} style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{cat.category}</Text>
                    <Text style={styles.categoryCount}>{cat.count} items</Text>
                  </View>
                  <View style={styles.categoryStats}>
                    <Text style={styles.categoryValue}>${cat.totalValue.toLocaleString()}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${cat.percentage}%` }]} />
                    </View>
                    <Text style={styles.categoryPercentage}>{cat.percentage}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Color Distribution */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color Distribution</Text>
              <View style={styles.colorGrid}>
                {analytics.insights.colorDistribution.map((color, idx) => (
                  <View key={idx} style={styles.colorCard}>
                    <View style={[styles.colorSwatch, { backgroundColor: color.hex }]} />
                    <Text style={styles.colorName}>{color.color}</Text>
                    <Text style={styles.colorCount}>{color.count} items</Text>
                    <Text style={styles.colorPercentage}>{color.percentage}%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Most/Least Worn */}
            {analytics.insights.mostWornItem && analytics.insights.leastWornItem && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Wear Insights</Text>
                <View style={styles.wearInsights}>
                  <View style={styles.wearCard}>
                    <Text style={styles.wearLabel}>Most Worn</Text>
                    <Image
                      source={{ uri: analytics.insights.mostWornItem.imageUrl }}
                      style={styles.wearImage}
                    />
                    <Text style={styles.wearName}>{analytics.insights.mostWornItem.name}</Text>
                    <Text style={styles.wearCount}>
                      {analytics.insights.mostWornItem.wearCount} wears
                    </Text>
                  </View>
                  <View style={styles.wearCard}>
                    <Text style={styles.wearLabel}>Least Worn</Text>
                    <Image
                      source={{ uri: analytics.insights.leastWornItem.imageUrl }}
                      style={styles.wearImage}
                    />
                    <Text style={styles.wearName}>{analytics.insights.leastWornItem.name}</Text>
                    <Text style={styles.wearCount}>
                      {analytics.insights.leastWornItem.wearCount} wears
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Patterns Tab */}
        {selectedTab === 'patterns' && (
          <>
            {/* Wear Frequency */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Wear Frequency</Text>
              <View style={styles.frequencyGrid}>
                <View style={styles.frequencyCard}>
                  <Text style={styles.frequencyValue}>{analytics.wearPatterns.wearFrequency.daily}</Text>
                  <Text style={styles.frequencyLabel}>Daily</Text>
                </View>
                <View style={styles.frequencyCard}>
                  <Text style={styles.frequencyValue}>{analytics.wearPatterns.wearFrequency.weekly}</Text>
                  <Text style={styles.frequencyLabel}>Weekly</Text>
                </View>
                <View style={styles.frequencyCard}>
                  <Text style={styles.frequencyValue}>{analytics.wearPatterns.wearFrequency.monthly}</Text>
                  <Text style={styles.frequencyLabel}>Monthly</Text>
                </View>
                <View style={styles.frequencyCard}>
                  <Text style={styles.frequencyValue}>{analytics.wearPatterns.wearFrequency.rarely}</Text>
                  <Text style={styles.frequencyLabel}>Rarely</Text>
                </View>
              </View>
            </View>

            {/* Most Worn Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Most Worn Categories</Text>
              {analytics.wearPatterns.categoryWearCounts.length === 0 && (
                <Text style={styles.emptyHint}>No wear data yet</Text>
              )}
              {analytics.wearPatterns.categoryWearCounts.map((cat, idx) => {
                const maxCount = analytics.wearPatterns.categoryWearCounts[0]?.count || 1;
                return (
                  <View key={idx} style={styles.dayRow}>
                    <Text style={styles.dayName}>{cat.category}</Text>
                    <View style={styles.dayBar}>
                      <View
                        style={[styles.dayBarFill, { width: `${(cat.count / maxCount) * 100}%` }]}
                      />
                    </View>
                    <Text style={styles.dayCount}>{cat.count}</Text>
                  </View>
                );
              })}
            </View>

            {/* Color Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color Breakdown</Text>
              {analytics.wearPatterns.colorBreakdown.map((c, idx) => (
                <View key={idx} style={styles.occasionRow}>
                  <Text style={styles.occasionName}>{c.color}</Text>
                  <View style={styles.occasionBar}>
                    <View
                      style={[
                        styles.occasionBarFill,
                        { width: `${c.percentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.occasionPercentage}>{c.percentage}%</Text>
                </View>
              ))}
            </View>

            {/* Items Added by Month */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Items Added by Month</Text>
              <View style={styles.trendChart}>
                {analytics.wearPatterns.itemsAddedByMonth.map((month, idx) => {
                  const maxCount = Math.max(1, ...analytics.wearPatterns.itemsAddedByMonth.map(m => m.count));
                  return (
                    <View key={idx} style={styles.trendBar}>
                      <View
                        style={[
                          styles.trendBarFill,
                          { height: `${(month.count / maxCount) * 100}%` },
                        ]}
                      />
                      <Text style={styles.trendLabel}>{month.month}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Value Tab */}
        {selectedTab === 'value' && (
          <>
            {/* Cost Per Wear Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cost Per Wear Analysis</Text>
              <View style={styles.cpwCard}>
                <Text style={styles.cpwValue}>
                  ${analytics.costPerWear.overallCostPerWear.toFixed(2)}
                </Text>
                <Text style={styles.cpwLabel}>Overall Cost Per Wear</Text>
              </View>
            </View>

            {/* Best Value Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Best Value Items</Text>
              {analytics.costPerWear.bestValue.map((item, idx) => (
                <View key={idx} style={styles.valueCard}>
                  <Image source={{ uri: item.imageUrl }} style={styles.valueImage} />
                  <View style={styles.valueInfo}>
                    <Text style={styles.valueName}>{item.name}</Text>
                    <Text style={styles.valueStats}>
                      ${item.cost} • {item.wears} wears
                    </Text>
                    <Text style={styles.valueCPW}>
                      ${item.costPerWear.toFixed(2)}/wear
                    </Text>
                  </View>
                  <View style={styles.valueBadge}>
                    <Text style={styles.valueBadgeText}>✓</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Worst Value Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Needs More Wear</Text>
              {analytics.costPerWear.worstValue.map((item, idx) => (
                <View key={idx} style={styles.valueCard}>
                  <Image source={{ uri: item.imageUrl }} style={styles.valueImage} />
                  <View style={styles.valueInfo}>
                    <Text style={styles.valueName}>{item.name}</Text>
                    <Text style={styles.valueStats}>
                      ${item.cost} • {item.wears} wears
                    </Text>
                    <Text style={[styles.valueCPW, styles.valueCPWHigh]}>
                      ${item.costPerWear.toFixed(2)}/wear
                    </Text>
                  </View>
                  <View style={[styles.valueBadge, styles.valueBadgeWarning]}>
                    <Text style={styles.valueBadgeText}>!</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Savings Opportunities */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Savings Opportunities</Text>
              {analytics.costPerWear.savingsOpportunities.map((opp, idx) => (
                <View key={idx} style={styles.opportunityCard}>
                  <Text style={styles.opportunityMessage}>{opp.message}</Text>
                  <Text style={styles.opportunitySavings}>
                    Potential savings: ${opp.potentialSavings}
                  </Text>
                  <Text style={styles.opportunityRec}>{opp.recommendation}</Text>
                </View>
              ))}
            </View>

            {/* Budget Analytics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Budget Overview</Text>
              <View style={styles.budgetGrid}>
                <View style={styles.budgetCard}>
                  <Text style={styles.budgetValue}>
                    ${analytics.budget.totalSpent.toLocaleString()}
                  </Text>
                  <Text style={styles.budgetLabel}>Total Spent</Text>
                </View>
                <View style={styles.budgetCard}>
                  <Text style={styles.budgetValue}>
                    ${analytics.budget.monthlyAverage}
                  </Text>
                  <Text style={styles.budgetLabel}>Monthly Avg</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Style Tab */}
        {selectedTab === 'style' && (
          <>
            {/* Style Evolution */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Closet Growth Over Time</Text>
              {analytics.styleEvolution.timeline.every(p => p.itemsAdded === 0) && (
                <Text style={styles.emptyHint}>Not enough history yet</Text>
              )}
              {analytics.styleEvolution.timeline.map((period, idx) => (
                <View key={idx} style={styles.timelineCard}>
                  <Text style={styles.timelinePeriod}>{period.period}</Text>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Colors added:</Text>
                    <Text style={styles.timelineValue}>
                      {period.dominantColors.length > 0 ? period.dominantColors.join(', ') : '—'}
                    </Text>
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Items added:</Text>
                    <Text style={styles.timelineValue}>{period.itemsAdded}</Text>
                  </View>
                  {period.averagePrice > 0 && (
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>Avg Price:</Text>
                      <Text style={styles.timelineValue}>${period.averagePrice.toFixed(0)}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Outfit Analytics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Outfit Insights</Text>
              <View style={styles.outfitGrid}>
                <View style={styles.outfitCard}>
                  <Text style={styles.outfitValue}>{analytics.outfits.totalOutfits}</Text>
                  <Text style={styles.outfitLabel}>Total Outfits</Text>
                </View>
                <View style={styles.outfitCard}>
                  <Text style={styles.outfitValue}>
                    {analytics.outfits.averageItemsPerOutfit.toFixed(1)}
                  </Text>
                  <Text style={styles.outfitLabel}>Avg Items</Text>
                </View>
              </View>

              {analytics.outfits.mostUsedItems.length > 0 && (
                <>
                  <Text style={[styles.timelineLabel, { marginTop: 16, marginBottom: 8 }]}>
                    Most-used pieces in your saved outfits
                  </Text>
                  {analytics.outfits.mostUsedItems.map((item, idx) => (
                    <View key={idx} style={styles.dayRow}>
                      <Text style={styles.dayName} numberOfLines={1}>{item.name}</Text>
                      <View style={styles.dayBar}>
                        <View
                          style={[
                            styles.dayBarFill,
                            { width: `${(item.count / analytics.outfits.mostUsedItems[0].count) * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.dayCount}>{item.count}</Text>
                    </View>
                  ))}
                </>
              )}

              {analytics.outfits.gapAnalysis.length > 0 && (
                <>
                  <Text style={[styles.timelineLabel, { marginTop: 16, marginBottom: 8 }]}>
                    Wardrobe gaps
                  </Text>
                  {analytics.outfits.gapAnalysis.map((gap, idx) => (
                    <View key={idx} style={styles.opportunityCard}>
                      <Text style={styles.opportunityMessage}>{gap.category}</Text>
                      <Text style={styles.opportunityRec}>{gap.recommendation}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
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
    marginTop: 16,
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
    color: colors.tobacco,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    paddingVertical: 12,
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
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  exportButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  updateBanner: {
    backgroundColor: colors.paper,
    padding: 12,
    alignItems: 'center',
  },
  updateText: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  tabText: {
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  tabTextActive: {
    color: colors.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  categoryStats: {
    flex: 1,
    alignItems: 'flex-end',
  },
  categoryValue: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.hair,
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCard: {
    width: (width - 64) / 3,
    alignItems: 'center',
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    borderWidth: 2,
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
    marginBottom: 2,
  },
  colorPercentage: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  wearInsights: {
    flexDirection: 'row',
    gap: 12,
  },
  wearCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  wearLabel: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  wearImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.hair,
    marginBottom: 12,
  },
  wearName: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
    textAlign: 'center',
  },
  wearCount: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  frequencyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  frequencyValue: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  frequencyLabel: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    width: 80,
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
  },
  dayBar: {
    flex: 1,
    height: 24,
    backgroundColor: colors.paper,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  dayBarFill: {
    height: '100%',
    backgroundColor: colors.ink,
  },
  dayCount: {
    width: 30,
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    textAlign: 'right',
  },
  occasionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  occasionName: {
    width: 80,
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
  },
  occasionBar: {
    flex: 1,
    height: 20,
    backgroundColor: colors.paper,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
  },
  occasionBarFill: {
    height: '100%',
    backgroundColor: colors.ink,
  },
  occasionPercentage: {
    width: 40,
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    textAlign: 'right',
  },
  trendChart: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    gap: 8,
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
  },
  trendBarFill: {
    width: '100%',
    backgroundColor: colors.ink,
    borderRadius: 4,
    minHeight: 20,
  },
  trendLabel: {
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 4,
  },
  cpwCard: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  cpwValue: {
    fontSize: 36,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
    marginBottom: 4,
  },
  cpwLabel: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
  },
  valueCard: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  valueImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.hair,
    marginRight: 12,
  },
  valueInfo: {
    flex: 1,
  },
  valueName: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  valueStats: {
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  valueCPW: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  valueCPWHigh: {
    color: colors.tobacco,
  },
  valueBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueBadgeWarning: {
    backgroundColor: colors.ink,
  },
  valueBadgeText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  opportunityCard: {
    backgroundColor: colors.sand,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  opportunityMessage: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
    marginBottom: 8,
  },
  opportunitySavings: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
    marginBottom: 8,
  },
  opportunityRec: {
    fontSize: 13,
    color: colors.tobacco,
  },
  budgetGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  budgetCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  budgetValue: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  budgetLabel: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  timelineCard: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  timelinePeriod: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
  },
  timelineContent: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLabel: {
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
    width: 120,
  },
  timelineValue: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
  },
  shiftCard: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  shiftFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftFrom: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  shiftArrow: {
    fontSize: 16,
    color: colors.tobacco,
    marginHorizontal: 8,
  },
  shiftTo: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  shiftMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shiftConfidence: {
    fontSize: 12,
    color: colors.tobacco,
  },
  shiftDate: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  sustainabilityCard: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  sustainabilityScore: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    borderRadius: 12,
  },
  sustainabilityValue: {
    fontSize: 32,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  sustainabilityLabel: {
    fontSize: 11,
    color: colors.white,
  },
  sustainabilityStats: {
    flex: 1,
    justifyContent: 'center',
  },
  sustainabilityStat: {
    fontSize: 13,
    color: colors.ink,
    marginBottom: 4,
  },
  sustainabilityComparison: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
    marginTop: 4,
  },
  outfitGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  outfitCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  outfitValue: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  outfitLabel: {
    fontSize: 12,
    color: colors.inkMuted,
  },
});

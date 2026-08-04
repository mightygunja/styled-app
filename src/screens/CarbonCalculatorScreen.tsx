import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  carbonFootprintService,
  WardrobeFootprint,
  ReductionStrategy,
  ComparisonData,
} from '../services/carbonFootprintService';
import { closetAPI, getCurrentUserId } from '../services/api';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors as ds, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CarbonCalculatorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [wardrobeFootprint, setWardrobeFootprint] = useState<WardrobeFootprint | null>(null);
  const [strategies, setStrategies] = useState<ReductionStrategy[]>([]);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'breakdown' | 'reduce'>('overview');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadCarbonData();
  }, []);

  const loadCarbonData = async () => {
    try {
      setLoading(true);

      // Get closet items
      const response = await closetAPI.getItems(getCurrentUserId());
      const items: Item[] = response.data.map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category as any,
        color: item.color,
        brand: item.brand,
        price: item.price || 0,
        wornCount: item.wornCount,
        lastWornDate: item.lastWornDate,
        purchaseDate: item.purchaseDate,
        createdAt: item.createdAt,
        tags: item.tags,
        seasons: item.seasons,
        style: item.style,
      }));

      // Calculate wardrobe footprint
      const footprint = await carbonFootprintService.calculateWardrobeFootprint(items);
      setWardrobeFootprint(footprint);

      // Get reduction strategies
      const reductionStrategies = await carbonFootprintService.getReductionStrategies(footprint.totalKgCO2);
      setStrategies(reductionStrategies);

      // Get comparison data
      const comparisonData = await carbonFootprintService.compareToAverage(footprint.totalKgCO2);
      setComparison(comparisonData);
    } catch (error) {
      console.error('Error loading carbon data:', error);
      showToast('Failed to load carbon footprint data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    const colors = {
      easy: ds.camel,
      medium: ds.camel,
      hard: ds.ink,
    };
    return colors[difficulty as keyof typeof colors] || ds.inkMuted;
  };

  const getImpactColor = (impact: string): string => {
    const colors = {
      low: ds.inkFaint,
      medium: ds.camel,
      high: ds.camel,
    };
    return colors[impact as keyof typeof colors] || ds.inkMuted;
  };

  const getTrendIcon = (trend: string): string => {
    const icons = {
      increasing: '',
      stable: '➡️',
      decreasing: '',
    };
    return icons[trend as keyof typeof icons] || '➡️';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ds.camel} />
          <Text style={styles.loadingText}>Calculating carbon footprint...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!wardrobeFootprint || !comparison) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carbon Calculator</Text>
        <TouchableOpacity onPress={loadCarbonData}>
          <Text style={styles.refreshButton}>○</Text>
        </TouchableOpacity>
      </View>

      {/* Total Footprint Banner */}
      <View style={styles.totalBanner}>
        <Text style={styles.totalLabel}>Your Total Carbon Footprint</Text>
        <View style={styles.totalValueContainer}>
          <Text style={styles.totalValue}>{wardrobeFootprint.totalKgCO2.toFixed(1)}</Text>
          <Text style={styles.totalUnit}>kg CO₂</Text>
        </View>
        <Text style={styles.totalSubtext}>From {wardrobeFootprint.itemCount} items in your wardrobe
        </Text>
        <View style={styles.comparisonBadge}>
          <Text style={styles.comparisonText}>
            {comparison.percentile.toFixed(0)}th percentile
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
          onPress={() =>setSelectedTab('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'breakdown' && styles.tabActive]}
          onPress={() =>setSelectedTab('breakdown')}
        >
          <Text style={[styles.tabText, selectedTab === 'breakdown' && styles.tabTextActive]}>Breakdown
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'reduce' && styles.tabActive]}
          onPress={() =>setSelectedTab('reduce')}
        >
          <Text style={[styles.tabText, selectedTab === 'reduce' && styles.tabTextActive]}>Reduce
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Comparison */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How You Compare</Text>
              <View style={styles.comparisonCard}>
                <Text style={styles.comparisonMessage}>{comparison.message}</Text>
                <View style={styles.comparisonBars}>
                  <View style={styles.comparisonBar}>
                    <Text style={styles.comparisonBarLabel}>You</Text>
                    <View style={styles.comparisonBarTrack}>
                      <View style={[
                        styles.comparisonBarFill,
                        { width: `${(wardrobeFootprint.totalKgCO2 / comparison.averageUser) * 100}%`, backgroundColor: ds.tobacco }
                      ]} />
                    </View>
                    <Text style={styles.comparisonBarValue}>{wardrobeFootprint.totalKgCO2.toFixed(0)} kg</Text>
                  </View>
                  <View style={styles.comparisonBar}>
                    <Text style={styles.comparisonBarLabel}>Average</Text>
                    <View style={styles.comparisonBarTrack}>
                      <View style={[styles.comparisonBarFill, { width: '100%', backgroundColor: ds.inkFaint }]} />
                    </View>
                    <Text style={styles.comparisonBarValue}>{comparison.averageUser} kg</Text>
                  </View>
                  <View style={styles.comparisonBar}>
                    <Text style={styles.comparisonBarLabel}>Target</Text>
                    <View style={styles.comparisonBarTrack}>
                      <View style={[
                        styles.comparisonBarFill,
                        { width: `${(comparison.sustainableTarget / comparison.averageUser) * 100}%`, backgroundColor: ds.camel }
                      ]} />
                    </View>
                    <Text style={styles.comparisonBarValue}>{comparison.sustainableTarget} kg</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Equivalents */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Real-World Equivalents</Text>
              <View style={styles.equivalentsGrid}>
                <View style={styles.equivalentCard}>
                                    <Text style={styles.equivalentValue}>
                    {Math.round(wardrobeFootprint.totalKgCO2 * 4.5)}
                  </Text>
                  <Text style={styles.equivalentLabel}>km driven</Text>
                </View>
                <View style={styles.equivalentCard}>
                                    <Text style={styles.equivalentValue}>
                    {Math.ceil(wardrobeFootprint.totalKgCO2 / 20)}
                  </Text>
                  <Text style={styles.equivalentLabel}>trees needed</Text>
                </View>
                <View style={styles.equivalentCard}>
                                    <Text style={styles.equivalentValue}>
                    {Math.round(wardrobeFootprint.totalKgCO2 * 250)}
                  </Text>
                  <Text style={styles.equivalentLabel}>phone charges</Text>
                </View>
                <View style={styles.equivalentCard}>
                                    <Text style={styles.equivalentValue}>
                    {Math.round(wardrobeFootprint.totalKgCO2 * 1000)}
                  </Text>
                  <Text style={styles.equivalentLabel}>LED hours</Text>
                </View>
              </View>
            </View>

            {/* Timeline */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6-Month Trend</Text>
              <View style={styles.timelineCard}>
                <View style={styles.timelineChart}>
                  {wardrobeFootprint.timeline.map((point, index) => (
                    <View key={index} style={styles.timelinePoint}>
                      <View style={styles.timelineBar}>
                        <View style={[
                          styles.timelineBarFill,
                          { height: `${(point.kgCO2 / 70) * 100}%` }
                        ]} />
                      </View>
                      <Text style={styles.timelineMonth}>{point.month}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Projections */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Future Projections</Text>
              {wardrobeFootprint.projections.map((proj, index) => (
                <View key={index} style={styles.projectionCard}>
                  <View style={styles.projectionHeader}>
                    <Text style={styles.projectionPeriod}>{proj.period}</Text>
                    <Text style={styles.projectionTrend}>{getTrendIcon(proj.trend)}</Text>
                  </View>
                  <Text style={styles.projectionValue}>{proj.kgCO2.toFixed(1)} kg CO₂</Text>
                  <Text style={styles.projectionDescription}>
                    {proj.trend === 'decreasing' ? 'Improving trend' : 
                     proj.trend === 'increasing' ? 'Increasing trend' : 'Stable trend'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Breakdown Tab */}
        {selectedTab === 'breakdown' && (
          <>
            {/* Category Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>By Category</Text>
              {wardrobeFootprint.breakdown.map((cat, index) => (
                <View key={index} style={styles.breakdownCard}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownCategory}>
                      {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
                    </Text>
                    <Text style={styles.breakdownValue}>{cat.kgCO2.toFixed(1)} kg</Text>
                  </View>
                  <View style={styles.breakdownBar}>
                    <View style={[styles.breakdownBarFill, { width: `${cat.percentage}%` }]} />
                  </View>
                  <Text style={styles.breakdownDetails}>
                    {cat.itemCount} items • {cat.percentage.toFixed(0)}% of total
                  </Text>
                </View>
              ))}
            </View>

            {/* Top Emitters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Highest Impact Items</Text>
              {wardrobeFootprint.topEmitters.map((emitter, index) => (
                <View key={index} style={styles.emitterCard}>
                  <View style={styles.emitterRank}>
                    <Text style={styles.emitterRankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.emitterInfo}>
                    <Text style={styles.emitterName}>{emitter.item.name}</Text>
                    <Text style={styles.emitterCategory}>{emitter.item.category}</Text>
                  </View>
                  <Text style={styles.emitterValue}>{emitter.kgCO2.toFixed(1)} kg</Text>
                </View>
              ))}
            </View>

            {/* Lowest Emitters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>◉ Lowest Impact Items</Text>
              {wardrobeFootprint.lowestEmitters.map((emitter, index) => (
                <View key={index} style={styles.emitterCard}>
                  <View style={[styles.emitterRank, { backgroundColor: ds.camel }]}>
                    <Text style={styles.emitterRankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.emitterInfo}>
                    <Text style={styles.emitterName}>{emitter.item.name}</Text>
                    <Text style={styles.emitterCategory}>{emitter.item.category}</Text>
                  </View>
                  <Text style={[styles.emitterValue, { color: ds.camel }]}>
                    {emitter.kgCO2.toFixed(1)} kg
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Reduce Tab */}
        {selectedTab === 'reduce' && (
          <>
            {/* Recommendations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
              <View style={styles.recommendationsCard}>
                {comparison.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={styles.recommendationBullet}>•</Text>
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Reduction Strategies */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>◎ Reduction Strategies</Text>
              {strategies.map((strategy, index) => (
                <View key={index} style={styles.strategyCard}>
                  <View style={styles.strategyHeader}>
                    <View style={styles.strategyTitleRow}>
                      <Text style={styles.strategyTitle}>{strategy.title}</Text>
                      <View style={[styles.strategyImpact, { backgroundColor: getImpactColor(strategy.impact) }]}>
                        <Text style={styles.strategyImpactText}>{strategy.impact.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.strategyDescription}>{strategy.description}</Text>
                  </View>

                  <View style={styles.strategyMetrics}>
                    <View style={styles.strategyMetric}>
                      <Text style={styles.strategyMetricLabel}>Reduction</Text>
                      <Text style={styles.strategyMetricValue}>
                        -{strategy.percentageReduction}%
                      </Text>
                    </View>
                    <View style={styles.strategyMetric}>
                      <Text style={styles.strategyMetricLabel}>Difficulty</Text>
                      <View style={[styles.strategyDifficulty, { backgroundColor: getDifficultyColor(strategy.difficulty) }]}>
                        <Text style={styles.strategyDifficultyText}>
                          {strategy.difficulty.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.strategyMetric}>
                      <Text style={styles.strategyMetricLabel}>Timeframe</Text>
                      <Text style={styles.strategyMetricValue}>{strategy.timeframe}</Text>
                    </View>
                  </View>

                  <View style={styles.strategySteps}>
                    <Text style={styles.strategyStepsTitle}>Steps:</Text>
                    {strategy.steps.map((step, stepIndex) => (
                      <Text key={stepIndex} style={styles.strategyStep}>
                        {stepIndex + 1}. {step}
                      </Text>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.strategyButton}>
                    <Text style={styles.strategyButtonText}>Start Strategy</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Offset Option */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Offset Your Emissions</Text>
              <View style={styles.offsetCard}>
                <Text style={styles.offsetTitle}>Carbon Offset Programs</Text>
                <Text style={styles.offsetDescription}>Offset your {wardrobeFootprint.totalKgCO2.toFixed(0)} kg CO₂ footprint by supporting environmental projects
                </Text>
                <View style={styles.offsetStats}>
                  <View style={styles.offsetStat}>
                    <Text style={styles.offsetStatValue}>
                      ${Math.ceil(wardrobeFootprint.totalKgCO2 * 0.5)}
                    </Text>
                    <Text style={styles.offsetStatLabel}>Estimated Cost</Text>
                  </View>
                  <View style={styles.offsetStat}>
                    <Text style={styles.offsetStatValue}>
                      {Math.ceil(wardrobeFootprint.totalKgCO2 / 20)}
                    </Text>
                    <Text style={styles.offsetStatLabel}>Trees Equivalent</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.offsetButton}>
                  <Text style={styles.offsetButtonText}>View Offset Projects</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: ds.inkMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: ds.inkMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: ds.hair,
  },
  backButton: {
    fontSize: 16,
    color: ds.inkMuted,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  refreshButton: {
    fontSize: 20,
    color: ds.ink,
  },
  totalBanner: {
    padding: 24,
    backgroundColor: ds.ink,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 56,
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
  },
  totalUnit: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
  },
  totalSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  comparisonBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: ds.camel,
  },
  comparisonText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: ds.camel,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: ds.hair,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: ds.camel,
  },
  tabText: {
    fontSize: 15,
    fontFamily: fonts.sansMedium,
    color: ds.inkMuted,
  },
  tabTextActive: {
    color: ds.camel,
    fontFamily: fonts.sansSemiBold,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: ds.paper,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 16,
  },
  comparisonCard: {
    backgroundColor: ds.paper,
    padding: 20,
  },
  comparisonMessage: {
    fontSize: 15,
    color: ds.ink,
    marginBottom: 20,
    lineHeight: 22,
  },
  comparisonBars: {
    gap: 16,
  },
  comparisonBar: {
    gap: 6,
  },
  comparisonBarLabel: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.inkMuted,
  },
  comparisonBarTrack: {
    height: 8,
    backgroundColor: ds.hair,
    overflow: 'hidden',
  },
  comparisonBarFill: {
    height: '100%',
  },
  comparisonBarValue: {
    fontSize: 12,
    color: ds.inkMuted,
  },
  equivalentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  equivalentCard: {
    width: (width - 52) / 2,
    backgroundColor: ds.paper,
    padding: 16,
    alignItems: 'center',
  },
  equivalentIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  equivalentValue: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 4,
  },
  equivalentLabel: {
    fontSize: 12,
    color: ds.inkMuted,
    textAlign: 'center',
  },
  timelineCard: {
    backgroundColor: ds.paper,
    padding: 20,
  },
  timelineChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  timelinePoint: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  timelineBar: {
    width: 24,
    height: 100,
    backgroundColor: ds.hair,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  timelineBarFill: {
    width: '100%',
    backgroundColor: ds.camel,
  },
  timelineMonth: {
    fontSize: 11,
    color: ds.inkMuted,
  },
  projectionCard: {
    backgroundColor: ds.paper,
    padding: 16,
    marginBottom: 12,
  },
  projectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectionPeriod: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  projectionTrend: {
    fontSize: 20,
  },
  projectionValue: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: ds.camel,
    marginBottom: 4,
  },
  projectionDescription: {
    fontSize: 13,
    color: ds.inkMuted,
  },
  breakdownCard: {
    marginBottom: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownCategory: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  breakdownValue: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.camel,
  },
  breakdownBar: {
    height: 8,
    backgroundColor: ds.paper,
    overflow: 'hidden',
    marginBottom: 6,
  },
  breakdownBarFill: {
    height: '100%',
    backgroundColor: ds.camel,
  },
  breakdownDetails: {
    fontSize: 12,
    color: ds.inkMuted,
  },
  emitterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ds.paper,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  emitterRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ds.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emitterRankText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
  },
  emitterInfo: {
    flex: 1,
  },
  emitterName: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 2,
  },
  emitterCategory: {
    fontSize: 12,
    color: ds.inkMuted,
  },
  emitterValue: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  recommendationsCard: {
    backgroundColor: ds.sand,
    padding: 16,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  recommendationBullet: {
    fontSize: 16,
    color: ds.camel,
    fontFamily: fonts.sansSemiBold,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#065f46',
    lineHeight: 20,
  },
  strategyCard: {
    backgroundColor: ds.paper,
    padding: 16,
    marginBottom: 16,
  },
  strategyHeader: {
    marginBottom: 16,
  },
  strategyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  strategyTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginRight: 12,
  },
  strategyImpact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  strategyImpactText: {
    fontSize: 9,
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
  },
  strategyDescription: {
    fontSize: 14,
    color: ds.inkMuted,
    lineHeight: 20,
  },
  strategyMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: ds.hair,
  },
  strategyMetric: {
    flex: 1,
    alignItems: 'center',
  },
  strategyMetricLabel: {
    fontSize: 11,
    color: ds.inkMuted,
    marginBottom: 4,
  },
  strategyMetricValue: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.camel,
  },
  strategyDifficulty: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  strategyDifficultyText: {
    fontSize: 9,
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
  },
  strategySteps: {
    marginBottom: 16,
  },
  strategyStepsTitle: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 8,
  },
  strategyStep: {
    fontSize: 13,
    color: ds.inkMuted,
    lineHeight: 20,
    marginBottom: 4,
  },
  strategyButton: {
    backgroundColor: ds.camel,
    paddingVertical: 12,
    alignItems: 'center',
  },
  strategyButtonText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
  },
  offsetCard: {
    backgroundColor: ds.sand,
    padding: 20,
    borderWidth: 1,
    borderColor: ds.camel,
  },
  offsetTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: '#065f46',
    marginBottom: 8,
  },
  offsetDescription: {
    fontSize: 14,
    color: '#065f46',
    lineHeight: 20,
    marginBottom: 16,
  },
  offsetStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  offsetStat: {
    flex: 1,
    alignItems: 'center',
  },
  offsetStatValue: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: ds.camel,
    marginBottom: 4,
  },
  offsetStatLabel: {
    fontSize: 12,
    color: '#065f46',
    textAlign: 'center',
  },
  offsetButton: {
    backgroundColor: ds.camel,
    paddingVertical: 14,
    alignItems: 'center',
  },
  offsetButtonText: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
  },
});

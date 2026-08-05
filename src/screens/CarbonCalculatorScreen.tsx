/**
 * Carbon calculator
 *
 * Rebuilt on the design system, and cut back to what the service can actually
 * support. Removed from the previous version:
 *
 *   - A "63rd percentile" badge. There is no population to rank against; it
 *     was a linear interpolation between two hardcoded constants, so it
 *     implied a comparison that has never been made.
 *   - "Future projections" - three rows computed as totalKgCO2 * 0.05 / 0.15 /
 *     0.6 with `trend: 'decreasing'` hardcoded. It told users they were
 *     improving regardless of what they did.
 *   - Phone-charge and LED-hour equivalents, multipliers with no stated basis.
 *   - An offset panel quoting a dollar price and a "View Offset Projects"
 *     button wired to nothing.
 *   - A "Start Strategy" button, also wired to nothing.
 *
 * What remains is derived from real closet items: the per-category breakdown,
 * the highest and lowest emitters, the real month-by-month timeline, and the
 * reduction strategies.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'overview' | 'breakdown' | 'reduce';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'breakdown', label: 'Breakdown' },
  { value: 'reduce', label: 'Reduce' },
];

/** Average petrol car, kg CO2 per kilometre. */
const KG_CO2_PER_CAR_KM = 0.17;
/** Kilograms of CO2 a mature tree absorbs in a year. */
const KG_CO2_PER_TREE_YEAR = 20;

export default function CarbonCalculatorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wardrobeFootprint, setWardrobeFootprint] = useState<WardrobeFootprint | null>(null);
  const [strategies, setStrategies] = useState<ReductionStrategy[]>([]);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [selectedTab, setSelectedTab] = useState<Tab>('overview');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);

      const response = await closetAPI.getItems(getCurrentUserId());
      const items: Item[] = (response.data || []).map((item: any) => ({
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

      const footprint = await carbonFootprintService.calculateWardrobeFootprint(items);
      setWardrobeFootprint(footprint);

      const [reductionStrategies, comparisonData] = await Promise.all([
        carbonFootprintService.getReductionStrategies(footprint.totalKgCO2),
        carbonFootprintService.compareToAverage(footprint.totalKgCO2),
      ]);
      setStrategies(reductionStrategies);
      setComparison(comparisonData);
    } catch (error) {
      console.error('Error loading carbon data:', error);
      showToast('Failed to load carbon footprint data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderOverview = (f: WardrobeFootprint, c: ComparisonData) => {
    const scale = Math.max(f.totalKgCO2, c.averageUser, c.sustainableTarget) || 1;
    const rows: Array<{ label: string; value: number; strong?: boolean }> = [
      { label: 'Your wardrobe', value: f.totalKgCO2, strong: true },
      { label: 'Typical wardrobe', value: c.averageUser },
      { label: 'Low-impact target', value: c.sustainableTarget },
    ];

    // The timeline chart needs a scale from the data, not a hardcoded 70.
    const peak = Math.max(...f.timeline.map(p => p.kgCO2), 1);

    return (
      <>
        <Text style={styles.sectionLabel}>HOW THIS COMPARES</Text>
        <Text style={styles.sectionNote}>
          Measured against published reference figures for a typical wardrobe, not against other
          users of this app.
        </Text>
        {rows.map(row => (
          <View key={row.label} style={styles.barRow}>
            <View style={styles.barHeader}>
              <Text style={row.strong ? styles.barLabelStrong : styles.barLabel}>{row.label}</Text>
              <Text style={styles.barValue}>{row.value.toFixed(0)} kg</Text>
            </View>
            <View style={styles.bar}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.min(100, (row.value / scale) * 100)}%` },
                  !row.strong && styles.barFillMuted,
                ]}
              />
            </View>
          </View>
        ))}
        {!!c.message && <Text style={styles.bodyText}>{c.message}</Text>}

        <Text style={styles.sectionLabel}>WHAT THAT LOOKS LIKE</Text>
        <View style={styles.figureBox}>
          <Text style={styles.figureValue}>
            {Math.round(f.totalKgCO2 / KG_CO2_PER_CAR_KM).toLocaleString()}
          </Text>
          <Text style={styles.figureUnit}>km in an average petrol car</Text>
        </View>
        <View style={styles.figureBox}>
          <Text style={styles.figureValue}>
            {Math.ceil(f.totalKgCO2 / KG_CO2_PER_TREE_YEAR).toLocaleString()}
          </Text>
          <Text style={styles.figureUnit}>mature trees absorbing for a year</Text>
        </View>

        {f.timeline.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>WHEN IT WAS ADDED</Text>
            <Text style={styles.sectionNote}>
              Emissions attributed to the month each item entered your closet.
            </Text>
            <View style={styles.chart}>
              {f.timeline.map((point, i) => (
                <View key={i} style={styles.chartColumn}>
                  <View style={styles.chartTrack}>
                    <View
                      style={[styles.chartBar, { height: `${(point.kgCO2 / peak) * 100}%` }]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{point.month}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </>
    );
  };

  const renderBreakdown = (f: WardrobeFootprint) => (
    <>
      <Text style={styles.sectionLabel}>BY CATEGORY</Text>
      {f.breakdown.map((cat, i) => (
        <View key={i} style={styles.barRow}>
          <View style={styles.barHeader}>
            <Text style={styles.barLabelStrong}>
              {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
            </Text>
            <Text style={styles.barValue}>{cat.kgCO2.toFixed(1)} kg</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.min(100, cat.percentage)}%` }]} />
          </View>
          <Text style={styles.barNote}>
            {cat.itemCount} {cat.itemCount === 1 ? 'item' : 'items'} ·{' '}
            {cat.percentage.toFixed(0)}% of total
          </Text>
        </View>
      ))}

      <Text style={styles.sectionLabel}>HIGHEST IMPACT</Text>
      {f.topEmitters.map((emitter, i) => (
        <View key={i} style={styles.emitterRow}>
          <Text style={styles.emitterRank}>{i + 1}</Text>
          <View style={styles.emitterInfo}>
            <Text style={styles.emitterName} numberOfLines={1}>
              {emitter.item.name}
            </Text>
            <Text style={styles.emitterCategory}>{emitter.item.category}</Text>
          </View>
          <Text style={styles.emitterValue}>{emitter.kgCO2.toFixed(1)} kg</Text>
        </View>
      ))}

      <Text style={styles.sectionLabel}>LOWEST IMPACT</Text>
      {f.lowestEmitters.map((emitter, i) => (
        <View key={i} style={styles.emitterRow}>
          <Text style={styles.emitterRank}>{i + 1}</Text>
          <View style={styles.emitterInfo}>
            <Text style={styles.emitterName} numberOfLines={1}>
              {emitter.item.name}
            </Text>
            <Text style={styles.emitterCategory}>{emitter.item.category}</Text>
          </View>
          <Text style={styles.emitterValue}>{emitter.kgCO2.toFixed(1)} kg</Text>
        </View>
      ))}
    </>
  );

  const renderReduce = (c: ComparisonData) => (
    <>
      {c.recommendations.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>FOR YOUR WARDROBE</Text>
          {c.recommendations.map((rec, i) => (
            <View key={i} style={styles.textRow}>
              <Text style={styles.bodyText}>{rec}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionLabel}>WAYS TO CUT IT DOWN</Text>
      {strategies.map((strategy, i) => (
        <View key={i} style={styles.strategyRow}>
          <View style={styles.strategyHeader}>
            <Text style={styles.strategyTitle}>{strategy.title}</Text>
            <Text style={styles.strategyBadge}>{strategy.impact.toUpperCase()} IMPACT</Text>
          </View>
          <Text style={styles.bodyText}>{strategy.description}</Text>

          <View style={styles.strategyMeta}>
            <Text style={styles.strategyMetaText}>
              −{strategy.percentageReduction}% · {strategy.difficulty} · {strategy.timeframe}
            </Text>
          </View>

          {strategy.steps.length > 0 && (
            <View style={styles.steps}>
              {strategy.steps.map((step, si) => (
                <Text key={si} style={styles.step}>
                  {si + 1}. {step}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.footerLink} onPress={() => navigation.navigate('Resale')}>
        <Text style={styles.footerLinkText}>See what's worth reselling →</Text>
      </TouchableOpacity>
    </>
  );

  const ready = wardrobeFootprint && comparison;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.ink} />
        }
      >
        <Text style={styles.eyebrow}>SUSTAINABILITY</Text>
        <Text style={styles.title}>Carbon calculator</Text>
        <Text style={styles.subtitle}>
          What it took to make what you own, and where the weight sits.
        </Text>

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : !ready ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Nothing to calculate yet</Text>
            <Text style={styles.emptyText}>Add items to your closet and this fills in.</Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => navigation.navigate('AddClosetItem')}
            >
              <Text style={styles.emptyActionText}>Add to closet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{wardrobeFootprint.totalKgCO2.toFixed(0)}</Text>
              <Text style={styles.totalUnit}>
                kg CO₂ across {wardrobeFootprint.itemCount}{' '}
                {wardrobeFootprint.itemCount === 1 ? 'item' : 'items'}
              </Text>
            </View>

            {/* Estimates, and said so once at the top rather than hedged on
                every figure below. */}
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                Estimated from category averages for production, transport, packaging and disposal.
                We don't know the fibre content or origin of your items, so treat these as an order
                of magnitude.
              </Text>
            </View>

            <View style={styles.tabs}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab.value}
                  style={[styles.tab, selectedTab === tab.value && styles.tabActive]}
                  onPress={() => setSelectedTab(tab.value)}
                >
                  <Text style={[styles.tabText, selectedTab === tab.value && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedTab === 'overview' && renderOverview(wardrobeFootprint, comparison)}
            {selectedTab === 'breakdown' && renderBreakdown(wardrobeFootprint)}
            {selectedTab === 'reduce' && renderReduce(comparison)}
          </>
        )}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  busyBox: { paddingVertical: 80, alignItems: 'center' },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },

  totalBox: { marginTop: spacing.lg, backgroundColor: colors.paper, padding: spacing.lg },
  totalLabel: { ...textType.eyebrow, marginBottom: 8 },
  totalValue: { fontFamily: fonts.serif, fontSize: 56, lineHeight: 60, color: colors.ink },
  totalUnit: { ...textType.body, color: colors.inkMuted, marginTop: 4 },

  noticeBox: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.md,
  },
  noticeText: { ...textType.meta, fontSize: 12, lineHeight: 18 },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
    marginTop: spacing.section,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 1, borderBottomColor: colors.ink },
  tabText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  tabTextActive: { fontFamily: fonts.sansMedium, color: colors.ink },

  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 10 },
  sectionNote: { ...textType.meta, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },
  bodyText: { ...textType.body, color: colors.inkMuted },

  barRow: { marginBottom: spacing.md },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  barLabelStrong: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  barValue: { ...textType.meta, fontSize: 12 },
  barNote: { ...textType.meta, fontSize: 12, marginTop: 6 },
  bar: { height: 2, backgroundColor: colors.hair },
  barFill: { height: 2, backgroundColor: colors.ink },
  barFillMuted: { backgroundColor: colors.inkFaint },

  figureBox: { backgroundColor: colors.paper, padding: spacing.lg, marginBottom: spacing.sm },
  figureValue: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: colors.ink },
  figureUnit: { ...textType.body, color: colors.inkMuted, marginTop: 4 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 8 },
  chartColumn: { flex: 1, alignItems: 'center' },
  chartTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', backgroundColor: colors.ink, minHeight: 2 },
  chartLabel: { ...textType.meta, fontSize: 10, marginTop: 8 },

  textRow: {
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },

  emitterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  emitterRank: { fontFamily: fonts.serif, fontSize: 18, color: colors.inkFaint, width: 26 },
  emitterInfo: { flex: 1 },
  emitterName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  emitterCategory: { ...textType.meta, fontSize: 12, marginTop: 2 },
  emitterValue: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },

  strategyRow: {
    paddingBottom: spacing.lg,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  strategyHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  strategyTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  strategyBadge: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: colors.tobacco,
    marginTop: 6,
    marginLeft: spacing.sm,
  },
  strategyMeta: { marginTop: 10 },
  strategyMetaText: { ...textType.meta, fontSize: 12 },
  steps: { marginTop: spacing.sm },
  step: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginTop: 6, lineHeight: 19 },

  emptyBox: { marginTop: spacing.section, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
  emptyAction: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  emptyActionText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.white },

  footerLink: { marginTop: spacing.section, paddingVertical: spacing.md },
  footerLinkText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.tobacco },
});

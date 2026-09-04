/**
 * Sustainability
 *
 * Rebuilt on the design system, and stripped of numbers that had nothing
 * behind them. The previous version computed the user's water footprint as
 * `totalItems * 2500` and their waste as `totalItems * 0.5`, then presented
 * both as fact. It also listed three carbon offset products with dollar
 * prices attached to buttons that did nothing.
 *
 * What is left is what can actually be derived from the closet, with the
 * estimates named as estimates.
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from '../components/BackButton';
import { RootStackParamList } from '../navigation/types';
import { sustainabilityService, WardrobeSustainability } from '../services/sustainabilityService';
import { closetAPI, getCurrentUserId } from '../services/api';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'overview' | 'impact' | 'actions';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'impact', label: 'Impact' },
  { value: 'actions', label: 'Actions' },
];

/**
 * Kilograms of CO2 per kilometre for an average petrol car, used for the one
 * comparison on this screen. The previous version multiplied by 4 with no
 * stated basis.
 */
const KG_CO2_PER_CAR_KM = 0.17;

export default function SustainabilityScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<WardrobeSustainability | null>(null);
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

      setAnalysis(await sustainabilityService.analyzeWardrobe(items));
    } catch (error) {
      console.error('Error loading sustainability analysis:', error);
      showToast('Failed to load sustainability data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderOverview = (a: WardrobeSustainability) => (
    <>
      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{a.totalItems}</Text>
          <Text style={styles.statLabel}>ITEMS</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{a.sustainableItems}</Text>
          <Text style={styles.statLabel}>SCORING WELL</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{a.totalItems - a.sustainableItems}</Text>
          <Text style={styles.statLabel}>ROOM TO IMPROVE</Text>
        </View>
      </View>

      {a.recommendations.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>WHAT WE'D CHANGE</Text>
          {a.recommendations.map((rec, i) => (
            <View key={i} style={styles.textRow}>
              <Text style={styles.bodyText}>{rec}</Text>
            </View>
          ))}
        </>
      )}

      {a.topBrands.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>BRANDS YOU ACTUALLY WEAR</Text>
          <Text style={styles.sectionNote}>
            Ranked by real wear count from your closet — not by any sustainability rating.
          </Text>
          {a.topBrands.map((brand, i) => (
            <View key={i} style={styles.brandRow}>
              <View style={styles.brandHeader}>
                <Text style={styles.brandName}>{brand.brand}</Text>
                <Text style={styles.brandWears}>
                  {brand.wears} {brand.wears === 1 ? 'wear' : 'wears'}
                </Text>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${Math.min(100, brand.score)}%` }]} />
              </View>
            </View>
          ))}
        </>
      )}
    </>
  );

  const renderImpact = (a: WardrobeSustainability) => (
    <>
      <Text style={styles.sectionLabel}>CARBON</Text>
      <View style={styles.figureBox}>
        <Text style={styles.figureValue}>{a.totalCarbonFootprint.toFixed(0)}</Text>
        <Text style={styles.figureUnit}>kg CO₂ to produce your wardrobe</Text>
        <Text style={styles.figureNote}>
          About the same as driving{' '}
          {Math.round(a.totalCarbonFootprint / KG_CO2_PER_CAR_KM).toLocaleString()} km in an average
          petrol car.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>WATER</Text>
      <View style={styles.figureBox}>
        <Text style={styles.figureValue}>{Math.round(a.totalWaterLitres).toLocaleString()}</Text>
        <Text style={styles.figureUnit}>litres used in production</Text>
        <Text style={styles.figureNote}>
          Roughly 2,700 litres go into a cotton t-shirt and 7,500 into a pair of jeans.
        </Text>
      </View>

      {/* Both figures above are category averages. Saying so is the difference
          between an estimate and a claim. */}
      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>
          Both figures are estimated from category averages. We don't know the fibre content of your
          items, so a per-item number would be false precision. Treat them as an order of magnitude,
          not a measurement.
        </Text>
      </View>
    </>
  );

  const renderActions = (a: WardrobeSustainability) => (
    <>
      <Text style={styles.sectionLabel}>WORTH DOING</Text>
      <Text style={styles.sectionNote}>
        Ordered by how much difference each would make, with how hard it is to actually do.
      </Text>
      {[...a.improvements]
        .sort((x, y) => y.impact - x.impact)
        .map((improvement, i) => (
          <View key={i} style={styles.actionRow}>
            <View style={styles.actionHeader}>
              <Text style={styles.actionTitle}>{improvement.action}</Text>
              <Text style={styles.actionDifficulty}>{improvement.difficulty.toUpperCase()}</Text>
            </View>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.min(100, improvement.impact)}%` }]} />
            </View>
          </View>
        ))}

      <Text style={styles.sectionLabel}>CERTIFICATIONS WORTH LOOKING FOR</Text>
      <Text style={styles.sectionNote}>
        On a label, these mean something specific has been independently checked.
      </Text>
      <View style={styles.certRow}>
        {['GOTS', 'Fair Trade', 'OEKO-TEX', 'B Corp', 'Bluesign', 'Cradle to Cradle'].map(cert => (
          <View key={cert} style={styles.cert}>
            <Text style={styles.certText}>{cert}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.footerLink} onPress={() => navigation.navigate('Resale')}>
        <Text style={styles.footerLinkText}>See what's worth reselling →</Text>
      </TouchableOpacity>
    </>
  );

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
        <Text style={styles.title}>Your wardrobe impact</Text>
        <Text style={styles.subtitle}>
          What your closet cost to make, and what would change it.
        </Text>

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : !analysis ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Nothing to analyse yet</Text>
            <Text style={styles.emptyText}>Add items to your closet and this fills in.</Text>
          </View>
        ) : analysis.totalItems === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Your closet is empty</Text>
            <Text style={styles.emptyText}>
              There is nothing to measure until there are items in it.
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => navigation.navigate('AddClosetItem')}
            >
              <Text style={styles.emptyActionText}>Add to closet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* The grade is typographic rather than a coloured banner. The
                palette carries no semantic green, and a red-to-green scale
                would be the only place in the app using colour to mean good
                or bad. */}
            <View style={styles.gradeBox}>
              <Text style={styles.gradeLabel}>WARDROBE GRADE</Text>
              <Text style={styles.gradeValue}>{analysis.grade}</Text>
              <Text style={styles.gradeScore}>
                {analysis.averageScore.toFixed(0)} out of 100 ·{' '}
                {analysis.sustainablePercentage.toFixed(0)}% of items score well
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

            {selectedTab === 'overview' && renderOverview(analysis)}
            {selectedTab === 'impact' && renderImpact(analysis)}
            {selectedTab === 'actions' && renderActions(analysis)}
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

  gradeBox: {
    borderRadius: radius.md, marginTop: spacing.lg, backgroundColor: colors.paper, padding: spacing.lg },
  gradeLabel: { ...textType.eyebrow, marginBottom: 8 },
  gradeValue: { fontFamily: fonts.serif, fontSize: 56, lineHeight: 60, color: colors.ink },
  gradeScore: { ...textType.meta, marginTop: 6 },

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

  statRow: { flexDirection: 'row', marginTop: spacing.lg },
  stat: { flex: 1 },
  statValue: { fontFamily: fonts.serif, fontSize: 28, color: colors.ink },
  statLabel: { ...textType.microLabel, fontSize: 9, color: colors.inkFaint, marginTop: 4 },

  textRow: {
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  bodyText: { ...textType.body, color: colors.inkMuted },

  brandRow: { marginBottom: spacing.md },
  brandHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  brandName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  brandWears: { ...textType.meta, fontSize: 12 },
  bar: { height: 2, backgroundColor: colors.hair },
  barFill: { height: 2, backgroundColor: colors.ink },

  figureBox: {
    borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.lg, marginBottom: spacing.md },
  figureValue: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, color: colors.ink },
  figureUnit: { ...textType.body, color: colors.ink, marginTop: 4 },
  figureNote: { ...textType.meta, fontSize: 12, lineHeight: 18, marginTop: 10 },

  noticeBox: {
    borderRadius: radius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.md,
  },
  noticeText: { ...textType.meta, fontSize: 12, lineHeight: 18 },

  actionRow: {
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  actionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  actionTitle: { flex: 1, ...textType.body, color: colors.ink, marginRight: spacing.sm },
  actionDifficulty: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: colors.tobacco,
    marginTop: 4,
  },

  certRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cert: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  certText: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },

  emptyBox: {
    borderRadius: radius.md, marginTop: spacing.section, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
  emptyAction: {
    borderRadius: radius.full,
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

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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  sustainabilityService,
  WardrobeSustainability,
  SustainabilityGrade,
} from '../services/sustainabilityService';
import { closetAPI, getCurrentUserId } from '../services/api';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SustainabilityScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<WardrobeSustainability | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'impact' | 'actions'>('overview');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadSustainabilityAnalysis();
  }, []);

  const loadSustainabilityAnalysis = async () => {
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

      // Analyze wardrobe sustainability
      const wardrobeAnalysis = await sustainabilityService.analyzeWardrobe(items);
      setAnalysis(wardrobeAnalysis);
    } catch (error) {
      console.error('Error loading sustainability analysis:', error);
      showToast('Failed to load sustainability data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: SustainabilityGrade): string => {
    const colors: Record<SustainabilityGrade, string> = {
      'A+': '#10b981',
      'A': '#22c55e',
      'B': '#84cc16',
      'C': '#f59e0b',
      'D': '#f97316',
      'F': '#ef4444',
    };
    return colors[grade];
  };

  const getDifficultyColor = (difficulty: string): string => {
    const colors = {
      easy: '#10b981',
      medium: '#f59e0b',
      hard: '#ef4444',
    };
    return colors[difficulty as keyof typeof colors] || '#64748b';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Analyzing sustainability...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analysis) {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sustainability</Text>
        <TouchableOpacity onPress={loadSustainabilityAnalysis}>
          <Text style={styles.refreshButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Grade Banner */}
      <View style={[styles.gradeBanner, { backgroundColor: getGradeColor(analysis.grade) }]}>
        <View style={styles.gradeContent}>
          <Text style={styles.gradeLabel}>Your Wardrobe Grade</Text>
          <Text style={styles.gradeValue}>{analysis.grade}</Text>
          <Text style={styles.gradeScore}>{analysis.averageScore.toFixed(0)}/100</Text>
        </View>
        <View style={styles.gradeStats}>
          <View style={styles.gradeStat}>
            <Text style={styles.gradeStatValue}>{analysis.sustainablePercentage.toFixed(0)}%</Text>
            <Text style={styles.gradeStatLabel}>Sustainable</Text>
          </View>
          <View style={styles.gradeStat}>
            <Text style={styles.gradeStatValue}>{analysis.totalCarbonFootprint.toFixed(0)}</Text>
            <Text style={styles.gradeStatLabel}>kg CO₂</Text>
          </View>
        </View>
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
          style={[styles.tab, selectedTab === 'impact' && styles.tabActive]}
          onPress={() => setSelectedTab('impact')}
        >
          <Text style={[styles.tabText, selectedTab === 'impact' && styles.tabTextActive]}>
            Impact
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'actions' && styles.tabActive]}
          onPress={() => setSelectedTab('actions')}
        >
          <Text style={[styles.tabText, selectedTab === 'actions' && styles.tabTextActive]}>
            Actions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{analysis.totalItems}</Text>
                <Text style={styles.statLabel}>Total Items</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{analysis.sustainableItems}</Text>
                <Text style={styles.statLabel}>Sustainable</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{analysis.totalItems - analysis.sustainableItems}</Text>
                <Text style={styles.statLabel}>To Improve</Text>
              </View>
            </View>

            {/* Recommendations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌱 Recommendations</Text>
              {analysis.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationCard}>
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>

            {/* Where the wearing actually goes - real counts, not a brand rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Brands you actually wear</Text>
              {analysis.topBrands.map((brand, index) => (
                <View key={index} style={styles.brandCard}>
                  <View style={styles.brandInfo}>
                    <Text style={styles.brandName}>{brand.brand}</Text>
                    <Text style={styles.brandScore}>
                      {brand.wears} {brand.wears === 1 ? 'wear' : 'wears'}
                    </Text>
                  </View>
                  <View style={styles.brandBar}>
                    <View style={[styles.brandBarFill, { width: `${brand.score}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Impact Tab */}
        {selectedTab === 'impact' && (
          <>
            {/* Carbon Footprint */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌍 Carbon Footprint</Text>
              <View style={styles.impactCard}>
                <View style={styles.impactHeader}>
                  <Text style={styles.impactValue}>{analysis.totalCarbonFootprint.toFixed(1)}</Text>
                  <Text style={styles.impactUnit}>kg CO₂</Text>
                </View>
                <Text style={styles.impactDescription}>
                  Total carbon emissions from your wardrobe
                </Text>
                <View style={styles.impactComparison}>
                  <Text style={styles.impactComparisonText}>
                    Equivalent to driving {(analysis.totalCarbonFootprint * 4).toFixed(0)} km
                  </Text>
                </View>
              </View>
            </View>

            {/* Offset Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌳 Offset Your Impact</Text>
              <View style={styles.offsetCard}>
                <View style={styles.offsetOption}>
                  <Text style={styles.offsetIcon}>🌲</Text>
                  <View style={styles.offsetInfo}>
                    <Text style={styles.offsetTitle}>Plant Trees</Text>
                    <Text style={styles.offsetDescription}>
                      {Math.ceil(analysis.totalCarbonFootprint / 20)} trees needed
                    </Text>
                  </View>
                  <Text style={styles.offsetCost}>
                    ${Math.ceil(analysis.totalCarbonFootprint * 0.4)}
                  </Text>
                </View>
                <View style={styles.offsetOption}>
                  <Text style={styles.offsetIcon}>⚡</Text>
                  <View style={styles.offsetInfo}>
                    <Text style={styles.offsetTitle}>Renewable Energy</Text>
                    <Text style={styles.offsetDescription}>
                      Support clean energy projects
                    </Text>
                  </View>
                  <Text style={styles.offsetCost}>
                    ${Math.ceil(analysis.totalCarbonFootprint * 0.6)}
                  </Text>
                </View>
                <View style={styles.offsetOption}>
                  <Text style={styles.offsetIcon}>🌊</Text>
                  <View style={styles.offsetInfo}>
                    <Text style={styles.offsetTitle}>Ocean Cleanup</Text>
                    <Text style={styles.offsetDescription}>
                      Remove plastic from oceans
                    </Text>
                  </View>
                  <Text style={styles.offsetCost}>
                    ${Math.ceil(analysis.totalCarbonFootprint * 0.5)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Environmental Impact */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💧 Environmental Impact</Text>
              <View style={styles.impactGrid}>
                <View style={styles.impactItem}>
                  <Text style={styles.impactItemIcon}>💧</Text>
                  <Text style={styles.impactItemValue}>
                    {(analysis.totalItems * 2500).toLocaleString()}L
                  </Text>
                  <Text style={styles.impactItemLabel}>Water Used</Text>
                </View>
                <View style={styles.impactItem}>
                  <Text style={styles.impactItemIcon}>♻️</Text>
                  <Text style={styles.impactItemValue}>
                    {Math.floor(analysis.sustainablePercentage)}%
                  </Text>
                  <Text style={styles.impactItemLabel}>Recyclable</Text>
                </View>
                <View style={styles.impactItem}>
                  <Text style={styles.impactItemIcon}>🗑️</Text>
                  <Text style={styles.impactItemValue}>
                    {(analysis.totalItems * 0.5).toFixed(1)}kg
                  </Text>
                  <Text style={styles.impactItemLabel}>Waste</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Actions Tab */}
        {selectedTab === 'actions' && (
          <>
            {/* Improvement Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ Improvement Actions</Text>
              {analysis.improvements.map((improvement, index) => (
                <View key={index} style={styles.actionCard}>
                  <View style={styles.actionHeader}>
                    <View style={styles.actionTitleRow}>
                      <Text style={styles.actionTitle}>{improvement.action}</Text>
                      <View style={[styles.actionDifficulty, { backgroundColor: getDifficultyColor(improvement.difficulty) }]}>
                        <Text style={styles.actionDifficultyText}>
                          {improvement.difficulty.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.actionImpact}>
                      <Text style={styles.actionImpactLabel}>Impact:</Text>
                      <View style={styles.actionImpactBar}>
                        <View style={[styles.actionImpactFill, { width: `${improvement.impact}%` }]} />
                      </View>
                      <Text style={styles.actionImpactValue}>+{improvement.impact}%</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Start Action</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Quick Tips */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Quick Tips</Text>
              <View style={styles.tipsCard}>
                <View style={styles.tipItem}>
                  <Text style={styles.tipIcon}>🛍️</Text>
                  <Text style={styles.tipText}>
                    Buy secondhand to reduce environmental impact by 80%
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipIcon}>👕</Text>
                  <Text style={styles.tipText}>
                    Wear items at least 30 times to maximize value
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipIcon}>🔄</Text>
                  <Text style={styles.tipText}>
                    Repair and upcycle instead of discarding
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.tipIcon}>🌿</Text>
                  <Text style={styles.tipText}>
                    Choose natural, organic, or recycled materials
                  </Text>
                </View>
              </View>
            </View>

            {/* Certifications to Look For */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏆 Certifications to Look For</Text>
              <View style={styles.certificationsGrid}>
                {['GOTS', 'Fair Trade', 'OEKO-TEX', 'B Corp', 'Bluesign', 'Cradle to Cradle'].map((cert, index) => (
                  <View key={index} style={styles.certificationBadge}>
                    <Text style={styles.certificationText}>{cert}</Text>
                  </View>
                ))}
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
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    fontSize: 16,
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  refreshButton: {
    fontSize: 20,
    color: '#2B1F1A',
  },
  gradeBanner: {
    padding: 24,
  },
  gradeContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  gradeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  gradeValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  gradeScore: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  gradeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gradeStat: {
    alignItems: 'center',
  },
  gradeStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  gradeStatLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  recommendationCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  recommendationText: {
    fontSize: 14,
    color: '#065f46',
    lineHeight: 20,
  },
  brandCard: {
    marginBottom: 16,
  },
  brandInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  brandScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  brandBar: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  brandBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  impactCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  impactValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  impactUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
  },
  impactDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  impactComparison: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  impactComparisonText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
  },
  offsetCard: {
    gap: 12,
  },
  offsetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  offsetIcon: {
    fontSize: 32,
  },
  offsetInfo: {
    flex: 1,
  },
  offsetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  offsetDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  offsetCost: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  impactGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  impactItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  impactItemIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  impactItemValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  impactItemLabel: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  actionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionHeader: {
    marginBottom: 12,
  },
  actionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  actionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 12,
  },
  actionDifficulty: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionDifficultyText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  actionImpact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionImpactLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  actionImpactBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  actionImpactFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  actionImpactValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  actionButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  tipsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  tipIcon: {
    fontSize: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  certificationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  certificationBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  certificationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
});

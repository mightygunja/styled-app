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
  mlTrendPredictionService,
  TrendPrediction,
  TrendAnalysis,
  PersonalizedTrendRecommendation,
  TrendAlert,
  ColorTrend,
} from '../services/mlTrendPredictionService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MLTrendPredictionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState<TrendPrediction[]>([]);
  const [analysis, setAnalysis] = useState<TrendAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<PersonalizedTrendRecommendation[]>([]);
  const [alerts, setAlerts] = useState<TrendAlert[]>([]);
  const [colorTrends, setColorTrends] = useState<ColorTrend[]>([]);
  const [selectedTab, setSelectedTab] = useState<'trends' | 'analysis' | 'colors' | 'alerts'>('trends');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trendData, analysisData, recommendationData, alertData, colorData] = await Promise.all([
        mlTrendPredictionService.getTrendPredictions('current'),
        mlTrendPredictionService.getTrendAnalysis(getCurrentUserId()),
        mlTrendPredictionService.getPersonalizedRecommendations(getCurrentUserId()),
        mlTrendPredictionService.getTrendAlerts(getCurrentUserId()),
        mlTrendPredictionService.getColorTrends(),
      ]);

      setTrends(trendData);
      setAnalysis(analysisData);
      setRecommendations(recommendationData);
      setAlerts(alertData);
      setColorTrends(colorData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load trend data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (level: string): string => {
    const colors = {
      'very-high': '#10b981',
      'high': '#22c55e',
      'medium': '#f59e0b',
      'low': '#ef4444',
    };
    return colors[level as keyof typeof colors] || '#64748b';
  };

  const getAlertColor = (type: string): string => {
    const colors = {
      emerging: '#10b981',
      peaking: '#3b82f6',
      declining: '#f59e0b',
    };
    return colors[type as keyof typeof colors] || '#64748b';
  };

  if (loading && trends.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Analyzing trends with ML...</Text>
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
        <Text style={styles.headerTitle}>ML Trend Predictions</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* ML Model Info */}
      <View style={styles.modelInfo}>
        <Text style={styles.modelInfoText}>🤖 AI Model: 87.5% accuracy</Text>
        <Text style={styles.modelInfoSubtext}>Updated weekly • 2.5M data points</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'trends' && styles.tabActive]}
          onPress={() => setSelectedTab('trends')}
        >
          <Text style={[styles.tabText, selectedTab === 'trends' && styles.tabTextActive]}>
            Trends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'analysis' && styles.tabActive]}
          onPress={() => setSelectedTab('analysis')}
        >
          <Text style={[styles.tabText, selectedTab === 'analysis' && styles.tabTextActive]}>
            Analysis
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'colors' && styles.tabActive]}
          onPress={() => setSelectedTab('colors')}
        >
          <Text style={[styles.tabText, selectedTab === 'colors' && styles.tabTextActive]}>
            Colors
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'alerts' && styles.tabActive]}
          onPress={() => setSelectedTab('alerts')}
        >
          <Text style={[styles.tabText, selectedTab === 'alerts' && styles.tabTextActive]}>
            Alerts
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Trends Tab */}
        {selectedTab === 'trends' && (
          <>
            {/* Personalized Recommendations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>For You</Text>
              {recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationCard}>
                  <View style={styles.recommendationHeader}>
                    <Text style={styles.recommendationName}>{rec.trend.name}</Text>
                    <View style={styles.relevanceScore}>
                      <Text style={styles.relevanceScoreText}>
                        {rec.relevanceScore.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.recommendationReason}>{rec.reason}</Text>
                  <View style={styles.recommendationTiming}>
                    <Text style={styles.recommendationTimingText}>
                      {rec.adoptionTiming === 'early' ? '⚡ Early Adopter' :
                       rec.adoptionTiming === 'mainstream' ? '📈 Mainstream' :
                       '⏰ Late Adopter'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* All Trends */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All Predictions</Text>
              {trends.map((trend) => (
                <View key={trend.id} style={styles.trendCard}>
                  <Image source={{ uri: trend.imageUrl }} style={styles.trendImage} />
                  <View style={styles.trendInfo}>
                    <View style={styles.trendHeader}>
                      <Text style={styles.trendName}>{trend.name}</Text>
                      <View
                        style={[
                          styles.confidenceBadge,
                          { backgroundColor: getConfidenceColor(trend.confidenceLevel) },
                        ]}
                      >
                        <Text style={styles.confidenceBadgeText}>
                          {trend.confidence}%
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.trendCategory}>
                      {trend.category.toUpperCase()}
                    </Text>

                    <Text style={styles.trendDescription}>{trend.description}</Text>

                    <View style={styles.trendMetrics}>
                      <View style={styles.trendMetric}>
                        <Text style={styles.trendMetricLabel}>Growth</Text>
                        <Text style={styles.trendMetricValue}>+{trend.growth}%</Text>
                      </View>
                      <View style={styles.trendMetric}>
                        <Text style={styles.trendMetricLabel}>Popularity</Text>
                        <Text style={styles.trendMetricValue}>{trend.popularity}</Text>
                      </View>
                    </View>

                    <View style={styles.trendSources}>
                      <Text style={styles.trendSourcesTitle}>Data Sources:</Text>
                      <View style={styles.trendSourceBars}>
                        <View style={styles.trendSourceBar}>
                          <Text style={styles.trendSourceLabel}>Runway</Text>
                          <View style={styles.trendSourceBarBg}>
                            <View
                              style={[
                                styles.trendSourceBarFill,
                                { width: `${trend.sources.runway}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.trendSourceValue}>{trend.sources.runway}</Text>
                        </View>
                        <View style={styles.trendSourceBar}>
                          <Text style={styles.trendSourceLabel}>Social</Text>
                          <View style={styles.trendSourceBarBg}>
                            <View
                              style={[
                                styles.trendSourceBarFill,
                                { width: `${trend.sources.socialMedia}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.trendSourceValue}>{trend.sources.socialMedia}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.relatedTrends}>
                      <Text style={styles.relatedTrendsTitle}>Related:</Text>
                      <View style={styles.relatedTrendsTags}>
                        {trend.relatedTrends.map((related, idx) => (
                          <View key={idx} style={styles.relatedTrendTag}>
                            <Text style={styles.relatedTrendText}>{related}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Analysis Tab */}
        {selectedTab === 'analysis' && analysis && (
          <>
            {/* Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trend Overview</Text>
              <View style={styles.overviewGrid}>
                <View style={styles.overviewCard}>
                  <Text style={styles.overviewValue}>{analysis.overview.totalTrends}</Text>
                  <Text style={styles.overviewLabel}>Total Trends</Text>
                </View>
                <View style={styles.overviewCard}>
                  <Text style={[styles.overviewValue, { color: '#10b981' }]}>
                    {analysis.overview.emergingTrends}
                  </Text>
                  <Text style={styles.overviewLabel}>Emerging</Text>
                </View>
                <View style={styles.overviewCard}>
                  <Text style={[styles.overviewValue, { color: '#3b82f6' }]}>
                    {analysis.overview.stableTrends}
                  </Text>
                  <Text style={styles.overviewLabel}>Stable</Text>
                </View>
                <View style={styles.overviewCard}>
                  <Text style={[styles.overviewValue, { color: '#f59e0b' }]}>
                    {analysis.overview.decliningTrends}
                  </Text>
                  <Text style={styles.overviewLabel}>Declining</Text>
                </View>
              </View>
            </View>

            {/* Top Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Categories</Text>
              {analysis.topCategories.map((cat, index) => (
                <View key={index} style={styles.categoryCard}>
                  <View style={styles.categoryRank}>
                    <Text style={styles.categoryRankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>
                      {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
                    </Text>
                    <Text style={styles.categoryCount}>{cat.count} trends</Text>
                  </View>
                  <View style={styles.categoryGrowth}>
                    <Text style={styles.categoryGrowthText}>
                      +{cat.growth.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* User Alignment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Trend Alignment</Text>
              <View style={styles.alignmentCard}>
                <View style={styles.alignmentScore}>
                  <Text style={styles.alignmentScoreValue}>
                    {analysis.userAlignment.alignmentScore.toFixed(0)}
                  </Text>
                  <Text style={styles.alignmentScoreLabel}>Alignment Score</Text>
                </View>
                <Text style={styles.alignmentMatching}>
                  {analysis.userAlignment.matchingTrends} matching trends
                </Text>
                <View style={styles.alignmentRecommendations}>
                  <Text style={styles.alignmentRecommendationsTitle}>
                    Recommendations:
                  </Text>
                  {analysis.userAlignment.recommendations.map((rec, idx) => (
                    <Text key={idx} style={styles.alignmentRecommendationItem}>
                      • {rec}
                    </Text>
                  ))}
                </View>
              </View>
            </View>

            {/* Seasonal Forecast */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {analysis.seasonalForecast.season} Forecast
              </Text>
              <View style={styles.forecastCard}>
                <Text style={styles.forecastTitle}>Key Trends:</Text>
                {analysis.seasonalForecast.keyTrends.map((trend, idx) => (
                  <Text key={idx} style={styles.forecastTrend}>
                    {idx + 1}. {trend}
                  </Text>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Colors Tab */}
        {selectedTab === 'colors' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trending Colors</Text>
            {colorTrends.map((color, index) => (
              <View key={index} style={styles.colorCard}>
                <View style={[styles.colorSwatch, { backgroundColor: color.hex }]} />
                <View style={styles.colorInfo}>
                  <Text style={styles.colorName}>{color.name}</Text>
                  {color.pantoneCode && (
                    <Text style={styles.colorPantone}>Pantone {color.pantoneCode}</Text>
                  )}
                  <Text style={styles.colorDescription}>{color.description}</Text>
                  <View style={styles.colorConfidence}>
                    <Text style={styles.colorConfidenceText}>
                      {color.confidence}% confidence
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Alerts Tab */}
        {selectedTab === 'alerts' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trend Alerts</Text>
            {alerts.map((alert) => (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  { borderLeftColor: getAlertColor(alert.type) },
                ]}
              >
                <View style={styles.alertHeader}>
                  <View
                    style={[
                      styles.alertType,
                      { backgroundColor: getAlertColor(alert.type) },
                    ]}
                  >
                    <Text style={styles.alertTypeText}>
                      {alert.type.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.alertTime}>
                    {new Date(alert.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
              </View>
            ))}
          </View>
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
  modelInfo: {
    backgroundColor: '#fffbeb',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#fef3c7',
  },
  modelInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
  },
  modelInfoSubtext: {
    fontSize: 11,
    color: '#b45309',
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
    borderBottomColor: '#f59e0b',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#f59e0b',
    fontWeight: '600',
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
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    flex: 1,
  },
  relevanceScore: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  relevanceScoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  recommendationReason: {
    fontSize: 13,
    color: '#b45309',
    marginBottom: 8,
  },
  recommendationTiming: {
    alignSelf: 'flex-start',
  },
  recommendationTimingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  trendCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  trendImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#e2e8f0',
  },
  trendInfo: {
    padding: 16,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  trendCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 8,
  },
  trendDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  trendMetrics: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  trendMetric: {},
  trendMetricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
  },
  trendMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  trendSources: {
    marginBottom: 12,
  },
  trendSourcesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  trendSourceBars: {
    gap: 8,
  },
  trendSourceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendSourceLabel: {
    width: 60,
    fontSize: 11,
    color: '#64748b',
  },
  trendSourceBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trendSourceBarFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
  },
  trendSourceValue: {
    width: 30,
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
    textAlign: 'right',
  },
  relatedTrends: {},
  relatedTrendsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  relatedTrendsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  relatedTrendTag: {
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  relatedTrendText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  overviewValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  categoryRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: '#64748b',
  },
  categoryGrowth: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryGrowthText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  alignmentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
  },
  alignmentScore: {
    alignItems: 'center',
    marginBottom: 16,
  },
  alignmentScoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 4,
  },
  alignmentScoreLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  alignmentMatching: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  alignmentRecommendations: {},
  alignmentRecommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  alignmentRecommendationItem: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  forecastCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  forecastTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  forecastTrend: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 20,
  },
  colorCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  colorSwatch: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  colorInfo: {
    flex: 1,
  },
  colorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  colorPantone: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  colorDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 18,
  },
  colorConfidence: {},
  colorConfidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  alertCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertType: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertTypeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  alertTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  alertMessage: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
});

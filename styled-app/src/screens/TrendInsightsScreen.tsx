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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  trendPredictionService,
  Trend,
  TrendInsight,
  TrendReport,
  TrendStatus,
} from '../services/trendPredictionService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');
const TREND_CARD_WIDTH = width - 40;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TrendInsightsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<TrendReport | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'rising' | 'insights'>('overview');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadTrendReport();
  }, []);

  const loadTrendReport = async () => {
    try {
      setLoading(true);
      const trendReport = await trendPredictionService.getTrendReport('month');
      setReport(trendReport);
    } catch (error) {
      console.error('Error loading trends:', error);
      showToast('Failed to load trends', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: TrendStatus): string => {
    const colors = {
      rising: '#10b981',
      peak: '#ef4444',
      declining: '#f59e0b',
      stable: '#64748b',
    };
    return colors[status];
  };

  const getStatusIcon = (status: TrendStatus): string => {
    const icons = {
      rising: '📈',
      peak: '🔥',
      declining: '📉',
      stable: '➡️',
    };
    return icons[status];
  };

  const getInsightIcon = (type: string): string => {
    const icons = {
      opportunity: '◈',
      warning: '◆',
      recommendation: '◉',
      analysis: '▭',
    };
    return icons[type as keyof typeof icons] || '◈';
  };

  const getPriorityColor = (priority: string): string => {
    const colors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
    };
    return colors[priority as keyof typeof colors] || '#64748b';
  };

  const renderTrendCard = (trend: Trend) => (
    <TouchableOpacity key={trend.id} style={styles.trendCard}>
      <Image source={{ uri: trend.imageUrl }} style={styles.trendImage} />
      <View style={styles.trendOverlay}>
        <View style={styles.trendHeader}>
          <View style={[styles.trendStatus, { backgroundColor: getStatusColor(trend.status) }]}>
            <Text style={styles.trendStatusText}>
              {getStatusIcon(trend.status)} {trend.status.toUpperCase()}
            </Text>
          </View>
          <View style={styles.trendScore}>
            <Text style={styles.trendScoreNumber}>{trend.score}</Text>
            <Text style={styles.trendScoreLabel}>Score</Text>
          </View>
        </View>
      </View>
      <View style={styles.trendInfo}>
        <Text style={styles.trendName}>{trend.name}</Text>
        <Text style={styles.trendDescription} numberOfLines={2}>
          {trend.description}
        </Text>
        <View style={styles.trendMeta}>
          <View style={styles.trendGrowth}>
            <Text style={[styles.trendGrowthText, { color: trend.growth >= 0 ? '#10b981' : '#ef4444' }]}>
              {trend.growth >= 0 ? '↑' : '↓'} {Math.abs(trend.growth)}%
            </Text>
          </View>
          <View style={styles.trendHashtags}>
            {trend.hashtags.slice(0, 2).map((tag, index) => (
              <Text key={index} style={styles.trendHashtag}>
                #{tag}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderInsightCard = (insight: TrendInsight) => (
    <View
      key={insight.id}
      style={[styles.insightCard, { borderLeftColor: getPriorityColor(insight.priority) }]}
    >
      <View style={styles.insightHeader}>
        <Text style={styles.insightIcon}>{getInsightIcon(insight.type)}</Text>
        <View style={styles.insightContent}>
          <View style={styles.insightTitleRow}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <View style={[styles.insightPriority, { backgroundColor: getPriorityColor(insight.priority) }]}>
              <Text style={styles.insightPriorityText}>{insight.priority}</Text>
            </View>
          </View>
          <Text style={styles.insightDescription}>{insight.description}</Text>
          {insight.actionable && insight.action && (
            <TouchableOpacity style={styles.insightAction}>
              <Text style={styles.insightActionText}>{insight.action} →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Analyzing trends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load trends</Text>
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
        <Text style={styles.headerTitle}>Trend Insights</Text>
        <TouchableOpacity onPress={loadTrendReport}>
          <Text style={styles.refreshButton}>○</Text>
        </TouchableOpacity>
      </View>

      {/* Period Banner */}
      <View style={styles.periodBanner}>
        <Text style={styles.periodTitle}>{report.period}</Text>
        <Text style={styles.periodSummary}>{report.summary}</Text>
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
          style={[styles.tab, selectedTab === 'rising' && styles.tabActive]}
          onPress={() => setSelectedTab('rising')}
        >
          <Text style={[styles.tabText, selectedTab === 'rising' && styles.tabTextActive]}>
            Rising
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'insights' && styles.tabActive]}
          onPress={() => setSelectedTab('insights')}
        >
          <Text style={[styles.tabText, selectedTab === 'insights' && styles.tabTextActive]}>
            Insights
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Top Trends */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Trends</Text>
              {report.topTrends.map(renderTrendCard)}
            </View>

            {/* Declining Trends */}
            {report.decliningTrends.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Declining Trends</Text>
                {report.decliningTrends.map(renderTrendCard)}
              </View>
            )}

            {/* Recommendations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
              <View style={styles.recommendationsCard}>
                {report.personalizedRecommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={styles.recommendationBullet}>•</Text>
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Rising Tab */}
        {selectedTab === 'rising' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rising Trends</Text>
            <Text style={styles.sectionSubtitle}>
              {report.risingTrends.length} trends gaining momentum
            </Text>
            {report.risingTrends.map(renderTrendCard)}
          </View>
        )}

        {/* Insights Tab */}
        {selectedTab === 'insights' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI-Powered Insights</Text>
            <Text style={styles.sectionSubtitle}>
              Personalized analysis based on your style
            </Text>
            {report.insights.map(renderInsightCard)}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
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
  periodBanner: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  periodTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  periodSummary: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
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
    borderBottomColor: '#ef4444',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  trendCard: {
    width: TREND_CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f5f9',
  },
  trendOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trendStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trendStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  trendScore: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  trendScoreNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  trendScoreLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  trendInfo: {
    padding: 16,
  },
  trendName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  trendDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  trendMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendGrowth: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  trendGrowthText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  trendHashtags: {
    flexDirection: 'row',
    gap: 8,
  },
  trendHashtag: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  insightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  insightIcon: {
    fontSize: 24,
  },
  insightContent: {
    flex: 1,
  },
  insightTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  insightTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  insightPriority: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  insightPriorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  insightDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  insightAction: {
    marginTop: 8,
  },
  insightActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  recommendationsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  recommendationBullet: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
});

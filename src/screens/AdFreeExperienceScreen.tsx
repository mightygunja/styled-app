import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  adFreeService,
  AdExperience,
  AdStats,
  AdFreeComparison,
} from '../services/adFreeService';
import { subscriptionService } from '../services/subscriptionService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AdFreeExperienceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [experience, setExperience] = useState<AdExperience | null>(null);
  const [stats, setStats] = useState<AdStats | null>(null);
  const [comparison, setComparison] = useState<AdFreeComparison[]>([]);
  const [userTier, setUserTier] = useState<'free' | 'premium' | 'pro'>('free');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'stats' | 'comparison'>('overview');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const subscription = await subscriptionService.getUserSubscription(getCurrentUserId());
      setUserTier(subscription.tier);

      const [experienceData, statsData, comparisonData] = await Promise.all([
        adFreeService.getAdExperience(subscription.tier),
        adFreeService.getAdStats(getCurrentUserId(), subscription.tier),
        adFreeService.getAdFreeComparison(),
      ]);

      setExperience(experienceData);
      setStats(statsData);
      setComparison(comparisonData);
    } catch (error) {
      console.error('Error loading ad-free data:', error);
      showToast('Failed to load ad-free settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string): string => {
    const colors = {
      free: '#64748b',
      premium: '#8b5cf6',
      pro: '#f59e0b',
    };
    return colors[tier as keyof typeof colors] || '#64748b';
  };

  if (loading && !experience) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading ad-free settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!experience || !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load settings</Text>
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
        <Text style={styles.headerTitle}>Ad-Free Experience</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: experience.isAdFree ? '#10b981' : '#64748b' }]}>
        <Text style={styles.statusText}>
          {experience.isAdFree ? '✓ AD-FREE ACTIVE' : 'ADS ENABLED'}
        </Text>
        <Text style={styles.statusSubtext}>
          {experience.isAdFree 
            ? `${userTier.toUpperCase()} MEMBER`
            : 'Upgrade to remove ads'}
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
          style={[styles.tab, selectedTab === 'stats' && styles.tabActive]}
          onPress={() => setSelectedTab('stats')}
        >
          <Text style={[styles.tabText, selectedTab === 'stats' && styles.tabTextActive]}>
            Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'comparison' && styles.tabActive]}
          onPress={() => setSelectedTab('comparison')}
        >
          <Text style={[styles.tabText, selectedTab === 'comparison' && styles.tabTextActive]}>
            Compare
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Benefits */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Benefits</Text>
              
              <View style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitIconText}>🚫</Text>
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={styles.benefitName}>No Banner Ads</Text>
                  <Text style={styles.benefitDescription}>
                    Enjoy a clean interface without banner advertisements
                  </Text>
                </View>
                <Text style={styles.benefitStatus}>
                  {experience.benefits.noBannerAds ? '✓' : '✗'}
                </Text>
              </View>

              <View style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitIconText}>📺</Text>
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={styles.benefitName}>No Video Ads</Text>
                  <Text style={styles.benefitDescription}>
                    Skip all video advertisements and interruptions
                  </Text>
                </View>
                <Text style={styles.benefitStatus}>
                  {experience.benefits.noVideoAds ? '✓' : '✗'}
                </Text>
              </View>

              <View style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitIconText}>⚡</Text>
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={styles.benefitName}>No Interstitial Ads</Text>
                  <Text style={styles.benefitDescription}>
                    No full-screen ads between content
                  </Text>
                </View>
                <Text style={styles.benefitStatus}>
                  {experience.benefits.noInterstitialAds ? '✓' : '✗'}
                </Text>
              </View>

              <View style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitIconText}>💎</Text>
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={styles.benefitName}>No Sponsored Content</Text>
                  <Text style={styles.benefitDescription}>
                    Remove all sponsored posts from your feed
                  </Text>
                </View>
                <Text style={styles.benefitStatus}>
                  {experience.benefits.noSponsoredContent ? '✓' : '🔒'}
                </Text>
              </View>

              <View style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitIconText}>🎨</Text>
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={styles.benefitName}>Clean Interface</Text>
                  <Text style={styles.benefitDescription}>
                    Minimalist design focused on content
                  </Text>
                </View>
                <Text style={styles.benefitStatus}>
                  {experience.benefits.cleanInterface ? '✓' : '✗'}
                </Text>
              </View>

              <View style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitIconText}>🚀</Text>
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={styles.benefitName}>Faster Loading</Text>
                  <Text style={styles.benefitDescription}>
                    2-3x faster page loads without ad scripts
                  </Text>
                </View>
                <Text style={styles.benefitStatus}>
                  {experience.benefits.fasterLoading ? '✓' : '✗'}
                </Text>
              </View>

              <View style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitIconText}>⭐</Text>
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={styles.benefitName}>Priority Content</Text>
                  <Text style={styles.benefitDescription}>
                    Access premium content before others
                  </Text>
                </View>
                <Text style={styles.benefitStatus}>
                  {experience.benefits.priorityContent ? '✓' : '✗'}
                </Text>
              </View>

              <View style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitIconText}>🎁</Text>
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={styles.benefitName}>Exclusive Features</Text>
                  <Text style={styles.benefitDescription}>
                    Unlock Pro-only features and tools
                  </Text>
                </View>
                <Text style={styles.benefitStatus}>
                  {experience.benefits.exclusiveFeatures ? '✓' : '🔒'}
                </Text>
              </View>
            </View>

            {/* Restrictions (Free Tier) */}
            {!experience.isAdFree && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Ad Experience</Text>
                
                <View style={styles.restrictionCard}>
                  <Text style={styles.restrictionLabel}>Ads per session</Text>
                  <Text style={styles.restrictionValue}>{experience.restrictions.adsPerSession}</Text>
                </View>

                <View style={styles.restrictionCard}>
                  <Text style={styles.restrictionLabel}>Ads per hour</Text>
                  <Text style={styles.restrictionValue}>{experience.restrictions.adsPerHour}</Text>
                </View>

                <View style={styles.restrictionCard}>
                  <Text style={styles.restrictionLabel}>Video ad duration</Text>
                  <Text style={styles.restrictionValue}>{experience.restrictions.videoAdDuration}s</Text>
                </View>

                <View style={styles.restrictionCard}>
                  <Text style={styles.restrictionLabel}>Skippable after</Text>
                  <Text style={styles.restrictionValue}>{experience.restrictions.skipableAfter}s</Text>
                </View>
              </View>
            )}

            {/* Upgrade CTA */}
            {!experience.isAdFree && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.upgradeCard}
                  onPress={() => navigation.navigate('Subscription')}
                >
                  <Text style={styles.upgradeTitle}>Go Ad-Free Today</Text>
                  <Text style={styles.upgradeDescription}>
                    Remove all ads and enjoy a premium experience
                  </Text>
                  <View style={styles.upgradeFeatures}>
                    <Text style={styles.upgradeFeature}>✓ No banner ads</Text>
                    <Text style={styles.upgradeFeature}>✓ No video ads</Text>
                    <Text style={styles.upgradeFeature}>✓ 2x faster loading</Text>
                    <Text style={styles.upgradeFeature}>✓ Clean interface</Text>
                  </View>
                  <Text style={styles.upgradeButton}>Upgrade to Premium →</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Stats Tab */}
        {selectedTab === 'stats' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Ad-Free Stats</Text>

              {experience.isAdFree ? (
                <>
                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <Text style={styles.statIconText}>🚫</Text>
                    </View>
                    <View style={styles.statInfo}>
                      <Text style={styles.statValue}>{stats.totalAdsBlocked.toLocaleString()}</Text>
                      <Text style={styles.statLabel}>Ads Blocked</Text>
                    </View>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <Text style={styles.statIconText}>⏱️</Text>
                    </View>
                    <View style={styles.statInfo}>
                      <Text style={styles.statValue}>{stats.timeSaved} min</Text>
                      <Text style={styles.statLabel}>Time Saved</Text>
                    </View>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <Text style={styles.statIconText}>📊</Text>
                    </View>
                    <View style={styles.statInfo}>
                      <Text style={styles.statValue}>{stats.dataUsageSaved} MB</Text>
                      <Text style={styles.statLabel}>Data Saved</Text>
                    </View>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <Text style={styles.statIconText}>🔥</Text>
                    </View>
                    <View style={styles.statInfo}>
                      <Text style={styles.statValue}>{stats.adFreeStreakDays} days</Text>
                      <Text style={styles.statLabel}>Ad-Free Streak</Text>
                    </View>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <Text style={styles.statIconText}>💰</Text>
                    </View>
                    <View style={styles.statInfo}>
                      <Text style={styles.statValue}>${stats.estimatedValue}</Text>
                      <Text style={styles.statLabel}>Estimated Value</Text>
                    </View>
                  </View>

                  <View style={styles.insightCard}>
                    <Text style={styles.insightTitle}>🎉 Amazing Progress!</Text>
                    <Text style={styles.insightText}>
                      You've saved {Math.round(stats.timeSaved / 60)} hours by going ad-free. 
                      That's {Math.round(stats.timeSaved / 60)} hours you can spend on what matters most!
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.noStatsCard}>
                  <Text style={styles.noStatsText}>
                    Upgrade to Premium to start tracking your ad-free stats
                  </Text>
                  <TouchableOpacity
                    style={styles.noStatsButton}
                    onPress={() => navigation.navigate('Subscription')}
                  >
                    <Text style={styles.noStatsButtonText}>Upgrade Now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}

        {/* Comparison Tab */}
        {selectedTab === 'comparison' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Feature Comparison</Text>

              <View style={styles.comparisonTable}>
                {/* Header */}
                <View style={styles.comparisonHeader}>
                  <Text style={[styles.comparisonHeaderText, styles.comparisonFeature]}>
                    Feature
                  </Text>
                  <Text style={[styles.comparisonHeaderText, styles.comparisonTier]}>
                    Free
                  </Text>
                  <Text style={[styles.comparisonHeaderText, styles.comparisonTier]}>
                    Premium
                  </Text>
                  <Text style={[styles.comparisonHeaderText, styles.comparisonTier]}>
                    Pro
                  </Text>
                </View>

                {/* Rows */}
                {comparison.map((item, idx) => (
                  <View key={idx} style={styles.comparisonRow}>
                    <Text style={[styles.comparisonText, styles.comparisonFeature]}>
                      {item.feature}
                    </Text>
                    <Text style={[styles.comparisonText, styles.comparisonTier, styles.comparisonFree]}>
                      {item.free}
                    </Text>
                    <Text style={[styles.comparisonText, styles.comparisonTier, styles.comparisonPremium]}>
                      {item.premium}
                    </Text>
                    <Text style={[styles.comparisonText, styles.comparisonTier, styles.comparisonPro]}>
                      {item.pro}
                    </Text>
                  </View>
                ))}
              </View>

              {userTier === 'free' && (
                <TouchableOpacity
                  style={styles.comparisonUpgradeButton}
                  onPress={() => navigation.navigate('Subscription')}
                >
                  <Text style={styles.comparisonUpgradeText}>Upgrade to Premium</Text>
                </TouchableOpacity>
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
    color: '#ef4444',
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
  statusBanner: {
    padding: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
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
    borderBottomColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitIconText: {
    fontSize: 24,
  },
  benefitInfo: {
    flex: 1,
  },
  benefitName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  benefitStatus: {
    fontSize: 20,
    marginLeft: 8,
  },
  restrictionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  restrictionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400e',
  },
  restrictionValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
  },
  upgradeCard: {
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    padding: 24,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  upgradeDescription: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 16,
  },
  upgradeFeatures: {
    marginBottom: 16,
  },
  upgradeFeature: {
    fontSize: 13,
    color: '#ffffff',
    marginBottom: 6,
  },
  upgradeButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statIconText: {
    fontSize: 28,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  insightCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  noStatsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  noStatsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  noStatsButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  noStatsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  comparisonTable: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  comparisonHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  comparisonRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  comparisonText: {
    fontSize: 11,
    color: '#64748b',
  },
  comparisonFeature: {
    flex: 2,
    fontWeight: '600',
  },
  comparisonTier: {
    flex: 1,
    textAlign: 'center',
  },
  comparisonFree: {
    color: '#64748b',
  },
  comparisonPremium: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  comparisonPro: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  comparisonUpgradeButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  comparisonUpgradeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});

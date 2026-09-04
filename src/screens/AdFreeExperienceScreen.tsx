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
import { colors as ds, fonts, radius } from '../theme/designSystem';

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
      free: ds.inkMuted,
      premium: ds.ink,
      pro: ds.camel,
    };
    return colors[tier as keyof typeof colors] || ds.inkMuted;
  };

  if (loading && !experience) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ds.tobacco} />
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
      <View style={[styles.statusBanner, { backgroundColor: experience.isAdFree ? ds.tobacco : ds.inkMuted }]}>
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
    backgroundColor: ds.card,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: ds.tobacco,
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
  statusBanner: {
    padding: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 12,
    color: ds.white,
    opacity: 0.9,
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
    borderBottomColor: ds.ink,
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: ds.inkMuted,
  },
  tabTextActive: {
    color: ds.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: ds.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: ds.sand,
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
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 12,
    color: ds.inkMuted,
    lineHeight: 18,
  },
  benefitStatus: {
    fontSize: 20,
    marginLeft: 8,
  },
  restrictionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: ds.sand,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
  },
  restrictionLabel: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: ds.tobacco,
  },
  restrictionValue: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
  },
  upgradeCard: {
    backgroundColor: ds.ink,
    borderRadius: radius.lg,
    padding: 24,
  },
  upgradeTitle: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
    marginBottom: 8,
  },
  upgradeDescription: {
    fontSize: 14,
    color: ds.white,
    opacity: 0.9,
    marginBottom: 16,
  },
  upgradeFeatures: {
    marginBottom: 16,
  },
  upgradeFeature: {
    fontSize: 13,
    color: ds.white,
    marginBottom: 6,
  },
  upgradeButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
    textAlign: 'center',
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: ds.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: ds.sand,
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
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: ds.inkMuted,
  },
  insightCard: {
    backgroundColor: ds.sand,
    borderRadius: radius.md,
    padding: 20,
    marginTop: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: ds.tobacco,
    lineHeight: 20,
  },
  noStatsCard: {
    backgroundColor: ds.paper,
    borderRadius: radius.md,
    padding: 32,
    alignItems: 'center',
  },
  noStatsText: {
    fontSize: 14,
    color: ds.inkMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  noStatsButton: {
    backgroundColor: ds.ink,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  noStatsButtonText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  comparisonTable: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ds.hair,
  },
  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: ds.paper,
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: ds.hair,
  },
  comparisonHeaderText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  comparisonRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: ds.paper,
  },
  comparisonText: {
    fontSize: 11,
    color: ds.inkMuted,
  },
  comparisonFeature: {
    flex: 2,
    fontFamily: fonts.sansSemiBold,
  },
  comparisonTier: {
    flex: 1,
    textAlign: 'center',
  },
  comparisonFree: {
    color: ds.inkMuted,
  },
  comparisonPremium: {
    color: ds.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  comparisonPro: {
    color: ds.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  comparisonUpgradeButton: {
    backgroundColor: ds.ink,
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: 'center',
    marginTop: 16,
  },
  comparisonUpgradeText: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
});

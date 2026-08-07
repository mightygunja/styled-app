import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  subscriptionService,
  SubscriptionPlan,
  UserSubscription,
  SubscriptionStats,
  BillingHistory,
  BillingPeriod,
} from '../services/subscriptionService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors as ds, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SubscriptionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [selectedTab, setSelectedTab] = useState<'plans' | 'current' | 'billing'>('plans');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, subscriptionData, statsData, historyData] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getUserSubscription(getCurrentUserId()),
        subscriptionService.getSubscriptionStats(getCurrentUserId()),
        subscriptionService.getBillingHistory(getCurrentUserId()),
      ]);

      setPlans(plansData);
      setCurrentSubscription(subscriptionData);
      setStats(statsData);
      setBillingHistory(historyData);
      setBillingPeriod(subscriptionData.billingPeriod);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load subscription data', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * This screen is no longer registered in AppNavigator - 33 Trends is free and
   * has no paid tiers. It is kept only so the file continues to type-check,
   * matching how the other retired screens are handled.
   *
   * subscribeService.subscribe() now throws by design, so this surfaces an
   * error rather than silently writing a fake paid tier if the screen is ever
   * re-wired without being rewritten first.
   */
  const handleSubscribe = async (_tier: 'premium' | 'pro') => {
    try {
      setLoading(true);
      const subscription = await subscriptionService.subscribe();

      setCurrentSubscription(subscription);
      await loadData();
    } catch (error) {
      console.error('Error subscribing:', error);
      showToast('Failed to subscribe', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: 'premium' | 'pro') => {
    try {
      setLoading(true);
      showToast('Upgrading subscription...', 'info');

      const subscription = await subscriptionService.upgrade(
        getCurrentUserId(),
        tier,
        billingPeriod
      );

      setCurrentSubscription(subscription);
      showToast(`Upgraded to ${tier}!`, 'success');
      
      await loadData();
    } catch (error) {
      console.error('Error upgrading:', error);
      showToast('Failed to upgrade', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setLoading(true);
      const subscription = await subscriptionService.cancelSubscription(getCurrentUserId());
      setCurrentSubscription(subscription);
      showToast('Subscription canceled', 'success');
      
      await loadData();
    } catch (error) {
      console.error('Error canceling:', error);
      showToast('Failed to cancel subscription', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setLoading(true);
      const subscription = await subscriptionService.reactivateSubscription(getCurrentUserId());
      setCurrentSubscription(subscription);
      showToast('Subscription reactivated!', 'success');
      
      await loadData();
    } catch (error) {
      console.error('Error reactivating:', error);
      showToast('Failed to reactivate', 'error');
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

  const getStatusColor = (status: string): string => {
    const colors = {
      active: ds.tobacco,
      trial: ds.tobacco,
      canceled: ds.tobacco,
      expired: ds.inkFaint,
      past_due: ds.camel,
    };
    return colors[status as keyof typeof colors] || ds.inkMuted;
  };

  if (loading && plans.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ds.tobacco} />
          <Text style={styles.loadingText}>Loading subscription plans...</Text>
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
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Current Tier Badge */}
      {currentSubscription && (
        <View style={[styles.tierBadge, { backgroundColor: getTierColor(currentSubscription.tier) }]}>
          <Text style={styles.tierBadgeText}>
            Current: {currentSubscription.tier.toUpperCase()}
          </Text>
          <Text style={styles.tierBadgeStatus}>
            {currentSubscription.status.toUpperCase()}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'plans' && styles.tabActive]}
          onPress={() => setSelectedTab('plans')}
        >
          <Text style={[styles.tabText, selectedTab === 'plans' && styles.tabTextActive]}>
            Plans
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'current' && styles.tabActive]}
          onPress={() => setSelectedTab('current')}
        >
          <Text style={[styles.tabText, selectedTab === 'current' && styles.tabTextActive]}>
            Current
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'billing' && styles.tabActive]}
          onPress={() => setSelectedTab('billing')}
        >
          <Text style={[styles.tabText, selectedTab === 'billing' && styles.tabTextActive]}>
            Billing
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Plans Tab */}
        {selectedTab === 'plans' && (
          <>
            {/* Billing Period Toggle */}
            <View style={styles.section}>
              <View style={styles.billingToggle}>
                <TouchableOpacity
                  style={[
                    styles.billingOption,
                    billingPeriod === 'monthly' && styles.billingOptionActive,
                  ]}
                  onPress={() => setBillingPeriod('monthly')}
                >
                  <Text
                    style={[
                      styles.billingOptionText,
                      billingPeriod === 'monthly' && styles.billingOptionTextActive,
                    ]}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.billingOption,
                    billingPeriod === 'yearly' && styles.billingOptionActive,
                  ]}
                  onPress={() => setBillingPeriod('yearly')}
                >
                  <Text
                    style={[
                      styles.billingOptionText,
                      billingPeriod === 'yearly' && styles.billingOptionTextActive,
                    ]}
                  >
                    Yearly
                  </Text>
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>Save 17%</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Plan Cards */}
            <View style={styles.section}>
              {plans.map((plan) => (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    plan.popular && styles.planCardPopular,
                    currentSubscription?.tier === plan.tier && styles.planCardCurrent,
                  ]}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                    </View>
                  )}

                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  </View>

                  <View style={styles.planPricing}>
                    <Text style={styles.planPrice}>
                      ${billingPeriod === 'monthly' ? plan.price.monthly : plan.price.yearly}
                    </Text>
                    <Text style={styles.planPeriod}>
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </Text>
                  </View>

                  {billingPeriod === 'yearly' && plan.savings && (
                    <Text style={styles.planSavings}>
                      Save ${subscriptionService.calculateYearlySavings(plan.tier).toFixed(2)}/year
                    </Text>
                  )}

                  <View style={styles.planFeatures}>
                    {plan.features.map((feature, idx) => (
                      <View key={idx} style={styles.planFeature}>
                        <Text style={styles.planFeatureIcon}>✓</Text>
                        <Text style={styles.planFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  {currentSubscription?.tier === plan.tier ? (
                    <View style={styles.currentPlanButton}>
                      <Text style={styles.currentPlanButtonText}>Current Plan</Text>
                    </View>
                  ) : plan.tier === 'free' ? (
                    <View style={styles.freePlanButton}>
                      <Text style={styles.freePlanButtonText}>Free Forever</Text>
                    </View>
                  ) : currentSubscription?.tier === 'free' ? (
                    <TouchableOpacity
                      style={[styles.subscribeButton, { backgroundColor: getTierColor(plan.tier) }]}
                      onPress={() => handleSubscribe(plan.tier as 'premium' | 'pro')}
                      disabled={loading}
                    >
                      <Text style={styles.subscribeButtonText}>
                        {loading ? 'Processing...' : 'Subscribe'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.upgradeButton, { backgroundColor: getTierColor(plan.tier) }]}
                      onPress={() => handleUpgrade(plan.tier as 'premium' | 'pro')}
                      disabled={loading}
                    >
                      <Text style={styles.upgradeButtonText}>
                        {loading ? 'Processing...' : 'Upgrade'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Current Tab */}
        {selectedTab === 'current' && currentSubscription && stats && (
          <>
            {/* Subscription Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Subscription Details</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Plan</Text>
                  <Text style={styles.infoValue}>
                    {currentSubscription.tier.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(currentSubscription.status) },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {currentSubscription.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Billing</Text>
                  <Text style={styles.infoValue}>
                    {currentSubscription.billingPeriod}
                  </Text>
                </View>
                {currentSubscription.nextBillingDate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Next Billing</Text>
                    <Text style={styles.infoValue}>
                      {new Date(currentSubscription.nextBillingDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Auto-Renew</Text>
                  <Text style={styles.infoValue}>
                    {currentSubscription.autoRenew ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Usage Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Usage & Limits</Text>
              <View style={styles.usageCard}>
                <View style={styles.usageItem}>
                  <Text style={styles.usageLabel}>Closet Items</Text>
                  <Text style={styles.usageValue}>
                    {stats.usage.closetItems} / {stats.limits.closetItems === 'unlimited' ? '∞' : stats.limits.closetItems}
                  </Text>
                  {stats.limits.closetItems !== 'unlimited' && (
                    <View style={styles.usageBar}>
                      <View
                        style={[
                          styles.usageBarFill,
                          {
                            width: `${(stats.usage.closetItems / (stats.limits.closetItems as number)) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.usageItem}>
                  <Text style={styles.usageLabel}>Outfits</Text>
                  <Text style={styles.usageValue}>
                    {stats.usage.outfits} / {stats.limits.outfits === 'unlimited' ? '∞' : stats.limits.outfits}
                  </Text>
                  {stats.limits.outfits !== 'unlimited' && (
                    <View style={styles.usageBar}>
                      <View
                        style={[
                          styles.usageBarFill,
                          {
                            width: `${(stats.usage.outfits / (stats.limits.outfits as number)) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.usageItem}>
                  <Text style={styles.usageLabel}>Styling Sessions</Text>
                  <Text style={styles.usageValue}>
                    {stats.usage.stylingSessions} / {stats.limits.stylingSessions}
                  </Text>
                  <View style={styles.usageBar}>
                    <View
                      style={[
                        styles.usageBarFill,
                        {
                          width: stats.limits.stylingSessions > 0
                            ? `${(stats.usage.stylingSessions / stats.limits.stylingSessions) * 100}%`
                            : '0%',
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Actions */}
            {currentSubscription.tier !== 'free' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Manage Subscription</Text>
                {currentSubscription.status === 'active' ? (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>
                      {loading ? 'Processing...' : 'Cancel Subscription'}
                    </Text>
                  </TouchableOpacity>
                ) : currentSubscription.status === 'canceled' ? (
                  <TouchableOpacity
                    style={styles.reactivateButton}
                    onPress={handleReactivate}
                    disabled={loading}
                  >
                    <Text style={styles.reactivateButtonText}>
                      {loading ? 'Processing...' : 'Reactivate Subscription'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </>
        )}

        {/* Billing Tab */}
        {selectedTab === 'billing' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing History</Text>
            {billingHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No billing history</Text>
              </View>
            ) : (
              billingHistory.map((item) => (
                <View key={item.id} style={styles.billingCard}>
                  <View style={styles.billingHeader}>
                    <Text style={styles.billingDate}>
                      {new Date(item.date).toLocaleDateString()}
                    </Text>
                    <View
                      style={[
                        styles.billingStatus,
                        { backgroundColor: getStatusColor(item.status) },
                      ]}
                    >
                      <Text style={styles.billingStatusText}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.billingDescription}>{item.description}</Text>
                  <View style={styles.billingFooter}>
                    <Text style={styles.billingAmount}>${item.amount.toFixed(2)}</Text>
                    {item.invoiceUrl && (
                      <TouchableOpacity>
                        <Text style={styles.billingInvoice}>View Invoice →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
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
  tierBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  tierBadgeText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  tierBadgeStatus: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
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
    fontSize: 15,
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
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: ds.paper,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  billingOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  billingOptionActive: {
    backgroundColor: ds.card,
    shadowColor: ds.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  billingOptionText: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: ds.inkMuted,
  },
  billingOptionTextActive: {
    color: ds.ink,
    fontFamily: fonts.sansSemiBold,
  },
  savingsBadge: {
    backgroundColor: ds.ink,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  planCard: {
    backgroundColor: ds.paper,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardPopular: {
    borderColor: ds.ink,
  },
  planCardCurrent: {
    borderColor: ds.ink,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: ds.ink,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: ds.inkMuted,
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 36,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  planPeriod: {
    fontSize: 16,
    color: ds.inkMuted,
    marginLeft: 4,
  },
  planSavings: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
    marginBottom: 16,
  },
  planFeatures: {
    marginBottom: 20,
    gap: 12,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planFeatureIcon: {
    fontSize: 16,
    color: ds.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  planFeatureText: {
    fontSize: 14,
    color: ds.ink,
    flex: 1,
  },
  currentPlanButton: {
    backgroundColor: ds.ink,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  freePlanButton: {
    backgroundColor: ds.hair,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  freePlanButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.inkMuted,
  },
  subscribeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  upgradeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  infoCard: {
    backgroundColor: ds.paper,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: ds.inkMuted,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  usageCard: {
    backgroundColor: ds.paper,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  usageItem: {
    gap: 8,
  },
  usageLabel: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  usageValue: {
    fontSize: 13,
    color: ds.inkMuted,
  },
  usageBar: {
    height: 8,
    backgroundColor: ds.hair,
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: ds.ink,
  },
  cancelButton: {
    backgroundColor: ds.sand,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ds.sand,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
  },
  reactivateButton: {
    backgroundColor: ds.sand,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ds.sand,
  },
  reactivateButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: ds.inkFaint,
  },
  billingCard: {
    backgroundColor: ds.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billingDate: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  billingStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  billingStatusText: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  billingDescription: {
    fontSize: 13,
    color: ds.inkMuted,
    marginBottom: 12,
  },
  billingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingAmount: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  billingInvoice: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
  },
});

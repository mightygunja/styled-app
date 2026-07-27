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
import { MOCK_USER_ID } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

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
        subscriptionService.getUserSubscription(MOCK_USER_ID),
        subscriptionService.getSubscriptionStats(MOCK_USER_ID),
        subscriptionService.getBillingHistory(MOCK_USER_ID),
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

  const handleSubscribe = async (tier: 'premium' | 'pro') => {
    try {
      setLoading(true);
      showToast('Processing subscription...', 'info');

      const subscription = await subscriptionService.subscribe(
        MOCK_USER_ID,
        tier,
        billingPeriod
      );

      setCurrentSubscription(subscription);
      showToast(`Successfully subscribed to ${tier}!`, 'success');
      
      // Reload data
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
        MOCK_USER_ID,
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
      const subscription = await subscriptionService.cancelSubscription(MOCK_USER_ID);
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
      const subscription = await subscriptionService.reactivateSubscription(MOCK_USER_ID);
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
      free: '#64748b',
      premium: '#8b5cf6',
      pro: '#f59e0b',
    };
    return colors[tier as keyof typeof colors] || '#64748b';
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      active: '#10b981',
      trial: '#3b82f6',
      canceled: '#ef4444',
      expired: '#94a3b8',
      past_due: '#f59e0b',
    };
    return colors[status as keyof typeof colors] || '#64748b';
  };

  if (loading && plans.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
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
  tierBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  tierBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tierBadgeStatus: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 15,
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
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
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
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  billingOptionTextActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  savingsBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  planCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardPopular: {
    borderColor: '#8b5cf6',
  },
  planCardCurrent: {
    borderColor: '#10b981',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  planPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  planPeriod: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 4,
  },
  planSavings: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
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
    color: '#10b981',
    fontWeight: 'bold',
  },
  planFeatureText: {
    fontSize: 14,
    color: '#0f172a',
    flex: 1,
  },
  currentPlanButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  freePlanButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  freePlanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
  },
  subscribeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  upgradeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  infoCard: {
    backgroundColor: '#f8fafc',
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
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  usageCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  usageItem: {
    gap: 8,
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  usageValue: {
    fontSize: 13,
    color: '#64748b',
  },
  usageBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
  },
  cancelButton: {
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  reactivateButton: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  reactivateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  billingCard: {
    backgroundColor: '#f8fafc',
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
    fontWeight: '600',
    color: '#0f172a',
  },
  billingStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  billingStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  billingDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  billingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  billingInvoice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
});

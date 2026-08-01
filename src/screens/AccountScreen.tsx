import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { subscriptionService, SubscriptionPlan, UserSubscription } from '../services/subscriptionService';
import { affiliateClicksService } from '../services/firestore';
import { getCurrentUserId } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { colors, fonts, type as textType } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketplaceStats, setMarketplaceStats] = useState<{ clicks: number; estimatedCommission: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const [sub, allPlans, clicks] = await Promise.all([
        subscriptionService.getUserSubscription(getCurrentUserId()),
        subscriptionService.getPlans(),
        affiliateClicksService.getForUser(getCurrentUserId()),
      ]);
      setSubscription(sub);
      setPlans(allPlans);
      setMarketplaceStats({
        clicks: clicks.length,
        estimatedCommission: clicks.reduce((sum, c) => sum + c.estimatedCommission, 0),
      });
    } catch (error) {
      console.error('Error loading account:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  const currentPlan = plans.find(p => p.tier === subscription?.tier) || plans[0];
  const nextPlan = subscription?.tier === 'free'
    ? plans.find(p => p.tier === 'premium')
    : subscription?.tier === 'premium'
    ? plans.find(p => p.tier === 'pro')
    : undefined;

  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            {memberSince && <Text style={styles.memberSince}>MEMBER SINCE {memberSince.toUpperCase()}</Text>}
            <Text style={styles.name}>{user?.displayName || 'Your account'}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>

        {currentPlan && (
          <View style={styles.planCard}>
            <View style={styles.planCardTop}>
              <Text style={styles.planCardEyebrow}>STYLED {currentPlan.name.toUpperCase()}</Text>
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>CURRENT</Text>
              </View>
            </View>
            <Text style={styles.planPrice}>
              {currentPlan.price.monthly === 0 ? 'Free' : `$${currentPlan.price.monthly}`}
              {currentPlan.price.monthly > 0 && <Text style={styles.planPriceUnit}>/month</Text>}
            </Text>
            <Text style={styles.planDescription}>{currentPlan.description}</Text>
            {nextPlan && (
              <Button
                title={`Upgrade to ${nextPlan.name}`}
                variant="outline"
                onPress={() => navigation.navigate('Subscription')}
                textStyle={{ color: colors.bone }}
                style={styles.upgradeButton}
              />
            )}
          </View>
        )}

        <Text style={styles.sectionLabel}>THE TIERS</Text>
        <View style={styles.tiersCard}>
          {plans.map((plan, i) => (
            <View key={plan.id} style={[styles.tierRow, i === plans.length - 1 && styles.tierRowLast]}>
              <View>
                <Text style={styles.tierName}>
                  {plan.name} <Text style={styles.tierPrice}>
                    {plan.price.monthly === 0 ? '$0/mo' : `$${plan.price.monthly}/mo`}
                  </Text>
                </Text>
              </View>
              <Text style={styles.tierFeatures}>{plan.features.slice(0, 2).join(' · ')}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.prefsCard}>
          <TouchableOpacity style={styles.prefRow} onPress={() => navigation.navigate('StyleProfileBuilder')}>
            <View>
              <Text style={styles.prefTitle}>Style profile quiz</Text>
              <Text style={styles.prefSubtitle}>RETAKE · QUARTERLY</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.prefRow} onPress={() => navigation.navigate('EditProfile')}>
            <View>
              <Text style={styles.prefTitle}>Edit profile</Text>
              <Text style={styles.prefSubtitle}>NAME · PHOTO · BIO</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.prefRow} onPress={() => navigation.navigate('PaymentMethods')}>
            <View>
              <Text style={styles.prefTitle}>Payment methods</Text>
              <Text style={styles.prefSubtitle}>SAVED CARDS</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.prefRow, styles.prefRowLast]} onPress={() => navigation.navigate('Settings')}>
            <View>
              <Text style={styles.prefTitle}>Settings</Text>
              <Text style={styles.prefSubtitle}>NOTIFICATIONS · LANGUAGE · ACCESSIBILITY</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>STYLIST MARKETPLACE</Text>
        <View style={styles.prefsCard}>
          <TouchableOpacity style={styles.prefRow} onPress={() => navigation.navigate('StylistMarketplace')}>
            <View>
              <Text style={styles.prefTitle}>Book a stylist</Text>
              <Text style={styles.prefSubtitle}>BROWSE · SPECIALTIES · RATES</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.prefRow, styles.prefRowLast]} onPress={() => navigation.navigate('MySessions')}>
            <View>
              <Text style={styles.prefTitle}>My sessions</Text>
              <Text style={styles.prefSubtitle}>UPCOMING · PAST</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>SHOPPING</Text>
        <View style={styles.prefsCard}>
          <TouchableOpacity style={styles.prefRow} onPress={() => navigation.navigate('Shop')}>
            <View>
              <Text style={styles.prefTitle}>Shop your matches</Text>
              <Text style={styles.prefSubtitle}>MATCHED TO YOUR PROFILE</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.prefRow, !(marketplaceStats && marketplaceStats.clicks > 0) && styles.prefRowLast]}
            onPress={() => navigation.navigate('Wishlist')}
          >
            <View>
              <Text style={styles.prefTitle}>Saved items</Text>
              <Text style={styles.prefSubtitle}>YOUR WISHLIST</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
          {marketplaceStats && marketplaceStats.clicks > 0 && (
            <View style={[styles.prefRow, styles.prefRowLast]}>
              <View>
                <Text style={styles.prefTitle}>Your shopping activity</Text>
                <Text style={styles.prefSubtitle}>
                  {marketplaceStats.clicks} {marketplaceStats.clicks === 1 ? 'CLICK' : 'CLICKS'} · ~${marketplaceStats.estimatedCommission.toFixed(2)} EARNED FOR STYLED
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>STYLIST TOOLS</Text>
        <View style={styles.prefsCard}>
          <TouchableOpacity style={[styles.prefRow, styles.prefRowLast]} onPress={() => navigation.navigate('StylistDashboard')}>
            <View>
              <Text style={styles.prefTitle}>Stylist dashboard</Text>
              <Text style={styles.prefSubtitle}>YOUR BOOKINGS & REVIEWS</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => { signOut().catch(err => console.error('Error signing out:', err)); }}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.tobacco,
  },
  memberSince: {
    ...textType.eyebrow,
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.ink,
    marginTop: 2,
  },
  email: {
    ...textType.meta,
  },
  planCard: {
    backgroundColor: colors.ink,
    padding: 20,
  },
  planCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planCardEyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.camel,
  },
  currentBadge: {
    backgroundColor: colors.camel,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currentBadgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.ink,
  },
  planPrice: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.bone,
    marginTop: 12,
  },
  planPriceUnit: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.bone,
  },
  planDescription: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: 'rgba(253,251,250,0.75)',
    marginTop: 8,
    lineHeight: 19,
  },
  upgradeButton: {
    marginTop: 18,
    borderColor: 'rgba(253,251,250,0.3)',
    alignSelf: 'flex-start',
  },
  sectionLabel: {
    ...textType.eyebrow,
    marginTop: 28,
    marginBottom: 12,
  },
  tiersCard: {
    borderWidth: 1,
    borderColor: colors.hair,
  },
  tierRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  tierRowLast: {
    borderBottomWidth: 0,
  },
  tierName: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.ink,
  },
  tierPrice: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
  },
  tierFeatures: {
    ...textType.meta,
    marginTop: 4,
  },
  prefsCard: {
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  prefRowLast: {
    borderBottomWidth: 0,
  },
  prefTitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  prefSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.inkFaint,
    marginTop: 2,
  },
  prefArrow: {
    fontSize: 20,
    color: colors.inkFaint,
  },
  signOutButton: {
    marginTop: 32,
    alignItems: 'center',
    paddingVertical: 14,
  },
  signOutText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    letterSpacing: 0.6,
    color: '#C62828',
  },
});

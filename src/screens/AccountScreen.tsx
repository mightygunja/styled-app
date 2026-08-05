import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { affiliateClicksService, stylistsService } from '../services/firestore';
import { stylistApplicationService, ApplicationStatus } from '../services/stylistApplicationService';
import { getCurrentUserId } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { colors, fonts, type as textType } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut, deleteAccount } = useAuth();

  /**
   * Two-step confirmation. Deleting an account is irreversible and sits one tap
   * below Sign out, so a single misfire should not be able to destroy it.
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and you will be signed out. This cannot be undone.',
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you certain?',
              'Your account will be deleted immediately.',
              [
                {
                  text: 'Delete permanently',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                    } catch (error: any) {
                      Alert.alert('Could not delete account', error?.message || 'Please try again.');
                    }
                  },
                },
                { text: 'Keep my account', style: 'cancel' },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };
  const [loading, setLoading] = useState(true);
  const [marketplaceStats, setMarketplaceStats] = useState<{ clicks: number; estimatedCommission: number } | null>(null);
  const [isStylist, setIsStylist] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);

  const load = useCallback(async () => {
    try {
      const userId = getCurrentUserId();
      // A stylist record keyed by the user's own uid is what makes them a
      // stylist. Absent one, the professional section is not rendered at all.
      stylistsService
        .getById(userId)
        .then(record => setIsStylist(!!record))
        .catch(() => setIsStylist(false));

      // Drives whether the row reads "Work as a stylist" or "Your stylist
      // application", so someone who has applied is not asked to apply again.
      stylistApplicationService
        .getMine(userId)
        .then(application => setApplicationStatus(application?.status ?? null))
        .catch(() => setApplicationStatus(null));

      const clicks = await affiliateClicksService.getForUser(userId);
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

        {/* Styled is free. There is no paid tier, no upgrade path and nothing
            to charge for - the business runs on affiliate revenue. This card
            replaced a plan/upgrade panel that advertised $9 and $28 tiers,
            granted them for $0, and rendered invented invoices. */}
        <View style={styles.planCard}>
          <View style={styles.planCardTop}>
            <Text style={styles.planCardEyebrow}>STYLED</Text>
          </View>
          <Text style={styles.planPrice}>Free</Text>
          <Text style={styles.planDescription}>
            Every feature, with no subscription. When you buy something through Styled we may
            earn a commission from the retailer — that's how it stays free, and it never
            changes what we recommend.
          </Text>
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
          {/* Payment methods removed with the paywall. Styled charges nobody,
              so a screen collecting card details had nothing to charge them
              for - and keeping it would mean declaring Payment Info collection
              to App Review for a feature that does nothing. */}
          <TouchableOpacity style={[styles.prefRow, styles.prefRowLast]} onPress={() => navigation.navigate('Settings')}>
            <View>
              <Text style={styles.prefTitle}>Settings</Text>
              <Text style={styles.prefSubtitle}>NOTIFICATIONS · LANGUAGE · ACCESSIBILITY</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Everything here is the CLIENT side: you hiring a stylist. The
            professional side lives in its own section below and only appears
            for accounts that are actually stylists. Previously both sat
            side by side with no signal which was which, so every user was
            shown "when clients can book you" whether or not they were
            bookable. */}
        <Text style={styles.sectionLabel}>WORKING WITH A STYLIST</Text>
        <View style={styles.prefsCard}>
          <TouchableOpacity style={styles.prefRow} onPress={() => navigation.navigate('StylistMarketplace')}>
            <View>
              <Text style={styles.prefTitle}>Find a stylist</Text>
              <Text style={styles.prefSubtitle}>BROWSE · SPECIALTIES · RATES</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.prefRow} onPress={() => navigation.navigate('Edits')}>
            <View>
              <Text style={styles.prefTitle}>Your Edits</Text>
              <Text style={styles.prefSubtitle}>LOOKS BUILT FROM YOUR OWN CLOSET</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.prefRow, isStylist && styles.prefRowLast]}
            onPress={() => navigation.navigate('MySessions')}
          >
            <View>
              <Text style={styles.prefTitle}>Your sessions</Text>
              <Text style={styles.prefSubtitle}>UPCOMING · PAST</Text>
            </View>
            <Text style={styles.prefArrow}>›</Text>
          </TouchableOpacity>

          {/* Offered only to people who aren't already stylists. Without this a
              stylist downloading the app has no route to their own tools. */}
          {!isStylist && (
            <TouchableOpacity
              style={[styles.prefRow, styles.prefRowLast]}
              onPress={() => navigation.navigate('StylistApplication')}
            >
              <View>
                <Text style={styles.prefTitle}>
                  {applicationStatus === 'pending' ? 'Your stylist application' : 'Work as a stylist'}
                </Text>
                <Text style={styles.prefSubtitle}>
                  {applicationStatus === 'pending' ? 'WITH OUR TEAM' : 'APPLY TO JOIN THE MARKETPLACE'}
                </Text>
              </View>
              <Text style={styles.prefArrow}>›</Text>
            </TouchableOpacity>
          )}
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

        {/* Professional side. Rendered only for accounts with a stylist record,
            so a normal user is never offered "when clients can book you". This
            is also the role check StylistDashboard never had - it was reachable
            by anyone, showing earnings and bookings that were not theirs. */}
        {isStylist && (
          <>
            <Text style={styles.sectionLabel}>YOUR STYLIST PRACTICE</Text>
            <View style={styles.prefsCard}>
              <TouchableOpacity style={styles.prefRow} onPress={() => navigation.navigate('StylistDashboard')}>
                <View>
                  <Text style={styles.prefTitle}>Dashboard</Text>
                  <Text style={styles.prefSubtitle}>EARNINGS · BOOKINGS · REVIEWS</Text>
                </View>
                <Text style={styles.prefArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.prefRow} onPress={() => navigation.navigate('StylistAvailability')}>
                <View>
                  <Text style={styles.prefTitle}>Your availability</Text>
                  <Text style={styles.prefSubtitle}>WHEN CLIENTS CAN BOOK YOU</Text>
                </View>
                <Text style={styles.prefArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.prefRow, styles.prefRowLast]} onPress={() => navigation.navigate('EditReview')}>
                <View>
                  <Text style={styles.prefTitle}>Edits to build</Text>
                  <Text style={styles.prefSubtitle}>REQUESTS FROM YOUR CLIENTS</Text>
                </View>
                <Text style={styles.prefArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => { signOut().catch(err => console.error('Error signing out:', err)); }}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>
        <Text style={styles.deleteHelp}>
          Permanently removes your account and sign-in. This cannot be undone.
        </Text>
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
    color: colors.tobacco,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  deleteText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    letterSpacing: 0.6,
    color: colors.inkFaint,
  },
  deleteHelp: {
    ...textType.meta,
    fontSize: 11,
    textAlign: 'center',
    color: colors.inkFaint,
    paddingHorizontal: 32,
    marginBottom: 24,
  },
});

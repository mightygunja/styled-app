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
  premiumStylistService,
  PremiumStylist,
  StylistBooking,
  PremiumBenefits,
  StylistReview,
} from '../services/premiumStylistService';
import { subscriptionService } from '../services/subscriptionService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors as ds, fonts, radius } from '../theme/designSystem';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PremiumStylistScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [stylists, setStylists] = useState<PremiumStylist[]>([]);
  const [bookings, setBookings] = useState<StylistBooking[]>([]);
  const [benefits, setBenefits] = useState<PremiumBenefits | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'premium' | 'pro'>('free');
  const [selectedTab, setSelectedTab] = useState<'stylists' | 'bookings' | 'benefits'>('stylists');
  const [selectedStylist, setSelectedStylist] = useState<PremiumStylist | null>(null);
  const [reviews, setReviews] = useState<StylistReview[]>([]);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const subscription = await subscriptionService.getUserSubscription(getCurrentUserId());
      setUserTier(subscription.tier);

      const [stylistsData, bookingsData, benefitsData] = await Promise.all([
        premiumStylistService.getPremiumStylists(subscription.tier),
        premiumStylistService.getUserBookings(getCurrentUserId()),
        premiumStylistService.getPremiumBenefits(subscription.tier),
      ]);

      setStylists(stylistsData);
      setBookings(bookingsData);
      setBenefits(benefitsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load stylist data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStylist = async (stylist: PremiumStylist) => {
    try {
      setLoading(true);
      const reviewsData = await premiumStylistService.getStylistReviews(stylist.id);
      setReviews(reviewsData);
      setSelectedStylist(stylist);
    } catch (error) {
      console.error('Error loading stylist:', error);
      showToast('Failed to load stylist details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBookStylist = async (stylist: PremiumStylist) => {
    if (userTier === 'free' && stylist.requiredTier !== 'free') {
      showToast('Premium subscription required', 'error');
      return;
    }
    if (userTier === 'premium' && stylist.requiredTier === 'pro') {
      showToast('Pro subscription required', 'error');
      return;
    }

    try {
      setLoading(true);
      showToast('Booking session...', 'info');

      const booking = await premiumStylistService.bookSession(
        getCurrentUserId(),
        {
          stylistId: stylist.id,
          sessionType: 'standard',
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '14:00',
          isPriority: userTier !== 'free',
        },
        userTier
      );

      setBookings([...bookings, booking]);
      showToast('Session booked successfully!', 'success');
      setSelectedTab('bookings');
    } catch (error) {
      console.error('Error booking:', error);
      showToast('Failed to book session', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string): string => {
    const colors = {
      standard: ds.inkMuted,
      premium: ds.ink,
      vip: ds.camel,
    };
    return colors[tier as keyof typeof colors] || ds.inkMuted;
  };

  if (loading && stylists.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ds.tobacco} />
          <Text style={styles.loadingText}>Loading premium stylists...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Stylist Detail Modal
  if (selectedStylist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedStylist(null)}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stylist Details</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView>
          {/* Stylist Header */}
          <View style={styles.detailHeader}>
            <Image source={{ uri: selectedStylist.imageUrl }} style={styles.detailImage} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailName}>{selectedStylist.name}</Text>
              <Text style={styles.detailTitle}>{selectedStylist.title}</Text>
              <View style={styles.detailRating}>
                <Text style={styles.detailRatingText}>⭐ {selectedStylist.rating}</Text>
                <Text style={styles.detailSessions}>
                  {selectedStylist.totalSessions} sessions
                </Text>
              </View>
              <View style={styles.detailBadges}>
                {selectedStylist.badges.map((badge, idx) => (
                  <View key={idx} style={styles.detailBadge}>
                    <Text style={styles.detailBadgeText}>{badge}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.detailBio}>{selectedStylist.bio}</Text>
          </View>

          {/* Specialties */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specialties</Text>
            <View style={styles.tagContainer}>
              {selectedStylist.specialties.map((specialty, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{specialty}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Pricing</Text>
            <View style={styles.pricingGrid}>
              <View style={styles.pricingCard}>
                <Text style={styles.pricingType}>Quick Consult</Text>
                <Text style={styles.pricingDuration}>15 min</Text>
                <Text style={styles.pricingPrice}>
                  ${selectedStylist.pricing.quickConsult}
                </Text>
              </View>
              <View style={styles.pricingCard}>
                <Text style={styles.pricingType}>Standard</Text>
                <Text style={styles.pricingDuration}>30 min</Text>
                <Text style={styles.pricingPrice}>
                  ${selectedStylist.pricing.standard}
                </Text>
              </View>
              <View style={styles.pricingCard}>
                <Text style={styles.pricingType}>Extended</Text>
                <Text style={styles.pricingDuration}>60 min</Text>
                <Text style={styles.pricingPrice}>
                  ${selectedStylist.pricing.extended}
                </Text>
              </View>
              <View style={styles.pricingCard}>
                <Text style={styles.pricingType}>VIP Package</Text>
                <Text style={styles.pricingDuration}>90 min</Text>
                <Text style={styles.pricingPrice}>
                  ${selectedStylist.pricing.vipPackage}
                </Text>
              </View>
            </View>
          </View>

          {/* Reviews */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{review.userName}</Text>
                  <Text style={styles.reviewRating}>⭐ {review.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.date).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>

          {/* Book Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.bookButton,
                { backgroundColor: getTierColor(selectedStylist.tier) },
              ]}
              onPress={() => handleBookStylist(selectedStylist)}
              disabled={loading}
            >
              <Text style={styles.bookButtonText}>
                {loading ? 'Booking...' : 'Book Session'}
              </Text>
            </TouchableOpacity>
          </View>

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

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Stylists</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tier Badge */}
      <View style={[styles.tierBanner, { backgroundColor: getTierColor(userTier) }]}>
        <Text style={styles.tierBannerText}>
          {userTier.toUpperCase()} MEMBER
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'stylists' && styles.tabActive]}
          onPress={() => setSelectedTab('stylists')}
        >
          <Text style={[styles.tabText, selectedTab === 'stylists' && styles.tabTextActive]}>
            Stylists
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'bookings' && styles.tabActive]}
          onPress={() => setSelectedTab('bookings')}
        >
          <Text style={[styles.tabText, selectedTab === 'bookings' && styles.tabTextActive]}>
            Bookings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'benefits' && styles.tabActive]}
          onPress={() => setSelectedTab('benefits')}
        >
          <Text style={[styles.tabText, selectedTab === 'benefits' && styles.tabTextActive]}>
            Benefits
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Stylists Tab */}
        {selectedTab === 'stylists' && (
          <View style={styles.section}>
            {stylists.map((stylist) => (
              <TouchableOpacity
                key={stylist.id}
                style={styles.stylistCard}
                onPress={() => handleViewStylist(stylist)}
              >
                <Image source={{ uri: stylist.imageUrl }} style={styles.stylistImage} />
                <View style={styles.stylistInfo}>
                  <View style={styles.stylistHeader}>
                    <Text style={styles.stylistName}>{stylist.name}</Text>
                    {stylist.featured && (
                      <View style={styles.featuredBadge}>
                        <Text style={styles.featuredBadgeText}>⭐</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stylistTitle}>{stylist.title}</Text>
                  <View style={styles.stylistRating}>
                    <Text style={styles.stylistRatingText}>⭐ {stylist.rating}</Text>
                    <Text style={styles.stylistSessions}>
                      {stylist.totalSessions} sessions
                    </Text>
                  </View>
                  <View style={styles.stylistSpecialties}>
                    {stylist.specialties.slice(0, 2).map((specialty, idx) => (
                      <View key={idx} style={styles.specialtyTag}>
                        <Text style={styles.specialtyTagText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.stylistPricing}>
                    <Text style={styles.stylistPrice}>
                      From ${stylist.pricing.quickConsult}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.viewButton,
                        { backgroundColor: getTierColor(stylist.tier) },
                      ]}
                      onPress={() => handleViewStylist(stylist)}
                    >
                      <Text style={styles.viewButtonText}>View →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bookings Tab */}
        {selectedTab === 'bookings' && (
          <View style={styles.section}>
            {bookings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No bookings yet</Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setSelectedTab('stylists')}
                >
                  <Text style={styles.emptyStateButtonText}>Browse Stylists</Text>
                </TouchableOpacity>
              </View>
            ) : (
              bookings.map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <Image
                      source={{ uri: booking.stylist.imageUrl }}
                      style={styles.bookingImage}
                    />
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingName}>{booking.stylist.name}</Text>
                      <Text style={styles.bookingType}>
                        {booking.sessionType.replace('-', ' ')}
                      </Text>
                    </View>
                    {booking.isPriority && (
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityBadgeText}>⚡ Priority</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.bookingDetails}>
                    <Text style={styles.bookingDate}>
                      📅 {new Date(booking.date).toLocaleDateString()} at {booking.time}
                    </Text>
                    <Text style={styles.bookingDuration}>
                      ⏱️ {booking.duration} minutes
                    </Text>
                    <Text style={styles.bookingPrice}>💰 ${booking.price}</Text>
                  </View>
                  <View style={styles.bookingActions}>
                    <TouchableOpacity style={styles.bookingActionButton}>
                      <Text style={styles.bookingActionText}>Join Meeting</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.bookingActionButtonSecondary}>
                      <Text style={styles.bookingActionTextSecondary}>Reschedule</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Benefits Tab */}
        {selectedTab === 'benefits' && benefits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Benefits</Text>
            {Object.entries(benefits).map(([key, benefit]) => (
              <View
                key={key}
                style={[
                  styles.benefitCard,
                  !benefit.enabled && styles.benefitCardDisabled,
                ]}
              >
                <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                <View style={styles.benefitInfo}>
                  <Text style={styles.benefitTitle}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                  {!benefit.enabled && (
                    <Text style={styles.benefitUpgrade}>
                      Upgrade to unlock
                    </Text>
                  )}
                </View>
                {benefit.enabled ? (
                  <View style={styles.benefitEnabled}>
                    <Text style={styles.benefitEnabledText}>✓</Text>
                  </View>
                ) : (
                  <View style={styles.benefitDisabled}>
                    <Text style={styles.benefitDisabledText}>🔒</Text>
                  </View>
                )}
              </View>
            ))}

            {userTier === 'free' && (
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => navigation.navigate('Subscription')}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
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
  tierBanner: {
    padding: 12,
    alignItems: 'center',
  },
  tierBannerText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
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
  stylistCard: {
    flexDirection: 'row',
    backgroundColor: ds.paper,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  stylistImage: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    backgroundColor: ds.hair,
  },
  stylistInfo: {
    flex: 1,
  },
  stylistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stylistName: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    flex: 1,
  },
  featuredBadge: {
    width: 24,
    height: 24,
  },
  featuredBadgeText: {
    fontSize: 16,
  },
  stylistTitle: {
    fontSize: 13,
    color: ds.inkMuted,
    marginBottom: 8,
  },
  stylistRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stylistRatingText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  stylistSessions: {
    fontSize: 12,
    color: ds.inkFaint,
  },
  stylistSpecialties: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  specialtyTag: {
    backgroundColor: ds.sand,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  specialtyTagText: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
  },
  stylistPricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stylistPrice: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  viewButtonText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  detailHeader: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: ds.hair,
  },
  detailImage: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: ds.hair,
    marginBottom: 16,
  },
  detailInfo: {
    alignItems: 'center',
  },
  detailName: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 15,
    color: ds.inkMuted,
    marginBottom: 12,
  },
  detailRating: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailRatingText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  detailSessions: {
    fontSize: 13,
    color: ds.inkMuted,
  },
  detailBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  detailBadge: {
    backgroundColor: ds.sand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  detailBadgeText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
  },
  detailBio: {
    fontSize: 14,
    color: ds.inkMuted,
    lineHeight: 22,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: ds.paper,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  tagText: {
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: ds.ink,
  },
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pricingCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: ds.paper,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
  },
  pricingType: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 4,
  },
  pricingDuration: {
    fontSize: 11,
    color: ds.inkMuted,
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
  },
  reviewCard: {
    backgroundColor: ds.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewName: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  reviewRating: {
    fontSize: 13,
    color: ds.inkMuted,
  },
  reviewComment: {
    fontSize: 14,
    color: ds.inkMuted,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: ds.inkFaint,
  },
  bookButton: {
    paddingVertical: 16,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: ds.inkFaint,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: ds.ink,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  bookingCard: {
    backgroundColor: ds.paper,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  bookingImage: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: ds.hair,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingName: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 2,
  },
  bookingType: {
    fontSize: 12,
    color: ds.inkMuted,
    textTransform: 'capitalize',
  },
  priorityBadge: {
    backgroundColor: ds.sand,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
  },
  bookingDetails: {
    gap: 6,
    marginBottom: 12,
  },
  bookingDate: {
    fontSize: 13,
    color: ds.inkMuted,
  },
  bookingDuration: {
    fontSize: 13,
    color: ds.inkMuted,
  },
  bookingPrice: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bookingActionButton: {
    flex: 1,
    backgroundColor: ds.ink,
    paddingVertical: 10,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  bookingActionText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  bookingActionButtonSecondary: {
    flex: 1,
    backgroundColor: ds.paper,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  bookingActionTextSecondary: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.inkMuted,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ds.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  benefitCardDisabled: {
    opacity: 0.6,
  },
  benefitIcon: {
    fontSize: 32,
  },
  benefitInfo: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  benefitDescription: {
    fontSize: 13,
    color: ds.inkMuted,
    lineHeight: 18,
  },
  benefitUpgrade: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
    marginTop: 4,
  },
  benefitEnabled: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: ds.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitEnabledText: {
    fontSize: 16,
    color: ds.white,
  },
  benefitDisabled: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: ds.hair,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitDisabledText: {
    fontSize: 16,
  },
  upgradeButton: {
    backgroundColor: ds.ink,
    paddingVertical: 16,
    borderRadius: radius.full,
    alignItems: 'center',
    marginTop: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
});

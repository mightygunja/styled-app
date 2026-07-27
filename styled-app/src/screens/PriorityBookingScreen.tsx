import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  priorityBookingService,
  BookingSlot,
  BookingStats,
  PriorityBenefits,
  BookingType,
} from '../services/priorityBookingService';
import { subscriptionService } from '../services/subscriptionService';
import { MOCK_USER_ID } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PriorityBookingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [benefits, setBenefits] = useState<PriorityBenefits | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'premium' | 'pro'>('free');
  const [selectedFilter, setSelectedFilter] = useState<BookingType | 'all'>('all');
  const [selectedTab, setSelectedTab] = useState<'slots' | 'benefits' | 'bookings'>('slots');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, [selectedFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const subscription = await subscriptionService.getUserSubscription(MOCK_USER_ID);
      setUserTier(subscription.tier);

      const [slotsData, statsData, benefitsData] = await Promise.all([
        priorityBookingService.getAvailableSlots(
          subscription.tier,
          selectedFilter !== 'all' ? { type: selectedFilter } : undefined
        ),
        priorityBookingService.getBookingStats(MOCK_USER_ID, subscription.tier),
        priorityBookingService.getPriorityBenefits(subscription.tier),
      ]);

      setSlots(slotsData);
      setStats(statsData);
      setBenefits(benefitsData);
    } catch (error) {
      console.error('Error loading booking data:', error);
      showToast('Failed to load booking slots', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async (slot: BookingSlot) => {
    try {
      const countdown = priorityBookingService.getEarlyAccessCountdown(slot, userTier);
      
      if (!countdown.hasAccess) {
        showToast(
          `Available in ${countdown.daysUntilAccess} days for ${userTier} members`,
          'info'
        );
        return;
      }

      if (slot.booked >= slot.capacity) {
        showToast('This slot is fully booked', 'error');
        return;
      }

      showToast('Booking slot...', 'info');
      await priorityBookingService.bookSlot(MOCK_USER_ID, slot.id, userTier);
      showToast('Booking confirmed!', 'success');
      await loadData();
    } catch (error) {
      console.error('Error booking slot:', error);
      showToast('Failed to book slot', 'error');
    }
  };

  const handleJoinWaitlist = async (slot: BookingSlot) => {
    try {
      showToast('Joining waitlist...', 'info');
      const booking = await priorityBookingService.joinWaitlist(MOCK_USER_ID, slot.id, userTier);
      showToast(
        `Added to waitlist! Position: ${booking.queuePosition}`,
        'success'
      );
      await loadData();
    } catch (error) {
      console.error('Error joining waitlist:', error);
      showToast('Failed to join waitlist', 'error');
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

  const getBookingTypeIcon = (type: BookingType): string => {
    const icons = {
      stylist: '👗',
      event: '📅',
      workshop: '🎓',
      consultation: '💬',
      fitting: '📏',
    };
    return icons[type] || '📌';
  };

  if (loading && slots.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading priority slots...</Text>
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
        <Text style={styles.headerTitle}>Priority Booking</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tier Badge */}
      <View style={[styles.tierBanner, { backgroundColor: getTierColor(userTier) }]}>
        <Text style={styles.tierBannerText}>
          {userTier.toUpperCase()} MEMBER
        </Text>
        {userTier === 'free' && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.upcomingBookings}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.averageWaitTime}m</Text>
            <Text style={styles.statLabel}>Avg Wait</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.priorityBookingsLimit === -1 ? '∞' : stats.priorityBookingsUsed}/{stats.priorityBookingsLimit === -1 ? '∞' : stats.priorityBookingsLimit}
            </Text>
            <Text style={styles.statLabel}>Used</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'slots' && styles.tabActive]}
          onPress={() => setSelectedTab('slots')}
        >
          <Text style={[styles.tabText, selectedTab === 'slots' && styles.tabTextActive]}>
            Available Slots
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
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'bookings' && styles.tabActive]}
          onPress={() => setSelectedTab('bookings')}
        >
          <Text style={[styles.tabText, selectedTab === 'bookings' && styles.tabTextActive]}>
            My Bookings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Available Slots Tab */}
        {selectedTab === 'slots' && (
          <>
            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('all')}
              >
                <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'stylist' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('stylist')}
              >
                <Text style={[styles.filterChipText, selectedFilter === 'stylist' && styles.filterChipTextActive]}>
                  👗 Stylists
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'event' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('event')}
              >
                <Text style={[styles.filterChipText, selectedFilter === 'event' && styles.filterChipTextActive]}>
                  📅 Events
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'workshop' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('workshop')}
              >
                <Text style={[styles.filterChipText, selectedFilter === 'workshop' && styles.filterChipTextActive]}>
                  🎓 Workshops
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'consultation' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('consultation')}
              >
                <Text style={[styles.filterChipText, selectedFilter === 'consultation' && styles.filterChipTextActive]}>
                  💬 Consultations
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Slots List */}
            <View style={styles.slotsContainer}>
              {slots.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No slots available</Text>
                  {userTier === 'free' && (
                    <TouchableOpacity
                      style={styles.emptyStateButton}
                      onPress={() => navigation.navigate('Subscription')}
                    >
                      <Text style={styles.emptyStateButtonText}>Upgrade for Priority Access</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                slots.map((slot) => {
                  const countdown = priorityBookingService.getEarlyAccessCountdown(slot, userTier);
                  const isFullyBooked = slot.booked >= slot.capacity;
                  const spotsLeft = slot.capacity - slot.booked;

                  return (
                    <View key={slot.id} style={styles.slotCard}>
                      <Image source={{ uri: slot.imageUrl }} style={styles.slotImage} />
                      
                      <View style={styles.slotInfo}>
                        <View style={styles.slotHeader}>
                          <Text style={styles.slotType}>{getBookingTypeIcon(slot.type)}</Text>
                          <Text style={styles.slotTitle} numberOfLines={2}>
                            {slot.title}
                          </Text>
                        </View>

                        <Text style={styles.slotDescription} numberOfLines={2}>
                          {slot.description}
                        </Text>

                        <View style={styles.slotMeta}>
                          <Text style={styles.slotMetaText}>
                            📅 {new Date(slot.date).toLocaleDateString()}
                          </Text>
                          <Text style={styles.slotMetaText}>
                            ⏰ {slot.startTime} - {slot.endTime}
                          </Text>
                          <Text style={styles.slotMetaText}>
                            📍 {slot.location}
                          </Text>
                        </View>

                        <View style={styles.slotHost}>
                          <Image source={{ uri: slot.host.imageUrl }} style={styles.hostImage} />
                          <View>
                            <Text style={styles.hostName}>{slot.host.name}</Text>
                            <Text style={styles.hostTitle}>{slot.host.title}</Text>
                          </View>
                        </View>

                        <View style={styles.slotFooter}>
                          <View style={styles.slotCapacity}>
                            {isFullyBooked ? (
                              <Text style={styles.slotFullText}>Fully Booked</Text>
                            ) : (
                              <Text style={styles.slotSpotsText}>
                                {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
                              </Text>
                            )}
                            {slot.waitlist > 0 && (
                              <Text style={styles.slotWaitlistText}>
                                {slot.waitlist} on waitlist
                              </Text>
                            )}
                          </View>
                          <Text style={styles.slotPrice}>
                            {slot.price === 0 ? 'Free' : `$${slot.price}`}
                          </Text>
                        </View>

                        {!countdown.hasAccess && (
                          <View style={styles.earlyAccessBanner}>
                            <Text style={styles.earlyAccessText}>
                              ⚡ Available in {countdown.daysUntilAccess} days for {userTier} members
                            </Text>
                          </View>
                        )}

                        <View style={styles.slotActions}>
                          {isFullyBooked ? (
                            <TouchableOpacity
                              style={styles.waitlistButton}
                              onPress={() => handleJoinWaitlist(slot)}
                            >
                              <Text style={styles.waitlistButtonText}>Join Waitlist</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.bookButton,
                                !countdown.hasAccess && styles.bookButtonDisabled,
                              ]}
                              onPress={() => handleBookSlot(slot)}
                              disabled={!countdown.hasAccess}
                            >
                              <Text style={styles.bookButtonText}>
                                {countdown.hasAccess ? 'Book Now' : 'Locked'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.tagContainer}>
                          {slot.tags.slice(0, 3).map((tag, idx) => (
                            <View key={idx} style={styles.tag}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* Benefits Tab */}
        {selectedTab === 'benefits' && benefits && (
          <View style={styles.benefitsContainer}>
            <Text style={styles.sectionTitle}>Your Priority Benefits</Text>
            
            <View style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>⚡</Text>
              </View>
              <View style={styles.benefitInfo}>
                <Text style={styles.benefitName}>Early Access</Text>
                <Text style={styles.benefitDescription}>
                  {benefits.benefits.earlyAccess
                    ? `Book ${benefits.benefits.earlyAccessDays} days before standard members`
                    : 'Upgrade to get early access to slots'}
                </Text>
              </View>
              <Text style={styles.benefitStatus}>
                {benefits.benefits.earlyAccess ? '✓' : '🔒'}
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>🚀</Text>
              </View>
              <View style={styles.benefitInfo}>
                <Text style={styles.benefitName}>Priority Queue</Text>
                <Text style={styles.benefitDescription}>
                  {benefits.benefits.priorityQueue
                    ? 'Skip the line with priority processing'
                    : 'Upgrade for priority queue access'}
                </Text>
              </View>
              <Text style={styles.benefitStatus}>
                {benefits.benefits.priorityQueue ? '✓' : '🔒'}
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>⚡</Text>
              </View>
              <View style={styles.benefitInfo}>
                <Text style={styles.benefitName}>Express Booking</Text>
                <Text style={styles.benefitDescription}>
                  {benefits.benefits.expressBooking
                    ? 'One-click booking without forms'
                    : 'Upgrade for express booking'}
                </Text>
              </View>
              <Text style={styles.benefitStatus}>
                {benefits.benefits.expressBooking ? '✓' : '🔒'}
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>🔄</Text>
              </View>
              <View style={styles.benefitInfo}>
                <Text style={styles.benefitName}>Free Rescheduling</Text>
                <Text style={styles.benefitDescription}>
                  {benefits.benefits.freeRescheduling
                    ? `Reschedule up to ${benefits.benefits.rescheduleHours} hours before`
                    : 'Upgrade for free rescheduling'}
                </Text>
              </View>
              <Text style={styles.benefitStatus}>
                {benefits.benefits.freeRescheduling ? '✓' : '🔒'}
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>📋</Text>
              </View>
              <View style={styles.benefitInfo}>
                <Text style={styles.benefitName}>Waitlist Priority</Text>
                <Text style={styles.benefitDescription}>
                  {benefits.benefits.waitlistPriority
                    ? 'Move to front of waitlist automatically'
                    : 'Upgrade for waitlist priority'}
                </Text>
              </View>
              <Text style={styles.benefitStatus}>
                {benefits.benefits.waitlistPriority ? '✓' : '🔒'}
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>👑</Text>
              </View>
              <View style={styles.benefitInfo}>
                <Text style={styles.benefitName}>Exclusive Slots</Text>
                <Text style={styles.benefitDescription}>
                  {benefits.benefits.exclusiveSlots
                    ? 'Access VIP-only booking slots'
                    : 'Upgrade to Pro for exclusive slots'}
                </Text>
              </View>
              <Text style={styles.benefitStatus}>
                {benefits.benefits.exclusiveSlots ? '✓' : '🔒'}
              </Text>
            </View>

            <View style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>💼</Text>
              </View>
              <View style={styles.benefitInfo}>
                <Text style={styles.benefitName}>Concierge Support</Text>
                <Text style={styles.benefitDescription}>
                  {benefits.benefits.conciergeSupport
                    ? 'Personal booking assistant available 24/7'
                    : 'Upgrade to Pro for concierge support'}
                </Text>
              </View>
              <Text style={styles.benefitStatus}>
                {benefits.benefits.conciergeSupport ? '✓' : '🔒'}
              </Text>
            </View>

            {userTier !== 'pro' && (
              <TouchableOpacity
                style={styles.upgradeCard}
                onPress={() => navigation.navigate('Subscription')}
              >
                <Text style={styles.upgradeCardTitle}>Unlock All Benefits</Text>
                <Text style={styles.upgradeCardText}>
                  Upgrade to {userTier === 'free' ? 'Premium' : 'Pro'} for full priority access
                </Text>
                <Text style={styles.upgradeCardButton}>Upgrade Now →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* My Bookings Tab */}
        {selectedTab === 'bookings' && (
          <View style={styles.bookingsContainer}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No bookings yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Book your first priority slot to get started
              </Text>
            </View>
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
  tierBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  tierBannerText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  upgradeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
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
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#8b5cf6',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  slotsContainer: {
    padding: 16,
  },
  slotCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  slotImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#e2e8f0',
  },
  slotInfo: {
    padding: 16,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  slotType: {
    fontSize: 20,
  },
  slotTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  slotDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  slotMeta: {
    marginBottom: 12,
  },
  slotMetaText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  slotHost: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  hostImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  hostName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  hostTitle: {
    fontSize: 11,
    color: '#64748b',
  },
  slotFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  slotCapacity: {
    flex: 1,
  },
  slotSpotsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  slotFullText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  slotWaitlistText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  slotPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  earlyAccessBanner: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  earlyAccessText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    textAlign: 'center',
  },
  slotActions: {
    marginBottom: 12,
  },
  bookButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  waitlistButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  waitlistButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#7c3aed',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  benefitsContainer: {
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
  upgradeCard: {
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  upgradeCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  upgradeCardText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 16,
    textAlign: 'center',
  },
  upgradeCardButton: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  bookingsContainer: {
    padding: 20,
  },
});

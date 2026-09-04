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
  stylistDashboardService,
  StylistEarnings,
  ClientInfo,
  DashboardStats,
} from '../services/stylistDashboardService';
import { StylingSession } from '../types';
import { getCurrentUserId } from '../services/api';
import { stylistsService } from '../services/firestore';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StylistDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [earnings, setEarnings] = useState<StylistEarnings | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<StylingSession[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'clients'>('overview');
  const [isStylist, setIsStylist] = useState(true);

  // A stylist's app account uid doubles as their stylists/{id} doc id -
  // if there's no matching stylist doc, the dashboard is real but empty.
  const stylistId = getCurrentUserId();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Role check. Without it this screen renders a full earnings dashboard of
      // zeros to anyone who reaches it, which reads as a broken feature rather
      // than one that does not apply to them.
      const stylistRecord = await stylistsService.getById(stylistId);
      if (!stylistRecord) {
        setIsStylist(false);
        return;
      }
      setIsStylist(true);

      const [earningsData, statsData, sessions, clientsData] = await Promise.all([
        stylistDashboardService.getEarnings(stylistId),
        stylistDashboardService.getDashboardStats(stylistId),
        stylistDashboardService.getUpcomingSessions(stylistId),
        stylistDashboardService.getClients(stylistId),
      ]);
      
      setEarnings(earningsData);
      setStats(statsData);
      setUpcomingSessions(sessions);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <View style={styles.overviewContainer}>
      {/* Earnings Card */}
      <View style={styles.earningsCard}>
        <Text style={styles.cardTitle}>Earnings</Text>
        <Text style={styles.earningsTotal}>
          ${earnings?.totalEarnings.toFixed(0) || 0}
        </Text>
        <Text style={styles.earningsLabel}>Total Earnings</Text>
        
        <View style={styles.earningsGrid}>
          <View style={styles.earningsStat}>
            <Text style={styles.earningsStatValue}>
              ${earnings?.thisMonth.toFixed(0) || 0}
            </Text>
            <Text style={styles.earningsStatLabel}>This Month</Text>
          </View>
          {/* Last month, not "pending payouts" - there is no payout system,
              so nothing is ever genuinely pending. */}
          <View style={styles.earningsStat}>
            <Text style={styles.earningsStatValue}>
              ${earnings?.lastMonth.toFixed(0) || 0}
            </Text>
            <Text style={styles.earningsStatLabel}>Last Month</Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.totalClients || 0}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{earnings?.completedSessions || 0}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>● {stats?.averageRating.toFixed(1) || 0}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.totalReviews || 0}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      {/* Performance: only metrics the data can actually back. Response and
          rebook rates were invented placeholders (and rendered 10000% via a
          double percent conversion) - a dashboard that fabricates numbers
          teaches stylists to distrust the real ones. completionRate arrives
          already as a percent. */}
      <View style={styles.metricsCard}>
        <Text style={styles.cardTitle}>Performance</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Completion Rate</Text>
          <Text style={styles.metricValue}>
            {(stats?.completionRate || 0).toFixed(0)}%
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSessions = () => (
    <View style={styles.sessionsContainer}>
      <Text style={styles.sectionTitle}>Upcoming Sessions ({upcomingSessions.length})</Text>
      {upcomingSessions.length === 0 ? (
        <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No upcoming sessions</Text>
        </View>
      ) : (
        upcomingSessions.map((session) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View>
                <Text style={styles.sessionType}>
                  {session.sessionType.replace('-', ' ')}
                </Text>
                <Text style={styles.sessionDate}>
                  {new Date(session.scheduledDate).toLocaleDateString()} at{' '}
                  {new Date(session.scheduledDate).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
              <View style={styles.sessionPrice}>
                <Text style={styles.priceText}>${session.price}</Text>
              </View>
            </View>
            <View style={styles.sessionFooter}>
              <Text style={styles.sessionDuration}>{session.duration} minutes</Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() =>navigation.navigate('SessionNotes', { sessionId: session.id })}
              >
                <Text style={styles.viewButtonText}>View Notes</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderClients = () => (
    <View style={styles.clientsContainer}>
      <Text style={styles.sectionTitle}>Your Clients ({clients.length})</Text>
      {clients.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No clients yet</Text>
          <Text style={styles.emptySubtext}>Clients appear here after their first booking with you.</Text>
        </View>
      )}
      {clients.map((client) => (
        <View key={client.id} style={styles.clientCard}>
          <View style={styles.clientHeader}>
            {client.profileImageUrl ? (
              <Image source={{ uri: client.profileImageUrl }} style={styles.clientImage} />
            ) : (
              <View style={styles.clientImagePlaceholder}>
                <Text style={styles.clientInitial}>{client.name.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{client.name}</Text>
              <Text style={styles.clientEmail}>{client.email}</Text>
            </View>
          </View>
          <View style={styles.clientStats}>
            <View style={styles.clientStat}>
              <Text style={styles.clientStatValue}>{client.totalSessions}</Text>
              <Text style={styles.clientStatLabel}>Sessions</Text>
            </View>
            <View style={styles.clientStat}>
              <Text style={styles.clientStatValue}>${client.totalSpent}</Text>
              <Text style={styles.clientStatLabel}>Spent</Text>
            </View>
            <View style={styles.clientStat}>
              <Text style={styles.clientStatValue} numberOfLines={1}>
                {client.preferredSessionType.replace('-', ' ')}
              </Text>
              <Text style={styles.clientStatLabel}>Preferred</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Reached without a stylist record - explain rather than show a dashboard of
  // zeros, which reads as broken rather than as not applicable.
  if (!isStylist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notStylistBox}>
          <Text style={styles.notStylistTitle}>This is for stylists</Text>
          <Text style={styles.notStylistText}>Earnings, bookings and client tools appear here once you're set up as a stylist on
            33 Trends. If you're looking to work with one, browse stylists from your account.
          </Text>
          <TouchableOpacity
            style={styles.notStylistButton}
            onPress={() =>navigation.navigate('StylistMarketplace')}
          >
            <Text style={styles.notStylistButtonText}>Find a stylist</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Stylist Dashboard</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() =>setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sessions' && styles.tabActive]}
          onPress={() =>setActiveTab('sessions')}
        >
          <Text style={[styles.tabText, activeTab === 'sessions' && styles.tabTextActive]}>Sessions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'clients' && styles.tabActive]}
          onPress={() =>setActiveTab('clients')}
        >
          <Text style={[styles.tabText, activeTab === 'clients' && styles.tabTextActive]}>Clients
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'sessions' && renderSessions()}
        {activeTab === 'clients' && renderClients()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  notStylistBox: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  notStylistTitle: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.ink,
  },
  notStylistText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
    marginTop: 12,
  },
  notStylistButton: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  notStylistButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.bone,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.inkMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  backButton: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  tabTextActive: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    padding: 20,
  },
  earningsCard: {
    borderRadius: radius.md,
    backgroundColor: colors.camel,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
    marginBottom: 12,
  },
  earningsTotal: {
    fontSize: 40,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  earningsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  earningsStat: {
    borderRadius: radius.md,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
  },
  earningsStatValue: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
    marginBottom: 4,
  },
  earningsStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    borderRadius: radius.md,
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.paper,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  metricsCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  sessionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 16,
  },
  sessionCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sessionType: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  sessionDate: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  sessionPrice: {
    borderRadius: radius.md,
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.camel,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDuration: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  viewButton: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewButtonText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
  },
  clientsContainer: {
    padding: 20,
  },
  clientCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientImage: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.paper,
    marginRight: 12,
  },
  clientImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientInitial: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  clientStats: {
    flexDirection: 'row',
    gap: 12,
  },
  clientStat: {
    borderRadius: radius.md,
    flex: 1,
    backgroundColor: colors.paper,
    padding: 12,
    alignItems: 'center',
  },
  clientStatValue: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 2,
  },
  clientStatLabel: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});

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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StylistDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [earnings, setEarnings] = useState<StylistEarnings | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<StylingSession[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'clients'>('overview');

  // A stylist's app account uid doubles as their stylists/{id} doc id -
  // if there's no matching stylist doc, the dashboard is real but empty.
  const stylistId = getCurrentUserId();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
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
        <Text style={styles.cardTitle}>💰 Earnings</Text>
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
          <View style={styles.earningsStat}>
            <Text style={styles.earningsStatValue}>
              ${earnings?.pendingPayouts.toFixed(0) || 0}
            </Text>
            <Text style={styles.earningsStatLabel}>Pending</Text>
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
          <Text style={styles.statValue}>⭐ {stats?.averageRating.toFixed(1) || 0}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.totalReviews || 0}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.metricsCard}>
        <Text style={styles.cardTitle}>📊 Performance</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Response Rate</Text>
          <Text style={styles.metricValue}>
            {((stats?.responseRate || 0) * 100).toFixed(0)}%
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Completion Rate</Text>
          <Text style={styles.metricValue}>
            {((stats?.completionRate || 0) * 100).toFixed(0)}%
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Rebook Rate</Text>
          <Text style={styles.metricValue}>
            {((stats?.rebookRate || 0) * 100).toFixed(0)}%
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
          <Text style={styles.emptyEmoji}>📅</Text>
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
              <TouchableOpacity style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View Details</Text>
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
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
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
        <Text style={styles.title}>Stylist Dashboard</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sessions' && styles.tabActive]}
          onPress={() => setActiveTab('sessions')}
        >
          <Text style={[styles.tabText, activeTab === 'sessions' && styles.tabTextActive]}>
            Sessions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'clients' && styles.tabActive]}
          onPress={() => setActiveTab('clients')}
        >
          <Text style={[styles.tabText, activeTab === 'clients' && styles.tabTextActive]}>
            Clients
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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
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
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    padding: 20,
  },
  earningsCard: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  earningsTotal: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
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
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 12,
  },
  earningsStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
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
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  metricsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  sessionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sessionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  sessionDate: {
    fontSize: 13,
    color: '#64748b',
  },
  sessionPrice: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDuration: {
    fontSize: 13,
    color: '#64748b',
  },
  viewButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  clientsContainer: {
    padding: 20,
  },
  clientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  clientImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  clientStats: {
    flexDirection: 'row',
    gap: 12,
  },
  clientStat: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clientStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  clientStatLabel: {
    fontSize: 11,
    color: '#64748b',
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
    fontWeight: '600',
    color: '#0f172a',
  },
});

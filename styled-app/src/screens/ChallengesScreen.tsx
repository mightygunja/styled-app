import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { challengeService, Challenge } from '../services/challengeService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ChallengesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadChallenges();
  }, [activeTab]);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const data = await challengeService.getChallenges(activeTab);
      setChallenges(data);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChallenges();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Ended';
    if (diffDays === 0) return 'Ends today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  const getChallengeTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return '#3b82f6';
      case 'weekly': return '#8b5cf6';
      case 'monthly': return '#ec4899';
      case 'special': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const renderChallenge = (challenge: Challenge) => (
    <TouchableOpacity
      key={challenge.id}
      style={styles.challengeCard}
      onPress={() => navigation.navigate('ChallengeDetail', { challengeId: challenge.id })}
    >
      {challenge.imageUrl && (
        <Image source={{ uri: challenge.imageUrl }} style={styles.challengeImage} />
      )}
      
      <View style={styles.challengeContent}>
        <View style={styles.challengeHeader}>
          <View style={[styles.typeBadge, { backgroundColor: getChallengeTypeColor(challenge.type) }]}>
            <Text style={styles.typeBadgeText}>{challenge.type.toUpperCase()}</Text>
          </View>
          {challenge.status === 'active' && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{getDaysRemaining(challenge.endDate)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.challengeTitle}>{challenge.title}</Text>
        <Text style={styles.challengeDescription} numberOfLines={2}>
          {challenge.description}
        </Text>

        {challenge.prize && (
          <View style={styles.prizeContainer}>
            <Text style={styles.prizeIcon}>🏆</Text>
            <Text style={styles.prizeText}>{challenge.prize}</Text>
          </View>
        )}

        <View style={styles.challengeStats}>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statText}>{challenge.participants} joined</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statIcon}>📸</Text>
            <Text style={styles.statText}>{challenge.entries} entries</Text>
          </View>
        </View>

        <View style={styles.challengeFooter}>
          <Text style={styles.dateText}>
            {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}
          </Text>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => navigation.navigate('ChallengeDetail', { challengeId: challenge.id })}
          >
            <Text style={styles.viewButtonText}>
              {challenge.status === 'upcoming' ? 'View Details' : 'View Entries'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Challenges</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {challenges.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'active' && 'No active challenges'}
              {activeTab === 'upcoming' && 'No upcoming challenges'}
              {activeTab === 'completed' && 'No completed challenges'}
            </Text>
            <Text style={styles.emptySubtext}>Check back soon for new challenges!</Text>
          </View>
        ) : (
          challenges.map(renderChallenge)
        )}
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
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
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
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#ef4444',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  challengeCard: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f5f9',
  },
  challengeContent: {
    padding: 16,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  prizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  prizeIcon: {
    fontSize: 20,
  },
  prizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  challengeStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIcon: {
    fontSize: 16,
  },
  statText: {
    fontSize: 13,
    color: '#64748b',
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  viewButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});

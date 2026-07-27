import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { challengeService, Challenge, ChallengeEntry } from '../services/challengeService';
import { userProfileService } from '../services/userProfileService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 6) / 3;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ChallengeDetailRouteProp = RouteProp<RootStackParamList, 'ChallengeDetail'>;

export default function ChallengeDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ChallengeDetailRouteProp>();
  const { challengeId } = route.params;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadChallengeData();
  }, [challengeId]);

  const loadChallengeData = async () => {
    try {
      setLoading(true);
      const [challengeData, entriesData, joined] = await Promise.all([
        challengeService.getChallenge(challengeId),
        challengeService.getChallengeEntries(challengeId, 'current-user'),
        challengeService.hasJoinedChallenge(challengeId, 'current-user'),
      ]);

      if (challengeData) {
        setChallenge(challengeData);
      }

      // Load user data for entries
      const entriesWithUsers = await Promise.all(
        entriesData.map(async (entry) => {
          const user = await userProfileService.getUserProfile(entry.userId);
          return { ...entry, user: user || undefined };
        })
      );

      setEntries(entriesWithUsers);
      setHasJoined(joined);
    } catch (error) {
      console.error('Error loading challenge:', error);
      showToast('Failed to load challenge', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async () => {
    try {
      const success = await challengeService.joinChallenge(challengeId, 'current-user');
      if (success) {
        setHasJoined(true);
        if (challenge) {
          setChallenge({ ...challenge, participants: challenge.participants + 1 });
        }
        showToast('Joined challenge!', 'success');
      } else {
        showToast('Already joined', 'error');
      }
    } catch (error) {
      showToast('Failed to join', 'error');
    }
  };

  const handleVote = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    try {
      if (entry.hasVoted) {
        await challengeService.unvoteForEntry(entryId, 'current-user');
        setEntries(entries.map(e => 
          e.id === entryId 
            ? { ...e, hasVoted: false, votes: e.votes - 1 }
            : e
        ));
      } else {
        await challengeService.voteForEntry(entryId, 'current-user');
        setEntries(entries.map(e => 
          e.id === entryId 
            ? { ...e, hasVoted: true, votes: e.votes + 1 }
            : e
        ));
        showToast('Vote recorded!', 'success');
      }
    } catch (error) {
      showToast('Failed to vote', 'error');
    }
  };

  const renderEntry = (entry: ChallengeEntry) => (
    <View key={entry.id} style={styles.entryCard}>
      <TouchableOpacity
        onPress={() => navigation.navigate('UserProfile', { userId: entry.userId })}
      >
        {entry.user?.profileImageUrl ? (
          <Image source={{ uri: entry.user.profileImageUrl }} style={styles.entryUserAvatar} />
        ) : (
          <View style={styles.entryUserAvatarPlaceholder}>
            <Text style={styles.entryUserInitial}>
              {entry.user?.displayName.charAt(0) || 'U'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.entryContent}>
        <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { postId: entry.postId })}>
          <Image source={{ uri: entry.imageUrl }} style={styles.entryImage} />
        </TouchableOpacity>
        
        <View style={styles.entryInfo}>
          <Text style={styles.entryUserName}>{entry.user?.displayName || 'User'}</Text>
          <Text style={styles.entryCaption} numberOfLines={2}>{entry.caption}</Text>
          
          <TouchableOpacity
            style={[styles.voteButton, entry.hasVoted && styles.voteButtonActive]}
            onPress={() => handleVote(entry.id)}
          >
            <Text style={styles.voteIcon}>{entry.hasVoted ? '❤️' : '🤍'}</Text>
            <Text style={[styles.voteText, entry.hasVoted && styles.voteTextActive]}>
              {entry.votes} {entry.votes === 1 ? 'vote' : 'votes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Challenge not found</Text>
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
        <Text style={styles.headerTitle}>Challenge</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView>
        {/* Challenge Info */}
        <View style={styles.challengeSection}>
          {challenge.imageUrl && (
            <Image source={{ uri: challenge.imageUrl }} style={styles.challengeImage} />
          )}
          
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <Text style={styles.challengeDescription}>{challenge.description}</Text>

            {challenge.prize && (
              <View style={styles.prizeBox}>
                <Text style={styles.prizeIcon}>🏆</Text>
                <View>
                  <Text style={styles.prizeLabel}>Prize</Text>
                  <Text style={styles.prizeText}>{challenge.prize}</Text>
                </View>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{challenge.participants}</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{challenge.entries}</Text>
                <Text style={styles.statLabel}>Entries</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                </Text>
                <Text style={styles.statLabel}>Days Left</Text>
              </View>
            </View>

            {/* Rules */}
            <View style={styles.rulesSection}>
              <Text style={styles.rulesTitle}>Rules</Text>
              {challenge.rules.map((rule, index) => (
                <View key={index} style={styles.ruleItem}>
                  <Text style={styles.ruleBullet}>•</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>

            {/* Hashtags */}
            <View style={styles.hashtagsSection}>
              <Text style={styles.hashtagsTitle}>Hashtags</Text>
              <View style={styles.hashtagsContainer}>
                {challenge.hashtags.map((tag, index) => (
                  <View key={index} style={styles.hashtagBadge}>
                    <Text style={styles.hashtagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Join Button */}
            {challenge.status !== 'completed' && (
              <TouchableOpacity
                style={[styles.joinButton, hasJoined && styles.joinButtonJoined]}
                onPress={handleJoinChallenge}
                disabled={hasJoined}
              >
                <Text style={styles.joinButtonText}>
                  {hasJoined ? '✓ Joined' : 'Join Challenge'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Entries */}
        {entries.length > 0 && (
          <View style={styles.entriesSection}>
            <Text style={styles.entriesTitle}>Entries ({entries.length})</Text>
            {entries.map(renderEntry)}
          </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
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
  challengeSection: {
    borderBottomWidth: 8,
    borderBottomColor: '#f8fafc',
  },
  challengeImage: {
    width: width,
    height: 250,
    backgroundColor: '#f1f5f9',
  },
  challengeInfo: {
    padding: 20,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  challengeDescription: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 20,
  },
  prizeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  prizeIcon: {
    fontSize: 32,
  },
  prizeLabel: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    marginBottom: 2,
  },
  prizeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  rulesSection: {
    marginBottom: 24,
  },
  rulesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  ruleBullet: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  hashtagsSection: {
    marginBottom: 24,
  },
  hashtagsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  hashtagText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonJoined: {
    backgroundColor: '#10b981',
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  entriesSection: {
    padding: 20,
  },
  entriesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  entryCard: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  entryUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
  },
  entryUserAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryUserInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  entryContent: {
    flex: 1,
  },
  entryImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginBottom: 8,
  },
  entryInfo: {
    gap: 4,
  },
  entryUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  entryCaption: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  voteButtonActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  voteIcon: {
    fontSize: 16,
  },
  voteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  voteTextActive: {
    color: '#ef4444',
  },
});

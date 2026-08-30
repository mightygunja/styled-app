import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { challengeService, Challenge, ChallengeEntry } from '../services/challengeService';
import { userProfileService } from '../services/userProfileService';
import { getCurrentUserId } from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ChallengeDetailRouteProp = RouteProp<RootStackParamList, 'ChallengeDetail'>;

function daysLeft(endDate: string): number | null {
  const end = new Date(endDate).getTime();
  if (isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

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
        challengeService.getChallengeEntries(challengeId, getCurrentUserId()),
        challengeService.hasJoinedChallenge(challengeId, getCurrentUserId()),
      ]);

      if (challengeData) setChallenge(challengeData);

      const entriesWithUsers = await Promise.all(
        entriesData.map(async entry => {
          const user = await userProfileService.getUserProfile(entry.userId);
          return { ...entry, user: user || undefined };
        })
      );

      setEntries(entriesWithUsers);
      setHasJoined(joined);
    } catch (error) {
      console.error('Error loading challenge:', error);
      showToast('Could not load this challenge', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async () => {
    try {
      const success = await challengeService.joinChallenge(challengeId, getCurrentUserId());
      if (success) {
        setHasJoined(true);
        if (challenge) setChallenge({ ...challenge, participants: challenge.participants + 1 });
        showToast("You're in", 'success');
      } else {
        showToast("You've already joined", 'error');
      }
    } catch (error) {
      showToast('Could not join', 'error');
    }
  };

  const handleVote = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    try {
      if (entry.hasVoted) {
        await challengeService.unvoteForEntry(entryId, getCurrentUserId());
        setEntries(entries.map(e => (e.id === entryId ? { ...e, hasVoted: false, votes: e.votes - 1 } : e)));
      } else {
        await challengeService.voteForEntry(entryId, getCurrentUserId());
        setEntries(entries.map(e => (e.id === entryId ? { ...e, hasVoted: true, votes: e.votes + 1 } : e)));
      }
    } catch (error) {
      showToast('Could not register that vote', 'error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={styles.busyBox}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Challenge not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const remaining = daysLeft(challenge.endDate);
  const isOpen = challenge.status !== 'completed';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!!challenge.imageUrl && (
          <Image source={{ uri: challenge.imageUrl }} style={styles.hero} />
        )}

        {!!challenge.type && <Text style={styles.eyebrow}>{challenge.type.toUpperCase()}</Text>}
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.description}>{challenge.description}</Text>

        {/* Three real numbers, set as type rather than boxed in a coloured
            panel - the figures carry it without decoration. */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{challenge.participants}</Text>
            <Text style={styles.statLabel}>JOINED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{challenge.entries}</Text>
            <Text style={styles.statLabel}>ENTRIES</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>
              {remaining !== null && remaining >= 0 ? remaining : '—'}
            </Text>
            <Text style={styles.statLabel}>{remaining === 1 ? 'DAY LEFT' : 'DAYS LEFT'}</Text>
          </View>
        </View>

        {!!challenge.prize && (
          <View style={styles.prizeBox}>
            <Text style={styles.prizeLabel}>THE PRIZE</Text>
            <Text style={styles.prizeText}>{challenge.prize}</Text>
          </View>
        )}

        {challenge.rules?.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>THE BRIEF</Text>
            {challenge.rules.map((rule, index) => (
              <View key={index} style={styles.ruleRow}>
                <Text style={styles.ruleIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </>
        )}

        {challenge.hashtags?.length > 0 && (
          <View style={styles.hashtagRow}>
            {challenge.hashtags.map((tag, index) => (
              <Text key={index} style={styles.hashtag}>
                #{tag}
              </Text>
            ))}
          </View>
        )}

        {isOpen && (
          <Button
            title={hasJoined ? "You've joined" : 'Join this challenge'}
            onPress={handleJoinChallenge}
            disabled={hasJoined}
            fullWidth
            style={{ marginTop: spacing.section }}
          />
        )}

        {/* Joining used to be the end of the road - there was no way to
            actually enter. The entry IS a post, so entering goes through
            CreatePost carrying the challenge id. */}
        {isOpen && hasJoined && (
          <Button
            title="Submit an entry"
            variant="secondary"
            fullWidth
            onPress={() => navigation.navigate('CreatePost', { challengeId })}
            style={{ marginTop: 10 }}
          />
        )}

        <Text style={styles.sectionLabel}>
          {entries.length > 0 ? `ENTRIES · ${entries.length}` : 'ENTRIES'}
        </Text>

        {entries.length === 0 ? (
          <Text style={styles.emptyText}>
            {isOpen
              ? 'Nobody has entered yet. Yours would be the first.'
              : 'This challenge closed without any entries.'}
          </Text>
        ) : (
          entries.map(entry => (
            <View key={entry.id} style={styles.entry}>
              <TouchableOpacity
                style={styles.entryHead}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('UserProfile', { userId: entry.userId })}
              >
                {entry.user?.profileImageUrl ? (
                  <Image source={{ uri: entry.user.profileImageUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {entry.user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <Text style={styles.entryName}>{entry.user?.displayName || 'Someone'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('PostDetail', { postId: entry.postId })}
              >
                <Image source={{ uri: entry.imageUrl }} style={styles.entryImage} />
              </TouchableOpacity>

              {!!entry.caption && (
                <Text style={styles.entryCaption} numberOfLines={3}>
                  {entry.caption}
                </Text>
              )}

              <TouchableOpacity
                style={[styles.voteButton, entry.hasVoted && styles.voteButtonActive]}
                onPress={() => handleVote(entry.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.voteText, entry.hasVoted && styles.voteTextActive]}>
                  {entry.hasVoted ? 'VOTED' : 'VOTE'} · {entry.votes}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  busyBox: { paddingVertical: 100, alignItems: 'center' },

  hero: {
    width: '100%',
    height: 200,
    backgroundColor: colors.paper,
    marginBottom: spacing.lg,
  },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink, lineHeight: 40 },
  description: { ...textType.body, color: colors.inkMuted, marginTop: 12, lineHeight: 23 },
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 14 },
  emptyText: { ...textType.body, fontSize: 13, color: colors.inkMuted },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.section,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hair,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: colors.hair },
  statNumber: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  statLabel: { ...textType.microLabel, color: colors.inkFaint, marginTop: 4 },

  prizeBox: { backgroundColor: colors.sand, padding: spacing.md, marginTop: spacing.lg },
  prizeLabel: { ...textType.microLabel, color: colors.tobacco, marginBottom: 6 },
  prizeText: { ...textType.body, color: colors.ink },

  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  ruleIndex: { fontFamily: fonts.serif, fontSize: 15, color: colors.camel, width: 32 },
  ruleText: { ...textType.body, color: colors.inkMuted, flex: 1, lineHeight: 22 },

  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing.lg },
  hashtag: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.tobacco },

  entry: {
    marginBottom: spacing.section,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  entryHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.paper },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.tobacco },
  entryName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, marginLeft: 10 },
  entryImage: { width: '100%', height: 320, backgroundColor: colors.paper },
  entryCaption: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginTop: spacing.sm },

  voteButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: 'transparent',
  },
  voteButtonActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  voteText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.ink,
  },
  voteTextActive: { color: colors.bone },
});

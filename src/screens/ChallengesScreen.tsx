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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from '../components/BackButton';
import Chip from '../components/Chip';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { challengeService, Challenge, ChallengeStatus } from '../services/challengeService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TABS: Array<{ value: ChallengeStatus; label: string }> = [
  { value: 'active', label: 'Open now' },
  { value: 'upcoming', label: 'Coming up' },
  { value: 'completed', label: 'Finished' },
];

const EMPTY_COPY: Record<ChallengeStatus, { title: string; body: string }> = {
  active: {
    title: 'Nothing running right now',
    body: 'New challenges open every week. Have a look at what is coming up.',
  },
  upcoming: {
    title: 'Nothing scheduled yet',
    body: 'The next challenge will appear here before it opens.',
  },
  completed: {
    title: 'No finished challenges',
    body: 'Once a challenge closes it moves here, with every entry intact.',
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function timing(challenge: Challenge): string {
  const now = Date.now();
  const start = new Date(challenge.startDate).getTime();
  const end = new Date(challenge.endDate).getTime();

  if (challenge.status === 'upcoming') {
    const days = Math.ceil((start - now) / 86_400_000);
    if (days <= 0) return 'Opens today';
    return days === 1 ? 'Opens tomorrow' : `Opens in ${days} days`;
  }

  if (challenge.status === 'completed') {
    return `Ended ${formatDate(challenge.endDate)}`;
  }

  const days = Math.ceil((end - now) / 86_400_000);
  if (days < 0) return 'Ended';
  if (days === 0) return 'Ends today';
  return days === 1 ? '1 day left' : `${days} days left`;
}

/** True when a challenge is close enough to closing to be worth flagging. */
function isClosingSoon(challenge: Challenge): boolean {
  if (challenge.status !== 'active') return false;
  const days = Math.ceil((new Date(challenge.endDate).getTime() - Date.now()) / 86_400_000);
  return days >= 0 && days <= 3;
}

export default function ChallengesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<ChallengeStatus>('active');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChallenges();
  }, [activeTab]);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      setChallenges(await challengeService.getChallenges(activeTab));
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.ink} />
        }
      >
        <Text style={styles.eyebrow}>COMMUNITY</Text>
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.subtitle}>
          A styling brief, a fortnight to answer it, and everyone working from their own wardrobe.
          The constraint is the point.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabContent}
        >
          {TABS.map(tab => (
            <Chip
              key={tab.value}
              label={tab.label}
              active={activeTab === tab.value}
              onPress={() => setActiveTab(tab.value)}
              style={styles.tabChip}
            />
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : challenges.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>{EMPTY_COPY[activeTab].title}</Text>
            <Text style={styles.emptyText}>{EMPTY_COPY[activeTab].body}</Text>
          </View>
        ) : (
          challenges.map((challenge, index) => (
            <TouchableOpacity
              key={challenge.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ChallengeDetail', { challengeId: challenge.id })}
            >
              {!!challenge.imageUrl && (
                <Image source={{ uri: challenge.imageUrl }} style={styles.cardImage} />
              )}

              <View style={styles.cardHead}>
                <Text style={styles.cardIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={styles.cardHeadText}>
                  {!!challenge.type && (
                    <Text style={styles.cardType}>{challenge.type.toUpperCase()}</Text>
                  )}
                  <Text style={styles.cardTitle}>{challenge.title}</Text>
                </View>
              </View>

              <Text style={styles.cardDescription} numberOfLines={3}>
                {challenge.description}
              </Text>

              {!!challenge.prize && <Text style={styles.cardPrize}>{challenge.prize}</Text>}

              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>
                  {formatDate(challenge.startDate)} – {formatDate(challenge.endDate)}
                  {challenge.participants > 0 || challenge.entries > 0
                    ? `  ·  ${challenge.participants} joined  ·  ${challenge.entries} ${
                        challenge.entries === 1 ? 'entry' : 'entries'
                      }`
                    : ''}
                </Text>
                <Text
                  style={[styles.cardTiming, isClosingSoon(challenge) && styles.cardTimingUrgent]}
                >
                  {timing(challenge)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },

  // Horizontal so adding a fourth filter can never clip the way Shop's did.
  tabScroll: { marginTop: spacing.lg, marginHorizontal: -spacing.page, flexGrow: 0, flexShrink: 0 },
  tabContent: { paddingHorizontal: spacing.page, paddingVertical: 4, alignItems: 'center' },
  tabChip: { marginRight: 8 },

  busyBox: { paddingVertical: 80, alignItems: 'center' },

  emptyBox: { marginTop: spacing.section, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },

  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.lg,
  },
  cardImage: {
    width: '100%',
    height: 140,
    marginBottom: spacing.md,
    backgroundColor: colors.paper,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  // The numeral is the one decorative flourish, the same device Edits uses.
  cardIndex: { fontFamily: fonts.serif, fontSize: 20, color: colors.camel, width: 38 },
  cardHeadText: { flex: 1 },
  cardType: { ...textType.microLabel, color: colors.tobacco, marginBottom: 4 },
  cardTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink, lineHeight: 27 },
  cardDescription: {
    ...textType.body,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  cardPrize: { ...textType.meta, fontSize: 12, color: colors.tobacco, marginTop: spacing.sm },
  cardFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardMeta: { ...textType.meta, fontSize: 11, flex: 1 },
  cardTiming: { fontFamily: fonts.sansSemiBold, fontSize: 11, color: colors.inkMuted },
  cardTimingUrgent: { color: colors.tobacco },
});

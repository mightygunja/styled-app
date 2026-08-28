/**
 * The Trend Report.
 *
 * The trend layer's home surface: what is genuinely moving in fashion's
 * capitals right now - editor-curated, never invented - and, for every
 * trend, the bridge from this user's actual closet: what they can wear
 * today, and the one piece that gets them in when they can't.
 *
 * Two-phase render: the deterministic keyword-matched report paints
 * instantly, then the AI personalization pass (personalizeTrendReport)
 * upgrades each trend in place with a garment-level read of the closet -
 * how far in the user already is, styling advice from their named pieces,
 * and a shop suggestion vetted to never be something they already own.
 * If the pass can't run, the deterministic report simply stands.
 *
 * Avoid rules are a preference, not a veto: a trend that crosses one still
 * appears, demoted and with the crossing said plainly, because the point of
 * the report is reaching past someone's defaults. "Not my thing" is a real
 * signal - it narrows how far the app stretches this person, without ever
 * silencing the trend layer.
 *
 * The community's own hashtag activity keeps a small section at the bottom:
 * it is a real signal about this app's users, but it is not the world.
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Item } from '../types';
import BackButton from '../components/BackButton';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { trendInsightsService, TrendingTag } from '../services/trendInsightsService';
import { trendRemixService, TrendRemix, anchorDisplayLabel } from '../services/trendRemixService';
import { buildProfileMatchContext } from '../services/profileMatchContext';
import { shopperSignals } from '../services/shopperSignals';
import { getCurrentWeather, CurrentWeather } from '../services/weatherService';
import { closetAPI, getCurrentUserId } from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TrendInsightsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [remixes, setRemixes] = useState<TrendRemix[]>([]);
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [place, setPlace] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Guards the async AI upgrade against landing over a newer load.
  const loadIdRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      const [closetResponse, profile, trending, weather] = await Promise.all([
        closetAPI.getItems(userId).catch(() => ({ data: [] })),
        buildProfileMatchContext(userId).catch(() => undefined),
        trendInsightsService.getTrendingHashtags(8).catch(() => [] as TrendingTag[]),
        getCurrentWeather().catch(() => undefined as CurrentWeather | undefined),
      ]);
      await shopperSignals.load();
      setPlace(weather?.city ?? null);

      const closetItems: Item[] = ((closetResponse as any).data || []).map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category,
        color: item.color,
        subcategory: item.subcategory,
        style: item.style,
        fitType: item.fitType,
        fabricTexture: item.fabricTexture,
        tags: item.tags,
      }));

      const locale = {
        city: weather?.city,
        region: weather?.region,
        country: weather?.country,
        temperature: weather?.temperature,
        condition: weather?.condition,
      };
      const deterministic = await trendRemixService.loadTrendRemixes(closetItems, profile, locale);
      const loadId = ++loadIdRef.current;
      setRemixes(deterministic);
      setTags(trending);

      // Second phase: the AI stylist's per-user read, upgraded in place once
      // it lands (day-cached, so revisits don't re-spend the model call).
      trendRemixService
        .personalizeRemixes(deterministic, closetItems, profile, locale)
        .then(upgraded => {
          if (upgraded && loadIdRef.current === loadId) setRemixes(upgraded);
        })
        .catch(() => {});
    } catch (error) {
      console.error('Error loading the trend report:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const shopTrend = (remix: TrendRemix) => {
    shopperSignals.recordTrendTap(remix.trend.id).catch(() => {});
    // Shop opens focused on this trend: results filter and rank to the
    // trend's own garments/cuts/colours, and the vetted gap phrase rides
    // along so the page can say what the user came for.
    navigation.navigate('Shop', {
      trendId: remix.trend.id,
      trendName: remix.trend.name,
      trendGap:
        remix.personalization?.gapNote ??
        (remix.wearableToday ? undefined : remix.trend.entryPiece),
    });
  };

  const dismissTrend = (remix: TrendRemix) => {
    shopperSignals.recordTrendDismiss(remix.trend.id).catch(() => {});
    setDismissed(current => new Set(current).add(remix.trend.id));
  };

  const visible = remixes.filter(r => !dismissed.has(r.trend.id));

  const anchorLine = (remix: TrendRemix): string =>
    `Wear it today: your ${remix.anchors.slice(0, 3).map(anchorDisplayLabel).join(', ')}.`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>THE TREND REPORT</Text>
        <Text style={styles.title}>What's moving right now</Text>
        <Text style={styles.subtitle}>
          {place
            ? `Ranked for ${place} — your weather, your closet, your taste. Curated from what's genuinely happening in fashion's capitals.`
            : "Curated from what's genuinely happening in fashion's capitals — with the way in from the closet you already own."}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.ink} style={{ marginTop: 40 }} />
        ) : visible.length === 0 ? (
          <Text style={styles.emptyText}>
            Nothing on the trend desk right now — check back soon.
          </Text>
        ) : (
          visible.map((remix, index) => {
            const { trend } = remix;
            const p = remix.personalization;
            // The AI read replaces the keyword-matched box once present; it
            // knows the difference between "owns the trend" and "matched a
            // keyword", so its verdict leads.
            const boxLabel = p
              ? p.participation === 'in'
                ? "YOU'RE ALREADY IN THIS TREND"
                : p.participation === 'partial'
                  ? 'ALREADY STARTED IN YOUR CLOSET'
                  : 'THE WAY IN'
              : remix.wearableToday
                ? 'ALREADY IN YOUR CLOSET'
                : 'THE WAY IN';
            const boxText = p
              ? p.wearNote
              : remix.wearableToday
                ? anchorLine(remix)
                : remix.gapLine;
            const shopLabel = p
              ? p.gapNote
                ? 'Find the piece'
                : 'Go deeper in Shop'
              : remix.wearableToday
                ? 'Go deeper in Shop'
                : 'Find the piece';
            return (
              <View key={trend.id} style={styles.trendCard}>
                <View style={styles.trendTopRow}>
                  <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={styles.trendMeta}>
                    {trend.stage.toUpperCase()} · {trend.region.toUpperCase()}
                  </Text>
                </View>
                {!!remix.localeNote && <Text style={styles.localeNote}>{remix.localeNote}</Text>}
                <Text style={styles.trendName}>{trend.name}</Text>
                <Text style={styles.trendSummary}>{trend.summary}</Text>

                {!!remix.challengesAvoidRule && (
                  <Text style={styles.challengeLine}>
                    You told us you skip {remix.challengesAvoidRule} — shown anyway, because this
                    is the trend that argues otherwise. Your call.
                  </Text>
                )}

                {boxText ? (
                  <View style={styles.wearBox}>
                    <Text style={styles.wearLabel}>{boxLabel}</Text>
                    <Text style={styles.wearText}>{boxText}</Text>
                    {/* The AI's shop suggestion is vetted against ownership -
                        this line never names something already in the closet. */}
                    {!!p?.gapNote && (
                      <Text style={styles.gapNoteText}>Worth adding: {p.gapNote}</Text>
                    )}
                  </View>
                ) : null}

                <Text style={styles.stylingNote}>{trend.stylingNote}</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.shopAction}
                    accessibilityRole="button"
                    accessibilityLabel={`Shop the ${trend.name} trend`}
                    onPress={() => shopTrend(remix)}
                  >
                    <Text style={styles.shopActionText}>{shopLabel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dismissAction}
                    accessibilityRole="button"
                    accessibilityLabel={`Not my thing: ${trend.name}`}
                    onPress={() => dismissTrend(remix)}
                  >
                    <Text style={styles.dismissActionText}>Not my thing</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {tags.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>WHAT THE COMMUNITY IS WEARING</Text>
            <Text style={styles.sectionNote}>
              From hashtags across recent posts in the 33 Trends community.
            </Text>
            <View style={styles.tagWrap}>
              {tags.map(tag => (
                <TouchableOpacity
                  key={tag.hashtag}
                  style={styles.tagChip}
                  onPress={() => navigation.navigate('Explore')}
                >
                  <Text style={styles.tagText}>#{tag.hashtag}</Text>
                  <Text style={styles.tagCount}>{tag.postCount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  eyebrow: { ...textType.eyebrow, marginBottom: 8 },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 40, textAlign: 'center' },

  trendCard: {
    marginTop: spacing.section,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  trendTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { fontFamily: fonts.serifItalic, fontSize: 16, color: colors.camel },
  trendMeta: { ...textType.eyebrow, fontSize: 9 },
  localeNote: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.camel,
    marginTop: 6,
  },
  trendName: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 29, color: colors.ink, marginTop: 8 },
  trendSummary: { ...textType.body, fontSize: 14, lineHeight: 21, color: colors.inkMuted, marginTop: 6 },
  challengeLine: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    lineHeight: 19,
    color: colors.tobacco,
    marginTop: 8,
  },

  wearBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.paper,
    borderLeftWidth: 2,
    borderLeftColor: colors.camel,
  },
  wearLabel: { ...textType.eyebrow, fontSize: 9, marginBottom: 6 },
  wearText: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 19, color: colors.ink },
  gapNoteText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: colors.tobacco,
    marginTop: 8,
  },

  stylingNote: { ...textType.body, fontSize: 13, lineHeight: 20, color: colors.ink, marginTop: spacing.md },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: spacing.md },
  shopAction: { backgroundColor: colors.ink, paddingHorizontal: 16, paddingVertical: 11 },
  shopActionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.white },
  dismissAction: { paddingVertical: 11 },
  dismissActionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkFaint },

  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 8 },
  sectionNote: { ...textType.meta, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  tagCount: { ...textType.meta, fontSize: 11 },
});

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

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Item } from '../types';
import BackButton from '../components/BackButton';
import { colors, fonts, radius, type as textType, spacing } from '../theme/designSystem';
import { BALANCED_CATALOG } from '../data/mockProductCatalog';
import { Product } from '../models/product';
import { FashionTrend } from '../models/fashionTrend';
import { trendInsightsService, TrendingTag } from '../services/trendInsightsService';
import { trendRemixService, TrendRemix, anchorDisplayLabel } from '../services/trendRemixService';
import { buildProfileMatchContext } from '../services/profileMatchContext';
import { shopperSignals } from '../services/shopperSignals';
import { getCurrentWeather, CurrentWeather } from '../services/weatherService';
import { amazonSearchUrl } from '../services/affiliateNetwork';
import { closetAPI, getCurrentUserId } from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Catalogue pieces that illustrate a trend, kept in the user's department —
 * the visual "here is what this style actually looks like" beneath each
 * trend's description.
 *
 * Scored, not first-match: a keyGarments hit is the anchor (3), and the
 * trend's silhouettes, keyColors and archetypes each add 1. Only pieces
 * scoring >= 3 qualify — so either a named garment of the trend, or a
 * silhouette hit corroborated by both its palette and its archetype. A
 * bare silhouette word is NOT enough: "layered" once put a gold necklace
 * and a zip hoodie under Sheer Layering, and "fitted" put a work sheath
 * under Heritage Sport. Distinct categories are preferred so four
 * thumbnails read as a look, not four pairs of the same trouser, but a
 * category slot is never filled by a weaker match than the rule allows.
 * Fewer than two qualifying pieces renders nothing — one lonely thumbnail
 * under a trend reads worse than no rail at all.
 */
function looksForTrend(
  trend: FashionTrend,
  focus: 'womens' | 'mens' | 'all' | undefined,
  limit: number = 4
): Product[] {
  const inDepartment = (product: Product) => {
    if (!focus || focus === 'all') return true;
    const department = product.department;
    if (!department || department === 'unisex') return true;
    return focus === 'womens' ? department === 'women' : department === 'men';
  };

  const scored: Array<{ score: number; product: Product }> = [];
  for (const product of BALANCED_CATALOG) {
    if (!inDepartment(product)) continue;
    const text = [product.name, product.subcategory, product.category, ...(product.styleTags ?? [])]
      .join(' ')
      .toLowerCase();
    const color = (product.color ?? '').toLowerCase();
    const garmentHit = trend.keyGarments.some(g => text.includes(g));
    const silhouetteHit = trend.silhouettes.some(s => text.includes(s));
    const colorHit = !!color && trend.keyColors.some(k => color.includes(k) || k.includes(color));
    const archetypeHit = (product.styleTags ?? []).some(tag => trend.archetypes.includes(tag));
    const score =
      (garmentHit ? 3 : 0) + (silhouetteHit ? 1 : 0) + (colorHit ? 1 : 0) + (archetypeHit ? 1 : 0);
    if (score >= 3) scored.push({ score, product });
  }
  scored.sort((a, b) => b.score - a.score);

  const picks: Product[] = [];
  const usedCategories = new Set<string>();
  // Two passes: distinct categories first, then fill remaining slots.
  for (const requireNewCategory of [true, false]) {
    for (const { product } of scored) {
      if (picks.length >= limit) break;
      if (picks.includes(product)) continue;
      if (requireNewCategory && usedCategories.has(product.category)) continue;
      picks.push(product);
      usedCategories.add(product.category);
    }
  }
  return picks.length >= 2 ? picks : [];
}

export default function TrendInsightsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [remixes, setRemixes] = useState<TrendRemix[]>([]);
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [place, setPlace] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Whose wardrobe this is - keeps outbound searches in the right department.
  const [focus, setFocus] = useState<'womens' | 'mens' | 'all' | undefined>(undefined);
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
      setFocus(profile?.wardrobeFocus);

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

  /**
   * The vetted piece this user is missing for the trend, when there is one -
   * qualified by department so every downstream search lands in the right
   * aisle ("men's plaid shirt", not a mixed rack).
   */
  const gapFor = (remix: TrendRemix): string | undefined => {
    const gap =
      remix.personalization?.gapNote ??
      (remix.wearableToday ? undefined : remix.trend.entryPiece);
    if (!gap) return undefined;
    const prefix = focus === 'mens' ? "men's " : focus === 'womens' ? "women's " : '';
    return prefix && !gap.toLowerCase().startsWith(prefix) ? `${prefix}${gap}` : gap;
  };

  /**
   * Primary action. When the report names a specific missing piece, "Find
   * the piece" means exactly that: a tagged Amazon search for the piece
   * itself - all of Amazon's inventory, not the app's bounded catalogue.
   * With no gap (they're already in the trend), it deepens in-app instead.
   */
  const shopTrend = (remix: TrendRemix) => {
    shopperSignals.recordTrendTap(remix.trend.id).catch(() => {});
    const gap = gapFor(remix);
    if (gap) {
      Linking.openURL(amazonSearchUrl(gap)).catch(() => {});
      return;
    }
    browseTrend(remix, false);
  };

  /** Secondary: the in-app Shop focused on this trend, scored against their closet. */
  const browseTrend = (remix: TrendRemix, recordTap: boolean = true) => {
    if (recordTap) shopperSignals.recordTrendTap(remix.trend.id).catch(() => {});
    navigation.navigate('Shop', {
      trendId: remix.trend.id,
      trendName: remix.trend.name,
      trendGap: gapFor(remix),
    });
  };

  const dismissTrend = (remix: TrendRemix) => {
    shopperSignals.recordTrendDismiss(remix.trend.id).catch(() => {});
    setDismissed(current => new Set(current).add(remix.trend.id));
  };

  const visible = remixes.filter(r => !dismissed.has(r.trend.id));

  // The catalogue pass is pure text matching over ~300 rows; memoised so it
  // runs once per report, not on every render.
  const trendLooks = useMemo(() => {
    const byTrend = new Map<string, Product[]>();
    remixes.forEach(remix => byTrend.set(remix.trend.id, looksForTrend(remix.trend, focus)));
    return byTrend;
  }, [remixes, focus]);

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
            const gap = gapFor(remix);
            const shopLabel = gap ? 'Find it on Amazon' : 'Go deeper in Shop';
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

                {(trendLooks.get(trend.id) ?? []).length > 0 && (
                  <View style={styles.lookRail}>
                    <Text style={styles.lookRailLabel}>THE LOOK, IN PIECES</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.lookRailContent}
                    >
                      {(trendLooks.get(trend.id) ?? []).map(product => (
                        <TouchableOpacity
                          key={product.id}
                          style={styles.lookCard}
                          activeOpacity={0.85}
                          accessibilityRole="button"
                          accessibilityLabel={`${trend.name} look: ${product.name}`}
                          onPress={() =>
                            navigation.navigate('ProductDetail', {
                              productId: product.id,
                              surface: 'shop',
                            })
                          }
                        >
                          <Image
                            source={{ uri: product.imageUrl }}
                            style={styles.lookImage}
                            resizeMode="cover"
                          />
                          <Text style={styles.lookName} numberOfLines={1}>
                            {product.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.shopAction}
                    accessibilityRole="button"
                    accessibilityLabel={`Shop the ${trend.name} trend`}
                    onPress={() => shopTrend(remix)}
                  >
                    <Text style={styles.shopActionText}>{shopLabel}</Text>
                  </TouchableOpacity>
                  {!!gap && (
                    <TouchableOpacity
                      style={styles.dismissAction}
                      accessibilityRole="button"
                      accessibilityLabel={`Browse ${trend.name} in Shop`}
                      onPress={() => browseTrend(remix)}
                    >
                      <Text style={styles.browseActionText}>Browse in Shop</Text>
                    </TouchableOpacity>
                  )}
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
                  accessibilityRole="button"
                  accessibilityLabel={`See community posts — #${tag.hashtag}`}
                  // These chips promise community posts, so they go to the
                  // community feed - not Explore, which is product discovery
                  // and has no concept of a hashtag.
                  onPress={() => navigation.navigate('SocialFeed')}
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
    borderRadius: radius.md,
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

  lookRail: { marginTop: spacing.md },
  lookRailLabel: { ...textType.eyebrow, fontSize: 9, marginBottom: 8 },
  lookRailContent: { gap: 10 },
  lookCard: { width: 104 },
  lookImage: {
    width: 104,
    height: 130,
    borderRadius: radius.sm,
    backgroundColor: colors.paper,
  },
  lookName: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.inkMuted, marginTop: 4 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: spacing.md },
  shopAction: {
    backgroundColor: colors.rust,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  shopActionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.white },
  dismissAction: { paddingVertical: 11 },
  dismissActionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkFaint },
  browseActionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.tobacco },

  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 8 },
  sectionNote: { ...textType.meta, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  tagCount: { ...textType.meta, fontSize: 11 },
});

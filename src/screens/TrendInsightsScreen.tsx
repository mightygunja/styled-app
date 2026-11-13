/**
 * The Trend Report.
 *
 * The trend layer's home surface: what is genuinely moving in fashion's
 * capitals right now - editor-curated, never invented - ranked for WHERE
 * this user is, and, for every trend, the bridge from their actual closet:
 * what they can wear today, and the one piece that gets them in when they
 * can't.
 *
 * Location is the organising idea. The same pool reads differently in
 * Marrakesh, Copenhagen and Dubai: a place's own trends lead, trends from
 * the capitals it takes its cues from read naturally, and foreign trends
 * are introduced at a pace set by how cosmopolitan the place is. Each card
 * says which of those it is, how the place wears the trend (fabric, shoe,
 * bag, jewellery), and - where the street dresses more covered - how to
 * make a skin-showing trend wearable there. The user can change the place
 * (travelling, or the device guessed wrong); that setting then drives every
 * surface's weather and styling, not just this one.
 *
 * Two-phase render: the deterministic keyword-matched report paints
 * instantly, then the AI personalization pass (personalizeTrendReport)
 * upgrades each trend in place with a garment-level read of the closet.
 * If the pass can't run, the deterministic report simply stands.
 *
 * Avoid rules are a preference, not a veto: a trend that crosses one still
 * appears, demoted and with the crossing said plainly. "Not my thing" is a
 * real signal - it narrows how far the app stretches this person, without
 * ever silencing the trend layer.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Item } from '../types';
import BackButton from '../components/BackButton';
import { colors, fonts, radius, type as textType, spacing } from '../theme/designSystem';
import { Product } from '../models/product';
import { trendInsightsService, TrendingTag } from '../services/trendInsightsService';
import { trendRemixService, TrendRemix, anchorDisplayLabel } from '../services/trendRemixService';
import { piecesForTrend } from '../services/trendLooks';
import { LocaleProfile, resolveLocaleProfile } from '../services/localeProfile';
import { buildProfileMatchContext } from '../services/profileMatchContext';
import { shopperSignals } from '../services/shopperSignals';
import {
  getCurrentWeather,
  CurrentWeather,
  searchDestinations,
  DestinationMatch,
  formatDestination,
} from '../services/weatherService';
import { getStyleLocation, setStyleLocation } from '../services/styleLocationService';
import { amazonSearchUrl, curatedCatalogNotice, liveTrendPieces } from '../services/affiliateNetwork';
import { trendAnchors } from '../services/trendSeeds';
import { composeLiveRail, mergeRail } from '../services/trendLiveRail';
import { scoreAndRankProducts } from '../services/marketplaceMatchingService';
import { isStandIn } from '../services/shopShelf';
import { openAtStore } from '../services/openAtStore';
import { closetAPI, getCurrentUserId } from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** How many trends the report shows. The pool is larger; the rest ranks below the fold of attention. */
const MAX_REPORT = 14;
const RAIL_LIMIT = 10;
/** Key pieces per trend that are looked up live (two reads as a look and keeps a page of trends to one request). */
const LIVE_PIECES_PER_TREND = 2;
/** Times the page asks for trend pieces the server had not reached yet. */
const LIVE_RAIL_ROUNDS = 4;

export default function TrendInsightsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [remixes, setRemixes] = useState<TrendRemix[]>([]);
  // Real products for each trend's key pieces, by trend id. Empty until the
  // live feed answers (and whenever it is off): the curated pieces show then.
  const [liveRails, setLiveRails] = useState<Map<string, Product[]>>(new Map());
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [place, setPlace] = useState<string | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [overridden, setOverridden] = useState(false);
  const [localeProfile, setLocaleProfile] = useState<LocaleProfile | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  // Whose wardrobe this is - keeps outbound searches in the right department.
  const [focus, setFocus] = useState<'womens' | 'mens' | 'all' | undefined>(undefined);
  // Guards the async AI upgrade against landing over a newer load.
  const loadIdRef = useRef(0);

  // "Dressing for" control: change the place the whole app dresses for.
  const [editingPlace, setEditingPlace] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<DestinationMatch[]>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  // The query the current results answer, so "No places found" only shows
  // for a finished search, never while the user is still typing.
  const [placeSearchedFor, setPlaceSearchedFor] = useState('');
  const [placeError, setPlaceError] = useState<string | null>(null);

  // Set once a report has painted: coming back from a product or the Shop
  // refreshes in place instead of swapping the whole report for a spinner and
  // dropping the reader back at the top.
  const loadedOnceRef = useRef(false);

  const load = useCallback(async (showSpinner: boolean = true) => {
    if (showSpinner) setLoading(true);
    try {
      const userId = getCurrentUserId();
      const [closetResponse, profile, trending, weather, override] = await Promise.all([
        closetAPI.getItems(userId).catch(() => ({ data: [] })),
        buildProfileMatchContext(userId).catch(() => undefined),
        trendInsightsService.getTrendingHashtags(8).catch(() => [] as TrendingTag[]),
        getCurrentWeather().catch(() => undefined as CurrentWeather | undefined),
        getStyleLocation().catch(() => null),
      ]);
      await shopperSignals.load();

      // The place: the weather fix carries the resolved city; the override,
      // when set, is the same place without needing a weather round trip.
      const city = weather?.city ?? override?.city;
      const country = weather?.country ?? override?.country;
      const region = weather?.region ?? override?.region;
      const latitude = weather?.latitude ?? override?.latitude;
      setPlace(city ?? null);
      setPlaceLabel(city ? [city, country].filter(Boolean).join(', ') : null);
      setOverridden(!!override);
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

      const resolvedProfile = city || country ? resolveLocaleProfile({ city, region, country, latitude }) : undefined;
      setLocaleProfile(resolvedProfile);

      const locale = {
        city,
        region,
        country,
        latitude,
        temperature: weather?.temperature,
        condition: weather?.condition,
        profile: resolvedProfile,
      };
      const deterministic = await trendRemixService.loadTrendRemixes(closetItems, profile, locale);
      const loadId = ++loadIdRef.current;
      setRemixes(deterministic);
      setTags(trending);
      loadedOnceRef.current = true;

      // Real products for each trend's own key pieces, in this member's
      // department, ranked against their profile and closet. The report is
      // already on screen; each rail fills in when its products arrive.
      const railTrends = deterministic.slice(0, MAX_REPORT);
      const piecesByTrend = new Map(
        railTrends.map(remix => [remix.trend.id, trendAnchors(remix.trend, profile?.wardrobeFocus, LIVE_PIECES_PER_TREND)] as const)
      );
      const allPieces = Array.from(new Set(Array.from(piecesByTrend.values()).flat()));
      const found: Record<string, Product[]> = {};
      const fillRails = async (round: number): Promise<void> => {
        const missing = allPieces.filter(piece => !(piece in found));
        if (missing.length === 0 || round > LIVE_RAIL_ROUNDS) return;
        const answer = await liveTrendPieces(missing, profile?.wardrobeFocus);
        if (loadIdRef.current !== loadId) return;
        const before = Object.keys(found).length;
        Object.assign(found, answer);
        const rails = new Map<string, Product[]>();
        railTrends.forEach(remix => {
          const perPiece = (piecesByTrend.get(remix.trend.id) || []).map(piece => ({
            piece,
            products: scoreAndRankProducts(found[piece] || [], profile, closetItems, { trends: [remix.trend] }).map(
              matched => matched.product
            ),
          }));
          const rail = composeLiveRail(perPiece, RAIL_LIMIT);
          if (rail.length > 0) rails.set(remix.trend.id, rail);
        });
        setLiveRails(rails);
        // Pieces nobody has asked for before are found a few at a time; the
        // server answers with what it reached. Ask again for the rest, as
        // long as each answer brings something new.
        if (Object.keys(found).length > before) await fillRails(round + 1);
      };
      fillRails(1).catch(() => {});

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
      load(!loadedOnceRef.current);
    }, [load])
  );

  // Place search, debounced. Open-Meteo geocoding, no key, returns city +
  // country + coordinates - exactly what the override needs.
  useEffect(() => {
    if (!editingPlace) return;
    const query = placeQuery.trim();
    if (query.length < 2) {
      setPlaceResults([]);
      return;
    }
    let cancelled = false;
    setSearchingPlace(true);
    const handle = setTimeout(() => {
      searchDestinations(query)
        .then(results => {
          if (!cancelled) setPlaceResults(results);
        })
        .catch(() => {
          if (!cancelled) setPlaceResults([]);
        })
        .finally(() => {
          if (!cancelled) setPlaceSearchedFor(query);
          if (!cancelled) setSearchingPlace(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [placeQuery, editingPlace]);

  const choosePlace = async (match: DestinationMatch) => {
    setPlaceError(null);
    try {
      await setStyleLocation({
        city: match.name,
        region: match.region,
        country: match.country,
        latitude: match.latitude,
        longitude: match.longitude,
      });
    } catch (error) {
      console.error('Error saving the style location:', error);
      setPlaceError("Couldn't save that place. Please try again.");
      return;
    }
    setEditingPlace(false);
    setPlaceQuery('');
    setPlaceResults([]);
    load();
  };

  const useDeviceLocation = async () => {
    setPlaceError(null);
    try {
      await setStyleLocation(null);
    } catch (error) {
      console.error('Error clearing the style location:', error);
      setPlaceError("Couldn't switch back to your location. Please try again.");
      return;
    }
    setEditingPlace(false);
    setPlaceQuery('');
    setPlaceResults([]);
    load();
  };

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
   * The Amazon search for the piece the report says is missing: a tagged
   * search of all of Amazon's inventory. It was the primary action while the
   * app had only its curated catalogue to offer; with real pieces on the
   * rail it is the second choice, after the Shop that shows them.
   */
  const searchAmazon = (remix: TrendRemix) => {
    shopperSignals.recordTrendTap(remix.trend.id).catch(() => {});
    const gap = gapFor(remix);
    if (gap) {
      // If the link can't open, the in-app Shop focused on the same gap is
      // the next best thing - never a dead button.
      Linking.openURL(amazonSearchUrl(gap)).catch(() => browseTrend(remix, false));
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

  // A piece on a trend's rail goes straight to its store (openAtStore.ts);
  // the product page only when the store cannot be opened.
  const shopPiece = (productId: string, reason: string) => {
    openAtStore(productId, { surface: 'shop', reason }).then(opened => {
      if (!opened) navigation.navigate('ProductDetail', { productId, surface: 'shop' });
    });
  };

  const dismissTrend = (remix: TrendRemix) => {
    shopperSignals.recordTrendDismiss(remix.trend.id).catch(() => {});
    setDismissed(current => new Set(current).add(remix.trend.id));
  };

  const visible = remixes.filter(r => !dismissed.has(r.trend.id)).slice(0, MAX_REPORT);

  // The rail pass is pure matching over ~440 rows; memoised so it runs once
  // per report, not on every render. Local staples rank first within a slot.
  const trendLooks = useMemo(() => {
    const byTrend = new Map<string, Product[]>();
    remixes.forEach(remix =>
      byTrend.set(remix.trend.id, piecesForTrend(remix.trend, focus, { limit: RAIL_LIMIT, locale: localeProfile }))
    );
    return byTrend;
  }, [remixes, focus, localeProfile]);

  // Where this person is on the trend path, and the one piece to try next
  // (trendPath.ts). Worked out from the ranked list on screen, so the card
  // and the report below it always agree.
  const path = useMemo(
    () => (remixes.length > 0 ? trendRemixService.trendPathView(remixes, focus) : null),
    [remixes, focus]
  );

  const anchorLine = (remix: TrendRemix): string =>
    `Wear it today: your ${remix.anchors.slice(0, 3).map(anchorDisplayLabel).join(', ')}.`;

  const subtitle = place
    ? `Ranked for ${place} — its weather and season, how its streets actually dress, and your own closet. Curated from what's genuinely happening in fashion's capitals.`
    : "Curated from what's genuinely happening in fashion's capitals — with the way in from the closet you already own.";

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>THE TREND REPORT</Text>
        <Text style={styles.title}>What's moving right now</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* The trend path: where they are, what that means for what they are
            shown, and the single next piece - sized to their step. */}
        {path && (
          <View style={styles.pathCard}>
            <Text style={styles.pathEyebrow}>YOUR TREND PATH · STEP {path.step.level} OF 5</Text>
            <View style={styles.pathDots}>
              {[1, 2, 3, 4, 5].map(n => (
                <View key={n} style={[styles.pathDot, n <= path.step.level && styles.pathDotOn]} />
              ))}
            </View>
            <Text style={styles.pathName}>{path.step.name}</Text>
            <Text style={styles.pathLine}>{path.step.line}</Text>
            {path.next && (
              <TouchableOpacity
                style={styles.pathNext}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Your next step: ${path.next.piece.name}, from ${path.next.trend.name}`}
                onPress={() => {
                  shopperSignals.recordTrendTap(path.next!.trend.id).catch(() => {});
                  shopPiece(path.next!.piece.id, `next step: ${path.next!.trend.name}`);
                }}
              >
                <Image source={{ uri: path.next.piece.imageUrl }} style={styles.pathNextImage} resizeMode="cover" />
                <View style={styles.pathNextText}>
                  <Text style={styles.pathNextLabel}>YOUR NEXT STEP · {path.next.trend.name.toUpperCase()}</Text>
                  <Text style={styles.pathNextName}>{path.next.piece.name}</Text>
                  <Text style={styles.pathNextWhy}>{path.next.why}</Text>
                </View>
              </TouchableOpacity>
            )}
            <Text style={styles.pathPace}>
              Your step moves with what you open and own - one step a week at most, in either direction.
            </Text>
          </View>
        )}

        {/* Where the app is dressing this person for. Changing it here changes
            it everywhere - Home's looks, the Shop's ranking, the stylist. */}
        <View style={styles.placeBox}>
          {!editingPlace ? (
            <View style={styles.placeRow}>
              <View style={styles.placeText}>
                <Text style={styles.placeLabel}>DRESSING FOR</Text>
                <Text style={styles.placeName}>
                  {placeLabel ?? 'Location unknown'}
                  {overridden ? '  ·  set by you' : ''}
                </Text>
                {!!localeProfile && (
                  <Text style={styles.placeScene} numberOfLines={2}>
                    {localeProfile.scene}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Change the place the app dresses you for"
                onPress={() => setEditingPlace(true)}
              >
                <Text style={styles.placeChange}>{placeLabel ? 'Change' : 'Set a city'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.placeLabel}>DRESS ME FOR</Text>
              <TextInput
                style={styles.placeInput}
                value={placeQuery}
                onChangeText={setPlaceQuery}
                placeholder="Marrakesh, Dubai, Sydney…"
                placeholderTextColor={colors.inkFaint}
                autoFocus
                autoCorrect={false}
                accessibilityLabel="City to dress for"
              />
              {searchingPlace && <ActivityIndicator size="small" color={colors.ink} style={{ marginTop: 8 }} />}
              {placeResults.map(match => (
                <TouchableOpacity
                  key={match.id}
                  style={styles.placeResult}
                  accessibilityRole="button"
                  accessibilityLabel={`Dress me for ${formatDestination(match)}`}
                  onPress={() => choosePlace(match)}
                >
                  <Text style={styles.placeResultText}>{formatDestination(match)}</Text>
                </TouchableOpacity>
              ))}
              {!searchingPlace &&
                placeResults.length === 0 &&
                placeQuery.trim().length >= 2 &&
                placeSearchedFor === placeQuery.trim() && (
                  <Text style={styles.placeNote}>No places found. Try another spelling or a nearby city.</Text>
                )}
              {!!placeError && <Text style={[styles.placeNote, { color: colors.tobacco }]}>{placeError}</Text>}
              <View style={styles.placeActions}>
                {overridden && (
                  <TouchableOpacity accessibilityRole="button" onPress={useDeviceLocation}>
                    <Text style={styles.placeChange}>Use my location</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    setEditingPlace(false);
                    setPlaceQuery('');
                    setPlaceResults([]);
                    setPlaceError(null);
                  }}
                >
                  <Text style={styles.placeCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

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
            // With real pieces on the rail, the main button opens them: the
            // Shop on this trend, real products first, each going to its own
            // retailer. A generic Amazon search is then the lesser offer and
            // sits beside it as a link. Without real pieces (feed off, or
            // nothing found for this trend) Amazon stays the way to the piece.
            const hasLivePieces = (liveRails.get(trend.id)?.length ?? 0) > 0;
            const amazonFirst = !!gap && !hasLivePieces;
            const shopLabel = amazonFirst ? 'Find it on Amazon' : hasLivePieces ? 'Shop this trend' : 'Go deeper in Shop';
            // Real products for the trend's pieces when there are enough of
            // them; otherwise whatever is real first, then the curated pieces.
            const rail = mergeRail(liveRails.get(trend.id) ?? [], trendLooks.get(trend.id) ?? [], RAIL_LIMIT);
            const otherPlaces = (trend.regions ?? []).filter(r => r !== trend.region).slice(0, 3);
            return (
              <View key={trend.id} style={styles.trendCard}>
                <View style={styles.trendTopRow}>
                  <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={styles.trendMeta}>
                    {trend.stage.toUpperCase()} · {trend.region.toUpperCase()}
                    {otherPlaces.length ? ` · ALSO ${otherPlaces.join(', ').toUpperCase()}` : ''}
                  </Text>
                </View>
                {!!remix.localeNote && <Text style={styles.localeNote}>{remix.localeNote}</Text>}
                <Text style={styles.trendName}>{trend.name}</Text>
                <Text style={styles.trendSummary}>{trend.summary}</Text>
                {remix.matchReasons?.length > 0 && (
                  <Text style={styles.matchLine}>
                    <Text style={styles.matchLabel}>FOR YOU  </Text>
                    {remix.matchReasons.slice(0, 2).join(' · ')}
                  </Text>
                )}

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

                {/* The local translation: how the street here actually
                    finishes this trend, and - where the dress code runs more
                    covered - how a skin-showing trend is worn at all. */}
                {!!remix.localAdaptation && (
                  <Text style={styles.localAdaptation}>{remix.localAdaptation}</Text>
                )}
                {!!remix.localWear && <Text style={styles.localWear}>{remix.localWear}</Text>}

                {rail.length > 0 && (
                  <View style={styles.lookRail}>
                    <Text style={styles.lookRailLabel}>THE LOOK, IN PIECES</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.lookRailContent}
                    >
                      {rail.map(product => (
                        <TouchableOpacity
                          key={product.id}
                          style={styles.lookCard}
                          activeOpacity={0.85}
                          accessibilityRole="link"
                          accessibilityLabel={`${trend.name} look: shop ${product.name} at its store`}
                          onPress={() => shopPiece(product.id, `trend: ${trend.name}`)}
                        >
                          <Image
                            source={{ uri: product.imageUrl }}
                            style={styles.lookImage}
                            resizeMode="cover"
                          />
                          <Text style={styles.lookKind}>
                            {(product.subcategory || product.category).toUpperCase()}
                          </Text>
                          <Text style={styles.lookName} numberOfLines={1}>
                            {product.name}
                          </Text>
                          {/* A real product says where it is sold; a curated
                              stand-in has no one store to name. */}
                          {!isStandIn(product) && !!product.retailer && (
                            <Text style={styles.lookStore} numberOfLines={1}>
                              {product.retailer}
                            </Text>
                          )}
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
                    onPress={() => (amazonFirst ? searchAmazon(remix) : browseTrend(remix))}
                  >
                    <Text style={styles.shopActionText}>{shopLabel}</Text>
                  </TouchableOpacity>
                  {!!gap && (
                    <TouchableOpacity
                      style={styles.dismissAction}
                      accessibilityRole={amazonFirst ? 'button' : 'link'}
                      accessibilityLabel={
                        amazonFirst ? `Browse ${trend.name} in Shop` : `Search Amazon for the ${trend.name} piece`
                      }
                      onPress={() => (amazonFirst ? browseTrend(remix) : searchAmazon(remix))}
                    >
                      <Text style={styles.browseActionText}>{amazonFirst ? 'Browse in Shop' : 'Also on Amazon'}</Text>
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

        {/* "Find it on Amazon" is a tagged affiliate link and the piece rail
            is the curated catalogue, so the report carries the same
            disclosure as Shop, Explore and the product page. */}
        {!loading && visible.length > 0 && (
          <Text style={styles.disclosure}>
            {(() => {
              const notice = curatedCatalogNotice();
              return notice && notice.includes('Amazon Associate')
                ? notice
                : 'As an Amazon Associate we earn from qualifying purchases.';
            })()}
          </Text>
        )}

        {tags.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>WHAT THE COMMUNITY IS WEARING</Text>
            <Text style={styles.sectionNote}>
              From hashtags across recent posts in the 33 Trends community.
            </Text>
            <View style={styles.tagWrap}>
              {/* Plain tags, not buttons: the community feed cannot filter by
                  hashtag yet, so a tappable #tag would promise a filter that
                  does not exist. One honest link to the feed sits below. */}
              {tags.map(tag => (
                <View
                  key={tag.hashtag}
                  style={styles.tagChip}
                  accessible
                  accessibilityLabel={`#${tag.hashtag}, ${tag.postCount} ${tag.postCount === 1 ? 'post' : 'posts'}`}
                >
                  <Text style={styles.tagText}>#{tag.hashtag}</Text>
                  <Text style={styles.tagCount}>{tag.postCount}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.feedLink}
              accessibilityRole="button"
              accessibilityLabel="Open the community feed"
              onPress={() => navigation.navigate('SocialFeed')}
            >
              <Text style={styles.feedLinkText}>Open the community feed →</Text>
            </TouchableOpacity>
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
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 40, textAlign: 'center' },
  disclosure: { ...textType.meta, fontSize: 11, lineHeight: 16, color: colors.tobacco, marginTop: spacing.lg },
  feedLink: { alignSelf: 'flex-start', marginTop: spacing.md, paddingVertical: 6 },
  feedLinkText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.tobacco },

  placeBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeText: { flex: 1 },
  placeLabel: { ...textType.eyebrow, fontSize: 9 },
  placeName: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink, marginTop: 4 },
  placeScene: { ...textType.meta, fontSize: 12, lineHeight: 17, marginTop: 4 },
  placeChange: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.rust, paddingVertical: 6 },
  placeCancel: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkFaint, paddingVertical: 6 },
  placeInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.bone,
  },
  placeResult: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hair },
  placeResultText: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  placeNote: { ...textType.meta, fontSize: 12, marginTop: 8 },
  placeActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18, marginTop: 8 },

  trendCard: {
    marginTop: spacing.section,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  trendTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { fontFamily: fonts.serifItalic, fontSize: 16, color: colors.camel },
  trendMeta: { ...textType.eyebrow, fontSize: 9, flex: 1 },
  pathCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderLeftWidth: 2,
    borderLeftColor: colors.rust,
  },
  pathEyebrow: { ...textType.eyebrow, fontSize: 9, color: colors.rust },
  pathDots: { flexDirection: 'row', gap: 6, marginTop: 10 },
  pathDot: { flex: 1, height: 3, borderRadius: radius.full, backgroundColor: colors.hair },
  pathDotOn: { backgroundColor: colors.rust },
  pathName: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 26, color: colors.ink, marginTop: 12 },
  pathLine: { ...textType.body, fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginTop: 4 },
  pathNext: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.bone,
  },
  pathNextImage: { width: 72, height: 90, borderRadius: radius.sm, backgroundColor: colors.paper },
  pathNextText: { flex: 1, justifyContent: 'center' },
  pathNextLabel: { ...textType.eyebrow, fontSize: 9, color: colors.camel },
  pathNextName: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 22, color: colors.ink, marginTop: 4 },
  pathNextWhy: { ...textType.body, fontSize: 12, lineHeight: 17, color: colors.inkMuted, marginTop: 3 },
  pathPace: { ...textType.body, fontSize: 11, lineHeight: 16, color: colors.inkFaint, marginTop: 12 },
  matchLine: { ...textType.body, fontSize: 12, lineHeight: 18, color: colors.ink, marginTop: 8 },
  matchLabel: { ...textType.eyebrow, fontSize: 9, color: colors.rust },
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
  localAdaptation: {
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    lineHeight: 19,
    color: colors.tobacco,
    marginTop: 8,
  },
  localWear: { ...textType.meta, fontSize: 12, lineHeight: 18, color: colors.inkMuted, marginTop: 8 },

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
  lookKind: { ...textType.eyebrow, fontSize: 8, color: colors.camel, marginTop: 5 },
  lookName: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.inkMuted, marginTop: 2 },
  lookStore: { fontFamily: fonts.sans, fontSize: 9.5, color: colors.camel, marginTop: 1 },

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

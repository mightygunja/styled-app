import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Image,
  ActivityIndicator,
} from 'react-native';
// react-native-safe-area-context, not the core SafeAreaView, which is
// deprecated and warns on every render.
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Item } from '../types';
import { closetAPI, getCurrentUserId } from '../services/api';
import { outfitsService, styleProfileService } from '../services/firestore';
import { WardrobeFocus } from '../models/personalStyleProfile';
import { aiStyleService, StyleProfile } from '../services/aiStyleService';
import { getStyleVoice } from '../services/styleVoice';
import { OutfitRecommendation, OccasionType } from '../services/recommendationEngine';
import {
  dailyOutfitService,
  OccasionKey,
  OutfitPools,
  DailyOutfit,
  HOME_OCCASIONS,
} from '../services/dailyOutfitService';
import { buildProfileMatchContext } from '../services/profileMatchContext';
import { discoveryService } from '../services/discoveryService';
import { getCurrentWeather, CurrentWeather } from '../services/weatherService';
import { trendRemixService, TrendRemix } from '../services/trendRemixService';
import { getPublishedTrends } from '../services/trendService';
import { FashionTrend, itemMatchesTrend } from '../models/fashionTrend';
import { shopperSignals } from '../services/shopperSignals';
import TrendRemixCard from '../components/TrendRemixCard';
import Toast from '../components/Toast';
import Chip from '../components/Chip';
import Button from '../components/Button';
import BrandWordmark from '../components/BrandWordmark';
import { fadeIn } from '../utils/animations';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts, radius, type as textType } from '../theme/designSystem';
import { useIsDesktopWeb } from '../theme/responsive';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** "Not now" on the survey prompt is permanent. An offer that nags is not an offer. */
const PROFILE_PROMPT_DISMISSED_KEY = 'profilePrompt:dismissed';

const OCCASION_OPTIONS: { label: string; value: OccasionType }[] = [
  { label: 'Work', value: 'work' },
  { label: 'Date', value: 'date' },
  { label: 'Weekend', value: 'casual' },
  { label: 'Travel', value: 'travel' },
  { label: 'Event', value: 'party' },
];

function weatherLine(weather: CurrentWeather): string {
  const place = weather.city ? ` in ${weather.city}` : '';
  const temp = `${weather.temperature}°`;
  const moodByCondition: Record<CurrentWeather['condition'], string> = {
    sunny: 'a day made for light layers and clear colour',
    cloudy: 'a day made for wool and quiet colour',
    rainy: 'a day for weatherproof layers and a strong umbrella',
    snowy: 'a day for your warmest coat',
    cold: 'a day made for wool and warm layers',
    hot: 'a day made for breathable fabrics',
  };
  return `${temp}${place} — ${moodByCondition[weather.condition]}.`;
}

/**
 * Builds the day's looks and adapts them to the shape this screen renders.
 *
 * The old recommendationEngine produced four "variants" that all called the
 * same deterministic item picker with the same arguments, so they were the
 * same garments under different headlines - which is why swapping cycled the
 * same clothes. dailyOutfitService scores pairs jointly and diversifies the
 * set, so the looks are actually different from one another.
 */
function toRecommendations(
  outfits: DailyOutfit[],
  items: Item[],
  occasionValue: OccasionType
): OutfitRecommendation[] {
  const ownsShoes = items.some(i => (i.category || '').toLowerCase() === 'shoes');

  return outfits.map(outfit => ({
    id: outfit.id,
    title: outfit.title,
    description: outfit.note,
    occasion: occasionValue,
    items: outfit.items,
    suitabilityScore: Math.round(Math.max(0, Math.min(100, outfit.score))),
    // The model's sentence leads; the countable pairing reasons back it up.
    reasoning: [outfit.note, ...outfit.reasons].filter(Boolean),
    weatherSuitable: true,
    styleMatch: 0,
    missingPieces:
      !ownsShoes && !outfit.items.some(i => (i.category || '').toLowerCase() === 'shoes')
        ? ['shoes']
        : [],
    tags: [occasionValue],
  }));
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isDesktop = useIsDesktopWeb();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [occasion, setOccasion] = useState<OccasionType>('work');
  // Null until a real reading lands - the hero says nothing about weather
  // rather than asserting invented conditions.
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [archetype, setArchetype] = useState<string>('Quiet Luxe');
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [lookIndex, setLookIndex] = useState(0);
  // Which garment's swap tray is open, and the user's per-look edits. Edits
  // are keyed by the base look's id so cycling looks or tabs and coming back
  // keeps them, while a new slot's outfits start clean.
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [lookOverrides, setLookOverrides] = useState<Record<string, Item[]>>({});
  const swapTrayRef = useRef<View>(null);

  // The tray opens below the thumbnails, which on most screens is below the
  // fold at the moment of the tap - without this the only feedback for a
  // successful tap is off-screen and the feature reads as broken.
  useEffect(() => {
    if (!swapTargetId) return;
    const node = swapTrayRef.current as unknown as HTMLElement | null;
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [swapTargetId]);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  // Accounts from before the wardrobe-focus question exists see everything
  // mixed. Rather than guessing, Home asks once - one tap, saved to the
  // profile, and every surface filters to their department from then on.
  const [needsWardrobeFocus, setNeedsWardrobeFocus] = useState(false);
  const [savingFocus, setSavingFocus] = useState(false);
  const [starterMode, setStarterMode] = useState(false);
  // Trend remixes: what's moving in the world, anchored to this closet.
  // Regular mode renders the lead one as a card; starter mode (empty
  // closet) renders the top three, because trends are most of what the
  // screen has to offer before a closet exists.
  const [trendRemixes, setTrendRemixes] = useState<TrendRemix[]>([]);
  // Starter mode: a browsable rail of catalogue pieces matched to the
  // survey profile (and its department), so a brand-new account's Home is
  // a storefront of their taste rather than an empty room.
  const [starterItems, setStarterItems] = useState<Item[]>([]);
  const { toast, showToast, hideToast } = useToast();

  // Every tab's outfits are built once per slot and held here, so switching
  // chips is a synchronous state update. Previously the first visit to each tab
  // made its own Cloud Function call and waited on the model.
  const closetItemsRef = useRef<Item[]>([]);
  const styleProfileRef = useRef<StyleProfile | null>(null);
  const weatherRef = useRef<CurrentWeather | null>(null);
  const poolsRef = useRef<OutfitPools | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const dismissProfilePrompt = () => {
    setShowProfilePrompt(false);
    AsyncStorage.setItem(PROFILE_PROMPT_DISMISSED_KEY, '1').catch(() => {});
  };

  /**
   * One tap answers the department question for a pre-existing profile:
   * read-modify-write the saved profile, then rebuild the whole screen so
   * looks, trends and the rail immediately filter to their department.
   */
  const chooseWardrobeFocus = async (focus: WardrobeFocus) => {
    if (savingFocus) return;
    setSavingFocus(true);
    try {
      const userId = getCurrentUserId();
      const profile = await styleProfileService.getStyleProfile(userId);
      if (profile) {
        await styleProfileService.saveStyleProfile(userId, { ...profile, wardrobeFocus: focus });
      } else {
        // Survey-dismissers have no profile to write onto. Save a minimal
        // one carrying only their answer - empty taste fields read as "no
        // signal" to every engine, so nothing about them is invented.
        await styleProfileService.saveStyleProfile(userId, {
          lifestyleWeights: { work: 0.25, casual: 0.35, social: 0.25, travel: 0.15 },
          styleArchetypes: [],
          avoidRules: [],
          colorProfile: { primary: [], secondary: [], stretch: [] },
          fitPreferences: {},
          guidanceLevel: 'guided',
          wardrobeFocus: focus,
        });
      }
      setNeedsWardrobeFocus(false);
      await loadDressMeToday(occasion);
    } catch (error) {
      console.error('Could not save wardrobe focus:', error);
      showToast('Could not save that — try again', 'error');
    } finally {
      setSavingFocus(false);
    }
  };

  // Coming back from the survey modal: if a profile now exists, the offer has
  // been taken and the card should not still be sitting there. Checked only
  // while the prompt is visible, so this costs nothing in the normal case.
  useFocusEffect(
    useCallback(() => {
      if (!showProfilePrompt) return;
      buildProfileMatchContext(getCurrentUserId())
        .then(context => {
          if (context) setShowProfilePrompt(false);
        })
        .catch(() => {});
    }, [showProfilePrompt])
  );

  /** Paints one tab from the already-built pools. Pure lookup. */
  const showOccasion = (value: OccasionType, items: Item[]) => {
    const loaded = poolsRef.current;
    if (!loaded) return;
    const key = value as OccasionKey;
    const outfits = dailyOutfitService.composeOutfits(
      loaded.pools[key] || [],
      key,
      loaded.copy[key]
    );
    setRecommendations(toRecommendations(outfits, items, value));
  };

  const loadDressMeToday = async (occasionValue: OccasionType) => {
    try {
      const [weatherResult, itemsResponse, matchContext] = await Promise.all([
        getCurrentWeather(),
        closetAPI.getItems(getCurrentUserId()),
        // The onboarding survey's answers - archetypes, avoid rules, body
        // guidance. Without this the day-one profile never reached the most
        // visible surface in the app.
        buildProfileMatchContext(getCurrentUserId()).catch(() => undefined),
      ]);
      setWeather(weatherResult);
      weatherRef.current = weatherResult;

      const items: Item[] = (itemsResponse.data || []).map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category,
        color: item.color,
        brand: item.brand,
        price: item.price || 0,
        wornCount: item.wornCount,
        lastWornDate: item.lastWornDate,
        purchaseDate: item.purchaseDate,
        createdAt: item.createdAt,
        tags: item.tags,
        seasons: item.seasons,
        style: item.style,
        occasion: item.occasion,
        // Carried through so formality can be read off real garment
        // attributes rather than inferred from keyword regexes.
        subcategory: item.subcategory,
        pattern: item.pattern,
        fabricTexture: item.fabricTexture,
        fitType: item.fitType,
      }));
      // No saved profile at all means this account predates the survey -
      // offer it once, unless the user has already said not now.
      AsyncStorage.getItem(PROFILE_PROMPT_DISMISSED_KEY)
        .then(dismissed => {
          const surveyOffered = !dismissed && !matchContext;
          setShowProfilePrompt(surveyOffered);
          // The department question, for whoever hasn't answered it through
          // any door: profiles that predate the question, and users who
          // permanently dismissed the survey (they have no profile at all,
          // so nothing else will ever ask them). Never alongside the survey
          // offer - the survey's first step IS this question.
          setNeedsWardrobeFocus(
            matchContext ? !matchContext.wardrobeFocus : !!dismissed
          );
        })
        .catch(() => {
          setShowProfilePrompt(false);
          setNeedsWardrobeFocus(!!matchContext && !matchContext.wardrobeFocus);
        });

      // Avoid rules are a strong preference for owned clothes, not a veto:
      // "I don't wear skirts" still steers the daily looks away from the one
      // skirt in the closet - unless that piece anchors a genuinely current
      // trend, in which case trend seeps through and the look can invite a
      // rethink. The ranking prompt is told about the preference either way.
      const avoidRules = matchContext?.avoidRules ?? [];
      let activeTrends: FashionTrend[] = [];
      try {
        activeTrends = await getPublishedTrends();
      } catch {}
      const anchorsCurrentTrend = (item: Item) =>
        activeTrends.some(t => {
          if (t.stage === 'fading') return false;
          const match = itemMatchesTrend(t, item);
          return match === 'garment' || match === 'silhouette';
        });
      const wearable =
        avoidRules.length === 0
          ? items
          : items.filter(item => {
              const haystack = [item.name, item.subcategory, item.category, ...(item.tags || [])]
                .join(' ')
                .toLowerCase();
              const hitsRule = avoidRules.some(rule => haystack.includes(rule.toLowerCase()));
              return !hitsRule || anchorsCurrentTrend(item);
            });
      closetItemsRef.current = wearable;

      // The trend layer: which current trends this closet can already carry,
      // ranked for where this user actually is - their city's weather and
      // style scene reorder the same published pool. Awaited because the
      // outfit-ranking prompts below want the wearable trend lines - the
      // registry read is session-cached, so this is cheap.
      let trendLines: string[] = [];
      try {
        const remixes = await trendRemixService.loadTrendRemixes(
          wearable,
          matchContext,
          weatherResult
            ? {
                city: weatherResult.city,
                region: weatherResult.region,
                country: weatherResult.country,
                temperature: weatherResult.temperature,
                condition: weatherResult.condition,
              }
            : undefined
        );
        setTrendRemixes(remixes.slice(0, 3));
        trendLines = trendRemixService.wearableTrendLines(remixes);
      } catch {
        setTrendRemixes([]);
      }

      const styleProfile = await aiStyleService.analyzeStyle(items);
      styleProfileRef.current = styleProfile;
      // The archetype pill only claims an analysis when there is a closet to
      // analyze. With nothing scanned yet, fall back to what the user told
      // us in the survey - or say honestly that we're starting out.
      const surveyWord = matchContext?.styleArchetypes?.[0];
      setArchetype(
        items.length >= 3
          ? getStyleVoice(styleProfile).archetype
          : surveyWord
            ? surveyWord.charAt(0).toUpperCase() + surveyWord.slice(1)
            : 'Starting out'
      );

      // Undefined when no real reading exists: the outfit engine then scores
      // on occasion and closet alone instead of dressing for invented weather.
      const weatherContext = weatherResult
        ? { condition: weatherResult.condition, temperature: weatherResult.temperature }
        : undefined;

      // Cold start: a closet that cannot make a single top-and-bottom pair
      // would leave Dress Me Today as a dead end. Compose looks from the shop
      // instead - same engine, same occasion tabs, ranked against the survey
      // profile - and say so plainly in the banner. The moment enough real
      // pieces exist, this branch stops being taken.
      const coreCount = wearable.filter(i =>
        ['tops', 'bottoms', 'dresses'].includes((i.category || '').toLowerCase())
      ).length;
      if (coreCount < 3) {
        const starterPools = await discoveryService.buildStarterPools(matchContext);
        poolsRef.current = { slot: -1, pools: starterPools, copy: {} };
        setStarterMode(true);
        // The browsable rail: every distinct catalogue piece the starter
        // looks drew from, already ranked against the survey profile and
        // filtered to the user's department.
        const seen = new Set<string>();
        const rail: Item[] = [];
        Object.values(starterPools)
          .flat()
          .forEach(candidate =>
            candidate.items.forEach(item => {
              if (!seen.has(item.id) && item.imageUrl) {
                seen.add(item.id);
                rail.push(item);
              }
            })
          );
        setStarterItems(rail.slice(0, 12));
        showOccasion(occasionValue, []);
        setLookIndex(0);
        if (!refreshing) fadeIn(fadeAnim, 300).start();
        return;
      }
      setStarterMode(false);
      setStarterItems([]);

      const loaded = await dailyOutfitService.loadOutfitPools(wearable, {
        weather: weatherContext,
      });
      poolsRef.current = loaded;
      showOccasion(occasionValue, wearable);
      setLookIndex(0);

      if (!refreshing) fadeIn(fadeAnim, 300).start();

      // Copy for every tab is fetched in the background, in parallel, and only
      // for tabs that do not already have it cached for this slot. The screen
      // is already interactive; each tab's wording upgrades in place as it
      // arrives.
      const missing = HOME_OCCASIONS.filter(key => !loaded.copy[key]?.length);
      missing.forEach(key => {
        dailyOutfitService
          .rankOccasion(loaded.pools[key], key, {
            slot: loaded.slot,
            weather: weatherContext,
            archetypes: matchContext?.styleArchetypes,
            avoidRules,
            trendLines,
          })
          .then(copy => {
            if (!copy || poolsRef.current !== loaded) return;
            loaded.copy[key] = copy;
            // Only repaint if the user is still looking at this tab.
            setOccasion(current => {
              if (current === (key as OccasionType)) showOccasion(current, items);
              return current;
            });
          })
          .catch(() => undefined);
      });
    } catch (error) {
      console.error('Error loading Dress Me Today:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDressMeToday(occasion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    // A refresh rebuilds the pools; edits belonged to the outgoing looks.
    setLookOverrides({});
    setSwapTargetId(null);
    loadDressMeToday(occasion);
  };

  // Synchronous. No await, no network - the pools for every tab were built on
  // load, so this is a lookup and a setState.
  const handleOccasionPress = (value: OccasionType) => {
    setOccasion(value);
    if (!poolsRef.current) {
      // Tapped mid-initial-load; the full load will paint the right tab.
      return;
    }
    showOccasion(value, closetItemsRef.current);
    setLookIndex(0);
    setSwapTargetId(null);
  };

  // The look counter's arrows. Distinct from swapping a piece: this pages
  // through the three composed looks for the tab.
  const goToLook = (delta: number) => {
    if (recommendations.length === 0) return;
    setSwapTargetId(null);
    setLookIndex((lookIndex + delta + recommendations.length) % recommendations.length);
  };

  const handleSave = async () => {
    if (!look) return;
    try {
      await outfitsService.create(
        getCurrentUserId(),
        look.items.map(item => item.id),
        look.occasion,
        look.title
      );
      showToast('Look saved!', 'success');
    } catch (error) {
      console.error('Error saving look:', error);
      showToast('Failed to save look', 'error');
    }
  };

  const firstName = (user?.displayName || 'there').split(' ')[0];
  const today = new Date();
  const dateLabel = today
    .toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  // The rendered look is the engine's composition with the user's swaps laid
  // over it. Saving saves what is on screen, not what was first proposed.
  const baseLook = recommendations[lookIndex];
  const lookEdited = !!(baseLook && lookOverrides[baseLook.id]);
  const look = baseLook
    ? { ...baseLook, items: lookOverrides[baseLook.id] ?? baseLook.items }
    : undefined;

  const swapTarget = swapTargetId ? look?.items.find(i => i.id === swapTargetId) ?? null : null;
  // Alternates come from wherever the look itself came from: the wearable
  // closet normally, the starter catalogue pool in starter mode.
  const swapSource = starterMode
    ? (poolsRef.current?.pools[occasion as OccasionKey] || []).flatMap(c => c.items)
    : closetItemsRef.current;
  const alternates =
    swapTarget && look
      ? dailyOutfitService.rankAlternates(swapTarget, look.items, swapSource, occasion as OccasionKey)
      : [];

  const applySwap = (replacement: Item) => {
    if (!baseLook || !swapTarget) return;
    const items = (lookOverrides[baseLook.id] ?? baseLook.items).map(item =>
      item.id === swapTarget.id ? replacement : item
    );
    setLookOverrides(current => ({ ...current, [baseLook.id]: items }));
    setSwapTargetId(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  const lookImagesBlock = look ? (
    <View style={styles.lookCard}>
      {look.items[0]?.imageUrl && (
        <Image source={{ uri: look.items[0].imageUrl }} style={styles.heroImage} resizeMode="cover" />
      )}
      <View style={styles.thumbRow}>
        {look.items.slice(0, 4).map(item => {
          const costPerWear = item.price && item.wornCount
            ? (item.price / (item.wornCount + 1)).toFixed(2)
            : item.price?.toFixed(2);
          const isSwapping = swapTargetId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.thumbCard, isSwapping && styles.thumbCardActive]}
              activeOpacity={0.85}
              // The role is what makes this real on web: without it the
              // element never enters the accessibility tree, so keyboard
              // activation and assistive tech treat it as decoration.
              accessibilityRole="button"
              accessibilityLabel={`Swap the ${item.name || item.category}`}
              onPress={() => setSwapTargetId(isSwapping ? null : item.id)}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.thumbImage} resizeMode="cover" />
              ) : (
                <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
                  <Text style={styles.thumbPlaceholderText}>{item.category}</Text>
                </View>
              )}
              <View style={[styles.swapBadge, isSwapping && styles.swapBadgeActive]}>
                <Ionicons name="swap-horizontal" size={12} color={isSwapping ? colors.bone : colors.ink} />
              </View>
              <View style={styles.thumbMeta}>
                <Text style={styles.thumbName} numberOfLines={1}>{item.name}</Text>
                {costPerWear && <Text style={styles.thumbPrice}>${costPerWear}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {swapTarget && (
        <View ref={swapTrayRef} style={styles.swapTray}>
          <View style={styles.swapTrayHeader}>
            <Text style={styles.swapTrayLabel}>
              SWAP THE {String(swapTarget.name || swapTarget.category).toUpperCase()}
            </Text>
            <TouchableOpacity onPress={() => setSwapTargetId(null)}>
              <Text style={styles.swapTrayClose}>CLOSE</Text>
            </TouchableOpacity>
          </View>
          {alternates.length === 0 ? (
            <Text style={styles.swapTrayEmpty}>
              Nothing else in {starterMode ? 'the catalogue' : 'your closet'} fills this slot —
              add more {(swapTarget.category || 'pieces').toLowerCase()} and I'll have options.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.swapTrayRow}>
                {alternates.slice(0, 12).map(alt => (
                  <TouchableOpacity
                    key={alt.id}
                    style={styles.swapOption}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Swap in ${alt.name || alt.category}`}
                    onPress={() => applySwap(alt)}
                  >
                    {alt.imageUrl ? (
                      <Image source={{ uri: alt.imageUrl }} style={styles.swapOptionImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.swapOptionImage, styles.thumbPlaceholder]}>
                        <Text style={styles.thumbPlaceholderText}>{alt.category}</Text>
                      </View>
                    )}
                    <Text style={styles.swapOptionName} numberOfLines={1}>{alt.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}
    </View>
  ) : null;

  const noteBlock = look ? (
    <View style={styles.noteCard}>
      <Text style={styles.noteQuote}>{look.reasoning[0] || look.description}</Text>
      {/* Once a piece is swapped the prose describes the original composition,
          so the label owns up to whose look this now is. */}
      <Text style={styles.noteLabel}>{lookEdited ? 'STYLIST NOTE · EDITED BY YOU' : 'STYLIST NOTE'}</Text>
    </View>
  ) : null;

  const gapBlock =
    look && look.missingPieces && look.missingPieces.length > 0 ? (
      <View style={styles.gapCard}>
        <Text style={styles.gapText}>
          This look is missing {look.missingPieces.join(' and ')} — add some to your closet to complete it.
        </Text>
      </View>
    ) : null;

  const actionBlock = look ? (
    <View style={styles.actionRow}>
      {starterMode ? (
        // Saving a look of catalogue products would write shop ids into the
        // user's outfits - these pieces are not owned yet. The primary action
        // is the honest one: go get them.
        <Button
          title="Shop this look"
          variant="primary"
          onPress={() => navigation.navigate('Shop', undefined)}
          style={{ flex: 1 }}
        />
      ) : (
        <Button title="Save this look" variant="primary" onPress={handleSave} style={{ flex: 1 }} />
      )}
    </View>
  ) : null;

  // The trend layer's Home surface. A tap counts as leaning into the trend,
  // which is the signal that widens how adventurous future picks get.
  const leadRemix = trendRemixes[0];
  const trendRemixBlock = leadRemix ? (
    <TrendRemixCard
      remix={leadRemix}
      onOpenReport={() => {
        shopperSignals.recordTrendTap(leadRemix.trend.id).catch(() => {});
        navigation.navigate('TrendInsights');
      }}
    />
  ) : null;

  // Starter mode's richer trend surface: the top three, because before a
  // closet exists the trend report is most of what the app has to say.
  const starterTrendsBlock =
    trendRemixes.length > 0 ? (
      <View style={styles.starterTrends}>
        <Text style={styles.sectionLabel}>WHAT'S MOVING RIGHT NOW</Text>
        {trendRemixes.map((remix, index) => (
          <TouchableOpacity
            key={remix.trend.id}
            style={styles.starterTrendRow}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Open the trend report: ${remix.trend.name}`}
            onPress={() => {
              shopperSignals.recordTrendTap(remix.trend.id).catch(() => {});
              navigation.navigate('TrendInsights');
            }}
          >
            <Text style={styles.starterTrendRank}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.starterTrendText}>
              <Text style={styles.starterTrendMeta}>
                {remix.trend.stage.toUpperCase()} · {remix.trend.region.toUpperCase()}
              </Text>
              <Text style={styles.starterTrendName}>{remix.trend.name}</Text>
              <Text style={styles.starterTrendLine} numberOfLines={2}>
                {remix.gapLine ?? remix.trend.stylingNote}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
          </TouchableOpacity>
        ))}
      </View>
    ) : null;

  // A storefront of their taste: catalogue pieces ranked against the survey
  // profile, in their department, browsable before a single photo exists.
  const starterRailBlock =
    starterItems.length > 0 ? (
      <View style={styles.starterRail}>
        <Text style={styles.sectionLabel}>PIECES THAT MATCH YOUR TASTE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.starterRailContent}>
          {starterItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.starterRailCard}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`View ${item.name}`}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id, surface: 'shop' })}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.starterRailImage} resizeMode="cover" />
              <Text style={styles.starterRailName} numberOfLines={1}>{item.name}</Text>
              {!!item.price && <Text style={styles.starterRailPrice}>${item.price.toFixed(0)}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    ) : null;

  // The one thing a new account should actually do. Everything above it is
  // proof the app already knows them; this is how it gets personal.
  const addClosetBlock = (
    <View style={styles.addClosetCard}>
      <Text style={styles.addClosetEyebrow}>MAKE IT YOURS</Text>
      <Text style={styles.addClosetTitle}>Add your closet, and every look becomes yours</Text>
      <Text style={styles.addClosetLine}>
        Photograph a few pieces — the AI reads colour, cut and fabric, and from then on the looks,
        trends and shopping picks are built from clothes you actually own.
      </Text>
      <Button
        title="Add your first pieces"
        variant="primary"
        fullWidth
        onPress={() => navigation.navigate('AddClosetItem')}
      />
    </View>
  );

  const shopBannerBlock = (
    <TouchableOpacity
      style={styles.shopBanner}
      onPress={() =>
        navigation.navigate(
          'Shop',
          look?.missingPieces?.[0] ? { category: look.missingPieces[0] as any } : undefined
        )
      }
      activeOpacity={0.9}
    >
      <View style={styles.shopBannerCopy}>
        <Text style={styles.shopBannerLabel}>SHOP</Text>
        <Text style={styles.shopBannerTitle}>
          {look?.missingPieces && look.missingPieces.length > 0
            ? `Complete this look — shop ${look.missingPieces.join(' & ')}`
            : 'Shop pieces matched to your style'}
        </Text>
      </View>
      <View style={styles.shopBannerArrow}>
        <Ionicons name="arrow-forward" size={18} color={colors.bone} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* On desktop the site header carries the brand and the shortcuts move
          into the hero row, so this bar would be an empty strip with two
          orphaned icons — drop it entirely. */}
      {!isDesktop && (
        <View style={styles.header}>
          {/* The wordmark component, not a letterspaced string - same lockup as
              the app icon and splash, so the brand is one drawing everywhere.
              Left-aligned like a masthead: every other screen in this system
              sets its title on the left edge, and the old centred version was
              never actually centred anyway (40px spacer against two 40px
              buttons). */}
          <BrandWordmark variant="header" />
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('Shop')}
              accessibilityRole="button"
              accessibilityLabel="Shop"
            >
              <View style={styles.menuIconSlot}>
                <Ionicons name="bag-outline" size={20} color={colors.ink} />
              </View>
              <Text style={styles.menuButtonLabel}>SHOP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.navigate('SocialFeed')}
              accessibilityRole="button"
              accessibilityLabel="Community feed"
            >
              <View style={styles.menuIconSlot}>
                <Text style={styles.socialIcon}>◎</Text>
              </View>
              <Text style={styles.menuButtonLabel}>COMMUNITY</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={Boolean(refreshing)} onRefresh={handleRefresh} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.hero}>
            <View style={styles.heroTopRow}>
              <Text style={styles.dateLabel}>{dateLabel}</Text>
              <View style={styles.heroTopRight}>
                {isDesktop && (
                  <>
                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={() => navigation.navigate('Shop')}
                      accessibilityRole="button"
                      accessibilityLabel="Shop"
                    >
                      <View style={styles.menuIconSlot}>
                        <Ionicons name="bag-outline" size={20} color={colors.ink} />
                      </View>
                      <Text style={styles.menuButtonLabel}>SHOP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.menuButton}
                      onPress={() => navigation.navigate('SocialFeed')}
                      accessibilityRole="button"
                      accessibilityLabel="Community feed"
                    >
                      <View style={styles.menuIconSlot}>
                        <Text style={styles.socialIcon}>◎</Text>
                      </View>
                      <Text style={styles.menuButtonLabel}>COMMUNITY</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={styles.archetypePill}
                  onPress={() => navigation.navigate('StyleProfileBuilder')}
                >
                  <View style={styles.archetypeDot} />
                  <Text style={styles.archetypePillText}>{archetype.toUpperCase()}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.heroTitle}>
              {greeting}, <Text style={styles.heroTitleAccent}>{firstName}</Text>.
            </Text>
            {/* Only a real reading earns a weather line - no invented 72°. */}
            {weather && <Text style={styles.heroSubtitle}>{weatherLine(weather)}</Text>}
          </View>

          {/* One-tap department question for accounts whose profile predates
              it. Until answered, every surface mixes menswear and womenswear
              - which reads as the app not knowing them. */}
          {needsWardrobeFocus && (
            <View style={styles.focusPrompt}>
              <Text style={styles.focusPromptEyebrow}>ONE QUICK QUESTION</Text>
              <Text style={styles.focusPromptTitle}>Whose wardrobe are we dressing?</Text>
              <Text style={styles.focusPromptLine}>
                Answer once and every look, trend and shopping pick stays in your department.
              </Text>
              <View style={styles.focusPromptActions}>
                {(
                  [
                    { key: 'womens', label: 'Womenswear' },
                    { key: 'mens', label: 'Menswear' },
                    { key: 'all', label: 'Both' },
                  ] as Array<{ key: WardrobeFocus; label: string }>
                ).map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.focusOption, savingFocus && { opacity: 0.5 }]}
                    disabled={savingFocus}
                    accessibilityRole="button"
                    accessibilityLabel={`Dress me in ${option.label}`}
                    onPress={() => chooseWardrobeFocus(option.key)}
                  >
                    <Text style={styles.focusOptionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* One-time offer of the survey to accounts that predate it. Only
              renders when no style profile exists, and "Not now" dismisses it
              permanently - a prompt that nags stops being an offer. */}
          {showProfilePrompt && (
            <View style={styles.profilePrompt}>
              <Text style={styles.profilePromptEyebrow}>TWO MINUTES</Text>
              <Text style={styles.profilePromptTitle}>Help your stylist know you</Text>
              <Text style={styles.profilePromptLine}>
                Four questions — your build, your taste, your hard nos — and every recommendation
                sharpens from today.
              </Text>
              <View style={styles.profilePromptActions}>
                <TouchableOpacity
                  style={styles.profilePromptButton}
                  onPress={() => navigation.navigate('ProfileSurvey')}
                >
                  <Text style={styles.profilePromptButtonText}>Take the survey</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profilePromptDismiss} onPress={dismissProfilePrompt}>
                  <Text style={styles.profilePromptDismissText}>Not now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.sectionLabel}>DRESSING FOR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
            {OCCASION_OPTIONS.map(opt => (
              <Chip
                key={opt.value}
                label={opt.label}
                active={occasion === opt.value}
                onPress={() => handleOccasionPress(opt.value)}
                style={styles.chipSpacing}
              />
            ))}
          </ScrollView>

          <View style={styles.dressRow}>
            <Text style={styles.sectionLabel}>DRESS ME TODAY</Text>
            {/* No spinner here any more - switching tabs is synchronous, so
                there is nothing to wait for. */}
            {recommendations.length > 0 ? (
              <View style={styles.lookPager}>
                {recommendations.length > 1 && (
                  <TouchableOpacity
                    style={styles.lookPagerArrow}
                    onPress={() => goToLook(-1)}
                    accessibilityRole="button"
                    accessibilityLabel="Previous look"
                  >
                    <Ionicons name="chevron-back" size={16} color={colors.ink} />
                  </TouchableOpacity>
                )}
                <Text style={styles.lookCounter}>
                  LOOK {String(lookIndex + 1).padStart(2, '0')} OF {String(recommendations.length).padStart(2, '0')}
                </Text>
                {recommendations.length > 1 && (
                  <TouchableOpacity
                    style={styles.lookPagerArrow}
                    onPress={() => goToLook(1)}
                    accessibilityRole="button"
                    accessibilityLabel="Next look"
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.ink} />
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </View>

          {starterMode && look && (
            <View style={styles.starterBanner}>
              <Text style={styles.starterEyebrow}>STARTING YOU OFF</Text>
              <Text style={styles.starterLine}>
                Your closet is empty, so these looks are composed from the shop and matched to your
                style profile. Add your own pieces and I dress you from your wardrobe instead.
              </Text>
            </View>
          )}

          {!look ? (
            // No composed look at all. Even here the screen must not be an
            // empty room: trends, taste-matched pieces and the closet CTA
            // carry it, with the plain empty card only as a last resort.
            <>
              {!starterTrendsBlock && !starterRailBlock && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    I only have a few items to work with — add pieces to your closet and I can do a lot more for you.
                  </Text>
                </View>
              )}
              {starterTrendsBlock}
              {starterRailBlock}
              {addClosetBlock}
              {shopBannerBlock}
            </>
          ) : isDesktop && !starterMode ? (
            // Desktop: the imagery holds the left column at editorial width;
            // the stylist's voice — note, gaps, actions, trend, shop — reads
            // as a rail beside it instead of a scroll below it.
            <View style={styles.lookSplit}>
              <View style={styles.lookSplitImages}>{lookImagesBlock}</View>
              <View style={styles.lookSplitAside}>
                {noteBlock}
                {gapBlock}
                {actionBlock}
                {trendRemixBlock}
                {shopBannerBlock}
              </View>
            </View>
          ) : (
            <>
              {lookImagesBlock}
              {noteBlock}
              {gapBlock}
              {actionBlock}
              {starterMode ? (
                // A new account's Home is a magazine, not an empty closet:
                // the composed starter look above, then what's trending,
                // pieces in their taste, and the one real call to action.
                <>
                  {starterTrendsBlock}
                  {starterRailBlock}
                  {addClosetBlock}
                </>
              ) : (
                trendRemixBlock
              )}
              {shopBannerBlock}
            </>
          )}
        </Animated.View>
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
    backgroundColor: colors.bone,
  },
  // Wide enough for the caption beneath the glyph — the ◎ read as a mystery
  // without one.
  menuButton: {
    minWidth: 52,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Both glyphs sit in the same fixed-height slot so the captions share a
  // baseline — the ◎ is a text glyph with taller line metrics than the
  // 20px bag icon, which used to push its caption a few pixels lower.
  menuIconSlot: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 7,
    letterSpacing: 1,
    color: colors.inkMuted,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerRightRow: {
    flexDirection: 'row',
  },
  socialIcon: {
    fontSize: 20,
    lineHeight: 24,
    color: colors.ink,
  },
  headerTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 2.4,
  },
  content: {
    paddingBottom: 40,
  },
  profilePrompt: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 20,
  },
  profilePromptEyebrow: { ...textType.eyebrow, marginBottom: 10 },
  profilePromptTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 26, color: colors.ink },
  profilePromptLine: {
    ...textType.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
    marginTop: 8,
  },
  profilePromptActions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 16 },
  profilePromptButton: {
    backgroundColor: colors.rust,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  profilePromptButtonText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.white },
  profilePromptDismiss: { paddingVertical: 12 },
  profilePromptDismissText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkMuted },
  focusPrompt: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.camel,
  },
  focusPromptEyebrow: { ...textType.eyebrow, fontSize: 9, color: colors.camel, marginBottom: 8 },
  focusPromptTitle: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 26, color: colors.ink },
  focusPromptLine: {
    ...textType.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
    marginTop: 6,
    marginBottom: 14,
  },
  focusPromptActions: { flexDirection: 'row', gap: 10 },
  focusOption: {
    flex: 1,
    backgroundColor: colors.rust,
    borderRadius: radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  focusOptionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.white },
  starterBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: radius.md,
    padding: 14,
  },
  starterEyebrow: { ...textType.eyebrow, fontSize: 9, marginBottom: 6 },
  starterLine: { ...textType.body, fontSize: 12, lineHeight: 18, color: colors.inkMuted },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Desktop: imagery left, the stylist's rail right. The images column takes
  // the larger share - it is the product - and the rail holds everything the
  // stylist has to say about it at a fixed reading width.
  lookSplit: {
    flexDirection: 'row',
    gap: 28,
    alignItems: 'flex-start',
  },
  lookSplitImages: {
    flex: 1.35,
  },
  lookSplitAside: {
    flex: 1,
    gap: 0,
  },
  dateLabel: {
    ...textType.eyebrow,
  },
  archetypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  archetypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.camel,
    marginRight: 6,
  },
  archetypePillText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.ink,
  },
  heroTitle: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.ink,
    marginBottom: 8,
  },
  heroTitleAccent: {
    fontFamily: fonts.serifItalic,
    color: colors.camel,
  },
  heroSubtitle: {
    ...textType.body,
    color: colors.inkMuted,
  },
  sectionLabel: {
    ...textType.eyebrow,
    paddingHorizontal: 20,
  },
  chipRow: {
    marginTop: 12,
  },
  chipRowContent: {
    paddingHorizontal: 20,
  },
  chipSpacing: {
    marginRight: 8,
  },
  dressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 20,
  },
  lookCounter: {
    ...textType.eyebrow,
  },
  lookPager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  // 28pt squares around 16pt chevrons: enough finger, no visual weight.
  lookPagerArrow: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Selection needs to read at a glance: a full-strength ink frame against
  // everything else's hairlines, not an opacity nudge nobody notices.
  thumbCardActive: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  swapBadgeActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  // The swap affordance on every piece - a quiet chip, not a button, because
  // the whole thumb is the tap target.
  swapBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.bone,
    borderWidth: 1,
    borderColor: colors.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapTray: {
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    marginTop: 12,
    paddingTop: 12,
  },
  swapTrayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  swapTrayLabel: {
    ...textType.eyebrow,
  },
  swapTrayClose: {
    ...textType.eyebrow,
    color: colors.camel,
  },
  swapTrayEmpty: {
    ...textType.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  swapTrayRow: {
    flexDirection: 'row',
    gap: 10,
  },
  swapOption: {
    width: 96,
  },
  swapOptionImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.paper,
  },
  swapOptionName: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.ink,
    marginTop: 5,
  },
  lookCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: radius.md,
    // Clips the full-bleed hero image to the card's rounded corners.
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  heroImage: {
    width: '100%',
    height: 320,
    backgroundColor: colors.paper,
  },
  thumbRow: {
    flexDirection: 'row',
    padding: 12,
  },
  thumbCard: {
    flex: 1,
    marginRight: 8,
  },
  thumbImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.paper,
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbPlaceholderText: {
    fontFamily: fonts.serifItalic,
    fontSize: 12,
    color: colors.tobacco,
    textTransform: 'capitalize',
  },
  thumbMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  thumbName: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.ink,
    flex: 1,
  },
  thumbPrice: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.tobacco,
  },
  noteCard: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: colors.camel,
  },
  noteQuote: {
    ...textType.pullQuote,
    color: colors.ink,
  },
  noteLabel: {
    ...textType.eyebrow,
    marginTop: 8,
  },
  gapCard: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.sand,
  },
  gapText: {
    ...textType.meta,
    color: colors.tobacco,
  },
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
  },
  emptyCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: radius.md,
    backgroundColor: colors.card,
  },
  emptyText: {
    ...textType.body,
    color: colors.inkMuted,
  },

  // ---- Starter-mode sections: the empty-closet Home as a magazine ----
  starterTrends: { marginTop: 28 },
  starterTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  starterTrendRank: { fontFamily: fonts.serifItalic, fontSize: 16, color: colors.camel, width: 30 },
  starterTrendText: { flex: 1, paddingRight: 10 },
  starterTrendMeta: { ...textType.eyebrow, fontSize: 9, color: colors.camel },
  starterTrendName: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink, marginTop: 3 },
  starterTrendLine: { ...textType.body, fontSize: 12, lineHeight: 17, color: colors.inkMuted, marginTop: 3 },

  starterRail: { marginTop: 28 },
  starterRailContent: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  starterRailCard: { width: 128 },
  starterRailImage: { width: 128, height: 160, borderRadius: radius.sm, backgroundColor: colors.paper },
  starterRailName: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.ink,
    marginTop: 6,
  },
  starterRailPrice: { fontFamily: fonts.sansSemiBold, fontSize: 11, color: colors.tobacco, marginTop: 1 },

  addClosetCard: {
    marginHorizontal: 20,
    marginTop: 28,
    padding: 20,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.camel,
  },
  addClosetEyebrow: { ...textType.eyebrow, fontSize: 9, color: colors.camel, marginBottom: 8 },
  addClosetTitle: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 26, color: colors.ink },
  addClosetLine: {
    ...textType.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
    marginTop: 8,
    marginBottom: 16,
  },
  shopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 28,
    padding: 18,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  shopBannerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  shopBannerLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.camel,
    marginBottom: 4,
  },
  shopBannerTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 17,
    color: colors.bone,
  },
  shopBannerArrow: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.bone,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

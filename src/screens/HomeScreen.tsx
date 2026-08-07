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
import { outfitsService } from '../services/firestore';
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
import Toast from '../components/Toast';
import Chip from '../components/Chip';
import Button from '../components/Button';
import BrandWordmark from '../components/BrandWordmark';
import { fadeIn } from '../utils/animations';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts, type as textType } from '../theme/designSystem';
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
  const [weather, setWeather] = useState<CurrentWeather>({ condition: 'sunny', temperature: 72 });
  const [archetype, setArchetype] = useState<string>('Quiet Luxe');
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [lookIndex, setLookIndex] = useState(0);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [starterMode, setStarterMode] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // Every tab's outfits are built once per slot and held here, so switching
  // chips is a synchronous state update. Previously the first visit to each tab
  // made its own Cloud Function call and waited on the model.
  const closetItemsRef = useRef<Item[]>([]);
  const styleProfileRef = useRef<StyleProfile | null>(null);
  const weatherRef = useRef<CurrentWeather>({ condition: 'sunny', temperature: 72 });
  const poolsRef = useRef<OutfitPools | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const dismissProfilePrompt = () => {
    setShowProfilePrompt(false);
    AsyncStorage.setItem(PROFILE_PROMPT_DISMISSED_KEY, '1').catch(() => {});
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
        .then(dismissed => setShowProfilePrompt(!dismissed && !matchContext))
        .catch(() => setShowProfilePrompt(false));

      // A veto is a veto for owned clothes too. "I don't wear dresses" means
      // the daily looks should not build outfits around the one dress still
      // hanging in the closet.
      const avoidRules = matchContext?.avoidRules ?? [];
      const wearable =
        avoidRules.length === 0
          ? items
          : items.filter(item => {
              const haystack = [item.name, item.subcategory, item.category, ...(item.tags || [])]
                .join(' ')
                .toLowerCase();
              return !avoidRules.some(rule => haystack.includes(rule.toLowerCase()));
            });
      closetItemsRef.current = wearable;

      const styleProfile = await aiStyleService.analyzeStyle(items);
      styleProfileRef.current = styleProfile;
      setArchetype(getStyleVoice(styleProfile).archetype);

      const weatherContext = {
        condition: weatherResult.condition,
        temperature: weatherResult.temperature,
      };

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
        showOccasion(occasionValue, []);
        setLookIndex(0);
        if (!refreshing) fadeIn(fadeAnim, 300).start();
        return;
      }
      setStarterMode(false);

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
  };

  const handleSwap = () => {
    if (recommendations.length === 0) return;
    setLookIndex((lookIndex + 1) % recommendations.length);
  };

  const handleSave = async () => {
    const look = recommendations[lookIndex];
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
  const look = recommendations[lookIndex];

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
          return (
            <View key={item.id} style={styles.thumbCard}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.thumbImage} resizeMode="cover" />
              ) : (
                <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
                  <Text style={styles.thumbPlaceholderText}>{item.category}</Text>
                </View>
              )}
              <View style={styles.thumbMeta}>
                <Text style={styles.thumbName} numberOfLines={1}>{item.name}</Text>
                {costPerWear && <Text style={styles.thumbPrice}>${costPerWear}</Text>}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  ) : null;

  const noteBlock = look ? (
    <View style={styles.noteCard}>
      <Text style={styles.noteQuote}>{look.reasoning[0] || look.description}</Text>
      <Text style={styles.noteLabel}>STYLIST NOTE</Text>
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
      <Button title="Swap a piece" variant="outline" onPress={handleSwap} style={{ flex: 1, marginLeft: 10 }} />
    </View>
  ) : null;

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
            <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('Shop')}>
              <Ionicons name="bag-outline" size={20} color={colors.ink} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('SocialFeed')}>
              <Text style={styles.socialIcon}>◎</Text>
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
                    <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('Shop')}>
                      <Ionicons name="bag-outline" size={20} color={colors.ink} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('SocialFeed')}>
                      <Text style={styles.socialIcon}>◎</Text>
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
            <Text style={styles.heroSubtitle}>{weatherLine(weather)}</Text>
          </View>

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
              <Text style={styles.lookCounter}>
                LOOK {String(lookIndex + 1).padStart(2, '0')} OF {String(recommendations.length).padStart(2, '0')}
              </Text>
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
            <>
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  I only have a few items to work with — add pieces to your closet and I can do a lot more for you.
                </Text>
                <Button
                  title="Add closet items"
                  variant="primary"
                  onPress={() => navigation.navigate('Closet' as any)}
                  style={{ marginTop: 16 }}
                />
              </View>
              {shopBannerBlock}
            </>
          ) : isDesktop ? (
            // Desktop: the imagery holds the left column at editorial width;
            // the stylist's voice — note, gaps, actions, shop — reads as a
            // rail beside it instead of a scroll below it.
            <View style={styles.lookSplit}>
              <View style={styles.lookSplitImages}>{lookImagesBlock}</View>
              <View style={styles.lookSplitAside}>
                {noteBlock}
                {gapBlock}
                {actionBlock}
                {shopBannerBlock}
              </View>
            </View>
          ) : (
            <>
              {lookImagesBlock}
              {noteBlock}
              {gapBlock}
              {actionBlock}
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
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  headerRightRow: {
    flexDirection: 'row',
  },
  socialIcon: {
    fontSize: 22,
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
    backgroundColor: colors.ink,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  profilePromptButtonText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.white },
  profilePromptDismiss: { paddingVertical: 12 },
  profilePromptDismissText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkMuted },
  starterBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.hair,
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
  lookCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.hair,
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
    backgroundColor: colors.card,
  },
  emptyText: {
    ...textType.body,
    color: colors.inkMuted,
  },
  shopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 28,
    padding: 18,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.bone,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

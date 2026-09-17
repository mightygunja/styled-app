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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { dailyOutfitService, DailyOutfit, OccasionKey } from '../services/dailyOutfitService';
import { getCurrentWeather, CurrentWeather } from '../services/weatherService';
import { closetAPI, getCurrentUserId } from '../services/api';
import { outfitsService } from '../services/firestore';
import { buildProfileMatchContext } from '../services/profileMatchContext';
import { getPublishedTrends } from '../services/trendService';
import { FashionTrend, itemMatchesTrend } from '../models/fashionTrend';
import { Item } from '../types';
import Toast from '../components/Toast';
import Button from '../components/Button';
import BackButton from '../components/BackButton';
import Chip from '../components/Chip';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius, type as textType } from '../theme/designSystem';

// Ionicons in place of the ☀ ☁ ☂ ❄ characters, which iOS draws as colour emoji.
const WEATHER_ICON: Record<CurrentWeather['condition'], keyof typeof Ionicons.glyphMap> = {
  sunny: 'sunny-outline',
  cloudy: 'cloud-outline',
  rainy: 'rainy-outline',
  snowy: 'snow-outline',
  cold: 'snow-outline',
  hot: 'sunny-outline',
};

// Tiles are three across as a share of the card, not of the raw window: the
// old `(window width - 60) / 3` measured once at module load gave 460px tiles
// on a desktop browser, where the screen is framed far narrower than the window.
const ITEM_MAX_SIZE = 160;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SmartRecommendationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [outfits, setOutfits] = useState<DailyOutfit[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionKey>('casual');
  const [loading, setLoading] = useState(true);
  // A failed closet read is not "no recommendations".
  const [loadError, setLoadError] = useState(false);
  // Null when no real reading exists - outfits then rank on occasion and
  // closet alone rather than being dressed for invented conditions.
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [weatherLoaded, setWeatherLoaded] = useState(false);
  // Which card's save is in flight - a double tap used to write two docs.
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const occasions: OccasionKey[] = ['casual', 'work', 'formal', 'date', 'workout', 'party'];

  useEffect(() => {
    getCurrentWeather().then(real => {
      setWeather(real);
      setWeatherLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (weatherLoaded) {
      loadRecommendations();
    }
  }, [selectedOccasion, weatherLoaded]);

  /**
   * Same engine as Home's Dress Me Today. The old recommendationEngine fed
   * this screen four "variants" that all called one deterministic picker with
   * identical arguments - the same garments under different headlines.
   * dailyOutfitService scores pairs jointly and diversifies the set, so the
   * two surfaces now give one consistent answer.
   */
  const loadRecommendations = async () => {
    try {
      setLoading(true);

      // Closet items, plus the survey's avoid rules so this screen and Home
      // compose from the same wearable pool.
      const [response, matchContext] = await Promise.all([
        closetAPI.getItems(getCurrentUserId()),
        buildProfileMatchContext(getCurrentUserId()).catch(() => undefined),
      ]);
      const items: Item[] = response.data.map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category as any,
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
        // Formality is read off real garment attributes, not keyword regexes.
        subcategory: item.subcategory,
        pattern: item.pattern,
        fabricTexture: item.fabricTexture,
        fitType: item.fitType,
      }));

      // Same rule as Home: avoid rules are a strong preference, not a veto -
      // an avoided piece stays in only when it anchors a live trend.
      const avoidRules = matchContext?.avoidRules ?? [];
      let activeTrends: FashionTrend[] = [];
      if (avoidRules.length > 0) {
        try {
          activeTrends = await getPublishedTrends();
        } catch {}
      }
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

      const pool = dailyOutfitService.buildOutfits(wearable, {
        occasion: selectedOccasion,
        weather: weather
          ? { condition: weather.condition, temperature: weather.temperature }
          : undefined,
        count: 4,
      });
      setOutfits(dailyOutfitService.composeOutfits(pool, selectedOccasion));
      setLoadError(false);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setOutfits([]);
      setLoadError(true);
      showToast('Failed to load recommendations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRecommendation = async (rec: DailyOutfit) => {
    if (savingId) return;
    setSavingId(rec.id);
    try {
      await outfitsService.create(
        getCurrentUserId(),
        rec.items.map(item => item.id),
        selectedOccasion,
        rec.title
      );
      showToast('Outfit saved!', 'success');
    } catch (error) {
      console.error('Error saving outfit:', error);
      showToast('Failed to save outfit', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const renderRecommendation = (rec: DailyOutfit) => (
    <View key={rec.id} style={styles.recCard}>
      {/* Header */}
      <View style={styles.recHeader}>
        <View>
          <Text style={styles.recTitle}>{rec.title}</Text>
          <Text style={styles.recDescription}>{rec.note}</Text>
        </View>
      </View>

      {/* Items Grid */}
      <View style={styles.itemsGrid}>
        {rec.items.map((item, index) => (
          <View key={index} style={styles.itemContainer}>
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
            <Text style={styles.itemCategory} numberOfLines={1}>
              {item.category}
            </Text>
          </View>
        ))}
      </View>

      {/* Reasoning - the engine's countable pairing reasons, nothing invented */}
      {rec.reasons.length > 0 && (
        <View style={styles.reasoningSection}>
          <Text style={styles.reasoningTitle}>Why this works:</Text>
          {rec.reasons.map((reason, index) => (
            <View key={index} style={styles.reasonItem}>
              <Text style={styles.reasonBullet}>•</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Save outfit"
          variant="primary"
          onPress={() => handleAcceptRecommendation(rec)}
          loading={savingId === rec.id}
          style={{ flex: 1 }}
        />
        {/* The builder opens empty - "Build your own" says so, where
            "Modify" promised to carry this outfit over and didn't. */}
        <TouchableOpacity
          style={styles.modifyButton}
          onPress={() =>navigation.navigate('SmartOutfitBuilder')}
        >
          <Text style={styles.modifyButtonText}>Build your own</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Loading no longer replaces the whole screen: the header (with Back), the
  // weather card and the occasion chips stay mounted and only the list area
  // shows the spinner, so there is always a way out and the chips don't jump.
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton style={styles.headerBack} />
        {/* Named as the More menu names it. */}
        <Text style={styles.headerTitle}>Outfit ideas</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadRecommendations}
          accessibilityRole="button"
          accessibilityLabel="Refresh outfit ideas"
        >
          <Ionicons name="refresh-outline" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Weather Info - a real reading or an honest absence, never 72°-and-sunny invented */}
      {weather ? (
        <View style={styles.weatherCard}>
          <Ionicons name={WEATHER_ICON[weather.condition]} size={36} color={colors.tobacco} />
          <View>
            <Text style={styles.weatherTemp}>{weather.temperature}°F</Text>
            <Text style={styles.weatherCondition}>
              {weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.weatherCard}>
          <Text style={styles.weatherCondition}>
            Weather is unavailable right now — outfits are ranked on occasion and your closet alone.
          </Text>
        </View>
      )}

      {/* Occasion Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.occasionScroll}
        contentContainerStyle={styles.occasionContainer}
      >
        {/* Text-only chips: the geometric glyphs that replaced the emoji
            carried no meaning. */}
        {occasions.map((occasion) => (
          <Chip
            key={occasion}
            label={occasion}
            active={selectedOccasion === occasion}
            onPress={() => setSelectedOccasion(occasion)}
          />
        ))}
      </ScrollView>

      {/* Recommendations */}
      <ScrollView>
        {loading ? (
          <View style={styles.listLoading}>
            <ActivityIndicator size="large" color={colors.ink} />
            <Text style={styles.loadingText}>Generating recommendations...</Text>
          </View>
        ) : loadError ? (
          <TouchableOpacity
            style={styles.emptyState}
            accessibilityRole="button"
            onPress={loadRecommendations}
          >
            <Text style={styles.emptyText}>Couldn't load recommendations</Text>
            <Text style={styles.emptySubtext}>Tap to retry.</Text>
          </TouchableOpacity>
        ) : outfits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recommendations available</Text>
            <Text style={styles.emptySubtext}>Add more items to your closet for better recommendations
            </Text>
            <Button
              title="Add pieces"
              variant="primary"
              onPress={() => navigation.navigate('AddClosetItem')}
              style={{ marginTop: 20 }}
            />
          </View>
        ) : (
          <>
            <View style={styles.recCount}>
              <Text style={styles.recCountText}>
                {outfits.length} outfit{outfits.length !== 1 ? 's' : ''} for you
              </Text>
            </View>
            {outfits.map(renderRecommendation)}
          </>
        )}
        <View style={{ height: 40 }} />
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
    backgroundColor: colors.bone,
  },
  loadingText: {
    ...textType.body,
    marginTop: 16,
    color: colors.inkMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  headerBack: {
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.serif,
    color: colors.ink,
  },
  refreshButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherCard: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    margin: 20,
    padding: 16,
    gap: 12,
  },
  weatherTemp: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  weatherCondition: {
    flexShrink: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
  },
  occasionScroll: {
    maxHeight: 60,
  },
  occasionContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  recCount: {
    padding: 20,
    paddingBottom: 12,
  },
  recCountText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  recCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.hair,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recTitle: {
    fontSize: 20,
    fontFamily: fonts.serif,
    color: colors.ink,
    marginBottom: 4,
  },
  recDescription: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  itemContainer: {
    width: '30%',
    maxWidth: ITEM_MAX_SIZE,
  },
  itemImage: {
    borderRadius: radius.sm,
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.paper,
    marginBottom: 4,
  },
  itemCategory: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  reasoningSection: {
    marginBottom: 16,
  },
  reasoningTitle: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 8,
  },
  reasonBullet: {
    fontSize: 14,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  reasonText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  modifyButton: {
    borderRadius: radius.full,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.hair,
    alignItems: 'center',
  },
  modifyButtonText: {
    color: colors.inkMuted,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 22,
    fontFamily: fonts.serif,
    color: colors.ink,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  listLoading: {
    paddingVertical: 60,
    alignItems: 'center',
  },
});

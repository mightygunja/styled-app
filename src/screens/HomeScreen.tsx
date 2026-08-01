import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  SafeAreaView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Item } from '../types';
import { closetAPI, getCurrentUserId } from '../services/api';
import { outfitsService } from '../services/firestore';
import { aiStyleService, StyleProfile } from '../services/aiStyleService';
import { getStyleVoice } from '../services/styleVoice';
import { recommendationEngine, OutfitRecommendation, OccasionType } from '../services/recommendationEngine';
import { getCurrentWeather, CurrentWeather } from '../services/weatherService';
import Toast from '../components/Toast';
import Chip from '../components/Chip';
import Button from '../components/Button';
import { fadeIn } from '../utils/animations';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts, type as textType } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [occasion, setOccasion] = useState<OccasionType>('work');
  const [weather, setWeather] = useState<CurrentWeather>({ condition: 'sunny', temperature: 72 });
  const [archetype, setArchetype] = useState<string>('Quiet Luxe');
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [lookIndex, setLookIndex] = useState(0);
  const [switchingOccasion, setSwitchingOccasion] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // Cached across occasion switches so re-picking a chip doesn't refetch weather/closet
  // or re-run style analysis - only recommendation generation (a pure local computation).
  const closetItemsRef = useRef<Item[]>([]);
  const styleProfileRef = useRef<StyleProfile | null>(null);
  const weatherRef = useRef<CurrentWeather>({ condition: 'sunny', temperature: 72 });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadDressMeToday = async (occasionValue: OccasionType) => {
    try {
      const [weatherResult, itemsResponse] = await Promise.all([
        getCurrentWeather(),
        closetAPI.getItems(getCurrentUserId()),
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
      }));
      closetItemsRef.current = items;

      const styleProfile = await aiStyleService.analyzeStyle(items);
      styleProfileRef.current = styleProfile;
      setArchetype(getStyleVoice(styleProfile).archetype);

      const recs = await recommendationEngine.generateRecommendations(items, styleProfile, {
        occasion: occasionValue,
        weather: weatherResult,
      });
      setRecommendations(recs);
      setLookIndex(0);

      if (!refreshing) fadeIn(fadeAnim, 300).start();
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

  const handleOccasionPress = async (value: OccasionType) => {
    setOccasion(value);
    if (!styleProfileRef.current) {
      // Cache not warm yet (e.g. tapped mid-initial-load) - fall back to a full load.
      setLoading(true);
      loadDressMeToday(value);
      return;
    }
    setSwitchingOccasion(true);
    try {
      const recs = await recommendationEngine.generateRecommendations(
        closetItemsRef.current,
        styleProfileRef.current,
        { occasion: value, weather: weatherRef.current }
      );
      setRecommendations(recs);
      setLookIndex(0);
    } catch (error) {
      console.error('Error switching occasion:', error);
    } finally {
      setSwitchingOccasion(false);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>STYLED</Text>
        <View style={styles.headerRightRow}>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('Shop')}>
            <Ionicons name="bag-outline" size={20} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('SocialFeed')}>
            <Text style={styles.socialIcon}>◎</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={Boolean(refreshing)} onRefresh={handleRefresh} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.hero}>
            <View style={styles.heroTopRow}>
              <Text style={styles.dateLabel}>{dateLabel}</Text>
              <TouchableOpacity
                style={styles.archetypePill}
                onPress={() => navigation.navigate('StyleProfileBuilder')}
              >
                <View style={styles.archetypeDot} />
                <Text style={styles.archetypePillText}>{archetype.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.heroTitle}>
              Morning, <Text style={styles.heroTitleAccent}>{firstName}</Text>.
            </Text>
            <Text style={styles.heroSubtitle}>{weatherLine(weather)}</Text>
          </View>

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
            {switchingOccasion ? (
              <ActivityIndicator size="small" color={colors.tobacco} />
            ) : recommendations.length > 0 ? (
              <Text style={styles.lookCounter}>
                LOOK {String(lookIndex + 1).padStart(2, '0')} OF {String(recommendations.length).padStart(2, '0')}
              </Text>
            ) : null}
          </View>

          {!look ? (
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
          ) : (
            <>
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

              <View style={styles.noteCard}>
                <Text style={styles.noteQuote}>
                  {look.reasoning[0] || look.description}
                </Text>
                <Text style={styles.noteLabel}>STYLIST NOTE</Text>
              </View>

              {look.missingPieces && look.missingPieces.length > 0 && (
                <View style={styles.gapCard}>
                  <Text style={styles.gapText}>
                    This look is missing {look.missingPieces.join(' and ')} — add some to your closet to complete it.
                  </Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <Button title="Save this look" variant="primary" onPress={handleSave} style={{ flex: 1 }} />
                <Button title="Swap a piece" variant="outline" onPress={handleSwap} style={{ flex: 1, marginLeft: 10 }} />
              </View>
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
});

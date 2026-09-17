import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  FlatList,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { lookAPI, getCurrentUserId } from '../services/api';
import LookCard from '../components/LookCard';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { Look } from '../types';
import { fadeIn } from '../utils/animations';
import { colors, fonts, radius, type as textType } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Every occasion a look can carry (types/index.ts Occasion). lookAPI.getAll
// silently defaults to 'home' when none is given, so the lookbook used to be
// 'home' looks only.
const LOOK_OCCASIONS = ['home', 'work', 'going-out'] as const;
const OCCASION_LABELS: Record<string, string> = {
  home: 'At Home',
  work: 'Work',
  'going-out': 'Going Out',
};

interface RecommendationCategory {
  title: string;
  subtitle: string;
  looks: Look[];
  reason: string;
}

export default function RecommendationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationCategory[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  // A failed lookbook fetch is not an empty lookbook.
  const [loadError, setLoadError] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRecommendations();
  }, []);

  /**
   * Every section here only claims what its filter actually does. The old
   * version dressed arbitrary array slices up as "Most favorited this week"
   * and "Items similar to what you own" - engagement and similarity data
   * that did not exist anywhere.
   */
  const loadRecommendations = async () => {
    try {
      setLoading(true);

      // The user's favorites - used for the heart state and to pick which
      // occasion section to lead with.
      let userFavorites: any[] = [];
      try {
        const favoritesResponse = await lookAPI.getFavorites(getCurrentUserId());
        userFavorites = favoritesResponse.data || [];
        setFavorites(new Set(userFavorites.map((f: any) =>f.id || f.lookId)));
      } catch (error) {
        console.log('Could not load favorites, using empty array');
      }

      const preferredOccasions = analyzeOccasions(userFavorites);
      const currentSeason = getCurrentSeason();

      // One fetch of the whole lookbook (all occasions), shared by the
      // sections below.
      const { looks: allLooks, failed } = await getAllLooks();
      setLoadError(failed);

      // Build recommendation categories
      const recs: RecommendationCategory[] = [];

      const usedLookIds = new Set<string>();

      // 1. Occasion-based - only when favorites exist, so "the occasion you
      // favorite most" is a real observation, not a default.
      if (userFavorites.length >0 && preferredOccasions.length >0) {
        const occasionLooks = allLooks
          .filter(look => look.occasion === preferredOccasions[0])
          .slice(0, 5);
        const uniqueLooks = occasionLooks.filter(look => {
          if (usedLookIds.has(look.id)) return false;
          usedLookIds.add(look.id);
          return true;
        });
        if (uniqueLooks.length >0) {
          recs.push({
            title: `${OCCASION_LABELS[preferredOccasions[0]] || preferredOccasions[0]} Looks`,
            subtitle: 'For your lifestyle',
            looks: uniqueLooks,
            reason: `You favorite ${(OCCASION_LABELS[preferredOccasions[0]] || preferredOccasions[0]).toLowerCase()} looks most`,
          });
        }
      }

      // 2. Seasonal - only looks actually tagged for the current season.
      const seasonalLooks = getSeasonalLooks(allLooks, currentSeason);
      const uniqueSeasonalLooks = seasonalLooks.filter(look => {
        if (usedLookIds.has(look.id)) return false;
        usedLookIds.add(look.id);
        return true;
      });
      if (uniqueSeasonalLooks.length >0) {
        recs.push({
          title: `${currentSeason} Looks`,
          subtitle: 'In season now',
          looks: uniqueSeasonalLooks,
          reason: `Tagged for ${currentSeason.toLowerCase()}`,
        });
      }

      // 3. The lookbook itself, by occasion - no personalization claim attached.
      LOOK_OCCASIONS.forEach(occasion => {
        const occasionLooks = allLooks.filter(look => {
          if (look.occasion !== occasion || usedLookIds.has(look.id)) return false;
          usedLookIds.add(look.id);
          return true;
        });
        if (occasionLooks.length >0) {
          recs.push({
            title: OCCASION_LABELS[occasion],
            subtitle: 'From the lookbook',
            looks: occasionLooks.slice(0, 6),
            reason: 'Browse the collection',
          });
        }
      });

      setRecommendations(recs);
      
      // Animate in after loading
      if (!refreshing) {
        fadeIn(fadeAnim, 300).start();
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const analyzeOccasions = (favorites: any[]) => {
    const occasions: Record<string, number> = {};
    favorites.forEach(fav => {
      // No occasion on the favorite = nothing to count. It used to be counted
      // as 'casual', an occasion no look carries.
      const occasion = fav.occasion;
      if (!occasion) return;
      occasions[occasion] = (occasions[occasion] || 0) + 1;
    });
    return Object.entries(occasions)
      .sort(([, a], [, b]) =>b - a)
      .map(([occasion]) =>occasion);
  };

  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  };

  // Strictly looks tagged for the season - an untagged look is not "in
  // season", it is unknown. Seasons are stored lowercase, usually as an array
  // (['fall','winter']); this used to compare that to the string 'Fall' and
  // so never matched anything.
  const getSeasonalLooks = (allLooks: Look[], season: string) => {
    const wanted = season.toLowerCase();
    return allLooks
      .filter((look: Look) => {
        const tagged = Array.isArray(look.season) ? look.season : look.season ? [look.season] : [];
        return tagged.some(s => String(s).toLowerCase() === wanted);
      })
      .slice(0, 6);
  };

  /** Every look in the lookbook, across all occasions. `failed` only when every query failed. */
  const getAllLooks = async (): Promise<{ looks: Look[]; failed: boolean }> => {
    const results = await Promise.allSettled(
      LOOK_OCCASIONS.map(occasion => lookAPI.getAll({ occasion, limit: 50 }))
    );
    const seen = new Set<string>();
    const looks: Look[] = [];
    results.forEach(result => {
      if (result.status !== 'fulfilled') {
        console.error('Error loading lookbook looks:', result.reason);
        return;
      }
      (result.value.data || []).forEach((look: Look) => {
        if (seen.has(look.id)) return;
        seen.add(look.id);
        looks.push(look);
      });
    });
    return { looks, failed: results.every(result => result.status === 'rejected') };
  };

  const handleFavorite = async (lookId: string) => {
    try {
      // (lookId, userId) - these were passed the wrong way round, so the
      // write was rejected and the heart silently did nothing.
      await lookAPI.toggleFavorite(lookId, getCurrentUserId());
      setFavorites(prev => {
        const newSet = new Set(prev);
        if (newSet.has(lookId)) {
          newSet.delete(lookId);
        } else {
          newSet.add(lookId);
        }
        return newSet;
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Something went wrong', "Couldn't update your favorites. Please try again.");
    }
  };

  const handleLookPress = (lookId: string) => {
    console.log('Look pressed:', lookId);
    try {
      navigation.navigate('LookDetail', { lookId });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRecommendations();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading the lookbook...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton style={styles.headerBack} />
        {/* Named as the menu names it; the screen makes no "for you" claim. */}
        <Text style={styles.title}>Looks to browse</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>The lookbook</Text>
          <Text style={styles.introText}>From the lookbook, grouped by season and the occasions you favorite
          </Text>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
        {recommendations.map((category, index) => (
          <View key={index} style={styles.category}>
            <View style={styles.categoryHeader}>
              <View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
              </View>
              {/* No "See All" until a full category list exists to see. */}
            </View>

            <View style={styles.reasonBadge}>
              <Text style={styles.reasonText}> {category.reason}</Text>
            </View>

            <View style={styles.looksContainer}>
              {category.looks.map((look, lookIndex) => (
                <LookCard
                  key={`${index}-${look.id}-${lookIndex}`}
                  look={look}
                  onPress={() => {
                    console.log('Card tapped:', look.id);
                    handleLookPress(look.id);
                  }}
                  onFavorite={() =>handleFavorite(look.id)}
                  isFavorited={favorites.has(look.id)}
                />
              ))}
            </View>
          </View>
        ))}

        {recommendations.length === 0 && loadError && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Couldn't load looks</Text>
            <Text style={styles.emptyStateText}>Check your connection and try again.</Text>
            <Button title="Tap to retry" variant="primary" onPress={loadRecommendations} />
          </View>
        )}

        {recommendations.length === 0 && !loadError && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Nothing to show yet</Text>
            <Text style={styles.emptyStateText}>The lookbook has no looks right now. Check back soon.
            </Text>
          </View>
        )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...textType.body,
    marginTop: 12,
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
  title: {
    fontSize: 18,
    fontFamily: fonts.serif,
    color: colors.ink,
  },
  // Inset from the edges: a rounded block run full-bleed reads as clipped.
  intro: {
    borderRadius: radius.md,
    padding: 20,
    backgroundColor: colors.paper,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  introTitle: {
    fontSize: 22,
    fontFamily: fonts.serif,
    color: colors.ink,
    marginBottom: 8,
  },
  introText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  category: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 20,
    fontFamily: fonts.serif,
    color: colors.ink,
  },
  categorySubtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  seeAllButton: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  reasonBadge: {
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: 12,
  },
  reasonText: {
    fontSize: 12,
    fontFamily: fonts.sansMedium,
    color: colors.tobacco,
  },
  looksScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  looksContainer: {
    padding: 20,
    gap: 16,
  },
  lookCardWrapper: {
    width: 160,
    marginRight: 12,
  },
  lookImage: {
    borderRadius: radius.sm,
    width: 200,
    height: 250,
  },
  lookInfo: {
    padding: 12,
  },
  lookTitle: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 4,
  },
  lookOccasion: {
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'capitalize',
  },
  favoriteButtonRec: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 22,
    fontFamily: fonts.serif,
    color: colors.ink,
    marginBottom: 12,
  },
  emptyStateText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
});

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
  Alert,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { lookAPI, closetAPI, getCurrentUserId } from '../services/api';
import LookCard from '../components/LookCard';
import { Look } from '../types';
import { fadeIn } from '../utils/animations';
import { colors, fonts } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);

      // Get user's favorite looks to understand preferences
      let userFavorites: any[] = [];
      try {
        const favoritesResponse = await lookAPI.getFavorites(getCurrentUserId());
        userFavorites = favoritesResponse.data || [];
        setFavorites(new Set(userFavorites.map((f: any) =>f.id || f.lookId)));
      } catch (error) {
        console.log('Could not load favorites, using empty array');
      }

      // Get user's closet to understand what they own
      let closetItems: any[] = [];
      try {
        const closetResponse = await closetAPI.getItems(getCurrentUserId());
        closetItems = closetResponse.data || [];
      } catch (error) {
        console.log('Could not load closet, using empty array');
      }

      // Analyze user preferences
      const preferredOccasions = analyzeOccasions(userFavorites);
      const preferredCategories = analyzeCategories(closetItems);
      const currentSeason = getCurrentSeason();

      // Build recommendation categories
      const recs: RecommendationCategory[] = [];

      const usedLookIds = new Set<string>();
      
      // 1. Based on favorites
      if (userFavorites.length >0) {
        const similarLooks = await getSimilarLooks(userFavorites[0].lookId);
        const uniqueLooks = similarLooks.filter(look => {
          if (usedLookIds.has(look.id)) return false;
          usedLookIds.add(look.id);
          return true;
        });
        if (uniqueLooks.length >0) {
          recs.push({
            title: 'More Like Your Favorites',
            subtitle: 'Based on looks you loved',
            looks: uniqueLooks,
            reason: 'Similar to your favorited looks',
          });
        }
      }

      // 2. Based on closet
      if (closetItems.length >0) {
        const matchingLooks = await getMatchingLooks(preferredCategories);
        const uniqueLooks = matchingLooks.filter(look => {
          if (usedLookIds.has(look.id)) return false;
          usedLookIds.add(look.id);
          return true;
        });
        if (uniqueLooks.length >0) {
          recs.push({
            title: 'Match Your Closet',
            subtitle: 'Looks you can recreate',
            looks: uniqueLooks,
            reason: 'Items similar to what you own',
          });
        }
      }

      // 3. Seasonal recommendations
      const seasonalLooks = await getSeasonalLooks(currentSeason);
      const uniqueSeasonalLooks = seasonalLooks.filter(look => {
        if (usedLookIds.has(look.id)) return false;
        usedLookIds.add(look.id);
        return true;
      });
      if (uniqueSeasonalLooks.length >0) {
        recs.push({
          title: `${currentSeason} Essentials`,
          subtitle: 'Perfect for this season',
          looks: uniqueSeasonalLooks,
          reason: `Trending for ${currentSeason}`,
        });
      }

      // 4. Occasion-based
      if (preferredOccasions.length >0) {
        const occasionLooks = await getOccasionLooks(preferredOccasions[0]);
        const uniqueLooks = occasionLooks.filter(look => {
          if (usedLookIds.has(look.id)) return false;
          usedLookIds.add(look.id);
          return true;
        });
        if (uniqueLooks.length >0) {
          recs.push({
            title: `${preferredOccasions[0]} Looks`,
            subtitle: 'For your lifestyle',
            looks: uniqueLooks,
            reason: `Based on your ${preferredOccasions[0].toLowerCase()} style`,
          });
        }
      }

      // 5. Trending
      const trendingLooks = await getTrendingLooks();
      const uniqueTrendingLooks = trendingLooks.filter(look => {
        if (usedLookIds.has(look.id)) return false;
        usedLookIds.add(look.id);
        return true;
      });
      if (uniqueTrendingLooks.length >0) {
        recs.push({
          title: 'Trending Now',
          subtitle: 'Popular with other users',
          looks: uniqueTrendingLooks,
          reason: 'Most favorited this week',
        });
      }

      setRecommendations(recs);
      
      // Animate in after loading
      if (!refreshing) {
        fadeIn(fadeAnim, 300).start();
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const analyzeOccasions = (favorites: any[]) => {
    const occasions: Record<string, number> = {};
    favorites.forEach(fav => {
      const occasion = fav.occasion || 'casual';
      occasions[occasion] = (occasions[occasion] || 0) + 1;
    });
    return Object.entries(occasions)
      .sort(([, a], [, b]) =>b - a)
      .map(([occasion]) =>occasion);
  };

  const analyzeCategories = (items: any[]) => {
    const categories: Record<string, number> = {};
    items.forEach(item => {
      const category = item.category || 'other';
      categories[category] = (categories[category] || 0) + 1;
    });
    return Object.keys(categories);
  };

  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  };

  const getSimilarLooks = async (lookId: string) => {
    try {
      // In a real app, this would use embeddings to find similar looks
      const response = await lookAPI.getAll({});
      return response.data.slice(0, 5);
    } catch (error) {
      return [];
    }
  };

  const getMatchingLooks = async (categories: string[]) => {
    try {
      const response = await lookAPI.getAll({});
      return response.data.slice(5, 10);
    } catch (error) {
      return [];
    }
  };

  const getSeasonalLooks = async (season: string) => {
    try {
      const response = await lookAPI.getAll({});
      // Filter by season if available
      return response.data
        .filter((look: Look) => !look.season || look.season === season)
        .slice(0, 5);
    } catch (error) {
      return [];
    }
  };

  const getOccasionLooks = async (occasion: string) => {
    try {
      const response = await lookAPI.getAll({ occasion });
      return response.data.slice(0, 5);
    } catch (error) {
      return [];
    }
  };

  const getTrendingLooks = async () => {
    try {
      const response = await lookAPI.getAll({});
      // In a real app, sort by favorite count or views
      return response.data.slice(0, 5);
    } catch (error) {
      return [];
    }
  };

  const handleFavorite = async (lookId: string) => {
    try {
      await lookAPI.toggleFavorite(getCurrentUserId(), lookId);
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Finding perfect looks for you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>For You</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Personalized Recommendations</Text>
          <Text style={styles.introText}>Curated looks based on your style, closet, and preferences
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.ink, padding: 12, marginTop: 12 }}
            onPress={() => {
              console.log('TEST BUTTON PRESSED!');
              Alert.alert('Touch Works!', 'Touch is working on this screen');
            }}
          >
            <Text style={{ color: colors.white, textAlign: 'center' }}>Test Touch (Tap Me)</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
        {recommendations.map((category, index) => (
          <View key={index} style={styles.category}>
            <View style={styles.categoryHeader}>
              <View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
              </View>
              <TouchableOpacity onPress={() => {
                console.log('See All pressed for:', category.title);
                Alert.alert('Coming Soon', `View all ${category.title} recommendations`);
              }}>
                <Text style={styles.seeAllButton}>See All →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reasonBadge}>
              <Text style={styles.reasonText}> {category.reason}</Text>
            </View>

            <View style={styles.looksContainer}>
              {category.looks.slice(0, 2).map((look, lookIndex) => (
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

        {recommendations.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Recommendations Yet</Text>
            <Text style={styles.emptyStateText}>Start by favoriting some looks and adding items to your closet!
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() =>navigation.goBack()}
            >
              <Text style={styles.emptyStateButtonText}>Browse Looks</Text>
            </TouchableOpacity>
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
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
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
  backButton: {
    fontSize: 16,
    color: colors.ink,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
  },
  intro: {
    padding: 20,
    backgroundColor: colors.paper,
    marginBottom: 8,
  },
  introTitle: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 8,
  },
  introText: {
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
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
  },
  categorySubtitle: {
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
    borderRadius: 18,
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
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyStateButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
});

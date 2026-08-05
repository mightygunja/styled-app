import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { recommendationEngine, OutfitRecommendation, OccasionType, WeatherCondition } from '../services/recommendationEngine';
import { aiStyleService } from '../services/aiStyleService';
import { getCurrentWeather } from '../services/weatherService';
import { closetAPI, getCurrentUserId } from '../services/api';
import { outfitsService } from '../services/firestore';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 60) / 3;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SmartRecommendationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionType>('casual');
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<{ condition: WeatherCondition; temperature: number }>({
    condition: 'sunny',
    temperature: 72,
  });
  const [weatherLoaded, setWeatherLoaded] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const occasions: OccasionType[] = ['casual', 'work', 'formal', 'date', 'workout', 'party'];

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

  const loadRecommendations = async () => {
    try {
      setLoading(true);

      // Get closet items
      const response = await closetAPI.getItems(getCurrentUserId());
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
      }));

      // Get style profile
      const styleProfile = await aiStyleService.analyzeStyle(items);

      // Generate recommendations
      const recs = await recommendationEngine.generateRecommendations(
        items,
        styleProfile,
        {
          occasion: selectedOccasion,
          weather,
        }
      );

      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      showToast('Failed to load recommendations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRecommendation = async (rec: OutfitRecommendation) => {
    try {
      await outfitsService.create(
        getCurrentUserId(),
        rec.items.map(item =>item.id),
        rec.occasion,
        rec.title
      );
      showToast('Outfit saved!', 'success');
    } catch (error) {
      console.error('Error saving outfit:', error);
      showToast('Failed to save outfit', 'error');
    }
  };

  const getOccasionEmoji = (occasion: OccasionType): string => {
    const emojiMap: { [key in OccasionType]: string } = {
      casual: '',
      work: '▭',
      formal: '◇',
      party: '◉',
      date: '◎',
      workout: '○',
      travel: '◐',
      outdoor: '◆',
    };
    return emojiMap[occasion];
  };

  const renderRecommendation = (rec: OutfitRecommendation) => (
    <View key={rec.id} style={styles.recCard}>
      {/* Header */}
      <View style={styles.recHeader}>
        <View>
          <Text style={styles.recTitle}>{rec.title}</Text>
          <Text style={styles.recDescription}>{rec.description}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreNumber}>{rec.suitabilityScore}</Text>
          <Text style={styles.scoreLabel}>Score</Text>
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

      {/* Reasoning */}
      <View style={styles.reasoningSection}>
        <Text style={styles.reasoningTitle}>Why this works:</Text>
        {rec.reasoning.map((reason, index) => (
          <View key={index} style={styles.reasonItem}>
            <Text style={styles.reasonBullet}>•</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>

      {/* Tags */}
      <View style={styles.tagsContainer}>
        {rec.tags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() =>handleAcceptRecommendation(rec)}
        >
          <Text style={styles.acceptButtonText}>✓ Save Outfit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modifyButton}
          onPress={() =>navigation.navigate('SmartOutfitBuilder')}
        >
          <Text style={styles.modifyButtonText}>Modify</Text>
        </TouchableOpacity>
      </View>

      {/* Badges */}
      <View style={styles.badges}>
        {rec.weatherSuitable && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Weather-ready</Text>
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}> {rec.styleMatch}% Style Match</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Generating recommendations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Recommendations</Text>
        <TouchableOpacity onPress={loadRecommendations}>
          <Text style={styles.refreshButton}>○</Text>
        </TouchableOpacity>
      </View>

      {/* Weather Info */}
      <View style={styles.weatherCard}>
        <Text style={styles.weatherIcon}>
          {{ sunny: '☀', cloudy: '☁', rainy: '☂', snowy: '❄', cold: '❄', hot: '☀' }[weather.condition]}
        </Text>
        <View>
          <Text style={styles.weatherTemp}>{weather.temperature}°F</Text>
          <Text style={styles.weatherCondition}>
            {weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)}
          </Text>
        </View>
      </View>

      {/* Occasion Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.occasionScroll}
        contentContainerStyle={styles.occasionContainer}
      >
        {occasions.map((occasion) => (
          <TouchableOpacity
            key={occasion}
            style={[
              styles.occasionChip,
              selectedOccasion === occasion && styles.occasionChipActive,
            ]}
            onPress={() =>setSelectedOccasion(occasion)}
          >
            <Text style={styles.occasionEmoji}>{getOccasionEmoji(occasion)}</Text>
            <Text
              style={[
                styles.occasionText,
                selectedOccasion === occasion && styles.occasionTextActive,
              ]}
            >
              {occasion.charAt(0).toUpperCase() + occasion.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recommendations */}
      <ScrollView>
        {recommendations.length === 0 ? (
          <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No recommendations available</Text>
            <Text style={styles.emptySubtext}>Add more items to your closet for better recommendations
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.recCount}>
              <Text style={styles.recCountText}>
                {recommendations.length} outfit{recommendations.length !== 1 ? 's' : ''} for you
              </Text>
            </View>
            {recommendations.map(renderRecommendation)}
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
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
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
    color: colors.inkMuted,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  refreshButton: {
    fontSize: 20,
    color: colors.ink,
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    margin: 20,
    padding: 16,
    gap: 12,
  },
  weatherIcon: {
    fontSize: 40,
  },
  weatherTemp: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  weatherCondition: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  occasionScroll: {
    maxHeight: 60,
  },
  occasionContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  occasionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    gap: 6,
  },
  occasionChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  occasionEmoji: {
    fontSize: 16,
    color: colors.ink,
  },
  occasionText: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  occasionTextActive: {
    color: colors.white,
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
    borderRadius: 16,
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
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  recDescription: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scoreNumber: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  scoreLabel: {
    fontSize: 11,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  itemContainer: {
    width: ITEM_SIZE,
  },
  itemImage: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: colors.paper,
    marginBottom: 4,
  },
  itemCategory: {
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
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: colors.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  modifyButton: {
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
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  badgeText: {
    fontSize: 12,
    color: colors.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
    color: colors.ink,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});

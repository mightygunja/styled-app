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
        rec.items.map(item => item.id),
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
      casual: '◈',
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
          onPress={() => handleAcceptRecommendation(rec)}
        >
          <Text style={styles.acceptButtonText}>✓ Save Outfit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modifyButton}
          onPress={() => navigation.navigate('SmartOutfitBuilder')}
        >
          <Text style={styles.modifyButtonText}>Modify</Text>
        </TouchableOpacity>
      </View>

      {/* Badges */}
      <View style={styles.badges}>
        {rec.weatherSuitable && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>☀️ Weather-Ready</Text>
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✨ {rec.styleMatch}% Style Match</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Generating recommendations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
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
          {{ sunny: '☀️', cloudy: '☁️', rainy: '🌧️', snowy: '❄️', cold: '🥶', hot: '🥵' }[weather.condition]}
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
            onPress={() => setSelectedOccasion(occasion)}
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
            <Text style={styles.emptyEmoji}>◈</Text>
            <Text style={styles.emptyText}>No recommendations available</Text>
            <Text style={styles.emptySubtext}>
              Add more items to your closet for better recommendations
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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    fontSize: 16,
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  refreshButton: {
    fontSize: 20,
    color: '#2B1F1A',
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  weatherIcon: {
    fontSize: 40,
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  weatherCondition: {
    fontSize: 14,
    color: '#64748b',
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
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  occasionChipActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  occasionEmoji: {
    fontSize: 16,
    color: '#2B1F1A',
  },
  occasionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  occasionTextActive: {
    color: '#ffffff',
  },
  recCount: {
    padding: 20,
    paddingBottom: 12,
  },
  recCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  recCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
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
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  recDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
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
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  reasoningSection: {
    marginBottom: 16,
  },
  reasoningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 8,
  },
  reasonBullet: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  modifyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  modifyButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  badgeText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
    color: '#2B1F1A',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});

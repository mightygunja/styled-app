import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { TrendPalette, Look } from '../types';
import { paletteAPI, lookAPI, MOCK_USER_ID } from '../services/api';
import LookCard from '../components/LookCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaletteDetailRouteProp = RouteProp<RootStackParamList, 'PaletteDetail'>;

export default function PaletteDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaletteDetailRouteProp>();
  const { paletteId } = route.params;

  const [palette, setPalette] = useState<TrendPalette | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPaletteDetails();
  }, [paletteId]);

  const fetchPaletteDetails = async () => {
    try {
      console.log('Fetching palette details for:', paletteId);
      const paletteResponse = await paletteAPI.getById(paletteId);
      console.log('Palette response:', paletteResponse);
      setPalette(paletteResponse.data);

      // Fetch all looks that use this palette
      const looksResponse = await lookAPI.getAll({ limit: 50 });
      const paletteLooks = looksResponse.data.filter(look => look.paletteId === paletteId);
      console.log('Looks for this palette:', paletteLooks);
      setLooks(paletteLooks);
    } catch (error) {
      console.error('Error fetching palette details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (lookId: string) => {
    try {
      const response = await lookAPI.toggleFavorite(lookId, MOCK_USER_ID);
      
      if (response.isFavorited) {
        setFavorites(prev => new Set(prev).add(lookId));
      } else {
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(lookId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading palette...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!palette) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Palette not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButtonSmall}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Palette Info */}
        <View style={styles.paletteSection}>
          <Text style={styles.paletteName}>{palette.name}</Text>
          <Text style={styles.paletteDescription}>{palette.description}</Text>
          
          {/* Color Swatches */}
          <View style={styles.colorSwatchesLarge}>
            {palette.colors.map((color, index) => (
              <View
                key={index}
                style={[styles.colorSwatchLarge, { backgroundColor: color }]}
              >
                <Text style={styles.colorCode}>{color}</Text>
              </View>
            ))}
          </View>

          {/* Occasion Badge */}
          {palette.occasion && (
            <View style={styles.occasionBadge}>
              <Text style={styles.occasionText}>
                {palette.occasion.charAt(0).toUpperCase() + palette.occasion.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Looks Section */}
        <View style={styles.looksSection}>
          <Text style={styles.sectionTitle}>
            Looks in this Palette ({looks.length})
          </Text>
          
          {looks.length === 0 ? (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                No looks available for this palette yet.
              </Text>
            </View>
          ) : (
            <View style={styles.looksContainer}>
              {looks.map((look) => (
                <LookCard
                  key={look.id}
                  look={look}
                  onPress={() => navigation.navigate('LookDetail', { lookId: look.id })}
                  onFavorite={() => handleFavorite(look.id)}
                  isFavorited={favorites.has(look.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 20,
  },
  header: {
    padding: 16,
  },
  backButtonSmall: {
    alignSelf: 'flex-start',
  },
  backButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  paletteSection: {
    padding: 20,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  paletteName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  paletteDescription: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 20,
  },
  colorSwatchesLarge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  colorSwatchLarge: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  colorCode: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  occasionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  occasionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  looksSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  looksContainer: {
    gap: 16,
  },
  placeholder: {
    padding: 40,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

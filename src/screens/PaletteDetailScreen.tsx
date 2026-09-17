import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { TrendPalette, Look } from '../types';
import { paletteAPI, lookAPI, getCurrentUserId } from '../services/api';
import LookCard from '../components/LookCard';
import { buildProfileMatchContext } from '../services/profileMatchContext';
import { colors, fonts, radius } from '../theme/designSystem';

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
  // The lookbook is womenswear-only and looks carry no department field, so a
  // menswear wardrobe gets no looks rail here (same rule as the More menu).
  const [hideLooks, setHideLooks] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [looksError, setLooksError] = useState(false);

  useEffect(() => {
    fetchPaletteDetails();
  }, [paletteId]);

  /**
   * Every look that uses this palette, whatever its occasion. This used to
   * call lookAPI.getAll with no occasion, which silently means 'home' only -
   * arriving from a work or going-out look showed "(0)".
   */
  const fetchPaletteLooks = async (): Promise<Look[]> => {
    try {
      const response = await paletteAPI.getLooks(paletteId);
      return response.data || [];
    } catch (error) {
      console.error('Palette looks query failed, searching by occasion:', error);
      const results = await Promise.all(
        (['home', 'work', 'going-out'] as const).map(occasion =>
          lookAPI.getAll({ occasion, limit: 50 })
        )
      );
      const seen = new Set<string>();
      const found: Look[] = [];
      results.forEach(result =>
        result.data.forEach(look => {
          if (look.paletteId !== paletteId || seen.has(look.id)) return;
          seen.add(look.id);
          found.push(look);
        })
      );
      return found;
    }
  };

  const fetchPaletteDetails = async () => {
    try {
      setLoadError(false);
      setLooksError(false);
      console.log('Fetching palette details for:', paletteId);
      const paletteResponse = await paletteAPI.getById(paletteId);
      console.log('Palette response:', paletteResponse);
      setPalette(paletteResponse.data);

      const context = await buildProfileMatchContext(getCurrentUserId()).catch(() => undefined);
      if (context?.wardrobeFocus === 'mens') {
        setHideLooks(true);
        setLooks([]);
        return;
      }
      setHideLooks(false);

      // Fetch all looks that use this palette. A failure here is its own
      // state - it must not read as "no looks for this palette".
      try {
        setLooks(await fetchPaletteLooks());
      } catch (looksFetchError) {
        console.error('Error fetching palette looks:', looksFetchError);
        setLooksError(true);
      }
    } catch (error) {
      console.error('Error fetching palette details:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (lookId: string) => {
    try {
      const response = await lookAPI.toggleFavorite(lookId, getCurrentUserId());
      
      if (response.isFavorited) {
        setFavorites(prev =>new Set(prev).add(lookId));
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
        <BackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading palette...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!palette) {
    return (
      <SafeAreaView style={styles.container}>
        <BackButton />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {loadError ? "Couldn't load this palette." : 'Palette not found'}
          </Text>
          {loadError ? (
            <TouchableOpacity
              style={styles.backButton}
              accessibilityRole="button"
              onPress={() => {
                setLoading(true);
                fetchPaletteDetails();
              }}
            >
              <Text style={styles.backButtonText}>Tap to retry</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ScrollView style={styles.content}>
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

        {/* Looks Section - not shown for a menswear wardrobe (see hideLooks). */}
        {!hideLooks && (
        <View style={styles.looksSection}>
          <Text style={styles.sectionTitle}>
            {looksError ? 'Looks in this Palette' : `Looks in this Palette (${looks.length})`}
          </Text>

          {looksError ? (
            <TouchableOpacity
              style={styles.placeholder}
              accessibilityRole="button"
              onPress={() => {
                setLoading(true);
                fetchPaletteDetails();
              }}
            >
              <Text style={styles.placeholderText}>Couldn't load looks. Tap to retry.</Text>
            </TouchableOpacity>
          ) : looks.length === 0 ? (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>No looks available for this palette yet.
              </Text>
            </View>
          ) : (
            <View style={styles.looksContainer}>
              {looks.map((look) => (
                <LookCard
                  key={look.id}
                  look={look}
                  onPress={() =>navigation.navigate('LookDetail', { lookId: look.id })}
                  onFavorite={() =>handleFavorite(look.id)}
                  isFavorited={favorites.has(look.id)}
                />
              ))}
            </View>
          )}
        </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
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
    color: colors.inkMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.inkMuted,
    marginBottom: 20,
  },
  backButton: {
    borderRadius: radius.full,
    backgroundColor: colors.rust,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    // White on rust - this label used to be ink on ink, an invisible button.
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  paletteSection: {
    borderRadius: radius.md,
    padding: 20,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  paletteName: {
    fontSize: 28,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  paletteDescription: {
    fontSize: 16,
    color: colors.inkMuted,
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
    borderRadius: radius.sm,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  colorCode: {
    fontSize: 10,
    color: colors.white,
    fontFamily: fonts.sansSemiBold,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  occasionBadge: {
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  occasionText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  looksSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
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
    color: colors.inkFaint,
    textAlign: 'center',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface TrendingColor {
  name: string;
  hex: string;
  pantone?: string;
  description: string;
}

interface TrendingPattern {
  name: string;
  description: string;
  popularity: number;
}

export default function ColorPaletteScreen() {
  const navigation = useNavigation();
  const [currentMonth, setCurrentMonth] = useState('');
  const [trendingColors, setTrendingColors] = useState<TrendingColor[]>([]);
  const [trendingPatterns, setTrendingPatterns] = useState<TrendingPattern[]>([]);

  useEffect(() => {
    loadTrendingData();
  }, []);

  const loadTrendingData = () => {
    const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    setCurrentMonth(month);

    // Trending colors for current season/month (globally trending)
    const colors: TrendingColor[] = [
      {
        name: 'Warm Espresso',
        hex: '#2B1F1A',
        pantone: 'PANTONE 19-1012',
        description: 'Rich, grounding brown that evokes warmth and sophistication',
      },
      {
        name: 'Soft Taupe',
        hex: '#B29A8B',
        pantone: 'PANTONE 16-1318',
        description: 'Versatile neutral with subtle warmth, perfect for layering',
      },
      {
        name: 'Crimson Red',
        hex: '#8E1E24',
        pantone: 'PANTONE 19-1664',
        description: 'Bold statement color bringing energy and confidence',
      },
      {
        name: 'Warm Cream',
        hex: '#F4F1ED',
        pantone: 'PANTONE 11-0105',
        description: 'Soft, breathable base that complements any palette',
      },
      {
        name: 'Deep Evergreen',
        hex: '#0F2419',
        pantone: 'PANTONE 19-5406',
        description: 'Sophisticated dark green adding depth and elegance',
      },
      {
        name: 'Umber Brown',
        hex: '#7B665A',
        pantone: 'PANTONE 17-1320',
        description: 'Earthy mid-tone perfect for transitional pieces',
      },
    ];

    // Trending patterns globally
    const patterns: TrendingPattern[] = [
      {
        name: 'Architectural Stripes',
        description: 'Clean, structured lines in varying widths creating modern sophistication',
        popularity: 95,
      },
      {
        name: 'Organic Textures',
        description: 'Natural weaves and subtle patterns inspired by nature',
        popularity: 88,
      },
      {
        name: 'Minimalist Checks',
        description: 'Refined windowpane and micro-check patterns in neutral tones',
        popularity: 82,
      },
      {
        name: 'Tonal Florals',
        description: 'Subtle botanical prints in monochromatic or analogous color schemes',
        popularity: 76,
      },
      {
        name: 'Geometric Abstracts',
        description: 'Modern angular shapes and clean geometric compositions',
        popularity: 71,
      },
    ];

    setTrendingColors(colors);
    setTrendingPatterns(patterns);
  };

  const getPopularityWidth = (popularity: number) => {
    return popularity;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Colors & Patterns</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView>
        {/* Month Banner */}
        <View style={styles.monthBanner}>
          <Text style={styles.monthTitle}>Trending Globally</Text>
          <Text style={styles.monthSubtitle}>{currentMonth}</Text>
        </View>

        {/* Trending Colors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Colors</Text>
          <Text style={styles.sectionSubtitle}>
            Global color trends shaping fashion this month
          </Text>

          {trendingColors.map((color, index) => (
            <View key={index} style={styles.colorCard}>
              <View style={styles.colorHeader}>
                <View style={[styles.colorSwatch, { backgroundColor: color.hex }]} />
                <View style={styles.colorInfo}>
                  <Text style={styles.colorName}>{color.name}</Text>
                  <Text style={styles.colorHex}>{color.hex}</Text>
                  {color.pantone && (
                    <Text style={styles.colorPantone}>{color.pantone}</Text>
                  )}
                </View>
              </View>
              <Text style={styles.colorDescription}>{color.description}</Text>
            </View>
          ))}
        </View>

        {/* Trending Patterns Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Patterns</Text>
          <Text style={styles.sectionSubtitle}>
            Popular patterns in global fashion right now
          </Text>

          {trendingPatterns.map((pattern, index) => (
            <View key={index} style={styles.patternCard}>
              <View style={styles.patternHeader}>
                <Text style={styles.patternName}>{pattern.name}</Text>
                <View style={styles.popularityContainer}>
                  <View style={styles.popularityBarBg}>
                    <View
                      style={[
                        styles.popularityBarFill,
                        { width: `${getPopularityWidth(pattern.popularity)}%` as any },
                      ]}
                    />
                  </View>
                  <Text style={styles.popularityText}>{pattern.popularity}%</Text>
                </View>
              </View>
              <Text style={styles.patternDescription}>{pattern.description}</Text>
            </View>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Styling Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>◈</Text>
            <Text style={styles.tipText}>
              Mix trending colors with your existing wardrobe neutrals for easy updates
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>◉</Text>
            <Text style={styles.tipText}>
              Start with one trending pattern piece and build around it with solids
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>○</Text>
            <Text style={styles.tipText}>
              Combine warm and cool tones from the palette for dimensional looks
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DED7CF',
  },
  backButton: {
    fontSize: 16,
    color: '#2B1F1A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#161616',
  },
  monthBanner: {
    padding: 24,
    backgroundColor: '#EEE9E3',
    borderBottomWidth: 1,
    borderBottomColor: '#DED7CF',
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#161616',
    marginBottom: 4,
  },
  monthSubtitle: {
    fontSize: 16,
    color: '#5E5A55',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#161616',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#5E5A55',
    marginBottom: 20,
  },
  colorCard: {
    backgroundColor: '#EEE9E3',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  colorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  colorInfo: {
    flex: 1,
  },
  colorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 4,
  },
  colorHex: {
    fontSize: 13,
    color: '#5E5A55',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  colorPantone: {
    fontSize: 12,
    color: '#7B665A',
  },
  colorDescription: {
    fontSize: 14,
    color: '#5E5A55',
    lineHeight: 20,
  },
  patternCard: {
    backgroundColor: '#EEE9E3',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  patternHeader: {
    marginBottom: 12,
  },
  patternName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 8,
  },
  popularityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  popularityBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#DED7CF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  popularityBarFill: {
    height: '100%',
    backgroundColor: '#2B1F1A',
    borderRadius: 4,
  },
  popularityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B1F1A',
    width: 40,
  },
  patternDescription: {
    fontSize: 14,
    color: '#5E5A55',
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEE9E3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  tipIcon: {
    fontSize: 24,
    color: '#2B1F1A',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#5E5A55',
    lineHeight: 18,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { aiStyleService, StyleProfile } from '../services/aiStyleService';
import { getStyleDNA, StyleDNAResult } from '../services/styleDNA';
import { closetAPI, getCurrentUserId } from '../services/api';
import { Item } from '../types';
import Button from '../components/Button';
import { colors, fonts, type as textType } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const currentSeason = () => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Autumn';
  return 'Winter';
};

export default function StyleDNAScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [dna, setDna] = useState<StyleDNAResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDNA = useCallback(async () => {
    try {
      const response = await closetAPI.getItems(getCurrentUserId());
      const items: Item[] = response.data.map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category,
        color: item.color,
        brand: item.brand,
        price: item.price || 0,
        wornCount: item.wornCount,
        createdAt: item.createdAt,
        tags: item.tags,
        seasons: item.seasons,
        style: item.style,
      }));
      const analysis = await aiStyleService.analyzeStyle(items);
      setProfile(analysis);
      setDna(getStyleDNA(analysis));
    } catch (error) {
      console.error('Error loading Style DNA:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDNA();
    }, [loadDNA])
  );

  if (loading || !profile || !dna) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  const palette = profile.colorPalette.dominantColors.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>STYLE DNA · {currentSeason().toUpperCase()} EDITION</Text>
        <Text style={styles.archetype}>{dna.archetype}</Text>
        <Text style={styles.description}>{dna.description}</Text>

        <Text style={styles.sectionLabel}>YOUR PALETTE</Text>
        <View style={styles.paletteRow}>
          {palette.length === 0 ? (
            <Text style={styles.emptyText}>Add closet items to reveal your palette.</Text>
          ) : (
            palette.map((c, i) => (
              <View key={i} style={styles.swatchWrap}>
                <View style={[styles.swatch, { backgroundColor: safeColor(c.color) }]} />
                <Text style={styles.swatchName} numberOfLines={1}>{c.name}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.dnaColumns}>
          <View style={styles.dnaColumn}>
            <Text style={styles.sectionLabel}>IN YOUR DNA</Text>
            {dna.inYourDNA.map((trait, i) => (
              <View key={i} style={styles.traitRow}>
                <Text style={styles.traitDash}>—</Text>
                <Text style={styles.traitText}>{trait}</Text>
              </View>
            ))}
          </View>
          <View style={styles.dnaColumn}>
            <Text style={styles.sectionLabel}>RARELY YOU</Text>
            {dna.rarelyYou.map((trait, i) => (
              <View key={i} style={styles.traitRow}>
                <Text style={styles.traitDash}>—</Text>
                <Text style={[styles.traitText, styles.traitTextMuted]}>{trait}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>DOMINANT STYLES</Text>
        {profile.dominantStyles.slice(0, 3).map(style => (
          <View key={style.category} style={styles.styleRow}>
            <Text style={styles.styleName}>{style.category.charAt(0).toUpperCase() + style.category.slice(1)}</Text>
            <View style={styles.styleBarTrack}>
              <View style={[styles.styleBarFill, { width: `${style.percentage}%` }]} />
            </View>
            <Text style={styles.stylePercentage}>{style.percentage}%</Text>
          </View>
        ))}

        <Button
          title="Retake quiz"
          variant="secondary"
          onPress={() => navigation.navigate('StyleProfileBuilder')}
          style={{ marginTop: 28 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function safeColor(color: string): string {
  const known = ['black', 'white', 'gray', 'grey', 'red', 'blue', 'green', 'yellow', 'brown', 'beige', 'navy', 'pink', 'purple', 'orange', 'tan', 'cream'];
  const lower = color.toLowerCase();
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  if (known.includes(lower)) return lower === 'cream' || lower === 'beige' || lower === 'tan' ? '#E8DCC8' : lower;
  return colors.paper;
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
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  eyebrow: {
    ...textType.eyebrow,
    marginBottom: 12,
  },
  archetype: {
    fontFamily: fonts.serif,
    fontSize: 40,
    color: colors.ink,
  },
  description: {
    ...textType.body,
    color: colors.inkMuted,
    marginTop: 12,
  },
  sectionLabel: {
    ...textType.eyebrow,
    marginTop: 28,
    marginBottom: 12,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  swatchWrap: {
    width: 60,
  },
  swatch: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  swatchName: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyText: {
    ...textType.meta,
  },
  dnaColumns: {
    flexDirection: 'row',
    marginTop: 8,
  },
  dnaColumn: {
    flex: 1,
  },
  traitRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  traitDash: {
    color: colors.camel,
    marginRight: 8,
    fontFamily: fonts.sans,
  },
  traitText: {
    ...textType.body,
    fontSize: 13,
    color: colors.ink,
    flex: 1,
  },
  traitTextMuted: {
    color: colors.inkFaint,
    textDecorationLine: 'line-through',
  },
  divider: {
    height: 1,
    backgroundColor: colors.hair,
    marginTop: 24,
  },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  styleName: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.ink,
    width: 90,
  },
  styleBarTrack: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hair,
  },
  styleBarFill: {
    height: 1,
    backgroundColor: colors.camel,
  },
  stylePercentage: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
    width: 40,
    textAlign: 'right',
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { aiStyleService, StyleProfile } from '../services/aiStyleService';
import { getStyleVoice, StyleVoiceResult } from '../services/styleVoice';
import { closetAPI, getCurrentUserId } from '../services/api';
import { styleProfileService } from '../services/firestore';
import { ColorAnalysisResult, BodyAnalysisResult, BODY_TYPE_GUIDES } from '../models/personalStyleProfile';
import { Item } from '../types';
import { colors, radius, fonts, type as textType } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const currentSeason = () => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Autumn';
  return 'Winter';
};

export default function StyleProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [voice, setVoice] = useState<StyleVoiceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [colorAnalysis, setColorAnalysis] = useState<ColorAnalysisResult | null>(null);
  const [bodyAnalysis, setBodyAnalysis] = useState<BodyAnalysisResult | null>(null);

  // Loaded independently of the wardrobe-derived voice below, so a failure here
  // never blocks the rest of the screen from rendering.
  const loadColorAnalysis = useCallback(async () => {
    try {
      const saved = await styleProfileService.getStyleProfile(getCurrentUserId());
      setColorAnalysis(saved?.colorAnalysis || null);
      setBodyAnalysis(saved?.bodyAnalysis || null);
    } catch (error) {
      console.error('Error loading color/body analysis:', error);
    }
  }, []);

  const loadStyleProfile = useCallback(async () => {
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
      setVoice(getStyleVoice(analysis));
    } catch (error) {
      console.error('Error loading style profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStyleProfile();
      loadColorAnalysis();
    }, [loadStyleProfile, loadColorAnalysis])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  // Loading finished but nothing arrived - a failed closet load or analysis.
  // Say so and offer a retry rather than spinning forever on a main tab.
  if (!profile || !voice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>We couldn't load your style profile.</Text>
          <Text style={styles.errorHint}>Check your connection and try again.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              loadStyleProfile();
              loadColorAnalysis();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const palette = profile.colorPalette.dominantColors.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>STYLE PROFILE · {currentSeason().toUpperCase()} EDITION</Text>
        <Text style={styles.archetype}>{voice.archetype}</Text>
        <Text style={styles.description}>{voice.description}</Text>

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

        {/* The profile editor gets the same card treatment as the analyses,
            up here where people look for it. It used to be a "Retake quiz"
            button at the very bottom of the scroll - a wrong label in an
            invisible place. */}
        <Text style={styles.sectionLabel}>YOUR PREFERENCES</Text>
        <TouchableOpacity
          style={styles.colorAnalysisCard}
          onPress={() => navigation.navigate('StyleProfileBuilder')}
          activeOpacity={0.8}
        >
          <Text style={styles.colorSeasonDesc}>
            Your style words, occasions, fit preferences and hard nos — everything the
            recommendations start from. Set once, adjust any time.
          </Text>
          <Text style={styles.colorAnalysisLink}>Edit my style profile →</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>PERSONAL COLOR ANALYSIS</Text>
        {colorAnalysis ? (
          <TouchableOpacity
            style={styles.colorAnalysisCard}
            onPress={() => navigation.navigate('ColorAnalysis')}
            activeOpacity={0.8}
          >
            <Text style={styles.colorSeasonName}>{colorAnalysis.season}</Text>
            <Text style={styles.colorSeasonDesc} numberOfLines={2}>{colorAnalysis.description}</Text>
            <View style={styles.paletteRow}>
              {colorAnalysis.palette.slice(0, 6).map((swatch, i) => (
                <View key={i} style={[styles.miniSwatch, { backgroundColor: swatch.hex }]} />
              ))}
            </View>
            <Text style={styles.colorAnalysisLink}>Retake analysis →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.colorAnalysisCard}
            onPress={() => navigation.navigate('ColorAnalysis')}
            activeOpacity={0.8}
          >
            <Text style={styles.colorSeasonDesc}>
              Discover your seasonal color type from a selfie, and get a palette built for your
              undertone.
            </Text>
            <Text style={styles.colorAnalysisLink}>Analyze my colors →</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>BODY & FIT ANALYSIS</Text>
        {bodyAnalysis ? (
          <TouchableOpacity
            style={styles.colorAnalysisCard}
            onPress={() => navigation.navigate('BodyAnalysis')}
            activeOpacity={0.8}
          >
            <Text style={styles.colorSeasonName}>{BODY_TYPE_GUIDES[bodyAnalysis.bodyType].label}</Text>
            <Text style={styles.colorSeasonDesc} numberOfLines={2}>{bodyAnalysis.description}</Text>
            <Text style={styles.colorAnalysisLink}>Retake analysis →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.colorAnalysisCard}
            onPress={() => navigation.navigate('BodyAnalysis')}
            activeOpacity={0.8}
          >
            <Text style={styles.colorSeasonDesc}>
              A 4-question quiz (plus an optional photo check) to find your body & fit type, with
              styling guidance and a check against pieces you already own.
            </Text>
            <Text style={styles.colorAnalysisLink}>Find my body & fit type →</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>SHOPPING</Text>
        <TouchableOpacity
          style={styles.colorAnalysisCard}
          onPress={() => navigation.navigate('Shop', { matchedOnly: true })}
          activeOpacity={0.8}
        >
          <Text style={styles.colorSeasonDesc}>
            Browse real product picks filtered against your color season, body & fit, and style
            archetypes - and against gaps in your closet.
          </Text>
          <Text style={styles.colorAnalysisLink}>Shop your matches →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.colorAnalysisCard, { marginTop: 12 }]}
          onPress={() => navigation.navigate('InStoreCheck')}
          activeOpacity={0.8}
        >
          <Text style={styles.colorSeasonDesc}>
            Standing in a fitting room? Snap the item and get a buy/maybe/skip verdict against
            your profile - plus a check against what you already own.
          </Text>
          <Text style={styles.colorAnalysisLink}>Check an item →</Text>
        </TouchableOpacity>

        <View style={styles.voiceColumns}>
          <View style={styles.voiceColumn}>
            <Text style={styles.sectionLabel}>IN YOUR STYLE</Text>
            {voice.inYourStyle.map((trait, i) => (
              <View key={i} style={styles.traitRow}>
                <Text style={styles.traitDash}>—</Text>
                <Text style={styles.traitText}>{trait}</Text>
              </View>
            ))}
          </View>
          <View style={styles.voiceColumn}>
            <Text style={styles.sectionLabel}>RARELY YOU</Text>
            {voice.rarelyYou.map((trait, i) => (
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
    padding: 20,
  },
  errorText: {
    fontFamily: fonts.serifMedium,
    fontSize: 18,
    color: colors.ink,
    textAlign: 'center',
  },
  errorHint: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: radius.full,
    marginTop: 24,
    backgroundColor: colors.ink,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.bone,
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
    borderRadius: radius.sm,
    width: 60,
  },
  swatch: {
    borderRadius: radius.sm,
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
  colorAnalysisCard: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 18,
  },
  colorSeasonName: {
    fontFamily: fonts.serifMedium,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 6,
  },
  colorSeasonDesc: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  miniSwatch: {
    borderRadius: radius.sm,
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  colorAnalysisLink: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    color: colors.tobacco,
    marginTop: 12,
  },
  voiceColumns: {
    flexDirection: 'row',
    marginTop: 8,
  },
  voiceColumn: {
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

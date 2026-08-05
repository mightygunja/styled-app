import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import PhotoUploadModal from '../components/PhotoUploadModal';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { closetAPI, getCurrentUserId } from '../services/api';
import { storeCheckAPI } from '../services/firebaseApi';
import { styleProfileService } from '../services/firestore';
import { StoreCheckResult, VerdictDetail, OwnedItemMatch, findSimilarOwnedItems } from '../models/storeCheck';
import { forecastCostPerWear, verdictLabel, WearForecast } from '../services/costPerWearForecast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ScreenState = 'intro' | 'analyzing' | 'results';

/**
 * The three verdicts were pale green / sand / pale pink - a semantic ramp the
 * palette does not have. They read as a tonal one instead: the stronger the
 * recommendation, the heavier the ground. The label still carries the meaning,
 * which is what someone actually reads.
 */
const VERDICT_COPY: Record<
  StoreCheckResult['overallVerdict'],
  { label: string; bg: string; fg: string }
> = {
  buy: { label: 'BUY IT', bg: colors.ink, fg: colors.white },
  maybe: { label: 'MAYBE', bg: colors.sand, fg: colors.ink },
  skip: { label: 'SKIP IT', bg: colors.paper, fg: colors.inkMuted },
};

export default function InStoreCheckScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [screenState, setScreenState] = useState<ScreenState>('intro');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [result, setResult] = useState<StoreCheckResult | null>(null);
  const [ownedMatches, setOwnedMatches] = useState<OwnedItemMatch[]>([]);
  const [hasProfile, setHasProfile] = useState(true);
  const [priceInput, setPriceInput] = useState('');
  const [forecast, setForecast] = useState<WearForecast | null>(null);

  const handlePhotoSelected = async (uri: string) => {
    setScreenState('analyzing');
    try {
      const userId = getCurrentUserId();
      const [base64, profile, closetResponse] = await Promise.all([
        readAsStringAsync(uri, { encoding: 'base64' }),
        styleProfileService.getStyleProfile(userId),
        closetAPI.getItems(userId),
      ]);
      setHasProfile(!!(profile?.colorAnalysis || profile?.bodyAnalysis));

      const base64Image = `data:image/jpeg;base64,${base64}`;
      const checkResult = await storeCheckAPI.analyze(base64Image, userId, profile);
      setResult(checkResult);
      setOwnedMatches(findSimilarOwnedItems(checkResult.classification, closetResponse.data));

      // Project what this would actually cost per wear, from how this user
      // treats the items they already own in the same category.
      const parsedPrice = parseFloat(priceInput.replace(/[^0-9.]/g, ''));
      setForecast(
        forecastCostPerWear(
          closetResponse.data || [],
          checkResult.classification.category,
          isNaN(parsedPrice) ? null : parsedPrice
        )
      );

      setScreenState('results');
    } catch (error: any) {
      console.error('Error analyzing store item:', error);
      Alert.alert(
        'Check failed',
        error?.message || "We couldn't analyze that photo. Please try again with a clear, well-lit shot of the item."
      );
      setScreenState('intro');
    }
  };

  const reset = () => {
    setResult(null);
    setOwnedMatches([]);
    setForecast(null);
    setPriceInput('');
    setScreenState('intro');
  };

  const verdictMeta = result ? VERDICT_COPY[result.overallVerdict] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {screenState === 'intro' && (
          <>
            <Text style={styles.eyebrow}>IN-STORE SNAP-TO-CHECK</Text>
            <Text style={styles.title}>Should you buy it?</Text>
            <Text style={styles.subtitle}>
              Snap a photo of something you're considering and get a verdict grounded in your
              color season, body & fit guidance, and style profile - plus a check against what's
              already in your closet.
            </Text>
            <Text style={styles.priceLabel}>WHAT DOES IT COST? (OPTIONAL)</Text>
            <Text style={styles.priceHelper}>
              Add the price and we'll project what it would actually cost you per wear, based on
              how often you wear what you already own.
            </Text>
            <TextInput
              style={styles.priceInput}
              placeholder="$0.00"
              placeholderTextColor={colors.inkFaint}
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="decimal-pad"
            />

            <Button
              title="Check an item"
              onPress={() => setShowPhotoModal(true)}
              fullWidth
              style={{ marginTop: spacing.section }}
            />
          </>
        )}

        {screenState === 'analyzing' && (
          <View style={styles.analyzingBox}>
            <ActivityIndicator size="large" color={colors.ink} />
            <Text style={styles.analyzingText}>Checking it against your style profile…</Text>
          </View>
        )}

        {screenState === 'results' && result && verdictMeta && (
          <>
            <View style={[styles.verdictBadge, { backgroundColor: verdictMeta.bg }]}>
              <Text style={[styles.verdictLabel, { color: verdictMeta.fg }]}>
                {verdictMeta.label}
              </Text>
            </View>

            <Text style={styles.itemSummary}>
              {result.classification.color} {result.classification.subcategory || result.classification.category}
              {result.classification.pattern && result.classification.pattern !== 'solid' ? `, ${result.classification.pattern}` : ''}
            </Text>
            <Text style={styles.overallReasoning}>{result.overallReasoning}</Text>

            {!hasProfile && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  You haven't completed your color or body & fit analysis yet, so this verdict is
                  based on style alone. Complete those for a fuller check.
                </Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>THE BREAKDOWN</Text>
            <VerdictRow label="Color" detail={result.colorVerdict} />
            <VerdictRow label="Fit" detail={result.fitVerdict} />
            <VerdictRow label="Style" detail={result.styleVerdict} />

            {forecast && forecast.verdict !== 'unknown' && (
              <>
                <Text style={styles.sectionLabel}>WHAT IT WOULD COST YOU</Text>
                <View style={styles.forecastCard}>
                  <Text style={styles.forecastVerdict}>{verdictLabel(forecast.verdict)}</Text>
                  {forecast.projectedCostPerWear !== null && (
                    <Text style={styles.forecastNumber}>
                      ${forecast.projectedCostPerWear.toFixed(2)}
                      <Text style={styles.forecastPerWear}> per wear</Text>
                    </Text>
                  )}
                  <Text style={styles.forecastSummary}>{forecast.summary}</Text>
                  <Text style={styles.forecastBasis}>
                    Projected from {forecast.sampleSize} item
                    {forecast.sampleSize === 1 ? '' : 's'} you already own
                    {forecast.confidence === 'low' ? ' — treat as a rough guide' : ''}
                  </Text>
                </View>
              </>
            )}

            {ownedMatches.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>ALREADY IN YOUR CLOSET</Text>
                <Text style={styles.ownedIntro}>
                  You own {ownedMatches.length} similar {ownedMatches.length === 1 ? 'piece' : 'pieces'} - worth a look before you buy another.
                </Text>
                {ownedMatches.map((item) => (
                  <View key={item.itemId} style={styles.ownedRow}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.ownedThumb} />
                    ) : (
                      <View style={styles.ownedThumbPlaceholder} />
                    )}
                    <View style={styles.ownedInfo}>
                      <Text style={styles.ownedName}>{item.color} {item.subcategory}</Text>
                      <Text style={styles.ownedMeta}>
                        {item.wornCount > 0
                          ? `Worn ${item.wornCount}x${item.costPerWear !== null ? ` · $${item.costPerWear.toFixed(2)}/wear` : ''}`
                          : 'Never worn yet'}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {result.overallVerdict !== 'buy' && (
              <Button
                title="Shop something better matched"
                onPress={() => navigation.navigate('Shop', {
                  category: result.classification.category as any,
                  matchedOnly: true,
                })}
                fullWidth
                style={{ marginTop: spacing.section }}
              />
            )}

            <Button
              title="Check another item"
              variant="secondary"
              onPress={reset}
              fullWidth
              style={{ marginTop: result.overallVerdict !== 'buy' ? 12 : spacing.section }}
            />
          </>
        )}
      </ScrollView>

      <PhotoUploadModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoSelected={(uri) => {
          setShowPhotoModal(false);
          handlePhotoSelected(uri);
        }}
      />
    </SafeAreaView>
  );
}

function VerdictRow({ label, detail }: { label: string; detail: VerdictDetail }) {
  const icon = detail.matches === true ? '✓' : detail.matches === false ? '✕' : '?';
  const iconColor = detail.matches === true ? colors.camel : detail.matches === false ? colors.tobacco : colors.inkFaint;
  return (
    <View style={styles.verdictRow}>
      <Text style={[styles.verdictIcon, { color: iconColor }]}>{icon}</Text>
      <View style={styles.verdictTextWrap}>
        <Text style={styles.verdictRowLabel}>{label}</Text>
        <Text style={styles.verdictRowReasoning}>
          {detail.matches === null ? 'Not enough profile data yet' : detail.reasoning}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  header: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
  },
  content: {
    padding: spacing.page,
    paddingBottom: 60,
  },
  eyebrow: {
    ...textType.eyebrow,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 34,
    color: colors.ink,
  },
  subtitle: {
    ...textType.body,
    color: colors.inkMuted,
    marginTop: 12,
  },
  analyzingBox: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  analyzingText: {
    ...textType.body,
    color: colors.inkMuted,
    marginTop: 20,
  },
  verdictBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  verdictLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    letterSpacing: 1.4,
    color: colors.ink,
  },
  itemSummary: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.ink,
    marginTop: 16,
    textTransform: 'capitalize',
  },
  overallReasoning: {
    ...textType.body,
    color: colors.inkMuted,
    marginTop: 8,
  },
  noticeBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.paper,
    padding: 14,
  },
  noticeText: {
    ...textType.body,
    fontSize: 12,
    color: colors.inkMuted,
  },
  sectionLabel: {
    ...textType.eyebrow,
    marginTop: spacing.section,
    marginBottom: 12,
  },
  verdictRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  verdictIcon: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    width: 24,
  },
  verdictTextWrap: {
    flex: 1,
  },
  verdictRowLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 2,
  },
  verdictRowReasoning: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  priceLabel: {
    ...textType.eyebrow,
    marginTop: spacing.section,
    marginBottom: 8,
  },
  priceHelper: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  priceInput: {
    ...textType.body,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  forecastCard: {
    backgroundColor: colors.paper,
    padding: spacing.lg,
  },
  forecastVerdict: {
    ...textType.microLabel,
    color: colors.tobacco,
    marginBottom: 8,
  },
  forecastNumber: {
    fontFamily: fonts.serif,
    fontSize: 30,
    color: colors.ink,
  },
  forecastPerWear: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
  },
  forecastSummary: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 8,
  },
  forecastBasis: {
    ...textType.meta,
    fontSize: 11,
    marginTop: 8,
    color: colors.inkFaint,
  },
  ownedIntro: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  ownedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ownedThumb: {
    width: 44,
    height: 44,
    marginRight: 12,
    backgroundColor: colors.paper,
  },
  ownedThumbPlaceholder: {
    width: 44,
    height: 44,
    marginRight: 12,
    backgroundColor: colors.paper,
  },
  ownedInfo: {
    flex: 1,
  },
  ownedName: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  ownedMeta: {
    ...textType.meta,
    fontSize: 11,
    marginTop: 2,
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ScreenState = 'intro' | 'analyzing' | 'results';

const VERDICT_COPY: Record<StoreCheckResult['overallVerdict'], { label: string; bg: string }> = {
  buy: { label: 'BUY IT', bg: '#DCE8DC' },
  maybe: { label: 'MAYBE', bg: '#F2EBE3' },
  skip: { label: 'SKIP IT', bg: '#F0DCD8' },
};

export default function InStoreCheckScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [screenState, setScreenState] = useState<ScreenState>('intro');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [result, setResult] = useState<StoreCheckResult | null>(null);
  const [ownedMatches, setOwnedMatches] = useState<OwnedItemMatch[]>([]);
  const [hasProfile, setHasProfile] = useState(true);

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
              <Text style={styles.verdictLabel}>{verdictMeta.label}</Text>
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

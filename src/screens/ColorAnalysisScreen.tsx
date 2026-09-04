import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import PhotoUploadModal from '../components/PhotoUploadModal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';
import { colorAnalysisAPI, getCurrentUserId } from '../services/firebaseApi';
import { styleProfileService } from '../services/firestore';
import { ColorAnalysisResult, ColorSwatch, DEFAULT_PERSONAL_STYLE_PROFILE } from '../models/personalStyleProfile';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ScreenState = 'intro' | 'analyzing' | 'results';

const TIPS = [
  'Face the camera in natural daylight, not overhead lighting',
  'Remove sunglasses, hats, and heavy makeup if possible',
  'Use a plain background, and look straight at the camera',
];

export default function ColorAnalysisScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { toast, showToast, hideToast } = useToast();

  const [screenState, setScreenState] = useState<ScreenState>('intro');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [result, setResult] = useState<ColorAnalysisResult | null>(null);
  const [applying, setApplying] = useState(false);

  const handlePhotoSelected = async (uri: string) => {
    setScreenState('analyzing');
    try {
      const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
      const base64Image = `data:image/jpeg;base64,${base64}`;
      const analysis = await colorAnalysisAPI.analyze(base64Image, getCurrentUserId());
      setResult(analysis);
      setScreenState('results');
    } catch (error: any) {
      console.error('Error analyzing color season:', error);
      Alert.alert(
        'Analysis failed',
        error?.message || 'We couldn\'t analyze that photo. Please try again with a clear, well-lit selfie.'
      );
      setScreenState('intro');
    }
  };

  const handleApplyToProfile = async () => {
    if (!result) return;
    setApplying(true);
    try {
      const userId = getCurrentUserId();
      const existing = await styleProfileService.getStyleProfile(userId);
      const base = existing || DEFAULT_PERSONAL_STYLE_PROFILE;

      const paletteNames = result.palette.map((s) => s.name.toLowerCase());
      const primary = Array.from(new Set([...paletteNames.slice(0, 5), ...base.colorProfile.primary]));
      const secondary = Array.from(new Set([...paletteNames.slice(5), ...base.colorProfile.secondary]));

      await styleProfileService.saveStyleProfile(userId, {
        ...base,
        colorProfile: { ...base.colorProfile, primary, secondary },
        colorAnalysis: result,
      });

      showToast('Applied to your Style Profile', 'success');
      setTimeout(() => navigation.goBack(), 1200);
    } catch (error) {
      console.error('Error applying color analysis:', error);
      showToast('Failed to save. Please try again.', 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setScreenState('intro');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {screenState === 'intro' && (
          <>
            <Text style={styles.eyebrow}>PERSONAL COLOR ANALYSIS</Text>
            <Text style={styles.title}>What's your color season?</Text>
            <Text style={styles.subtitle}>
              A quick selfie tells us your undertone and seasonal color type, then we build a
              palette of shades that brighten your complexion and balance your coloring.
            </Text>

            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>FOR BEST RESULTS</Text>
              {TIPS.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipDash}>—</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <Button
              title="Take my color selfie"
              onPress={() => setShowPhotoModal(true)}
              fullWidth
              style={{ marginTop: spacing.section }}
            />
          </>
        )}

        {screenState === 'analyzing' && (
          <View style={styles.analyzingBox}>
            <ActivityIndicator size="large" color={colors.ink} />
            <Text style={styles.analyzingText}>Reading your undertone and contrast…</Text>
          </View>
        )}

        {screenState === 'results' && result && (
          <>
            <Text style={styles.eyebrow}>YOUR COLOR SEASON</Text>
            <Text style={styles.title}>{result.season}</Text>
            <Text style={styles.subtitle}>{result.description}</Text>

            <Text style={styles.sectionLabel}>YOUR PALETTE</Text>
            <View style={styles.swatchGrid}>
              {result.palette.map((swatch, i) => (
                <SwatchChip key={i} swatch={swatch} />
              ))}
            </View>

            {result.colorsToAvoid.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>COLORS TO AVOID</Text>
                <View style={styles.swatchGrid}>
                  {result.colorsToAvoid.map((swatch, i) => (
                    <SwatchChip key={i} swatch={swatch} muted />
                  ))}
                </View>
              </>
            )}

            <Button
              title="Apply to my style profile"
              onPress={handleApplyToProfile}
              loading={applying}
              fullWidth
              style={{ marginTop: spacing.section }}
            />
            <Button
              title="Retake photo"
              variant="ghost"
              onPress={handleRetake}
              disabled={applying}
              fullWidth
              style={{ marginTop: spacing.sm }}
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

      {toast.visible && (
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      )}
    </SafeAreaView>
  );
}

function SwatchChip({ swatch, muted = false }: { swatch: ColorSwatch; muted?: boolean }) {
  return (
    <View style={styles.swatchWrap}>
      <View style={[styles.swatch, { backgroundColor: swatch.hex }, muted && styles.swatchMuted]} />
      <Text style={styles.swatchName} numberOfLines={2}>{swatch.name}</Text>
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
  tipsBox: {
    borderRadius: radius.md,
    marginTop: spacing.section,
    backgroundColor: colors.paper,
    padding: spacing.lg,
  },
  tipsTitle: {
    ...textType.microLabel,
    color: colors.tobacco,
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  tipDash: {
    color: colors.camel,
    marginRight: 8,
    fontFamily: fonts.sans,
  },
  tipText: {
    ...textType.body,
    fontSize: 13,
    color: colors.ink,
    flex: 1,
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
  sectionLabel: {
    ...textType.eyebrow,
    marginTop: spacing.section,
    marginBottom: 12,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  swatchWrap: {
    borderRadius: radius.sm,
    width: 72,
  },
  swatch: {
    borderRadius: radius.sm,
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  swatchMuted: {
    opacity: 0.55,
  },
  swatchName: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 6,
    textAlign: 'center',
  },
});

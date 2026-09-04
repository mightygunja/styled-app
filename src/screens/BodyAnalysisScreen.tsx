import React, { useEffect, useState } from 'react';
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
import { closetAPI, getCurrentUserId } from '../services/api';
import { bodyAnalysisAPI, PhotoBodyEstimate } from '../services/firebaseApi';
import { styleProfileService } from '../services/firestore';
import {
  BodyType,
  BODY_TYPE_GUIDES,
  DEFAULT_PERSONAL_STYLE_PROFILE,
  WardrobeFocus,
  classifyBodyTypeFromQuiz,
  classifyMensBodyTypeFromQuiz,
  buildBodyAnalysisResult,
  wardrobeFitCheck,
} from '../models/personalStyleProfile';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenState = 'loading' | 'quiz' | 'refining' | 'results';

interface QuizOption<T extends string> {
  value: T;
  label: string;
}

interface QuizQuestion {
  key: string;
  prompt: string;
  options: QuizOption<string>[];
}

// The women's question set - also shown for 'all' and unset focus, since
// those profiles may span either wardrobe and this set predates the split.
const WOMENS_QUESTIONS: QuizQuestion[] = [
  {
    key: 'shouldersVsHips',
    prompt: 'How do your shoulders compare to your hips?',
    options: [
      { value: 'narrower', label: 'Shoulders are narrower than hips' },
      { value: 'similar', label: 'About the same width' },
      { value: 'wider', label: 'Shoulders are wider than hips' },
    ],
  },
  {
    key: 'waistDefinition',
    prompt: "How defined is your waist?",
    options: [
      { value: 'defined', label: 'Clearly defined - noticeably smaller than bust/hips' },
      { value: 'somewhat', label: 'Somewhat defined' },
      { value: 'minimal', label: 'Minimal definition' },
    ],
  },
  {
    key: 'bustVsHip',
    prompt: 'Is your bust or hip fuller?',
    options: [
      { value: 'bustFuller', label: 'Bust is fuller' },
      { value: 'hipFuller', label: 'Hips are fuller' },
      { value: 'balanced', label: 'About balanced' },
    ],
  },
  {
    key: 'fullestArea',
    prompt: 'Where do you carry the most fullness overall?',
    options: [
      { value: 'shoulders', label: 'Shoulders' },
      { value: 'bust', label: 'Bust' },
      { value: 'waist', label: 'Waist / midsection' },
      { value: 'hips', label: 'Hips' },
      { value: 'balanced', label: 'Evenly balanced' },
    ],
  },
];

// Menswear question set - feeds classifyMensBodyTypeFromQuiz, which only
// returns the five menswear frames OnboardingScreen offers for this focus.
const MENS_QUESTIONS: QuizQuestion[] = [
  {
    key: 'shouldersVsWaist',
    prompt: 'How do your shoulders compare to your waist?',
    options: [
      { value: 'narrower', label: 'Shoulders are narrower than my waist' },
      { value: 'similar', label: 'About the same width' },
      { value: 'broader', label: 'Shoulders are broader than my waist' },
    ],
  },
  {
    key: 'chestVsWaist',
    prompt: 'Is your chest or waist fuller?',
    options: [
      { value: 'chestFuller', label: 'Chest is fuller' },
      { value: 'waistFuller', label: 'Waist is fuller' },
      { value: 'balanced', label: 'About balanced' },
    ],
  },
  {
    key: 'fullestArea',
    prompt: 'Where do you carry the most fullness overall?',
    options: [
      { value: 'shoulders', label: 'Shoulders' },
      { value: 'chest', label: 'Chest' },
      { value: 'midsection', label: 'Waist / midsection' },
      { value: 'hips', label: 'Hips' },
      { value: 'balanced', label: 'Evenly balanced' },
    ],
  },
  {
    key: 'taper',
    prompt: 'How much does your torso taper from shoulders to waist?',
    options: [
      { value: 'strong', label: 'A clear V - noticeably narrower at the waist' },
      { value: 'slight', label: 'A slight taper' },
      { value: 'none', label: 'Barely any taper' },
    ],
  },
];

export default function BodyAnalysisScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { toast, showToast, hideToast } = useToast();

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [wardrobeFocus, setWardrobeFocus] = useState<WardrobeFocus>('all');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  const [photoEstimate, setPhotoEstimate] = useState<PhotoBodyEstimate | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [fitCheck, setFitCheck] = useState<{ matchCount: number; sampleItems: string[]; gapCategories: string[] } | null>(null);
  const [applying, setApplying] = useState(false);

  // The saved wardrobe focus decides which question set and classifier to
  // use, so a menswear user is asked about chest and taper, not bust - and
  // can only land on a menswear frame. Wording, not a data dependency: if
  // the profile read fails we default to the combined-wardrobe set.
  useEffect(() => {
    (async () => {
      try {
        const saved = await styleProfileService.getStyleProfile(getCurrentUserId());
        setWardrobeFocus(saved?.wardrobeFocus ?? 'all');
      } catch (error) {
        console.error('Error loading wardrobe focus:', error);
      } finally {
        setScreenState('quiz');
      }
    })();
  }, []);

  const isMens = wardrobeFocus === 'mens';
  const questions = isMens ? MENS_QUESTIONS : WOMENS_QUESTIONS;

  const runWardrobeFitCheck = async (type: BodyType) => {
    try {
      const response = await closetAPI.getItems(getCurrentUserId());
      const { matches, gapCategories } = wardrobeFitCheck(type, response.data);
      const sampleItems = matches
        .slice(0, 3)
        .map((m: any) => {
          const item = response.data.find((i: any) => i.id === m.itemId);
          return item ? `${item.color} ${item.subcategory || item.category}` : null;
        })
        .filter((s: string | null): s is string => !!s);
      setFitCheck({ matchCount: matches.length, sampleItems, gapCategories });
    } catch (error) {
      console.error('Error running wardrobe fit check:', error);
      // Non-critical - the rest of the results screen still works without it
    }
  };

  const selectAnswer = (value: string) => {
    const question = questions[questionIndex];
    const nextAnswers = { ...answers, [question.key]: value };
    setAnswers(nextAnswers);

    if (questionIndex < questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
      return;
    }

    // All 4 answered - classify instantly, on-device, no network call
    const type = isMens
      ? classifyMensBodyTypeFromQuiz(nextAnswers as any)
      : classifyBodyTypeFromQuiz(nextAnswers as any);
    setBodyType(type);
    setScreenState('results');
    runWardrobeFitCheck(type);
  };

  const goBackAQuestion = () => {
    if (questionIndex > 0) setQuestionIndex(questionIndex - 1);
    else navigation.goBack();
  };

  const handlePhotoSelected = async (uri: string) => {
    if (!bodyType) return;
    setScreenState('refining');
    try {
      const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
      const base64Image = `data:image/jpeg;base64,${base64}`;
      const estimate = await bodyAnalysisAPI.analyzePhoto(base64Image, getCurrentUserId(), bodyType);
      setPhotoEstimate(estimate);
      setScreenState('results');
    } catch (error: any) {
      console.error('Error analyzing body photo:', error);
      Alert.alert(
        'Analysis failed',
        error?.message || "We couldn't analyze that photo. Please try again with a full-length, front-facing photo."
      );
      setScreenState('results');
    }
  };

  const acceptPhotoEstimate = () => {
    if (!photoEstimate) return;
    setBodyType(photoEstimate.bodyType);
    runWardrobeFitCheck(photoEstimate.bodyType);
  };

  const handleApplyToProfile = async () => {
    if (!bodyType) return;
    setApplying(true);
    try {
      const userId = getCurrentUserId();
      const existing = await styleProfileService.getStyleProfile(userId);
      const base = existing || DEFAULT_PERSONAL_STYLE_PROFILE;

      const result = buildBodyAnalysisResult(
        bodyType,
        photoEstimate ? 'photo' : 'quiz',
        undefined
      );
      if (photoEstimate) {
        result.photoConfirmed = photoEstimate.bodyType === bodyType;
      }

      await styleProfileService.saveStyleProfile(userId, {
        ...base,
        fitPreferences: {
          highlight: result.highlight,
          downplay: result.downplay,
        },
        bodyAnalysis: result,
      });

      showToast('Applied to your Style Profile', 'success');
      setTimeout(() => navigation.goBack(), 1200);
    } catch (error) {
      console.error('Error applying body analysis:', error);
      showToast('Failed to save. Please try again.', 'error');
    } finally {
      setApplying(false);
    }
  };

  const guide = bodyType ? BODY_TYPE_GUIDES[bodyType] : null;
  const question = questions[questionIndex];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={screenState === 'quiz' ? goBackAQuestion : undefined} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {screenState === 'loading' && (
          <View style={styles.analyzingBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        )}

        {screenState === 'quiz' && (
          <>
            <Text style={styles.eyebrow}>BODY & FIT ANALYSIS · QUESTION {questionIndex + 1} OF {questions.length}</Text>
            <Text style={styles.title}>{question.prompt}</Text>
            <View style={styles.optionsList}>
              {question.options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.optionRow}
                  onPress={() => selectAnswer(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionText}>{opt.label}</Text>
                  <Text style={styles.optionChevron}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {screenState === 'refining' && (
          <View style={styles.analyzingBox}>
            <ActivityIndicator size="large" color={colors.ink} />
            <Text style={styles.analyzingText}>Reading your proportions from the photo…</Text>
          </View>
        )}

        {screenState === 'results' && bodyType && guide && (
          <>
            <Text style={styles.eyebrow}>YOUR BODY & FIT TYPE</Text>
            <Text style={styles.title}>{guide.label}</Text>
            <Text style={styles.subtitle}>{guide.description}</Text>

            {photoEstimate && (
              <View style={[styles.photoCard, photoEstimate.agreesWithQuiz === false && styles.photoCardDisagree]}>
                <Text style={styles.photoCardEyebrow}>
                  {photoEstimate.agreesWithQuiz === false ? 'PHOTO READ DIFFERENTLY' : 'PHOTO CONFIRMED'}
                </Text>
                <Text style={styles.photoCardText}>
                  Photo estimate: <Text style={styles.photoCardBold}>{BODY_TYPE_GUIDES[photoEstimate.bodyType].label}</Text> ({photoEstimate.confidence} confidence)
                </Text>
                <Text style={styles.photoCardReasoning}>{photoEstimate.reasoning}</Text>
                {photoEstimate.agreesWithQuiz === false && photoEstimate.bodyType !== bodyType && (
                  <View style={styles.photoCardActions}>
                    <Button
                      title={`Use photo result (${BODY_TYPE_GUIDES[photoEstimate.bodyType].label})`}
                      variant="secondary"
                      size="small"
                      onPress={acceptPhotoEstimate}
                    />
                    <Text style={styles.photoCardKeepNote}>or keep your quiz answer above</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.chipRow}>
              {guide.highlight.map((area) => (
                <View key={area} style={styles.chipHighlight}>
                  <Text style={styles.chipText}>Highlight: {area}</Text>
                </View>
              ))}
              {guide.downplay.map((area) => (
                <View key={area} style={styles.chipDownplay}>
                  <Text style={styles.chipText}>Downplay: {area}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>WHAT TO WEAR, BY CATEGORY</Text>
            {/* Menswear guides carry no dress guidance - skip empty categories
                rather than rendering a bare heading. */}
            {(['tops', 'bottoms', 'dresses', 'shoes', 'outerwear'] as const)
              .filter((cat) => guide.categoryGuidance[cat].length > 0)
              .map((cat) => (
              <View key={cat} style={styles.categoryBlock}>
                <Text style={styles.categoryName}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
                {guide.categoryGuidance[cat].map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Text style={styles.tipDash}>—</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            ))}

            <Text style={styles.sectionLabel}>WARDROBE FIT CHECK</Text>
            {fitCheck ? (
              fitCheck.matchCount > 0 ? (
                <View style={styles.fitCheckBox}>
                  <Text style={styles.fitCheckHeadline}>
                    {fitCheck.matchCount} {fitCheck.matchCount === 1 ? 'piece' : 'pieces'} in your closet already work for your shape
                  </Text>
                  {fitCheck.sampleItems.map((s, i) => (
                    <View key={i} style={styles.tipRow}>
                      <Text style={styles.tipDash}>—</Text>
                      <Text style={styles.tipText}>{s}</Text>
                    </View>
                  ))}
                  {fitCheck.gapCategories.length > 0 && (
                    <Text style={styles.fitCheckGap}>
                      You don't have anything cut for your shape in: {fitCheck.gapCategories.join(', ')}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.fitCheckBox}>
                  <Text style={styles.fitCheckHeadline}>
                    Nothing in your closet is tagged for this shape yet — the category guidance above is where to start.
                  </Text>
                </View>
              )
            ) : (
              <ActivityIndicator size="small" color={colors.inkMuted} style={{ marginTop: 8 }} />
            )}

            {!photoEstimate && (
              <Button
                title="Refine with a photo"
                variant="outline"
                onPress={() => setShowPhotoModal(true)}
                fullWidth
                style={{ marginTop: spacing.section }}
              />
            )}

            <Button
              title="Apply to my style profile"
              onPress={handleApplyToProfile}
              loading={applying}
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
    fontSize: 30,
    color: colors.ink,
  },
  subtitle: {
    ...textType.body,
    color: colors.inkMuted,
    marginTop: 12,
  },
  optionsList: {
    marginTop: spacing.section,
    gap: 12,
  },
  optionRow: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.paper,
    padding: 18,
  },
  optionText: {
    ...textType.body,
    color: colors.ink,
    flex: 1,
    paddingRight: 12,
  },
  optionChevron: {
    color: colors.camel,
    fontSize: 16,
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
  photoCard: {
    borderRadius: radius.sm,
    marginTop: spacing.section,
    backgroundColor: colors.paper,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.camel,
  },
  photoCardDisagree: {
    borderLeftColor: colors.tobacco,
  },
  photoCardEyebrow: {
    ...textType.microLabel,
    color: colors.tobacco,
    marginBottom: 8,
  },
  photoCardText: {
    ...textType.body,
    fontSize: 13,
    color: colors.ink,
  },
  photoCardBold: {
    fontFamily: fonts.sansSemiBold,
  },
  photoCardReasoning: {
    ...textType.body,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 6,
  },
  photoCardActions: {
    marginTop: 12,
    gap: 6,
  },
  photoCardKeepNote: {
    ...textType.meta,
    fontSize: 11,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.section,
  },
  chipHighlight: {
    borderRadius: radius.md,
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipDownplay: {
    borderRadius: radius.md,
    backgroundColor: colors.hair,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.ink,
  },
  sectionLabel: {
    ...textType.eyebrow,
    marginTop: spacing.section,
    marginBottom: 12,
  },
  categoryBlock: {
    marginBottom: 16,
  },
  categoryName: {
    fontFamily: fonts.serifMedium,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 6,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  tipDash: {
    color: colors.camel,
    marginRight: 8,
    fontFamily: fonts.sans,
  },
  tipText: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
    flex: 1,
  },
  fitCheckBox: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 16,
  },
  fitCheckHeadline: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 8,
  },
  fitCheckGap: {
    ...textType.body,
    fontSize: 12,
    color: colors.tobacco,
    marginTop: 8,
  },
});

/**
 * First-run survey.
 *
 * The previous version asked five questions and threw the answers away -
 * component state, one archetype string for the reveal, then discarded.
 * Nothing reached the recommendation engines, so a brand-new user got the
 * same blind suggestions as an empty profile.
 *
 * Every question here now writes into the same PersonalStyleProfile that
 * buildProfileMatchContext feeds to Shop, Explore and the daily outfits:
 *
 *   body type   -> bodyAnalysis (silhouettes, per-category guidance, keywords)
 *   style words -> styleArchetypes
 *   occasions   -> lifestyleWeights
 *   never-wears -> avoidRules (hard vetoes in every matcher)
 *
 * That is the point of asking at all: recommendations are personal from
 * minute one, before a single closet item exists. Nothing is asked that the
 * engine does not consume.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentUserId } from '../services/api';
import { styleProfileService } from '../services/firestore';
import {
  BODY_TYPES,
  BODY_TYPE_GUIDES,
  STYLE_ARCHETYPES,
  buildBodyAnalysisResult,
  BodyType,
  PersonalStyleProfile,
} from '../models/personalStyleProfile';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

type Step = 'welcome' | 'body' | 'words' | 'occasion' | 'never' | 'reveal';
const SURVEY_STEPS: Step[] = ['body', 'words', 'occasion', 'never'];

/** Short, neutral shape descriptors. Factual, not flattering or apologetic. */
const BODY_DESCRIPTORS: Record<BodyType, string> = {
  hourglass: 'Shoulders and hips balanced, waist defined',
  topHourglass: 'Curved, shoulders slightly leading the hips',
  bottomHourglass: 'Curved, hips slightly leading the shoulders',
  pear: 'Hips carry more than shoulders',
  invertedTriangle: 'Shoulders lead, hips narrow',
  rectangle: 'Fairly straight through shoulders, waist and hips',
  apple: 'Middle carries more, legs lead',
  diamond: 'Narrow shoulders and hips, fuller middle',
};

const OCCASIONS = [
  { label: 'Work', line: 'Office days do the heavy lifting', weights: { work: 0.55, casual: 0.2, social: 0.15, travel: 0.1 } },
  { label: 'Social', line: 'Dinners, dates, being seen', weights: { work: 0.15, casual: 0.25, social: 0.45, travel: 0.15 } },
  { label: 'Travel', line: 'Packing and going', weights: { work: 0.15, casual: 0.25, social: 0.15, travel: 0.45 } },
  { label: 'A bit of everything', line: 'No one context dominates', weights: { work: 0.25, casual: 0.35, social: 0.25, travel: 0.15 } },
];

/**
 * Never-wear options. The label is what the user reads; `rule` is the
 * lowercase substring the matchers veto against product text, so it has to be
 * a word that actually appears in product names and tags.
 */
const NEVER_OPTIONS: Array<{ label: string; rule: string }> = [
  { label: 'Heels', rule: 'heel' },
  { label: 'Skirts', rule: 'skirt' },
  { label: 'Dresses', rule: 'dress' },
  { label: 'Shorts', rule: 'shorts' },
  { label: 'Sleeveless', rule: 'sleeveless' },
  { label: 'Crop tops', rule: 'crop' },
  { label: 'Skinny fits', rule: 'skinny' },
  { label: 'Oversized fits', rule: 'oversized' },
  { label: 'Leather', rule: 'leather' },
  { label: 'Animal print', rule: 'animal print' },
];

const MAX_WORDS = 3;

export default function OnboardingScreen() {
  const { user, clearIsNewUser } = useAuth();
  const navigation = useNavigation();
  // First-run renders this as the whole stack (nothing to go back to);
  // existing users arrive as a pushed modal from the Home prompt. That one
  // bit decides the closing copy and whether completion pops or swaps stacks.
  const presentedAsRoute = navigation.canGoBack();
  const [step, setStep] = useState<Step>('welcome');
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [occasionIndex, setOccasionIndex] = useState<number | null>(null);
  const [nevers, setNevers] = useState<string[]>([]);
  const [finishing, setFinishing] = useState(false);

  // The save fires on entering the reveal so it is usually done before the
  // CTA is tapped; the CTA awaits it so a slow write cannot lose the answers.
  const savePromise = useRef<Promise<void> | null>(null);

  const firstName = (user?.displayName || 'there').split(' ')[0];

  const buildProfile = (): PersonalStyleProfile => ({
    lifestyleWeights: OCCASIONS[occasionIndex ?? 3].weights,
    styleArchetypes: words,
    avoidRules: nevers,
    // Colours are absent, not invented - they arrive when the user does the
    // colour analysis. The engines treat a missing palette as "no signal".
    colorProfile: { primary: [], secondary: [], stretch: [] },
    fitPreferences: bodyType
      ? {
          highlight: BODY_TYPE_GUIDES[bodyType].highlight,
          downplay: BODY_TYPE_GUIDES[bodyType].downplay,
        }
      : {},
    guidanceLevel: 'guided',
    ...(bodyType ? { bodyAnalysis: buildBodyAnalysisResult(bodyType, 'quiz') } : {}),
  });

  const startSave = () => {
    savePromise.current = styleProfileService
      .saveStyleProfile(getCurrentUserId(), buildProfile())
      .catch(error => {
        console.error('Error saving onboarding profile:', error);
        // Rethrow so the CTA's await can retry rather than silently losing
        // everything the user just told us.
        throw error;
      });
  };

  const handleFinishSurvey = () => {
    setStep('reveal');
    startSave();
  };

  const handleComplete = async () => {
    setFinishing(true);
    try {
      await (savePromise.current ?? Promise.resolve());
    } catch {
      // One retry, awaited. If Firestore is down twice, proceeding without
      // the profile beats trapping the user on the reveal screen.
      try {
        await styleProfileService.saveStyleProfile(getCurrentUserId(), buildProfile());
      } catch (error) {
        console.error('Onboarding profile save failed twice, continuing:', error);
      }
    } finally {
      setFinishing(false);
      if (presentedAsRoute) {
        navigation.goBack();
      } else {
        clearIsNewUser();
      }
    }
  };

  const toggleWord = (key: string) => {
    setWords(current =>
      current.includes(key)
        ? current.filter(w => w !== key)
        : current.length >= MAX_WORDS
          ? current
          : [...current, key]
    );
  };

  const toggleNever = (rule: string) => {
    setNevers(current =>
      current.includes(rule) ? current.filter(r => r !== rule) : [...current, rule]
    );
  };

  /* ---------------- shared chrome ---------------- */

  const progress = (current: Step) => {
    const index = SURVEY_STEPS.indexOf(current);
    return (
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${((index + 1) / SURVEY_STEPS.length) * 100}%` }]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {String(index + 1).padStart(2, '0')} / {String(SURVEY_STEPS.length).padStart(2, '0')}
        </Text>
      </View>
    );
  };

  /* ---------------- steps ---------------- */

  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.container}>
        <ImageBackground
          // The herringbone texture, not a stock photo - the same cloth the
          // login stage and app icon are made of.
          source={require('../../assets/textures/tailored.png')}
          style={styles.heroBg}
          resizeMode="cover"
        >
          <View style={styles.heroContent}>
            <Text style={styles.chapterLabel}>33 TRENDS · CHAPTER ONE</Text>
            <Text style={styles.heroTitle}>
              Meet your <Text style={styles.heroTitleAccent}>stylist</Text>.
            </Text>
            <Text style={styles.heroSubtitle}>
              Four questions, and every answer changes what gets recommended to you — before a
              single photo of your closet.
            </Text>
          </View>
        </ImageBackground>
        <View style={styles.footer}>
          <Text style={styles.timeLabel}>UNDER TWO MINUTES</Text>
          <Button
            title={`Hi, ${firstName} — let's begin`}
            variant="primary"
            fullWidth
            onPress={() => setStep('body')}
          />
          {presentedAsRoute && (
            <TouchableOpacity style={styles.notNow} onPress={() => navigation.goBack()}>
              <Text style={styles.notNowText}>Not now</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'body') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.surveyContent}>
          {progress('body')}
          <Text style={styles.eyebrow}>FIT</Text>
          <Text style={styles.question}>How are you built?</Text>
          <Text style={styles.questionNote}>
            This sets which cuts and silhouettes get recommended. Skip it and nothing is assumed.
          </Text>
          {BODY_TYPES.map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.option, bodyType === type && styles.optionActive]}
              onPress={() => setBodyType(current => (current === type ? null : type))}
              activeOpacity={0.85}
            >
              <Text style={[styles.optionTitle, bodyType === type && styles.optionTitleActive]}>
                {BODY_TYPE_GUIDES[type].label}
              </Text>
              <Text style={styles.optionLine}>{BODY_DESCRIPTORS[type]}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.stepFooter}>
            <Button
              title={bodyType ? 'Continue' : 'Skip for now'}
              variant={bodyType ? 'primary' : 'secondary'}
              fullWidth
              onPress={() => setStep('words')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'words') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.surveyContent}>
          {progress('words')}
          <Text style={styles.eyebrow}>TASTE</Text>
          <Text style={styles.question}>Which words sound like your style?</Text>
          <Text style={styles.questionNote}>Pick up to three.</Text>
          <View style={styles.chipWrap}>
            {Object.entries(STYLE_ARCHETYPES).map(([key, archetype]) => {
              const active = words.includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleWord(key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {archetype.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {words.length > 0 && (
            <Text style={styles.selectionEcho}>
              {words
                .map(w => STYLE_ARCHETYPES[w as keyof typeof STYLE_ARCHETYPES]?.description)
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
          <View style={styles.stepFooter}>
            <Button
              title="Continue"
              variant="primary"
              fullWidth
              disabled={words.length === 0}
              onPress={() => setStep('occasion')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'occasion') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.surveyContent}>
          {progress('occasion')}
          <Text style={styles.eyebrow}>YOUR WEEK</Text>
          <Text style={styles.question}>Where does your closet work hardest?</Text>
          <Text style={styles.questionNote}>This weights what your daily looks lean toward.</Text>
          {OCCASIONS.map((occasion, index) => (
            <TouchableOpacity
              key={occasion.label}
              style={[styles.option, occasionIndex === index && styles.optionActive]}
              onPress={() => setOccasionIndex(index)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.optionTitle, occasionIndex === index && styles.optionTitleActive]}
              >
                {occasion.label}
              </Text>
              <Text style={styles.optionLine}>{occasion.line}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.stepFooter}>
            <Button
              title="Continue"
              variant="primary"
              fullWidth
              disabled={occasionIndex === null}
              onPress={() => setStep('never')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 'never') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.surveyContent}>
          {progress('never')}
          <Text style={styles.eyebrow}>HARD LINES</Text>
          <Text style={styles.question}>Anything you simply don't wear?</Text>
          <Text style={styles.questionNote}>
            These become vetoes — nothing matching them will ever be suggested.
          </Text>
          <View style={styles.chipWrap}>
            {NEVER_OPTIONS.map(option => {
              const active = nevers.includes(option.rule);
              return (
                <TouchableOpacity
                  key={option.rule}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleNever(option.rule)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.stepFooter}>
            <Button
              title={nevers.length > 0 ? 'Finish' : 'Nothing off-limits — finish'}
              variant="primary"
              fullWidth
              onPress={handleFinishSurvey}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ---------------- reveal ---------------- */

  const wordNames = words
    .map(w => STYLE_ARCHETYPES[w as keyof typeof STYLE_ARCHETYPES]?.name)
    .filter(Boolean);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.surveyContent}>
        <Text style={styles.eyebrow}>YOUR STYLIST NOW KNOWS</Text>
        <Text style={styles.revealTitle}>
          {wordNames.length > 0 ? wordNames.join(' · ') : 'Your starting point'}
        </Text>

        <View style={styles.revealList}>
          {bodyType && (
            <View style={styles.revealRow}>
              <Text style={styles.revealKey}>CUTS</Text>
              <Text style={styles.revealValue}>
                {BODY_TYPE_GUIDES[bodyType].recommendedSilhouettes.slice(0, 3).join(', ')}
              </Text>
            </View>
          )}
          {occasionIndex !== null && (
            <View style={styles.revealRow}>
              <Text style={styles.revealKey}>LEANS</Text>
              <Text style={styles.revealValue}>{OCCASIONS[occasionIndex].label}</Text>
            </View>
          )}
          {nevers.length > 0 && (
            <View style={styles.revealRow}>
              <Text style={styles.revealKey}>NEVER</Text>
              <Text style={styles.revealValue}>
                {nevers.length} {nevers.length === 1 ? 'veto' : 'vetoes'} — those will not be
                suggested, ever
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.revealBody}>
          Every recommendation from here starts from these answers. The closet makes it sharper —
          and colour analysis lives in your Style Profile when you want to go deeper.
        </Text>

        <View style={styles.stepFooter}>
          <Button
            title={
              finishing
                ? 'One moment…'
                : presentedAsRoute
                  ? 'Done — style me sharper'
                  : 'Add my first closet items'
            }
            variant="primary"
            fullWidth
            disabled={finishing}
            onPress={handleComplete}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },

  heroBg: { flex: 1, justifyContent: 'flex-end' },
  heroContent: { padding: spacing.page, paddingBottom: spacing.section },
  chapterLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.camel,
    marginBottom: 14,
  },
  heroTitle: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 46, color: colors.bone },
  heroTitleAccent: { fontFamily: fonts.serifItalic, color: colors.camel },
  heroSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.bone,
    opacity: 0.85,
    marginTop: 12,
  },
  footer: { padding: spacing.page, paddingTop: spacing.lg },
  timeLabel: { ...textType.eyebrow, marginBottom: 12, textAlign: 'center' },
  notNow: { alignItems: 'center', paddingVertical: 14 },
  notNowText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.inkMuted },

  surveyContent: { padding: spacing.page, paddingBottom: 48, flexGrow: 1 },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.section,
  },
  progressTrack: { flex: 1, height: 2, backgroundColor: colors.hair },
  progressFill: { height: 2, backgroundColor: colors.ink },
  progressLabel: { ...textType.microLabel, fontSize: 9, color: colors.inkFaint },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  question: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 35, color: colors.ink },
  questionNote: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 8,
    marginBottom: spacing.lg,
  },

  option: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.md,
    marginBottom: 10,
  },
  optionActive: { borderColor: colors.ink, backgroundColor: colors.sand },
  optionTitle: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  optionTitleActive: { fontFamily: fonts.sansSemiBold },
  optionLine: { ...textType.body, fontSize: 12, color: colors.inkMuted, marginTop: 3 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  chipTextActive: { fontFamily: fonts.sansMedium, color: colors.white },
  selectionEcho: { ...textType.meta, fontSize: 12, lineHeight: 18, marginTop: spacing.md },

  stepFooter: { marginTop: 'auto', paddingTop: spacing.section },

  revealTitle: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: colors.ink },
  revealList: { marginTop: spacing.lg },
  revealRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  revealKey: {
    ...textType.microLabel,
    fontSize: 9,
    color: colors.tobacco,
    width: 56,
    marginTop: 3,
  },
  revealValue: {
    flex: 1,
    ...textType.body,
    fontSize: 14,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  revealBody: { ...textType.body, color: colors.inkMuted, marginTop: spacing.lg, lineHeight: 22 },
});

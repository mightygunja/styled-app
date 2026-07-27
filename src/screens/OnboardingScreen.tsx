import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { colors, fonts, type as textType } from '../theme/designSystem';

const WELCOME_BG =
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80';

interface QuizQuestion {
  question: string;
  options: string[];
}

const QUESTIONS: QuizQuestion[] = [
  { question: 'Which silhouette feels most you?', options: ['Structured', 'Fluid', 'Relaxed', 'Sharp'] },
  { question: 'Which color mood do you gravitate to?', options: ['Warm neutrals', 'Cool tones', 'Bold color', 'Monochrome'] },
  { question: 'Work, social, or travel — where does your closet work hardest?', options: ['Work', 'Social', 'Travel', 'A bit of everything'] },
  { question: 'What matters most when you get dressed?', options: ['Comfort', 'Polish', 'Making a statement', 'Ease'] },
  { question: 'What do you want your clothes to do for you?', options: ['Feel effortless', 'Feel confident', 'Feel current', 'Feel like me'] },
];

const ARCHETYPE_BY_SILHOUETTE: Record<string, string> = {
  Structured: 'Quiet Luxe',
  Fluid: 'Boho Ease',
  Relaxed: 'Elevated Casual',
  Sharp: 'Minimal Edge',
};

type Step = 'welcome' | 'quiz' | 'reveal';

export default function OnboardingScreen() {
  const { user, clearIsNewUser } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const firstName = (user?.displayName || 'there').split(' ')[0];

  const handleAnswer = (option: string) => {
    const next = [...answers, option];
    setAnswers(next);
    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex(questionIndex + 1);
    } else {
      setStep('reveal');
    }
  };

  const archetype = ARCHETYPE_BY_SILHOUETTE[answers[0]] || 'Quiet Luxe';

  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.container}>
        <ImageBackground source={{ uri: WELCOME_BG }} style={styles.heroBg} imageStyle={styles.heroBgImage}>
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.chapterLabel}>STYLED · CHAPTER ONE</Text>
            <Text style={styles.heroTitle}>
              Meet your <Text style={styles.heroTitleAccent}>stylist</Text>.
            </Text>
            <Text style={styles.heroSubtitle}>
              Not an algorithm. Not a shop. A quiet, knowing friend who understands your closet
              — and how you want to feel in it.
            </Text>
          </View>
        </ImageBackground>
        <View style={styles.footer}>
          <Text style={styles.timeLabel}>THREE MINUTES</Text>
          <Button title={`Hi, ${firstName} — let's begin`} variant="primary" fullWidth onPress={() => setStep('quiz')} />
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'quiz') {
    const q = QUESTIONS[questionIndex];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.quizWrap}>
          <Text style={styles.quizEyebrow}>STYLE DNA · FIVE QUESTIONS</Text>
          <Text style={styles.quizTitle}>
            A quick read on your <Text style={styles.heroTitleAccent}>taste</Text>.
          </Text>

          <View style={styles.quizCard}>
            <View style={styles.quizCardTop}>
              <Text style={styles.quizCardLabel}>QUESTION {String(questionIndex + 1).padStart(2, '0')}</Text>
              <Text style={styles.quizCardLabel}>{questionIndex + 1} / {QUESTIONS.length}</Text>
            </View>
            <Text style={styles.quizQuestion}>{q.question}</Text>
            <View style={styles.optionGrid}>
              {q.options.map(opt => (
                <TouchableOpacity key={opt} style={styles.optionButton} onPress={() => handleAnswer(opt)}>
                  <Text style={styles.optionButtonText}>{opt.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.revealWrap}>
        <Text style={styles.quizEyebrow}>STYLE DNA · YOUR RESULT</Text>
        <Text style={styles.archetypeReveal}>{archetype}</Text>
        <Text style={styles.revealBody}>
          I only have a few answers to work with — add a few pieces from your closet and I can
          start putting real looks together for you.
        </Text>
        <Button title="Add my first closet items" variant="primary" fullWidth onPress={clearIsNewUser} style={{ marginTop: 32 }} />
        <TouchableOpacity onPress={clearIsNewUser} style={{ marginTop: 16 }}>
          <Text style={styles.skipText}>SKIP FOR NOW</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  heroBg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroBgImage: {
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28,28,28,0.35)',
  },
  heroContent: {
    padding: 24,
    paddingBottom: 40,
  },
  chapterLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.bone,
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: fonts.serif,
    fontSize: 40,
    color: colors.bone,
    lineHeight: 44,
  },
  heroTitleAccent: {
    fontFamily: fonts.serifItalic,
    color: colors.camel,
  },
  heroSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: 'rgba(253,251,250,0.85)',
    marginTop: 16,
    lineHeight: 21,
  },
  footer: {
    padding: 24,
  },
  timeLabel: {
    ...textType.eyebrow,
    textAlign: 'center',
    marginBottom: 16,
  },
  quizWrap: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  quizEyebrow: {
    ...textType.eyebrow,
  },
  quizTitle: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.ink,
    marginTop: 8,
    marginBottom: 28,
  },
  quizCard: {
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    padding: 20,
  },
  quizCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quizCardLabel: {
    ...textType.eyebrow,
  },
  quizQuestion: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 20,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.hair,
    paddingVertical: 16,
    alignItems: 'center',
  },
  optionButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.ink,
  },
  revealWrap: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  archetypeReveal: {
    fontFamily: fonts.serif,
    fontSize: 44,
    color: colors.ink,
    marginTop: 12,
  },
  revealBody: {
    ...textType.body,
    color: colors.inkMuted,
    marginTop: 16,
  },
  skipText: {
    ...textType.eyebrow,
    textAlign: 'center',
  },
});

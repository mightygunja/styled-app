import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import SocialAuthButtons from '../components/SocialAuthButtons';
import LoginHero from '../components/LoginHero';
import BrandWordmark from '../components/BrandWordmark';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signIn } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Staged entrance: the stack settles, then the wordmark, then the form.
  const heroIn = useRef(new Animated.Value(0)).current;
  const titleIn = useRef(new Animated.Value(0)).current;
  const formIn = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(heroIn, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroIn, titleIn, formIn]);

  const rise = (value: Animated.Value, distance = 22) => ({
    opacity: value,
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
    ],
  });

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      // Inline rather than an Alert - a modal for a missing field is a heavy
      // interruption, and it cannot be styled to match anything.
      setError('Enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      await signIn(email.trim(), password);
      // Navigation is handled by the auth state change.
    } catch (err: any) {
      setError(err?.message || 'That did not work. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const pressIn = () =>
    Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () =>
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={rise(heroIn, 32)}>
            <LoginHero />
          </Animated.View>

          <Animated.View style={[styles.intro, rise(titleIn)]}>
            <Text style={styles.eyebrow}>PERSONAL STYLING</Text>
            {/* The brand lockup - the same drawing as the splash, so the
                handoff from splash to login reads as one screen settling. */}
            <BrandWordmark variant="hero" />
            {/* One fixed thesis. The stage above carries the rotating story
                now; two competing lines of moving text is noise. */}
            {/* The two pains the research ranked highest: the 84% who stare
                at a full closet with nothing to wear, and the quarter of
                every closet that money bought and nobody wears. */}
            <Text style={styles.standfirst}>
              You own more than you think. 33 Trends turns it into outfits every morning — and
              stops you buying pieces you'll never wear.{' '}
              <Text style={styles.standfirstFree}>Free — all of it.</Text>
            </Text>
          </Animated.View>

          <Animated.View style={[styles.form, rise(formIn)]}>
            {/* Into the error box, not a Toast. Toast truncates at two lines and
                these messages now carry instructions. */}
            <SocialAuthButtons disabled={loading} onError={setError} />

            <TextInput
              style={[styles.input, focused === 'email' && styles.inputFocused]}
              placeholder="Email"
              placeholderTextColor={colors.inkFaint}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!loading}
            />

            <TextInput
              style={[styles.input, focused === 'password' && styles.inputFocused]}
              placeholder="Password"
              placeholderTextColor={colors.inkFaint}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />

            {/* A boxed block, not a single line. Sign-in failures now carry
                actual instructions, and 12pt tobacco on bone loses them. */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Animated.View style={{ transform: [{ scale: pressScale }] }}>
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                onPressIn={pressIn}
                onPressOut={pressOut}
                disabled={loading}
                activeOpacity={1}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>Sign in</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Signup')}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                New here? <Text style={styles.linkTextBold}>Create a free account</Text>
              </Text>
            </TouchableOpacity>

            {/* The consumable version of what the app does, for anyone who
                scrolls past the form before committing. Three steps, because
                that is the actual product loop. */}
            <View style={styles.howSection}>
              <Text style={styles.howLabel}>HOW IT WORKS</Text>
              {/* Ordered by the research: the cataloguing barrier is why
                  people abandon competitor apps, so ease goes first; the
                  never-worn money pain carries the sharpest number and
                  closes. */}
              {[
                {
                  n: '01',
                  title: 'Your closet, in minutes',
                  line: 'Snap a photo — the AI reads colour, cut, fabric and fit. Import a receipt and add a whole haul at once.',
                },
                {
                  n: '02',
                  title: 'Never "nothing to wear"',
                  line: 'A look every morning for the day you actually have — work, weekend, weather — from clothes you own.',
                },
                {
                  n: '03',
                  title: "Buy nothing that won't earn its place",
                  line: 'The average closet is a quarter never-worn. See how many outfits a piece unlocks before you pay.',
                },
              ].map(step => (
                <View key={step.n} style={styles.howRow}>
                  <Text style={styles.howNumber}>{step.n}</Text>
                  <View style={styles.howText}>
                    <Text style={styles.howTitle}>{step.title}</Text>
                    <Text style={styles.howLine}>{step.line}</Text>
                  </View>
                </View>
              ))}

              {/* "Free" is only credible with the why attached. Naming the
                  business model turns the claim from bait into a promise -
                  the only way this app earns is by recommending well. */}
              <View style={styles.freeBox}>
                <Text style={styles.freeLabel}>FREE, ACTUALLY</Text>
                <Text style={styles.freeTitle}>Every feature. No subscription, no trial clock.</Text>
                {/* "Your wear stats included" is aimed at a specific,
                    documented resentment: competitors charge $60 a year to
                    see your own most- and least-worn pieces. */}
                <Text style={styles.freeLine}>
                  Nothing in 33 Trends is locked behind a tier — your wear stats included. When you
                  buy a piece we recommended, the retailer pays us a small commission, so the only
                  way we make money is by being right about what suits you.
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  content: { paddingHorizontal: spacing.page, paddingBottom: 48, paddingTop: spacing.sm },

  intro: { marginTop: spacing.lg },
  eyebrow: { ...textType.eyebrow, marginBottom: 10 },

  form: { marginTop: spacing.section, gap: 12 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  // Focus is a full-strength border against the hairline of the resting
  // state - the same distinction the rest of the app uses.
  inputFocused: { borderColor: colors.ink },
  errorBox: {
    backgroundColor: colors.sand,
    padding: 14,
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },

  button: {
    backgroundColor: colors.ink,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { backgroundColor: colors.hair },
  buttonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    letterSpacing: 0.4,
    color: colors.white,
  },

  linkButton: { paddingVertical: 14, alignItems: 'center' },
  linkText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  linkTextBold: { fontFamily: fonts.sansMedium, color: colors.ink },

  standfirst: {
    ...textType.body,
    color: colors.inkMuted,
    marginTop: 14,
  },

  howSection: {
    marginTop: spacing.section,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    paddingTop: spacing.lg,
  },
  howLabel: { ...textType.eyebrow, marginBottom: spacing.md },
  howRow: {
    flexDirection: 'row',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  // The serif number is the design system's list voice - same treatment as
  // the emitter rankings on the carbon screen.
  howNumber: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.camel,
    width: 44,
  },
  howText: { flex: 1 },
  howTitle: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  howLine: { ...textType.body, fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginTop: 3 },

  // Emphasis by weight, not colour or size - the register this system
  // stresses things in.
  standfirstFree: { fontFamily: fonts.sansSemiBold, color: colors.ink },

  freeBox: {
    backgroundColor: colors.paper,
    padding: spacing.lg,
    marginTop: spacing.xs,
  },
  freeLabel: { ...textType.eyebrow, marginBottom: 10 },
  freeTitle: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 24, color: colors.ink },
  freeLine: { ...textType.body, fontSize: 13, lineHeight: 20, color: colors.inkMuted, marginTop: 8 },
});

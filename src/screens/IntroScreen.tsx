/**
 * First-open introduction.
 *
 * Shown once, before the login gate, to a brand-new install: what 33 Trends
 * actually does and why it's worth an account, in three lines. Skipping the
 * pitch was the old behaviour — a cold login form with no reason to fill it
 * in. The screen marks itself seen the moment the CTA is tapped, so every
 * later launch goes straight to Login.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import BrandWordmark from '../components/BrandWordmark';
import Button from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, radius, spacing, type as textType } from '../theme/designSystem';

export const INTRO_SEEN_KEY = 'intro:seen';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PROMISES: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; line: string }> = [
  {
    icon: 'shirt-outline',
    title: 'Dressed from your own closet',
    line: 'Photograph your pieces once. Every morning: real looks composed from clothes you already own, matched to your day and your weather.',
  },
  {
    icon: 'trending-up-outline',
    title: 'Real trends, made wearable',
    line: "What's genuinely moving from Copenhagen to Seoul — and for each trend, the way in from your closet, not someone else's.",
  },
  {
    icon: 'bag-outline',
    title: 'Shop only what earns a place',
    line: 'Suggestions ranked by how many new outfits a piece unlocks with what you own. No infinite scroll, no filler.',
  },
];

export default function IntroScreen() {
  const navigation = useNavigation<NavigationProp>();

  const handleContinue = () => {
    AsyncStorage.setItem(INTRO_SEEN_KEY, '1').catch(() => {});
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandBlock}>
          <BrandWordmark variant="hero" />
        </View>

        <Text style={styles.eyebrow}>YOUR PERSONAL STYLIST</Text>
        <Text style={styles.title}>
          Wear what's moving — <Text style={styles.titleAccent}>as you</Text>.
        </Text>
        <Text style={styles.subtitle}>
          33 Trends is a stylist that knows two things: what's actually happening in fashion right
          now, and what's actually hanging in your closet.
        </Text>

        <View style={styles.promiseList}>
          {PROMISES.map(promise => (
            <View key={promise.title} style={styles.promiseRow}>
              <View style={styles.promiseIcon}>
                <Ionicons name={promise.icon} size={18} color={colors.rust} />
              </View>
              <View style={styles.promiseText}>
                <Text style={styles.promiseTitle}>{promise.title}</Text>
                <Text style={styles.promiseLine}>{promise.line}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.timeLabel}>FREE · SET UP IN UNDER TWO MINUTES</Text>
        <Button title="Get started" variant="primary" fullWidth onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  content: { padding: spacing.page, paddingTop: spacing.section },
  brandBlock: { alignItems: 'center', marginBottom: spacing.section },

  eyebrow: { ...textType.eyebrow, marginBottom: 10 },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: colors.ink },
  titleAccent: { fontFamily: fonts.serifItalic, color: colors.rust },
  subtitle: {
    ...textType.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
    marginTop: 10,
  },

  promiseList: { marginTop: spacing.section, gap: 12 },
  promiseRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  promiseIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  promiseText: { flex: 1 },
  promiseTitle: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  promiseLine: {
    ...textType.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkMuted,
    marginTop: 3,
  },

  footer: {
    padding: spacing.page,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  timeLabel: { ...textType.eyebrow, textAlign: 'center', marginBottom: 12 },
});

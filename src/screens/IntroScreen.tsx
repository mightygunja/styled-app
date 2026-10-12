/**
 * First-open introduction - and, on the web, the public landing page a
 * search engine or a first-time visitor reads at `/`.
 *
 * Shown once, before the login gate, to a brand-new install. It leads with
 * the one thing no other closet app does - city-level trends translated into
 * the reader's own closet - because daily outfits, weather and a digital
 * closet are table stakes in this category (the October 2026 site
 * assessment lists seven apps that have all three). Then it answers, on the
 * page, the questions a visitor had no way to answer before: what a result
 * looks like, where the trend data comes from, what happens to closet photos,
 * and how a free product pays for itself. Everything stated here is true of
 * the app as built; nothing is a placeholder.
 *
 * The screen marks itself seen the moment the CTA is tapped, so every later
 * launch goes straight to Login.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import BrandWordmark from '../components/BrandWordmark';
import Button from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { SEED_TRENDS } from '../data/seedTrends';
import { colors, fonts, radius, spacing, type as textType } from '../theme/designSystem';

export const INTRO_SEEN_KEY = 'intro:seen';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Ordered by what sets the product apart, not by the order a user meets it:
// the trend layer first, because every competitor already has the other two.
const PROMISES: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; line: string }> = [
  {
    icon: 'trending-up-outline',
    title: 'City trends, worn from your closet',
    line: "What's genuinely moving in Copenhagen, Seoul, Milan, Lagos or Marrakesh - at what stage, and how each trend is worn where you live. Then the way in from clothes you already own, not someone else's.",
  },
  {
    icon: 'shirt-outline',
    title: 'Dressed from what you own',
    line: 'Photograph your pieces once. Every morning: a real look composed from your closet, matched to your day and your weather, with the reason it works.',
  },
  {
    icon: 'bag-outline',
    title: 'Shop by outfits unlocked, not by feed',
    line: 'A few suggestions, ranked by how many new outfits each piece would create with what you have. Most apps show you a gap; this shows you the number.',
  },
];

/** The trend the sample is drawn from: the first editorial seed, the season's base note. */
const SAMPLE_TREND = SEED_TRENDS[0];

const STAGE_LABEL: Record<string, string> = {
  emerging: 'Emerging',
  rising: 'Rising',
  peak: 'At its peak',
  fading: 'Fading',
};

/** Real counts from the shipped trend data, so the numbers on the page cannot drift from the product. */
function trendFacts() {
  const cities = new Set<string>();
  SEED_TRENDS.forEach(t => {
    cities.add(t.region);
    (t.regions ?? []).forEach(r => cities.add(r));
  });
  return { trends: SEED_TRENDS.length, cities: cities.size };
}

export default function IntroScreen() {
  const navigation = useNavigation<NavigationProp>();
  const facts = trendFacts();

  const handleContinue = () => {
    AsyncStorage.setItem(INTRO_SEEN_KEY, '1').catch(() => {});
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandBlock}>
          <BrandWordmark variant="hero" />
        </View>

        <Text style={styles.eyebrow}>THE STYLIST THAT KNOWS YOUR CITY</Text>
        <Text style={styles.title}>
          Wear what's moving — <Text style={styles.titleAccent}>as you</Text>.
        </Text>
        <Text style={styles.subtitle}>
          Most closet apps hand you a daily outfit from the weather. 33 Trends starts from what is
          actually happening in fashion's capitals right now, works out how each trend is worn in
          your city, and shows the way in from the clothes already hanging in your closet.
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

        {/* A result before the sign-up: one real trend from the current
            report, in the form the app gives it, and the shape of a morning. */}
        <Text style={styles.sectionLabel}>SEE IT BEFORE YOU SIGN UP</Text>
        <Text style={styles.sectionTitle}>One trend from this season's report</Text>
        <View style={styles.sampleCard}>
          <Text style={styles.sampleStage}>
            {STAGE_LABEL[SAMPLE_TREND.stage].toUpperCase()} · {SAMPLE_TREND.region.toUpperCase()}
            {SAMPLE_TREND.regions?.length ? ` · ${SAMPLE_TREND.regions.slice(0, 3).join(', ').toUpperCase()}` : ''}
          </Text>
          <Text style={styles.sampleName}>{SAMPLE_TREND.name}</Text>
          <Text style={styles.sampleSummary}>{SAMPLE_TREND.summary}</Text>
          <Text style={styles.sampleKicker}>THE WAY IN</Text>
          <Text style={styles.sampleBody}>{SAMPLE_TREND.stylingNote}</Text>
          <Text style={styles.sampleBody}>
            <Text style={styles.sampleBold}>If you own none of it: </Text>
            {SAMPLE_TREND.entryPiece}.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.inlineLink}
            onPress={() => navigation.navigate('Trending')}
          >
            <Text style={styles.inlineLinkText}>
              See all {facts.trends} trends across {facts.cities} cities
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.rust} />
          </TouchableOpacity>
        </View>

        <View style={styles.sampleCard}>
          <Text style={styles.sampleKicker}>WHAT A MORNING LOOKS LIKE · EXAMPLE</Text>
          <Text style={styles.sampleName}>
            Tuesday, 62° and overcast — a day made for wool and quiet colour.
          </Text>
          <Text style={styles.sampleBody}>
            Grey wide-leg trousers, your cream knit tucked in, the navy blazer over it, loafers.
            Wide-leg tailoring is at its peak in Copenhagen and Paris; worn this way it reads as
            yours, not as a costume. Swap the blazer for the trench if it rains.
          </Text>
          <Text style={styles.sampleFoot}>
            Every look names the pieces from your own closet and says why they work together. The
            pieces above are an illustration; yours will be yours.
          </Text>
        </View>

        {/* The questions a free product built on personal photos has to
            answer on the page, not in a policy nobody opens. */}
        <Text style={styles.sectionLabel}>STRAIGHT ANSWERS</Text>

        <View style={styles.answer}>
          <Text style={styles.answerTitle}>Where the trends come from</Text>
          <Text style={styles.answerBody}>
            An editorial trend desk follows runway, street style and what is selling in fashion's
            capitals - from Copenhagen and Milan to Seoul, Lagos and Marrakesh. Each trend is
            written up with the cities it is strongest in, its stage (emerging, rising, at its
            peak, fading), the pieces that carry it and how to wear it. Reports are drafted with AI
            tools and reviewed by an editor before they are published; nothing reaches you
            unreviewed. The app then weighs each trend for where you live, so a Marrakesh reader
            and a Copenhagen reader see the same season differently.
          </Text>
        </View>

        <View style={styles.answer}>
          <Text style={styles.answerTitle}>What happens to your closet photos</Text>
          <Text style={styles.answerBody}>
            Your photos are stored with Google Firebase under access rules that let only your
            account read them. They are analysed once, by AI services including OpenAI's API, to
            read colour, cut, fabric and fit - and those providers are not permitted to train on
            them. Nothing is used for advertising, nothing is sold, and deleting your account
            deletes the photos with it.
          </Text>
          <TouchableOpacity accessibilityRole="button" style={styles.inlineLink} onPress={() => navigation.navigate('Privacy')}>
            <Text style={styles.inlineLinkText}>Read the privacy policy</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.rust} />
          </TouchableOpacity>
        </View>

        <View style={styles.answer}>
          <Text style={styles.answerTitle}>How a free app that tells you to buy less makes money</Text>
          <Text style={styles.answerBody}>
            When you buy something through a link in the app, the retailer pays us a small
            commission. That is the whole business model: no subscription, no ads, no paid
            placement. The obvious conflict is handled in the ranking - suggestions are scored by
            how many outfits a piece unlocks with your closet, never by what it pays us, and the
            main suggestion rail only carries pieces that unlock at least one. We would rather
            you bought one right thing a season than ten wrong ones.
          </Text>
          <TouchableOpacity accessibilityRole="button" style={styles.inlineLink} onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.inlineLinkText}>Read the affiliate disclosure</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.rust} />
          </TouchableOpacity>
        </View>

        <View style={styles.answer}>
          <Text style={styles.answerTitle}>Who makes it</Text>
          <Text style={styles.answerBody}>
            33 Trends is built by Gunja Consulting, Inc. in Chicago. It is new: the people using it
            today are early members, and we would rather earn the testimonials than invent them.
          </Text>
          <TouchableOpacity accessibilityRole="button" style={styles.inlineLink} onPress={() => navigation.navigate('About')}>
            <Text style={styles.inlineLinkText}>About 33 Trends</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.rust} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.timeLabel}>FREE · EVERY FEATURE · SET UP IN UNDER TWO MINUTES</Text>
        <Button title="Get started" variant="primary" fullWidth onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  content: {
    padding: spacing.page,
    paddingTop: spacing.section,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
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

  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 8 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: colors.ink, marginBottom: spacing.md },
  sampleCard: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: 12,
  },
  sampleStage: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 1, color: colors.rust },
  sampleName: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, color: colors.ink, marginTop: 6 },
  sampleSummary: { ...textType.body, fontSize: 14, lineHeight: 21, color: colors.ink, marginTop: 8 },
  sampleKicker: { ...textType.eyebrow, marginTop: spacing.md, marginBottom: 4 },
  sampleBody: { ...textType.body, fontSize: 14, lineHeight: 21, color: colors.inkMuted, marginTop: 6 },
  sampleBold: { fontFamily: fonts.sansSemiBold, color: colors.ink },
  sampleFoot: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.inkFaint, marginTop: spacing.md },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, alignSelf: 'flex-start' },
  inlineLinkText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.rust },

  answer: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.hair },
  answerTitle: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink },
  answerBody: { ...textType.body, fontSize: 14, lineHeight: 21, color: colors.inkMuted, marginTop: 6 },

  footer: {
    padding: spacing.page,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  timeLabel: { ...textType.eyebrow, textAlign: 'center', marginBottom: 12 },
});

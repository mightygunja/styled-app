/**
 * The public trend page: what the desk currently has moving, with the
 * catalogue pieces that illustrate each trend - readable and shoppable
 * without an account. The signed-in Trend Report (TrendInsightsScreen) does
 * the real work of fitting trends to a closet and a city; this page exists
 * so that the trends and the product links are on the open web, where
 * search engines and affiliate-network reviewers can see them.
 *
 * Logged out, the Firestore trend registry is unreadable and
 * getPublishedTrends degrades to the editorial seeds; that is the expected
 * path here, not a failure.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import BrandWordmark from '../components/BrandWordmark';
import BackButton from '../components/BackButton';
import PublicPieces, { FocusToggle, PublicFocus } from '../components/PublicPieces';
import { useAuth } from '../contexts/AuthContext';
import { getPublishedTrends } from '../services/trendService';
import { piecesForTrend } from '../services/trendLooks';
import { FashionTrend } from '../models/fashionTrend';
import { curatedCatalogNotice } from '../services/affiliateNetwork';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

const STAGE_LABEL: Record<FashionTrend['stage'], string> = {
  emerging: 'Emerging',
  rising: 'Rising',
  peak: 'At its peak',
  fading: 'Fading',
};

export default function TrendsPublicScreen() {
  const navigation = useNavigation<any>();
  const { user, isNewUser } = useAuth();
  const [trends, setTrends] = useState<FashionTrend[] | null>(null);
  const [focus, setFocus] = useState<PublicFocus>('womens');

  useEffect(() => {
    let cancelled = false;
    getPublishedTrends()
      .then(list => { if (!cancelled) setTrends(list); })
      .catch(() => { if (!cancelled) setTrends([]); });
    return () => { cancelled = true; };
  }, []);

  const notice = curatedCatalogNotice();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate(user ? (isNewUser ? 'Onboarding' : 'MainTabs') : 'Login');
          }}
          style={styles.back}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandWordmark variant="header" />
        <Text style={styles.eyebrow}>THE TREND REPORT</Text>
        <Text style={styles.title}>What’s in style right now</Text>
        <Text style={styles.intro}>
          The trends our desk currently has moving, where each one is strongest, and the pieces that
          carry it. Signed in, the report goes further: which of these you already own, and how each
          trend is worn where you live.
        </Text>

        {user ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.reportLink}
            onPress={() => navigation.navigate('TrendInsights')}
          >
            <Text style={styles.reportLinkText}>Open your personal trend report</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.rust} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>SHOWING PIECES FOR</Text>
          <FocusToggle focus={focus} onChange={setFocus} />
        </View>

        {trends === null ? (
          <ActivityIndicator color={colors.rust} style={{ marginTop: spacing.section }} />
        ) : trends.length === 0 ? (
          <Text style={styles.intro}>The report could not be loaded. Try again in a moment.</Text>
        ) : (
          trends.map(trend => {
            const women = piecesForTrend(trend, 'womens', { limit: 4 });
            const men = piecesForTrend(trend, 'mens', { limit: 4 });
            return (
              <View key={trend.id} style={styles.trend}>
                <Text style={styles.stage}>
                  {STAGE_LABEL[trend.stage].toUpperCase()} · {trend.region.toUpperCase()}
                  {trend.regions && trend.regions.length > 0 ? ` · ${trend.regions.slice(0, 3).join(', ').toUpperCase()}` : ''}
                </Text>
                <Text style={styles.trendName}>{trend.name}</Text>
                <Text style={styles.summary}>{trend.summary}</Text>
                {!!trend.stylingNote && <Text style={styles.stylingNote}>{trend.stylingNote}</Text>}
                {!!trend.entryPiece && (
                  <Text style={styles.entry}>
                    <Text style={styles.entryLabel}>Start with </Text>
                    {trend.entryPiece}.
                  </Text>
                )}
                <PublicPieces
                  eyebrow="PIECES THAT CARRY IT"
                  title=""
                  women={women}
                  men={men}
                  focus={focus}
                  onFocusChange={setFocus}
                  disclosure={false}
                />
              </View>
            );
          })
        )}

        {!!notice && <Text style={styles.disclosure}>{notice}</Text>}

        {!user && (
          <View style={styles.cta}>
            <Text style={styles.ctaLabel}>SEE IT AGAINST YOUR CLOSET</Text>
            <Text style={styles.ctaTitle}>Which of these do you already own?</Text>
            <Text style={styles.ctaLine}>
              Photograph your closet and the report tells you which trends you can wear tonight from
              what is hanging there, and the single piece that would unlock the rest. Free — every feature.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.ctaButton}
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={styles.ctaButtonText}>Create a free account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  content: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.md,
    paddingBottom: 64,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  headerBar: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  back: { paddingHorizontal: 0, marginBottom: 0 },
  eyebrow: { ...textType.eyebrow, marginTop: spacing.lg },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: colors.ink, marginTop: 8 },
  intro: {
    fontFamily: fonts.serifItalic,
    fontSize: 16,
    lineHeight: 25,
    color: colors.inkMuted,
    marginTop: spacing.md,
  },
  reportLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  reportLinkText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.rust },
  toggleRow: { marginTop: spacing.lg },
  toggleLabel: { ...textType.eyebrow, marginBottom: 8 },
  trend: {
    marginTop: spacing.section,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    paddingTop: spacing.lg,
  },
  stage: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 1, color: colors.rust },
  trendName: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: colors.ink, marginTop: 6 },
  summary: { ...textType.body, color: colors.ink, marginTop: 10 },
  stylingNote: { ...textType.body, fontSize: 14, lineHeight: 21, color: colors.inkMuted, marginTop: 8 },
  entry: { ...textType.body, fontSize: 14, lineHeight: 21, color: colors.ink, marginTop: 8 },
  entryLabel: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  disclosure: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, color: colors.inkFaint, marginTop: spacing.section },
  cta: {
    borderRadius: radius.md,
    marginTop: spacing.section,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.lg,
  },
  ctaLabel: { ...textType.eyebrow, marginBottom: 8 },
  ctaTitle: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, color: colors.ink },
  ctaLine: { ...textType.body, fontSize: 13, lineHeight: 20, color: colors.inkMuted, marginTop: 8, marginBottom: spacing.md },
  ctaButton: { borderRadius: radius.full, backgroundColor: colors.rust, paddingVertical: 15, alignItems: 'center' },
  ctaButtonText: { fontFamily: fonts.sansMedium, fontSize: 14, letterSpacing: 0.4, color: colors.white },
});

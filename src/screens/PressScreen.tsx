/**
 * Press kit: the page a journalist, partner or network reviewer needs in
 * order to write about 33 Trends and link to it - a plain description,
 * the facts, the brand files, and a human to contact. Public and
 * pre-rendered like the other logged-out pages.
 *
 * Everything stated here must be true of the product today; the facts
 * block reads its numbers from the shipped data rather than repeating them.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import BrandWordmark from '../components/BrandWordmark';
import BackButton from '../components/BackButton';
import PublicFooter from '../components/PublicFooter';
import SiteLink from '../components/SiteLink';
import { useAuth } from '../contexts/AuthContext';
import { GUIDES } from '../data/guides';
import { SEED_TRENDS } from '../data/seedTrends';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

const SITE = 'https://www.thirtythreetrends.com';
const CONTACT_EMAIL = 'support@thirtythreetrends.com';

const BOILERPLATE =
  '33 Trends is an AI personal stylist that tracks what is moving in fashion’s capitals, works out how each trend is worn where you live, and dresses you from the clothes you already own. Photograph your closet once and it composes a look every morning for your day and your weather, shows the way into the season’s trends from your own wardrobe, and ranks the few pieces worth buying by how many new outfits each would unlock. It is free, every feature, and earns a commission only when a purchase is made through the app. 33 Trends is available on the web at thirtythreetrends.com and on iOS.';

const FILES: Array<{ label: string; path: string; note: string }> = [
  { label: 'Wordmark, colour', path: '/brand/33-trends-wordmark.png', note: 'PNG, transparent, 1570 × 1036' },
  { label: 'Wordmark, white', path: '/brand/33-trends-wordmark-white.png', note: 'PNG, transparent, for dark backgrounds' },
  { label: 'Logo mark', path: '/brand/33-trends-logo.png', note: 'PNG, transparent, 1604 × 1066' },
  { label: 'Share image', path: '/og-image.png', note: 'PNG, 1200 × 630' },
];

function DownloadLink({ label, path, note }: { label: string; path: string; note: string }) {
  const url = `${SITE}${path}`;
  const open = () => Linking.openURL(url).catch(() => Alert.alert('Could not open', url));
  const anchor = Platform.OS === 'web' ? ({ href: url, hrefAttrs: { target: '_blank', rel: 'noopener' } } as any) : {};
  return (
    <TouchableOpacity style={styles.fileRow} onPress={open} accessibilityRole="link" accessibilityLabel={`Download ${label}`}>
      <Ionicons name="download-outline" size={18} color={colors.rust} />
      <View style={{ flex: 1 }}>
        <Text {...anchor} style={styles.fileLabel}>{label}</Text>
        <Text style={styles.fileNote}>{note}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function PressScreen() {
  const navigation = useNavigation<any>();
  const { user, isNewUser } = useAuth();
  const cities = new Set<string>();
  SEED_TRENDS.forEach(t => {
    cities.add(t.region);
    (t.regions ?? []).forEach(r => cities.add(r));
  });

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
        <Text style={styles.eyebrow}>PRESS</Text>
        <Text style={styles.title}>Writing about 33 Trends</Text>
        <Text style={styles.intro}>
          Everything you need to describe the product accurately and link to it: a short description,
          the facts, the brand files, and a person to ask.
        </Text>

        <Text style={styles.h2}>In one paragraph</Text>
        <Text style={styles.p}>{BOILERPLATE}</Text>

        <Text style={styles.h2}>In one line</Text>
        <Text style={styles.p}>The AI stylist that brings city trends into your own closet.</Text>

        <Text style={styles.h2}>The facts</Text>
        <View style={styles.facts}>
          <Fact label="What it is" value="A free AI personal stylist, on the web and iOS" />
          <Fact label="What sets it apart" value="City-level fashion trends, translated into the clothes a person already owns, and shopping ranked by the outfits a piece unlocks" />
          <Fact label="Trend coverage" value={`${SEED_TRENDS.length} trends this season across ${cities.size} cities, from Copenhagen and Milan to Seoul, Lagos and Marrakech`} />
          <Fact label="Editorial" value={`${GUIDES.length} published style guides, open to anyone`} />
          <Fact label="Business model" value="Affiliate commission on purchases made through the app. No subscription, no ads, no paid placement" />
          <Fact label="Privacy" value="Closet photos are visible only to the member and are deleted with the account" />
          <Fact label="Based in" value="Chicago, Illinois" />
          <Fact label="Website" value="thirtythreetrends.com" />
        </View>

        <Text style={styles.h2}>Brand files</Text>
        <Text style={styles.p}>
          Use the wordmark as supplied, on a plain background, without recolouring or stretching. The
          logo mark may stand alone at small sizes.
        </Text>
        <View style={styles.files}>
          {FILES.map(f => <DownloadLink key={f.path} {...f} />)}
        </View>

        <Text style={styles.h2}>Linking to us</Text>
        <Text style={styles.p}>
          Link to the home page, to the public trend report at thirtythreetrends.com/trending, or to any of
          the style guides. Every public page is readable without an account.
        </Text>
        <View style={styles.linkRow}>
          <SiteLink screen="Trending" style={styles.inlineLink}>The trend report</SiteLink>
          <SiteLink screen="GuideCityStyle" style={styles.inlineLink}>Dressing for your city</SiteLink>
          <SiteLink screen="About" style={styles.inlineLink}>About 33 Trends</SiteLink>
        </View>

        <Text style={styles.h2}>Contact</Text>
        <Text style={styles.p}>
          For interviews, screenshots, early access on iOS, or anything not covered here, write to{' '}
          <Text
            style={styles.inlineLink}
            onPress={() =>
              Linking.openURL(`mailto:${CONTACT_EMAIL}`).catch(() =>
                Alert.alert('No mail app found', `Write to us at ${CONTACT_EMAIL}.`)
              )
            }
          >
            {CONTACT_EMAIL}
          </Text>
          . We answer within two working days.
        </Text>

        <PublicFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm, width: '100%', maxWidth: 720, alignSelf: 'center' },
  back: { paddingHorizontal: 0, marginBottom: 0 },
  content: { paddingHorizontal: spacing.page, paddingTop: spacing.md, paddingBottom: 64, width: '100%', maxWidth: 720, alignSelf: 'center' },
  eyebrow: { ...textType.eyebrow, marginTop: spacing.lg },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: colors.ink, marginTop: 8 },
  intro: { fontFamily: fonts.serifItalic, fontSize: 16, lineHeight: 25, color: colors.inkMuted, marginTop: spacing.md },
  h2: { fontFamily: fonts.sansSemiBold, fontSize: 16, color: colors.ink, marginTop: spacing.lg, marginBottom: 8 },
  p: { ...textType.body, fontSize: 15, lineHeight: 24, color: colors.ink },
  facts: { borderTopWidth: 1, borderTopColor: colors.hair },
  fact: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hair, gap: 4 },
  factLabel: { ...textType.eyebrow, fontSize: 10 },
  factValue: { ...textType.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  files: { gap: 10, marginTop: 8 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  fileLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.rust, textDecorationLine: 'underline' },
  fileNote: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 8, marginTop: 8 },
  inlineLink: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.rust, textDecorationLine: 'underline' },
});

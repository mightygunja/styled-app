/**
 * Public pages: About, Privacy, Terms.
 *
 * These exist for the reader who has NOT signed in - affiliate network
 * reviewers, App Store review, and anyone deciding whether to trust the app
 * with photos of their closet. They are registered in both navigator branches
 * so they are reachable logged-out and logged-in, and the content states what
 * the app actually does with data rather than boilerplate that promises
 * nothing.
 *
 * The prose here is written from the real data flows in this codebase. If a
 * flow changes - new data collected, new processor, new retention - the
 * matching section here must change in the same commit.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import BrandWordmark from '../components/BrandWordmark';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

const CONTACT_EMAIL = 'support@thirtythreetrends.com';
const EFFECTIVE_DATE = 'August 14, 2026';

function PublicPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const navigation = useNavigation();
  const { user, isNewUser } = useAuth();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            // Cold load (deep link / web refresh) - route to whichever branch
            // this user's navigator actually has, as GuideScreens does.
            else (navigation as any).navigate(user ? (isNewUser ? 'Onboarding' : 'MainTabs') : 'Login');
          }}
          style={styles.back}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <BrandWordmark variant="header" />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {children}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Questions? Write to{' '}
            <Text
              style={styles.footerLink}
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            >
              {CONTACT_EMAIL}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

export function AboutScreen() {
  return (
    <PublicPage eyebrow="ABOUT" title="What 33 Trends is">
      <P>
        33 Trends is a personal styling app built on a simple observation: most people already own
        more good clothes than they think, and still buy pieces they never wear.
      </P>
      <P>
        You photograph the clothes you own and the app builds a digital closet - reading colour,
        cut, fabric and fit from each photo. From there it composes outfit recommendations every
        day, matched to the occasion you're dressing for, the weather, and a style profile built
        from a short survey about your build, taste and hard limits.
      </P>
      <P>
        When the app recommends something to buy, the recommendation is scored against what you
        already own - pieces that fill a real gap in your wardrobe, with the reason stated. We
        would rather tell you not to buy something than recommend a piece that won't earn its
        place.
      </P>
      <P>
        The app also tracks what is genuinely moving in fashion - an editor-reviewed trend
        report spanning Copenhagen to Seoul - and makes it personal: which trends your closet
        already carries, how to wear them as yourself, and the one piece worth adding when
        you're a step away. Your hard limits stay respected by default, and on the rare
        occasion a trend argues for crossing one, the app says so plainly instead of sneaking
        it past you.
      </P>
      <Section heading="How it's funded">
        <P>
          33 Trends is free - every feature, no subscription. When you buy a piece through a link
          in the app, the retailer pays us a small commission. That is the entire business model,
          and it only works if the recommendations are actually right for you. We do not run
          display advertising and we do not sell personal data.
        </P>
      </Section>
      <Section heading="Who we are">
        <P>
          33 Trends is owned and operated by Gunja Consulting, Inc., based in Chicago,
          Illinois. The web app at thirtythreetrends.com is live today, and the iOS app is on
          its way to the App Store.
        </P>
      </Section>
    </PublicPage>
  );
}

export function PrivacyScreen() {
  return (
    <PublicPage eyebrow={`PRIVACY POLICY · EFFECTIVE ${EFFECTIVE_DATE.toUpperCase()}`} title="Your data, plainly">
      <P>
        This policy describes what 33 Trends collects, why, and what happens to it. It is written
        to be read, not skimmed past.
      </P>
      <Section heading="What we collect">
        <P>
          Account details: your email address and the name you give us, or the profile shared by
          Google or Apple if you sign in that way.
        </P>
        <P>
          Your closet: the photos you take of your clothes and the details attached to them -
          category, colour, brand, price if you enter it, and how often you record wearing a
          piece.
        </P>
        <P>
          Your style profile: your answers to the style survey - body type, style words,
          occasions, and anything you tell us you never wear.
        </P>
        <P>
          Approximate location: city-level location to fetch local weather for outfit
          suggestions. We do not track or store precise GPS movements.
        </P>
        <P>
          Shopping activity in the app: which recommended products are shown and which are
          tapped, recorded as aggregate counts attributed to the screen they appeared on. This
          measures whether recommendations are useful. It is not a browsing profile and it is not
          sold or shared.
        </P>
      </Section>
      <Section heading="How it's used">
        <P>
          Everything collected serves one purpose: styling you. Photos are analysed to identify
          garment attributes. Your profile and closet feed the recommendation engine that
          composes outfits and scores shop suggestions. Nothing is used for advertising to you
          elsewhere.
        </P>
        <P>
          Garment photos and text are processed by AI services (including OpenAI's API) to read
          attributes like colour, fabric and fit, and to generate styling notes. These providers
          process the data to provide the service and are not permitted to use it to train their
          models.
        </P>
      </Section>
      <Section heading="Where it lives">
        <P>
          Data is stored with Google Firebase (authentication, database and photo storage) in the
          United States, protected by access rules that restrict each account's data to that
          account.
        </P>
      </Section>
      <Section heading="Affiliate links">
        <P>
          When you tap through to a retailer, you leave 33 Trends and the retailer's own privacy
          policy applies. Affiliate networks (such as Sovrn or Rakuten Advertising) may set
          cookies on the retailer's site to attribute the purchase - that attribution is how the
          app is funded. We share no personal information with them; they see only that a click
          arrived from 33 Trends.
        </P>
      </Section>
      <Section heading="What we don't do">
        <P>
          We do not sell personal data. We do not run third-party advertising. We do not share
          your closet, photos or profile with anyone except the processors named above, and them
          only to operate the service.
        </P>
      </Section>
      <Section heading="Deleting your data">
        <P>
          Account → Delete account removes your sign-in and your data - closet, photos, profile
          and history. This is permanent. You can also email us and we will delete it for you.
        </P>
      </Section>
      <Section heading="Changes">
        <P>
          If this policy changes materially, the effective date above changes and the app will
          say so before the new version applies.
        </P>
      </Section>
    </PublicPage>
  );
}

export function TermsScreen() {
  return (
    <PublicPage eyebrow={`TERMS OF SERVICE · EFFECTIVE ${EFFECTIVE_DATE.toUpperCase()}`} title="The agreement, plainly">
      <Section heading="The service">
        <P>
          33 Trends provides digital wardrobe management and AI styling recommendations, free of
          charge, for your personal use. You must be at least 16 to use it.
        </P>
      </Section>
      <Section heading="Your content">
        <P>
          Your photos and closet data remain yours. By uploading them you give us the licence
          needed to store and process them to provide the service - analysing garments, composing
          outfits, scoring recommendations - and nothing more. Delete your account and that
          licence ends with it.
        </P>
      </Section>
      <Section heading="Recommendations are advice">
        <P>
          Outfit suggestions, fit guidance and shopping recommendations are automated advice,
          offered in good faith. What you wear and what you buy are your decisions. Product
          availability, prices and returns are the retailer's responsibility, not ours.
        </P>
      </Section>
      <Section heading="Affiliate disclosure">
        <P>
          Links to retailers are affiliate links: if you buy, the retailer pays us a commission
          at no extra cost to you. This funds the service and does not change what we recommend -
          recommendations are scored against your profile and closet, not against commission
          rates.
        </P>
      </Section>
      <Section heading="Fair use">
        <P>
          Don't abuse the service: no scraping, no reselling access, no uploading content that
          is unlawful or that you have no right to, no attempts to break or overload the
          systems. We may suspend accounts that do.
        </P>
      </Section>
      <Section heading="Warranty and liability">
        <P>
          The service is provided as-is, without warranty. To the fullest extent the law allows,
          our liability for any claim arising from the service is limited to the amount you paid
          to use it - which is nothing. Nothing in these terms limits liability that cannot
          lawfully be limited.
        </P>
      </Section>
      <Section heading="Changes and termination">
        <P>
          We may update these terms; material changes will be announced in the app before they
          apply. You can stop using the service and delete your account at any time.
        </P>
      </Section>
    </PublicPage>
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
  back: { paddingVertical: 8, marginBottom: spacing.sm },
  backText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.inkMuted },
  eyebrow: { ...textType.eyebrow, marginTop: spacing.lg },
  title: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
    marginTop: 8,
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    paddingTop: spacing.md,
  },
  sectionHeading: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 8,
  },
  paragraph: {
    ...textType.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  footer: {
    marginTop: spacing.section,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    paddingTop: spacing.md,
  },
  footerText: { ...textType.body, fontSize: 13, color: colors.inkMuted },
  footerLink: { fontFamily: fonts.sansMedium, color: colors.ink },
});

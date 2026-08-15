/**
 * Style guides: the site's indexable content layer.
 *
 * Each guide targets a query people actually search for and delivers real
 * advice on it - then connects the advice to the feature that automates it.
 * These pages are what give search engines something to rank beyond the
 * brand name; the app screens behind the login wall never will.
 *
 * Registered in every navigator branch (see AppNavigator) so they cold-load
 * logged-out, and cross-linked to each other so a crawler that finds one
 * finds all six.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import BrandWordmark from '../components/BrandWordmark';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

export interface GuideMeta {
  route: string;
  path: string;
  label: string;
  title: string;
  description: string;
}

/** One list drives routes, linking config, SEO meta, footers and cross-links. */
export const GUIDES: GuideMeta[] = [
  {
    route: 'GuideCapsule',
    path: 'guides/capsule-wardrobe',
    label: 'Capsule wardrobes',
    title: 'How to Build a Capsule Wardrobe You Will Actually Wear',
    description:
      'A practical capsule wardrobe guide: how many pieces you need, how to choose them from clothes you already own, and the mistake that sinks most capsules.',
  },
  {
    route: 'GuideNothingToWear',
    path: 'guides/nothing-to-wear',
    label: 'Nothing to wear',
    title: 'Full Closet, Nothing to Wear? The Actual Fix',
    description:
      'Why a full closet still feels unwearable - and the three practical fixes: seeing what you own, pairing it deliberately, and diagnosing the real gaps.',
  },
  {
    route: 'GuideCostPerWear',
    path: 'guides/cost-per-wear',
    label: 'Cost per wear',
    title: 'Cost Per Wear: The Only Math That Stops Bad Purchases',
    description:
      'How to calculate cost per wear, what counts as a good number, and how the math changes what you buy - with worked examples.',
  },
  {
    route: 'GuideColorSeasons',
    path: 'guides/color-analysis',
    label: 'Color seasons',
    title: 'Color Seasons, Plainly: Find the Colors That Suit You',
    description:
      'Seasonal color analysis without the mystique: undertone, contrast, the four seasons and their subtypes, and how to test your palette at home.',
  },
  {
    route: 'GuideBodyTypes',
    path: 'guides/body-types',
    label: 'Body types',
    title: 'Dressing for Your Body Type: A Practical Guide',
    description:
      'The eight common body shapes, what actually flatters each one, and why the goal is proportion - not hiding. A guide free of rules that shame.',
  },
  {
    route: 'GuideWardrobeGaps',
    path: 'guides/wardrobe-gaps',
    label: 'Wardrobe gaps',
    title: 'What to Buy Next: Finding the Real Gaps in Your Wardrobe',
    description:
      'How to tell a real wardrobe gap from a shopping impulse: the outfit-unlock test, the orphan audit, and a short list of gaps most closets share.',
  },
];

function GuidePage({
  route,
  eyebrow,
  title,
  intro,
  children,
}: {
  route: string;
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  const navigation = useNavigation<any>();
  const { user, isNewUser } = useAuth();

  const others = GUIDES.filter(g => g.route !== route);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate(user ? (isNewUser ? 'Onboarding' : 'MainTabs') : 'Login');
          }}
          style={styles.back}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <BrandWordmark variant="header" />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.intro}>{intro}</Text>
        {children}

        {/* The pitch, after the substance - the advice above works without
            the app; the app just does it automatically. */}
        {!user && (
          <View style={styles.cta}>
            <Text style={styles.ctaLabel}>DO THIS AUTOMATICALLY</Text>
            <Text style={styles.ctaTitle}>33 Trends does this math for your actual closet</Text>
            <Text style={styles.ctaLine}>
              Photograph what you own and get daily outfits, wear tracking, and shopping
              suggestions scored against your real wardrobe. Free — every feature.
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

        <View style={styles.moreSection}>
          <Text style={styles.moreLabel}>MORE GUIDES</Text>
          {others.map(g => (
            <TouchableOpacity
              key={g.route}
              accessibilityRole="button"
              style={styles.moreRow}
              onPress={() => navigation.navigate(g.route)}
            >
              <Text style={styles.moreTitle}>{g.title}</Text>
              <Text style={styles.moreArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

function B({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}

function LI({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.li}>
      <Text style={styles.liDot}>·</Text>
      <Text style={[styles.p, { flex: 1, marginBottom: 0 }]}>{children}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */

export function GuideCapsuleScreen() {
  return (
    <GuidePage
      route="GuideCapsule"
      eyebrow="STYLE GUIDE"
      title="How to build a capsule wardrobe you'll actually wear"
      intro="A capsule wardrobe is a small set of pieces that all work together, so getting dressed stops being a decision. The idea is old and sound. The way most people execute it is why most capsules fail by week three."
    >
      <H>Start from what you wear, not what you admire</H>
      <P>
        The classic mistake is building a capsule from an idealized self: the minimalist in the
        photos, all camel coats and cream knits. If your actual life is school runs and video
        calls, that capsule will hang there untouched while you re-wear the same jeans.
      </P>
      <P>
        Go through the laundry, not the closet. The clothes that cycle through the wash every
        week are your real style. A capsule built around your ten most-worn pieces will get
        worn, because it already is.
      </P>
      <H>The arithmetic that matters: combinations, not count</H>
      <P>
        Whether a capsule is 20 pieces or 40 matters less than whether the pieces multiply. Five
        tops and five bottoms that all pair give you 25 outfits. The same ten pieces where only
        half pair give you six. When you evaluate a piece, the question is never "is it nice" —
        it's "how many outfits does it unlock with what's already here."
      </P>
      <LI>
        <B>Anchor on neutrals, add colour deliberately.</B> Two-thirds of a working capsule sits
        in a tight neutral family, which is what lets everything pair. Colour comes in as
        accents that all work with the same base.
      </LI>
      <LI>
        <B>Match formality levels.</B> A blazer and joggers both earn their place — in different
        outfits. Pieces pair when they sit near each other on the formality scale, which is why
        a capsule wants a centre of gravity: mostly work, or mostly weekend, tilted to how your
        weeks actually go.
      </LI>
      <LI>
        <B>One pattern per outfit.</B> Solids multiply; patterns divide. Keep patterned pieces to
        a quarter of the capsule and they stay special instead of stranded.
      </LI>
      <H>Run the numbers before you buy anything</H>
      <P>
        A capsule is the one wardrobe project where buying comes last. First list what you own
        that already qualifies, then find the genuine holes — usually one good pair of shoes at
        the right formality, or the layer that makes summer pieces work in October. Fill those,
        and only those.
      </P>
    </GuidePage>
  );
}

export function GuideNothingToWearScreen() {
  return (
    <GuidePage
      route="GuideNothingToWear"
      eyebrow="STYLE GUIDE"
      title='Full closet, "nothing to wear"'
      intro="Standing in front of a full closet feeling like there's nothing in it is one of the most common experiences in fashion — and it isn't about not owning enough. It's three specific, fixable problems wearing one disguise."
    >
      <H>Problem one: you can't see what you own</H>
      <P>
        Memory holds maybe thirty garments; most closets hold well over a hundred. Everything
        folded below eye level or compressed at the rail's end effectively doesn't exist at the
        moment of decision. That's why the same eight outfits repeat: they're the visible ones.
      </P>
      <P>
        The fix is an inventory you can browse — photograph what you own, once. It sounds
        tedious and it takes an afternoon, but it converts "what do I own?" from an act of
        memory into an act of looking, and the difference is immediate.
      </P>
      <H>Problem two: pieces, not pairings</H>
      <P>
        Shops sell pieces; mornings need outfits. If nothing in your head connects the green
        skirt to anything, the green skirt is dead stock no matter how much you liked it in the
        fitting room. Most "nothing to wear" closets are full of individually good clothes with
        no assigned partners.
      </P>
      <P>
        Deliberate pairing beats morning improvisation. When you have fifteen minutes — not
        when you're late — build combinations: does the skirt work with the grey knit? At the
        same formality? One pattern between them? Save what works. A morning choice between
        prepared outfits takes seconds; a morning search across a hundred pieces takes the
        will to live.
      </P>
      <H>Problem three: a real gap, misdiagnosed</H>
      <P>
        Sometimes the feeling is accurate — not "nothing to wear" but "nothing to wear{' '}
        <B>for this</B>." A wardrobe of excellent weekend clothes fails a formal Tuesday. That's
        not a shopping problem in general; it's one missing category, and it's diagnosable:
        sort what you own by occasion and see which column is thin. Buy for the thin column
        and nothing else, or the problem returns with interest.
      </P>
    </GuidePage>
  );
}

export function GuideCostPerWearScreen() {
  return (
    <GuidePage
      route="GuideCostPerWear"
      eyebrow="STYLE GUIDE"
      title="Cost per wear: the only math that stops bad purchases"
      intro="Price tells you what a garment costs to buy. Cost per wear tells you what it costs to own. The two numbers disagree constantly, and the second one is the one that empties your account."
    >
      <H>The formula, and a worked pair</H>
      <P>
        Cost per wear = price ÷ times worn. A $200 coat worn 100 times over three winters costs
        $2 a wear. A $40 going-out top worn twice costs $20 a wear. The coat is five times the
        price and a tenth of the cost — and the sale rack is where the arithmetic gets most
        vicious, because "70% off" prices a piece you'll wear once at its full absurdity.
      </P>
      <H>What a good number looks like</H>
      <LI>
        <B>Under $1 per wear</B> is the territory of true staples — the jeans, the white
        sneakers, the work trousers. Almost anything worn weekly gets here within a year.
      </LI>
      <LI>
        <B>$1–5 per wear</B> is healthy for seasonal pieces and occasion clothes that repeat:
        the summer dress, the interview blazer.
      </LI>
      <LI>
        <B>Over $10 per wear</B> deserves a question. One-event clothes live here, which is
        occasionally fine — a wedding is a wedding — but a closet with many residents in this
        band is a closet bought on impulse.
      </LI>
      <H>Use it before you buy, not after</H>
      <P>
        The audit is useful; the pre-purchase estimate is the money-saver. Before buying, guess
        honestly: how many times will this be worn in the next year? Multiply real occasions,
        not hypothetical ones — "if I get invited to a gallery opening" is zero occasions.
        Divide the price by that number. If the answer embarrasses you, the piece has failed
        before the register.
      </P>
      <P>
        The estimate has a hidden dependency: a piece gets worn in proportion to how many
        outfits it joins. The same white shirt is 20 outfits in one closet and 2 in another.
        Cost per wear is really combinations per dollar — which is why the same purchase can be
        smart for your friend and foolish for you.
      </P>
    </GuidePage>
  );
}

export function GuideColorSeasonsScreen() {
  return (
    <GuidePage
      route="GuideColorSeasons"
      eyebrow="STYLE GUIDE"
      title="Color seasons, plainly"
      intro="Seasonal color analysis has a mystique problem — draped scarves, certified consultants, four-figure sessions. Underneath is a genuinely useful idea that takes ten minutes to understand: some colors make your face look awake and some make it look tired, and the pattern is predictable."
    >
      <H>Two questions decide most of it</H>
      <P>
        <B>Warm or cool?</B> Look at the veins on your wrist in daylight: greenish reads warm,
        blueish reads cool, genuinely-can't-tell reads neutral. Gold versus silver jewellery
        against your skin tells the same story — one of them quietly flatters, the other
        quietly argues.
      </P>
      <P>
        <B>High contrast or low?</B> Dark hair against light skin is high contrast; hair, skin
        and eyes in the same tonal neighbourhood is low. High contrast carries strong,
        saturated colour; low contrast is overwhelmed by it and shines in gentler, blended
        palettes.
      </P>
      <H>The four seasons, in one paragraph each</H>
      <LI>
        <B>Spring</B> — warm and clear: coral, warm yellow, lively greens, camel. Black tends
        to overpower; chocolate and warm navy do black's job better.
      </LI>
      <LI>
        <B>Summer</B> — cool and soft: dusty blue, mauve, rose, grey. White glares; soft white
        and pearl grey flatter.
      </LI>
      <LI>
        <B>Autumn</B> — warm and deep: rust, olive, mustard, tobacco brown. The palette of
        turned leaves; icy pastels are the enemy.
      </LI>
      <LI>
        <B>Winter</B> — cool and vivid: true black, pure white, cobalt, fuchsia. The only
        season that wears black effortlessly; muted earth tones read as fatigue.
      </LI>
      <H>How to test at home</H>
      <P>
        Daylight, no makeup, and two garments you own that fit opposite palettes. Hold each
        under your chin and watch your face, not the fabric: the right colours light the skin
        and sharpen the eyes; the wrong ones cast shadows and bring out redness. Photograph
        both — the camera is more honest than the mirror and less kind than your memory.
      </P>
      <P>
        The palette is a tool, not a law. Its best use isn't discarding half your closet — it's
        knowing which colours to put next to your face, and which do their best work as
        trousers.
      </P>
    </GuidePage>
  );
}

export function GuideBodyTypesScreen() {
  return (
    <GuidePage
      route="GuideBodyTypes"
      eyebrow="STYLE GUIDE"
      title="Dressing for your body type, without the shame"
      intro="Most body-type advice is a list of things to hide, which is why most people rightly ignore it. The useful version has nothing to do with hiding: it's about proportion — where a garment ends, where it's fitted, where it adds volume — and every body benefits from getting it right."
    >
      <H>The vocabulary, quickly</H>
      <P>
        Eight shapes cover most bodies: <B>hourglass</B> (shoulders and hips balanced, waist
        defined), <B>top and bottom hourglass</B> (curved, with shoulders or hips slightly
        leading), <B>pear</B> (hips carry more), <B>inverted triangle</B> (shoulders lead),{' '}
        <B>rectangle</B> (fairly straight through), <B>apple</B> (middle carries more, legs
        lead), and <B>diamond</B> (fuller middle, narrow shoulders and hips). Nobody is a
        textbook case; you're looking for the nearest neighbour, not a diagnosis.
      </P>
      <H>One principle per shape</H>
      <LI>
        <B>Hourglass family:</B> honour the waist. Belted styles, wrap dresses, fitted knits.
        Boxy cuts erase your easiest win.
      </LI>
      <LI>
        <B>Pear:</B> draw the eye up and keep bottoms simple — structured shoulders,
        interesting necklines, darker straight-cut bottoms that lengthen rather than cling.
      </LI>
      <LI>
        <B>Inverted triangle:</B> the reverse — quiet up top, volume and detail below. V-necks
        soften the shoulder line; wide-leg trousers balance it.
      </LI>
      <LI>
        <B>Rectangle:</B> you can create curve or lean into the line. Peplums and belts do the
        first; column dresses and longline layers make the second look deliberate and sharp.
      </LI>
      <LI>
        <B>Apple:</B> structure at the shoulder, length through the torso, and your best
        feature — the legs — on show. Empire lines and open layers skim without tenting.
      </LI>
      <LI>
        <B>Diamond:</B> flow through the middle, definition at the edges: open jackets,
        vertical lines, sleeves and hems that end at your narrowest points.
      </LI>
      <H>The part that matters more than shape</H>
      <P>
        Fit beats category. A rectangle in a beautifully fitted boxy jacket looks better than
        an hourglass in a badly fitted wrap dress, every time. Where a hem hits — at the widest
        part of the calf or the narrowest — changes a silhouette more than which silhouette you
        chose. If the advice above ever conflicts with what makes you stand taller in the
        mirror, the mirror wins.
      </P>
    </GuidePage>
  );
}

export function GuideWardrobeGapsScreen() {
  return (
    <GuidePage
      route="GuideWardrobeGaps"
      eyebrow="STYLE GUIDE"
      title="What to buy next: finding the real gaps"
      intro="A real wardrobe gap and a shopping impulse feel identical in the moment. The difference shows up three months later: one purchase is in weekly rotation, the other still has its tags. There are two tests that tell them apart before the receipt."
    >
      <H>Test one: the outfit unlock</H>
      <P>
        Before buying, name — specifically — the outfits the piece creates with clothes you
        already own. Not "it would go with lots of things": which top, which shoes, for which
        day of your actual week. A genuine gap-filler unlocks several complete outfits
        immediately, because the partners were sitting there waiting. An impulse buy unlocks
        zero and quietly demands you buy its partners too — the gift that keeps on costing.
      </P>
      <H>Test two: the orphan audit</H>
      <P>
        Walk your closet and pull everything you love but never wear. Ask each one why. The
        answers cluster: "I have no shoes at the right level for this." "This needs a layer."
        "Nothing goes with this colour." Those answers are your shopping list — written by
        your own closet. One right purchase can bring three orphans back into rotation, which
        is the highest return shopping ever gets.
      </P>
      <H>The gaps most closets actually have</H>
      <LI>
        <B>The formality bridge:</B> a wardrobe split between very casual and very dressed-up,
        with nothing for the enormous middle — the dinner that isn't fancy, the office that
        isn't formal. One pair of trousers and one knit at mid-formality often doubles a
        closet's usable range.
      </LI>
      <LI>
        <B>Shoes at the missing level:</B> the most common orphan-maker. Clothes for occasions
        whose shoes you don't own are costumes, not outfits.
      </LI>
      <LI>
        <B>The third layer:</B> tops and bottoms are rarely the problem; the jacket or knit
        that turns them into a finished outfit — and extends them across seasons — usually is.
      </LI>
      <LI>
        <B>A neutral anchor in your palette:</B> if colourful pieces sit unworn, they're often
        missing the quiet partner that lets them speak.
      </LI>
      <H>Buy the boring thing first</H>
      <P>
        Real gaps are usually unglamorous — the plain trousers, the second bra, the weatherproof
        shoe. The exciting piece is rarely the missing piece; the missing piece is what makes
        the exciting pieces you already own finally wearable. Fill the boring gap and watch how
        much of your closet wakes up.
      </P>
    </GuidePage>
  );
}

/* ------------------------------------------------------------------ */

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
  },
  intro: {
    fontFamily: fonts.serifItalic,
    fontSize: 16,
    lineHeight: 25,
    color: colors.inkMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  h2: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: 8,
  },
  p: {
    ...textType.body,
    fontSize: 14,
    lineHeight: 23,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  bold: { fontFamily: fonts.sansMedium, color: colors.ink },
  li: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    paddingLeft: 2,
  },
  liDot: { color: colors.camel, fontSize: 16, lineHeight: 22 },

  cta: {
    marginTop: spacing.section,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.lg,
  },
  ctaLabel: { ...textType.eyebrow, marginBottom: 8 },
  ctaTitle: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, color: colors.ink },
  ctaLine: {
    ...textType.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted,
    marginTop: 8,
    marginBottom: spacing.md,
  },
  ctaButton: {
    backgroundColor: colors.ink,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    letterSpacing: 0.4,
    color: colors.white,
  },

  moreSection: {
    marginTop: spacing.section,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    paddingTop: spacing.md,
  },
  moreLabel: { ...textType.eyebrow, marginBottom: spacing.sm },
  moreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
    gap: 12,
  },
  moreTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, flex: 1 },
  moreArrow: { color: colors.camel, fontSize: 16 },
});

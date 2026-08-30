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
  {
    route: 'GuideWeddingGuest',
    path: 'guides/wedding-guest-outfit',
    label: 'Wedding guest',
    title: 'What to Wear to a Wedding: A Guest’s Field Guide',
    description:
      'Every wedding dress code decoded - black tie to "festive" - plus the four rules that actually matter and a checklist that saves you at hour seven.',
  },
  {
    route: 'GuideClosetOrganization',
    path: 'guides/closet-organization',
    label: 'Closet organization',
    title: 'How to Organize Your Closet So Mornings Decide Themselves',
    description:
      'A closet organization method built for decisions, not photos: the cull that makes space honest, zoning by frequency, and the upkeep that takes minutes.',
  },
  {
    route: 'GuideWorkWardrobe',
    path: 'guides/work-wardrobe',
    label: 'Work wardrobes',
    title: 'Building a Work Wardrobe That Runs Itself',
    description:
      'How to read your office’s real dress code, the 3×5+2 formula that yields weeks of outfits, and why work clothes live or die by fabric.',
  },
  {
    route: 'GuideSustainable',
    path: 'guides/sustainable-fashion',
    label: 'Sustainable style',
    title: 'Sustainable Fashion Starts in the Closet You Already Own',
    description:
      'The highest-impact sustainable fashion habits: wearing what you own more, the 30-wears test, care that doubles garment life, and exits that aren’t landfill.',
  },
  {
    route: 'GuideWhatsInStyle',
    path: 'guides/whats-in-style',
    label: 'What’s in style',
    title: 'What’s in Style Right Now — and How to Read What’s Next',
    description:
      'How fashion trends actually move: the four stages from emerging to fading, where trends start, how to separate a real trend from your algorithm, and what stage should mean for your wallet.',
  },
  {
    route: 'GuideWearTrends',
    path: 'guides/how-to-wear-a-trend',
    label: 'Wearing trends',
    title: 'How to Wear a Trend Without Losing Your Style',
    description:
      'The one-trend-piece rule, anchoring a trend in clothes you already own, the “still me” test, and when skipping a trend is the more stylish move.',
  },
  {
    route: 'GuideTrendBudget',
    path: 'guides/trends-on-a-budget',
    label: 'Trends on a budget',
    title: 'Trying a Trend on a Budget: The One-Piece Rule',
    description:
      'How to buy into a trend without regret: style what you own first, enter through the cheapest real piece, run the cost-per-wear math against the trend’s stage, and let secondhand absorb the risk.',
  },
  {
    route: 'GuideCityStyle',
    path: 'guides/dressing-for-your-city',
    label: 'Dressing for your city',
    title: 'Dressing for Your City: Why Location Changes What Works',
    description:
      'Why the same outfit reads differently in Milan, Seattle and a suburb: climate honesty, local formality, and how to adopt trends in the version your actual streets wear.',
  },
  {
    route: 'GuideFabric',
    path: 'guides/fabric-guide',
    label: 'Fabric, decoded',
    title: 'Reading Fabric: Why Material Makes the Outfit',
    description:
      'A plain guide to fabric: how material decides drape, formality and lifespan, the in-store tests that take ten seconds, and which fibres earn their price.',
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
        season that wears black without help; muted earth tones read as fatigue.
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

export function GuideWeddingGuestScreen() {
  return (
    <GuidePage
      route="GuideWeddingGuest"
      eyebrow="STYLE GUIDE"
      title="What to wear to a wedding: a guest's field guide"
      intro="No other event hands you a dress code written by strangers, a ten-hour runtime, and a photographer. Wedding-guest dressing feels high-stakes because it is — but it reduces to reading the code correctly, obeying four rules, and dressing for hour seven instead of hour one."
    >
      <H>Decode the code</H>
      <LI>
        <B>Black tie</B> means floor-length or your most formal cocktail dress, and a tuxedo or
        dark suit at the absolute dressiest end. When in doubt at this level, more formal — the
        only guest who suffers at black tie is the one in a sundress.
      </LI>
      <LI>
        <B>Cocktail</B> is the broad middle: knee-to-midi dresses, a good suit, dressy
        separates. Most weddings live here, and most closets can already answer it.
      </LI>
      <LI>
        <B>"Festive," "garden," "beach formal"</B> — the invented codes — all translate the
        same way: cocktail, adjusted for setting. Festive invites colour; garden means heels
        that survive grass (block, wedge, or flat); beach formal means breathable fabric and
        shoes that come off gracefully.
      </LI>
      <LI>
        <B>No code given?</B> Read the venue and the hour. Evening plus ballroom reads
        cocktail-to-formal; afternoon plus barn or garden reads dressed-up daytime. A ceremony in
        a house of worship adds covered shoulders until the reception, whatever the code.
      </LI>
      <H>The four rules that actually matter</H>
      <P>
        <B>Not white</B> — and not ivory, cream, or champagne either; if it could read white in
        a photograph, it's white. <B>Nothing that upstages</B> — sequinned gowns and
        floor-length red are for your own party. <B>Match the formality, not the couple's
        taste</B> — you're dressing for the event they described, not the event you'd throw.
        And <B>rewearing is not a failure</B> — nobody at this wedding attended the last one
        you wore it to, and cost per wear loves a repeat.
      </P>
      <H>Dress for hour seven</H>
      <P>
        The outfit is chosen at hour zero and judged at hour seven, on the dance floor, in
        weather. Shoes you can stand in through a receiving line beat shoes that win the first
        photo. Fabric that breathes beats fabric that photographs crisply and swelters. Sit
        down in the outfit before you commit; raise both arms; walk a flight of stairs. A
        wedding is a marathon wearing an evening's clothes.
      </P>
      <H>The week-before checklist</H>
      <P>
        Check the forecast and the terrain, not just the invitation. Confirm the layer — every
        reception venue is over-air-conditioned or an open field at sunset, and a wrap or
        blazer rescues both. Then assemble the whole outfit once, jewellery to shoes, days
        early: the missing-shoe discovery is survivable on Tuesday and a crisis at 2 PM
        Saturday.
      </P>
    </GuidePage>
  );
}

export function GuideClosetOrganizationScreen() {
  return (
    <GuidePage
      route="GuideClosetOrganization"
      eyebrow="STYLE GUIDE"
      title="Organize your closet so mornings decide themselves"
      intro="Closet organization is sold as an aesthetic project — matched hangers, rainbow gradients, baskets. But a closet has a job: produce an outfit quickly, every morning, from everything you own. Organize for that job and the beauty follows; organize for beauty and Monday still finds you staring."
    >
      <H>Cull first — the space has to be honest</H>
      <P>
        No system survives a closet where a third of the contents are never worn. Before
        arranging anything, pull what doesn't fit, doesn't suit the life you actually live, or
        hasn't been worn in a year. The maybes go in a box with a date on it: anything still in
        the box in six months has answered the question itself. This step is the whole game —
        organizing unworn clothes is alphabetizing books you'll never read.
      </P>
      <H>Zone by frequency, not by category</H>
      <P>
        The prime real estate — eye level, front of the rail, the reachable shelf — belongs to
        what you wear weekly. The blazer worn twice a year doesn't deserve a better spot than
        the jeans worn twice a week, yet in most closets it has one. Demote occasion wear to
        the high shelf and the far end; promote the workhorses to where your hand already goes.
        Off-season clothes leave the room entirely if space is tight — February should not have
        to search past linen.
      </P>
      <H>Within a zone: category, then colour</H>
      <LI>
        <B>Hang what breaks, fold what stretches.</B> Blazers, dresses, anything structured or
        crease-prone hangs; knits fold, always — a hung sweater grows shoulders no one gave it.
      </LI>
      <LI>
        <B>Group like with like</B> — all trousers together, all shirts together — so the
        morning question "which trousers?" is answered by one stretch of rail, not a search.
      </LI>
      <LI>
        <B>Light to dark within each group.</B> Not for the photograph: because you reach for
        "the dark jeans" and your hand should know where dark lives.
      </LI>
      <LI>
        <B>One garment, one visible edge.</B> Whatever the container, you should see a sliver
        of everything it holds. Stacks more than four deep are where clothes go to be
        forgotten.
      </LI>
      <H>Maintenance is a habit, not a weekend</H>
      <P>
        The system decays one lazy evening at a time, so make the upkeep smaller than the
        decay: hangers rehung in the right zone, a one-in-one-out rule for the categories you
        overbuy, and a re-file that happens with the laundry, not as a project. A closet that
        needs a seasonal overhaul was organized for the photo; a closet that needs ten minutes
        a week was organized for the mornings.
      </P>
    </GuidePage>
  );
}

export function GuideWorkWardrobeScreen() {
  return (
    <GuidePage
      route="GuideWorkWardrobe"
      eyebrow="STYLE GUIDE"
      title="Building a work wardrobe that runs itself"
      intro='"Business casual" is doing more work than any phrase in fashion — it means a blazer in one office and dark jeans in the next. A working wardrobe starts by reading your office correctly, then builds a small system that produces outfits faster than you can drink the first coffee.'
    >
      <H>Read the room, then dress one notch up</H>
      <P>
        Forget the handbook; look at the three most senior people you respect and note what
        they wear on an ordinary Tuesday. That's the office's real code. Your target sits one
        notch above the middle of it — enough polish to be taken seriously, not so much that
        Tuesday reads as an interview. One notch, not three: overdressing announces effort the
        way underdressing announces indifference.
      </P>
      <H>The 3 × 5 + 2 formula</H>
      <P>
        Three bottoms, five tops, two layers — all chosen so any top works with any bottom and
        either layer. That's 30 combinations before repeating, a six-week rotation, from ten
        garments. The discipline that makes it work is the same as a capsule's: a tight neutral
        base, matched formality across every piece, colour arriving in the tops where it sits
        near your face and multiplies least dangerously.
      </P>
      <LI>
        <B>Bottoms are infrastructure</B> — the most neutral, best-fitting trousers or skirts
        you can manage, because they repeat twice a week and nobody should be able to tell.
      </LI>
      <LI>
        <B>Tops carry the variety</B> — five is enough for a week without repetition, and
        they're the cheapest tier to refresh when boredom hits.
      </LI>
      <LI>
        <B>The layers do the formality shifting</B> — the same base outfit moves from desk day
        to client meeting by swapping a cardigan for a blazer. Buy the best blazer the budget
        allows; it's the piece doing the talking.
      </LI>
      <H>At work, fabric is the whole ballgame</H>
      <P>
        Work clothes are worn ten hours, sat in for eight, and judged at 4 PM, not 9 AM. That
        verdict is decided by fabric: wool and ponte recover from a chair, linen surrenders to
        it, and the wrong synthetic announces itself in any warm meeting room. The
        one-fist test at the register — crush the fabric hard for five seconds, watch what it
        does — predicts the 4 PM meeting better than the mirror does.
      </P>
      <H>The range test</H>
      <P>
        A finished work wardrobe answers three days without shopping: the ordinary Tuesday, the
        surprise client meeting, and the offsite that says "casual" but means "still work." If
        any of the three sends you to a store in a panic, that's the gap — and it's usually the
        middle one, which one good blazer closes.
      </P>
    </GuidePage>
  );
}

export function GuideSustainableScreen() {
  return (
    <GuidePage
      route="GuideSustainable"
      eyebrow="STYLE GUIDE"
      title="Sustainable fashion starts in the closet you already own"
      intro="Sustainable fashion gets framed as a shopping decision — which brand, which fabric, which certification. But the garment with the smallest footprint is the one already hanging in your closet, and the habits that matter most cost nothing: wear things more, keep them alive longer, and let them exit well."
    >
      <H>The metric is wears, not labels</H>
      <P>
        A conscientiously made organic-cotton shirt worn three times is worse for the planet
        than a fast-fashion top worn eighty. Production dominates a garment's footprint, so
        every additional wear divides that fixed cost — the same arithmetic as cost per wear,
        with carbon in place of currency. The most sustainable act available to you tonight is
        not a purchase: it's putting the unworn half of your closet back into rotation.
      </P>
      <H>Buy rarely, buy for thirty wears</H>
      <P>
        The 30-wears test is the honest gatekeeper: before buying, count the real occasions
        this piece will see in its life with you. Not "could I wear it thirty times" — will I.
        The test passes boring staples easily and trend pieces almost never, which is exactly
        the point. And secondhand passes automatically: a garment already made carries no new
        production cost, only the wears you add to it.
      </P>
      <H>Care is the multiplier</H>
      <LI>
        <B>Wash less.</B> Most garments are washed out of habit, not need — and washing is how
        clothes age. Air a worn piece overnight before deciding it's dirty.
      </LI>
      <LI>
        <B>Wash cold, dry on air.</B> Heat is the enemy in both machines: cold cycles protect
        fibre and colour, and the dryer shortens a garment's life faster than wearing it does.
      </LI>
      <LI>
        <B>Repair the small things early.</B> A loose button is a two-minute job; the same
        button lost is how a shirt stops being worn. Cobblers and tailors resurrect pieces for
        a fraction of replacement.
      </LI>
      <H>Exit well</H>
      <P>
        The donation bin is where the guilt goes, not always where the clothes go — a large
        share of donations are landfilled or shipped abroad into markets that can't absorb
        them. Better exits, in order: sell or give directly to a person who wants the piece
        (resale platforms make this straightforward), donate only clean items with real life
        left, and route true end-of-life textiles to fabric recycling rather than the bin.
        A garment that leaves your closet into someone's rotation is a success; one that
        leaves it for a landfill via a feel-good middleman is not.
      </P>
    </GuidePage>
  );
}

export function GuideWhatsInStyleScreen() {
  return (
    <GuidePage
      route="GuideWhatsInStyle"
      eyebrow="STYLE GUIDE"
      title="What's in style right now — and how to read what's next"
      intro="Trends feel like weather: they arrive from nowhere and everyone is suddenly wet. They aren't. Trends move in a knowable pattern, and once you can read it, being current stops being luck and starts being a skill."
    >
      <H>Every trend lives through four stages</H>
      <P>
        Emerging: a look shows up on the most fashion-forward streets — often one city's scene,
        not everywhere — and reads as strange in photos. Rising: it spreads across cities and
        into mid-market stores, and starts reading as fresh rather than strange. Peak: it is
        simply how clothes look this year; wearing it reads as current, not daring. Fading: fast
        fashion has saturated it, the people who started it have moved on, and wearing it starts
        to date an outfit rather than update it.
      </P>
      <P>
        The stage matters more than the trend. The same wide-leg trouser was a risk in its
        emerging year, a smart buy while rising, a safe one at peak — and the identical garment
        becomes a question mark once the direction fades. Nothing about the trouser changed.
      </P>
      <H>Where trends actually start</H>
      <P>
        Less from runways than the mythology says, and more from a handful of street-style
        scenes that the industry watches: Copenhagen and its practical minimalism, Seoul's
        precision play with proportion, Milan and Paris for how polish evolves, London and New
        York for the collision of subculture and tailoring. When the same shape appears in
        three of those cities in one season, it is coming to yours.
      </P>
      <H>A trend, or just your algorithm?</H>
      <LI>
        <B>The feed test fails alone.</B> Seeing something constantly online proves the
        algorithm knows you looked once. It is evidence about you, not about fashion.
      </LI>
      <LI>
        <B>Look for it on three kinds of people.</B> A style worn by the influencer, the
        well-dressed stranger at the coffee shop, and a colleague who doesn't follow fashion is
        a trend at three different stages — that spread is the real signal.
      </LI>
      <LI>
        <B>Check the stores' middle.</B> When mid-market retailers rack a shape in quantity,
        the trend is rising toward peak. When the same shape floods the clearance rail, you're
        watching it fade in real time.
      </LI>
      <H>Let the stage set the budget</H>
      <P>
        Emerging trends deserve curiosity, not money — try the look with what you own. Rising
        is the buying window: the piece will be current for years. At peak, buy the best
        version you'll wear long after the label "trend" falls away. Fading earns your money
        only if you genuinely love the piece — at which point it isn't a trend purchase at
        all, it's just your taste.
      </P>
    </GuidePage>
  );
}

export function GuideWearTrendsScreen() {
  return (
    <GuidePage
      route="GuideWearTrends"
      eyebrow="STYLE GUIDE"
      title="How to wear a trend without losing your style"
      intro="The fear is legitimate: chase trends and you dress like a mannequin; ignore them and the wardrobe slowly dates. The answer isn't a side of that argument. It's a method — trend as ingredient, never as recipe."
    >
      <H>One trend piece per outfit</H>
      <P>
        The reliable rule in all of this: a single trend element, surrounded by clothes that
        are unmistakably yours. Wide-leg trousers with your usual knit and jacket reads as
        evolution. Wide-leg trousers with the trending jacket, the trending shoe and the
        trending bag reads as costume — and costs four times as much to assemble.
      </P>
      <H>Anchor it in what you already own</H>
      <P>
        Before a trend earns a purchase, make it prove itself with your existing closet. Most
        trends are re-proportioned versions of garments you already have: tuck differently,
        layer differently, swap which trouser meets which shoe. Styling your way into a trend
        costs nothing, teaches you whether the direction suits you, and tells you precisely
        which piece is actually missing if you decide to go further.
      </P>
      <H>The "still me" test</H>
      <LI>
        <B>Name your three words.</B> Whatever your style reduces to — say, polished, relaxed,
        classic. A trend worth adopting can be worn in a way that still answers to those words.
        If it can't, it isn't your trend, however good it looks on someone else.
      </LI>
      <LI>
        <B>Mind your hard lines, but let one bend occasionally.</B> "I don't wear X" deserves
        respect — and an annual audit. Style evolves by testing an old rule against a current
        reason. When a trend argues against one of yours, try it once, cheaply, at home. Keep
        the rule or retire it on evidence.
      </LI>
      <LI>
        <B>Fit beats fashion, always.</B> A trend cut wrong for your build does not become
        right because it's current. The version of the trend that fits you is the trend, for
        you.
      </LI>
      <H>Skipping can be the stylish move</H>
      <P>
        Every trend cycle includes directions that simply aren't for you, and the most
        credible personal style is edited, not exhaustive. Skip consciously — knowing what the
        trend is, and choosing no — rather than by not noticing. The difference shows.
      </P>
    </GuidePage>
  );
}

export function GuideTrendBudgetScreen() {
  return (
    <GuidePage
      route="GuideTrendBudget"
      eyebrow="STYLE GUIDE"
      title="Trying a trend on a budget: the one-piece rule"
      intro="Trends have a pricing trick built in: they make you feel behind, and people who feel behind buy fast and badly. The countermove is a sequence — free first, then cheap, then committed — that lets the trend prove itself before it touches your savings."
    >
      <H>Step one costs nothing: restyle</H>
      <P>
        Most trends can be approximated from an ordinary closet, because most trends are
        proportions and pairings rather than exotic garments. Wear the trend for a week using
        only what you own. Half the time this satisfies the itch entirely — you were after the
        feeling of current, and you got it free.
      </P>
      <H>Step two: enter through the smallest real piece</H>
      <P>
        Every trend has a cheapest genuine entry: the colour arrives as a bag or a knit before
        a coat, a silhouette arrives as one trouser, a texture as one jacket. Buy the entry
        piece, wear it hard for a month, and let it decide whether the trend deserves deeper
        investment. An accessory-first entry also exits gracefully: when the trend fades, a
        bag retires quietly; a statement coat haunts the rail.
      </P>
      <H>Run cost per wear against the clock</H>
      <LI>
        <B>Rising trend, staple-adjacent piece:</B> the happy case. A wide trouser or a suede
        jacket bought while rising can log years of wears — trend price, staple math.
      </LI>
      <LI>
        <B>Peak trend, loud piece:</B> assume two seasons of life, and divide the price by
        honest wears within them. If the number embarrasses you, the clearance version of the
        same thought will be along shortly.
      </LI>
      <LI>
        <B>Fading trend, any piece:</B> the discount is not a bargain — it's the market
        agreeing the direction is ending. Buy only what you'd wear with the trend gone.
      </LI>
      <H>Let secondhand carry the risk</H>
      <P>
        By the time a trend peaks, its rising-phase purchases are flowing into resale — often
        barely worn, at a third of retail. Secondhand is the ideal trend laboratory: real
        pieces, real prices, and if the direction leaves you cold in six months, you resell at
        roughly what you paid. The experiment runs at nearly zero cost either way.
      </P>
    </GuidePage>
  );
}

export function GuideCityStyleScreen() {
  return (
    <GuidePage
      route="GuideCityStyle"
      eyebrow="STYLE GUIDE"
      title="Dressing for your city: why location changes what works"
      intro="The same outfit is polished in Milan, overdressed at a Portland farmers market, and underdressed at a Dallas dinner. Style advice that ignores where you live is advice for nowhere. Location sets three dials — climate, formality, and vibe — and reading them is a skill."
    >
      <H>Climate is not negotiable</H>
      <P>
        Trend photography is shot in mild weather on people stepping between cars and
        buildings. Your version of any trend has to survive your actual seasons: the
        layered-suede autumn look means nothing in a city that holds 90 degrees through
        October, and sheer layering is a hard sell at a bus stop in February. Adopt the
        trend's idea in the fabric your weather permits — the silhouette usually travels even
        when the material can't.
      </P>
      <H>Read your city's real formality</H>
      <P>
        Every place has a baseline: the level at which most people dress most days. Wearing
        far above it reads as trying; far below it reads as not noticing. The baseline is
        observable — look at what the put-together people at the grocery store wear, not what
        the going-out photos show. Then position yourself half a step above baseline. Half a
        step reads as intentional everywhere on earth; two steps reads as lost.
      </P>
      <H>Vibe: which capitals your streets listen to</H>
      <LI>
        <B>Coastal American cities</B> tend to metabolize New York's mix fastest — tailoring
        crossed with sport, trends worn at rising stage.
      </LI>
      <LI>
        <B>Practical and northern cities</B> read Copenhagen naturally: function-first layers,
        quality basics, colour used deliberately.
      </LI>
      <LI>
        <B>Suburbs and smaller cities</B> adopt at peak, which is not a failing — it means the
        safest buying window is longer there, and emerging-stage pieces will read as strange
        for another season. Price that in.
      </LI>
      <H>Dress for your streets, not your feed</H>
      <P>
        The feed shows you five capitals at once; you dress in exactly one place. The skill is
        translation, not import: take the direction, render it at your city's formality, in
        your climate's fabrics, one stage closer to peak than the photos. That is what
        "well-dressed here" means — and "here" is the only place you get dressed.
      </P>
    </GuidePage>
  );
}

export function GuideFabricScreen() {
  return (
    <GuidePage
      route="GuideFabric"
      eyebrow="STYLE GUIDE"
      title="Reading fabric: why material makes the outfit"
      intro="Two shirts, same cut, same colour: one reads expensive, one reads tired by noon. The difference is nothing you can see on a hanger and everything you can feel in ten seconds. Fabric is the least discussed, most decisive fact about clothes."
    >
      <H>Material decides three things cut can't</H>
      <P>
        Drape — whether the garment falls in clean lines or clings and bunches. Formality — a
        wool trouser and a jersey trouser at the identical cut sit levels apart. And lifespan —
        the difference between a knit that pills by the third wash and one that outlives the
        trend it arrived in. Price correlates loosely with all three; fibre content correlates
        tightly.
      </P>
      <H>The ten-second store tests</H>
      <LI>
        <B>Scrunch it.</B> Grip a handful for five seconds and release. Wrinkles that fall out
        as you watch mean the garment survives a workday; creases that stay are the 3pm
        version of the shirt.
      </LI>
      <LI>
        <B>Hold it to light.</B> Unintended sheerness in a tee or trouser is the fastest tell
        of a fabric built to a price.
      </LI>
      <LI>
        <B>Read the label last.</B> Guess the fibre by hand first, then check. This trains
        your hand fast — and the label still settles it: majority natural fibre for pieces
        meant to breathe and last, synthetics welcome where they work (stretch in denim,
        weatherproofing in shells), suspicious where they merely cheapen (a "silky" blouse
        that is 100% polyester at a silk price).
      </LI>
      <H>Fabric is how trends are worn well</H>
      <P>
        Most trends name a texture as much as a shape — suede's whole argument is surface;
        linen is a temperature statement; sheer layering is literally a fabric weight. The
        cheap version of a trend usually fails at the fabric, not the silhouette, which is why
        a secondhand piece in the right material beats a new one in the wrong material at the
        same price, every time.
      </P>
      <H>Match fabric to your actual climate</H>
      <P>
        Natural fibres regulate; plastics insulate. Linen and cotton for genuine heat, wool
        far beyond winter — lightweight merino is a three-season fabric — and the humid
        shoulder seasons are where polyester blends punish you hardest. If your weather app
        and your wardrobe disagree, the wardrobe loses.
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

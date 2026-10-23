/**
 * The style guides, as data: one list drives routes, linking config, SEO
 * meta, footers, cross-links and the pre-render snapshot list. The guide
 * bodies live in screens/GuideScreens.tsx; this file holds only what every
 * other part of the app needs to know about them, so a footer or the
 * navigator can import it without pulling in the screens.
 */

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

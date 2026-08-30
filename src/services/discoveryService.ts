/**
 * Discovery
 *
 * Explore's data layer under its new intent: not "what is the community doing"
 * but "what is missing from the wardrobe you actually own".
 *
 * The distinction from Shop matters. Shop is where someone goes looking - it
 * has a search box, filters and a sort. Discovery is what comes to them, and
 * every section here has to answer a question about *their* closet or it does
 * not belong on the screen.
 *
 * Three layers, in decreasing order of certainty:
 *
 *   1. **Closet arithmetic** - outfits makeable today, which role is the
 *      bottleneck. Countable from real items. No model, no estimate.
 *   2. **Unlock ranking** - candidate products sorted by how many genuinely
 *      new outfits each would create. Deterministic, via computeOutfitUnlock.
 *   3. **The Edit** - an AI-authored editorial pass over the same candidates.
 *      Enrichment only: it can fail and the screen still works.
 *
 * Nothing here invents a person, a post or an engagement number.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { Item, Season } from '../types';
import { Product, MatchedProduct } from '../models/product';
import { getActiveAdapter } from './affiliateNetwork';
import { buildProfileMatchContext, ProfileMatchContext } from './profileMatchContext';
import { scoreAndRankProducts } from './marketplaceMatchingService';
import { computeOutfitUnlock, colorsWork, roleForCategory, GarmentRole } from './outfitUnlock';
import { currentSeason } from './seasonalFit';
import { buildAllOccasions, OccasionKey, OutfitCandidate } from './dailyOutfitService';
import { shopperSignals, trendAdventurousness, ShopperSignals } from './shopperSignals';
import { getCurrentWeather } from './weatherService';
import { closetAPI, getCurrentUserId } from './api';
import { getPublishedTrends } from './trendService';
import { FashionTrend, stageWeight, trendWeatherFit } from '../models/fashionTrend';

const curateStyleEditFn = httpsCallable(functions, 'curateStyleEdit');

/** Below this many closet items the arithmetic is too thin to say anything. */
export const MIN_CLOSET_FOR_ARITHMETIC = 4;

export interface ClosetSummary {
  totalItems: number;
  byRole: Record<GarmentRole, number>;
  topColors: string[];
  season: Season;
  /** Outfits the user can put together today from what they own. */
  outfitsToday: number;
  /** The role that, if added to, would create the most new outfits. */
  bottleneckRole: GarmentRole | null;
  /** New outfits a single well-chosen item in that role would create. */
  bottleneckGain: number;
}

export interface EditPick {
  productId: string;
  line: string;
}

export interface StyleEdit {
  title: string;
  standfirst: string;
  picks: EditPick[];
}

/**
 * The stretch pick: one honest step outside the user's usual.
 *
 * A product chosen because it buys into a current trend and sits *adjacent*
 * to the wardrobe - it still works with owned pieces, but it is deliberately
 * not another portrait of their existing taste, and it may even cross an
 * avoid preference when the trend earns it (named as a concern, never
 * hidden). Labelled as exactly that in the UI, because a stretch sold as a
 * safe match would burn the trust the rest of the ranking earns.
 */
export interface StretchPick {
  pick: MatchedProduct;
  trend: FashionTrend;
}

export interface DiscoveryData {
  summary: ClosetSummary;
  /** Ranked by new outfits created, then match score. */
  unlocks: MatchedProduct[];
  /** Ranked by match score - the profile-led view. */
  matched: MatchedProduct[];
  /** Candidates in the bottleneck role specifically. */
  fillsGap: MatchedProduct[];
  /** One trend-forward piece a step outside their usual. Null when nothing qualifies. */
  stretch: StretchPick | null;
  edit: StyleEdit | null;
  /** Products by id, so the Edit can be joined back to real records. */
  productsById: Map<string, MatchedProduct>;
}

function itemsInRole(items: Item[], role: GarmentRole): Item[] {
  return items.filter(i => roleForCategory(i.category) === role);
}

/**
 * Outfits the wardrobe can currently produce.
 *
 * A top and a bottom whose colours work is one outfit; a dress is one on its
 * own. Outerwear, shoes and accessories are excluded on purpose - the same
 * reasoning as computeOutfitUnlock. Counting a third pair of boots as a
 * tripling of someone's wardrobe is the kind of number that collapses the
 * moment they think about it.
 */
export function outfitsToday(items: Item[]): number {
  const tops = itemsInRole(items, 'top');
  const bottoms = itemsInRole(items, 'bottom');
  const dresses = itemsInRole(items, 'dress');

  let pairs = 0;
  tops.forEach(top => {
    bottoms.forEach(bottom => {
      if (colorsWork(top.color || '', bottom.color || '')) pairs += 1;
    });
  });

  return pairs + dresses.length;
}

/**
 * Which role is holding the wardrobe back.
 *
 * With ten tops and two bottoms, one more bottom is worth ten new outfits and
 * one more top is worth two. The bottleneck is the scarce side, and the gain
 * is the size of the other side.
 */
export function findBottleneck(items: Item[]): { role: GarmentRole; gain: number } | null {
  const tops = itemsInRole(items, 'top').length;
  const bottoms = itemsInRole(items, 'bottom').length;

  if (tops === 0 && bottoms === 0) return null;
  // A side with nothing in it is the bottleneck regardless of the other count.
  if (tops === 0) return { role: 'top', gain: bottoms };
  if (bottoms === 0) return { role: 'bottom', gain: tops };
  if (tops === bottoms) return null;

  return tops < bottoms ? { role: 'top', gain: bottoms } : { role: 'bottom', gain: tops };
}

export function summariseCloset(items: Item[]): ClosetSummary {
  const byRole: Record<GarmentRole, number> = {
    top: 0,
    bottom: 0,
    dress: 0,
    outerwear: 0,
    shoes: 0,
    accessory: 0,
  };
  items.forEach(i => {
    byRole[roleForCategory(i.category)] += 1;
  });

  const colorCounts = new Map<string, number>();
  items.forEach(i => {
    const c = (i.color || '').toLowerCase().trim();
    if (c) colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
  });

  const bottleneck = findBottleneck(items);

  return {
    totalItems: items.length,
    byRole,
    topColors: Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c),
    season: currentSeason(),
    outfitsToday: outfitsToday(items),
    bottleneckRole: bottleneck?.role ?? null,
    bottleneckGain: bottleneck?.gain ?? 0,
  };
}

/** Human sentence for the closet line. Returns null when there is nothing true to say. */
export function summaryLine(summary: ClosetSummary): string | null {
  if (summary.totalItems < MIN_CLOSET_FOR_ARITHMETIC) return null;

  const outfits = `${summary.outfitsToday} ${summary.outfitsToday === 1 ? 'outfit' : 'outfits'}`;
  if (summary.bottleneckRole && summary.bottleneckGain > 0) {
    const role = summary.bottleneckRole === 'top' ? 'tops' : 'bottoms';
    return `${summary.totalItems} pieces make ${outfits} today. You are short on ${role} — one more is worth ${summary.bottleneckGain} more.`;
  }
  return `${summary.totalItems} pieces make ${outfits} today.`;
}

/**
 * The candidate pool.
 *
 * Deliberately not the same brief Shop sends. Shop searches what the user
 * typed; discovery searches against the shape of their wardrobe - their
 * palette, their archetypes, and the role they are short of.
 */
async function fetchCandidates(
  profile: ProfileMatchContext | undefined,
  bottleneckRole: GarmentRole | null
): Promise<Product[]> {
  const categoryFor = (role: GarmentRole | null) =>
    role === 'top' ? 'tops' : role === 'bottom' ? 'bottoms' : undefined;

  const briefs: Array<Promise<Product[]>> = [
    getActiveAdapter()
      .search({
        colors: profile?.recommendedColors?.slice(0, 6),
        styleArchetypes: profile?.styleArchetypes,
        silhouettes: profile?.recommendedSilhouettes?.slice(0, 4),
        pageSize: 60,
      })
      .then(r => r.products)
      .catch(() => []),
  ];

  // A second, narrower pass for the bottleneck role, so the gap section has
  // something to show even when the broad brief happens to return none.
  const bottleneckCategory = categoryFor(bottleneckRole);
  if (bottleneckCategory) {
    briefs.push(
      getActiveAdapter()
        .search({
          category: bottleneckCategory as any,
          colors: profile?.recommendedColors?.slice(0, 6),
          pageSize: 30,
        })
        .then(r => r.products)
        .catch(() => [])
    );
  }

  const results = await Promise.all(briefs);
  const seen = new Set<string>();
  return results.flat().filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

/**
 * Chooses the stretch pick from the already-scored candidates.
 *
 * The comfort zone is the ranking's own head - the products the profile
 * already leads to. A stretch has to (a) sit outside that head and (b)
 * anchor a real current trend. Avoid rules no longer veto: a stretch that
 * crosses one arrives demoted by the scorer and carries the crossing as a
 * named concern, so the card can be honest about it. How early-stage a
 * trend it reaches for scales with the user's demonstrated adventurousness.
 */
function pickStretch(
  matched: MatchedProduct[],
  trends: FashionTrend[],
  signals: ShopperSignals,
  temperatureF?: number
): StretchPick | null {
  if (trends.length === 0) return null;

  const adventurousness = trendAdventurousness(signals);
  const comfort = new Set(matched.slice(0, 6).map(m => m.product.id));
  const trendById = new Map(trends.map(t => [t.id, t]));

  const candidates = matched
    .filter(m => m.matchScore > 0 && m.trend && !comfort.has(m.product.id))
    .map(m => {
      const trend = trendById.get(m.trend!.id);
      return trend && trend.stage !== 'fading'
        ? {
            m,
            trend,
            // The stretch is local too: no suede-jacket trend pitched into a
            // 90° week just because it's big in London.
            weight: stageWeight(trend.stage, adventurousness) * trendWeatherFit(trend, temperatureF),
          }
        : null;
    })
    .filter((c): c is { m: MatchedProduct; trend: FashionTrend; weight: number } => c !== null)
    .sort((a, b) => b.weight - a.weight || b.m.matchScore - a.m.matchScore);

  return candidates.length > 0 ? { pick: candidates[0].m, trend: candidates[0].trend } : null;
}

/**
 * AI editorial over the candidates.
 *
 * Returns null on any failure. The Edit is the voice on the page, not the
 * substance - the unlock arithmetic below it stands on its own.
 */
async function curateEdit(
  candidates: MatchedProduct[],
  summary: ClosetSummary,
  profile: ProfileMatchContext | undefined,
  trends: FashionTrend[] = []
): Promise<StyleEdit | null> {
  if (candidates.length < 6) return null;

  try {
    const result = await curateStyleEditFn({
      season: summary.season,
      archetypes: profile?.styleArchetypes || [],
      palette: profile?.recommendedColors?.slice(0, 6) || [],
      // The trend desk's view of the moment, so the Edit can argue from the
      // world as well as the closet. Trends that cross an avoid rule are
      // included - the preference reaches the model separately, and a trend
      // is allowed to argue against it openly.
      trends: trends
        .slice(0, 4)
        .map(t => ({ name: t.name, region: t.region, stage: t.stage, summary: t.summary })),
      closet: {
        totalItems: summary.totalItems,
        byRole: summary.byRole,
        topColors: summary.topColors,
        outfitsToday: summary.outfitsToday,
        bottleneckRole: summary.bottleneckRole,
        bottleneckGain: summary.bottleneckGain,
      },
      products: candidates.slice(0, 30).map(m => ({
        id: m.product.id,
        name: m.product.name,
        brand: m.product.brand,
        category: m.product.category,
        color: m.product.color,
        price: m.product.price,
        newOutfits: m.unlock?.newOutfits ?? 0,
        pairsWith: m.unlock?.pairsWith ?? 0,
        headline: m.headline,
      })),
    });

    const data = (result.data as any)?.data;
    if (!data?.title || !Array.isArray(data.picks)) return null;

    // Join back to real products. A pick naming an id we did not send is
    // dropped rather than rendered as an empty row.
    const validIds = new Set(candidates.map(m => m.product.id));
    const picks: EditPick[] = data.picks
      .filter((p: any) => p?.productId && validIds.has(p.productId) && p?.line)
      .map((p: any) => ({ productId: p.productId, line: String(p.line) }));

    if (picks.length < 3) return null;

    return { title: String(data.title), standfirst: String(data.standfirst || ''), picks };
  } catch (error) {
    console.log('Style edit unavailable', error);
    return null;
  }
}

export async function loadDiscovery(): Promise<DiscoveryData> {
  const userId = getCurrentUserId();
  const profile = await buildProfileMatchContext(userId);

  const [closetResponse, signals, weather, trends] = await Promise.all([
    closetAPI.getItems(userId),
    shopperSignals.load(),
    // Weather sharpens seasonality but must never block the page.
    getCurrentWeather().catch(() => undefined),
    // Same rule for the trend registry: it enriches, it never blocks.
    getPublishedTrends().catch(() => [] as FashionTrend[]),
  ]);

  const closetItems: Item[] = (closetResponse.data || []).map((item: any) => ({
    id: item.id,
    name: item.name || 'Item',
    imageUrl: item.imageUrl,
    category: item.category,
    color: item.color,
    brand: item.brand,
    price: item.price || 0,
    wornCount: item.wornCount,
    lastWornDate: item.lastWornDate,
    purchaseDate: item.purchaseDate,
    createdAt: item.createdAt,
    tags: item.tags,
    seasons: item.seasons,
    style: item.style,
  }));

  const summary = summariseCloset(closetItems);
  const candidates = await fetchCandidates(profile, summary.bottleneckRole);

  const matched = scoreAndRankProducts(candidates, profile, closetItems, {
    signals,
    weather: weather
      ? { condition: weather.condition, temperature: weather.temperature }
      : undefined,
    season: summary.season,
    trends,
  });

  // Unlock ranking is a different question from match ranking, so it gets its
  // own sort rather than reusing the match order.
  const unlocks = [...matched]
    .filter(m => (m.unlock?.newOutfits ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.unlock?.newOutfits ?? 0) - (a.unlock?.newOutfits ?? 0) || b.matchScore - a.matchScore
    );

  const fillsGap = summary.bottleneckRole
    ? matched.filter(m => roleForCategory(m.product.category) === summary.bottleneckRole)
    : [];

  const productsById = new Map(matched.map(m => [m.product.id, m]));
  const stretch = pickStretch(matched, trends, signals, weather?.temperature);
  const edit = await curateEdit(matched, summary, profile, trends);

  return { summary, unlocks, matched, fillsGap, stretch, edit, productsById };
}

/**
 * Starter looks for an empty closet.
 *
 * A new user has answered the survey but owns nothing in the app yet, so
 * Dress Me Today would be a dead end. Instead: pull the catalogue, rank it
 * against the survey profile (avoid rules weigh against a piece here exactly
 * as everywhere else), map the top products into the Item shape, and hand
 * them to the SAME outfit engine that dresses a real closet. Colour harmony, formality
 * targets and per-occasion separation all apply - these are composed looks,
 * not a product carousel.
 */
export async function buildStarterPools(
  profile: ProfileMatchContext | undefined
): Promise<Record<OccasionKey, OutfitCandidate[]>> {
  const result = await getActiveAdapter()
    .search({
      colors: profile?.recommendedColors?.slice(0, 6),
      styleArchetypes: profile?.styleArchetypes,
      silhouettes: profile?.recommendedSilhouettes?.slice(0, 4),
      // Deep page on purpose: a department-focused profile keeps only its
      // own share of the results, and the outfit engine needs tops AND
      // bottoms left over after that cut to compose anything.
      pageSize: 160,
    })
    .catch(() => ({ products: [] as Product[] }));

  // Empty closet means the unlock signals stay silent, but profile fit and
  // avoid-rule preferences still order the pool.
  const ranked = scoreAndRankProducts(result.products, profile, [], {});

  const pool: Item[] = ranked.slice(0, 40).map(({ product }) => ({
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    category: product.category,
    color: product.color,
    brand: product.brand,
    price: product.price,
    subcategory: product.subcategory,
    style: product.styleTags?.[0],
    tags: product.styleTags,
  }));

  return buildAllOccasions(pool, {});
}

export const discoveryService = {
  loadDiscovery,
  summariseCloset,
  summaryLine,
  outfitsToday,
  findBottleneck,
  buildStarterPools,
};

export { computeOutfitUnlock };

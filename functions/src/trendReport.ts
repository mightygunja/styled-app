/**
 * The trend list writes itself: what it reads, what it asks, what it keeps.
 *
 * The owner's call (2026-11-13): trends are generated and reach each member
 * with no person in between. So the weekly run, start to finish:
 *
 *   1. READS what the fashion press has published in the last three weeks
 *      (TREND_FEEDS: public feeds from New York, London, Seoul, Mumbai, Lagos,
 *      Sao Paulo, Mexico City...). Headlines and standfirsts only. Before
 *      this the report was written from the model's memory, which stops at
 *      its training date - it could not know what moved last month.
 *   2. WRITES the report from that evidence. A trend has to name the
 *      publications behind it; one that names none is dropped.
 *   3. KEEPS only trends the app can illustrate (illustratedTrendsOnly), and
 *      checks any piece the report names that the app has not photographed
 *      against what stores actually stock before showing it
 *      (withVerifiedPieces).
 *   4. REVIEWS the trends that ship inside the app (standingTrends.ts) and
 *      retires one the reports show has passed (standingChanges) - a few at
 *      a time, never below a floor, never over an editor's own decision.
 *
 * If the feeds cannot be read, the report falls back to the model's own
 * knowledge and says so on every trend (`grounded: false`); nothing is
 * retired on memory alone.
 *
 * Who sees which trend is decided on each member's own device, from their
 * closet, profile, department, city, weather and behaviour
 * (src/services/trendRemixService.ts) - nothing here chooses for a person.
 *
 * Pure: no Firebase, no network. The caller supplies the model and the
 * fetched feeds, so scripts/auditTrendReport.ts runs the real thing.
 */

import { XMLParser } from 'fast-xml-parser';
import { TREND_VOCABULARY } from './trendVocabulary';

export const TREND_STAGES = ['emerging', 'rising', 'peak', 'fading'];
export const TREND_SEASONS = ['spring', 'summer', 'fall', 'winter'];
export const TREND_ARCHETYPES = ['minimal', 'polished', 'relaxed', 'edgy', 'classic', 'bohemian', 'romantic', 'sporty'];
export const TREND_CAPITALS = [
  'Copenhagen', 'Milan', 'Paris', 'London', 'New York', 'Seoul', 'Tokyo',
  'Marrakesh', 'Dubai', 'Lagos', 'Mumbai', 'São Paulo', 'Mexico City', 'Sydney',
  'Istanbul', 'Shanghai', 'Los Angeles', 'Global',
];

export function currentTrendSeason(date: Date = new Date()): string {
  const month = date.getMonth();
  if (month <= 1 || month === 11) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'fall';
}

// ==================== 1. What the press is reporting ====================

export interface TrendFeed {
  /** The publication, as the report must cite it. */
  source: string;
  /** Where it reports from - which streets its "everyone is wearing" means. */
  city: string;
  url: string;
}

/**
 * Public feeds, each checked to answer a plain request (2026-11-13). A feed
 * that stops answering is simply skipped that week. Chosen for spread: both
 * departments, and cities beyond New York and London.
 */
export const TREND_FEEDS: TrendFeed[] = [
  { source: 'Vogue', city: 'New York', url: 'https://www.vogue.com/feed/fashion/rss' },
  { source: 'British Vogue', city: 'London', url: 'https://www.vogue.co.uk/feed/rss' },
  { source: 'Vogue India', city: 'Mumbai', url: 'https://www.vogue.in/feed/rss' },
  { source: 'Vogue Mexico', city: 'Mexico City', url: 'https://www.vogue.mx/feed/rss' },
  { source: 'Vogue Brasil', city: 'São Paulo', url: 'https://vogue.globo.com/rss/vogue' },
  { source: 'Vogue Korea', city: 'Seoul', url: 'https://www.vogue.co.kr/feed/' },
  { source: 'BellaNaija Style', city: 'Lagos', url: 'https://www.bellanaija.com/style/feed/' },
  { source: 'GQ', city: 'New York', url: 'https://www.gq.com/feed/rss' },
  { source: 'British GQ', city: 'London', url: 'https://www.gq-magazine.co.uk/feed/rss' },
  { source: 'Esquire', city: 'New York', url: 'https://www.esquire.com/rss/style.xml/' },
  { source: 'Permanent Style', city: 'London', url: 'https://www.permanentstyle.com/feed' },
  { source: "Harper's Bazaar", city: 'New York', url: 'https://www.harpersbazaar.com/rss/fashion.xml/' },
  { source: 'Elle', city: 'New York', url: 'https://www.elle.com/rss/fashion.xml/' },
  { source: 'Who What Wear', city: 'Los Angeles', url: 'https://www.whowhatwear.com/rss' },
  { source: 'The Guardian', city: 'London', url: 'https://www.theguardian.com/fashion/rss' },
  { source: 'The New York Times', city: 'New York', url: 'https://rss.nytimes.com/services/xml/rss/nyt/FashionandStyle.xml' },
  { source: 'Fashionista', city: 'New York', url: 'https://fashionista.com/.rss/full/' },
  { source: 'WWD', city: 'New York', url: 'https://wwd.com/feed/' },
  { source: 'Refinery29', city: 'New York', url: 'https://www.refinery29.com/fashion/rss.xml' },
  { source: 'Hypebeast', city: 'Global', url: 'https://hypebeast.com/feed' },
  { source: 'Hypebae', city: 'Global', url: 'https://hypebae.com/feed' },
  { source: 'Highsnobiety', city: 'Global', url: 'https://www.highsnobiety.com/feed/' },
];

export interface TrendSignal {
  source: string;
  city: string;
  title: string;
  summary: string;
  /** When it was published (ms). */
  at: number;
}

const feedParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: '-', mdash: '-', hellip: '...' };

/** Plain text from a feed field: no markup, no entities, one line, cut to `max`. */
export function feedText(value: any, max: number): string {
  const raw = typeof value === 'object' && value !== null ? value['#text'] ?? '' : value ?? '';
  const decode = (text: string) =>
    text
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16) || 32))
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code) || 32))
      .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] ?? whole);
  // Entities first (feeds escape their markup), then the markup itself.
  const text = decode(decode(String(raw)))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).trim()}...`;
}

/** The items of one feed (RSS 2.0, Atom or RDF). An unreadable feed gives none. */
export function parseFeed(xml: string, feed: TrendFeed): TrendSignal[] {
  let doc: any;
  try {
    doc = feedParser.parse(xml);
  } catch {
    return [];
  }
  const found = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.['rdf:RDF']?.item ?? [];
  const items: any[] = Array.isArray(found) ? found : [found];
  return items
    .map(item => ({
      source: feed.source,
      city: feed.city,
      title: feedText(item?.title, 150),
      summary: feedText(item?.description ?? item?.summary ?? '', 150),
      at: Date.parse(String(item?.pubDate ?? item?.published ?? item?.updated ?? item?.['dc:date'] ?? '')) || 0,
    }))
    .filter(signal => signal.title.length > 8);
}

/**
 * Whether an item is about what people wear. These feeds also carry beauty,
 * celebrity news, horoscopes and job adverts; the report must not be written
 * from those. English, with the few words the Spanish, Portuguese and Korean
 * feeds use for the same things.
 */
const ABOUT_CLOTHES = new RegExp(
  // Words are matched from their start ("top", not "stop"); the short ones whole.
  `\\b(?:${[
    'trend', 'styl', 'wear', 'worn', 'outfit', 'look', 'fashion', 'runway', 'collection', 'wardrobe', 'jeans?\\b',
    'denim', 'trouser', 'pants?\\b', 'skirt', 'dress', 'coat', 'jacket', 'blazer', 'suits?\\b', 'tailor', 'knit',
    'sweater', 'cardigan', 'shirt', 'blouse', 'tops?\\b', 'boot', 'shoe', 'sneaker', 'loafer', 'heels?\\b', 'sandal',
    'bags?\\b', 'belt', 'scar(?:f|ves)\\b', 'hats?\\b', 'jewel', 'leather', 'suede', 'silhouette', 'moda\\b',
    'tendencia', 'tendência', 'vestido', 'bolsa', 'zapato',
  ].join('|')})|트렌드|스타일|패션|스웨터|코트|재킷`,
  'i'
);
/** Items that mention clothes but are not evidence of what is being worn. */
const NOT_EVIDENCE = /horoscop|is hiring|job listing|red light|skincare|serum|mascara|perfume|fragrance|recipe|black friday|cyber monday|\bsale\b|gift guide|gifting|best deals|% off|discount code/i;

export function aboutClothes(signal: Pick<TrendSignal, 'title' | 'summary'>): boolean {
  const text = `${signal.title} ${signal.summary}`;
  return ABOUT_CLOTHES.test(text) && !NOT_EVIDENCE.test(text);
}

export const SIGNAL_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000;
export const SIGNALS_PER_SOURCE = 9;
export const SIGNALS_TOTAL = 130;
/** Fewer than this, from fewer publications than this, is not evidence to write from. */
export const MIN_SIGNALS = 30;
export const MIN_SOURCES = 5;

/**
 * The items worth showing the model: about clothes, from the last three
 * weeks, no headline twice, no publication crowding the rest out. Dealt one
 * per publication in turn, newest first.
 */
export function recentSignals(all: TrendSignal[], now: number): TrendSignal[] {
  const seen = new Set<string>();
  const bySource = new Map<string, TrendSignal[]>();
  [...all]
    .filter(s => s.at > 0 && s.at <= now + 24 * 60 * 60 * 1000 && now - s.at <= SIGNAL_MAX_AGE_MS && aboutClothes(s))
    .sort((a, b) => b.at - a.at)
    .forEach(signal => {
      const key = signal.title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const list = bySource.get(signal.source) ?? [];
      if (list.length < SIGNALS_PER_SOURCE) list.push(signal);
      bySource.set(signal.source, list);
    });
  const out: TrendSignal[] = [];
  for (let turn = 0; turn < SIGNALS_PER_SOURCE && out.length < SIGNALS_TOTAL; turn += 1) {
    for (const list of bySource.values()) {
      if (list[turn] && out.length < SIGNALS_TOTAL) out.push(list[turn]);
    }
  }
  return out;
}

export function signalSources(signals: TrendSignal[]): string[] {
  return Array.from(new Set(signals.map(s => s.source)));
}

/** Whether there is enough current reporting to write the report from. */
export function signalsGrounded(signals: TrendSignal[]): boolean {
  return signals.length >= MIN_SIGNALS && signalSources(signals).length >= MIN_SOURCES;
}

export function signalsBrief(signals: TrendSignal[]): string {
  return signals
    .map(s => `- [${s.source}, ${s.city}] ${s.title}${s.summary && s.summary !== s.title ? ` - ${s.summary}` : ''}`)
    .join('\n');
}

// ==================== 2. The pieces the app can show ====================

const TREND_VOCAB = new Map(TREND_VOCABULARY.map(v => [v.term, v]));
const TREND_PIECE_LIST = (['garment', 'shoes', 'finish'] as const)
  .map(
    slot =>
      `${slot === 'garment' ? 'GARMENTS' : slot === 'shoes' ? 'SHOES' : 'BAGS, BELTS, SCARVES, HATS, JEWELLERY'}: ${TREND_VOCABULARY.filter(
        v => v.slot === slot
      )
        .map(v => v.term)
        .join(', ')}`
  )
  .join('\n');

/** A trend needs this many named pieces, and this many photographed ones behind them. */
export const MIN_TREND_PIECES_NAMED = 3;
export const MIN_TREND_PIECES_SHOWN = 6;

/**
 * Keeps only pieces the app can show, and only trends it can illustrate for
 * at least one department. `coverage` records how many photographed pieces
 * stand behind the trend for a womenswear and a menswear reader.
 */
export function illustratedTrendsOnly(drafts: any[]): any[] {
  return drafts
    .map(t => {
      const named: string[] = [...new Set([...(t.keyGarments || []), ...(t.keyAccessories || [])])].filter(w =>
        TREND_VOCAB.has(w)
      );
      const count = (key: 'women' | 'men') => named.reduce((n, w) => n + TREND_VOCAB.get(w)![key], 0);
      return {
        ...t,
        keyGarments: named.filter(w => TREND_VOCAB.get(w)!.slot === 'garment'),
        keyAccessories: named.filter(w => TREND_VOCAB.get(w)!.slot !== 'garment'),
        coverage: { women: count('women'), men: count('men') },
      };
    })
    .filter(
      t =>
        t.keyGarments.length + t.keyAccessories.length >= MIN_TREND_PIECES_NAMED &&
        Math.max(t.coverage.women, t.coverage.men) >= MIN_TREND_PIECES_SHOWN
    );
}

// ==================== 3. The report ====================

export interface StandingTrend {
  id: string;
  name: string;
  summary: string;
}

export interface TrendReportRequest {
  existingNames: string[];
  season: string;
  year: number;
  count: number;
  /** What the press reported (recentSignals). Fewer than enough and the report is written from memory. */
  signals: TrendSignal[];
  /** The trends that ship inside the app, for review. Reviewed only on evidence. */
  standing?: StandingTrend[];
}

export function trendReportPrompt(request: TrendReportRequest): string {
  const { existingNames, season, year, count, signals } = request;
  const grounded = signalsGrounded(signals);
  const standing = grounded ? request.standing ?? [] : [];
  const sources = signalSources(signals);
  return `You are the trend editor of 33 Trends, a personal styling app. Write this week's trend report: the directions genuinely moving in fashion right now (${season} ${year}). It is published exactly as you write it, with no editor in between, so every line must be something you can stand behind.

${
  grounded
    ? `WHAT THE FASHION PRESS HAS REPORTED IN THE LAST THREE WEEKS
Headlines and standfirsts, newest first, each marked [publication, where it reports from]. This is your evidence. Every trend you write must be a direction that several of these items point to - ideally from more than one publication. Ignore any item that is not about what people are wearing (beauty, celebrity news, single product launches, sales). Never copy their wording; describe the direction in your own words.
${signalsBrief(signals)}
`
    : `No current reporting could be read this week, so write only from directions you know to be long-running and well documented; do not guess at what is new.
`
}
${existingNames.length ? `Already on the list - do NOT repeat these or near-duplicates of them:\n${existingNames.map(n => `- ${n}`).join('\n')}\n` : ''}
Write ${count} trends. A trend here is a way of dressing - a cut, a fabric, a colour, a piece that people are wearing - never an industry story (a collaboration, an award, a brand's news, one celebrity's outfit). For each:
- Only directions with real editorial and street-style presence${grounded ? ' in the reports above' : ''}. Never invent a micro-trend, a statistic, a brand claim or a percentage. Never invent a garment that does not exist at retail ("3D-printed jacket", "laser-cut shirt") - every key piece must be something a person can buy this week.
- sources: ${grounded ? `the publications whose items support this trend - the publication's name only, without the city, copied exactly from: ${sources.join(', ')}. At least one; a trend you cannot support from the reports is not for this report.` : 'leave empty.'}
- The app is global. At least 2 of the ${count} must be strongest OUTSIDE Europe/North America/East Asia (Marrakesh, Dubai, Lagos, Mumbai, São Paulo, Mexico City, Sydney, Istanbul) and describe how people there actually dress now - not a Western trend relocated. For every trend, say where else it reads naturally (regions) and how far it has travelled (reach).
- A trend is never only clothes. keyAccessories must name the shoe, bag, belt, jewellery, scarf, hat or eyewear that carries it - the accessory is usually the cheapest way in.
- The app dresses men and women. Prefer directions that read across departments, write stylingNote so it works for any wardrobe (or gives both readings in one sentence), and choose keyGarments that are department-neutral retail words wherever the trend allows. A genuinely single-department trend is allowed, but the set of ${count} must serve both menswear and womenswear readers. At least ${Math.ceil(count / 2)} of the ${count} must be ones a menswear reader can wear, built on pieces such as trousers, jeans, shirts, knitwear, jackets, coats, boots, loafers, sneakers, belts and scarves rather than dresses, skirts and blouses.
- region: the city where it is strongest, one of: ${TREND_CAPITALS.join(', ')}. Spread across the world - the point of the report is bringing every reader what is moving where THEY are as well as in the classic capitals.
- regions: 1-4 further cities from the same list where it is also genuinely strong.
- reach: "local" (one city's street signal), "regional" (a continent or climate), or "global" (reads everywhere).
- stage: one of ${TREND_STAGES.join(' | ')}. Be honest - a fading trend marked fading is more useful than flattery.
- keyGarments: 2-6 lowercase garment words/phrases that actually appear in product names and closet tags (e.g. "wide-leg trousers", "suede jacket"). These drive matching against real wardrobes, so plain retail language only. May be empty for a shoe- or bag-led trend.
- keyAccessories: 2-6 lowercase shoe / bag / belt / jewellery / scarf / hat / eyewear words in the same plain retail language (e.g. "penny loafer", "suede belt", "east-west shoulder bag", "silk scarf").
- keyColors: 0-4 lowercase colour words.
- silhouettes: 0-4 lowercase cut/fit words (e.g. "wide-leg", "oversized", "cropped").
- archetypes: 1-3 from ${TREND_ARCHETYPES.join(', ')} - the tastes this trend sits nearest.
- summary: 1-2 sentences, what it is and why now. No hype words.
- stylingNote: 1-2 sentences of genuinely useful how-to-wear-it advice with a normal wardrobe. Specific, not generic. Never use "flattering", "must-have", "elevate" or "effortless".
- entryPiece: the single lowest-commitment way in, as a short phrase.
- name: 2-4 words, editorial, no emoji.
- keyGarments and keyAccessories must be copied EXACTLY, character for character, from THE PIECES WE CAN SHOW below. They are the only pieces the app has photographed and can link to, so a trend named in any other words would reach the reader with nothing under it. Use at least three of them per trend, and prefer the specific phrase ("suede trucker jacket") over the general one ("leather jacket"). A direction you cannot express in at least three of these pieces is not for this report - choose another.
- newPieces: 0-2 further pieces that ${grounded ? 'the reports name for this trend' : 'define this trend'} and THE PIECES WE CAN SHOW does not have (a new jean cut, a shoe shape), in the same plain lowercase retail words, each marked "garment" or "accessory". They are checked against what stores actually stock before any reader sees them. Leave empty when the list already covers the trend.

THE PIECES WE CAN SHOW
${TREND_PIECE_LIST}
${
  standing.length
    ? `
THE STANDING TRENDS
These ship inside the app and are shown alongside your report. Review each against the reports above and give a verdict: "current" (still being worn and written about, or simply not contradicted), or "over" (the reports show it has clearly passed, or it belongs to a season that has ended). When unsure, say "current" - retiring a live trend is worse than keeping a quiet one.
${standing.map(s => `- ${s.id}: ${s.name} - ${s.summary}`).join('\n')}
`
    : ''
}
Return ONLY valid JSON:
{ "trends": [{ "name": "", "summary": "", "sources": [], "region": "", "regions": [], "reach": "", "stage": "", "keyGarments": [], "keyAccessories": [], "newPieces": [{ "piece": "", "kind": "garment" }], "keyColors": [], "silhouettes": [], "archetypes": [], "stylingNote": "", "entryPiece": "" }]${standing.length ? ', "standing": [{ "id": "", "verdict": "current" }]' : ''} }`;
}

export const MAX_NEW_PIECES = 2;

/** A piece phrase the model proposed, cleaned - or null when it is not a usable phrase. */
export function newPiecePhrase(raw: any): string | null {
  const phrase = String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 '&-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = phrase.split(' ').length;
  return phrase.length >= 4 && phrase.length <= 40 && words <= 4 ? phrase : null;
}

export interface StandingVerdict {
  id: string;
  verdict: 'current' | 'over';
}

export interface TrendReport {
  trends: any[];
  standing: StandingVerdict[];
  grounded: boolean;
}

/**
 * The model's answer, cut to what can be trusted: known stages, cities and
 * archetypes; sources that really were among the reports; pieces the app can
 * show. Nothing is saved here - the caller decides between draft and
 * published.
 */
export function parseTrendReport(content: string, request: TrendReportRequest, now: Date = new Date()): TrendReport {
  const grounded = signalsGrounded(request.signals);
  let result: any = {};
  try {
    result = JSON.parse(String(content || '{}').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  } catch {
    return { trends: [], standing: [], grounded };
  }
  // Longest name first, so "Vogue Brasil" is not read as "Vogue". The model
  // sometimes copies the whole bracket ("Vogue Brasil, São Paulo"); the
  // publication is what it starts with.
  const known = signalSources(request.signals).sort((a, b) => b.length - a.length);
  const publication = (raw: any): string | undefined => {
    const cited = String(raw ?? '').trim().toLowerCase();
    return known.find(name => cited === name.toLowerCase() || cited.startsWith(`${name.toLowerCase()},`));
  };

  const asStrings = (value: any, max: number): string[] =>
    Array.isArray(value)
      ? value.filter((v: any) => typeof v === 'string' && v.trim()).map((v: string) => v.trim().toLowerCase()).slice(0, max)
      : [];

  const drafts = (Array.isArray(result.trends) ? result.trends : [])
    .filter((t: any) => t?.name && t?.summary && TREND_STAGES.includes(t.stage))
    .slice(0, 8)
    .map((t: any) => {
      const sources = Array.from(
        new Set(
          (Array.isArray(t.sources) ? t.sources : [])
            .map((s: any) => publication(s))
            .filter((s: string | undefined): s is string => !!s)
        )
      );
      const seenPiece = new Set<string>();
      const newPieces = (Array.isArray(t.newPieces) ? t.newPieces : [])
        .map((p: any) => ({ piece: newPiecePhrase(p?.piece), kind: p?.kind === 'accessory' ? 'accessory' : 'garment' }))
        .filter((p: any) => p.piece && !TREND_VOCAB.has(p.piece) && !seenPiece.has(p.piece) && seenPiece.add(p.piece))
        .slice(0, MAX_NEW_PIECES);
      return {
        name: String(t.name).trim(),
        summary: String(t.summary).trim(),
        region: String(t.region || 'Global').trim(),
        regions: Array.isArray(t.regions)
          ? t.regions.filter((r: any) => typeof r === 'string' && TREND_CAPITALS.includes(r.trim())).map((r: string) => r.trim()).slice(0, 4)
          : [],
        reach: ['local', 'regional', 'global'].includes(t.reach) ? t.reach : 'regional',
        stage: t.stage,
        season: TREND_SEASONS.includes(request.season) ? request.season : 'fall',
        year: request.year,
        keyGarments: asStrings(t.keyGarments, 6),
        keyAccessories: asStrings(t.keyAccessories, 6),
        newPieces,
        keyColors: asStrings(t.keyColors, 4),
        silhouettes: asStrings(t.silhouettes, 4),
        archetypes: asStrings(t.archetypes, 3).filter((a: string) => TREND_ARCHETYPES.includes(a)),
        stylingNote: String(t.stylingNote || '').trim(),
        entryPiece: String(t.entryPiece || '').trim(),
        sources,
        grounded,
        status: 'draft',
        source: 'ai-draft',
        createdAt: now.toISOString(),
      };
    })
    // A trend the matchers cannot see is not a trend the app can use.
    .filter((t: any) => t.keyGarments.length > 0 || t.keyAccessories.length > 0 || t.silhouettes.length > 0)
    // Written from the reports, it must say which ones.
    .filter((t: any) => !grounded || t.sources.length > 0);

  const taken = new Set(request.existingNames.map(n => n.trim().toLowerCase()));
  const standingIds = new Set((grounded ? request.standing ?? [] : []).map(s => s.id));
  const standing: StandingVerdict[] = (Array.isArray(result.standing) ? result.standing : [])
    .filter((s: any) => standingIds.has(String(s?.id)) && (s?.verdict === 'current' || s?.verdict === 'over'))
    .map((s: any) => ({ id: String(s.id), verdict: s.verdict as 'current' | 'over' }));

  return {
    trends: illustratedTrendsOnly(drafts).filter(t => !taken.has(t.name.toLowerCase())),
    standing,
    grounded,
  };
}

/** Writes the report with the model the caller supplies. */
export async function writeTrendReport(
  request: TrendReportRequest,
  complete: (prompt: string) => Promise<string>
): Promise<TrendReport> {
  return parseTrendReport(await complete(trendReportPrompt(request)), request);
}

// ==================== 4. Pieces checked against the stores ====================

/** Real products a new piece needs in a department before it is shown. */
export const NEW_PIECE_MIN_PRODUCTS = 6;
/** Real products a named piece needs to count as stocked. */
export const STOCKED_MIN_PRODUCTS = 3;

export type StockCount = { women: number; men: number };

/** Every piece phrase of a trend that the stores should be asked about, per department. */
export function trendStockQuestions(trend: any): Array<{ department: 'women' | 'men'; phrase: string }> {
  const phrases: string[] = [
    ...(trend.keyGarments || []),
    ...(trend.keyAccessories || []),
    ...(trend.newPieces || []).map((p: any) => p.piece),
  ];
  const departments = (['women', 'men'] as const).filter(d => (trend.coverage?.[d] ?? 0) > 0);
  return departments.flatMap(department => phrases.map(phrase => ({ department, phrase })));
}

/**
 * The trend as it is published: a new piece the stores really stock joins
 * its key pieces; one they do not is dropped. `live` records how many of its
 * named pieces have real products behind them, per department.
 * `stocked[phrase]` is how many real products were found for that phrase.
 */
export function withVerifiedPieces(trend: any, stocked: Record<string, StockCount>): any {
  const found = (phrase: string): StockCount => stocked[phrase] ?? { women: 0, men: 0 };
  const proposed: Array<{ piece: string; kind: string }> = trend.newPieces || [];
  const verified = proposed.filter(p => Math.max(found(p.piece).women, found(p.piece).men) >= NEW_PIECE_MIN_PRODUCTS);
  const { newPieces: _dropped, ...rest } = trend;
  const keyGarments = [...(trend.keyGarments || []), ...verified.filter(p => p.kind === 'garment').map(p => p.piece)];
  const keyAccessories = [...(trend.keyAccessories || []), ...verified.filter(p => p.kind !== 'garment').map(p => p.piece)];
  const named = [...keyGarments, ...keyAccessories];
  const count = (department: 'women' | 'men') => named.filter(p => found(p)[department] >= STOCKED_MIN_PRODUCTS).length;
  return {
    ...rest,
    keyGarments,
    keyAccessories,
    ...(verified.length ? { addedPieces: verified.map(p => p.piece) } : {}),
    live: { women: count('women'), men: count('men') },
  };
}

// ==================== 5. The trends that ship inside the app ====================

/** A built-in trend's override, as saved (trendSeedOverrides/{id}). */
export interface StandingOverride {
  status?: string;
  /** 'auto' when the weekly review wrote it; anything else is an editor's decision. */
  by?: string;
  /** Weekly reviews in a row that judged it over (written by the review only). */
  strikes?: number;
}

export const MAX_STANDING_RETIRED_PER_RUN = 2;
/** The built-in list is never reviewed down below this many live trends. */
export const MIN_STANDING_LIVE = 10;

/** Weekly reviews in a row that must judge a built-in trend over before it is retired. */
export const STANDING_STRIKES_TO_RETIRE = 2;

/**
 * What the weekly review changes. One week's verdict is one model's reading
 * of three weeks of headlines, so nothing is retired on it alone:
 *
 *   - judged "over" for the first time -> `warn` (a strike is recorded);
 *   - judged "over" again the next review -> `retire`, at most
 *     MAX_STANDING_RETIRED_PER_RUN a week and never below MIN_STANDING_LIVE;
 *   - judged "current" with a strike against it -> `clear`;
 *   - judged "current" after the review itself retired it -> `restore`.
 *
 * A decision an editor made by hand is never touched.
 */
export function standingChanges(
  verdicts: StandingVerdict[],
  overrides: Record<string, StandingOverride | undefined>,
  standing: StandingTrend[]
): { retire: string[]; restore: string[]; warn: string[]; clear: string[] } {
  const ids = new Set(standing.map(s => s.id));
  const editorDecided = (id: string) => !!overrides[id] && overrides[id]!.by !== 'auto';
  const archived = (id: string) => overrides[id]?.status === 'archived';
  const strikes = (id: string) => (overrides[id]?.by === 'auto' ? Number(overrides[id]?.strikes) || 0 : 0);
  const seen = new Set<string>();
  const usable = verdicts.filter(v => ids.has(v.id) && !editorDecided(v.id) && !seen.has(v.id) && seen.add(v.id));

  const restore = usable.filter(v => v.verdict === 'current' && archived(v.id)).map(v => v.id);
  const clear = usable.filter(v => v.verdict === 'current' && !archived(v.id) && strikes(v.id) > 0).map(v => v.id);
  let live = standing.filter(s => !archived(s.id)).length + restore.length;
  const retire: string[] = [];
  const warn: string[] = [];
  for (const verdict of usable) {
    if (verdict.verdict !== 'over' || archived(verdict.id)) continue;
    const due = strikes(verdict.id) + 1 >= STANDING_STRIKES_TO_RETIRE;
    if (due && retire.length < MAX_STANDING_RETIRED_PER_RUN && live - 1 >= MIN_STANDING_LIVE) {
      retire.push(verdict.id);
      live -= 1;
    } else if (!due) {
      warn.push(verdict.id);
    }
    // Due but held back by a limit: the strike stands, and next week decides.
  }
  return { retire, restore, warn, clear };
}

// ==================== 6. When the run is due ====================

export const TREND_LIST_EVERY_MS = 6.5 * 24 * 60 * 60 * 1000;

/**
 * The generator is looked at every day and runs when the last published
 * list is about a week old - or there has never been one. So a first deploy
 * publishes within a day instead of waiting for a Monday, and a week that
 * failed is tried again the next morning instead of the next week.
 */
export function trendListDue(lastPublishedAt: number | null | undefined, now: number): boolean {
  return !lastPublishedAt || now - lastPublishedAt >= TREND_LIST_EVERY_MS;
}

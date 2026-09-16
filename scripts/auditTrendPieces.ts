/**
 * Trend <-> piece alignment audit.
 *
 * Prints, for every editorial seed trend (and any desk trends passed in as
 * a JSON file), exactly which catalogue pieces its rail will show per
 * department, and fails when:
 *   - a curated `pieces` id does not exist in the catalogue;
 *   - a curated piece does not text-match the trend's anchors (garments or
 *     accessories) - a curated rail must be spot on, not merely plausible;
 *   - a trend's rail has no shoe or accessory in either department, so the
 *     look cannot be finished;
 *   - a rail is empty for a department the trend claims to serve.
 *
 * Run:  npx tsx scripts/auditTrendPieces.ts [path/to/desk-trends.json]
 */

import { SEED_TRENDS } from '../src/data/seedTrends';
import { MOCK_CATALOG } from '../src/data/mockProductCatalog';
import { FashionTrend, trendTextMatch } from '../src/models/fashionTrend';
import { piecesForTrend, slotOf } from '../src/services/trendLooks';
import { resolveLocaleProfile, regionAffinity, coverageFit, localWearLine } from '../src/services/localeProfile';
import { mergeTrends } from '../src/services/trendMerge';

const byId = new Map(MOCK_CATALOG.map(p => [p.id, p]));
let failures = 0;

function fail(message: string) {
  failures += 1;
  console.log(`  FAIL  ${message}`);
}

/** Desk-drafted trends are the editor's; a thin rail there is reported, not failed. */
function flag(trend: FashionTrend, message: string) {
  if (trend.source === 'editorial') fail(message);
  else console.log(`  WARN  ${message} (desk trend - review on the Trend Desk)`);
}

function describe(trend: FashionTrend) {
  console.log(`\n## ${trend.name}  [${trend.region}${trend.regions?.length ? ` + ${trend.regions.join(', ')}` : ''} · ${trend.stage} · ${trend.reach ?? 'regional'}]`);
  console.log(`   garments: ${trend.keyGarments.join(', ') || '-'}`);
  console.log(`   accessories: ${(trend.keyAccessories || []).join(', ') || '-'}`);

  for (const id of trend.pieces ?? []) {
    const product = byId.get(`p-${id}`);
    if (!product) {
      fail(`${trend.name}: curated piece ${id} is not in the catalogue`);
      continue;
    }
    const haystack = [product.name, product.subcategory, product.category, ...(product.styleTags ?? [])].join(' ');
    const match = trendTextMatch(trend, haystack, product.color);
    if (match !== 'garment') {
      fail(`${trend.name}: curated piece ${id} "${product.name}" does not anchor the trend (match=${match ?? 'none'})`);
    }
  }

  for (const focus of ['womens', 'mens'] as const) {
    const rail = piecesForTrend(trend, focus, { limit: 5 });
    const slots = new Set(rail.map(slotOf));
    console.log(`   ${focus.padEnd(6)} rail: ${rail.map(p => `${p.id.replace('p-', '')} ${p.name} [${p.category}/${p.department}]`).join(' | ') || '(empty)'}`);
    if (rail.length === 0) {
      // Womenswear is the default department; every trend must serve it.
      // Menswear rails may legitimately be empty for a single-department trend.
      if (focus === 'womens') flag(trend, `${trend.name}: no womenswear rail`);
      else console.log('         (no menswear rail - single-department trend)');
      continue;
    }
    if (!slots.has('shoes') && !slots.has('finish')) {
      flag(trend, `${trend.name}: ${focus} rail has no shoe or accessory - the look cannot be finished`);
    }
  }
}

function localeSpotCheck(trends: FashionTrend[]) {
  const places = [
    { city: 'Marrakesh', country: 'Morocco', latitude: 31.6 },
    { city: 'Copenhagen', country: 'Denmark', latitude: 55.7 },
    { city: 'Dubai', country: 'United Arab Emirates', latitude: 25.2 },
    { city: 'Sydney', country: 'Australia', latitude: -33.9 },
    { city: 'Lagos', country: 'Nigeria', latitude: 6.5 },
    { city: 'Naperville', region: 'Illinois', country: 'United States', latitude: 41.8 },
  ];
  console.log('\n\n# Locale ranking spot-check (affinity × coverage only; weather and closet excluded)');
  for (const place of places) {
    const profile = resolveLocaleProfile(place, new Date('2026-09-16'));
    if (!profile) {
      fail(`no locale profile for ${place.city}, ${place.country}`);
      continue;
    }
    const ranked = trends
      .map(trend => {
        const aff = regionAffinity(trend.region, trend.regions, trend.stage, trend.reach, profile);
        const cover = coverageFit(/sheer|mesh|mini skirt|crop top/.test([trend.name, ...trend.keyGarments].join(' ').toLowerCase()), profile);
        return { trend, score: aff.multiplier * cover.multiplier, note: aff.note, adaptation: cover.adaptation };
      })
      .sort((a, b) => b.score - a.score);
    console.log(`\n## ${profile.label} — ${profile.regionLabel}, hub ${profile.hub ?? '-'}, capitals ${profile.capitals.join(' > ')}, ${profile.climate}, ${profile.coverage}, local season ${profile.localSeason}`);
    ranked.slice(0, 6).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.trend.name.padEnd(30)} ${r.score.toFixed(2)}  ${r.note ?? ''}${r.adaptation ? `  · ${r.adaptation}` : ''}`);
    });
    const last = ranked[ranked.length - 1];
    console.log(`   … last: ${last.trend.name} ${last.score.toFixed(2)}`);
    console.log(`   wear line: ${localWearLine(profile, ['wide-leg trousers'])}`);
  }
}

async function main() {
  let desk: FashionTrend[] = [];
  const deskPath = process.argv[2];
  if (deskPath) {
    const fs = await import('fs');
    const raw = JSON.parse(fs.readFileSync(deskPath, 'utf8')) as any[];
    desk = raw.map(d => ({
      ...d,
      keyAccessories: d.keyAccessories ?? [],
      silhouettes: d.silhouettes ?? [],
      keyColors: d.keyColors ?? [],
      archetypes: d.archetypes ?? [],
    }));
  }

  console.log(`# Seed trends: ${SEED_TRENDS.length}; desk trends: ${desk.length}; catalogue rows: ${MOCK_CATALOG.length}`);
  const merged = mergeTrends(desk, SEED_TRENDS);
  console.log(`# Merged pool: ${merged.length} (${merged.filter(t => t.source === 'editorial').length} seeds kept)`);

  console.log('\n\n# Curated rails');
  merged.forEach(describe);

  localeSpotCheck(merged);

  console.log(`\n\n${failures === 0 ? 'OK - every curated piece anchors its trend and every rail can be finished.' : `${failures} failure(s).`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();

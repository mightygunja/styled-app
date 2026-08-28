/**
 * Editorial seed trends.
 *
 * The fallback trend report, shipped with the app so the trend layer works
 * from the first launch - before the trend desk has published anything to
 * Firestore, and whenever that read fails. The moment the `trends`
 * collection has published entries, these are never shown.
 *
 * These are deliberately durable, well-documented directions rather than
 * micro-trends: seed content cannot be updated without an app release, so it
 * has to still be true in three months. The weekly, sharper material is what
 * the trend desk's draft-and-publish flow exists for.
 */

import { FashionTrend } from '../models/fashionTrend';

const SEEDED_AT = '2026-08-01T00:00:00.000Z';

function seed(trend: Omit<FashionTrend, 'status' | 'source' | 'createdAt' | 'publishedAt'>): FashionTrend {
  return { ...trend, status: 'published', source: 'editorial', createdAt: SEEDED_AT, publishedAt: SEEDED_AT };
}

export const SEED_TRENDS: FashionTrend[] = [
  seed({
    id: 'seed-wide-leg-tailoring',
    name: 'Wide-leg tailoring',
    summary:
      'The skinny era is fully over: trousers cut wide and fluid, worn with intent rather than slouch, are the base note of every European street-style capital.',
    region: 'Copenhagen',
    stage: 'peak',
    season: 'fall',
    year: 2026,
    keyGarments: ['wide-leg trousers', 'trouser', 'pleated pants', 'palazzo'],
    keyColors: ['grey', 'charcoal', 'camel', 'navy'],
    silhouettes: ['wide-leg', 'pleated', 'high-rise', 'flared'],
    archetypes: ['polished', 'minimal', 'classic'],
    stylingNote:
      'Balance the volume: a fitted or tucked top on a wide leg, and let the trouser break just over the shoe. Sneakers make it daytime; a pointed shoe makes it evening.',
    entryPiece: 'one pair of wide-leg trousers in grey or camel',
  }),
  seed({
    id: 'seed-burgundy-oxblood',
    name: 'Burgundy everything',
    summary:
      'Oxblood and burgundy have replaced black as the directional dark - on bags and shoes first, now on knits and outerwear across Milan and Paris.',
    region: 'Milan',
    stage: 'rising',
    season: 'fall',
    year: 2026,
    keyGarments: ['burgundy sweater', 'oxblood bag', 'burgundy coat'],
    keyColors: ['burgundy', 'oxblood', 'maroon', 'wine', 'bordeaux', 'dark red'],
    silhouettes: [],
    archetypes: ['classic', 'polished', 'romantic'],
    stylingNote:
      'Treat burgundy like a neutral: one deep-red piece against grey, camel, denim or cream. Head-to-toe is the advanced move; one accessory is the entry.',
    entryPiece: 'a burgundy knit or bag worn against neutrals you already own',
  }),
  seed({
    id: 'seed-suede-texture',
    name: 'The suede moment',
    summary:
      'Texture is the new logo: suede jackets, skirts and bags in tan and chocolate carry an outfit without a print in sight. It went from runway to everywhere in a season.',
    region: 'New York',
    stage: 'peak',
    season: 'fall',
    year: 2026,
    keyGarments: ['suede jacket', 'suede skirt', 'suede bag', 'suede boot', 'suede'],
    keyColors: ['tan', 'chocolate', 'brown', 'camel', 'cognac'],
    silhouettes: [],
    archetypes: ['bohemian', 'classic', 'relaxed'],
    stylingNote:
      'Let one suede piece be the texture in the outfit and keep everything else matte and simple - suede next to denim or plain knit reads expensive; suede next to shine reads costume.',
    entryPiece: 'a suede piece in tan or chocolate - jacket if you want impact, bag if you want a toe in',
  }),
  seed({
    id: 'seed-boho-redux',
    name: 'Boho, sharpened',
    summary:
      "The seventies revival that started at Chloé kept going: flowing skirts, fringe and tonal layering - but styled clean, not costume. It's boho with tailoring discipline.",
    region: 'Paris',
    stage: 'rising',
    season: 'fall',
    year: 2026,
    keyGarments: ['maxi skirt', 'fringe', 'peasant blouse', 'flowing skirt', 'boho'],
    keyColors: ['cream', 'tan', 'rust', 'chocolate'],
    silhouettes: ['flowing', 'tiered', 'a-line'],
    archetypes: ['bohemian', 'romantic'],
    stylingNote:
      'One flowing piece per outfit, grounded by something structured - a flowing maxi with a fitted knit and a sharp boot, never everything soft at once.',
    entryPiece: 'a flowing maxi skirt in cream or rust',
  }),
  seed({
    id: 'seed-preppy-remix',
    name: 'New prep',
    summary:
      'Seoul and Tokyo are re-cutting the collegiate wardrobe - rugby stripes, cricket knits, pleated minis and loafers - oversized on top, precise below.',
    region: 'Seoul',
    stage: 'rising',
    season: 'fall',
    year: 2026,
    keyGarments: ['cardigan', 'loafer', 'pleated skirt', 'rugby shirt', 'polo', 'cable knit', 'v-neck sweater'],
    keyColors: ['navy', 'cream', 'forest', 'burgundy'],
    silhouettes: ['cropped', 'pleated', 'boxy'],
    archetypes: ['classic', 'polished', 'sporty'],
    stylingNote:
      'The trick is one scale shift: an oversized knit over a pleated skirt, or a boxy polo tucked into precise trousers. Loafers with socks finish it.',
    entryPiece: 'loafers, or a cable knit in navy or cream',
  }),
  seed({
    id: 'seed-barn-jacket',
    name: 'The barn jacket',
    summary:
      'Waxed cotton and corduroy-collar field jackets replaced the puffer as the default cool outer layer - London first, now everywhere the temperature drops.',
    region: 'London',
    stage: 'peak',
    season: 'fall',
    year: 2026,
    keyGarments: ['barn jacket', 'field jacket', 'waxed jacket', 'chore jacket', 'utility jacket'],
    keyColors: ['olive', 'tan', 'brown', 'navy'],
    silhouettes: ['boxy', 'relaxed'],
    archetypes: ['relaxed', 'classic', 'minimal'],
    stylingNote:
      "Wear it against something it shouldn't go with: a barn jacket over tailored trousers or a slip skirt is the look; over hiking gear it's just a coat.",
    entryPiece: 'a waxed or canvas field jacket in olive or tan',
  }),
  seed({
    id: 'seed-sheer-layering',
    name: 'Sheer layering',
    summary:
      'Transparency as a layering tool - a sheer knit or mesh top over a visible base layer. The most fashion-forward of the current directions, and the fastest way to read current.',
    region: 'Seoul',
    stage: 'emerging',
    season: 'fall',
    year: 2026,
    keyGarments: ['sheer top', 'mesh top', 'sheer knit', 'organza', 'chiffon blouse'],
    keyColors: ['black', 'chocolate', 'cream'],
    silhouettes: ['sheer', 'layered'],
    archetypes: ['edgy', 'romantic'],
    stylingNote:
      'A sheer layer goes over something deliberate - a fitted tank or simple slip - in the same colour family. Tonal keeps it elegant; contrast makes it loud.',
    entryPiece: 'a sheer knit in black or chocolate over a tank you already own',
  }),
  seed({
    id: 'seed-athletic-heritage',
    name: 'Heritage sport',
    summary:
      'Track jackets, retro trainers and rugby-adjacent pieces styled with everyday tailoring - the athleisure era growing up. Strong in US cities, led by the sneaker rotation.',
    region: 'New York',
    stage: 'fading',
    season: 'fall',
    year: 2026,
    keyGarments: ['track jacket', 'retro sneaker', 'zip-up', 'trainer'],
    keyColors: ['navy', 'red', 'white', 'green'],
    silhouettes: ['fitted', 'cropped'],
    archetypes: ['sporty', 'relaxed'],
    stylingNote:
      'One sport piece against two non-sport pieces: a track jacket over a shirt and trousers still works; a full tracksuit now reads five years ago.',
    entryPiece: 'a slim retro trainer in a colour your closet already leans on',
  }),
];

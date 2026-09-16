/**
 * Editorial seed trends.
 *
 * The curated backbone of the trend layer, shipped with the app so the
 * report works from the first launch and stays true when the desk is quiet.
 * Since 2026-09-16 these are MERGED with the desk's published trends rather
 * than replaced by them (see trendService): the desk adds this week's
 * sharper material on top; the seeds guarantee the report is global,
 * accessory-complete and illustrated with hand-checked pieces.
 *
 * Every seed is a durable, well-documented direction rather than a
 * micro-trend, because seed content cannot be updated without a release.
 * Each one names:
 *   - keyGarments AND keyAccessories - a trend is never only clothes, and
 *     the shoe or bag is usually the cheapest way in;
 *   - region + regions + reach - where it is strongest, where else it reads
 *     naturally, and how far it has travelled, which is what lets the
 *     locale layer introduce a Copenhagen trend gently in Marrakesh and
 *     rank a Marrakesh one first there;
 *   - pieces - catalogue row ids checked one by one against the trend
 *     (scripts/auditTrendPieces.ts prints every trend's rail for review),
 *     ordered garment, shoe, then bag/belt/jewellery so a rail reads as a
 *     whole look.
 */

import { FashionTrend } from '../models/fashionTrend';

const SEEDED_AT = '2026-09-16T00:00:00.000Z';

function seed(
  trend: Omit<FashionTrend, 'status' | 'source' | 'createdAt' | 'publishedAt'>
): FashionTrend {
  return { ...trend, status: 'published', source: 'editorial', createdAt: SEEDED_AT, publishedAt: SEEDED_AT };
}

export const SEED_TRENDS: FashionTrend[] = [
  seed({
    id: 'seed-wide-leg-tailoring',
    name: 'Wide-leg tailoring',
    summary:
      'The skinny era is fully over: trousers cut wide and fluid, worn with intent rather than slouch, are the base note of every street-style capital.',
    region: 'Copenhagen',
    regions: ['Paris', 'London', 'Seoul', 'New York'],
    reach: 'global',
    stage: 'peak',
    season: 'fall',
    year: 2026,
    keyGarments: ['wide-leg trousers', 'wide-leg', 'pleated trousers', 'palazzo', 'wide-leg wool trousers'],
    keyAccessories: ['loafer', 'pointed', 'slingback', 'slim leather belt', 'leather belt'],
    keyColors: ['grey', 'charcoal', 'camel', 'navy'],
    silhouettes: ['wide-leg', 'pleated', 'high-rise', 'flared'],
    archetypes: ['polished', 'minimal', 'classic'],
    stylingNote:
      'Balance the volume: a fitted or tucked top on a wide leg, a slim belt at the waist, and let the trouser break just over the shoe. A loafer or sneaker makes it daytime; a pointed shoe makes it evening.',
    entryPiece: 'one pair of wide-leg trousers in grey or camel',
    pieces: ['b005', 's007', 'a067', 'b006', 'mb003', 'ms002', 'a016', 'mb004', 's019'],
  }),
  seed({
    id: 'seed-burgundy-oxblood',
    name: 'Burgundy everything',
    summary:
      'Oxblood and burgundy have replaced black as the directional dark - on bags and shoes first, now on knits and outerwear across Milan and Paris.',
    region: 'Milan',
    regions: ['Paris', 'London', 'New York'],
    reach: 'global',
    stage: 'rising',
    season: 'fall',
    year: 2026,
    keyGarments: ['burgundy sweater', 'burgundy coat', 'oxblood', 'burgundy'],
    keyAccessories: ['burgundy bag', 'oxblood bag', 'burgundy loafer', 'burgundy scarf', 'oxblood shoulder bag', 'burgundy wool scarf'],
    keyColors: ['burgundy', 'oxblood', 'maroon', 'wine', 'bordeaux', 'dark red'],
    silhouettes: [],
    archetypes: ['classic', 'polished', 'romantic'],
    stylingNote:
      'Treat burgundy like a neutral: one deep-red piece against grey, camel, denim or cream. Head-to-toe is the advanced move; a bag, a loafer or a scarf is the entry.',
    entryPiece: 'a burgundy bag or loafer worn against neutrals you already own',
    pieces: ['t017', 's006', 'a007', 'mt006', 'ms001', 'ma003', 'a027', 's020'],
  }),
  seed({
    id: 'seed-suede-texture',
    name: 'The suede moment',
    summary:
      'Texture is the new logo: suede jackets, skirts, bags and belts in tan and chocolate carry an outfit without a print in sight. It went from runway to everywhere in a season.',
    region: 'New York',
    regions: ['London', 'Milan', 'Los Angeles'],
    reach: 'global',
    stage: 'peak',
    season: 'fall',
    year: 2026,
    keyGarments: ['suede jacket', 'suede skirt', 'suede bomber', 'suede'],
    keyAccessories: ['suede bag', 'suede boot', 'suede loafer', 'suede belt', 'suede chukka'],
    keyColors: ['tan', 'chocolate', 'brown', 'camel', 'cognac'],
    silhouettes: [],
    archetypes: ['bohemian', 'classic', 'relaxed'],
    stylingNote:
      'Let one suede piece be the texture in the outfit and keep everything else matte and simple - suede next to denim or plain knit reads expensive; suede next to shine reads costume. A suede belt or bag is the low-commitment version.',
    entryPiece: 'a suede piece in tan or chocolate - jacket if you want impact, belt or bag if you want a toe in',
    pieces: ['o009', 's015', 'a005', 'mo004', 'ms003', 'a057', 'b014'],
  }),
  seed({
    id: 'seed-boho-redux',
    name: 'Boho, sharpened',
    summary:
      "The seventies revival that started at Chloé kept going: flowing skirts, fringe, western belts and tonal layering - styled clean, not costume. It's boho with tailoring discipline.",
    region: 'Paris',
    regions: ['Los Angeles', 'Sydney', 'Mexico City'],
    reach: 'global',
    stage: 'rising',
    season: 'fall',
    year: 2026,
    keyGarments: ['maxi skirt', 'fringe', 'peasant blouse', 'flowing skirt', 'boho', 'prairie'],
    keyAccessories: ['western belt', 'concho belt', 'beaded necklace', 'suede bucket bag', 'woven bag', 'leather thong sandal', 'western boot'],
    keyColors: ['cream', 'tan', 'rust', 'chocolate'],
    silhouettes: ['flowing', 'tiered', 'a-line'],
    archetypes: ['bohemian', 'romantic'],
    stylingNote:
      'One flowing piece per outfit, grounded by something structured - a flowing maxi with a fitted knit, a western belt and a sharp boot, never everything soft at once.',
    entryPiece: 'a flowing maxi skirt in cream or rust, or a western belt over what you already own',
    pieces: ['b016', 's028', 'a017', 't033', 'a006', 'o010', 's016', 'a024'],
  }),
  seed({
    id: 'seed-preppy-remix',
    name: 'New prep',
    summary:
      'Seoul and Tokyo are re-cutting the collegiate wardrobe - rugby stripes, cricket knits, pleated skirts and loafers with socks - oversized on top, precise below.',
    region: 'Seoul',
    regions: ['Tokyo', 'New York', 'London'],
    reach: 'global',
    stage: 'rising',
    season: 'fall',
    year: 2026,
    keyGarments: ['cardigan', 'pleated skirt', 'pleated mini skirt', 'plaid skirt', 'rugby shirt', 'polo', 'cable knit', 'v-neck sweater', 'sweater vest'],
    keyAccessories: ['loafer', 'penny loafer', 'crew socks', 'baseball cap'],
    keyColors: ['navy', 'cream', 'forest', 'burgundy'],
    silhouettes: ['cropped', 'pleated', 'boxy'],
    archetypes: ['classic', 'polished', 'sporty'],
    stylingNote:
      'The trick is one scale shift: an oversized knit over a pleated skirt, or a boxy polo tucked into precise trousers. Loafers with visible socks finish it in either department.',
    entryPiece: 'penny loafers, or a cable knit in navy or cream',
    pieces: ['t008', 's006', 'a030', 'b010', 'mt009', 'ms002', 'a015', 't010'],
  }),
  seed({
    id: 'seed-barn-jacket',
    name: 'The barn jacket',
    summary:
      'Waxed cotton and corduroy-collar field jackets replaced the puffer as the default cool outer layer - London first, now everywhere the temperature drops.',
    region: 'London',
    regions: ['Copenhagen', 'New York', 'Tokyo'],
    reach: 'regional',
    stage: 'peak',
    season: 'fall',
    year: 2026,
    keyGarments: ['barn jacket', 'field jacket', 'waxed jacket', 'waxed trucker', 'chore jacket', 'utility jacket', 'barn coat'],
    keyAccessories: ['chelsea boot', 'flat cap', 'wool scarf', 'canvas tote', 'work boot'],
    keyColors: ['olive', 'tan', 'brown', 'navy'],
    silhouettes: ['boxy', 'relaxed'],
    archetypes: ['relaxed', 'classic', 'minimal'],
    stylingNote:
      "Wear it against something it shouldn't go with: a barn jacket over tailored trousers or a slip skirt is the look; over hiking gear it's just a coat. A Chelsea boot and a wool scarf keep it city, not farm.",
    entryPiece: 'a waxed or canvas field jacket in olive or tan',
    pieces: ['o006', 's035', 'a026', 'o005', 'mo003', 'ms009', 'ma004', 'ma016'],
  }),
  seed({
    id: 'seed-sheer-layering',
    name: 'Sheer layering',
    summary:
      'Transparency as a layering tool - a sheer knit or mesh top over a visible base layer, mesh flats on the foot. The most fashion-forward of the current directions, and the fastest way to read current.',
    region: 'Seoul',
    regions: ['Copenhagen', 'London', 'Paris'],
    reach: 'regional',
    stage: 'emerging',
    season: 'fall',
    year: 2026,
    keyGarments: ['sheer top', 'mesh top', 'sheer knit', 'organza', 'chiffon blouse', 'sheer overlay'],
    keyAccessories: ['mesh flats', 'mesh mary janes', 'knit tights', 'fitted tank'],
    keyColors: ['black', 'chocolate', 'cream'],
    silhouettes: ['sheer', 'layered'],
    archetypes: ['edgy', 'romantic'],
    stylingNote:
      'A sheer layer goes over something deliberate - a fitted tank or simple slip - in the same colour family. Tonal keeps it elegant; contrast makes it loud. Mesh flats are the same idea on the foot.',
    entryPiece: 'a sheer knit in black or chocolate over a tank you already own',
    pieces: ['t014', 's055', 'a029', 't016', 'mt021', 't026', 's023'],
  }),
  seed({
    id: 'seed-athletic-heritage',
    name: 'Heritage sport',
    summary:
      'Track jackets, retro trainers and rugby-adjacent pieces styled with everyday tailoring - the athleisure era growing up. Strong in US cities, led by the sneaker rotation.',
    region: 'New York',
    regions: ['Los Angeles', 'Seoul', 'London'],
    reach: 'global',
    stage: 'fading',
    season: 'fall',
    year: 2026,
    keyGarments: ['track jacket', 'zip-up', 'track pants'],
    keyAccessories: ['retro sneaker', 'retro trainer', 'trainer', 'baseball cap', 'belt bag'],
    keyColors: ['navy', 'red', 'white', 'green'],
    silhouettes: ['fitted', 'cropped'],
    archetypes: ['sporty', 'relaxed'],
    stylingNote:
      'One sport piece against two non-sport pieces: a track jacket over a shirt and trousers still works; a full tracksuit now reads five years ago. The retro trainer is the piece that survives.',
    entryPiece: 'a slim retro trainer in a colour your closet already leans on',
    pieces: ['t027', 's009', 'a015', 'o024', 'ms007', 'a010', 'b030'],
  }),

  // ---- Shoe- and accessory-led directions ----
  seed({
    id: 'seed-flat-shoe-dressed-up',
    name: 'The flat shoe, dressed up',
    summary:
      'Ballet flats, Mary Janes and mesh flats have replaced the heel as the default day shoe from Paris to Seoul - worn with socks, under wide trousers, with the dress that used to want a heel.',
    region: 'Paris',
    regions: ['Seoul', 'Tokyo', 'Copenhagen', 'New York'],
    reach: 'global',
    stage: 'peak',
    season: 'fall',
    year: 2026,
    keyGarments: [],
    keyAccessories: ['ballet flat', 'mary jane', 'mesh flat', 'woven flat', 'crew socks', 'loafer', 'driving shoe'],
    keyColors: ['black', 'burgundy', 'cream', 'tan'],
    silhouettes: [],
    archetypes: ['polished', 'romantic', 'minimal'],
    stylingNote:
      'Let the shoe be the small, deliberate detail under something with volume - a wide trouser, a midi, a long coat. Sheer socks or a fine ribbed sock make it current; bare with a mini makes it 2012. The menswear reading is the soft loafer or driving shoe worn with tailoring.',
    entryPiece: 'a pair of ballet flats or Mary Janes in black or burgundy',
    pieces: ['s022', 'a030', 's032', 's055', 'ms002', 's023', 's007'],
  }),
  seed({
    id: 'seed-big-soft-bag',
    name: 'The big, soft bag',
    summary:
      'The mini bag is over. Slouchy east-west shoulder bags and oversized totes in leather and suede - carried under the arm, not on the crook - are the bag of the moment in Milan, Paris and New York.',
    region: 'Milan',
    regions: ['Paris', 'New York', 'London', 'Dubai'],
    reach: 'global',
    stage: 'peak',
    season: 'fall',
    year: 2026,
    keyGarments: [],
    keyAccessories: ['east-west shoulder bag', 'slouchy', 'tote', 'shoulder bag', 'suede bag', 'hobo', 'messenger bag', 'weekender', 'duffle'],
    keyColors: ['chocolate', 'tan', 'black', 'burgundy'],
    silhouettes: [],
    archetypes: ['polished', 'minimal', 'classic'],
    stylingNote:
      'The bag is the volume, so the outfit stays lean: a slouchy shoulder bag over a fitted knit and straight trousers. Chocolate or tan over black reads newer. In menswear the same shift is the soft leather messenger or tote over the backpack.',
    entryPiece: 'a soft leather or suede shoulder bag in chocolate or tan',
    pieces: ['a060', 'a001', 'ma006', 'a005', 'ma016', 'a045', 'ma010'],
  }),
  seed({
    id: 'seed-belted-waist',
    name: 'The belt is back',
    summary:
      'After years of nothing at the waist, the belt is the accessory again: wide leather belts over blazers and dresses, western buckles on denim, a slim belt threaded through wide trousers - one belt doing the work of an outfit.',
    region: 'Milan',
    regions: ['Paris', 'New York', 'Marrakesh'],
    reach: 'global',
    stage: 'rising',
    season: 'fall',
    year: 2026,
    keyGarments: ['oversized blazer', 'shirt dress', 'trench'],
    keyAccessories: ['wide leather belt', 'leather belt', 'suede belt', 'western belt', 'waist belt', 'woven belt', 'braided belt', 'dress belt'],
    keyColors: ['brown', 'tan', 'black', 'cognac'],
    silhouettes: ['belted', 'oversized'],
    archetypes: ['polished', 'classic', 'bohemian'],
    stylingNote:
      'Belt the thing that is not meant to be belted - an oversized blazer, a shirt dress, a long cardigan - and keep the buckle plain unless the whole outfit is plain. For denim and chinos, a braided or suede belt in tan updates jeans you already own.',
    entryPiece: 'a wide leather belt in brown or tan',
    pieces: ['a058', 'o015', 'a016', 'ma001', 'a057', 'ma011', 'd002', 'a017'],
  }),
  seed({
    id: 'seed-scarf-styling',
    name: 'The scarf as the outfit',
    summary:
      'Silk scarves tied at the neck, over the hair, on the bag handle - the smallest piece in the wardrobe doing the most. Paris started it, Istanbul and Dubai never stopped, and modest and fashion dressing meet exactly here.',
    region: 'Paris',
    regions: ['Istanbul', 'Dubai', 'Seoul', 'Marrakesh'],
    reach: 'global',
    stage: 'rising',
    season: 'fall',
    year: 2026,
    keyGarments: [],
    keyAccessories: ['silk scarf', 'headscarf', 'hair scarf', 'tie scarf', 'silk tie', 'knit tie', 'scarf'],
    keyColors: ['red', 'navy', 'ecru', 'printed'],
    silhouettes: [],
    archetypes: ['romantic', 'polished', 'classic'],
    stylingNote:
      'One scarf, one place: knotted small at the neck over a plain knit, tied over the hair with sunglasses, or looped on a bag strap. A printed scarf against a solid outfit is the whole idea; a printed scarf on a printed dress is a fight. In menswear it is the silk knit tie or the neckerchief under a jacket.',
    entryPiece: 'a printed silk scarf worn at the neck or over the hair',
    pieces: ['a003', 'a063', 'ma003', 'a018', 'a040', 'ma009', 'a044'],
  }),

  // ---- Where the world outside the northern capitals is right now ----
  seed({
    id: 'seed-linen-heat-dressing',
    name: 'Linen, head to toe',
    summary:
      'From Marrakesh to Mumbai to Sydney, the hot-city uniform is a linen co-ord: shirt and wide trouser or long skirt in the same sand or ecru, sleeves long against the sun, with a flat sandal and a straw hat. It is what tailoring becomes at 35°.',
    region: 'Marrakesh',
    regions: ['Mumbai', 'Sydney', 'Dubai', 'São Paulo', 'Milan', 'Lagos'],
    reach: 'global',
    stage: 'peak',
    season: 'summer',
    year: 2026,
    keyGarments: ['linen shirt', 'linen trousers', 'linen co-ord', 'linen dress', 'linen blazer', 'linen tunic', 'linen skirt', 'linen pants', 'linen wide-leg', 'co-ord', 'linen'],
    keyAccessories: ['leather sandal', 'leather slide', 'espadrille', 'straw hat', 'panama hat', 'raffia', 'woven flat'],
    keyColors: ['sand', 'ecru', 'white', 'natural', 'olive'],
    silhouettes: ['relaxed', 'wide-leg', 'flowing', 'longline'],
    archetypes: ['minimal', 'relaxed', 'classic'],
    stylingNote:
      'Buy the set and wear it apart as often as together: the linen shirt over a tank with denim, the trousers with a knit in the evening. Tonal sand-on-ecru looks expensive; white-on-white looks like a spa. A leather sandal or espadrille and a straw hat finish it; a sneaker makes it a city outfit.',
    entryPiece: 'a linen shirt in sand or white, long-sleeved',
    pieces: ['t083', 's052', 'a064', 'b059', 'mt027', 'ms018', 'ma014', 'mb017', 'd003', 'o043', 'mo015', 'a059'],
  }),
  seed({
    id: 'seed-long-fluid-layer',
    name: 'The long, fluid layer',
    summary:
      'Kaftan cuts, maxi shirt dresses and open dusters worn over trousers: the long line of modest dressing, cut sharp, is now how Dubai, Istanbul and Marrakesh dress - and London and Paris have adopted the silhouette for the drama of it.',
    region: 'Dubai',
    regions: ['Marrakesh', 'Istanbul', 'Mumbai', 'London', 'Paris'],
    reach: 'global',
    stage: 'rising',
    season: 'fall',
    year: 2026,
    keyGarments: ['kaftan', 'maxi shirt dress', 'duster', 'maxi dress', 'long-sleeve maxi', 'abaya', 'tunic', 'longline', 'maxi skirt'],
    keyAccessories: ['mule', 'loafer', 'structured bag', 'top-handle bag', 'headscarf', 'gold chain', 'gold jewellery'],
    keyColors: ['black', 'ecru', 'sand', 'chocolate', 'olive'],
    silhouettes: ['longline', 'flowing', 'oversized', 'wide-leg'],
    archetypes: ['polished', 'romantic', 'minimal'],
    stylingNote:
      'The length is the point, so nothing else should be long: a floor-length duster over slim or wide trousers and a fitted top, a kaftan dress belted or left to move, a maxi shirt dress open over a co-ord. A mule or loafer and one structured bag keep it sharp. The menswear version is the long overshirt or unlined duster over wide trousers.',
    entryPiece: 'a long-sleeve maxi shirt dress in black or ecru',
    pieces: ['d033', 's024', 'a066', 'd031', 'o044', 'a063', 'o033', 'd032', 'a068'],
  }),
  seed({
    id: 'seed-craft-you-can-see',
    name: 'Craft you can see',
    summary:
      'Hand-work is the luxury signal now: embroidery, block print, woven leather, raffia, beading, the babouche and the huarache. Marrakesh, Mexico City, Jaipur and Lagos never stopped making it; Paris and New York are buying it.',
    region: 'Marrakesh',
    regions: ['Mexico City', 'Mumbai', 'Lagos', 'Paris', 'New York'],
    reach: 'global',
    stage: 'rising',
    season: 'fall',
    year: 2026,
    keyGarments: ['embroidered', 'block print', 'crochet', 'handloom', 'kurta', 'embroidered kaftan', 'embroidered blouse', 'folk blouse'],
    keyAccessories: ['babouche', 'raffia', 'woven belt', 'woven leather', 'huarache', 'jutti', 'beaded necklace', 'silver cuff', 'woven flat', 'basket bag', 'beaded bag'],
    keyColors: ['natural', 'tan', 'indigo', 'rust', 'cream'],
    silhouettes: ['relaxed', 'flowing'],
    archetypes: ['bohemian', 'relaxed', 'classic'],
    stylingNote:
      'One made-by-hand piece against clean basics - a babouche with tailored trousers, a block-print kurta over jeans, a raffia bag with a plain linen dress. Two crafts at once reads souvenir; one reads collected. Silver over gold for this direction.',
    entryPiece: 'leather babouche slippers, or a woven raffia bag',
    pieces: ['t080', 's051', 'a059', 'mt025', 'ms017', 'a031', 'd032', 's053', 't034', 's054', 'a062', 'a024'],
  }),
  seed({
    id: 'seed-print-worn-like-tailoring',
    name: 'Print, worn like tailoring',
    summary:
      'Bold wax and Ankara prints cut into sharp pieces - a print shirt with plain trousers, a print midi with a neutral shoe - and finished with big gold jewellery. Lagos and Accra lead; London, Paris and New York have picked it up on the street.',
    region: 'Lagos',
    regions: ['London', 'Paris', 'New York', 'São Paulo'],
    reach: 'regional',
    stage: 'rising',
    season: 'summer',
    year: 2026,
    keyGarments: ['ankara', 'print shirt', 'printed shirt', 'wax print', 'print dress', 'bold print', 'statement print', 'printed'],
    keyAccessories: ['statement earrings', 'gold chain', 'gold jewellery', 'hoop earrings', 'clutch', 'loafer', 'headwrap'],
    keyColors: ['saffron', 'cobalt', 'emerald', 'red', 'bold print'],
    silhouettes: ['tailored', 'fitted', 'boxy'],
    archetypes: ['polished', 'bohemian', 'edgy'],
    stylingNote:
      'Let the print be the one loud thing: a print shirt buttoned up over plain trousers, a print dress with a neutral loafer or sandal, and gold - hoops, a chain - as the only other statement. Ground it with black, white or tan, never with a second print.',
    entryPiece: 'a bold-print shirt worn over plain trousers you already own',
    pieces: ['t081', 's007', 'a065', 'mt026', 'ms002', 'a068', 'd034', 'a021', 'a035'],
  }),
  seed({
    id: 'seed-quiet-luxury-still',
    name: 'Quiet luxury, still',
    summary:
      'Tonal cashmere, a camel coat, wool trousers, a leather tote and no logo anywhere: the direction that outlasted its own name. Milan wears it; Dubai, New York and Paris keep buying it because it never looks wrong.',
    region: 'Milan',
    regions: ['New York', 'Paris', 'Dubai', 'London'],
    reach: 'global',
    stage: 'peak',
    season: 'fall',
    year: 2026,
    keyGarments: ['cashmere sweater', 'camel coat', 'wool coat', 'wool trousers', 'cashmere', 'silk blouse', 'wrap coat', 'merino', 'overcoat', 'topcoat'],
    keyAccessories: ['leather tote', 'structured bag', 'leather watch', 'field watch', 'silk scarf', 'suede loafer', 'leather briefcase'],
    keyColors: ['camel', 'cream', 'oatmeal', 'grey', 'navy', 'chocolate'],
    silhouettes: ['tailored', 'relaxed'],
    archetypes: ['minimal', 'classic', 'polished'],
    stylingNote:
      'Three tones, never more: camel, cream and grey, or navy, chocolate and ecru. Fabric does the talking - cashmere, fine wool, real leather - so the cuts stay simple. One good bag and a plain watch; anything with a visible logo breaks it.',
    entryPiece: 'a cashmere crewneck in grey or camel',
    pieces: ['t029', 's005', 'a001', 'mt004', 'ma005', 'ma007', 'o001', 'mo002', 'o022', 'a040'],
  }),
];

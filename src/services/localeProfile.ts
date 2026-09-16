/**
 * Locale profile - the deterministic half of "dress for where you are".
 *
 * The trend desk publishes one editorial pool for the world. This module
 * knows, without a network call, what that pool should mean in a given
 * place: which style capitals a city actually takes its cues from, how
 * quickly a trend from elsewhere lands there, what the climate is doing in
 * this month, how covered the street dress code runs, and which local
 * staples a trend is worn with once it arrives.
 *
 * It is a table, not a model. Every row is a durable generalisation about a
 * region's everyday dressing (Marrakesh takes its tailoring cues from Paris
 * and wears them in linen with a babouche; Lagos leads with print and
 * jewellery; Seoul and Tokyo set trends the rest of Asia picks up first).
 * It is deliberately coarse and honest: a country resolves to its region
 * unless a city is a known fashion capital in its own right, and nothing
 * here pretends to know a small town's street style. The GPT locale-style
 * pass (localeStyleService) layers city-level nuance on top when available;
 * this file makes sure the app is never wrong in its absence.
 */

export type Coverage = 'relaxed' | 'moderate' | 'covered';

export type ClimateBand = 'cold' | 'temperate' | 'mediterranean' | 'hot-arid' | 'hot-humid' | 'tropical';

export type LocalSeason = 'spring' | 'summer' | 'fall' | 'winter';

/**
 * A style capital as named in FashionTrend.region. The desk may name any
 * city; these are the ones the locale table can reason about.
 */
export const STYLE_CAPITALS = [
  'Copenhagen', 'Milan', 'Paris', 'London', 'New York', 'Seoul', 'Tokyo',
  'Marrakesh', 'Dubai', 'Lagos', 'Mumbai', 'São Paulo', 'Mexico City', 'Sydney',
  'Istanbul', 'Shanghai', 'Los Angeles', 'Global',
] as const;

export type StyleCapital = (typeof STYLE_CAPITALS)[number];

/** How a region finishes a look once a trend has landed there. */
export interface LocalWear {
  /** "in linen and cotton" */
  fabric: string;
  /** "with a leather babouche or a flat sandal" */
  shoe: string;
  /** "a woven raffia tote" */
  carry: string;
  /** "silver jewellery" */
  finish: string;
}

interface RegionProfile {
  label: string;
  /** The capital this region itself reports to, when it has one. */
  hub?: StyleCapital;
  /** Capitals whose trends read naturally here, strongest first. */
  capitals: StyleCapital[];
  /** How quickly a trend from a non-affine capital lands, 0..1. */
  cosmopolitan: number;
  climate: ClimateBand;
  coverage: Coverage;
  /** Local garment and accessory words, lowercase, matched against catalogue text. */
  staples: string[];
  wear: LocalWear;
  /** One honest sentence on the everyday scene. */
  scene: string;
}

/**
 * Regions are named by how people dress, not by geopolitics: the Gulf and
 * the Levant part ways on coverage, southern and northern Europe on climate.
 */
const REGIONS: Record<string, RegionProfile> = {
  'western-europe': {
    label: 'Western Europe',
    hub: 'Paris',
    capitals: ['Paris', 'London', 'Copenhagen', 'Milan'],
    cosmopolitan: 0.9,
    climate: 'temperate',
    coverage: 'relaxed',
    staples: ['trench', 'loafer', 'wool coat', 'leather belt', 'silk scarf', 'ballet flat', 'tote'],
    wear: { fabric: 'in wool, cotton and leather', shoe: 'with a loafer or a ballet flat', carry: 'a structured leather bag', finish: 'a silk scarf' },
    scene: 'Polished and understated: tailoring, good coats, one considered accessory.',
  },
  'northern-europe': {
    label: 'Northern Europe',
    hub: 'Copenhagen',
    capitals: ['Copenhagen', 'London', 'Paris'],
    cosmopolitan: 0.85,
    climate: 'cold',
    coverage: 'relaxed',
    staples: ['wool coat', 'knit', 'chelsea boot', 'trainer', 'beanie', 'wool scarf', 'tote', 'puffer'],
    wear: { fabric: 'in wool and heavy cotton', shoe: 'with a chunky trainer or a flat boot', carry: 'a big soft tote', finish: 'a beanie and a long scarf' },
    scene: 'Relaxed, colour-confident and practical: layers, flat shoes, weather-ready coats.',
  },
  'southern-europe': {
    label: 'Southern Europe',
    hub: 'Milan',
    capitals: ['Milan', 'Paris', 'London'],
    cosmopolitan: 0.85,
    climate: 'mediterranean',
    coverage: 'relaxed',
    staples: ['linen', 'loafer', 'leather sandal', 'espadrille', 'sunglasses', 'leather belt', 'shoulder bag'],
    wear: { fabric: 'in linen, cotton and fine wool', shoe: 'with a loafer or a leather sandal', carry: 'a leather shoulder bag', finish: 'sunglasses and a leather belt' },
    scene: 'Groomed and warm-weather-first: tailoring in linen, leather accessories, good sunglasses.',
  },
  'eastern-europe': {
    label: 'Eastern Europe',
    capitals: ['Paris', 'Milan', 'Copenhagen'],
    cosmopolitan: 0.7,
    climate: 'cold',
    coverage: 'relaxed',
    staples: ['wool coat', 'boot', 'knit', 'leather jacket', 'wool scarf', 'structured bag'],
    wear: { fabric: 'in wool and leather', shoe: 'with a boot', carry: 'a structured bag', finish: 'a wool scarf' },
    scene: 'Sharp and weather-led: long coats, boots, polished going-out dressing.',
  },
  'north-america': {
    label: 'North America',
    hub: 'New York',
    capitals: ['New York', 'Los Angeles', 'London', 'Copenhagen'],
    cosmopolitan: 0.85,
    climate: 'temperate',
    coverage: 'relaxed',
    staples: ['denim', 'sneaker', 'trainer', 'tote', 'cap', 'leather belt', 'crossbody'],
    wear: { fabric: 'in denim, cotton and knit', shoe: 'with a clean sneaker or a loafer', carry: 'a tote or a crossbody', finish: 'a cap or a leather belt' },
    scene: 'Casual-first with a polished edge: denim, sneakers, one sharp piece.',
  },
  'latin-america': {
    label: 'Latin America',
    hub: 'São Paulo',
    capitals: ['São Paulo', 'Mexico City', 'New York', 'Milan'],
    cosmopolitan: 0.7,
    climate: 'tropical',
    coverage: 'relaxed',
    staples: ['linen', 'leather sandal', 'huarache', 'woven bag', 'gold jewellery', 'sunglasses', 'straw hat', 'espadrille'],
    wear: { fabric: 'in linen and light cotton', shoe: 'with a leather sandal or a woven flat', carry: 'a woven or leather bag', finish: 'gold jewellery and sunglasses' },
    scene: 'Colour, fit and craft: bright palettes, woven leather, gold, dressing up for the evening.',
  },
  caribbean: {
    label: 'The Caribbean',
    capitals: ['New York', 'London', 'São Paulo'],
    cosmopolitan: 0.6,
    climate: 'tropical',
    coverage: 'relaxed',
    staples: ['linen', 'leather sandal', 'slide', 'straw hat', 'woven bag', 'sunglasses', 'gold jewellery'],
    wear: { fabric: 'in linen and breathable cotton', shoe: 'with a leather sandal or a slide', carry: 'a woven bag', finish: 'gold jewellery and a straw hat' },
    scene: 'Heat-first dressing with colour and shine: linen, sandals, gold.',
  },
  'north-africa': {
    label: 'North Africa',
    hub: 'Marrakesh',
    capitals: ['Marrakesh', 'Paris', 'Milan', 'Dubai'],
    cosmopolitan: 0.6,
    climate: 'hot-arid',
    coverage: 'moderate',
    staples: ['linen', 'kaftan', 'babouche', 'raffia', 'leather sandal', 'silver jewellery', 'leather belt', 'headscarf', 'djellaba', 'woven bag'],
    wear: { fabric: 'in linen and light cotton, sleeves and hems long', shoe: 'with a leather babouche or a flat sandal', carry: 'a woven raffia or leather tote', finish: 'silver jewellery and a leather belt' },
    scene: 'Long, light and layered: linen tailoring, kaftan-cut dresses, leather craft, covered shoulders in the medina.',
  },
  'west-africa': {
    label: 'West Africa',
    hub: 'Lagos',
    capitals: ['Lagos', 'London', 'Paris', 'New York'],
    cosmopolitan: 0.7,
    climate: 'tropical',
    coverage: 'relaxed',
    staples: ['print', 'ankara', 'linen', 'leather sandal', 'gold jewellery', 'statement earring', 'headwrap', 'clutch', 'loafer'],
    wear: { fabric: 'in bold print, linen and crisp cotton', shoe: 'with a leather sandal or a loafer', carry: 'a clutch or a structured bag', finish: 'gold jewellery and a statement earring' },
    scene: 'Print, tailoring and jewellery worn with confidence: Lagos leads, everyone dresses up.',
  },
  'east-africa': {
    label: 'East Africa',
    capitals: ['Lagos', 'Dubai', 'London'],
    cosmopolitan: 0.6,
    climate: 'tropical',
    coverage: 'moderate',
    staples: ['linen', 'print', 'leather sandal', 'beaded jewellery', 'headwrap', 'woven bag', 'kaftan'],
    wear: { fabric: 'in light cotton and linen', shoe: 'with a leather sandal', carry: 'a woven or beaded bag', finish: 'beaded jewellery' },
    scene: 'Practical, bright and craft-led: cotton, beads, sandals, modest cuts in the city.',
  },
  'southern-africa': {
    label: 'Southern Africa',
    capitals: ['London', 'Lagos', 'New York', 'Copenhagen'],
    cosmopolitan: 0.7,
    climate: 'temperate',
    coverage: 'relaxed',
    staples: ['denim', 'sneaker', 'print', 'leather jacket', 'knit', 'crossbody', 'sunglasses'],
    wear: { fabric: 'in denim, cotton and knit', shoe: 'with a sneaker or a boot', carry: 'a crossbody', finish: 'sunglasses' },
    scene: 'Street-led and seasonal: denim, sneakers, print and layers for real winters.',
  },
  levant: {
    label: 'The Levant',
    capitals: ['Istanbul', 'Dubai', 'Paris', 'Milan'],
    cosmopolitan: 0.7,
    climate: 'mediterranean',
    coverage: 'moderate',
    staples: ['linen', 'tailored trouser', 'loafer', 'leather sandal', 'gold jewellery', 'structured bag', 'sunglasses'],
    wear: { fabric: 'in linen and fine cotton', shoe: 'with a loafer or a leather sandal', carry: 'a structured bag', finish: 'gold jewellery and sunglasses' },
    scene: 'Groomed and modest-polished: tailoring, gold, careful coverage.',
  },
  gulf: {
    label: 'The Gulf',
    hub: 'Dubai',
    capitals: ['Dubai', 'Paris', 'Milan', 'London'],
    cosmopolitan: 0.9,
    climate: 'hot-arid',
    coverage: 'covered',
    staples: ['abaya', 'kaftan', 'linen', 'maxi', 'long sleeve', 'wide-leg', 'loafer', 'mule', 'designer bag', 'gold jewellery', 'sunglasses', 'headscarf'],
    wear: { fabric: 'in flowing, full-length layers - linen, silk, fine wool', shoe: 'with a loafer, a mule or a sharp flat', carry: 'a structured designer bag', finish: 'gold jewellery and sunglasses' },
    scene: 'Luxury and modesty in the same outfit: long fluid layers, immaculate bags, gold.',
  },
  'turkey-caucasus': {
    label: 'Turkey and the Caucasus',
    hub: 'Istanbul',
    capitals: ['Istanbul', 'Paris', 'Milan', 'London'],
    cosmopolitan: 0.8,
    climate: 'mediterranean',
    coverage: 'moderate',
    staples: ['trench', 'wide-leg', 'loafer', 'leather bag', 'headscarf', 'wool coat', 'gold jewellery', 'linen'],
    wear: { fabric: 'in wool, linen and leather', shoe: 'with a loafer or a boot', carry: 'a leather shoulder bag', finish: 'gold jewellery' },
    scene: 'Istanbul dresses between Paris and the Levant: long coats, tailoring, polished modest looks.',
  },
  'central-asia': {
    label: 'Central Asia',
    capitals: ['Istanbul', 'Dubai', 'Seoul'],
    cosmopolitan: 0.5,
    climate: 'cold',
    coverage: 'moderate',
    staples: ['wool coat', 'boot', 'knit', 'headscarf', 'leather bag'],
    wear: { fabric: 'in wool and heavy cotton', shoe: 'with a boot', carry: 'a leather bag', finish: 'a scarf' },
    scene: 'Weather-first and modest: coats, boots, long layers.',
  },
  'south-asia': {
    label: 'South Asia',
    hub: 'Mumbai',
    capitals: ['Mumbai', 'Dubai', 'London', 'Paris'],
    cosmopolitan: 0.7,
    climate: 'hot-humid',
    coverage: 'moderate',
    staples: ['kurta', 'linen', 'cotton', 'co-ord', 'block print', 'jutti', 'leather sandal', 'gold jewellery', 'dupatta', 'tote', 'wide-leg'],
    wear: { fabric: 'in breathable cotton and linen, often as a co-ord', shoe: 'with a leather sandal or a jutti', carry: 'a tote', finish: 'gold jewellery' },
    scene: 'Heat, colour and handloom: kurtas and co-ords, block prints, gold, Western tailoring in cotton.',
  },
  'east-asia': {
    label: 'East Asia',
    hub: 'Seoul',
    capitals: ['Seoul', 'Tokyo', 'Shanghai', 'Paris'],
    cosmopolitan: 0.95,
    climate: 'temperate',
    coverage: 'relaxed',
    staples: ['loafer', 'sneaker', 'wide-leg', 'oversized', 'cardigan', 'crossbody', 'cap', 'ballet flat', 'mary jane'],
    wear: { fabric: 'in crisp cotton, knit and technical fabric', shoe: 'with a loafer, a Mary Jane or a clean sneaker', carry: 'a small crossbody', finish: 'a cap or minimal jewellery' },
    scene: 'The fastest street style in the world: proportion play, loafers, precise layering.',
  },
  'southeast-asia': {
    label: 'Southeast Asia',
    capitals: ['Seoul', 'Tokyo', 'Shanghai', 'Dubai'],
    cosmopolitan: 0.8,
    climate: 'hot-humid',
    coverage: 'moderate',
    staples: ['linen', 'cotton', 'sandal', 'slide', 'sneaker', 'crossbody', 'cap', 'headscarf', 'long sleeve', 'wide-leg'],
    wear: { fabric: 'in linen and light cotton, cut loose', shoe: 'with a sandal or a clean sneaker', carry: 'a crossbody', finish: 'a cap or sunglasses' },
    scene: 'Humidity dressing with Seoul-speed trend uptake: loose cotton, sneakers, modest options everywhere.',
  },
  oceania: {
    label: 'Australia and New Zealand',
    hub: 'Sydney',
    capitals: ['Sydney', 'London', 'Copenhagen', 'Los Angeles'],
    cosmopolitan: 0.8,
    climate: 'mediterranean',
    coverage: 'relaxed',
    staples: ['linen', 'slide', 'leather sandal', 'sneaker', 'tote', 'sunglasses', 'straw hat', 'knit'],
    wear: { fabric: 'in linen and soft knit', shoe: 'with a slide or a sneaker', carry: 'a big tote', finish: 'sunglasses and a straw hat' },
    scene: 'Coastal minimal: linen, natural tones, slides, sunglasses - and the seasons run opposite to the northern capitals.',
  },
};

/** Country (as geocoders report it, lowercase) -> region key. */
const COUNTRY_REGIONS: Record<string, string> = {
  // Western Europe
  france: 'western-europe', belgium: 'western-europe', netherlands: 'western-europe', luxembourg: 'western-europe',
  germany: 'western-europe', austria: 'western-europe', switzerland: 'western-europe', 'united kingdom': 'western-europe',
  uk: 'western-europe', england: 'western-europe', scotland: 'western-europe', wales: 'western-europe',
  ireland: 'western-europe', monaco: 'western-europe',
  // Northern Europe
  denmark: 'northern-europe', sweden: 'northern-europe', norway: 'northern-europe', finland: 'northern-europe',
  iceland: 'northern-europe', estonia: 'northern-europe', latvia: 'northern-europe', lithuania: 'northern-europe',
  // Southern Europe
  italy: 'southern-europe', spain: 'southern-europe', portugal: 'southern-europe', greece: 'southern-europe',
  malta: 'southern-europe', cyprus: 'southern-europe', croatia: 'southern-europe', slovenia: 'southern-europe',
  // Eastern Europe
  poland: 'eastern-europe', 'czech republic': 'eastern-europe', czechia: 'eastern-europe', slovakia: 'eastern-europe',
  hungary: 'eastern-europe', romania: 'eastern-europe', bulgaria: 'eastern-europe', serbia: 'eastern-europe',
  ukraine: 'eastern-europe', russia: 'eastern-europe', 'russian federation': 'eastern-europe', belarus: 'eastern-europe',
  moldova: 'eastern-europe', 'bosnia and herzegovina': 'eastern-europe', montenegro: 'eastern-europe',
  'north macedonia': 'eastern-europe', albania: 'eastern-europe',
  // North America
  'united states': 'north-america', 'united states of america': 'north-america', usa: 'north-america', us: 'north-america',
  canada: 'north-america',
  // Latin America
  mexico: 'latin-america', brazil: 'latin-america', argentina: 'latin-america', chile: 'latin-america',
  colombia: 'latin-america', peru: 'latin-america', uruguay: 'latin-america', paraguay: 'latin-america',
  bolivia: 'latin-america', ecuador: 'latin-america', venezuela: 'latin-america', guatemala: 'latin-america',
  'costa rica': 'latin-america', panama: 'latin-america', honduras: 'latin-america', nicaragua: 'latin-america',
  'el salvador': 'latin-america',
  // Caribbean
  jamaica: 'caribbean', cuba: 'caribbean', 'dominican republic': 'caribbean', 'puerto rico': 'caribbean',
  bahamas: 'caribbean', barbados: 'caribbean', 'trinidad and tobago': 'caribbean', haiti: 'caribbean',
  // North Africa
  morocco: 'north-africa', algeria: 'north-africa', tunisia: 'north-africa', egypt: 'north-africa', libya: 'north-africa',
  // West Africa
  nigeria: 'west-africa', ghana: 'west-africa', senegal: 'west-africa', "côte d'ivoire": 'west-africa',
  "cote d'ivoire": 'west-africa', 'ivory coast': 'west-africa', cameroon: 'west-africa', benin: 'west-africa',
  togo: 'west-africa', mali: 'west-africa', 'burkina faso': 'west-africa', guinea: 'west-africa',
  'sierra leone': 'west-africa', liberia: 'west-africa', gambia: 'west-africa',
  // East Africa
  kenya: 'east-africa', ethiopia: 'east-africa', tanzania: 'east-africa', uganda: 'east-africa', rwanda: 'east-africa',
  somalia: 'east-africa', sudan: 'east-africa', eritrea: 'east-africa', djibouti: 'east-africa',
  // Southern Africa
  'south africa': 'southern-africa', namibia: 'southern-africa', botswana: 'southern-africa', zimbabwe: 'southern-africa',
  zambia: 'southern-africa', mozambique: 'southern-africa', angola: 'southern-africa', mauritius: 'southern-africa',
  // Levant
  lebanon: 'levant', jordan: 'levant', israel: 'levant', palestine: 'levant', syria: 'levant', iraq: 'levant',
  // Gulf
  'united arab emirates': 'gulf', uae: 'gulf', 'saudi arabia': 'gulf', qatar: 'gulf', kuwait: 'gulf', bahrain: 'gulf',
  oman: 'gulf', iran: 'gulf',
  // Turkey and the Caucasus
  turkey: 'turkey-caucasus', türkiye: 'turkey-caucasus', turkiye: 'turkey-caucasus', georgia: 'turkey-caucasus',
  armenia: 'turkey-caucasus', azerbaijan: 'turkey-caucasus',
  // Central Asia
  kazakhstan: 'central-asia', uzbekistan: 'central-asia', kyrgyzstan: 'central-asia', tajikistan: 'central-asia',
  turkmenistan: 'central-asia', afghanistan: 'central-asia', mongolia: 'central-asia',
  // South Asia
  india: 'south-asia', pakistan: 'south-asia', bangladesh: 'south-asia', 'sri lanka': 'south-asia', nepal: 'south-asia',
  bhutan: 'south-asia', maldives: 'south-asia',
  // East Asia
  'south korea': 'east-asia', korea: 'east-asia', 'republic of korea': 'east-asia', japan: 'east-asia',
  china: 'east-asia', taiwan: 'east-asia', 'hong kong': 'east-asia', macau: 'east-asia',
  // Southeast Asia
  singapore: 'southeast-asia', malaysia: 'southeast-asia', indonesia: 'southeast-asia', thailand: 'southeast-asia',
  vietnam: 'southeast-asia', philippines: 'southeast-asia', cambodia: 'southeast-asia', laos: 'southeast-asia',
  myanmar: 'southeast-asia', brunei: 'southeast-asia',
  // Oceania
  australia: 'oceania', 'new zealand': 'oceania', fiji: 'oceania',
};

/**
 * Cities that are style capitals or highly cosmopolitan hubs in their own
 * right. A capital reports to itself; a hub takes foreign trends faster
 * than its region and may skew the coverage norm.
 */
const CITY_OVERRIDES: Record<string, Partial<Pick<RegionProfile, 'hub' | 'capitals' | 'cosmopolitan' | 'coverage'>>> = {
  copenhagen: { hub: 'Copenhagen', cosmopolitan: 1 },
  milan: { hub: 'Milan', cosmopolitan: 1 },
  milano: { hub: 'Milan', cosmopolitan: 1 },
  paris: { hub: 'Paris', cosmopolitan: 1 },
  london: { hub: 'London', capitals: ['London', 'Paris', 'Copenhagen', 'Milan'], cosmopolitan: 1 },
  'new york': { hub: 'New York', cosmopolitan: 1 },
  'new york city': { hub: 'New York', cosmopolitan: 1 },
  brooklyn: { hub: 'New York', cosmopolitan: 1 },
  manhattan: { hub: 'New York', cosmopolitan: 1 },
  'los angeles': { hub: 'Los Angeles', capitals: ['Los Angeles', 'New York', 'Tokyo', 'Copenhagen'], cosmopolitan: 0.95 },
  seoul: { hub: 'Seoul', cosmopolitan: 1 },
  tokyo: { hub: 'Tokyo', capitals: ['Tokyo', 'Seoul', 'Paris', 'London'], cosmopolitan: 1 },
  shanghai: { hub: 'Shanghai', capitals: ['Shanghai', 'Seoul', 'Tokyo', 'Paris'], cosmopolitan: 0.95 },
  marrakesh: { hub: 'Marrakesh', cosmopolitan: 0.7 },
  marrakech: { hub: 'Marrakesh', cosmopolitan: 0.7 },
  casablanca: { hub: 'Marrakesh', cosmopolitan: 0.75 },
  dubai: { hub: 'Dubai', cosmopolitan: 1 },
  'abu dhabi': { hub: 'Dubai', cosmopolitan: 0.9 },
  doha: { hub: 'Dubai', cosmopolitan: 0.85 },
  riyadh: { hub: 'Dubai', cosmopolitan: 0.75 },
  lagos: { hub: 'Lagos', cosmopolitan: 0.85 },
  accra: { hub: 'Lagos', cosmopolitan: 0.75 },
  mumbai: { hub: 'Mumbai', cosmopolitan: 0.85 },
  bombay: { hub: 'Mumbai', cosmopolitan: 0.85 },
  delhi: { hub: 'Mumbai', cosmopolitan: 0.8 },
  'new delhi': { hub: 'Mumbai', cosmopolitan: 0.8 },
  bangalore: { hub: 'Mumbai', cosmopolitan: 0.8 },
  bengaluru: { hub: 'Mumbai', cosmopolitan: 0.8 },
  'são paulo': { hub: 'São Paulo', cosmopolitan: 0.9 },
  'sao paulo': { hub: 'São Paulo', cosmopolitan: 0.9 },
  'rio de janeiro': { hub: 'São Paulo', cosmopolitan: 0.85 },
  'mexico city': { hub: 'Mexico City', capitals: ['Mexico City', 'São Paulo', 'New York', 'Milan'], cosmopolitan: 0.9 },
  'ciudad de méxico': { hub: 'Mexico City', capitals: ['Mexico City', 'São Paulo', 'New York', 'Milan'], cosmopolitan: 0.9 },
  sydney: { hub: 'Sydney', cosmopolitan: 0.9 },
  melbourne: { hub: 'Sydney', cosmopolitan: 0.9 },
  istanbul: { hub: 'Istanbul', cosmopolitan: 0.9 },
  singapore: { cosmopolitan: 0.95, coverage: 'relaxed' },
  'hong kong': { hub: 'Shanghai', cosmopolitan: 0.95 },
  beirut: { cosmopolitan: 0.85, coverage: 'relaxed' },
  'tel aviv': { cosmopolitan: 0.85, coverage: 'relaxed' },
  'cape town': { cosmopolitan: 0.85 },
  johannesburg: { cosmopolitan: 0.8 },
  nairobi: { cosmopolitan: 0.75 },
  jakarta: { cosmopolitan: 0.85 },
  bangkok: { cosmopolitan: 0.9, coverage: 'relaxed' },
  'kuala lumpur': { cosmopolitan: 0.85 },
  manila: { cosmopolitan: 0.8, coverage: 'relaxed' },
  'ho chi minh city': { cosmopolitan: 0.8 },
  toronto: { cosmopolitan: 0.9 },
  vancouver: { cosmopolitan: 0.85 },
  miami: { cosmopolitan: 0.9 },
  chicago: { cosmopolitan: 0.9 },
  'san francisco': { cosmopolitan: 0.9 },
  berlin: { hub: 'Copenhagen', capitals: ['Copenhagen', 'London', 'Paris'], cosmopolitan: 0.95 },
  amsterdam: { capitals: ['Copenhagen', 'Paris', 'London'], cosmopolitan: 0.95 },
  lisbon: { capitals: ['Milan', 'Paris', 'Copenhagen'], cosmopolitan: 0.9 },
  madrid: { capitals: ['Milan', 'Paris', 'London'], cosmopolitan: 0.9 },
  barcelona: { capitals: ['Milan', 'Paris', 'Copenhagen'], cosmopolitan: 0.9 },
  stockholm: { cosmopolitan: 0.95 },
  oslo: { cosmopolitan: 0.9 },
  cairo: { hub: 'Marrakesh', capitals: ['Dubai', 'Paris', 'Marrakesh'], cosmopolitan: 0.7, coverage: 'covered' },
  tunis: { hub: 'Marrakesh', cosmopolitan: 0.7 },
  algiers: { hub: 'Marrakesh', cosmopolitan: 0.6 },
};

export interface LocaleProfile {
  /** "Marrakesh, Morocco" - what the user sees. */
  label: string;
  city?: string;
  country?: string;
  regionKey: string;
  regionLabel: string;
  /** The capital this place takes its cues from first, when it has one. */
  hub?: StyleCapital;
  capitals: StyleCapital[];
  cosmopolitan: number;
  climate: ClimateBand;
  coverage: Coverage;
  hemisphere: 'north' | 'south';
  /** The season on the ground this month - opposite to the capitals' south of the equator. */
  localSeason: LocalSeason;
  staples: string[];
  wear: LocalWear;
  scene: string;
  /** True when the place resolved from the country only - the city is not a known scene. */
  generalised: boolean;
}

export interface PlaceInput {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
}

const SOUTHERN_COUNTRIES = new Set([
  'australia', 'new zealand', 'south africa', 'argentina', 'chile', 'uruguay', 'paraguay', 'brazil',
  'bolivia', 'peru', 'namibia', 'botswana', 'zimbabwe', 'zambia', 'mozambique', 'angola', 'madagascar',
  'mauritius', 'fiji', 'indonesia', 'tanzania', 'rwanda', 'burundi', 'malawi',
]);

export function localSeasonFor(month: number, hemisphere: 'north' | 'south'): LocalSeason {
  // month: 0-11
  const northern: LocalSeason =
    month <= 1 || month === 11 ? 'winter' : month <= 4 ? 'spring' : month <= 7 ? 'summer' : 'fall';
  if (hemisphere === 'north') return northern;
  const flip: Record<LocalSeason, LocalSeason> = { winter: 'summer', spring: 'fall', summer: 'winter', fall: 'spring' };
  return flip[northern];
}

function normalise(value?: string): string {
  return (value || '').trim().toLowerCase();
}

/**
 * Resolves the locale profile for a place. Never throws and never returns
 * nothing for a known country; an unknown country yields undefined so the
 * caller falls back to weather-only ranking rather than a wrong region.
 */
export function resolveLocaleProfile(place: PlaceInput, now: Date = new Date()): LocaleProfile | undefined {
  const city = normalise(place.city);
  const country = normalise(place.country);
  const cityOverride = CITY_OVERRIDES[city];

  let regionKey = COUNTRY_REGIONS[country];
  // A capital named without a country (or with an unrecognised one) still resolves.
  if (!regionKey && cityOverride?.hub) {
    regionKey = Object.keys(REGIONS).find(k => REGIONS[k].hub === cityOverride.hub) || regionKey;
  }
  if (!regionKey) return undefined;

  const region = REGIONS[regionKey];
  const hemisphere: 'north' | 'south' =
    typeof place.latitude === 'number' ? (place.latitude < 0 ? 'south' : 'north') : SOUTHERN_COUNTRIES.has(country) ? 'south' : 'north';

  const hub = cityOverride?.hub ?? region.hub;
  const capitals = cityOverride?.capitals ?? region.capitals;
  const orderedCapitals = hub && !capitals.includes(hub) ? [hub, ...capitals] : capitals;

  return {
    label: [place.city, place.country].filter(Boolean).join(', '),
    city: place.city,
    country: place.country,
    regionKey,
    regionLabel: region.label,
    hub,
    capitals: orderedCapitals,
    cosmopolitan: cityOverride?.cosmopolitan ?? region.cosmopolitan,
    climate: region.climate,
    coverage: cityOverride?.coverage ?? region.coverage,
    hemisphere,
    localSeason: localSeasonFor(now.getMonth(), hemisphere),
    staples: region.staples,
    wear: region.wear,
    scene: region.scene,
    generalised: !cityOverride,
  };
}

/**
 * A representative temperature (°F) for the climate band in the local
 * season, used only when live weather is unavailable so a hot-city user
 * without a weather fix is still not shown a suede-jacket trend first.
 */
export function typicalTemperatureF(climate: ClimateBand, season: LocalSeason): number {
  const table: Record<ClimateBand, Record<LocalSeason, number>> = {
    cold: { winter: 28, spring: 48, summer: 68, fall: 48 },
    temperate: { winter: 38, spring: 58, summer: 78, fall: 58 },
    mediterranean: { winter: 52, spring: 66, summer: 86, fall: 70 },
    'hot-arid': { winter: 62, spring: 82, summer: 100, fall: 84 },
    'hot-humid': { winter: 76, spring: 88, summer: 90, fall: 86 },
    tropical: { winter: 80, spring: 84, summer: 84, fall: 82 },
  };
  return table[climate][season];
}

/**
 * How naturally a trend from `trendRegion` reads in this place, as a
 * ranking multiplier with an honest one-line reason.
 *
 * The diffusion rule is the "fine balance": a trend is strongest at home,
 * reads naturally in places that take cues from that capital, and reaches
 * everywhere else at a speed set by how cosmopolitan the place is and how
 * far along the trend is. A peak or global trend travels on its own; an
 * emerging trend from an unrelated capital is introduced gently rather than
 * ranked over what the local streets actually wear.
 */
export function regionAffinity(
  trendRegion: string,
  trendRegions: string[] | undefined,
  stage: 'emerging' | 'rising' | 'peak' | 'fading',
  reach: 'local' | 'regional' | 'global' | undefined,
  profile: LocaleProfile
): { multiplier: number; note: string | null; introduced: boolean } {
  const places = [trendRegion, ...(trendRegions || [])].map(r => r.toLowerCase());
  const where = profile.city || profile.regionLabel;

  // Home first: a trend strong in this place's own capital leads here
  // whatever its reach.
  if (profile.hub && places.includes(profile.hub.toLowerCase())) {
    // A capital speaks for itself; a suburb or second city that follows a
    // capital is told which one, so the claim stays honest.
    const isTheHub = (profile.city || '').toLowerCase() === profile.hub.toLowerCase();
    const note = isTheHub ? `Strong in ${where} right now` : `Strong in ${profile.hub}, which ${where} dresses like`;
    return { multiplier: 1.3, note, introduced: false };
  }
  // Then the capitals this place takes its cues from, in order.
  const index = profile.capitals.findIndex(c => places.includes(c.toLowerCase()));
  if (index >= 0) {
    const matched = profile.capitals[index];
    const multiplier = index === 0 ? 1.18 : index === 1 ? 1.12 : 1.06;
    const note =
      matched.toLowerCase() === trendRegion.toLowerCase()
        ? `${trendRegion} style reads naturally in ${where}`
        : `Strong in ${matched}, which ${where} takes its cues from`;
    return { multiplier, note, introduced: false };
  }
  // A genuinely global trend reads everywhere without needing a bridge.
  if (places.includes('global') || reach === 'global') {
    return { multiplier: 1.05, note: null, introduced: false };
  }

  // Foreign to this place: diffuse by cosmopolitanism and maturity.
  const base = 0.62 + 0.38 * profile.cosmopolitan;
  const byStage = stage === 'peak' ? Math.max(base, 0.92) : stage === 'rising' ? base : stage === 'emerging' ? base * 0.9 : base * 0.85;
  const byReach = reach === 'local' ? byStage * 0.9 : byStage;
  const introduced = profile.cosmopolitan >= 0.75 && stage !== 'fading';
  return {
    multiplier: byReach,
    note: introduced ? `Arriving in ${where} from ${trendRegion}` : null,
    introduced,
  };
}

/**
 * Coverage fit: a skin-showing trend in a covered or moderate dress code is
 * demoted, and - more usefully - re-styled. The adaptation line is what
 * makes the trend wearable there rather than merely hidden.
 */
export function coverageFit(
  showsSkin: boolean,
  profile: LocaleProfile
): { multiplier: number; adaptation: string | null } {
  if (!showsSkin || profile.coverage === 'relaxed') return { multiplier: 1, adaptation: null };
  const where = profile.city || profile.regionLabel;
  if (profile.coverage === 'covered') {
    return {
      multiplier: 0.55,
      adaptation: `In ${where} this is worn over a full-length base layer, or kept for indoors and evenings out.`,
    };
  }
  return {
    multiplier: 0.8,
    adaptation: `In ${where} it reads best layered: a sheer piece over a full base, a short hem over trousers or with tights.`,
  };
}

/**
 * The local wearing of a trend - "In Marrakesh, it's worn in linen, with a
 * leather babouche or a flat sandal, and a woven raffia tote." Skips the
 * shoe clause when the trend itself is about shoes, and the carry clause
 * when it is about bags, so the line never argues with the trend.
 */
export function localWearLine(
  profile: LocaleProfile,
  anchors: string[],
  options: { trendIsShoes?: boolean; trendIsBags?: boolean } = {}
): string {
  const where = profile.city || profile.regionLabel;
  const wear = profile.wear;
  const text = anchors.join(' ').toLowerCase();
  const shoeTrend = options.trendIsShoes ?? /loafer|sneaker|trainer|boot|sandal|flat|heel|mule|slide|babouche|espadrille|clog/.test(text);
  const bagTrend = options.trendIsBags ?? /bag|tote|clutch|backpack|crossbody/.test(text);
  const clauses = [wear.fabric];
  if (!shoeTrend) clauses.push(wear.shoe);
  if (!bagTrend) clauses.push(`carrying ${wear.carry}`);
  clauses.push(`finished with ${wear.finish}`);
  return `How ${where} wears it: ${clauses.join(', ')}.`;
}

/** Whether a piece of product text is one of this place's local staples. */
export function isLocalStaple(profile: LocaleProfile | undefined, haystack: string): boolean {
  if (!profile) return false;
  const text = haystack.toLowerCase();
  return profile.staples.some(s => text.includes(s));
}

export const localeProfileService = {
  resolveLocaleProfile,
  regionAffinity,
  coverageFit,
  localWearLine,
  typicalTemperatureF,
  localSeasonFor,
  isLocalStaple,
};

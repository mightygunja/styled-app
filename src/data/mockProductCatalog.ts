/**
 * Curated product catalogue - 300 pieces across mainstream retailers,
 * boutiques and resale, shaped exactly like a real affiliate network
 * response (see Product in models/product.ts) so swapping this for a live
 * feed is a one-file change, not a rebuild. See services/affiliateNetwork.ts.
 *
 * Deliberately curated, not random: coverage tracks the trend registry's
 * entry pieces (wide-leg trousers in camel, plaid skirts, suede, burgundy,
 * barn jackets, loafers, sheer layers...) so "Find the piece" and the
 * stretch pick have real candidates, plus the capsule staples the gap
 * arithmetic recommends. Roughly a sixth is honest secondhand, which is
 * what makes Shop's secondhand filter mean something.
 *
 * sourceUrl values are NOT fabricated product-detail deep links (those 404).
 * Retailers in RETAILER_SEARCH were individually verified to render real
 * search results; every other retailer falls back to a Google Shopping
 * search, which reliably resolves. Under the Amazon provider none of this
 * is user-facing anyway - outbound links become tagged Amazon searches.
 *
 * imageUrl values are verified-live Unsplash photography (each URL checked
 * HTTP 200 on 2026-08-28), cycled per category. They are representative
 * imagery, not SKU shots - same as the original catalogue, and replaced
 * wholesale the moment a live product feed lands.
 */

import { Product } from '../models/product';
import { ItemCategory } from '../types';

// Real, individually-verified search-results URL per retailer. Do not add an
// entry here without actually loading it and confirming it returns results
// for a sample query - a plausible-looking pattern is not enough (several
// were tried and were wrong).
const RETAILER_SEARCH: Record<string, (query: string) => string> = {
  Everlane: q => `https://www.everlane.com/search?q=${encodeURIComponent(q)}`,
  Zara: q => `https://www.zara.com/us/en/search?searchTerm=${encodeURIComponent(q)}`,
  Nike: q => `https://www.nike.com/w?q=${encodeURIComponent(q)}`,
  Reformation: q => `https://www.thereformation.com/search?q=${encodeURIComponent(q)}`,
  // Verified in-browser 2026-08-29 (curl gets a bot-block 403; the page
  // renders real results). Etsy links must live on etsy.com so the Awin
  // deeplink layer has a merchant URL to wrap.
  Etsy: q => `https://www.etsy.com/search?q=${encodeURIComponent(q)}`,
};

function link(retailer: string, brand: string, name: string): string {
  const search = RETAILER_SEARCH[retailer];
  const query = `${brand} ${name}`;
  if (search) return search(query);
  // Fallback for any retailer not individually verified above: Google
  // Shopping search is a stable, well-established URL format that reliably
  // resolves to real, relevant results across retailers.
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
}

/** Verified-live Unsplash photo ids, cycled per category. */
const IMAGE_POOLS: Record<ItemCategory, string[]> = {
  tops: [
    '1564257631407-4deb1f99d992', '1521572163474-6864f9cf17ab', '1434389677669-e08b4cac3105',
    '1556821840-3a63f95609a7', '1503342217505-b0a15ec3261c', '1551163943-3f6a855d1153',
    '1618354691373-d851c5c3a990', '1620799140408-edc6dcb6d633', '1596755094514-f87e34085b2c',
    '1618932260643-eee4a2f652a6', '1624378439575-d8705ad7ae80', '1593030761757-71fae45fa0e7',
    '1611601322175-ef8ec8c85f01', '1550639525-c97d455acf70', '1562157873-818bc0726f68',
    '1617127365659-c47fa864d8bc', '1598033129183-c4f50c736f10', '1552374196-1ab2a1c593e8',
  ],
  bottoms: [
    '1541099649105-f69ad21f3246', '1594633312681-425c7b97ccd1', '1517438476312-10d79c077509',
    '1475178626620-a4d074967452', '1604176354204-9268737828e4', '1584370848010-d7fe6bc767ec',
    '1592878904946-b3cd8ae243d0', '1560243563-062bfc001d68',
  ],
  dresses: [
    '1595777457583-95e059d581b8', '1572804013309-59a88b7e92f1', '1596609548086-85bbf8ddb6b9',
    '1539109136881-3be0616acf4b', '1529139574466-a303027c1d8b', '1469334031218-e382a71b716b',
    '1483985988355-763728e1935b', '1509631179647-0177331693ae', '1550246140-29f40b909e5a',
    '1595341888016-a392ef81b7de', '1515886657613-9f3515b0c78f',
  ],
  outerwear: [
    '1544022613-e87ca75a784a', '1601333144130-8cbb312386b6', '1611312449408-fcece27cdbb7',
    '1551028719-00167b16eac5', '1539533018447-63fcce2678e3', '1591047139829-d91aecb6caea',
    '1617137968427-85924c800a22', '1551537482-f2075a1d41f2', '1523381210434-271e8be1f52b',
    '1445205170230-053b83016050', '1487222477894-8943e31ef7b2', '1490481651871-ab68de25d43d',
    '1525507119028-ed4c629a60a3', '1543087903-1ac2ec7aa8c5',
  ],
  shoes: [
    '1549298916-b41d501d3772', '1542291026-7eec264c27ff', '1543163521-1bf539c55dd2',
    '1608256246200-53e635b5b65f', '1614252369475-531eba835eb1', '1560343090-f0409e92791a',
    '1595950653106-6c9ebd614d3a', '1600185365483-26d7a4cc7519', '1560769629-975ec94e6a86',
    '1533867617858-e7b97e060509', '1520639888713-7851133b1ed0', '1519415943484-9fa1873496d4',
  ],
  accessories: [
    '1584917865442-de89df76afd3', '1599643478518-a784e5dc4c8f', '1601924994987-69e26d50dc26',
    '1548036328-c9fa89d128fa', '1535632066927-ab7c9ab60908', '1554568218-0f1715e72254',
    '1555529669-e69e7aa0ba9a', '1524498250077-390f9e378fc0', '1610652492500-ded49ceeb378',
    '1603252109303-2751441dd157', '1567401893414-76b7b1e5a7a5', '1571945153237-4929e783af4a',
    '1620138546344-7b2c38516edf',
  ],
  bags: ['1584917865442-de89df76afd3', '1548036328-c9fa89d128fa', '1554568218-0f1715e72254'],
};

/** Verified-live menswear photography, cycled for men's items. */
const MENS_IMAGE_POOLS: Partial<Record<ItemCategory, string[]>> = {
  tops: [
    '1602810318383-e386cc2a3ccf', '1488161628813-04466f872be2', '1516826957135-700dedea698c',
    '1520975954732-35dd22299614', '1541840031508-326b77c9a17e', '1507003211169-0a1dd7228f2d',
    '1500648767791-00dcc994a43e', '1506794778202-cad84cf45f1d', '1492562080023-ab3db95bfbce',
    '1617113930975-f9c7243ae527', '1531938716357-224c16b5ace3', '1521341957697-b93449760f30',
  ],
  bottoms: [
    '1516257984-b1b4d707412e', '1490578474895-699cd4e2cf59', '1509087859087-a384654eca4d',
    '1512353087810-25dfcd100962',
  ],
  outerwear: [
    '1520975954732-35dd22299614', '1503443207922-dff7d543fd0e', '1519085360753-af0119f7cbe7',
    '1564859228273-274232fdb516', '1479064555552-3ef4979f8908', '1495105787522-5334e3ffa0ef',
  ],
  shoes: [
    '1449505278894-297fdb3edbc1', '1611558709798-e009c8fd7706', '1610384104075-e05c8cf200c3',
    '1520006403909-838d6b92c22e', '1516762689617-e1cffcef479d',
  ],
  accessories: [
    '1467043237213-65f2da53396f', '1593642632823-8f785ba67e45', '1520006403909-838d6b92c22e',
    '1512353087810-25dfcd100962',
  ],
};

const SIZE_RANGES: Partial<Record<ItemCategory, string[]>> = {
  tops: ['XS', 'S', 'M', 'L', 'XL'],
  bottoms: ['24', '25', '26', '27', '28', '29', '30', '31', '32'],
  dresses: ['XS', 'S', 'M', 'L', 'XL'],
  outerwear: ['XS', 'S', 'M', 'L', 'XL'],
  shoes: ['6', '7', '8', '9', '10', '11'],
};

const MENS_SIZE_RANGES: Partial<Record<ItemCategory, string[]>> = {
  tops: ['S', 'M', 'L', 'XL', 'XXL'],
  bottoms: ['28', '30', '32', '34', '36', '38'],
  outerwear: ['S', 'M', 'L', 'XL', 'XXL'],
  shoes: ['8', '9', '10', '11', '12', '13'],
};

/**
 * Rows whose pieces are genuinely cross-department - performance wear,
 * heritage workwear, sneakers, caps. They pass every wardrobe focus, so a
 * menswear profile still sees the Carhartt chore coat and the Salomons.
 */
const UNISEX_IDS = new Set([
  't002', 't004', 't006', 't027', 't028', 't041', 't053', 't054', 't055', 't060',
  'b003', 'b026', 'b029', 'b030', 'b033', 'b035', 'b041', 'b042', 'b043',
  'o003', 'o005', 'o007', 'o018', 'o020', 'o024', 'o025', 'o029', 'o034', 'o035', 'o042',
  's002', 's004', 's009', 's010', 's011', 's012', 's017', 's018', 's025', 's026', 's029',
  's034', 's035', 's036', 's039', 's040', 's047', 's050',
  'a009', 'a010', 'a013', 'a015', 'a016', 'a020', 'a025', 'a030', 'a032', 'a033', 'a034', 'a042',
]);

/**
 * One product per line:
 * [id, name, brand, retailer, category, subcategory, color, price, originalPrice (0 = not on sale), styleTags, secondhand?]
 */
type Row = [string, string, string, string, ItemCategory, string, string, number, number, string, 1?];

const ROWS: Row[] = [
  // ---- TOPS (70) ----
  ['t001', 'Silk Button-Up Blouse', 'Everlane', 'Everlane', 'tops', 'blouse', 'ivory', 88, 0, 'minimalist classic formal'],
  ['t002', 'Oversized Cotton Tee', 'COS', 'COS', 'tops', 'tee', 'white', 35, 0, 'minimalist oversized casual'],
  ['t003', 'Merino Wool Turtleneck', 'Uniqlo', 'Uniqlo', 'tops', 'turtleneck sweater', 'camel', 49.9, 69.9, 'classic minimalist knit'],
  ['t004', 'Graphic Hoodie', 'Champion', 'Nordstrom', 'tops', 'hoodie', 'gray', 60, 85, 'streetwear athleisure casual'],
  ['t005', 'Silk Camisole', 'Reformation', 'Reformation', 'tops', 'camisole', 'black', 68, 0, 'date elegant minimalist'],
  ['t006', 'Organic Cotton Crew Tee', 'Kotn', 'Kotn', 'tops', 'organic cotton tee', 'white', 32, 0, 'minimalist sustainable casual'],
  ['t007', 'Boxy Cropped Tee', 'Madewell', 'Madewell', 'tops', 'cropped tee', 'black', 29.5, 0, 'relaxed boxy casual'],
  ['t008', 'Cable Knit Sweater', 'J.Crew', 'J.Crew', 'tops', 'cable knit sweater', 'cream', 98, 128, 'classic preppy knit'],
  ['t009', 'V-Neck Merino Sweater', 'Quince', 'Quince', 'tops', 'v-neck sweater', 'navy', 49.9, 0, 'classic preppy minimalist'],
  ['t010', 'Rugby Stripe Shirt', 'Polo Ralph Lauren', 'Ralph Lauren', 'tops', 'rugby shirt', 'navy', 125, 0, 'preppy classic collegiate'],
  ['t011', 'Pique Polo Shirt', 'Lacoste', 'Lacoste', 'tops', 'polo', 'forest green', 98, 0, 'preppy classic sporty'],
  ['t012', 'Cropped Cardigan', 'Aritzia', 'Aritzia', 'tops', 'cardigan', 'butter yellow', 78, 0, 'romantic cropped soft'],
  ['t013', 'Chunky Cardigan', '& Other Stories', '& Other Stories', 'tops', 'cardigan', 'oatmeal', 89, 119, 'relaxed cozy knit'],
  ['t014', 'Sheer Mesh Top', 'Zara', 'Zara', 'tops', 'sheer mesh top', 'black', 29.9, 0, 'edgy sheer layered'],
  ['t015', 'Organza Blouse', 'Mango', 'Mango', 'tops', 'organza blouse', 'chocolate', 59.99, 0, 'romantic sheer evening'],
  ['t016', 'Sheer Knit Layering Top', 'COS', 'COS', 'tops', 'sheer knit', 'black', 59, 0, 'edgy sheer minimalist'],
  ['t017', 'Burgundy Ribbed Sweater', 'Uniqlo', 'Uniqlo', 'tops', 'burgundy sweater', 'burgundy', 39.9, 0, 'classic knit winter'],
  ['t018', 'Mock Neck Knit', 'Everlane', 'Everlane', 'tops', 'mock neck sweater', 'oxblood', 75, 0, 'minimalist classic knit'],
  ['t019', 'Linen Camp Shirt', 'Quince', 'Quince', 'tops', 'linen shirt', 'white', 39.9, 0, 'relaxed summer breathable'],
  ['t020', 'Striped Breton Tee', 'Sezane', 'Sezane', 'tops', 'breton tee', 'navy stripe', 75, 0, 'classic french casual'],
  ['t021', 'Poplin Dress Shirt', 'Charles Tyrwhitt', 'Charles Tyrwhitt', 'tops', 'dress shirt', 'white', 79, 99, 'formal business classic'],
  ['t022', 'Oxford Button-Down', 'J.Crew', 'J.Crew', 'tops', 'oxford shirt', 'light blue', 69.5, 0, 'preppy classic business'],
  ['t023', 'Satin Wrap Blouse', 'Reformation', 'Reformation', 'tops', 'wrap blouse', 'emerald', 98, 0, 'date elegant wrap'],
  ['t024', 'Peplum Knit Top', 'Banana Republic', 'Banana Republic', 'tops', 'peplum top', 'black', 65, 90, 'polished peplum work'],
  ['t025', 'Muscle Tank', 'Alo Yoga', 'Alo Yoga', 'tops', 'tank', 'white', 48, 0, 'athleisure active fitted'],
  ['t026', 'Seamless Fitted Tank', 'Skims', 'Skims', 'tops', 'fitted tank', 'chocolate', 36, 0, 'minimalist fitted layered'],
  ['t027', 'Cropped Track Jacket', 'Adidas', 'Adidas', 'tops', 'track jacket', 'navy', 70, 0, 'sporty retro cropped'],
  ['t028', 'Half-Zip Fleece Pullover', 'Patagonia', 'REI', 'tops', 'fleece pullover', 'oatmeal', 119, 0, 'outdoor cozy casual'],
  ['t029', 'Cashmere Crewneck', 'Quince', 'Quince', 'tops', 'cashmere sweater', 'heather gray', 59.9, 0, 'minimalist luxe knit'],
  ['t030', 'Fair Isle Sweater', 'Toast', 'Toast', 'tops', 'fair isle sweater', 'cream multi', 165, 0, 'heritage cozy pattern'],
  ['t031', 'Bodysuit With Square Neck', 'Abercrombie', 'Abercrombie', 'tops', 'bodysuit', 'black', 40, 0, 'fitted date minimal'],
  ['t032', 'Puff Sleeve Blouse', 'Damson Madder', 'Damson Madder', 'tops', 'puff sleeve blouse', 'gingham', 85, 0, 'romantic boho statement-sleeve'],
  ['t033', 'Peasant Blouse', 'Free People', 'Free People', 'tops', 'peasant blouse', 'cream', 78, 0, 'bohemian flowing romantic'],
  ['t034', 'Embroidered Folk Blouse', 'Anthropologie', 'Anthropologie', 'tops', 'embroidered blouse', 'rust', 98, 130, 'bohemian artisan detail'],
  ['t035', 'Silk Slip Tank', 'Vince', 'Vince', 'tops', 'silk tank', 'blush', 145, 0, 'elegant minimalist luxe'],
  ['t036', 'Cropped Rib Knit', 'Aritzia', 'Aritzia', 'tops', 'rib knit top', 'white', 45, 0, 'fitted cropped minimal'],
  ['t037', 'Longline Thermal Henley', 'Madewell', 'Madewell', 'tops', 'henley', 'heather oat', 45, 0, 'casual layered cozy'],
  ['t038', 'Boat Neck Knit Top', 'Sezane', 'Sezane', 'tops', 'boat-neck top', 'ecru', 90, 0, 'french classic polished'],
  ['t039', 'Tie-Front Blouse', 'Rouje', 'Rouje', 'tops', 'tie-front blouse', 'red floral', 115, 0, 'romantic french date'],
  ['t040', 'Cotton Poplin Shirt', 'Arket', 'Arket', 'tops', 'poplin shirt', 'sky blue', 79, 0, 'minimalist scandi crisp'],
  ['t041', 'Oversized Flannel Shirt', 'L.L.Bean', 'L.L.Bean', 'tops', 'flannel shirt', 'red plaid', 54.95, 0, 'heritage cozy oversized'],
  ['t042', 'Western Denim Shirt', 'Wrangler', 'Wrangler', 'tops', 'denim shirt', 'mid wash', 44, 0, 'western denim casual'],
  ['t043', 'Chambray Popover', 'Madewell', 'Madewell', 'tops', 'chambray shirt', 'chambray blue', 72, 0, 'casual denim everyday'],
  ['t044', 'Scoop Neck Sweater Tank', 'Jenni Kayne', 'Jenni Kayne', 'tops', 'sweater tank', 'ivory', 145, 0, 'coastal minimalist luxe'],
  ['t045', 'Cashmere Wrap Cardigan', 'Jenni Kayne', 'Jenni Kayne', 'tops', 'wrap cardigan', 'oatmeal', 285, 0, 'luxe cozy wrap'],
  ['t046', 'Cropped Cable Vest', 'Ganni', 'Ganni', 'tops', 'sweater vest', 'forest', 155, 195, 'preppy cropped playful'],
  ['t047', 'Ruched Mesh Top', 'Urban Outfitters', 'Urban Outfitters', 'tops', 'mesh top', 'chocolate', 39, 0, 'edgy sheer going-out'],
  ['t048', 'Tech Knit Polo', 'Lululemon', 'Lululemon', 'tops', 'tech polo', 'black', 88, 0, 'sporty polished technical'],
  ['t049', 'Boxy Linen Shirt', 'Eileen Fisher', 'Eileen Fisher', 'tops', 'linen shirt', 'natural', 148, 0, 'sustainable relaxed boxy'],
  ['t050', 'Corset Top', 'House of CB', 'House of CB', 'tops', 'corset top', 'black', 119, 0, 'date structured evening'],
  ['t051', 'Baby Tee', 'Brandy Melville', 'Brandy Melville', 'tops', 'baby tee', 'white', 18, 0, 'y2k fitted casual'],
  ['t052', 'Longsleeve Striped Knit', 'Toteme', 'Toteme', 'tops', 'striped knit', 'navy stripe', 190, 0, 'scandi minimalist luxe'],
  ['t053', 'Funnel Neck Sweatshirt', 'Vuori', 'Vuori', 'tops', 'sweatshirt', 'sage', 84, 0, 'athleisure cozy soft'],
  ['t054', 'Zip-Up Hoodie', 'Nike', 'Nike', 'tops', 'zip-up hoodie', 'black', 65, 0, 'sporty streetwear layered'],
  ['t055', 'Compression Long Sleeve', 'Under Armour', 'Under Armour', 'tops', 'compression top', 'charcoal', 40, 0, 'active fitted technical'],
  ['t056', 'Wool Blend Shacket Shirt', 'Gap', 'Gap', 'tops', 'shirt jacket', 'camel plaid', 79.95, 98, 'casual layered cozy'],
  ['t057', 'Satin Cowl Neck Top', 'Aritzia', 'Aritzia', 'tops', 'cowl neck top', 'champagne', 68, 0, 'date elegant satin'],
  ['t058', 'Crochet Knit Top', 'Faithfull the Brand', 'Faithfull the Brand', 'tops', 'crochet top', 'cream', 129, 0, 'bohemian artisan summer'],
  ['t059', 'One-Shoulder Top', 'Posse', 'Posse', 'tops', 'one-shoulder top', 'chocolate', 99, 0, 'evening minimal statement'],
  ['t060', 'Vintage Band Tee', 'Urban Outfitters', 'Urban Outfitters', 'tops', 'graphic tee', 'faded black', 45, 0, 'vintage streetwear casual'],
  ['t061', 'Turtleneck Bodysuit', 'Spanx', 'Spanx', 'tops', 'turtleneck bodysuit', 'black', 78, 0, 'fitted layered polished'],
  ['t062', 'Bishop Sleeve Blouse', 'Doen', 'Doen', 'tops', 'bishop sleeve blouse', 'ivory', 198, 0, 'romantic boho heirloom'],
  ['t063', 'Marled Fisherman Sweater', 'Toast', 'Toast', 'tops', 'fisherman sweater', 'ecru', 195, 0, 'heritage chunky knit'],
  ['t064', 'Pointelle Knit Top', 'For Love & Lemons', 'For Love & Lemons', 'tops', 'pointelle top', 'blush', 88, 0, 'romantic delicate sheer'],
  ['t065', 'Athletic Racerback Tank', 'Girlfriend Collective', 'Girlfriend Collective', 'tops', 'racerback tank', 'moss', 38, 0, 'active sustainable fitted'],
  ['t066', 'Pre-Owned Silk Blouse', 'Equipment', 'Depop', 'tops', 'silk blouse', 'blush', 28, 78, 'romantic vintage silk', 1],
  ['t067', 'Vintage Cashmere Crewneck', 'Pringle of Scotland', 'The RealReal', 'tops', 'cashmere sweater', 'heather gray', 85, 320, 'vintage luxe knit', 1],
  ['t068', 'Pre-Loved Cable Knit', 'Aran Crafts', 'ThredUp', 'tops', 'cable knit sweater', 'natural', 42, 130, 'heritage vintage knit', 1],
  ['t069', 'Vintage Rugby Shirt', 'Polo Ralph Lauren', 'Poshmark', 'tops', 'rugby shirt', 'green stripe', 38, 125, 'preppy vintage collegiate', 1],
  ['t070', 'Secondhand Burgundy Knit', 'COS', 'Vestiaire Collective', 'tops', 'burgundy sweater', 'burgundy', 45, 115, 'minimalist vintage knit', 1],

  // ---- BOTTOMS (58) ----
  ['b001', 'High-Rise Straight Jeans', "Levi's", "Levi's", 'bottoms', 'straight jeans', 'denim blue', 98, 0, 'casual denim everyday high-rise'],
  ['b002', 'Tailored Wool Trousers', 'Massimo Dutti', 'Massimo Dutti', 'bottoms', 'wool trousers', 'charcoal', 129, 0, 'formal business structured'],
  ['b003', 'Relaxed Cargo Pants', 'Zara', 'Zara', 'bottoms', 'cargo pants', 'olive', 59.9, 79.9, 'streetwear relaxed utility'],
  ['b004', 'Bike Shorts', 'Lululemon', 'Lululemon', 'bottoms', 'bike shorts', 'black', 58, 0, 'athleisure sport active'],
  ['b005', 'Wide-Leg Trousers', 'Everlane', 'Everlane', 'bottoms', 'wide-leg trousers', 'camel', 118, 0, 'wide-leg tailored polished'],
  ['b006', 'Pleated Wide-Leg Trousers', 'COS', 'COS', 'bottoms', 'wide-leg trousers', 'grey', 135, 0, 'wide-leg pleated minimalist'],
  ['b007', 'Wide-Leg Wool Trousers', 'Arket', 'Arket', 'bottoms', 'wide-leg trousers', 'navy', 149, 0, 'wide-leg tailored scandi'],
  ['b008', 'Flowing Palazzo Pants', 'Mango', 'Mango', 'bottoms', 'palazzo pants', 'black', 69.99, 0, 'wide-leg flowing elegant'],
  ['b009', 'High-Rise Flared Trousers', 'Aritzia', 'Aritzia', 'bottoms', 'flared trousers', 'espresso', 128, 0, 'flared high-rise polished'],
  ['b010', 'Pleated Mini Skirt', 'Uniqlo', 'Uniqlo', 'bottoms', 'pleated mini skirt', 'navy', 39.9, 0, 'preppy pleated collegiate'],
  ['b011', 'Plaid Pleated Skirt', 'Abercrombie', 'Abercrombie', 'bottoms', 'plaid skirt', 'brown plaid', 70, 0, 'preppy plaid pleated'],
  ['b012', 'Tartan Mini Skirt', 'Urban Outfitters', 'Urban Outfitters', 'bottoms', 'plaid mini skirt', 'red tartan', 49, 64, 'preppy plaid y2k'],
  ['b013', 'Wool Plaid Midi Skirt', 'J.Crew', 'J.Crew', 'bottoms', 'plaid midi skirt', 'camel plaid', 118, 0, 'classic plaid heritage'],
  ['b014', 'Suede Midi Skirt', 'Massimo Dutti', 'Massimo Dutti', 'bottoms', 'suede skirt', 'chocolate', 189, 0, 'suede luxe seventies'],
  ['b015', 'Faux Suede A-Line Skirt', 'H&M', 'H&M', 'bottoms', 'suede skirt', 'tan', 34.99, 0, 'suede a-line affordable'],
  ['b016', 'Flowing Maxi Skirt', 'Free People', 'Free People', 'bottoms', 'flowing maxi skirt', 'rust', 88, 0, 'bohemian flowing maxi'],
  ['b017', 'Tiered Cotton Maxi Skirt', 'Christy Dawn', 'Christy Dawn', 'bottoms', 'tiered maxi skirt', 'cream', 168, 0, 'boho tiered sustainable'],
  ['b018', 'Silk Slip Skirt', 'Reformation', 'Reformation', 'bottoms', 'slip skirt', 'champagne', 148, 0, 'elegant silk minimal'],
  ['b019', 'Denim Midi Skirt', 'Madewell', 'Madewell', 'bottoms', 'denim skirt', 'mid wash', 88, 0, 'denim casual everyday'],
  ['b020', 'Recycled Denim Jeans', 'Reformation', 'Reformation', 'bottoms', 'recycled denim jeans', 'vintage blue', 128, 0, 'sustainable denim high-rise'],
  ['b021', 'Barrel Leg Jeans', 'Citizens of Humanity', 'Nordstrom', 'bottoms', 'barrel jeans', 'light wash', 218, 0, 'barrel relaxed fashion-forward'],
  ['b022', 'Baggy Low-Rise Jeans', 'Abercrombie', 'Abercrombie', 'bottoms', 'baggy jeans', 'medium wash', 90, 0, 'baggy y2k streetwear'],
  ['b023', 'Bootcut Stretch Jeans', 'Gap', 'Gap', 'bottoms', 'bootcut jeans', 'dark wash', 69.95, 0, 'bootcut classic everyday'],
  ['b024', 'Black Skinny Jeans', "Levi's", "Levi's", 'bottoms', 'skinny jeans', 'black', 89.5, 0, 'skinny fitted classic'],
  ['b025', 'Curve Love Straight Jeans', 'Abercrombie', 'Abercrombie', 'bottoms', 'straight jeans', 'white', 90, 0, 'casual denim summer'],
  ['b026', 'Chino Trousers', 'Dockers', 'Dockers', 'bottoms', 'chinos', 'khaki', 58, 0, 'classic chino everyday'],
  ['b027', 'Cropped Kick Flare Pants', 'Banana Republic', 'Banana Republic', 'bottoms', 'kick flare pants', 'black', 110, 130, 'polished cropped work'],
  ['b028', 'Paperbag Waist Trousers', 'Mango', 'Mango', 'bottoms', 'paperbag trousers', 'stone', 59.99, 0, 'relaxed high-rise summer'],
  ['b029', 'Linen Drawstring Pants', 'Quince', 'Quince', 'bottoms', 'linen pants', 'natural', 44.9, 0, 'linen relaxed breathable'],
  ['b030', 'Track Pants', 'Adidas', 'Adidas', 'bottoms', 'track pants', 'navy', 60, 0, 'sporty retro streetwear'],
  ['b031', 'Ribbed Wide-Leg Knit Pants', 'Skims', 'Skims', 'bottoms', 'knit pants', 'chocolate', 88, 0, 'wide-leg cozy lounge'],
  ['b032', 'Leather Straight Pants', 'AllSaints', 'AllSaints', 'bottoms', 'leather pants', 'black', 299, 0, 'edgy leather evening'],
  ['b033', 'Tech Jogger', 'Lululemon', 'Lululemon', 'bottoms', 'joggers', 'black', 118, 0, 'athleisure technical tapered'],
  ['b034', 'High-Rise Leggings', 'Girlfriend Collective', 'Girlfriend Collective', 'bottoms', 'leggings', 'moss', 78, 0, 'active sustainable fitted'],
  ['b035', 'Running Shorts', 'Nike', 'Nike', 'bottoms', 'running shorts', 'black', 40, 0, 'active sport lightweight'],
  ['b036', 'Denim Cutoff Shorts', "Levi's", "Levi's", 'bottoms', 'denim shorts', 'light wash', 59.5, 0, 'casual denim summer'],
  ['b037', 'Tailored Bermuda Shorts', 'Zara', 'Zara', 'bottoms', 'bermuda shorts', 'beige', 45.9, 0, 'tailored polished summer'],
  ['b038', 'Pleated Tennis Skirt', 'Alo Yoga', 'Alo Yoga', 'bottoms', 'tennis skirt', 'white', 78, 0, 'sporty pleated preppy'],
  ['b039', 'Satin Bias-Cut Midi Skirt', 'Aritzia', 'Aritzia', 'bottoms', 'satin skirt', 'oxblood', 98, 0, 'elegant bias-cut evening'],
  ['b040', 'Corduroy Straight Pants', 'Madewell', 'Madewell', 'bottoms', 'corduroy pants', 'chestnut', 98, 118, 'heritage corduroy fall'],
  ['b041', 'Utility Work Pants', 'Carhartt', 'Carhartt', 'bottoms', 'utility pants', 'duck brown', 59.99, 0, 'utility workwear durable'],
  ['b042', 'Double-Knee Work Pants', 'Dickies', 'Dickies', 'bottoms', 'work pants', 'black', 44, 0, 'utility streetwear durable'],
  ['b043', 'Parachute Cargo Pants', 'Urban Outfitters', 'Urban Outfitters', 'bottoms', 'parachute pants', 'stone', 69, 0, 'streetwear utility baggy'],
  ['b044', 'Sculpt Flare Leggings', 'Alo Yoga', 'Alo Yoga', 'bottoms', 'flare leggings', 'black', 98, 0, 'athleisure flared fitted'],
  ['b045', 'Wool Pencil Skirt', 'Theory', 'Theory', 'bottoms', 'pencil skirt', 'charcoal', 265, 0, 'formal fitted business'],
  ['b046', 'A-Line Wrap Skirt', 'Sezane', 'Sezane', 'bottoms', 'wrap skirt', 'terracotta', 125, 0, 'romantic a-line french'],
  ['b047', 'Crochet Beach Skirt', 'Faithfull the Brand', 'Faithfull the Brand', 'bottoms', 'crochet skirt', 'shell', 149, 0, 'boho crochet vacation'],
  ['b048', 'Fringe Hem Suede Skirt', 'Anthropologie', 'Anthropologie', 'bottoms', 'fringe suede skirt', 'cognac', 140, 180, 'boho fringe suede'],
  ['b049', 'Sequin Midi Skirt', '& Other Stories', '& Other Stories', 'bottoms', 'sequin skirt', 'silver', 129, 0, 'party statement evening'],
  ['b050', 'Belted Shirred Waist Trousers', 'Toteme', 'Toteme', 'bottoms', 'belted trousers', 'ecru', 320, 0, 'scandi luxe tailored'],
  ['b051', 'Waxed Cotton Pants', 'Belstaff', 'Belstaff', 'bottoms', 'waxed pants', 'black', 275, 0, 'moto utility edgy'],
  ['b052', 'Gaucho Cropped Pants', 'Eileen Fisher', 'Eileen Fisher', 'bottoms', 'cropped wide pants', 'black', 168, 0, 'wide-leg sustainable relaxed'],
  ['b053', 'Vintage 501 Jeans', "Levi's", 'ThredUp', 'bottoms', 'straight jeans', 'denim blue', 38, 98, 'vintage denim casual', 1],
  ['b054', 'Pre-Owned Wool Trousers', 'Max Mara', 'The RealReal', 'bottoms', 'wide-leg wool trousers', 'camel', 120, 425, 'wide-leg luxe vintage', 1],
  ['b055', 'Secondhand Plaid Skirt', 'Burberry', 'Vestiaire Collective', 'bottoms', 'plaid skirt', 'nova check', 195, 550, 'plaid heritage vintage', 1],
  ['b056', 'Pre-Loved Silk Maxi Skirt', 'Doen', 'Poshmark', 'bottoms', 'flowing maxi skirt', 'dusty rose', 88, 248, 'boho flowing vintage', 1],
  ['b057', 'Vintage Corduroy Flares', 'Wrangler', 'Depop', 'bottoms', 'corduroy flares', 'rust', 34, 0, 'seventies flared vintage', 1],
  ['b058', 'Secondhand Leather Skirt', 'AllSaints', 'ThredUp', 'bottoms', 'leather mini skirt', 'black', 65, 220, 'edgy leather vintage', 1],

  // ---- DRESSES (30) ----
  ['d001', 'Slip Midi Dress', 'Reformation', 'Reformation', 'dresses', 'slip dress', 'deep red', 168, 0, 'date elegant romantic'],
  ['d002', 'Wrap Shirt Dress', 'Everlane', 'Everlane', 'dresses', 'shirt dress', 'navy', 118, 148, 'classic business everyday'],
  ['d003', 'Linen Midi Dress', 'Quince', 'Quince', 'dresses', 'linen dress', 'white', 59.9, 0, 'linen breathable summer'],
  ['d004', 'Smocked Prairie Dress', 'Christy Dawn', 'Christy Dawn', 'dresses', 'prairie dress', 'wildflower', 258, 0, 'boho prairie sustainable'],
  ['d005', 'Tiered Maxi Dress', 'Doen', 'Doen', 'dresses', 'tiered maxi dress', 'cream', 298, 0, 'boho flowing romantic'],
  ['d006', 'Ribbed Knit Midi Dress', 'Aritzia', 'Aritzia', 'dresses', 'knit dress', 'chocolate', 98, 0, 'fitted minimal everyday'],
  ['d007', 'Blazer Dress', 'Zara', 'Zara', 'dresses', 'blazer dress', 'black', 89.9, 0, 'structured evening sharp'],
  ['d008', 'Satin Cowl Slip Dress', 'Mango', 'Mango', 'dresses', 'satin slip dress', 'champagne', 79.99, 0, 'elegant satin evening'],
  ['d009', 'Wrap Midi Dress', 'Rouje', 'Rouje', 'dresses', 'wrap dress', 'red floral', 185, 0, 'french romantic wrap'],
  ['d010', 'Shirred Gingham Dress', 'Damson Madder', 'Damson Madder', 'dresses', 'gingham dress', 'green gingham', 120, 0, 'playful boho puff-sleeve'],
  ['d011', 'T-Shirt Dress', 'COS', 'COS', 'dresses', 't-shirt dress', 'gray', 69, 0, 'minimalist relaxed everyday'],
  ['d012', 'Sweater Dress', 'Jenni Kayne', 'Jenni Kayne', 'dresses', 'sweater dress', 'oatmeal', 265, 0, 'cozy luxe minimal'],
  ['d013', 'Denim Shirtdress', 'Madewell', 'Madewell', 'dresses', 'denim dress', 'mid wash', 128, 0, 'denim casual utility'],
  ['d014', 'Halter Maxi Dress', 'Faithfull the Brand', 'Faithfull the Brand', 'dresses', 'halter maxi dress', 'terracotta', 189, 0, 'vacation flowing sunset'],
  ['d015', 'Sequin Party Dress', '& Other Stories', '& Other Stories', 'dresses', 'sequin dress', 'gold', 159, 199, 'party statement evening'],
  ['d016', 'Puff Sleeve Mini Dress', 'Free People', 'Free People', 'dresses', 'puff sleeve dress', 'ivory', 128, 0, 'romantic statement-sleeve mini'],
  ['d017', 'Crochet Beach Dress', 'Posse', 'Posse', 'dresses', 'crochet dress', 'shell', 179, 0, 'boho crochet vacation'],
  ['d018', 'Bias-Cut Silk Gown', 'Réalisation Par', 'Réalisation Par', 'dresses', 'silk gown', 'oxblood', 265, 0, 'evening bias-cut luxe'],
  ['d019', 'Sheath Work Dress', 'Theory', 'Theory', 'dresses', 'sheath dress', 'navy', 345, 0, 'business fitted formal'],
  ['d020', 'Empire Waist Midi', 'Sezane', 'Sezane', 'dresses', 'empire dress', 'sage', 165, 0, 'french empire romantic'],
  ['d021', 'Sheer Overlay Dress', 'Ganni', 'Ganni', 'dresses', 'sheer overlay dress', 'black', 285, 365, 'edgy sheer layered'],
  ['d022', 'Athletic Tennis Dress', 'Alo Yoga', 'Alo Yoga', 'dresses', 'tennis dress', 'white', 118, 0, 'sporty pleated active'],
  ['d023', 'Terry Cover-Up Dress', 'Vuori', 'Vuori', 'dresses', 'cover-up dress', 'sand', 98, 0, 'vacation relaxed soft'],
  ['d024', 'Organic Cotton Sundress', 'Kotn', 'Kotn', 'dresses', 'sundress', 'butter', 88, 0, 'sustainable summer easy'],
  ['d025', 'Velvet Slip Dress', 'Urban Outfitters', 'Urban Outfitters', 'dresses', 'velvet dress', 'wine', 79, 0, 'evening velvet vintage-inspired'],
  ['d026', 'Pre-Owned Silk Slip Dress', 'Reformation', 'Poshmark', 'dresses', 'slip dress', 'black', 68, 198, 'elegant vintage silk', 1],
  ['d027', 'Vintage Wrap Dress', 'Diane von Furstenberg', 'The RealReal', 'dresses', 'wrap dress', 'bold print', 145, 468, 'iconic wrap vintage', 1],
  ['d028', 'Secondhand Prairie Dress', 'Doen', 'Vestiaire Collective', 'dresses', 'prairie dress', 'dusty rose', 128, 328, 'boho prairie vintage', 1],
  ['d029', 'Pre-Loved Knit Dress', 'COS', 'ThredUp', 'dresses', 'knit dress', 'charcoal', 42, 135, 'minimalist vintage cozy', 1],
  ['d030', 'Vintage Slip Gown', 'Ghost London', 'Depop', 'dresses', 'slip gown', 'ivory', 95, 0, 'vintage bias-cut bridal', 1],

  // ---- OUTERWEAR (42) ----
  ['o001', 'Wool Overcoat', 'Massimo Dutti', 'Massimo Dutti', 'outerwear', 'wool overcoat', 'camel', 289, 349, 'classic formal winter'],
  ['o002', 'Denim Trucker Jacket', "Levi's", "Levi's", 'outerwear', 'denim trucker jacket', 'light denim', 79, 0, 'casual denim everyday'],
  ['o003', 'Packable Rain Jacket', 'Patagonia', 'REI', 'outerwear', 'rain jacket', 'forest green', 149, 0, 'outdoor utility travel'],
  ['o004', 'Leather Moto Jacket', 'AllSaints', 'AllSaints', 'outerwear', 'leather moto jacket', 'black', 398, 0, 'streetwear edgy leather'],
  ['o005', 'Waxed Field Jacket', 'Barbour', 'Barbour', 'outerwear', 'waxed field jacket', 'olive', 425, 0, 'barn heritage waxed'],
  ['o006', 'Barn Jacket', 'J.Crew', 'J.Crew', 'outerwear', 'barn jacket', 'tan', 168, 228, 'barn heritage corduroy-collar'],
  ['o007', 'Canvas Chore Jacket', 'Carhartt', 'Carhartt', 'outerwear', 'chore jacket', 'duck brown', 109.99, 0, 'utility workwear boxy'],
  ['o008', 'Utility Field Jacket', 'Gap', 'Gap', 'outerwear', 'utility jacket', 'olive', 98, 128, 'utility casual layered'],
  ['o009', 'Suede Trucker Jacket', 'Madewell', 'Madewell', 'outerwear', 'suede jacket', 'tan', 298, 0, 'suede luxe texture'],
  ['o010', 'Fringe Suede Jacket', 'Anthropologie', 'Anthropologie', 'outerwear', 'fringe suede jacket', 'cognac', 320, 0, 'boho fringe suede'],
  ['o011', 'Faux Suede Bomber', 'H&M', 'H&M', 'outerwear', 'suede bomber', 'chocolate', 49.99, 0, 'suede affordable bomber'],
  ['o012', 'Burgundy Wool Coat', 'Mango', 'Mango', 'outerwear', 'burgundy coat', 'burgundy', 149.99, 0, 'burgundy statement wool'],
  ['o013', 'Oxblood Leather Blazer', 'Zara', 'Zara', 'outerwear', 'leather blazer', 'oxblood', 129, 0, 'burgundy edgy sharp'],
  ['o014', 'Classic Trench Coat', 'London Fog', 'Nordstrom', 'outerwear', 'trench coat', 'stone', 180, 220, 'classic trench spring'],
  ['o015', 'Oversized Blazer', 'Frankie Shop', 'Frankie Shop', 'outerwear', 'oversized blazer', 'grey', 265, 0, 'oversized sharp fashion-forward'],
  ['o016', 'Tech Tailored Blazer', 'Theory', 'Theory', 'outerwear', 'tech blazer', 'black', 425, 0, 'technical tailored sharp'],
  ['o017', 'Cropped Puffer', 'Uniqlo', 'Uniqlo', 'outerwear', 'cropped puffer', 'black', 79.9, 0, 'warm cropped everyday'],
  ['o018', 'Down Parka', 'The North Face', 'REI', 'outerwear', 'down parka', 'black', 320, 0, 'warm outdoor winter'],
  ['o019', 'Quilted Liner Jacket', 'Taion', 'Urban Outfitters', 'outerwear', 'quilted jacket', 'olive', 98, 0, 'utility quilted layered'],
  ['o020', 'Teddy Fleece Jacket', 'Patagonia', 'REI', 'outerwear', 'fleece jacket', 'natural', 179, 0, 'outdoor cozy retro'],
  ['o021', 'Wool Peacoat', 'Banana Republic', 'Banana Republic', 'outerwear', 'peacoat', 'navy', 250, 320, 'classic nautical winter'],
  ['o022', 'Belted Wrap Coat', 'Vince', 'Vince', 'outerwear', 'wrap coat', 'oatmeal', 495, 0, 'luxe belted minimal'],
  ['o023', 'Faux Fur Coat', '& Other Stories', '& Other Stories', 'outerwear', 'faux fur coat', 'chocolate', 219, 0, 'statement glam winter'],
  ['o024', 'Track Jacket', 'Adidas', 'Adidas', 'outerwear', 'track jacket', 'green', 75, 0, 'sporty retro heritage'],
  ['o025', 'Windbreaker', 'Nike', 'Nike', 'outerwear', 'windbreaker', 'silver', 90, 0, 'sporty lightweight retro'],
  ['o026', 'Softshell Running Jacket', 'Lululemon', 'Lululemon', 'outerwear', 'running jacket', 'black', 148, 0, 'active technical sleek'],
  ['o027', 'Corduroy Chore Coat', 'Madewell', 'Madewell', 'outerwear', 'corduroy jacket', 'chestnut', 148, 0, 'heritage corduroy casual'],
  ['o028', 'Cropped Denim Jacket', 'Abercrombie', 'Abercrombie', 'outerwear', 'cropped denim jacket', 'white', 90, 0, 'denim cropped summer'],
  ['o029', 'Bomber Jacket', 'Alpha Industries', 'Urban Outfitters', 'outerwear', 'bomber jacket', 'sage', 165, 0, 'streetwear bomber classic'],
  ['o030', 'Rust Terracotta Bomber', 'Zara', 'Zara', 'outerwear', 'bomber jacket', 'rust terracotta', 79.9, 0, 'bomber sunset statement'],
  ['o031', 'Longline Wool Coat', 'COS', 'COS', 'outerwear', 'longline coat', 'black', 350, 0, 'minimalist longline sharp'],
  ['o032', 'Herringbone Overshirt', 'Arket', 'Arket', 'outerwear', 'overshirt', 'brown herringbone', 129, 0, 'heritage layered scandi'],
  ['o033', 'Linen Duster', 'Eileen Fisher', 'Eileen Fisher', 'outerwear', 'duster coat', 'natural', 258, 0, 'sustainable flowing layer'],
  ['o034', 'Shearling-Collar Denim Jacket', 'Wrangler', 'Wrangler', 'outerwear', 'sherpa denim jacket', 'dark wash', 89, 0, 'western sherpa warm'],
  ['o035', 'Hooded Raincoat', 'Rains', 'Rains', 'outerwear', 'raincoat', 'sand', 125, 0, 'minimal waterproof scandi'],
  ['o036', 'Quilted Barn Coat', 'L.L.Bean', 'L.L.Bean', 'outerwear', 'barn coat', 'saddle', 129, 0, 'barn quilted heritage'],
  ['o037', 'Pre-Owned Wool Coat', 'Max Mara', 'The RealReal', 'outerwear', 'wool coat', 'camel', 240, 890, 'classic luxe vintage', 1],
  ['o038', 'Vintage Suede Jacket', 'Coach', 'Vestiaire Collective', 'outerwear', 'suede jacket', 'chocolate', 165, 495, 'suede vintage luxe', 1],
  ['o039', 'Secondhand Barbour Wax Jacket', 'Barbour', 'Vestiaire Collective', 'outerwear', 'waxed jacket', 'olive', 175, 425, 'barn waxed heritage', 1],
  ['o040', 'Vintage Leather Blazer', 'Wilsons Leather', 'Depop', 'outerwear', 'leather blazer', 'oxblood', 88, 0, 'vintage burgundy edgy', 1],
  ['o041', 'Pre-Loved Trench', 'Burberry', 'The RealReal', 'outerwear', 'trench coat', 'honey', 495, 1900, 'iconic trench vintage', 1],
  ['o042', 'Vintage Track Jacket', 'Adidas', 'Depop', 'outerwear', 'track jacket', 'navy red', 45, 0, 'retro sporty vintage', 1],

  // ---- SHOES (50) ----
  ['s001', 'Leather Chelsea Boots', 'Everlane', 'Everlane', 'shoes', 'chelsea boots', 'black', 218, 0, 'classic versatile boot'],
  ['s002', 'Minimalist Leather Sneakers', 'Common Projects', 'Nordstrom', 'shoes', 'leather sneakers', 'white', 425, 0, 'minimalist luxe versatile'],
  ['s003', 'Block Heel Sandals', 'Sam Edelman', 'DSW', 'shoes', 'block heel sandals', 'tan', 89.95, 120, 'date elegant summer'],
  ['s004', 'Running Shoes', 'Nike', 'Nike', 'shoes', 'running shoes', 'gray', 130, 0, 'athleisure sport active'],
  ['s005', 'Suede Loafers', 'Sezane', 'Sezane', 'shoes', 'suede loafers', 'chestnut', 245, 0, 'suede preppy classic'],
  ['s006', 'Penny Loafers', 'G.H. Bass', 'G.H. Bass', 'shoes', 'penny loafers', 'burgundy', 175, 0, 'preppy loafer burgundy'],
  ['s007', 'Cream Leather Loafers', 'Madewell', 'Madewell', 'shoes', 'loafers', 'cream', 158, 0, 'preppy loafer polished'],
  ['s008', 'Chunky Lug Loafers', 'Dr. Martens', 'Dr. Martens', 'shoes', 'lug loafers', 'black', 130, 0, 'edgy chunky loafer'],
  ['s009', 'Retro Court Sneakers', 'Adidas', 'Adidas', 'shoes', 'retro sneakers', 'white green', 100, 0, 'retro trainer heritage'],
  ['s010', 'Suede Retro Trainers', 'New Balance', 'New Balance', 'shoes', 'suede trainers', 'grey', 110, 0, 'retro suede trainer'],
  ['s011', 'Gum Sole Trainers', 'Veja', 'Veja', 'shoes', 'sustainable sneakers', 'white', 150, 0, 'sustainable minimal trainer'],
  ['s012', 'Canvas High Tops', 'Converse', 'Converse', 'shoes', 'high top sneakers', 'black', 65, 0, 'casual classic streetwear'],
  ['s013', 'Platform Sneakers', 'Puma', 'Puma', 'shoes', 'platform sneakers', 'white', 90, 0, 'sporty platform y2k'],
  ['s014', 'Knee-High Leather Boots', 'Vince Camuto', 'DSW', 'shoes', 'knee-high boots', 'chocolate', 189, 249, 'polished boot fall'],
  ['s015', 'Suede Ankle Boots', 'Clarks', 'Clarks', 'shoes', 'suede ankle boots', 'tan', 140, 0, 'suede boot everyday'],
  ['s016', 'Western Boots', 'Tecovas', 'Tecovas', 'shoes', 'western boots', 'cognac', 285, 0, 'western heritage statement'],
  ['s017', 'Combat Boots', 'Dr. Martens', 'Dr. Martens', 'shoes', 'combat boots', 'black', 170, 0, 'edgy utility boot'],
  ['s018', 'Hiking Boots', 'Salomon', 'REI', 'shoes', 'hiking boots', 'earth', 165, 0, 'outdoor gorpcore utility'],
  ['s019', 'Pointed-Toe Slingbacks', 'Zara', 'Zara', 'shoes', 'slingback heels', 'black', 55.9, 0, 'polished pointed evening'],
  ['s020', 'Kitten Heel Pumps', 'Banana Republic', 'Banana Republic', 'shoes', 'kitten heels', 'oxblood', 140, 0, 'burgundy polished work'],
  ['s021', 'Strappy Heeled Sandals', 'Steve Madden', 'Steve Madden', 'shoes', 'heeled sandals', 'gold', 99.95, 0, 'party strappy evening'],
  ['s022', 'Ballet Flats', 'Repetto', 'Nordstrom', 'shoes', 'ballet flats', 'black', 345, 0, 'french classic delicate'],
  ['s023', 'Mesh Ballet Flats', 'Alaïa-inspired Mango', 'Mango', 'shoes', 'mesh flats', 'black', 69.99, 0, 'sheer fashion-forward flat'],
  ['s024', 'Leather Mules', 'Everlane', 'Everlane', 'shoes', 'mules', 'cognac', 155, 0, 'minimal slide polished'],
  ['s025', 'Cork Footbed Sandals', 'Birkenstock', 'Birkenstock', 'shoes', 'cork sandals', 'taupe', 110, 0, 'sustainable comfort casual'],
  ['s026', 'Recycled Strap Sandals', 'Teva', 'REI', 'shoes', 'sustainable sandals', 'black', 55, 0, 'sustainable sporty summer'],
  ['s027', 'Espadrille Wedges', 'Castañer', 'Nordstrom', 'shoes', 'espadrille wedges', 'natural', 160, 0, 'summer vacation classic'],
  ['s028', 'Leather Thong Sandals', 'Ancient Greek Sandals', 'Ancient Greek Sandals', 'shoes', 'leather sandals', 'tan', 175, 0, 'vacation artisan minimal'],
  ['s029', 'Trail Runners', 'Hoka', 'REI', 'shoes', 'trail running shoes', 'sunset coral', 145, 0, 'active gorpcore cushioned'],
  ['s030', 'Classic Clogs', 'Dansko', 'Dansko', 'shoes', 'clogs', 'chocolate', 135, 0, 'comfort heritage everyday'],
  ['s031', 'Fisherman Sandals', 'Zara', 'Zara', 'shoes', 'fisherman sandals', 'brown', 49.9, 0, 'heritage summer fashion-forward'],
  ['s032', 'Mary Jane Flats', 'Sezane', 'Sezane', 'shoes', 'mary janes', 'burgundy', 195, 0, 'burgundy french polished'],
  ['s033', 'Snake-Print Boots', 'Steve Madden', 'Steve Madden', 'shoes', 'print boots', 'snake', 129.95, 159.95, 'statement print party'],
  ['s034', 'Chunky Dad Sneakers', 'New Balance', 'New Balance', 'shoes', 'chunky sneakers', 'white grey', 120, 0, 'chunky retro comfort'],
  ['s035', 'Waterproof Chelsea Boots', 'Blundstone', 'Blundstone', 'shoes', 'chelsea boots', 'rustic brown', 210, 0, 'utility boot weatherproof'],
  ['s036', 'Slip-On Sneakers', 'Vans', 'Vans', 'shoes', 'slip-on sneakers', 'checkerboard', 60, 0, 'casual skate classic'],
  ['s037', 'Pointed Suede Pumps', 'Massimo Dutti', 'Massimo Dutti', 'shoes', 'suede pumps', 'chocolate', 149, 0, 'suede pointed polished'],
  ['s038', 'Satin Evening Heels', 'Kate Spade', 'Kate Spade', 'shoes', 'satin heels', 'champagne', 198, 0, 'evening wedding elegant'],
  ['s039', 'Sherpa-Lined Winter Boots', 'Sorel', 'REI', 'shoes', 'winter boots', 'black', 190, 0, 'warm winter utility'],
  ['s040', 'Barefoot Trail Shoes', 'Vivobarefoot', 'Vivobarefoot', 'shoes', 'barefoot shoes', 'obsidian', 160, 0, 'minimal active natural'],
  ['s041', 'Court Tennis Shoes', 'K-Swiss', 'K-Swiss', 'shoes', 'tennis shoes', 'white', 80, 0, 'preppy retro court'],
  ['s042', 'Jelly Sandals', 'Melissa', 'Melissa', 'shoes', 'jelly sandals', 'clear', 79, 0, 'playful y2k summer'],
  ['s043', 'Woven Leather Flats', 'Dragon Diffusion-style Mango', 'Mango', 'shoes', 'woven flats', 'tan', 79.99, 0, 'artisan woven vacation'],
  ['s044', 'Moto Ankle Boots', 'AllSaints', 'AllSaints', 'shoes', 'moto boots', 'black', 299, 0, 'edgy moto boot'],
  ['s045', 'Pre-Loved Leather Boots', 'Frye', 'ThredUp', 'shoes', 'leather boots', 'cognac', 65, 328, 'classic vintage boot', 1],
  ['s046', 'Vintage Suede Loafers', 'Gucci', 'The RealReal', 'shoes', 'suede loafers', 'chocolate', 295, 790, 'suede luxe vintage', 1],
  ['s047', 'Secondhand Retro Trainers', 'Nike', 'Depop', 'shoes', 'retro sneakers', 'red white', 55, 0, 'retro trainer vintage', 1],
  ['s048', 'Pre-Owned Ballet Flats', 'Chanel', 'Vestiaire Collective', 'shoes', 'ballet flats', 'beige black', 425, 950, 'iconic luxe vintage', 1],
  ['s049', 'Vintage Western Boots', 'Tony Lama', 'Poshmark', 'shoes', 'western boots', 'brown', 98, 0, 'western heritage vintage', 1],
  ['s050', 'Secondhand Combat Boots', 'Dr. Martens', 'Depop', 'shoes', 'combat boots', 'cherry red', 75, 170, 'edgy burgundy vintage', 1],

  // ---- ACCESSORIES & BAGS (50) ----
  ['a001', 'Leather Tote Bag', 'Madewell', 'Madewell', 'accessories', 'leather tote', 'cognac', 178, 0, 'classic everyday tote'],
  ['a002', 'Gold Layered Necklace', 'Mejuri', 'Mejuri', 'accessories', 'layered necklace', 'gold', 88, 0, 'minimalist everyday jewelry'],
  ['a003', 'Silk Scarf', 'Sezane', 'Sezane', 'accessories', 'silk scarf', 'multi', 65, 85, 'romantic classic french'],
  ['a004', 'Structured Crossbody Bag', 'Cuyana', 'Cuyana', 'accessories', 'crossbody bag', 'black', 195, 0, 'minimalist structured work'],
  ['a005', 'Suede Shoulder Bag', 'Massimo Dutti', 'Massimo Dutti', 'accessories', 'suede bag', 'chocolate', 129, 0, 'suede slouchy luxe'],
  ['a006', 'Suede Bucket Bag', 'Madewell', 'Madewell', 'accessories', 'suede bucket bag', 'tan', 168, 0, 'suede boho everyday'],
  ['a007', 'Burgundy Leather Bag', 'Polène', 'Polène', 'accessories', 'burgundy bag', 'burgundy', 390, 0, 'burgundy sculptural luxe'],
  ['a008', 'Oxblood Shoulder Bag', 'Coach', 'Coach', 'accessories', 'shoulder bag', 'oxblood', 295, 395, 'burgundy heritage classic'],
  ['a009', 'Canvas Crescent Bag', 'Baggu', 'Baggu', 'accessories', 'crescent bag', 'olive', 52, 0, 'casual utility everyday'],
  ['a010', 'Nylon Belt Bag', 'Lululemon', 'Lululemon', 'accessories', 'belt bag', 'black', 38, 0, 'sporty hands-free everyday'],
  ['a011', 'Woven Raffia Tote', 'Sézane-style Mango', 'Mango', 'accessories', 'raffia tote', 'natural', 59.99, 0, 'vacation woven summer'],
  ['a012', 'Quilted Chain Bag', 'Kate Spade', 'Kate Spade', 'accessories', 'quilted bag', 'black', 328, 428, 'polished evening chain'],
  ['a013', 'Cashmere Beanie', 'Quince', 'Quince', 'accessories', 'cashmere beanie', 'heather gray', 34.9, 0, 'cozy winter minimal'],
  ['a014', 'Wool Bucket Hat', 'Ganni', 'Ganni', 'accessories', 'bucket hat', 'brown check', 95, 0, 'fashion-forward fall statement'],
  ['a015', 'Baseball Cap', 'Nike', 'Nike', 'accessories', 'cap', 'navy', 28, 0, 'sporty casual everyday'],
  ['a016', 'Leather Belt', 'Everlane', 'Everlane', 'accessories', 'leather belt', 'black', 58, 0, 'classic staple minimal'],
  ['a017', 'Western Concho Belt', 'Free People', 'Free People', 'accessories', 'western belt', 'tan', 68, 0, 'western boho statement'],
  ['a018', 'Silk Hair Scarf', 'Rouje', 'Rouje', 'accessories', 'hair scarf', 'red print', 45, 0, 'french romantic detail'],
  ['a019', 'Cat-Eye Sunglasses', 'Le Specs', 'Nordstrom', 'accessories', 'cat-eye sunglasses', 'tortoise', 79, 0, 'retro polished summer'],
  ['a020', 'Aviator Sunglasses', 'Ray-Ban', 'Ray-Ban', 'accessories', 'aviator sunglasses', 'gold', 163, 0, 'classic iconic everyday'],
  ['a021', 'Chunky Hoop Earrings', 'Mejuri', 'Mejuri', 'accessories', 'hoop earrings', 'gold', 78, 0, 'minimalist statement everyday'],
  ['a022', 'Pearl Drop Earrings', 'Kate Spade', 'Kate Spade', 'accessories', 'pearl earrings', 'pearl', 68, 0, 'polished feminine classic'],
  ['a023', 'Signet Ring', 'Missoma', 'Missoma', 'accessories', 'signet ring', 'gold', 110, 0, 'minimalist heirloom everyday'],
  ['a024', 'Beaded Statement Necklace', 'Anthropologie', 'Anthropologie', 'accessories', 'beaded necklace', 'multi', 58, 78, 'boho statement artisan'],
  ['a025', 'Leather Watch', 'Timex', 'Timex', 'accessories', 'leather watch', 'tan', 89, 0, 'heritage classic everyday'],
  ['a026', 'Chunky Knit Scarf', 'Acne Studios-style COS', 'COS', 'accessories', 'wool scarf', 'oatmeal', 89, 0, 'cozy oversized winter'],
  ['a027', 'Burgundy Wool Scarf', 'Uniqlo', 'Uniqlo', 'accessories', 'wool scarf', 'burgundy', 29.9, 0, 'burgundy cozy classic'],
  ['a028', 'Leather Gloves', 'Banana Republic', 'Banana Republic', 'accessories', 'leather gloves', 'black', 78, 98, 'polished winter classic'],
  ['a029', 'Ribbed Knit Tights', 'Swedish Stockings', 'Swedish Stockings', 'accessories', 'knit tights', 'chocolate', 39, 0, 'sustainable layered fall'],
  ['a030', 'Crew Socks Three-Pack', 'Bombas', 'Bombas', 'accessories', 'crew socks', 'white', 36, 0, 'everyday comfort staple'],
  ['a031', 'Woven Leather Belt', 'Madewell', 'Madewell', 'accessories', 'woven belt', 'cognac', 49.5, 0, 'artisan casual staple'],
  ['a032', 'Puffy Laptop Sleeve', 'Baggu', 'Baggu', 'accessories', 'laptop sleeve', 'sage', 42, 0, 'practical soft work'],
  ['a033', 'Canvas Weekender', 'L.L.Bean', 'L.L.Bean', 'accessories', 'weekender bag', 'saddle', 99, 0, 'travel heritage durable'],
  ['a034', 'Nylon Backpack', 'Fjällräven', 'REI', 'accessories', 'backpack', 'ochre', 90, 0, 'utility travel iconic'],
  ['a035', 'Evening Clutch', 'Cult Gaia', 'Nordstrom', 'accessories', 'clutch', 'gold', 198, 0, 'evening sculptural statement'],
  ['a036', 'Shearling Headband', 'Free People', 'Free People', 'accessories', 'headband', 'cream', 28, 0, 'cozy winter soft'],
  ['a037', 'Claw Hair Clip Set', 'Anthropologie', 'Anthropologie', 'accessories', 'hair clips', 'tortoise', 24, 0, 'everyday effortless-adjacent detail'],
  ['a038', 'Enamel Bangle', 'Roxanne Assoulin', 'Roxanne Assoulin', 'accessories', 'bangle', 'sunset coral', 85, 0, 'playful color statement'],
  ['a039', 'Amber Resin Earrings', 'Machete', 'Machete', 'accessories', 'resin earrings', 'amber', 58, 0, 'sunset warm artisan'],
  ['a040', 'Silk Tie Scarf', 'Toteme', 'Toteme', 'accessories', 'silk scarf', 'ecru', 140, 0, 'scandi minimal luxe'],
  ['a041', 'Leather Card Case', 'Cuyana', 'Cuyana', 'accessories', 'card case', 'oxblood', 78, 0, 'burgundy minimal staple'],
  ['a042', 'Sport Sunglasses', 'Oakley', 'Oakley', 'accessories', 'sport sunglasses', 'black', 140, 0, 'active technical sport'],
  ['a043', 'Beaded Phone Charm', 'String Ting', 'Urban Outfitters', 'accessories', 'phone charm', 'multi', 32, 0, 'playful y2k detail'],
  ['a044', 'Vintage Silk Scarf', 'Hermès', 'The RealReal', 'accessories', 'silk scarf', 'equestrian print', 210, 495, 'iconic luxe vintage', 1],
  ['a045', 'Pre-Owned Leather Tote', 'Coach', 'ThredUp', 'accessories', 'leather tote', 'saddle', 85, 350, 'heritage vintage everyday', 1],
  ['a046', 'Secondhand Suede Bag', 'Gucci', 'Vestiaire Collective', 'accessories', 'suede bag', 'tan', 495, 1400, 'suede luxe vintage', 1],
  ['a047', 'Vintage Gold Chain', 'Monet', 'Etsy', 'accessories', 'chain necklace', 'gold', 48, 0, 'vintage costume statement', 1],
  ['a048', 'Pre-Loved Silk Tie Scarf', 'Ferragamo', 'Poshmark', 'accessories', 'silk scarf', 'navy print', 65, 220, 'luxe vintage detail', 1],
  ['a049', 'Vintage Beaded Bag', 'Unbranded Artisan', 'Etsy', 'accessories', 'beaded bag', 'pearl white', 55, 0, 'vintage evening artisan', 1],
  ['a050', 'Secondhand Burgundy Bag', 'Longchamp', 'Vestiaire Collective', 'accessories', 'burgundy bag', 'burgundy', 88, 195, 'burgundy classic vintage', 1],

  // ---- MENSWEAR: TOPS (24) ----
  ['mt001', 'Oxford Button-Down Shirt', 'J.Crew', 'J.Crew', 'tops', 'oxford shirt', 'white', 69.5, 0, 'classic preppy business'],
  ['mt002', 'Poplin Dress Shirt', 'Charles Tyrwhitt', 'Charles Tyrwhitt', 'tops', 'dress shirt', 'light blue', 79, 99, 'formal business crisp'],
  ['mt003', 'Heavyweight Pocket Tee', 'Carhartt', 'Carhartt', 'tops', 'pocket tee', 'moss', 24.99, 0, 'workwear durable casual'],
  ['mt004', 'Merino Crewneck Sweater', 'Quince', 'Quince', 'tops', 'merino sweater', 'charcoal', 49.9, 0, 'minimalist classic knit'],
  ['mt005', 'Cable Knit Fisherman Sweater', 'L.L.Bean', 'L.L.Bean', 'tops', 'cable knit sweater', 'natural', 89, 0, 'heritage cable knit'],
  ['mt006', 'Burgundy Lambswool Sweater', 'Uniqlo', 'Uniqlo', 'tops', 'burgundy sweater', 'burgundy', 39.9, 0, 'burgundy classic knit'],
  ['mt007', 'Half-Zip Merino Pullover', 'Banana Republic', 'Banana Republic', 'tops', 'half-zip sweater', 'navy', 110, 140, 'polished layered smart-casual'],
  ['mt008', 'Pique Polo', 'Lacoste', 'Lacoste', 'tops', 'polo', 'navy', 98, 0, 'preppy classic sporty'],
  ['mt009', 'Rugby Stripe Shirt', 'Rowing Blazers', 'Rowing Blazers', 'tops', 'rugby shirt', 'green navy stripe', 129, 0, 'preppy rugby collegiate'],
  ['mt010', 'Flannel Overshirt', 'Portuguese Flannel', 'Portuguese Flannel', 'tops', 'plaid flannel shirt', 'red plaid', 95, 0, 'plaid heritage layered'],
  ['mt011', 'Linen Camp Collar Shirt', 'Todd Snyder', 'Todd Snyder', 'tops', 'linen shirt', 'sand', 128, 0, 'relaxed summer resort'],
  ['mt012', 'Chambray Work Shirt', "Levi's", "Levi's", 'tops', 'chambray shirt', 'chambray blue', 69.5, 0, 'denim workwear casual'],
  ['mt013', 'Turtleneck Sweater', 'COS', 'COS', 'tops', 'turtleneck sweater', 'black', 89, 0, 'minimalist sharp knit'],
  ['mt014', 'Cuban Collar Knit Polo', 'Percival', 'Percival', 'tops', 'knit polo', 'cream', 115, 0, 'retro polished texture'],
  ['mt015', 'Selvedge Denim Western Shirt', 'RRL', 'Ralph Lauren', 'tops', 'denim western shirt', 'dark wash', 245, 0, 'western denim heritage'],
  ['mt016', 'Waffle Henley', 'Madewell', 'Madewell', 'tops', 'henley', 'oatmeal', 55, 0, 'casual layered texture'],
  ['mt017', 'Striped Breton Shirt', 'Armor Lux', 'Armor Lux', 'tops', 'breton shirt', 'navy stripe', 75, 0, 'french classic nautical'],
  ['mt018', 'Tech Performance Polo', 'Lululemon', 'Lululemon', 'tops', 'tech polo', 'black', 88, 0, 'technical polished sporty'],
  ['mt019', 'Vintage Wash Sweatshirt', 'Abercrombie', 'Abercrombie', 'tops', 'crewneck sweatshirt', 'faded navy', 60, 0, 'casual vintage-wash relaxed'],
  ['mt020', 'Shawl Collar Cardigan', 'Wallace & Barnes', 'J.Crew', 'tops', 'shawl cardigan', 'chestnut', 148, 188, 'heritage cozy texture'],
  ['mt021', 'Sheer-Knit Layering Tee', 'Our Legacy', 'Our Legacy', 'tops', 'sheer knit tee', 'black', 160, 0, 'fashion-forward sheer edgy'],
  ['mt022', 'Vintage Rugby Shirt', 'Polo Ralph Lauren', 'Poshmark', 'tops', 'rugby shirt', 'navy gold stripe', 42, 125, 'preppy rugby vintage', 1],
  ['mt023', 'Pre-Owned Cashmere Sweater', 'Brunello Cucinelli', 'The RealReal', 'tops', 'cashmere sweater', 'dove gray', 225, 895, 'luxe minimal vintage', 1],
  ['mt024', 'Secondhand Flannel Shirt', 'Pendleton', 'ThredUp', 'tops', 'plaid flannel shirt', 'green plaid', 38, 109, 'plaid heritage vintage', 1],

  // ---- MENSWEAR: BOTTOMS (16) ----
  ['mb001', 'Slim-Straight Selvedge Jeans', "Levi's", "Levi's", 'bottoms', 'selvedge jeans', 'indigo', 128, 0, 'denim classic slim-straight'],
  ['mb002', 'Athletic Taper Jeans', 'Madewell', 'Madewell', 'bottoms', 'tapered jeans', 'medium wash', 98, 0, 'denim tapered everyday'],
  ['mb003', 'Pleated Wide-Leg Trousers', 'COS', 'COS', 'bottoms', 'wide-leg trousers', 'grey', 135, 0, 'wide-leg pleated tailored'],
  ['mb004', 'Wide-Leg Wool Trousers', 'Arket', 'Arket', 'bottoms', 'wide-leg trousers', 'camel', 149, 0, 'wide-leg tailored scandi'],
  ['mb005', 'Flat-Front Chinos', 'Bonobos', 'Bonobos', 'bottoms', 'chinos', 'khaki', 99, 0, 'classic chino smart-casual'],
  ['mb006', 'Garment-Dyed Chinos', 'Todd Snyder', 'Todd Snyder', 'bottoms', 'chinos', 'olive', 128, 158, 'relaxed chino heritage'],
  ['mb007', 'Wool Dress Trousers', 'Suitsupply', 'Suitsupply', 'bottoms', 'dress trousers', 'charcoal', 169, 0, 'formal tailored business'],
  ['mb008', 'Corduroy Five-Pocket Pants', 'J.Crew', 'J.Crew', 'bottoms', 'corduroy pants', 'chestnut', 98, 128, 'heritage corduroy fall'],
  ['mb009', 'Fatigue Utility Pants', 'Stan Ray', 'Stan Ray', 'bottoms', 'fatigue pants', 'olive', 88, 0, 'utility military relaxed'],
  ['mb010', 'Linen Drawstring Trousers', 'Quince', 'Quince', 'bottoms', 'linen trousers', 'natural', 44.9, 0, 'linen relaxed summer'],
  ['mb011', 'Tech Chino Jogger', 'Lululemon', 'Lululemon', 'bottoms', 'tech joggers', 'black', 128, 0, 'technical tapered commute'],
  ['mb012', 'Sweat Shorts', 'Nike', 'Nike', 'bottoms', 'sweat shorts', 'heather gray', 45, 0, 'sporty casual soft'],
  ['mb013', 'Tailored Suit Trousers', 'Zara', 'Zara', 'bottoms', 'suit trousers', 'navy', 69.9, 0, 'tailored sharp business'],
  ['mb014', 'Vintage 501 Jeans', "Levi's", 'Depop', 'bottoms', 'straight jeans', 'faded indigo', 48, 0, 'vintage denim straight', 1],
  ['mb015', 'Pre-Owned Wool Trousers', 'Ermenegildo Zegna', 'The RealReal', 'bottoms', 'wool trousers', 'grey', 95, 395, 'tailored luxe vintage', 1],
  ['mb016', 'Secondhand Cargo Pants', 'Carhartt', 'Depop', 'bottoms', 'cargo pants', 'duck brown', 45, 0, 'utility workwear vintage', 1],

  // ---- MENSWEAR: OUTERWEAR (14) ----
  ['mo001', 'Unstructured Cotton Blazer', 'Todd Snyder', 'Todd Snyder', 'outerwear', 'unstructured blazer', 'navy', 398, 0, 'tailored unstructured smart'],
  ['mo002', 'Wool Topcoat', 'Suitsupply', 'Suitsupply', 'outerwear', 'wool topcoat', 'camel', 499, 0, 'classic tailored winter'],
  ['mo003', 'Waxed Trucker Jacket', 'Flint and Tinder', 'Huckberry', 'outerwear', 'waxed trucker jacket', 'tan', 228, 0, 'barn waxed heritage'],
  ['mo004', 'Suede Bomber Jacket', 'Banana Republic', 'Banana Republic', 'outerwear', 'suede bomber', 'tan', 450, 550, 'suede bomber luxe'],
  ['mo005', 'Harrington Jacket', 'Baracuta', 'Baracuta', 'outerwear', 'harrington jacket', 'stone', 395, 0, 'heritage mod classic'],
  ['mo006', 'Denim Trucker Jacket', "Levi's", "Levi's", 'outerwear', 'denim trucker jacket', 'mid wash', 79, 0, 'denim classic casual'],
  ['mo007', 'Quilted Field Jacket', 'Barbour', 'Barbour', 'outerwear', 'quilted field jacket', 'olive', 300, 0, 'barn quilted heritage'],
  ['mo008', 'Leather Cafe Racer Jacket', 'Schott', 'Schott', 'outerwear', 'leather jacket', 'black', 750, 0, 'moto leather edgy'],
  ['mo009', 'Burgundy Suede Chore Coat', 'Massimo Dutti', 'Massimo Dutti', 'outerwear', 'suede chore jacket', 'burgundy', 349, 0, 'burgundy suede statement'],
  ['mo010', 'Fleece-Lined Parka', 'The North Face', 'REI', 'outerwear', 'parka', 'black', 350, 0, 'warm technical winter'],
  ['mo011', 'Double-Breasted Overcoat', 'Zara', 'Zara', 'outerwear', 'double-breasted coat', 'grey', 169, 0, 'tailored sharp winter'],
  ['mo012', 'Pre-Owned Waxed Jacket', 'Barbour', 'Vestiaire Collective', 'outerwear', 'waxed jacket', 'olive', 165, 400, 'barn waxed vintage', 1],
  ['mo013', 'Vintage Suede Jacket', 'Polo Ralph Lauren', 'The RealReal', 'outerwear', 'suede jacket', 'chocolate', 245, 795, 'suede heritage vintage', 1],
  ['mo014', 'Secondhand Denim Jacket', 'Wrangler', 'ThredUp', 'outerwear', 'denim jacket', 'faded wash', 32, 89, 'denim vintage casual', 1],

  // ---- MENSWEAR: SHOES (16) ----
  ['ms001', 'Horsebit Leather Loafers', 'G.H. Bass', 'G.H. Bass', 'shoes', 'horsebit loafers', 'burgundy', 185, 0, 'loafer burgundy preppy'],
  ['ms002', 'Penny Loafers', 'Weejuns G.H. Bass', 'G.H. Bass', 'shoes', 'penny loafers', 'dark brown', 175, 0, 'loafer preppy classic'],
  ['ms003', 'Suede Chukka Boots', 'Clarks', 'Clarks', 'shoes', 'suede chukka boots', 'sand', 150, 0, 'suede boot casual'],
  ['ms004', 'Leather Derby Shoes', 'Grant Stone', 'Grant Stone', 'shoes', 'derby shoes', 'chestnut', 340, 0, 'classic welted formal'],
  ['ms005', 'Cap-Toe Oxford Shoes', 'Allen Edmonds', 'Allen Edmonds', 'shoes', 'oxford dress shoes', 'black', 395, 0, 'formal business classic'],
  ['ms006', 'White Leather Court Sneakers', 'Oliver Cabell', 'Oliver Cabell', 'shoes', 'leather sneakers', 'white', 188, 0, 'minimalist versatile clean'],
  ['ms007', 'German Army Trainers', 'Beckett Simonon', 'Beckett Simonon', 'shoes', 'retro trainers', 'white gum', 149, 0, 'retro trainer minimal'],
  ['ms008', 'Suede Desert Boots', 'Clarks', 'Clarks', 'shoes', 'desert boots', 'taupe', 140, 0, 'suede casual heritage'],
  ['ms009', 'Leather Chelsea Boots', 'Thursday Boot Co', 'Thursday Boot Co', 'shoes', 'chelsea boots', 'brown', 199, 0, 'boot versatile smart-casual'],
  ['ms010', 'Moc Toe Work Boots', 'Red Wing', 'Red Wing', 'shoes', 'work boots', 'amber', 330, 0, 'workwear heritage boot'],
  ['ms011', 'Canvas Deck Sneakers', 'Sperry', 'Sperry', 'shoes', 'boat shoes', 'navy', 95, 0, 'preppy nautical summer'],
  ['ms012', 'Leather Slide Sandals', 'Birkenstock', 'Birkenstock', 'shoes', 'leather sandals', 'taupe', 135, 0, 'summer comfort minimal'],
  ['ms013', 'Burgundy Tassel Loafers', 'Meermin', 'Meermin', 'shoes', 'tassel loafers', 'burgundy', 220, 0, 'loafer burgundy polished'],
  ['ms014', 'Pre-Owned Derby Shoes', 'Church’s', 'The RealReal', 'shoes', 'derby shoes', 'black', 265, 890, 'formal welted vintage', 1],
  ['ms015', 'Vintage Chukka Boots', 'Clarks', 'Poshmark', 'shoes', 'suede chukka boots', 'sand', 58, 150, 'suede vintage casual', 1],
  ['ms016', 'Secondhand Penny Loafers', 'Alden', 'Vestiaire Collective', 'shoes', 'penny loafers', 'color 8 burgundy', 320, 720, 'loafer burgundy vintage', 1],

  // ---- MENSWEAR: ACCESSORIES (10) ----
  ['ma001', 'Leather Dress Belt', 'Allen Edmonds', 'Allen Edmonds', 'accessories', 'leather belt', 'black', 98, 0, 'formal classic staple'],
  ['ma002', 'Braided Leather Belt', 'J.Crew', 'J.Crew', 'accessories', 'braided belt', 'tan', 55, 0, 'casual preppy summer'],
  ['ma003', 'Silk Knit Tie', 'The Tie Bar', 'The Tie Bar', 'accessories', 'knit tie', 'burgundy', 35, 0, 'burgundy polished texture'],
  ['ma004', 'Wool Grandad Flat Cap', 'Stetson', 'Stetson', 'accessories', 'flat cap', 'brown herringbone', 75, 0, 'heritage classic fall'],
  ['ma005', 'Leather Briefcase', 'Satchel & Page', 'Satchel & Page', 'accessories', 'leather briefcase', 'chestnut', 385, 0, 'work heritage leather'],
  ['ma006', 'Canvas Messenger Bag', 'Filson', 'Filson', 'accessories', 'messenger bag', 'otter green', 225, 0, 'heritage utility work'],
  ['ma007', 'Field Watch', 'Hamilton', 'Hamilton', 'accessories', 'field watch', 'khaki', 545, 0, 'heritage classic everyday'],
  ['ma008', 'Wool Scarf', 'Johnstons of Elgin', 'Johnstons of Elgin', 'accessories', 'wool scarf', 'camel', 95, 0, 'classic cozy winter'],
  ['ma009', 'Vintage Silk Tie', 'Hermès', 'The RealReal', 'accessories', 'silk tie', 'navy print', 85, 240, 'luxe polished vintage', 1],
  ['ma010', 'Pre-Owned Leather Duffle', 'Coach', 'ThredUp', 'accessories', 'leather duffle', 'saddle', 145, 495, 'travel heritage vintage', 1],
];

const poolCounters: Record<string, number> = {};

/** Department by id convention: 'm'-prefixed rows are menswear, UNISEX_IDS pass every focus, everything else is womenswear. */
function departmentOf(id: string): 'women' | 'men' | 'unisex' {
  if (id.startsWith('m')) return 'men';
  return UNISEX_IDS.has(id) ? 'unisex' : 'women';
}

function build(row: Row): Product {
  const [id, name, brand, retailer, category, subcategory, color, price, originalPrice, styleTags, secondhand] = row;
  const department = departmentOf(id);
  const pool =
    department === 'men' ? MENS_IMAGE_POOLS[category] || IMAGE_POOLS[category] : IMAGE_POOLS[category];
  const counterKey = `${category}:${department === 'men' ? 'm' : 'w'}`;
  const index = (poolCounters[counterKey] = (poolCounters[counterKey] ?? -1) + 1);
  return {
    id: `p-${id}`,
    name,
    brand,
    retailer,
    category,
    subcategory: subcategory || undefined,
    price,
    originalPrice: originalPrice || undefined,
    currency: 'USD',
    imageUrl: `https://images.unsplash.com/photo-${pool[index % pool.length]}?w=600`,
    color,
    sizeRange: department === 'men' ? MENS_SIZE_RANGES[category] : SIZE_RANGES[category],
    styleTags: styleTags.split(' '),
    sourceUrl: link(retailer, brand, name),
    inStock: true,
    department,
    ...(secondhand ? { condition: 'secondhand' as const } : {}),
  };
}

export const MOCK_CATALOG: Product[] = ROWS.map(build);

/**
 * The catalogue in a category- and department-interleaved order.
 *
 * The adapter paginates, and file order is grouped by category (70 tops
 * first), so "the first 60 items" used to mean "tops only" - which starved
 * the starter-outfit engine of bottoms entirely and made a new account's
 * Home go blank. Round-robin across category×department buckets makes any
 * page of any size a representative slice of the whole catalogue.
 */
export const BALANCED_CATALOG: Product[] = (() => {
  const buckets = new Map<string, Product[]>();
  MOCK_CATALOG.forEach(product => {
    const key = `${product.category}:${product.department}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(product);
    else buckets.set(key, [product]);
  });
  const lists = Array.from(buckets.values());
  const longest = Math.max(...lists.map(l => l.length));
  const out: Product[] = [];
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      if (list[i]) out.push(list[i]);
    }
  }
  return out;
})();

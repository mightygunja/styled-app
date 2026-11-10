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
 * imageUrl values are Unsplash photography, one hand-matched photo per row
 * (see VERIFIED_PHOTOS). They show the piece the row describes but are
 * representative imagery, not SKU shots - replaced wholesale the moment a
 * live product feed lands.
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
  // Verified in-browser 2026-09-01 ("OTRA Stevie - Black" -> 5 results).
  // Links must live on otraeyewear.com so the Awin deeplink layer (merchant
  // id 96299 in affiliateNetwork.ts) has a merchant URL to wrap.
  Otra: q => `https://otraeyewear.com/search?q=${encodeURIComponent(q)}`,
  // Verified in-browser 2026-09-04 ("WANAYOU Cross Back Sports Bra" -> 66
  // results). Links must live on wanayou.com so the Awin deeplink layer
  // (merchant id 127939 in affiliateNetwork.ts) has a merchant URL to wrap.
  WANAYOU: q => `https://wanayou.com/search?q=${encodeURIComponent(q)}`,
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

/**
 * One hand-verified photograph per catalogue row.
 *
 * Photos used to be dealt out from per-category pools, cycled in file order,
 * so a card's picture had nothing to do with its words: "Black Skinny Jeans"
 * wore pink trousers and a navy V-neck wore a cream sweater (TestFlight,
 * 2026-11: "several items that the photo didn't match the description").
 * Every pairing below was made by looking at the photo next to the row's
 * name and colour on a proof sheet (2026-11-10), and where the best
 * available photo differed from the row, the ROW was corrected to describe
 * the photo - colour, cut, and brand when a logo is visible.
 *
 * A row with no entry here (and no EXACT_ITEMS product shot) is not shown
 * at all. To add a piece: find its photo first, look at it, then write the
 * row to match. Never the other way round.
 */
const VERIFIED_PHOTOS: Record<string, string> = {
  a001: '1624687943971-e86af76d57de',
  a002: '1599643478518-a784e5dc4c8f',
  a003: '1551028442-ee84b4d3a50a',
  a004: '1620786514684-ff35b5aae55e',
  a005: '1792066329499-97aa32997438',
  a006: '1613482184972-f9c1022d0928',
  a007: '1713425884390-822861ab69a8',
  a008: '1696698864890-ce07532f3351',
  a009: '1691480250099-a63081ecfcb8',
  a011: '1722081346616-7f47909b8309',
  a013: '1648483092137-6e63796c8b06',
  a015: '1691256676359-20e5c6d4bc92',
  a016: '1664286074240-d7059e004dff',
  a018: '1689193502879-362660fad4a8',
  a019: '1612902457652-33aff0a641fa',
  a020: '1572635196237-14b3f281503f',
  a021: '1615655114865-4cc1bda5901e',
  a022: '1662624915084-061d80eec5fc',
  a025: '1612817159623-0399784fd0ce',
  a031: '1711443982852-b3df5c563448',
  a032: '1654773215728-4387196bc2a8',
  a033: '1531938716357-224c16b5ace3',
  a034: '1622560480654-d96214fdc887',
  a035: '1630484179057-75e24310e2ff',
  a040: '1763906803192-0842ce94e448',
  a042: '1584036553516-bf83210aa16c',
  a057: '1752386223406-b3d94092d790',
  a060: '1758542988969-39a10168b2ce',
  a061: '1657603738389-951c374b740c',
  a064: '1583238619747-27950824e04d',
  a065: '1617038220319-276d3cfab638',
  a066: '1711548244653-72219aa9ac27',
  a067: '1666723043169-22e29545675c',
  a068: '1655255114527-d0a834d9a774',
  b001: '1598554747436-c9293d6a588f',
  b002: '1694447814836-c93ab70f7398',
  b003: '1700676195086-81b936390de4',
  b005: '1687825515654-23620796760c',
  b006: '1649566650740-cb0a625e1b40',
  b007: '1789111161072-766f7c6284cc',
  b008: '1509631179647-0177331693ae',
  b010: '1789110853398-539d78dd63bc',
  b011: '1764776060763-d8c1c50f3e72',
  b013: '1603289240360-1b9a75d9596b',
  b015: '1551163943-3f6a855d1153',
  b016: '1762342685668-a76f1a57d7d1',
  b018: '1791745338926-0c641704cb1d',
  b019: '1743356914615-66062f1850e6',
  b020: '1541099649105-f69ad21f3246',
  b021: '1685435690165-97ba05cb8c1a',
  b022: '1789110854236-8de32351d62a',
  b023: '1779153457047-f8ea1653f517',
  b024: '1562801244-b9778719aa99',
  b025: '1785273751457-cb87f6d20ab6',
  b026: '1473966968600-fa801b869a1a',
  b027: '1789111161026-1763989e210c',
  b028: '1789110854331-6d3cabfef781',
  b029: '1604176354204-9268737828e4',
  b030: '1608585617748-d55938680e85',
  b032: '1563718041466-a882656cc13c',
  b033: '1789110520164-2389992e5d0f',
  b034: '1597297260448-3cc8d0a38388',
  b035: '1541840031508-326b77c9a17e',
  b036: '1651694558313-fdfc4ee862ba',
  b037: '1789110854417-28997be7605f',
  b038: '1789110519765-58b53b0b05d7',
  b041: '1665672017097-205fe870657f',
  b042: '1548883354-7622d03aca27',
  b043: '1789110520495-8f1b8545c0ff',
  b044: '1606902965551-dce093cda6e7',
  b046: '1582800093065-3bca10dd2c98',
  b050: '1789110854083-e4752bded644',
  b052: '1789110520143-9f54f069b43f',
  b059: '1789110520410-4fce7246f844',
  d001: '1594739033447-80ab21e24b4c',
  d002: '1789110853872-f416085557fa',
  d003: '1789110520302-3df8ce0410f0',
  d004: '1683660107736-1e8a2c02b8d4',
  d005: '1560607812-841561d8261a',
  d006: '1624968731957-536b843ab2f5',
  d008: '1777713272516-e7b2216fe15e',
  d009: '1572804013309-59a88b7e92f1',
  d010: '1789110854664-85d0c8cb6573',
  d011: '1667890786367-85853fa47a34',
  d012: '1687275161342-8699c61e4364',
  d014: '1595777457583-95e059d581b8',
  d015: '1582533575066-75bd83ac91de',
  d016: '1574655563118-3e3eab32015d',
  d018: '1765229279694-54702d356e46',
  d020: '1602010069450-0a62034f235c',
  d021: '1599662875272-64de8289f6d8',
  d024: '1789111161016-795db6925e99',
  d032: '1629200468327-78bdb7e47c85',
  d033: '1726591383658-37fc19442523',
  d034: '1760907949889-eb62b7fd9f75',
  ma001: '1664286074176-5206ee5dc878',
  ma003: '1782789086467-06ccb25a8509',
  ma005: '1603219527847-24c87f552a77',
  ma008: '1610384104075-e05c8cf200c3',
  ma013: '1604762420548-f4c99d522db7',
  mb001: '1624378439575-d8705ad7ae80',
  mb002: '1602293589930-45aad59ba3ab',
  mb003: '1648301558657-b55db298200a',
  mb004: '1779282534208-af2f013c8fb5',
  mb005: '1781145611661-269c4a28d08b',
  mb006: '1791573391881-98b6b072e7ff',
  mb007: '1622450180332-3da1126f10a4',
  mb008: '1774543859777-74d0e3e2d517',
  mb009: '1785088559550-23875679b825',
  mb010: '1628375385879-1af64230c2e1',
  mb011: '1584865288642-42078afe6942',
  mb013: '1611937669166-be4e0503b115',
  mo001: '1592878904946-b3cd8ae243d0',
  mo002: '1619603364904-c0498317e145',
  mo003: '1610904497162-f9faef9a8e20',
  mo004: '1610904497231-78537234b552',
  mo005: '1512353087810-25dfcd100962',
  mo006: '1516257984-b1b4d707412e',
  mo007: '1772798921669-0f6e1f6f032d',
  mo008: '1520975954732-35dd22299614',
  mo009: '1778193985263-6971c373dd1b',
  mo010: '1614031679232-0dae776a72ee',
  mo011: '1737508945707-ebdccee97cc5',
  mo015: '1764593008195-87ca871d72bd',
  ms001: '1616406432452-07bc5938759d',
  ms002: '1777987601447-266e128de448',
  ms003: '1621665422129-a03cc387bc7d',
  ms004: '1449505278894-297fdb3edbc1',
  ms005: '1784822041434-3e5715e08d4e',
  ms006: '1597350584914-55bb62285896',
  ms008: '1533867617858-e7b97e060509',
  ms009: '1710338514013-42de2bbc36d6',
  ms010: '1520639888713-7851133b1ed0',
  ms013: '1662541089338-c7d53b88be70',
  mt001: '1618786177957-29d9b6b26d8a',
  mt002: '1624835567150-0c530a20d8cc',
  mt003: '1523381210434-271e8be1f52b',
  mt004: '1760006502808-e44ef11b3bfa',
  mt005: '1644911300724-9e6d57f033ef',
  mt006: '1530037315764-705ad936e8b9',
  mt008: '1760287363713-a864ca9b1b1f',
  mt010: '1611312449412-6cefac5dc3e4',
  mt011: '1591357037205-166318b51afd',
  mt012: '1740711152088-88a009e877bb',
  mt013: '1608739872166-3ba1787f57e3',
  mt014: '1761956255550-e1d6d12e94be',
  mt015: '1772155055210-2fa82417f4d2',
  mt016: '1713881649391-a1c8ddaf83cd',
  mt017: '1591224615614-e300d72e37c5',
  mt018: '1625910513413-c23b8bb81cba',
  mt020: '1656528049057-cf3c0d9f0a4a',
  mt025: '1727835523545-70ee992b5763',
  mt027: '1627686011747-74adda3d2343',
  o001: '1539533018447-63fcce2678e3',
  o002: '1495105787522-5334e3ffa0ef',
  o003: '1611308725032-74f0a551d018',
  o004: '1551028719-00167b16eac5',
  o005: '1548883354-d056ab7b441f',
  o008: '1544022613-e87ca75a784a',
  o009: '1762236095356-86047f640d38',
  o012: '1483985988355-763728e1935b',
  o014: '1592327877233-90b9bfd92e48',
  o015: '1608234808654-2a8875faa7fd',
  o016: '1654512697681-8434b50096dd',
  o017: '1678884399113-0a2b079a31f5',
  o018: '1611025504703-8c143abe6996',
  o019: '1766665392181-3efebaae5999',
  o021: '1680690395101-1b2a56c0ac21',
  o022: '1539533113208-f6df8cc8b543',
  o023: '1620247405612-18f042ea68cf',
  o024: '1768983953826-231e8ef0b6dc',
  o025: '1567955465163-c355df3b74bf',
  o026: '1644225450138-9f4f9e2d4582',
  o030: '1591047139829-d91aecb6caea',
  o031: '1739301722226-b60b59c3590a',
  o034: '1611312449408-fcece27cdbb7',
  o035: '1527192250228-1ece59813102',
  o036: '1770622006147-0561289d5bb2',
  o043: '1760551600982-d8ecd70b709f',
  o044: '1549401334-b71409ed03ae',
  s001: '1534233812932-59b8fa1b780c',
  s002: '1625860191460-10a66c7384fb',
  s003: '1519415943484-9fa1873496d4',
  s004: '1542291026-7eec264c27ff',
  s005: '1676121270762-47c8d3a7b9d5',
  s006: '1649503377051-e092f490c482',
  s007: '1743799349027-93aca0dd6273',
  s008: '1631978278971-9afda1670882',
  s009: '1761777939781-2fb1b636d5fc',
  s011: '1622760807800-66cf1466fc08',
  s012: '1599670998937-441a3a74b2f1',
  s013: '1608229751021-ed4bd8677753',
  s014: '1763661300203-aa3e2702f510',
  s015: '1608629601270-a0007becead3',
  s016: '1610685756406-0f2fdc231bf0',
  s017: '1608256246200-53e635b5b65f',
  s018: '1599012307605-23a0ebe4d321',
  s019: '1633418946770-6938893cff02',
  s020: '1559334417-1adb87b6e97f',
  s021: '1627141792925-eddee39cf275',
  s022: '1773520945715-45723cac29d2',
  s023: '1775297832774-9eb647970c68',
  s024: '1718365837137-13cbd931068a',
  s025: '1625318880107-49baad6765fd',
  s027: '1565953198075-db265882ee68',
  s028: '1613912804931-c3512f360cd3',
  s030: '1562273138-f46be4ebdf33',
  s032: '1780850603124-ec403cdd7ec3',
  s033: '1732708862072-d2f9e578e531',
  s037: '1596702874230-b5706dfb5bc7',
  s043: '1678805409106-fcd0e0337e04',
  s051: '1603204706569-b807e6abb4ea',
  t001: '1680690517143-d813ac08cd13',
  t002: '1581655353564-df123a1eb820',
  t003: '1578795024466-26f49b4d23f6',
  t004: '1556821840-3a63f95609a7',
  t005: '1563715992267-f9df28c292ac',
  t006: '1622445270936-5dcb604970e7',
  t007: '1540804485132-9c94bcae6c66',
  t008: '1640786443594-408d1d5a6298',
  t009: '1765337210302-cb6271ae6f9f',
  t011: '1771919331453-9a52362d8909',
  t012: '1605131546231-a5f385db4a6b',
  t013: '1629580628926-9fbdffb346b3',
  t017: '1612629779374-a8432d338af5',
  t019: '1713881587420-113c1c43e28a',
  t020: '1570308089942-8b66def201f0',
  t021: '1603252109303-2751441dd157',
  t026: '1675537107203-d5acc2463d3f',
  t029: '1601379327928-bedfaf9da2d0',
  t030: '1709786981112-7ab84ee3b55b',
  t032: '1791014719375-5934fe625e67',
  t033: '1685278463760-cd2134ab9d8a',
  t034: '1564257631407-4deb1f99d992',
  t035: '1588186941286-724357304676',
  t036: '1785273751508-ec5ab6b61270',
  t039: '1525550133628-43e58e551e6f',
  t040: '1713881842156-3d9ef36418cc',
  t041: '1588795904317-2f4ab1a0a852',
  t043: '1596755094514-f87e34085b2c',
  t045: '1782425008818-e4733c917449',
  t049: '1713881676551-b16f22ce4719',
  t051: '1673925205809-601b5a22eb61',
  t052: '1688011739465-c2fe5dfbdd2f',
  t053: '1620799140408-edc6dcb6d633',
  t057: '1620352410607-a65019479cbd',
  t058: '1434389677669-e08b4cac3105',
  t060: '1618354691373-d851c5c3a990',
  t061: '1550639525-c97d455acf70',
  t062: '1779153996913-fc2565ed7e14',
  t063: '1631541909061-71e349d1f203',
  t080: '1708534246055-d7b149acb731',
  t082: '1776633733518-d81137214dc9',
  // 2026-11-10 menswear depth - proofed on seed_01..07 sheets.
  mt030: '1511039912745-8bfa0bc56aeb',
  mt031: '1746813628894-aa354c6d6565',
  mt032: '1639747278969-14e563f2f34b',
  mt033: '1785338486345-e790ce166678',
  mt034: '1636695286011-8355e07bfe25',
  mt035: '1723295635446-78657958f209',
  mt036: '1667932668984-de34308a3ca7',
  mt037: '1794109776116-96f6c04f03c0',
  mt038: '1616517762989-f2e371454f32',
  mt039: '1738680480720-dd97397c2f4a',
  mt040: '1760549461891-a2341e81eb1f',
  mt041: '1653839280015-8ea9c7a775d8',
  mt042: '1589493693598-191812bfb14d',
  mo020: '1631680649987-ed84ce4bc350',
  mo021: '1643131870277-749922079eb1',
  mo022: '1610312726541-0913012a2d00',
  mt043: '1790435231271-05b9b184cc69',
  mt044: '1790441665037-4e5bdbda5a40',
  mt045: '1793415604013-02521a90793b',
  mt046: '1775044870432-39b1f27c3e14',
  mt047: '1779636448378-9c80e76e96c0',
  mt048: '1753019492043-7e11648fcb87',
  mt049: '1733322987284-4210857c2ada',
  mt050: '1759495382228-daa62a3ec079',
  mt051: '1599577308292-48e4a8b7e739',
  mt052: '1594201508621-4e853b4db051',
  mt053: '1576582839652-2f952f042952',
  mo023: '1760637625920-4be85f78b6a6',
  ms020: '1585120824848-8a5cd41493d2',
  a070: '1699532921303-6c51bc2b547d',
  mo024: '1521223890158-f9f7c3d5d504',
  mb020: '1517553844237-d51624c8dca8',
  mb021: '1511196044526-5cb3bcb7071b',
  mb022: '1658213455892-b34ccd7b068e',
  ms023: '1600429316815-43fe937fdc92',
  ms024: '1744481667534-0f3f710b264d',
  mt054: '1628737490381-117c818d1ad7',
  ma020: '1613498510372-8901cad084a2',
  mo026: '1594167154836-838be958f605',
  s052: '1628193104037-3590917fb66e',
  mt055: '1747094600551-25d1cdddd46c',
  mb023: '1695918428487-7934244c19ac',
  mt057: '1729280924877-4750c0dba51e',
  mt058: '1697663837192-797d28e564d8',
  mt059: '1639976519765-f2aae0f8d845',
  mt060: '1721829017281-3f10cb48d081',
  mt061: '1619474413782-35a2004d37fc',
  mo027: '1635567153098-0e299c827bcd',
  mo028: '1773848088735-a2ab9aa223c0',
  mo029: '1633965288332-cba23d7e157d',
  mb024: '1711175017307-bbacf7c2ca13',
  mt062: '1506638794690-bbea5c6f0ab7',
  ms025: '1676041669566-fead69bd7007',
  s053: '1709258228137-19a8c193be39',
  s054: '1606107557195-0e29a4b5b4aa',
  s055: '1747691875590-14db938e42d4',
  mo030: '1643622782660-30dedcd8d75a',
  mo031: '1614079290101-0c2181ac8ea3',
  mt063: '1793055840883-65ac35599c2e',
  mt064: '1740442535162-fc915d5403f2',
  mt065: '1654182598948-17ef2fe3563f',
  mo032: '1649058047388-b49c028df9ac',
  mo033: '1624548140129-74786c5f1279',
  ma021: '1566311024351-2baba6400f31',
  mt067: '1720514496161-914011a9ee02',
  ms026: '1777987601431-8d27d2039cc4',
  mo034: '1669575903350-9a349b411810',
  o045: '1650338524059-f0ae486cfa66',
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
  // 2026-11-10 department sweep (every photo viewed against whose screen it
  // appears on). A cross-department photo shows the piece alone, or a person
  // with nothing that reads as either gender. Moved out: a009 (a top-handle
  // handbag) and s012 (a woman tying her shoe) are womenswear; s052 (platform
  // boots) is womenswear; a032, b041 and o005 (a man's hand and build in
  // frame) are menswear - see MENS_IDS.
  'a013', 'a015', 'a016', 'a020', 'a025', 'a033', 'a034', 'a042', 'a057', 'a061', 'a064', 'a067', 'a051', 'a055',
  'b029', 'b030', 'b035',
  'o003', 'o025', 'o034', 'o035',
  's002', 's004', 's009', 's011', 's017', 's018', 's025', 's051',
  't002', 't004', 't041', 't053', 't060',
  'a070', 's053', 's054', 's055',
]);

/**
 * One product per line:
 * [id, name, brand, retailer, category, subcategory, color, price, originalPrice (0 = not on sale), styleTags, secondhand?]
 */
type Row = [string, string, string, string, ItemCategory, string, string, number, number, string, 1?];

const ROWS: Row[] = [
  // ---- TOPS ----
  ['t001', 'Sheer Dotted Blouse', 'Everlane', 'Everlane', 'tops', 'sheer blouse', 'white', 88, 0, 'romantic sheer delicate'],
  ['t002', 'Oversized Cotton Tee', 'COS', 'COS', 'tops', 'tee', 'white', 35, 0, 'minimalist oversized casual'],
  ['t003', 'Merino Wool Turtleneck', 'Uniqlo', 'Uniqlo', 'tops', 'turtleneck sweater', 'cream', 49.9, 0, 'classic minimalist knit'],
  ['t004', 'Pullover Hoodie', 'Champion', 'Nordstrom', 'tops', 'hoodie', 'gray', 60, 0, 'cozy casual everyday'],
  ['t005', 'Silk Camisole', 'Reformation', 'Reformation', 'tops', 'camisole', 'black', 68, 0, 'date elegant minimalist'],
  ['t006', 'Organic Cotton Crew Tee', 'Kotn', 'Kotn', 'tops', 'organic cotton tee', 'white', 32, 0, 'minimalist sustainable casual'],
  ['t007', 'Boxy Cropped Tee', 'Madewell', 'Madewell', 'tops', 'cropped tee', 'grey', 29.5, 0, 'relaxed boxy casual'],
  ['t008', 'Cable Knit Turtleneck', 'J.Crew', 'J.Crew', 'tops', 'cable knit sweater', 'grey', 98, 0, 'classic preppy knit'],
  ['t009', 'Waffle V-Neck Sweater', 'Quince', 'Quince', 'tops', 'v-neck sweater', 'cream', 49.9, 0, 'classic preppy minimalist'],
  ['t011', 'Corduroy Polo Shirt', 'Lacoste', 'Lacoste', 'tops', 'polo', 'olive', 98, 0, 'preppy classic sporty'],
  ['t012', 'Button Cardigan', 'Aritzia', 'Aritzia', 'tops', 'cardigan', 'green', 78, 0, 'classic soft knit'],
  ['t013', 'Chunky Cropped Cardigan', '& Other Stories', '& Other Stories', 'tops', 'cardigan', 'cream', 89, 0, 'relaxed cozy knit'],
  ['t017', 'Burgundy Cable Sweater', 'Uniqlo', 'Uniqlo', 'tops', 'burgundy sweater', 'burgundy', 39.9, 0, 'classic knit winter'],
  ['t019', 'Linen Henley Top', 'Quince', 'Quince', 'tops', 'linen top', 'cream', 39.9, 0, 'relaxed summer breathable'],
  ['t020', 'Striped Breton Tee', 'Sezane', 'Sezane', 'tops', 'breton tee', 'navy stripe', 75, 0, 'classic french casual'],
  ['t021', 'Poplin Shirt', 'Charles Tyrwhitt', 'Charles Tyrwhitt', 'tops', 'dress shirt', 'white', 79, 0, 'formal business classic'],
  ['t026', 'Ribbed Fitted Tank', 'Skims', 'Skims', 'tops', 'fitted tank', 'black', 36, 0, 'minimalist fitted layered'],
  ['t029', 'Cashmere Crewneck', 'Quince', 'Quince', 'tops', 'cashmere sweater', 'heather gray', 59.9, 0, 'minimalist luxe knit'],
  ['t030', 'Fair Isle Sweater', 'Toast', 'Toast', 'tops', 'fair isle sweater', 'cream multi', 165, 0, 'heritage cozy pattern'],
  ['t032', 'Puff Sleeve Peplum Blouse', 'Damson Madder', 'Damson Madder', 'tops', 'puff sleeve blouse', 'white', 85, 0, 'romantic boho statement-sleeve'],
  ['t033', 'Off-Shoulder Peasant Blouse', 'Free People', 'Free People', 'tops', 'peasant blouse', 'white', 78, 0, 'bohemian flowing romantic'],
  ['t034', 'Embroidered Tie-Front Blouse', 'Anthropologie', 'Anthropologie', 'tops', 'embroidered blouse', 'white', 98, 0, 'bohemian artisan detail'],
  ['t035', 'Lace-Trim Silk Cami', 'Vince', 'Vince', 'tops', 'silk camisole', 'champagne', 145, 0, 'elegant minimalist luxe'],
  ['t036', 'Rib Knit Tank', 'Aritzia', 'Aritzia', 'tops', 'rib knit top', 'white', 45, 0, 'fitted cropped minimal'],
  ['t039', 'Tie-Front Ruffle Top', 'Rouje', 'Rouje', 'tops', 'ruffle top', 'red', 115, 0, 'romantic french date'],
  ['t040', 'Linen Band-Collar Shirt', 'Arket', 'Arket', 'tops', 'linen shirt', 'sky blue', 79, 0, 'minimalist scandi crisp'],
  ['t041', 'Buffalo Plaid Flannel Shirt', 'L.L.Bean', 'L.L.Bean', 'tops', 'flannel shirt', 'red plaid', 54.95, 0, 'heritage cozy oversized'],
  ['t043', 'Dotted Chambray Shirt', 'Madewell', 'Madewell', 'tops', 'chambray shirt', 'chambray blue', 72, 0, 'casual denim everyday'],
  ['t045', 'Cashmere Cardigan', 'Jenni Kayne', 'Jenni Kayne', 'tops', 'cardigan', 'taupe', 285, 0, 'luxe cozy knit'],
  ['t049', 'Boxy Linen Shirt', 'Eileen Fisher', 'Eileen Fisher', 'tops', 'linen shirt', 'cream', 148, 0, 'sustainable relaxed boxy'],
  ['t051', 'Long-Sleeve Crop Top', 'Brandy Melville', 'Brandy Melville', 'tops', 'crop top', 'cream', 18, 0, 'y2k fitted casual'],
  ['t052', 'Striped Knit Sweater', 'Toteme', 'Toteme', 'tops', 'striped knit', 'black stripe', 190, 0, 'scandi minimalist luxe'],
  ['t053', 'Crewneck Sweatshirt', 'Vuori', 'Vuori', 'tops', 'sweatshirt', 'white', 84, 0, 'cozy relaxed soft'],
  ['t057', 'Satin Cowl Cami', 'Aritzia', 'Aritzia', 'tops', 'cowl neck top', 'rust', 68, 0, 'date elegant satin'],
  ['t058', 'Crochet Knit Top', 'Faithfull the Brand', 'Faithfull the Brand', 'tops', 'crochet top', 'cream', 129, 0, 'bohemian artisan summer'],
  ['t060', 'Graphic Logo Tee', 'Urban Outfitters', 'Urban Outfitters', 'tops', 'graphic tee', 'black', 45, 0, 'vintage streetwear graphic'],
  ['t061', 'Fitted Turtleneck', 'Spanx', 'Spanx', 'tops', 'turtleneck', 'black', 78, 0, 'fitted layered polished'],
  ['t062', 'Lace Blouse', 'Doen', 'Doen', 'tops', 'lace blouse', 'ivory', 198, 0, 'romantic lace sheer'],
  ['t063', 'Chunky Fisherman Sweater', 'Toast', 'Toast', 'tops', 'fisherman sweater', 'oatmeal', 195, 0, 'heritage chunky knit'],
  ['t066', 'Pre-Owned Silk Blouse', 'Equipment', 'Depop', 'tops', 'silk blouse', 'blush', 28, 78, 'romantic vintage silk', 1],
  ['t067', 'Vintage Cashmere Crewneck', 'Pringle of Scotland', 'The RealReal', 'tops', 'cashmere sweater', 'heather gray', 85, 320, 'vintage luxe knit', 1],
  ['t068', 'Pre-Loved Cable Knit', 'Aran Crafts', 'ThredUp', 'tops', 'cable knit sweater', 'natural', 42, 130, 'heritage vintage knit', 1],
  ['t069', 'Vintage Rugby Shirt', 'Polo Ralph Lauren', 'Poshmark', 'tops', 'rugby shirt', 'green stripe', 38, 125, 'preppy vintage collegiate', 1],
  ['t070', 'Secondhand Burgundy Knit', 'COS', 'Vestiaire Collective', 'tops', 'burgundy sweater', 'burgundy', 45, 115, 'minimalist vintage knit', 1],

  // WANAYOU - Awin merchant 127939 (joined 2026-09-04). Women's activewear;
  // 10% commission, 30-day cookie, US only. Titles, colourways and prices
  // read from wanayou.com/products/*.json on 2026-09-04; every product photo
  // viewed as a contact sheet the same day (all nine are female models on
  // womenswear, so these stay out of UNISEX_IDS).
  // One colourway per style - the store lists each colour as its own product.
  ['t071', 'Cross Back Padded Running Bra', 'WANAYOU', 'WANAYOU', 'tops', 'sports bra', 'black', 18.99, 0, 'athleisure active fitted'],
  ['t072', 'Cross Back Sports Bra - White', 'WANAYOU', 'WANAYOU', 'tops', 'sports bra', 'white', 22.99, 0, 'athleisure active fitted'],
  ['t073', 'Adjustable Strap Front Zip Sports Bra', 'WANAYOU', 'WANAYOU', 'tops', 'sports bra', 'black', 32.99, 0, 'athleisure active technical'],
  ['t074', 'Medium Support Workout Bras - Mauve', 'WANAYOU', 'WANAYOU', 'tops', 'sports bra', 'mauve', 26.99, 0, 'athleisure active seamless'],
  ['t075', 'Halter Tank Top with Built-in Bra - Color Block', 'WANAYOU', 'WANAYOU', 'tops', 'halter tank', 'black white', 26.99, 0, 'athleisure fitted cropped'],
  ['t076', 'Halter Tank Top with Built-in Bra - Brown', 'WANAYOU', 'WANAYOU', 'tops', 'halter tank', 'brown', 26.99, 0, 'athleisure fitted cropped'],
  ['t077', 'Seamless Crew Neck Long Sleeve', 'WANAYOU', 'WANAYOU', 'tops', 'long sleeve top', 'black', 18.99, 0, 'athleisure technical layered'],
  ['t078', 'Seamless Thumbhole Black Long-Sleeve Shirt', 'WANAYOU', 'WANAYOU', 'tops', 'long sleeve top', 'black', 18.99, 0, 'athleisure technical layered'],
  ['t079', 'Seamless Thumbhole Long Sleeve - Light Blue', 'WANAYOU', 'WANAYOU', 'tops', 'long sleeve top', 'light blue', 24.99, 0, 'athleisure technical layered'],

  // ---- BOTTOMS ----
  ['b001', 'High-Rise Straight Jeans', "Levi's", "Levi's", 'bottoms', 'straight jeans', 'denim blue', 98, 0, 'casual denim everyday high-rise'],
  ['b002', 'Tailored Straight Trousers', 'Massimo Dutti', 'Massimo Dutti', 'bottoms', 'wool trousers', 'navy', 129, 0, 'formal business structured'],
  ['b003', 'Relaxed Cargo Pants', 'Zara', 'Zara', 'bottoms', 'cargo pants', 'olive', 59.9, 0, 'streetwear relaxed utility'],
  ['b005', 'Wide-Leg Trousers', 'Everlane', 'Everlane', 'bottoms', 'wide-leg trousers', 'olive', 118, 0, 'wide-leg tailored polished'],
  ['b006', 'Pleated Wide-Leg Trousers', 'COS', 'COS', 'bottoms', 'wide-leg trousers', 'grey check', 135, 0, 'wide-leg pleated minimalist'],
  ['b007', 'Wide-Leg Chambray Trousers', 'Arket', 'Arket', 'bottoms', 'wide-leg trousers', 'chambray blue', 149, 0, 'wide-leg relaxed scandi'],
  ['b008', 'Striped Palazzo Pants', 'Mango', 'Mango', 'bottoms', 'palazzo pants', 'black white stripe', 69.99, 0, 'wide-leg flowing elegant'],
  ['b010', 'A-Line Mini Skirt', 'Uniqlo', 'Uniqlo', 'bottoms', 'mini skirt', 'black', 39.9, 0, 'classic minimal everyday'],
  ['b011', 'Plaid Pleated Midi Skirt', 'Abercrombie', 'Abercrombie', 'bottoms', 'plaid skirt', 'blue green plaid', 70, 0, 'preppy plaid pleated'],
  ['b013', 'Wool Plaid Midi Skirt', 'J.Crew', 'J.Crew', 'bottoms', 'plaid midi skirt', 'red plaid', 118, 0, 'classic plaid heritage'],
  ['b015', 'Pleated Midi Skirt', 'H&M', 'H&M', 'bottoms', 'pleated midi skirt', 'tan', 34.99, 0, 'classic polished pleated'],
  ['b016', 'Pleated Maxi Skirt', 'Free People', 'Free People', 'bottoms', 'maxi skirt', 'white', 88, 0, 'flowing maxi romantic'],
  ['b018', 'Satin Slip Skirt', 'Reformation', 'Reformation', 'bottoms', 'slip skirt', 'champagne', 148, 0, 'elegant satin minimal'],
  ['b019', 'Denim Maxi Skirt', 'Madewell', 'Madewell', 'bottoms', 'denim skirt', 'mid wash', 88, 0, 'denim casual everyday'],
  ['b020', 'Patchwork Recycled Jeans', 'Reformation', 'Reformation', 'bottoms', 'recycled denim jeans', 'vintage blue', 128, 0, 'sustainable denim high-rise'],
  ['b021', 'Barrel Leg Jeans', 'Citizens of Humanity', 'Nordstrom', 'bottoms', 'barrel jeans', 'light wash', 218, 0, 'barrel relaxed fashion-forward'],
  ['b022', 'Wide-Leg Paperbag Jeans', 'Abercrombie', 'Abercrombie', 'bottoms', 'wide-leg jeans', 'dark wash', 90, 0, 'wide-leg denim relaxed'],
  ['b023', 'Bootcut Jeans', 'Gap', 'Gap', 'bottoms', 'bootcut jeans', 'light wash', 69.95, 0, 'bootcut classic everyday'],
  ['b024', 'Black Skinny Jeans', "Levi's", "Levi's", 'bottoms', 'skinny jeans', 'black', 89.5, 0, 'skinny fitted classic'],
  ['b025', 'High-Rise Straight Jeans', 'Abercrombie', 'Abercrombie', 'bottoms', 'straight jeans', 'light blue', 90, 0, 'casual denim summer'],
  ['b026', 'Slim Chino Trousers', 'Dockers', 'Dockers', 'bottoms', 'chinos', 'khaki', 58, 0, 'classic chino everyday'],
  ['b027', 'Cropped Wide Trousers', 'Banana Republic', 'Banana Republic', 'bottoms', 'kick flare pants', 'pink', 110, 0, 'polished cropped wide-leg'],
  ['b028', 'Paperbag Waist Trousers', 'Mango', 'Mango', 'bottoms', 'paperbag trousers', 'coral', 59.99, 0, 'relaxed high-rise summer'],
  ['b029', 'Straight Leg Jeans', 'Madewell', 'Madewell', 'bottoms', 'straight jeans', 'mid wash', 128, 0, 'denim casual everyday'],
  ['b030', 'Track Pants', 'Adidas', 'Adidas', 'bottoms', 'track pants', 'black', 60, 0, 'sporty retro streetwear'],
  ['b032', 'Faux Leather Leggings', 'AllSaints', 'AllSaints', 'bottoms', 'leather leggings', 'black', 299, 0, 'edgy leather evening'],
  ['b033', 'Fleece Joggers', 'Lululemon', 'Lululemon', 'bottoms', 'joggers', 'grey', 118, 0, 'athleisure cozy relaxed'],
  ['b034', 'High-Rise Leggings', 'Girlfriend Collective', 'Girlfriend Collective', 'bottoms', 'leggings', 'olive', 78, 0, 'active sustainable fitted'],
  ['b035', 'Original Fit Jeans', "Levi's", "Levi's", 'bottoms', 'straight jeans', 'stonewash blue', 98, 0, 'denim classic heritage'],
  ['b036', 'Denim Cutoff Shorts', "Levi's", "Levi's", 'bottoms', 'denim shorts', 'mid wash', 59.5, 0, 'casual denim summer'],
  ['b037', 'Paperbag Shorts', 'Zara', 'Zara', 'bottoms', 'shorts', 'white', 45.9, 0, 'casual summer relaxed'],
  ['b038', 'Button-Front Denim Mini Skirt', 'Alo Yoga', 'Alo Yoga', 'bottoms', 'denim mini skirt', 'white', 78, 0, 'casual denim summer'],
  ['b041', 'Slim Black Jeans', 'Uniqlo', 'Uniqlo', 'bottoms', 'slim jeans', 'washed black', 49.9, 0, 'denim minimal everyday'],
  ['b042', 'Cargo Work Pants', 'Dickies', 'Dickies', 'bottoms', 'cargo pants', 'black', 44, 0, 'utility streetwear durable'],
  ['b043', 'Cargo Joggers', 'Urban Outfitters', 'Urban Outfitters', 'bottoms', 'cargo joggers', 'pink', 69, 0, 'streetwear utility relaxed'],
  ['b044', 'Sculpt Leggings', 'Alo Yoga', 'Alo Yoga', 'bottoms', 'leggings', 'burgundy', 98, 0, 'athleisure active fitted'],
  ['b046', 'Floral A-Line Skirt', 'Sezane', 'Sezane', 'bottoms', 'wrap skirt', 'red floral', 125, 0, 'romantic a-line french'],
  ['b050', 'Striped Wide-Leg Trousers', 'Toteme', 'Toteme', 'bottoms', 'wide-leg trousers', 'white stripe', 320, 0, 'wide-leg scandi relaxed'],
  ['b052', 'Cropped Linen Culottes', 'Eileen Fisher', 'Eileen Fisher', 'bottoms', 'cropped wide pants', 'mustard', 168, 0, 'wide-leg linen relaxed'],
  ['b053', 'Vintage 501 Jeans', "Levi's", 'ThredUp', 'bottoms', 'straight jeans', 'denim blue', 38, 98, 'vintage denim casual', 1],
  ['b054', 'Pre-Owned Wool Trousers', 'Max Mara', 'The RealReal', 'bottoms', 'wide-leg wool trousers', 'camel', 120, 425, 'wide-leg luxe vintage', 1],
  ['b055', 'Secondhand Plaid Skirt', 'Burberry', 'Vestiaire Collective', 'bottoms', 'plaid skirt', 'nova check', 195, 550, 'plaid heritage vintage', 1],
  ['b056', 'Pre-Loved Silk Maxi Skirt', 'Doen', 'Poshmark', 'bottoms', 'flowing maxi skirt', 'dusty rose', 88, 248, 'boho flowing vintage', 1],
  ['b057', 'Vintage Corduroy Flares', 'Wrangler', 'Depop', 'bottoms', 'corduroy flares', 'rust', 34, 0, 'seventies flared vintage', 1],
  ['b058', 'Secondhand Leather Skirt', 'AllSaints', 'ThredUp', 'bottoms', 'leather mini skirt', 'black', 65, 220, 'edgy leather vintage', 1],

  // ---- DRESSES ----
  ['d001', 'Slip Maxi Dress', 'Reformation', 'Reformation', 'dresses', 'slip dress', 'black', 168, 0, 'elegant minimal evening'],
  ['d002', 'Belted Shirt Dress', 'Everlane', 'Everlane', 'dresses', 'shirt dress', 'coral', 118, 0, 'classic business everyday'],
  ['d003', 'Belted Linen Dress', 'Quince', 'Quince', 'dresses', 'linen dress', 'cream', 59.9, 0, 'linen breathable summer'],
  ['d004', 'Linen Prairie Dress', 'Christy Dawn', 'Christy Dawn', 'dresses', 'prairie dress', 'rust', 258, 0, 'boho prairie sustainable'],
  ['d005', 'Tiered Maxi Dress', 'Doen', 'Doen', 'dresses', 'tiered maxi dress', 'white', 298, 0, 'boho flowing romantic'],
  ['d006', 'Ribbed Knit Mini Dress', 'Aritzia', 'Aritzia', 'dresses', 'knit dress', 'black', 98, 0, 'fitted minimal everyday'],
  ['d008', 'Satin Cowl Slip Dress', 'Mango', 'Mango', 'dresses', 'satin slip dress', 'ivory', 79.99, 0, 'elegant satin evening'],
  ['d009', 'Floral Wrap Dress', 'Rouje', 'Rouje', 'dresses', 'wrap dress', 'red floral', 185, 0, 'french romantic wrap'],
  ['d010', 'Floral Tiered Maxi Dress', 'Damson Madder', 'Damson Madder', 'dresses', 'maxi dress', 'green floral', 120, 0, 'boho flowing tiered floral'],
  ['d011', 'T-Shirt Dress', 'COS', 'COS', 'dresses', 't-shirt dress', 'white', 69, 0, 'minimalist relaxed everyday'],
  ['d012', 'Ribbed Turtleneck Sweater Dress', 'Jenni Kayne', 'Jenni Kayne', 'dresses', 'sweater dress', 'cream', 265, 0, 'cozy luxe minimal'],
  ['d014', 'Maxi Gown', 'Faithfull the Brand', 'Faithfull the Brand', 'dresses', 'maxi dress', 'red', 189, 0, 'statement flowing evening'],
  ['d015', 'One-Shoulder Sequin Dress', '& Other Stories', '& Other Stories', 'dresses', 'sequin dress', 'silver', 159, 0, 'party statement evening'],
  ['d016', 'Ruffle Sleeve Mini Dress', 'Free People', 'Free People', 'dresses', 'puff sleeve dress', 'white', 128, 0, 'romantic ruffle mini'],
  ['d018', 'Satin Evening Gown', 'Réalisation Par', 'Réalisation Par', 'dresses', 'satin gown', 'red', 265, 0, 'evening satin elegant'],
  ['d020', 'Floral Midi Dress', 'Sezane', 'Sezane', 'dresses', 'floral dress', 'navy floral', 165, 0, 'romantic floral french'],
  ['d021', 'Lace Sleeve Midi Dress', 'Ganni', 'Ganni', 'dresses', 'lace dress', 'black', 285, 0, 'romantic lace evening'],
  ['d024', 'Sleeveless Shirt Dress', 'Kotn', 'Kotn', 'dresses', 'shirt dress', 'mustard', 88, 0, 'classic summer easy'],
  ['d026', 'Pre-Owned Silk Slip Dress', 'Reformation', 'Poshmark', 'dresses', 'slip dress', 'black', 68, 198, 'elegant vintage silk', 1],
  ['d027', 'Vintage Wrap Dress', 'Diane von Furstenberg', 'The RealReal', 'dresses', 'wrap dress', 'bold print', 145, 468, 'iconic wrap vintage', 1],
  ['d028', 'Secondhand Prairie Dress', 'Doen', 'Vestiaire Collective', 'dresses', 'prairie dress', 'dusty rose', 128, 328, 'boho prairie vintage', 1],
  ['d029', 'Pre-Loved Knit Dress', 'COS', 'ThredUp', 'dresses', 'knit dress', 'charcoal', 42, 135, 'minimalist vintage cozy', 1],
  ['d030', 'Vintage Slip Gown', 'Ghost London', 'Depop', 'dresses', 'slip gown', 'ivory', 95, 0, 'vintage bias-cut bridal', 1],

  // ---- OUTERWEAR ----
  ['o001', 'Wool Wrap Coat', 'Massimo Dutti', 'Massimo Dutti', 'outerwear', 'wool overcoat', 'camel', 289, 0, 'classic formal winter'],
  ['o002', 'Denim Trucker Jacket', "Levi's", "Levi's", 'outerwear', 'denim trucker jacket', 'light denim', 79, 0, 'casual denim everyday'],
  ['o003', 'Packable Rain Anorak', 'Patagonia', 'REI', 'outerwear', 'rain jacket', 'black', 149, 0, 'outdoor utility travel'],
  ['o004', 'Leather Moto Jacket', 'AllSaints', 'AllSaints', 'outerwear', 'leather moto jacket', 'black', 398, 0, 'streetwear edgy leather'],
  ['o005', 'Waxed Field Jacket', 'Barbour', 'Barbour', 'outerwear', 'waxed field jacket', 'olive', 425, 0, 'barn heritage waxed'],
  ['o008', 'Utility Field Jacket', 'Gap', 'Gap', 'outerwear', 'utility jacket', 'olive', 98, 0, 'utility casual layered'],
  ['o009', 'Suede Jacket', 'Madewell', 'Madewell', 'outerwear', 'suede jacket', 'brown', 298, 0, 'suede luxe texture'],
  ['o012', 'Burgundy Wool Coat', 'Mango', 'Mango', 'outerwear', 'burgundy coat', 'burgundy', 149.99, 0, 'burgundy statement wool'],
  ['o014', 'Classic Trench Coat', 'London Fog', 'Nordstrom', 'outerwear', 'trench coat', 'tan', 180, 0, 'classic trench spring'],
  ['o015', 'Oversized Check Blazer', 'Frankie Shop', 'Frankie Shop', 'outerwear', 'oversized blazer', 'grey check', 265, 0, 'oversized sharp fashion-forward'],
  ['o016', 'Tailored Blazer', 'Theory', 'Theory', 'outerwear', 'blazer', 'black', 425, 0, 'tailored sharp polished'],
  ['o017', 'Puffer Jacket', 'Uniqlo', 'Uniqlo', 'outerwear', 'cropped puffer', 'cream', 79.9, 0, 'warm cropped everyday'],
  ['o018', 'Long Down Puffer', 'The North Face', 'REI', 'outerwear', 'down parka', 'black', 320, 0, 'warm outdoor winter'],
  ['o019', 'Quilted Jacket', 'Taion', 'Urban Outfitters', 'outerwear', 'quilted jacket', 'rust', 98, 0, 'utility quilted layered'],
  ['o021', 'Short Double-Breasted Coat', 'Banana Republic', 'Banana Republic', 'outerwear', 'wool coat', 'cream', 250, 0, 'classic polished winter'],
  ['o022', 'Belted Wrap Coat', 'Vince', 'Vince', 'outerwear', 'wrap coat', 'camel', 495, 0, 'luxe belted minimal'],
  ['o023', 'Teddy Coat', '& Other Stories', '& Other Stories', 'outerwear', 'teddy coat', 'cream', 219, 0, 'cozy relaxed winter'],
  ['o024', 'Track Jacket', 'Adidas', 'Adidas', 'outerwear', 'track jacket', 'blue', 75, 0, 'sporty retro heritage'],
  ['o025', 'Colour-Block Rain Shell', 'Columbia', 'Columbia', 'outerwear', 'windbreaker', 'navy orange', 90, 0, 'sporty lightweight retro'],
  ['o026', 'Half-Zip Running Jacket', 'Lululemon', 'Lululemon', 'outerwear', 'running jacket', 'teal', 148, 0, 'active technical sleek'],
  ['o030', 'Rust Bomber Jacket', 'Zara', 'Zara', 'outerwear', 'bomber jacket', 'rust', 79.9, 0, 'bomber sunset statement'],
  ['o031', 'Double-Breasted Wool Coat', 'COS', 'COS', 'outerwear', 'longline coat', 'grey', 350, 0, 'minimalist longline sharp'],
  ['o034', 'Corduroy-Collar Denim Jacket', 'Lee', 'Lee', 'outerwear', 'sherpa denim jacket', 'dark wash', 89, 0, 'western denim heritage'],
  ['o035', 'Hooded Raincoat', 'Rains', 'Rains', 'outerwear', 'raincoat', 'yellow', 125, 0, 'minimal waterproof scandi'],
  ['o036', 'Long Quilted Coat', 'L.L.Bean', 'L.L.Bean', 'outerwear', 'quilted coat', 'olive', 129, 0, 'quilted heritage layered'],
  ['o037', 'Pre-Owned Wool Coat', 'Max Mara', 'The RealReal', 'outerwear', 'wool coat', 'camel', 240, 890, 'classic luxe vintage', 1],
  ['o038', 'Vintage Suede Jacket', 'Coach', 'Vestiaire Collective', 'outerwear', 'suede jacket', 'chocolate', 165, 495, 'suede vintage luxe', 1],
  ['o039', 'Secondhand Barbour Wax Jacket', 'Barbour', 'Vestiaire Collective', 'outerwear', 'waxed jacket', 'olive', 175, 425, 'barn waxed heritage', 1],
  ['o040', 'Vintage Leather Blazer', 'Wilsons Leather', 'Depop', 'outerwear', 'leather blazer', 'oxblood', 88, 0, 'vintage burgundy edgy', 1],
  ['o041', 'Pre-Loved Trench', 'Burberry', 'The RealReal', 'outerwear', 'trench coat', 'honey', 495, 1900, 'iconic trench vintage', 1],
  ['o042', 'Vintage Track Jacket', 'Adidas', 'Depop', 'outerwear', 'track jacket', 'navy red', 45, 0, 'retro sporty vintage', 1],

  // ---- SHOES ----
  ['s001', 'Leather Chelsea Boots', 'Everlane', 'Everlane', 'shoes', 'chelsea boots', 'black', 218, 0, 'classic versatile boot'],
  ['s002', 'Minimalist Leather Sneakers', 'Common Projects', 'Nordstrom', 'shoes', 'leather sneakers', 'white', 425, 0, 'minimalist luxe versatile'],
  ['s003', 'Heeled Sandals', 'Sam Edelman', 'DSW', 'shoes', 'block heel sandals', 'nude', 89.95, 0, 'date elegant summer'],
  ['s004', 'Knit Running Shoes', 'Nike', 'Nike', 'shoes', 'running shoes', 'red', 130, 0, 'athleisure sport active'],
  ['s005', 'Suede Horsebit Loafers', 'Sezane', 'Sezane', 'shoes', 'suede loafers', 'tan', 245, 0, 'suede preppy classic'],
  ['s006', 'Horsebit Loafers', 'G.H. Bass', 'G.H. Bass', 'shoes', 'horsebit loafers', 'brown', 175, 0, 'preppy loafer classic'],
  ['s007', 'Suede Tassel Loafers', 'Madewell', 'Madewell', 'shoes', 'loafers', 'beige', 158, 0, 'preppy loafer polished'],
  ['s008', 'Chunky Lug Loafers', 'Dr. Martens', 'Dr. Martens', 'shoes', 'lug loafers', 'black', 130, 0, 'edgy chunky loafer'],
  ['s009', 'Retro Court Sneakers', 'Adidas', 'Adidas', 'shoes', 'retro sneakers', 'white red', 100, 0, 'retro sporty heritage trainer'],
  ['s011', 'Leather Trainers', 'Oliver Cabell', 'Oliver Cabell', 'shoes', 'leather trainers', 'white beige', 150, 0, 'minimal clean trainer'],
  ['s012', 'Canvas Low Tops', 'Converse', 'Converse', 'shoes', 'canvas sneakers', 'white', 65, 0, 'sporty classic retro'],
  ['s013', 'Leather Court Sneakers', 'Puma', 'Puma', 'shoes', 'court sneakers', 'white', 90, 0, 'sporty classic minimal'],
  ['s014', 'Knee-High Leather Boots', 'Vince Camuto', 'DSW', 'shoes', 'knee-high boots', 'black', 189, 0, 'polished boot fall'],
  ['s015', 'Suede Ankle Boots', 'Clarks', 'Clarks', 'shoes', 'suede ankle boots', 'tan', 140, 0, 'suede boot everyday'],
  ['s016', 'Western Boots', 'Tecovas', 'Tecovas', 'shoes', 'western boots', 'tan', 285, 0, 'western heritage statement'],
  ['s017', 'Lace-Up Leather Boots', 'Thursday Boot Co', 'Thursday Boot Co', 'shoes', 'lace-up boots', 'dark brown', 170, 0, 'heritage utility boot'],
  ['s018', 'Hiking Boots', 'Danner', 'Danner', 'shoes', 'hiking boots', 'tan', 440, 0, 'outdoor gorpcore utility'],
  ['s019', 'Pointed Slingback Flats', 'Zara', 'Zara', 'shoes', 'slingback flats', 'white', 55.9, 0, 'polished pointed minimal'],
  ['s020', 'Kitten Heel Slingbacks', 'Banana Republic', 'Banana Republic', 'shoes', 'kitten heels', 'plum', 140, 0, 'polished pointed evening'],
  ['s021', 'Strappy Heeled Sandals', 'Steve Madden', 'Steve Madden', 'shoes', 'heeled sandals', 'black', 99.95, 0, 'party strappy evening'],
  ['s022', 'Ballet Flats', 'Repetto', 'Nordstrom', 'shoes', 'ballet flats', 'black', 345, 0, 'french classic delicate'],
  ['s023', 'Pointed Suede Flats', 'Mango', 'Mango', 'shoes', 'suede flats', 'mustard', 69.99, 0, 'polished flat statement'],
  ['s024', 'Heeled Leather Mules', 'Everlane', 'Everlane', 'shoes', 'mules', 'tan', 155, 0, 'minimal slide polished'],
  ['s025', 'Cork Footbed Sandals', 'Birkenstock', 'Birkenstock', 'shoes', 'cork sandals', 'black', 110, 0, 'sustainable comfort casual'],
  ['s027', 'Leather Espadrilles', 'Castañer', 'Nordstrom', 'shoes', 'espadrilles', 'tan', 160, 0, 'summer vacation classic'],
  ['s028', 'Leather Cross-Strap Sandals', 'Ancient Greek Sandals', 'Ancient Greek Sandals', 'shoes', 'leather sandals', 'tan', 175, 0, 'vacation artisan minimal'],
  ['s030', 'Platform Clogs', 'Dansko', 'Dansko', 'shoes', 'clogs', 'burgundy', 135, 0, 'comfort heritage everyday'],
  ['s032', 'Mary Jane Flats', 'Sezane', 'Sezane', 'shoes', 'mary janes', 'red', 195, 0, 'french polished flat'],
  ['s033', 'Suede Riding Boots', 'Steve Madden', 'Steve Madden', 'shoes', 'suede boots', 'tan', 129.95, 0, 'suede boot classic'],
  ['s037', 'Pointed Leather Pumps', 'Massimo Dutti', 'Massimo Dutti', 'shoes', 'pumps', 'black', 149, 0, 'pointed polished classic'],
  ['s043', 'Perforated Leather Flats', 'Mango', 'Mango', 'shoes', 'leather flats', 'tan', 79.99, 0, 'artisan minimal vacation'],
  ['s045', 'Pre-Loved Leather Boots', 'Frye', 'ThredUp', 'shoes', 'leather boots', 'cognac', 65, 328, 'classic vintage boot', 1],
  ['s046', 'Vintage Suede Loafers', 'Gucci', 'The RealReal', 'shoes', 'suede loafers', 'chocolate', 295, 790, 'suede luxe vintage', 1],
  ['s047', 'Secondhand Retro Trainers', 'Nike', 'Depop', 'shoes', 'retro sneakers', 'red white', 55, 0, 'retro trainer vintage', 1],
  ['s048', 'Pre-Owned Ballet Flats', 'Chanel', 'Vestiaire Collective', 'shoes', 'ballet flats', 'beige black', 425, 950, 'iconic luxe vintage', 1],
  ['s049', 'Vintage Western Boots', 'Tony Lama', 'Poshmark', 'shoes', 'western boots', 'brown', 98, 0, 'western heritage vintage', 1],
  ['s050', 'Secondhand Combat Boots', 'Dr. Martens', 'Depop', 'shoes', 'combat boots', 'cherry red', 75, 170, 'edgy burgundy vintage', 1],

  // ---- ACCESSORIES & BAGS ----
  ['a001', 'Leather Tote Bag', 'Madewell', 'Madewell', 'accessories', 'leather tote', 'tan', 178, 0, 'classic everyday tote'],
  ['a002', 'Gold Layered Necklace', 'Mejuri', 'Mejuri', 'accessories', 'layered necklace', 'gold', 88, 0, 'minimalist everyday jewelry'],
  ['a003', 'Printed Silk Scarf', 'Sezane', 'Sezane', 'accessories', 'silk scarf', 'purple print', 65, 0, 'romantic classic french'],
  ['a004', 'Leather Crossbody Camera Bag', 'Cuyana', 'Cuyana', 'accessories', 'crossbody bag', 'black', 195, 0, 'minimalist structured work'],
  ['a005', 'Suede Tote', 'Massimo Dutti', 'Massimo Dutti', 'accessories', 'suede bag', 'tan', 129, 0, 'suede slouchy luxe'],
  ['a006', 'Suede Bucket Bag', 'Madewell', 'Madewell', 'accessories', 'suede bucket bag', 'rust', 168, 0, 'suede boho everyday'],
  ['a007', 'Burgundy Suede Barrel Bag', 'Polène', 'Polène', 'accessories', 'burgundy bag', 'burgundy', 390, 0, 'burgundy sculptural luxe'],
  ['a008', 'Red Suede Tote', 'Coach', 'Coach', 'accessories', 'shoulder bag', 'red', 295, 0, 'statement suede classic'],
  ['a009', 'Leather Satchel', 'Frye', 'Frye', 'accessories', 'satchel', 'tan', 298, 0, 'classic heritage everyday'],
  ['a011', 'Woven Basket Bag', 'Mango', 'Mango', 'accessories', 'raffia basket bag', 'natural', 59.99, 0, 'vacation woven summer'],
  ['a013', 'Knit Beanie', 'Quince', 'Quince', 'accessories', 'cashmere beanie', 'blue', 34.9, 0, 'cozy winter minimal'],
  ['a015', 'Baseball Cap', 'Uniqlo', 'Uniqlo', 'accessories', 'cap', 'white', 19.9, 0, 'sporty classic everyday'],
  ['a016', 'Leather Belt', 'Everlane', 'Everlane', 'accessories', 'leather belt', 'navy', 58, 0, 'classic staple minimal'],
  ['a018', 'Floral Silk Headscarf', 'Rouje', 'Rouje', 'accessories', 'silk headscarf', 'red floral', 45, 0, 'french romantic detail'],
  ['a019', 'Cat-Eye Sunglasses', 'Le Specs', 'Nordstrom', 'accessories', 'cat-eye sunglasses', 'tortoise', 79, 0, 'retro polished summer'],
  ['a020', 'Wayfarer Sunglasses', 'Ray-Ban', 'Ray-Ban', 'accessories', 'sunglasses', 'black', 163, 0, 'classic iconic everyday'],
  ['a021', 'Chunky Hoop Earrings', 'Mejuri', 'Mejuri', 'accessories', 'hoop earrings', 'gold', 78, 0, 'minimalist statement everyday'],
  ['a022', 'Pearl Drop Earrings', 'Kate Spade', 'Kate Spade', 'accessories', 'pearl earrings', 'pearl', 68, 0, 'polished feminine classic'],
  ['a025', 'Leather Strap Watch', 'Seiko', 'Seiko', 'accessories', 'leather watch', 'tan', 89, 0, 'heritage classic everyday'],
  ['a031', 'Braided Leather Belt', 'Madewell', 'Madewell', 'accessories', 'braided belt', 'brown', 49.5, 0, 'artisan casual staple'],
  ['a032', 'Leather Laptop Sleeve', 'Bellroy', 'Bellroy', 'accessories', 'laptop sleeve', 'tan', 129, 0, 'practical minimal work'],
  ['a033', 'Leather Weekender', 'Cuyana', 'Cuyana', 'accessories', 'weekender bag', 'tan', 398, 0, 'travel heritage durable'],
  ['a034', 'Leather Backpack', 'Madewell', 'Madewell', 'accessories', 'backpack', 'burgundy', 198, 0, 'burgundy classic everyday'],
  ['a035', 'Leather Clutch', 'Cult Gaia', 'Nordstrom', 'accessories', 'clutch', 'tan', 198, 0, 'minimal polished everyday'],
  ['a040', 'Silk Headscarf', 'Toteme', 'Toteme', 'accessories', 'silk headscarf', 'green', 140, 0, 'headscarf modest luxe'],
  ['a042', 'Browline Sunglasses', 'Ray-Ban', 'Ray-Ban', 'accessories', 'sunglasses', 'black', 140, 0, 'classic retro everyday'],
  ['a044', 'Vintage Silk Scarf', 'Hermès', 'The RealReal', 'accessories', 'silk scarf', 'equestrian print', 210, 495, 'iconic luxe vintage', 1],
  ['a045', 'Pre-Owned Leather Tote', 'Coach', 'ThredUp', 'accessories', 'leather tote', 'saddle', 85, 350, 'heritage vintage everyday', 1],
  ['a046', 'Secondhand Suede Bag', 'Gucci', 'Vestiaire Collective', 'accessories', 'suede bag', 'tan', 495, 1400, 'suede luxe vintage', 1],
  ['a047', 'Vintage Gold Chain', 'Monet', 'Etsy', 'accessories', 'chain necklace', 'gold', 48, 0, 'vintage costume statement', 1],
  ['a048', 'Pre-Loved Silk Tie Scarf', 'Ferragamo', 'Poshmark', 'accessories', 'silk scarf', 'navy print', 65, 220, 'luxe vintage detail', 1],
  ['a049', 'Vintage Beaded Bag', 'Unbranded Artisan', 'Etsy', 'accessories', 'beaded bag', 'pearl white', 55, 0, 'vintage evening artisan', 1],
  ['a050', 'Secondhand Burgundy Bag', 'Longchamp', 'Vestiaire Collective', 'accessories', 'burgundy bag', 'burgundy', 88, 195, 'burgundy classic vintage', 1],

  // Otra Eyewear — Awin merchant 96299 (joined 2026-09-01). Names, colours
  // and prices taken from otraeyewear.com/collections/all on 2026-09-01;
  // name format matches the site's own listings so the search link lands.
  ['a051', 'Stevie - Black', 'OTRA', 'Otra', 'accessories', 'sunglasses', 'black', 65, 0, 'retro everyday polished'],
  ['a052', 'Stevie - Tortoiseshell / Brown', 'OTRA', 'Otra', 'accessories', 'sunglasses', 'tortoise', 65, 0, 'retro classic summer'],
  ['a053', 'Presley - Tort/ Blue Fade', 'OTRA', 'Otra', 'accessories', 'sunglasses', 'tortoise blue', 70, 0, 'statement modern summer'],
  ['a054', 'Mae - Black/ Light Pink', 'OTRA', 'Otra', 'accessories', 'shield sunglasses', 'black pink', 70, 0, 'statement sport modern'],
  ['a055', 'Kent - Gold/ Brown', 'OTRA', 'Otra', 'accessories', 'sunglasses', 'gold brown', 75, 0, 'classic refined everyday'],
  ['a056', 'Onyx - Black/ Smoke', 'OTRA', 'Otra', 'accessories', 'sunglasses', 'black', 80, 0, 'sleek minimal modern'],

  // ---- 2026-09-16: FINISHING PIECES & LOCALE STAPLES ----
  // Added so every trend can be shown as a whole look (garment + shoes +
  // bag/belt/jewellery) and so the locale layer has real pieces for the
  // places it dresses: linen and kaftan cuts for North Africa and the Gulf,
  // kurtas and juttis for South Asia, print for West Africa, huaraches for
  // Latin America, modest longline layers for covered dress codes.
  ['t080', 'Embroidered Cotton Kurta', 'Fabindia', 'Fabindia', 'tops', 'cotton kurta', 'burgundy', 45, 0, 'handloom relaxed heat-dressing'],
  ['t082', 'Long-Sleeve Linen Tunic', 'Uniqlo', 'Uniqlo', 'tops', 'linen tunic', 'white', 39.9, 0, 'linen modest relaxed'],
  ['b059', 'Linen Wide-Leg Trousers', 'Zara', 'Zara', 'bottoms', 'linen wide-leg trousers', 'mint', 49.9, 0, 'linen wide-leg heat-dressing'],
  ['d032', 'Embroidered Kaftan', 'Anthropologie', 'Anthropologie', 'dresses', 'embroidered kaftan', 'cream', 168, 0, 'kaftan embroidered artisan'],
  ['d033', 'Longline Linen Shirt Dress', 'COS', 'COS', 'dresses', 'maxi shirt dress', 'cream', 135, 0, 'modest longline linen'],
  ['d034', 'Ankara Print Midi Dress', 'Ankara Republic', 'Etsy', 'dresses', 'ankara print dress', 'red print', 95, 0, 'print statement tailored'],
  ['o043', 'Belted Blazer', 'Mango', 'Mango', 'outerwear', 'blazer', 'white', 99.99, 0, 'tailored polished statement'],
  ['o044', 'Longline Open Duster', 'Zara', 'Zara', 'outerwear', 'longline duster', 'grey', 89.9, 0, 'modest longline flowing'],
  ['s051', 'Leather Babouche Slippers', 'Bohemia Design', 'Etsy', 'shoes', 'babouche slippers', 'multi', 65, 0, 'babouche artisan flat'],
  ['a057', 'Suede Belt', 'Everlane', 'Everlane', 'accessories', 'suede belt', 'olive', 68, 0, 'belt suede minimal'],
  ['a060', 'Slouchy East-West Shoulder Bag', 'Mango', 'Mango', 'accessories', 'east-west shoulder bag', 'black', 69.99, 0, 'slouchy shoulder bag everyday'],
  ['a061', 'Leather Crossbody Bag', 'Madewell', 'Madewell', 'accessories', 'crossbody bag', 'tan', 128, 0, 'crossbody classic everyday travel'],
  ['a064', 'Straw Sun Hat', 'Lack of Color', 'Lack of Color', 'accessories', 'straw hat', 'natural', 99, 0, 'straw hat summer relaxed vacation'],
  ['a065', 'Gold Twisted Hoop Earrings', 'Anthropologie', 'Anthropologie', 'accessories', 'hoop earrings', 'gold', 48, 0, 'gold statement jewelry'],
  ['a066', 'Structured Top-Handle Bag', 'Polène', 'Polène', 'accessories', 'top-handle bag', 'tan', 420, 0, 'structured polished bag'],
  ['a067', 'Slim Leather Belt', 'Madewell', 'Madewell', 'accessories', 'leather belt', 'tan', 45, 0, 'belt classic staple'],
  ['a068', 'Gold Chain Necklace Set', 'Mejuri', 'Mejuri', 'accessories', 'gold chain necklace', 'gold', 150, 0, 'gold jewellery statement'],

  // ---- MENSWEAR: TOPS ----
  ['mt001', 'Striped Oxford Shirt', 'J.Crew', 'J.Crew', 'tops', 'oxford shirt', 'blue stripe', 69.5, 0, 'classic preppy business'],
  ['mt002', 'Poplin Dress Shirt', 'Charles Tyrwhitt', 'Charles Tyrwhitt', 'tops', 'dress shirt', 'light blue', 79, 0, 'formal business crisp'],
  ['mt003', 'Heavyweight Pocket Tee', 'Carhartt', 'Carhartt', 'tops', 'pocket tee', 'moss', 24.99, 0, 'workwear durable casual'],
  ['mt004', 'Merino Crewneck Sweater', 'Quince', 'Quince', 'tops', 'merino sweater', 'light grey', 49.9, 0, 'minimalist classic knit'],
  ['mt005', 'Cable Knit Shawl Sweater', 'L.L.Bean', 'L.L.Bean', 'tops', 'cable knit sweater', 'camel', 89, 0, 'heritage cable knit'],
  ['mt006', 'Burgundy Crewneck Sweater', 'Uniqlo', 'Uniqlo', 'tops', 'burgundy sweater', 'burgundy', 39.9, 0, 'burgundy classic knit'],
  ['mt008', 'Striped Pique Polo', 'Lacoste', 'Lacoste', 'tops', 'polo', 'red navy stripe', 98, 0, 'preppy classic sporty'],
  ['mt010', 'Flannel Overshirt', 'Dickies', 'Dickies', 'tops', 'plaid flannel shirt', 'grey check', 45, 0, 'plaid heritage layered'],
  ['mt011', 'Linen Camp Collar Shirt', 'Todd Snyder', 'Todd Snyder', 'tops', 'linen shirt', 'sand', 128, 0, 'relaxed summer resort'],
  ['mt012', 'Navy Linen Shirt', "Levi's", "Levi's", 'tops', 'linen shirt', 'navy', 69.5, 0, 'linen relaxed casual'],
  ['mt013', 'Turtleneck Sweater', 'COS', 'COS', 'tops', 'turtleneck sweater', 'grey', 89, 0, 'minimalist sharp knit'],
  ['mt014', 'Knit Polo', 'Percival', 'Percival', 'tops', 'knit polo', 'tan', 115, 0, 'retro polished texture'],
  ['mt015', 'Striped Camp Collar Shirt', 'RRL', 'Ralph Lauren', 'tops', 'camp shirt', 'brown stripe', 245, 0, 'relaxed retro summer'],
  ['mt016', 'Linen Tee', 'Madewell', 'Madewell', 'tops', 'linen tee', 'navy', 55, 0, 'linen minimalist summer'],
  ['mt017', 'Striped Breton Tee', 'Armor Lux', 'Armor Lux', 'tops', 'breton shirt', 'black stripe', 75, 0, 'french classic nautical'],
  ['mt018', 'Pique Polo', 'Lululemon', 'Lululemon', 'tops', 'tech polo', 'black', 88, 0, 'minimalist polished classic'],
  ['mt020', 'Shawl Collar Cardigan', 'Wallace & Barnes', 'J.Crew', 'tops', 'shawl cardigan', 'navy', 148, 0, 'heritage cozy texture'],
  ['mt022', 'Vintage Rugby Shirt', 'Polo Ralph Lauren', 'Poshmark', 'tops', 'rugby shirt', 'navy gold stripe', 42, 125, 'preppy rugby vintage', 1],
  ['mt023', 'Pre-Owned Cashmere Sweater', 'Brunello Cucinelli', 'The RealReal', 'tops', 'cashmere sweater', 'dove gray', 225, 895, 'luxe minimal vintage', 1],
  ['mt024', 'Secondhand Flannel Shirt', 'Pendleton', 'ThredUp', 'tops', 'plaid flannel shirt', 'green plaid', 38, 109, 'plaid heritage vintage', 1],

  // ---- MENSWEAR: BOTTOMS ----
  ['mb001', 'Slim-Straight Selvedge Jeans', "Levi's", "Levi's", 'bottoms', 'selvedge jeans', 'indigo', 128, 0, 'denim classic slim-straight'],
  ['mb002', 'Relaxed Straight Jeans', 'Madewell', 'Madewell', 'bottoms', 'straight jeans', 'light wash', 98, 0, 'denim relaxed everyday'],
  ['mb003', 'Check Wide-Leg Trousers', 'COS', 'COS', 'bottoms', 'wide-leg trousers', 'brown check', 135, 0, 'wide-leg pleated tailored'],
  ['mb004', 'Wide-Leg Wool Trousers', 'Arket', 'Arket', 'bottoms', 'wide-leg trousers', 'beige', 149, 0, 'wide-leg tailored scandi'],
  ['mb005', 'Flat-Front Chinos', 'Bonobos', 'Bonobos', 'bottoms', 'chinos', 'khaki', 99, 0, 'classic chino smart-casual'],
  ['mb006', 'Garment-Dyed Chinos', 'Todd Snyder', 'Todd Snyder', 'bottoms', 'chinos', 'stone', 128, 0, 'relaxed chino heritage'],
  ['mb007', 'Wool Dress Trousers', 'Suitsupply', 'Suitsupply', 'bottoms', 'dress trousers', 'grey', 169, 0, 'formal tailored business'],
  ['mb008', 'Corduroy Pants', 'J.Crew', 'J.Crew', 'bottoms', 'corduroy pants', 'rust', 98, 0, 'heritage corduroy fall'],
  ['mb009', 'Cargo Utility Pants', 'Stan Ray', 'Stan Ray', 'bottoms', 'fatigue pants', 'khaki', 88, 0, 'utility streetwear military'],
  ['mb010', 'Linen Drawstring Trousers', 'Quince', 'Quince', 'bottoms', 'linen trousers', 'white', 44.9, 0, 'linen relaxed summer'],
  ['mb011', 'Tech Cropped Trousers', 'Lululemon', 'Lululemon', 'bottoms', 'cropped trousers', 'black', 128, 0, 'modern tapered minimal'],
  ['mb013', 'Tailored Suit Trousers', 'Zara', 'Zara', 'bottoms', 'suit trousers', 'teal blue', 69.9, 0, 'tailored sharp business'],
  ['mb014', 'Vintage 501 Jeans', "Levi's", 'Depop', 'bottoms', 'straight jeans', 'faded indigo', 48, 0, 'vintage denim straight', 1],
  ['mb015', 'Pre-Owned Wool Trousers', 'Ermenegildo Zegna', 'The RealReal', 'bottoms', 'wool trousers', 'grey', 95, 395, 'tailored luxe vintage', 1],
  ['mb016', 'Secondhand Cargo Pants', 'Carhartt', 'Depop', 'bottoms', 'cargo pants', 'duck brown', 45, 0, 'utility workwear vintage', 1],

  // ---- MENSWEAR: OUTERWEAR ----
  ['mo001', 'Check Cotton Blazer', 'Todd Snyder', 'Todd Snyder', 'outerwear', 'unstructured blazer', 'navy check', 398, 0, 'tailored unstructured smart'],
  ['mo002', 'Wool Topcoat', 'Suitsupply', 'Suitsupply', 'outerwear', 'wool topcoat', 'camel', 499, 0, 'classic tailored winter'],
  ['mo003', 'Suede Trucker Jacket', 'Flint and Tinder', 'Huckberry', 'outerwear', 'suede trucker jacket', 'tan', 228, 0, 'suede heritage casual'],
  ['mo004', 'Suede Bomber Jacket', 'Banana Republic', 'Banana Republic', 'outerwear', 'suede bomber', 'tan', 450, 0, 'suede bomber luxe'],
  ['mo005', 'Harrington Jacket', 'Baracuta', 'Baracuta', 'outerwear', 'harrington jacket', 'burgundy', 395, 0, 'heritage mod classic'],
  ['mo006', 'Denim Trucker Jacket', "Levi's", "Levi's", 'outerwear', 'denim trucker jacket', 'mid wash', 79, 0, 'denim classic casual'],
  ['mo007', 'Quilted Jacket', 'Barbour', 'Barbour', 'outerwear', 'quilted jacket', 'navy', 300, 0, 'quilted heritage layered'],
  ['mo008', 'Leather Cafe Racer Jacket', 'Schott', 'Schott', 'outerwear', 'leather jacket', 'black', 750, 0, 'moto leather edgy'],
  ['mo009', 'Burgundy Leather Jacket', 'Massimo Dutti', 'Massimo Dutti', 'outerwear', 'leather jacket', 'burgundy', 349, 0, 'burgundy leather statement'],
  ['mo010', 'Quilted Puffer Jacket', 'The North Face', 'REI', 'outerwear', 'puffer jacket', 'black', 350, 0, 'streetwear warm winter'],
  ['mo011', 'Double-Breasted Overcoat', 'Zara', 'Zara', 'outerwear', 'double-breasted coat', 'oatmeal', 169, 0, 'tailored sharp winter'],
  ['mo012', 'Pre-Owned Waxed Jacket', 'Barbour', 'Vestiaire Collective', 'outerwear', 'waxed jacket', 'olive', 165, 400, 'barn waxed vintage', 1],
  ['mo013', 'Vintage Suede Jacket', 'Polo Ralph Lauren', 'The RealReal', 'outerwear', 'suede jacket', 'chocolate', 245, 795, 'suede heritage vintage', 1],
  ['mo014', 'Secondhand Denim Jacket', 'Wrangler', 'ThredUp', 'outerwear', 'denim jacket', 'faded wash', 32, 89, 'denim vintage casual', 1],

  // ---- MENSWEAR: SHOES ----
  ['ms001', 'Horsebit Leather Loafers', 'G.H. Bass', 'G.H. Bass', 'shoes', 'horsebit loafers', 'brown', 185, 0, 'loafer preppy classic'],
  ['ms002', 'Penny Loafers', 'G.H. Bass', 'G.H. Bass', 'shoes', 'penny loafers', 'dark brown', 175, 0, 'loafer preppy classic'],
  ['ms003', 'Tan Cap-Toe Oxfords', 'Clarks', 'Clarks', 'shoes', 'oxford dress shoes', 'tan', 150, 0, 'classic formal business'],
  ['ms004', 'Leather Derby Shoes', 'Grant Stone', 'Grant Stone', 'shoes', 'derby shoes', 'brown', 340, 0, 'classic welted formal'],
  ['ms005', 'Cap-Toe Oxford Shoes', 'Allen Edmonds', 'Allen Edmonds', 'shoes', 'oxford dress shoes', 'black', 395, 0, 'formal business classic'],
  ['ms006', 'Leather Court Sneakers', 'Nike', 'Nike', 'shoes', 'leather sneakers', 'white', 115, 0, 'sporty classic clean'],
  ['ms008', 'Double Monk Strap Shoes', 'Clarks', 'Clarks', 'shoes', 'monk strap shoes', 'brown', 140, 0, 'classic formal polished'],
  ['ms009', 'Suede Chelsea Boots', 'Thursday Boot Co', 'Thursday Boot Co', 'shoes', 'chelsea boots', 'tan', 199, 0, 'suede boot smart-casual'],
  ['ms010', 'Leather Work Boots', 'Red Wing', 'Red Wing', 'shoes', 'work boots', 'brown', 330, 0, 'workwear heritage boot'],
  ['ms013', 'Suede Driving Loafers', 'Meermin', 'Meermin', 'shoes', 'driving loafers', 'tan', 220, 0, 'loafer suede polished'],
  ['ms014', 'Pre-Owned Derby Shoes', 'Church’s', 'The RealReal', 'shoes', 'derby shoes', 'black', 265, 890, 'formal welted vintage', 1],
  ['ms015', 'Vintage Chukka Boots', 'Clarks', 'Poshmark', 'shoes', 'suede chukka boots', 'sand', 58, 150, 'suede vintage casual', 1],
  ['ms016', 'Secondhand Penny Loafers', 'Alden', 'Vestiaire Collective', 'shoes', 'penny loafers', 'color 8 burgundy', 320, 720, 'loafer burgundy vintage', 1],

  // ---- MENSWEAR: ACCESSORIES ----
  ['ma001', 'Leather Dress Belt', 'Allen Edmonds', 'Allen Edmonds', 'accessories', 'leather belt', 'brown', 98, 0, 'formal classic staple'],
  ['ma003', 'Silk Tie', 'The Tie Bar', 'The Tie Bar', 'accessories', 'silk tie', 'navy', 35, 0, 'polished classic business'],
  ['ma005', 'Leather Briefcase', 'Satchel & Page', 'Satchel & Page', 'accessories', 'leather briefcase', 'dark brown', 385, 0, 'work heritage leather'],
  ['ma008', 'Knit Wool Scarf', 'Johnstons of Elgin', 'Johnstons of Elgin', 'accessories', 'wool scarf', 'grey', 95, 0, 'classic cozy winter'],
  ['ma009', 'Vintage Silk Tie', 'Hermès', 'The RealReal', 'accessories', 'silk tie', 'navy print', 85, 240, 'luxe polished vintage', 1],
  ['ma010', 'Pre-Owned Leather Duffle', 'Coach', 'ThredUp', 'accessories', 'leather duffle', 'saddle', 145, 495, 'travel heritage vintage', 1],
  // ---- 2026-09-16: MENSWEAR FINISHING PIECES & LOCALE STAPLES ----
  ['mt025', 'Cotton Kurta', 'Fabindia', 'Fabindia', 'tops', 'cotton kurta', 'mint', 39, 0, 'handloom relaxed heat-dressing'],
  ['mt027', 'Band-Collar Linen Shirt', 'Quince', 'Quince', 'tops', 'linen shirt', 'white', 39.9, 0, 'linen minimalist heat-dressing'],
  ['mo015', 'Corduroy Blazer', 'Todd Snyder', 'Todd Snyder', 'outerwear', 'corduroy blazer', 'brown', 348, 0, 'heritage tailored texture'],
  ['ma013', 'Tortoise Sunglasses', 'Ray-Ban', 'Ray-Ban', 'accessories', 'round sunglasses', 'tortoise', 171, 0, 'classic retro everyday'],
  // ---- 2026-11-10: MENSWEAR DEPTH - romantic, bohemian, edgy, sporty ----
  // Each row below was written FROM its photo (see VERIFIED_PHOTOS): found on
  // Unsplash, viewed, then named and coloured to match. A brand Amazon stocks
  // is named only where the photo shows that brand's own mark.
  ['mt030', 'Floral Print Shirt', 'Ted Baker', 'Ted Baker', 'tops', 'floral shirt', 'white floral', 135, 0, 'romantic floral statement'],
  ['mt031', 'Floral Camp Collar Shirt', 'Bonobos', 'Bonobos', 'tops', 'camp shirt', 'navy floral', 89, 0, 'floral resort relaxed'],
  ['mt032', 'Floral Print Polo', 'Scotch & Soda', 'Scotch & Soda', 'tops', 'polo', 'black floral', 95, 0, 'floral retro resort'],
  ['mt033', 'Ditsy Floral Shirt', 'Reiss', 'Reiss', 'tops', 'floral shirt', 'plum', 148, 0, 'romantic floral delicate'],
  ['mt034', 'Satin Shirt', 'Zara', 'Zara', 'tops', 'satin shirt', 'black', 59.9, 0, 'romantic satin evening'],
  ['mt035', 'Lace-Panel Pintuck Shirt', 'Sandro', 'Sandro', 'tops', 'lace shirt', 'white', 195, 0, 'romantic lace delicate'],
  ['mt036', 'Flowing Silk Shirt', 'Sandro', 'Sandro', 'tops', 'silk shirt', 'ivory', 245, 0, 'romantic flowing silk'],
  ['mt037', 'Lace Knit Shirt', 'AllSaints', 'AllSaints', 'tops', 'lace shirt', 'white', 139, 0, 'romantic lace statement'],
  ['mt038', 'Printed Satin Shirt', 'Mango', 'Mango', 'tops', 'satin shirt', 'cream print', 79.9, 0, 'satin flowing eclectic'],
  ['mt039', 'Lace Camp Collar Shirt', 'COS', 'COS', 'tops', 'lace shirt', 'white', 115, 0, 'lace statement fashion-forward'],
  ['mt040', 'Pink Dress Shirt', 'Brooks Brothers', 'Brooks Brothers', 'tops', 'dress shirt', 'pink', 98, 0, 'elegant crisp business'],
  ['mt041', 'Botanical Print Camp Shirt', 'Abercrombie & Fitch', 'Abercrombie & Fitch', 'tops', 'camp shirt', 'cream floral', 70, 0, 'floral resort relaxed'],
  ['mt042', 'Hawaiian Floral Shirt', 'Reyn Spooner', 'Reyn Spooner', 'tops', 'hawaiian shirt', 'red', 118, 0, 'floral bold resort'],
  ['mo020', 'Velvet Blazer', 'Reiss', 'Reiss', 'outerwear', 'velvet blazer', 'navy', 398, 0, 'romantic elegant velvet'],
  ['mo021', 'Velvet Dinner Jacket', 'Suitsupply', 'Suitsupply', 'outerwear', 'velvet blazer', 'forest green', 499, 0, 'elegant luxe formal'],
  ['mo022', 'Floral Jacquard Dinner Jacket', 'Paisley & Gray', 'Nordstrom', 'outerwear', 'jacquard blazer', 'burgundy', 185, 0, 'romantic floral elegant'],
  ['mt043', 'Embroidered Linen Shirt', 'Kardo', 'Kardo', 'tops', 'embroidered shirt', 'black', 195, 0, 'bohemian embroidered folk'],
  ['mt044', 'Embroidered Folk Shirt', 'Etnodim', 'Etnodim', 'tops', 'embroidered shirt', 'natural green', 120, 0, 'folk embroidered artisan'],
  ['mt045', 'Embroidered Camp Shirt', 'Bode', 'Bode', 'tops', 'camp shirt', 'white', 420, 0, 'embroidered artisan resort'],
  ['mt046', 'Embroidered Kurta', 'Fabindia', 'Fabindia', 'tops', 'embroidered kurta', 'dark green gold', 65, 0, 'embroidered artisan festive'],
  ['mt047', 'Crochet Granny-Square Shirt', 'Story Mfg', 'Story Mfg', 'tops', 'crochet shirt', 'white multi', 320, 0, 'bohemian crochet artisan'],
  ['mt048', 'Crochet Knit Camp Shirt', 'Percival', 'Percival', 'tops', 'crochet shirt', 'cream', 129, 0, 'crochet artisan summer'],
  ['mt049', 'Open-Knit Mesh Shirt', 'Nanushka', 'Nanushka', 'tops', 'open-knit shirt', 'brown', 295, 0, 'seventies artisan statement'],
  ['mt050', 'Abstract Print Shirt', 'Tombolo', 'Tombolo', 'tops', 'printed shirt', 'blue', 128, 0, 'eclectic resort relaxed'],
  ['mt051', 'Tie-Dye Satin Shirt', 'Scotch & Soda', 'Scotch & Soda', 'tops', 'satin shirt', 'red', 110, 0, 'eclectic satin statement'],
  ['mt052', 'Vintage Print Silk Shirt', 'Casablanca', 'Casablanca', 'tops', 'silk shirt', 'gold', 690, 0, 'seventies eclectic silk'],
  ['mt053', 'Scenic Aloha Shirt', 'Sun Surf', 'Sun Surf', 'tops', 'hawaiian shirt', 'cream', 180, 0, 'retro resort eclectic'],
  ['mo023', 'Floral Print Overshirt', 'Corridor', 'Corridor', 'outerwear', 'overshirt', 'tan floral', 245, 0, 'bohemian floral layered'],
  ['ms020', 'Leather Toe-Loop Sandals', 'Kyma', 'Kyma', 'shoes', 'leather sandals', 'black brown', 95, 0, 'artisan leather summer'],
  ['a070', 'Beaded Woven Bracelet', 'Etsy', 'Etsy', 'accessories', 'beaded bracelet', 'multi', 24, 0, 'bohemian artisan folk'],
  ['mo024', 'Leather Biker Jacket', 'AllSaints', 'AllSaints', 'outerwear', 'biker jacket', 'black', 499, 0, 'moto edgy leather'],
  ['mb020', 'Ripped Knee Jeans', 'Topman', 'Topman', 'bottoms', 'ripped jeans', 'black', 60, 0, 'grunge streetwear denim'],
  ['mb021', 'Distressed Slim Jeans', 'Diesel', 'Diesel', 'bottoms', 'distressed jeans', 'dark indigo', 195, 0, 'grunge streetwear slim'],
  ['mb022', 'Ripped Baggy Jeans', 'Jaded London', 'Jaded London', 'bottoms', 'ripped jeans', 'light blue', 95, 0, 'grunge baggy streetwear'],
  ['ms023', 'Leather Combat Boots', 'Dr. Martens', 'Dr. Martens', 'shoes', 'combat boots', 'black', 170, 0, 'grunge edgy utility'],
  ['ms024', 'Canvas High-Top Skate Shoes', 'Vans', 'Vans', 'shoes', 'high-top sneakers', 'black white', 75, 0, 'streetwear skate classic'],
  ['mt054', 'Photo Print Tee', 'AllSaints', 'AllSaints', 'tops', 'graphic tee', 'black', 55, 0, 'streetwear graphic edgy'],
  ['ma020', 'Gold Figaro Chain', 'Miansai', 'Miansai', 'accessories', 'chain necklace', 'gold', 165, 0, 'statement streetwear jewellery'],
  ['mo026', 'Camo Windbreaker', 'AAPE', 'AAPE', 'outerwear', 'windbreaker', 'grey camo', 189, 0, 'streetwear technical statement'],
  ['s052', 'Studded Platform Boots', 'Demonia', 'Demonia', 'shoes', 'platform boots', 'black', 150, 0, 'punk statement platform'],
  ['mt055', 'Washed Oversized Tee', 'Represent', 'Represent', 'tops', 'oversized tee', 'washed black', 70, 0, 'streetwear oversized grunge'],
  ['mb023', 'Running Shorts', 'Ten Thousand', 'Ten Thousand', 'bottoms', 'running shorts', 'grey', 68, 0, 'performance active sport'],
  ['mt057', 'Performance Running Tee', 'Rhone', 'Rhone', 'tops', 'running tee', 'blue', 68, 0, 'performance active technical'],
  ['mt058', 'Running Singlet', 'Tracksmith', 'Tracksmith', 'tops', 'running singlet', 'neon yellow', 65, 0, 'performance athletic active'],
  ['mt059', 'Fleece Quarter-Zip', 'Patagonia', 'Patagonia', 'tops', 'fleece pullover', 'olive', 139, 0, 'outdoor gorpcore cozy'],
  ['mt060', 'Fleece Snap Pullover', 'Patagonia', 'REI', 'tops', 'fleece pullover', 'teal', 139, 0, 'outdoor gorpcore retro'],
  ['mt061', 'Performance Quarter-Zip', 'Vuori', 'Vuori', 'tops', 'quarter-zip', 'blue', 98, 0, 'performance active technical'],
  ['mo027', 'Full-Zip Fleece Jacket', 'L.L.Bean', 'L.L.Bean', 'outerwear', 'fleece jacket', 'red', 60, 0, 'outdoor gorpcore casual'],
  ['mo028', 'Colour-Block Anorak', 'Stan Ray', 'Stan Ray', 'outerwear', 'anorak', 'black navy', 150, 0, 'sporty outdoor retro'],
  ['mo029', 'Packable Windbreaker', 'Columbia', 'Columbia', 'outerwear', 'windbreaker', 'teal navy', 80, 0, 'sporty active lightweight'],
  ['mb024', 'Fleece Joggers', 'Puma', 'Puma', 'bottoms', 'joggers', 'tan', 55, 0, 'athleisure sporty cozy'],
  ['mt062', 'Zip Hoodie', 'Reigning Champ', 'Reigning Champ', 'tops', 'zip hoodie', 'grey', 165, 0, 'athleisure active sporty'],
  ['ms025', 'Cushioned Running Shoes', 'Hoka', 'Hoka', 'shoes', 'running shoes', 'white', 155, 0, 'performance athletic active'],
  ['s053', 'Retro Running Sneakers', 'ASICS', 'ASICS', 'shoes', 'running sneakers', 'silver', 150, 0, 'sporty retro streetwear'],
  ['s054', 'Training Shoes', 'Nike', 'Nike', 'shoes', 'training shoes', 'volt green', 120, 0, 'performance gym athletic'],
  ['s055', 'Air Cushion Sneakers', 'Nike', 'Nike', 'shoes', 'retro sneakers', 'white green', 150, 0, 'sporty retro streetwear'],
  ['mo030', 'Track Jacket', 'Fila', 'Fila', 'outerwear', 'track jacket', 'red', 80, 0, 'sporty retro athleisure'],
  ['mo031', 'Down Puffer Jacket', 'Patagonia', 'Patagonia', 'outerwear', 'puffer jacket', 'olive', 279, 0, 'outdoor warm winter'],
  ['mt063', 'Half-Zip Sweatshirt', 'COS', 'COS', 'tops', 'half-zip sweatshirt', 'white', 99, 0, 'minimal clean modern'],
  ['mt064', 'Knit Quarter-Zip Sweater', 'Reiss', 'Reiss', 'tops', 'quarter-zip sweater', 'taupe', 158, 0, 'smart-casual classic knit'],
  ['mt065', 'Relaxed Viscose Shirt', 'COS', 'COS', 'tops', 'viscose shirt', 'black', 89, 0, 'minimal sleek relaxed'],
  ['mo032', 'Canvas Chore Jacket', 'Universal Works', 'Universal Works', 'outerwear', 'chore jacket', 'tan', 120, 0, 'workwear heritage classic'],
  ['mo033', 'Sherpa Collar Bomber', 'J.Crew', 'J.Crew', 'outerwear', 'bomber jacket', 'navy', 128, 0, 'classic casual winter'],
  ['ma021', 'Merino Beanie', 'Arket', 'Arket', 'accessories', 'beanie', 'charcoal', 35, 0, 'minimal cozy winter'],
  ['mt067', 'Tipped Pique Polo', 'Blook', 'Blook', 'tops', 'polo', 'white blue', 105, 0, 'preppy sporty classic'],
  ['ms026', 'Leather Brogues', 'Loake', 'Loake', 'shoes', 'brogues', 'brown', 150, 0, 'classic heritage formal'],
  ['mo034', 'Herringbone Overcoat', 'Suitsupply', 'Suitsupply', 'outerwear', 'overcoat', 'brown herringbone', 599, 0, 'heritage tailored winter'],
  ['o045', 'Suede Fringe Jacket', 'Free People', 'Free People', 'outerwear', 'fringe jacket', 'tan', 298, 0, 'bohemian fringe seventies'],
];

/**
 * Exact per-item data for partnered merchants, keyed by row id. Unlike the
 * rest of the catalogue (representative photos + verified search links),
 * a partnered merchant's own product pages and CDN photography are real,
 * stable, and individually verified - so their cards show the actual item
 * and click straight through to its product page (which the Awin deeplink
 * layer wraps for commission). Every image below was downloaded and VIEWED,
 * every URL fetched, on 2026-09-01.
 */
const EXACT_ITEMS: Record<string, { imageUrl: string; sourceUrl: string }> = {
  a051: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0515/3557/7245/files/stevie_black_front.jpg?width=600',
    sourceUrl: 'https://www.otraeyewear.com/products/stevie-blacksmoke',
  },
  a052: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0515/3557/7245/files/25NovOtraProduct32.jpg?width=600',
    sourceUrl: 'https://www.otraeyewear.com/products/stevie-tort-brown',
  },
  a053: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0515/3557/7245/files/PresleyTortBlueFront.jpg?width=600',
    sourceUrl: 'https://www.otraeyewear.com/products/presley-tort-blue-fade',
  },
  a054: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0515/3557/7245/files/MaeBlackfront.jpg?width=600',
    sourceUrl: 'https://www.otraeyewear.com/products/mae-black-light-pink',
  },
  a055: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0515/3557/7245/files/KentGoldFront.jpg?width=600',
    sourceUrl: 'https://www.otraeyewear.com/products/kent-gold-brown',
  },
  a056: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0515/3557/7245/files/ONYX-1-WEB.jpg?width=600',
    sourceUrl: 'https://www.otraeyewear.com/products/onyx-black-smoke',
  },
  t071: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0765/7514/6305/files/Sports_Bras_for_Women_High_Support_Ribbed_Strappy_Running_Sports_Bra_Black_1.jpg?v=1747807849&width=600',
    sourceUrl: 'https://wanayou.com/products/sports-bras-for-women-high-support-ribbed-strappy-running-sports-bra-black',
  },
  t072: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0765/7514/6305/files/Cross_Back_Sports_Bra_White_1.jpg?v=1764317651&width=600',
    sourceUrl: 'https://wanayou.com/products/cross-back-sports-bra-1',
  },
  t073: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0765/7514/6305/files/Zip_Front_Racerback_Post_Surgery_Wireless_Sports_Bra.jpg?v=1785462645&width=600',
    sourceUrl: 'https://wanayou.com/products/adjustable-strap-front-zip-sports-bra',
  },
  t074: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0765/7514/6305/files/Seamless_Crisscross_Sports_Bra.jpg?v=1781261225&width=600',
    sourceUrl: 'https://wanayou.com/products/medium-support-workout-bras-3',
  },
  t075: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0765/7514/6305/files/Color_Block_Halter_Tank_Top_with_Built-in_Bra.jpg?v=1786764570&width=600',
    sourceUrl: 'https://wanayou.com/products/halter-tank-tops-with-built-in-bra',
  },
  t076: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0765/7514/6305/files/Halter_Crop_Tank_Tops.jpg?v=1786766025&width=600',
    sourceUrl: 'https://wanayou.com/products/halter-tank-tops-with-built-in-bra-3',
  },
  t077: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0765/7514/6305/files/Women_s_Shirt_Long_Sleeve_Dry_Fit_Workout_Tops_Black_4.jpg?v=1764934096&width=600',
    sourceUrl: 'https://wanayou.com/products/womens-shirt-long-sleeve-dry-fit-workout-tops-black',
  },
  t078: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0765/7514/6305/files/Seamless_Workout_Shirts_for_Women_Long_Sleeve_Black_1.jpg?v=1764752754&width=600',
    sourceUrl: 'https://wanayou.com/products/seamless-workout-shirts-for-women-long-sleeve-black',
  },
  t079: {
    imageUrl: 'https://cdn.shopify.com/s/files/1/0765/7514/6305/files/long_sleeve_athletic_shirts_for_women.jpg?v=1777448536&width=600',
    sourceUrl: 'https://wanayou.com/products/seamless-workout-shirts-for-women-long-sleeve-light-blue',
  },
};

/**
 * Rows without the 'm' prefix whose verified photo is a man wearing the
 * piece - a card must never show a male model in a womenswear rack.
 */
const MENS_IDS = new Set(['b026', 'b042', 'a032', 'b041', 'o005', 't011']);

/** Department by id convention: 'm'-prefixed rows (and MENS_IDS) are menswear, UNISEX_IDS pass every focus, everything else is womenswear. */
function departmentOf(id: string): 'women' | 'men' | 'unisex' {
  if (id.startsWith('m') || MENS_IDS.has(id)) return 'men';
  return UNISEX_IDS.has(id) ? 'unisex' : 'women';
}

/**
 * How a stock photo is requested. `auto=format` lets the image host send
 * AVIF or WebP to anything that accepts it (it falls back to JPEG otherwise)
 * and `q=70` is visually identical at card size: the same 600px picture in
 * roughly a third of the bytes (68 KB -> 24 KB measured), on every grid and
 * rail in the app.
 */
const STOCK_PHOTO_PARAMS = 'w=600&q=70&auto=format';

function build(row: Row): Product {
  const [id, name, brand, retailer, category, subcategory, color, price, originalPrice, styleTags, secondhand] = row;
  const department = departmentOf(id);
  return {
    id: `p-${id}`,
    name,
    brand,
    retailer,
    category,
    subcategory: subcategory || undefined,
    price,
    // "Was" prices are kept only for partnered merchants whose own pages
    // supplied them. The hand-authored originals elsewhere rendered as real
    // strike-throughs and -29% badges, then sent the shopper to an Amazon
    // search where no such discount exists.
    originalPrice: EXACT_ITEMS[id] ? originalPrice || undefined : undefined,
    currency: 'USD',
    imageUrl: EXACT_ITEMS[id]?.imageUrl ?? `https://images.unsplash.com/photo-${VERIFIED_PHOTOS[id]}?${STOCK_PHOTO_PARAMS}`,
    color,
    sizeRange: department === 'men' ? MENS_SIZE_RANGES[category] : SIZE_RANGES[category],
    styleTags: styleTags.split(' '),
    sourceUrl: EXACT_ITEMS[id]?.sourceUrl ?? link(retailer, brand, name),
    inStock: true,
    department,
    ...(secondhand ? { condition: 'secondhand' as const } : {}),
  };
}

/**
 * Rows flagged secondhand are hand-written resale "listings" ($85, was $320 at
 * The RealReal) that correspond to no real item, and under the Amazon
 * provider their Shop button opened a search for NEW goods. They are left in
 * ROWS for the day a live resale feed replaces them, but never reach the app;
 * real secondhand inventory comes from the eBay adapter when it is live.
 */
export const MOCK_CATALOG: Product[] = ROWS.filter(
  // Shown only with a picture that was checked against it (see VERIFIED_PHOTOS).
  row => !row[10] && (!!EXACT_ITEMS[row[0]] || !!VERIFIED_PHOTOS[row[0]])
).map(build);

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

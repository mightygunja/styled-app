/**
 * The colour of a live product, taken from the description of the photo the
 * card shows.
 *
 * A live feed gives no colour field the app can trust. Channel3 does measure
 * a product's colours, but on real answers (2026-11-13) the measurement
 * sometimes belonged to another colourway than the photo: red was measured
 * on trousers pictured in royal blue. What it also gives is a description of
 * every photo ("Woman wearing royal blue trousers with a yellow top"), and
 * that describes exactly what the shopper is looking at.
 *
 * So the colour is read from that description, in the plain colour words the
 * catalogue and the palettes already use, and only when it is clear which
 * colour is the product's:
 *
 *   - a colour that sits right before one of the product's own words
 *     ("royal blue TROUSERS" for a product called "... Trousers") is the
 *     product's colour;
 *   - failing that, a description that names a single colour names the
 *     product's colour;
 *   - anything else - two colours and no telling which, or none - gets no
 *     colour at all.
 *
 * No colour is always better than a wrong one: the word is quoted back to
 * the shopper as a reason ("Navy sits in your palette").
 *
 * Pure - no Firebase, no React Native.
 */

/** What a description may say -> the catalogue's word for it. Longest phrases first. */
const COLOR_WORDS: Array<[RegExp, string]> = [
  [/\b(?:dark|deep|chocolate) brown\b/, 'dark brown'],
  [/\b(?:dark|deep|forest|hunter|bottle) green\b/, 'forest green'],
  [/\b(?:light|pale|sky|baby|powder|ice) blue\b/, 'light blue'],
  [/\b(?:light|pale|baby|dusty|soft) pink\b/, 'blush'],
  [/\b(?:dark|midnight|deep) (?:navy|blue)\b/, 'navy'],
  [/\b(?:royal|cobalt|bright|electric|mid|medium) blue\b/, 'blue'],
  [/\b(?:off[- ]white|bright white)\b/, 'white'],
  [/\b(?:light|pale|heather|dark) gr[ae]y\b/, 'grey'],
  [/\bnavy\b/, 'navy'],
  [/\bblack\b/, 'black'],
  [/\bcharcoal\b/, 'charcoal'],
  [/\bgr[ae]y\b/, 'grey'],
  [/\bwhite\b/, 'white'],
  [/\bivory\b/, 'ivory'],
  [/\b(?:cream|ecru)\b/, 'cream'],
  [/\b(?:beige|sand|taupe|nude|stone|oatmeal)\b/, 'beige'],
  [/\bkhaki\b/, 'khaki'],
  [/\btan\b/, 'tan'],
  [/\bcamel\b/, 'camel'],
  [/\b(?:rust|terracotta)\b/, 'rust'],
  [/\b(?:brown|chocolate|cognac|chestnut|tobacco|espresso|mocha)\b/, 'brown'],
  [/\b(?:teal|turquoise)\b/, 'teal'],
  [/\bolive\b/, 'olive'],
  [/\b(?:sage|mint)\b/, 'sage'],
  [/\bgreen\b/, 'green'],
  [/\b(?:blue|indigo|cobalt)\b/, 'blue'],
  [/\bmustard\b/, 'mustard'],
  [/\byellow\b/, 'yellow'],
  [/\bcoral\b/, 'coral'],
  [/\borange\b/, 'orange'],
  [/\b(?:burgundy|maroon|wine|oxblood|bordeaux)\b/, 'burgundy'],
  [/\bred\b/, 'red'],
  [/\bblush\b/, 'blush'],
  [/\b(?:pink|magenta|fuchsia)\b/, 'pink'],
  [/\b(?:lilac|lavender)\b/, 'lilac'],
  [/\b(?:purple|violet|plum)\b/, 'purple'],
  // Gold and silver are left out on purpose: "metallic" pieces were described
  // as silver whatever colour they were (a sage-green dress, on real answers).
];

/** What a colour describes when it is not the product: "on a white background". */
const SCENERY = /^\s*(?:studio\s+)?(?:background|backdrop|surface|wall|floor|ground|setting|table|sand|sky)\b/;

/** Two colours joined into one description of the same thing: "black and white jacket". */
const JOINED = /^\s*(?:and|&|,|\/|-|with)\s*$/;

/** Words that say the piece is not one colour. */
const NOT_ONE_COLOR =
  /\b(?:multi(?:colou?r(?:ed)?)?|floral|striped?|stripes|plaid|checked|checkered|gingham|printed?|patterned|pattern|camo(?:uflage)?|colou?r[- ]?block(?:ed)?|two[- ]tone|tie[- ]dye|leopard|animal|paisley|polka|tropical|hawaiian|graphic|abstract|geometric|argyle|houndstooth|herringbone|tweed|marled|ombre)\b/;

interface Found {
  name: string;
  start: number;
  /** Where the colour phrase ends in the description. */
  end: number;
}

/** Every colour named in a description, left to right, each stretch of text counted once. */
function colorsIn(description: string): Found[] {
  const found: Found[] = [];
  for (const [pattern, name] of COLOR_WORDS) {
    const search = new RegExp(pattern.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = search.exec(description))) {
      const start = match.index;
      const end = start + match[0].length;
      // "dark brown" has already claimed this stretch; plain "brown" must not claim it again.
      if (found.some(f => start < f.end && end > f.start)) continue;
      found.push({ name, start, end });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

const singular = (word: string) => word.replace(/(?:es|s)$/, '');

/** Things a photo can show besides the product (singular, as `singular` leaves them). */
const OTHER_THINGS = new Set(
  (
    'shirt tee top blouse sweater jumper cardigan hoodie sweatshirt polo tank vest jacket coat blazer suit ' +
    'pant trouser jean short skirt dress legging chino jogger ' +
    'shoe sneaker boot loafer sandal heel flat trainer sock ' +
    'bag backpack tote purse hat cap beanie scarf belt glove tie sunglass glass watch outfit'
  ).split(' ')
);

/**
 * The product's colour as its photo description states it, or null.
 * `productWords` is what the product is called and where it is filed
 * ("Seamed Slash Pocket Trousers", "Trousers"): the words that tell the
 * product apart from whatever else is in the picture.
 */
export function colorFromDescription(description: string | null | undefined, productWords: string): string | null {
  const text = String(description || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!text) return null;
  // A colour that describes the backdrop is not a colour of anything worn.
  const found = colorsIn(text).filter(f => !SCENERY.test(text.slice(f.end)));
  if (found.length === 0) return null;
  // "Black and white jacket": two colours for one thing, so no single colour.
  for (let i = 0; i + 1 < found.length; i++) {
    if (found[i].name !== found[i + 1].name && JOINED.test(text.slice(found[i].end, found[i + 1].start))) return null;
  }

  const own = new Set(
    String(productWords || '')
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(word => word.length > 2)
      .map(singular)
  );
  // The colour that sits right before one of the product's own words:
  // "royal blue trousers", "white linen shirt", "black leather ankle boots".
  const beside = found.filter(f => {
    const after = text.slice(f.end).trimStart();
    // Stop at the next clause: "blue trousers WITH a yellow top".
    const phrase = after.split(/\b(?:with|and|on|in|against|from|paired|worn|featuring|showing)\b|[,.;]/)[0];
    const words = phrase.split(/[^a-z]+/).filter(Boolean).slice(0, 4).map(singular);
    return words.some(word => own.has(word));
  });
  const names = (list: Found[]) => Array.from(new Set(list.map(f => f.name)));
  // "...a printed shirt and KHAKI SHORTS": the one colour named belongs to
  // something else in the picture, so it is not this product's.
  const elsewhere = (f: Found) => {
    const phrase = text.slice(f.end).trimStart().split(/[,.;]/)[0];
    const words = phrase.split(/[^a-z]+/).filter(Boolean).slice(0, 3).map(singular);
    return words.some(word => OTHER_THINGS.has(word) && !own.has(word));
  };

  let name: string | null = null;
  if (names(beside).length === 1) name = beside[0].name;
  else if (beside.length === 0 && names(found).length === 1 && !found.some(elsewhere)) name = found[0].name;
  if (!name) return null;

  // "Navy floral dress": a patterned piece is not simply navy.
  if (NOT_ONE_COLOR.test(text)) return null;
  return name;
}

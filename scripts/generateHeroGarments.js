/**
 * Generates the four garment photographs for the login hero cards.
 *
 * Each card in LoginHero pairs a fabric name with an article of clothing
 * (LINEN shirt, TWILL trousers, RIB KNIT sweater, HERRINGBONE blazer). The
 * cards used to show only the woven texture; these images show the garment
 * itself, cut from that cloth, photographed in the design system's own
 * palette. Backgrounds are pinned to each card's ground colour so the text
 * overlays (ink on the light cards, bone on the dark ones) keep contrast.
 *
 * Uses gpt-image-1 with the key from functions/.runtimeconfig.json (local,
 * gitignored). The key is read, never logged.
 *
 * Usage: node scripts/generateHeroGarments.js [onlyName]
 */

const fs = require('fs');
const path = require('path');

const config = require(path.join(__dirname, '../functions/.runtimeconfig.json'));
const KEY = config.openai && config.openai.key;
if (!KEY) {
  console.error('No OpenAI key in functions/.runtimeconfig.json');
  process.exit(1);
}

const OUT_DIR = path.join(__dirname, '../assets/garments');

const STYLE = `Quiet-luxury editorial still-life photograph for a fashion app. Warm natural window light from the left, soft gentle shadow, subtle medium-format film grain, shallow depth of field. Palette strictly warm heritage neutrals: bone white, warm sand, camel, tobacco brown, deep ink charcoal. Vertical composition, the single garment centred and occupying about two thirds of the frame, calm negative space above and below it. No people, no hands, no text, no labels, no logos, no props other than described.`;

const GARMENTS = [
  {
    name: 'shirt',
    prompt: `A relaxed cream-sand linen button-up shirt with a soft collar, hanging on a slender natural-wood hanger, photographed straight on against a plain warm sand (#F2EBE3) studio background. The linen's slubbed weave is clearly visible up close; sleeves fall naturally with gentle creases only linen makes. ${STYLE}`,
  },
  {
    name: 'trousers',
    prompt: `A pair of tailored camel cotton-twill trousers with a pressed front crease, folded once over the bar of a slender natural-wood hanger so the legs hang straight down, photographed against a plain warm camel-beige (#C9AB7E) studio background. The twill's fine diagonal weave is clearly visible. ${STYLE}`,
  },
  {
    name: 'sweater',
    prompt: `A softly folded rib-knit sweater in rich tobacco brown (#7A5C43), thick ribbed columns of the knit clearly visible, resting folded on a surface in the same deep tobacco tone so garment and ground read as one warm dark field, the knit lifted from the background only by light and texture. ${STYLE}`,
  },
  {
    name: 'blazer',
    prompt: `A tailored single-breasted wool blazer in deep charcoal-ink herringbone weave, hanging on a slender dark-wood hanger, photographed straight on against a plain near-black ink (#1C1C1C) studio background, the blazer separated from the dark ground by soft rim light. The herringbone's zigzag weave is clearly visible in the fabric. ${STYLE}`,
  },
];

async function generate(garment) {
  console.log(`Requesting ${garment.name}…`);
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: garment.prompt,
      size: '1024x1536',
      quality: 'medium',
      n: 1,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    // Error bodies can echo request details but never the key.
    console.error(`${garment.name} failed:`, response.status, text.slice(0, 500));
    return false;
  }

  const json = await response.json();
  const b64 = json.data && json.data[0] && json.data[0].b64_json;
  if (!b64) {
    console.error(`${garment.name}: no image in response`);
    return false;
  }

  const out = path.join(OUT_DIR, `${garment.name}.png`);
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`  ${path.relative(process.cwd(), out)}  ${kb} KB`);
  return true;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const only = process.argv[2];
  const targets = only ? GARMENTS.filter(g => g.name === only) : GARMENTS;
  if (targets.length === 0) {
    console.error(`No garment named "${only}". Options: ${GARMENTS.map(g => g.name).join(', ')}`);
    process.exit(1);
  }
  let ok = true;
  for (const garment of targets) {
    ok = (await generate(garment)) && ok;
  }
  process.exit(ok ? 0 : 1);
}

main().catch(error => {
  console.error('Failed:', error.message);
  process.exit(1);
});

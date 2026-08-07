/**
 * Generates the splash hero: a woman at a standing mirror beside her
 * wardrobe, where the mirror shows the 33 Trends screen instead of her
 * reflection - the app's promise as a single picture.
 *
 * Uses gpt-image-1 with the key from functions/.runtimeconfig.json (local,
 * gitignored). The key is read, never logged. Art direction is pinned to the
 * design system: bone/sand grounds, camel and tobacco accents, ink details,
 * the woven textures the brand is built on.
 *
 * Usage: node scripts/generateSplashHero.js [outfile]
 */

const fs = require('fs');
const path = require('path');

const config = require(path.join(__dirname, '../functions/.runtimeconfig.json'));
const KEY = config.openai && config.openai.key;
if (!KEY) {
  console.error('No OpenAI key in functions/.runtimeconfig.json');
  process.exit(1);
}

const OUT = process.argv[2] || path.join(__dirname, '../assets/splash-hero.png');

const PROMPT = `High-end editorial interior photograph, quiet-luxury fashion campaign style.

A woman with dark hair, seen from behind and slightly to the side, stands in a serene bedroom in soft morning window light. She wears a relaxed cream knit sweater and tailored camel trousers, barefoot on a pale wooden floor. She is looking into a full-length standing mirror with a thin dark wooden frame, positioned next to an open wardrobe of beautifully organised clothing - herringbone blazers, rib knits, linen shirts in warm neutral tones of cream, sand, camel, tobacco brown and charcoal.

Inside the mirror, instead of her reflection, the mirror surface glows softly like a screen showing a minimal warm off-white (bone #FDFBFA) app interface: a very large elegant serif numeral "33" in near-black ink occupying the upper middle of the mirror, a short thin camel-gold horizontal rule beneath it, and below that the single word "TRENDS" in small, widely letterspaced sans-serif capitals in tobacco brown. Nothing else on the screen. The glow from the mirror casts a faint warm light onto her and the floor.

Palette strictly warm heritage neutrals: bone white, warm sand, camel, tobacco brown, deep ink charcoal. Linen bedding, soft shadows, gentle film grain, shot on medium format, 50mm, shallow depth of field, natural light only. Composition vertical, the mirror and woman occupying the right two-thirds, calm negative space upper left. No text anywhere else in the image, no logos, no clutter, no harsh colors.`;

async function main() {
  console.log('Requesting image (portrait, high quality)…');
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: PROMPT,
      size: '1024x1536',
      quality: 'high',
      n: 1,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    // Error bodies can echo request details but never the key.
    console.error('Generation failed:', response.status, text.slice(0, 500));
    process.exit(1);
  }

  const json = await response.json();
  const b64 = json.data && json.data[0] && json.data[0].b64_json;
  if (!b64) {
    console.error('No image in response');
    process.exit(1);
  }

  fs.writeFileSync(OUT, Buffer.from(b64, 'base64'));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`  ${path.relative(process.cwd(), OUT)}  ${kb} KB`);
}

main().catch(error => {
  console.error('Failed:', error.message);
  process.exit(1);
});

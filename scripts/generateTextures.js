/**
 * Woven-textile textures for the login hero, in the Styled palette.
 *
 * Second pass. The first got three things wrong, all visible once rendered:
 *
 *   - The "under" thread was the exact mirror of the "over" thread (+1/-1),
 *     which turns a plain weave into a chessboard. In real cloth the shadowed
 *     thread is only slightly darker than the lit one.
 *   - Rib knit weighted its horizontal loop term as heavily as its vertical
 *     wale, so it read as gingham. A rib is vertical columns first.
 *   - Shading darkened toward pure black, which desaturates a warm base into
 *     grey. Shadows now keep the hue.
 *
 * Pure Node: PNG assembled by hand, zlib for pixels, no image dependency.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 560;
const H = 762;

/* ---------------- PNG ---------------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = buf => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function writePng(file, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const start = y * (1 + W * 3);
    raw[start] = 0;
    rgb.copy(raw, start + 1, y * W * 3, (y + 1) * W * 3);
  }

  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ])
  );
}

/* ---------------- colour ---------------- */

const hex = h => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/**
 * Shade while keeping the hue.
 *
 * Highlights move toward a warm white rather than pure white, and shadows
 * scale the channels rather than pulling toward black - so camel stays camel
 * in shadow instead of turning grey.
 */
const HIGHLIGHT = [255, 250, 244];

function shade(rgb, amount) {
  if (amount >= 0) {
    return rgb.map((c, i) => Math.min(255, c + (HIGHLIGHT[i] - c) * amount));
  }
  return rgb.map(c => Math.max(0, c * (1 + amount * 0.9)));
}

/** Deterministic, so the textures are reproducible. */
function noise(x, y, seed) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

/* ---------------- weaves ---------------- */
/*
 * Each returns a signed level. +1 is a fully lit thread crown, negative is
 * the shadow between threads. The "under" thread is deliberately shallower
 * than the "over" thread is bright - cloth is not a chessboard.
 */

const UNDER = 0.45;

/** Threads are cylinders: brightest along the centre, falling off at the edge. */
const round = (v, scale) => 1 - Math.abs(((v % scale) / scale) - 0.5) * 1.4;

function twill(x, y, scale) {
  const col = Math.floor(x / scale);
  const row = Math.floor(y / scale);
  const warpOver = (((col - row) % 4) + 4) % 4 < 2;
  return warpOver ? round(x, scale) : -UNDER * (1 - round(y, scale) * 0.5);
}

function herringbone(x, y, scale) {
  const col = Math.floor(x / scale);
  const row = Math.floor(y / scale);
  const mirrored = Math.floor(col / 9) % 2 === 0;
  const dir = mirrored ? col - row : col + row;
  const warpOver = (((dir % 4) + 4) % 4) < 2;
  return warpOver ? round(x, scale) : -UNDER * (1 - round(y, scale) * 0.5);
}

function rib(x, y, scale) {
  // Vertical wales dominate; the loops only modulate them.
  const wale = Math.cos(((x % (scale * 2.4)) / (scale * 2.4)) * Math.PI * 2);
  const loop = Math.sin((y / (scale * 1.9)) * Math.PI * 2) * 0.16;
  return wale * 0.9 + loop;
}

function linen(x, y, scale, seed) {
  const col = Math.floor(x / scale);
  const row = Math.floor(y / scale);
  const warpOver = (col + row) % 2 === 0;
  // Slub: yarn thickness wanders along its own length, per thread.
  const slub = 1 + (noise(warpOver ? col : 0, warpOver ? 0 : row, seed) - 0.5) * 0.55;
  return (warpOver ? round(x, scale) : -UNDER * (1 - round(y, scale) * 0.5)) * slub;
}

/* ---------------- fabrics ---------------- */

const FABRICS = [
  // Ink needs the most contrast before any structure is visible at all, but
  // not so much that it reads as carbon fibre rather than wool.
  { name: 'tailored', base: '#1C1C1C', weave: herringbone, scale: 11, seed: 3, contrast: 0.2, lift: 0.1, grain: 0.1 },
  { name: 'knit', base: '#7A5C43', weave: rib, scale: 15, seed: 11, contrast: 0.15, lift: 0.02, grain: 0.09 },
  { name: 'twill', base: '#B89664', weave: twill, scale: 13, seed: 19, contrast: 0.1, lift: 0.0, grain: 0.08 },
  // Sand is nearly white already; anything above about 6% reads as a grid.
  { name: 'linen', base: '#F2EBE3', weave: linen, scale: 14, seed: 27, contrast: 0.055, lift: -0.02, grain: 0.07 },
];

function render(f) {
  const base = hex(f.base);
  const rgb = Buffer.alloc(W * H * 3);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let level = f.weave(x, y, f.scale, f.seed);

      // Fibre grain stops it looking printed. Kept small - noise is also what
      // destroys PNG compression.
      level += (noise(x, y, f.seed) - 0.5) * f.grain;

      // Raking light from the upper left; this is what makes a flat texture
      // read as a physical surface rather than a pattern swatch.
      const lx = x / W - 0.3;
      const ly = y / H - 0.2;
      const falloff = Math.sqrt(lx * lx + ly * ly);

      const shaded = shade(base, level * f.contrast + f.lift - falloff * 0.14);
      const i = (y * W + x) * 3;
      rgb[i] = shaded[0];
      rgb[i + 1] = shaded[1];
      rgb[i + 2] = shaded[2];
    }
  }
  return rgb;
}

const outDir = process.argv[2];
fs.mkdirSync(outDir, { recursive: true });

for (const f of FABRICS) {
  const file = path.join(outDir, `${f.name}.png`);
  writePng(file, render(f));
  console.log(`  ${f.name}.png  ${W}x${H}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}

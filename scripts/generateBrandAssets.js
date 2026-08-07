/**
 * Brand assets for 33 Trends: app icon, adaptive icon, splash and favicon.
 *
 * The numerals and letters are rasterized from the same font files the app
 * ships - Playfair Display 500Medium for the "33" mark, Instrument Sans
 * SemiBold for the TRENDS wordmark - so the assets are the design system,
 * not an approximation of it. Pure Node: a minimal TrueType parser feeds a
 * scanline rasterizer, and the PNG is assembled by hand as in
 * generateTextures.js. No image dependency.
 *
 * Palette: ink #1C1C1C, bone #FDFBFA, camel #B89664, tobacco #7A5C43.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------------- PNG writing ---------------- */

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

function writePng(file, rgb, W, H) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // truecolour, no alpha
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

/* ---------------- TrueType parsing ---------------- */

function parseFont(file) {
  const buf = fs.readFileSync(file);
  const numTables = buf.readUInt16BE(4);
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    tables[buf.toString('ascii', rec, rec + 4)] = buf.readUInt32BE(rec + 8);
  }

  const head = tables.head;
  const unitsPerEm = buf.readUInt16BE(head + 18);
  const longLoca = buf.readInt16BE(head + 50) === 1;

  const numGlyphs = buf.readUInt16BE(tables.maxp + 4);
  const numHMetrics = buf.readUInt16BE(tables.hhea + 34);

  function advanceOf(gid) {
    const i = Math.min(gid, numHMetrics - 1);
    return buf.readUInt16BE(tables.hmtx + i * 4);
  }

  // cmap: prefer the Windows Unicode BMP subtable, format 4.
  const cmap = tables.cmap;
  const nSub = buf.readUInt16BE(cmap + 2);
  let subOffset = null;
  for (let i = 0; i < nSub; i++) {
    const rec = cmap + 4 + i * 8;
    const platform = buf.readUInt16BE(rec);
    const encoding = buf.readUInt16BE(rec + 2);
    const off = buf.readUInt32BE(rec + 4);
    if ((platform === 3 && encoding === 1) || platform === 0) subOffset = cmap + off;
  }
  if (subOffset === null || buf.readUInt16BE(subOffset) !== 4) {
    throw new Error(`no format-4 cmap in ${path.basename(file)}`);
  }

  function glyphId(char) {
    const c = char.codePointAt(0);
    const segCount = buf.readUInt16BE(subOffset + 6) / 2;
    const endBase = subOffset + 14;
    const startBase = endBase + segCount * 2 + 2;
    const deltaBase = startBase + segCount * 2;
    const rangeBase = deltaBase + segCount * 2;
    for (let s = 0; s < segCount; s++) {
      if (buf.readUInt16BE(endBase + s * 2) >= c) {
        const start = buf.readUInt16BE(startBase + s * 2);
        if (start > c) return 0;
        const delta = buf.readInt16BE(deltaBase + s * 2);
        const rangeOffset = buf.readUInt16BE(rangeBase + s * 2);
        if (rangeOffset === 0) return (c + delta) & 0xffff;
        const gi = buf.readUInt16BE(rangeBase + s * 2 + rangeOffset + (c - start) * 2);
        return gi === 0 ? 0 : (gi + delta) & 0xffff;
      }
    }
    return 0;
  }

  function locaOf(gid) {
    if (longLoca) {
      return [buf.readUInt32BE(tables.loca + gid * 4), buf.readUInt32BE(tables.loca + gid * 4 + 4)];
    }
    return [buf.readUInt16BE(tables.loca + gid * 2) * 2, buf.readUInt16BE(tables.loca + gid * 2 + 2) * 2];
  }

  /** Returns contours as arrays of {x, y, on} in font units. */
  function glyphContours(gid, depth = 0) {
    if (depth > 4) return [];
    const [start, end] = locaOf(gid);
    if (start === end) return []; // empty glyph (e.g. space)
    let p = tables.glyf + start;
    const nContours = buf.readInt16BE(p);
    p += 10; // skip bbox

    if (nContours >= 0) {
      const ends = [];
      for (let i = 0; i < nContours; i++) {
        ends.push(buf.readUInt16BE(p));
        p += 2;
      }
      const nPoints = ends[ends.length - 1] + 1;
      p += 2 + buf.readUInt16BE(p); // instructions

      const flags = [];
      while (flags.length < nPoints) {
        const f = buf[p++];
        flags.push(f);
        if (f & 8) {
          let repeat = buf[p++];
          while (repeat-- > 0) flags.push(f);
        }
      }

      const xs = [];
      let x = 0;
      for (const f of flags) {
        if (f & 2) {
          const d = buf[p++];
          x += f & 16 ? d : -d;
        } else if (!(f & 16)) {
          x += buf.readInt16BE(p);
          p += 2;
        }
        xs.push(x);
      }
      const ys = [];
      let y = 0;
      for (const f of flags) {
        if (f & 4) {
          const d = buf[p++];
          y += f & 32 ? d : -d;
        } else if (!(f & 32)) {
          y += buf.readInt16BE(p);
          p += 2;
        }
        ys.push(y);
      }

      const contours = [];
      let first = 0;
      for (const endIdx of ends) {
        const pts = [];
        for (let i = first; i <= endIdx; i++) pts.push({ x: xs[i], y: ys[i], on: !!(flags[i] & 1) });
        contours.push(pts);
        first = endIdx + 1;
      }
      return contours;
    }

    // Composite glyph: offset components, no scaling support beyond identity
    // and simple scale - the glyphs used here are digits and caps, which are
    // simple in both fonts, so this path is a safety net rather than a need.
    const contours = [];
    let more = true;
    while (more) {
      const flags = buf.readUInt16BE(p);
      const glyphIndex = buf.readUInt16BE(p + 2);
      p += 4;
      let dx = 0;
      let dy = 0;
      if (flags & 1) {
        dx = buf.readInt16BE(p);
        dy = buf.readInt16BE(p + 2);
        p += 4;
      } else {
        dx = buf.readInt8(p);
        dy = buf.readInt8(p + 1);
        p += 2;
      }
      let scale = 1;
      if (flags & 8) {
        scale = buf.readInt16BE(p) / 16384;
        p += 2;
      } else if (flags & 64) {
        p += 4; // x & y scale - take x
        scale = buf.readInt16BE(p - 4) / 16384;
      } else if (flags & 128) {
        p += 8; // 2x2 matrix - unsupported, identity fallback
      }
      for (const contour of glyphContours(glyphIndex, depth + 1)) {
        contours.push(contour.map(pt => ({ x: pt.x * scale + dx, y: pt.y * scale + dy, on: pt.on })));
      }
      more = !!(flags & 32);
    }
    return contours;
  }

  return { unitsPerEm, glyphId, glyphContours, advanceOf };
}

/* ---------------- rasterizing ---------------- */

/**
 * TrueType contours to line segments. Consecutive off-curve points imply an
 * on-curve midpoint; quadratics are flattened at 12 steps, plenty at these
 * sizes.
 */
function contourToEdges(points, scale, ox, oy, edges) {
  if (points.length === 0) return;
  const pts = points.map(p => ({ x: ox + p.x * scale, y: oy - p.y * scale, on: p.on }));

  let startIdx = pts.findIndex(p => p.on);
  let start;
  if (startIdx === -1) {
    start = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    startIdx = 0;
  } else {
    start = pts[startIdx];
  }

  const n = pts.length;
  let current = start;
  let i = startIdx;
  let steps = 0;
  let pendingControl = null;

  const lineTo = to => {
    edges.push([current.x, current.y, to.x, to.y]);
    current = to;
  };
  const quadTo = (ctrl, to) => {
    let prev = current;
    for (let t = 1; t <= 12; t++) {
      const u = t / 12;
      const a = 1 - u;
      const q = {
        x: a * a * current.x + 2 * a * u * ctrl.x + u * u * to.x,
        y: a * a * current.y + 2 * a * u * ctrl.y + u * u * to.y,
      };
      edges.push([prev.x, prev.y, q.x, q.y]);
      prev = q;
    }
    current = to;
  };

  while (steps <= n) {
    i = (i + 1) % n;
    steps++;
    const isLast = steps === n + (startIdx === i ? 0 : 1) && false;
    const pt = steps > n ? { ...start, on: true } : pts[i];
    const target = steps > n ? start : pt;

    if (pendingControl) {
      if (pt.on || steps > n) {
        quadTo(pendingControl, target);
        pendingControl = null;
      } else {
        const mid = { x: (pendingControl.x + pt.x) / 2, y: (pendingControl.y + pt.y) / 2 };
        quadTo(pendingControl, mid);
        pendingControl = pt;
      }
    } else if (pt.on || steps > n) {
      lineTo(target);
    } else {
      pendingControl = pt;
    }
    if (steps > n) break;
  }
}

/** Nonzero-winding scanline fill with 4 vertical subsamples per row. */
function fillEdges(edges, W, H) {
  const cov = new Float32Array(W * H);
  const SUB = 4;
  for (let py = 0; py < H; py++) {
    for (let s = 0; s < SUB; s++) {
      const y = py + (s + 0.5) / SUB;
      const crossings = [];
      for (const [x0, y0, x1, y1] of edges) {
        if (y0 === y1) continue;
        const [ya, yb] = y0 < y1 ? [y0, y1] : [y1, y0];
        if (y < ya || y >= yb) continue;
        const t = (y - y0) / (y1 - y0);
        crossings.push({ x: x0 + t * (x1 - x0), dir: y1 > y0 ? 1 : -1 });
      }
      crossings.sort((a, b) => a.x - b.x);
      let winding = 0;
      let spanStart = 0;
      for (const c of crossings) {
        if (winding !== 0) {
          const a = Math.max(0, spanStart);
          const b = Math.min(W, c.x);
          if (b > a) {
            const p0 = Math.floor(a);
            const p1 = Math.floor(b);
            if (p0 === p1) {
              cov[py * W + p0] += (b - a) / SUB;
            } else {
              cov[py * W + p0] += (p0 + 1 - a) / SUB;
              for (let px = p0 + 1; px < p1; px++) cov[py * W + px] += 1 / SUB;
              if (p1 < W) cov[py * W + p1] += (b - p1) / SUB;
            }
          }
        }
        winding += c.dir;
        if (winding !== 0) spanStart = c.x;
      }
    }
  }
  return cov;
}

/**
 * Renders a run of text into a standalone coverage canvas and reports the
 * tight ink bounding box, so callers can place by visual centre rather than
 * font metrics.
 */
function renderRun(font, text, sizePx, trackingPx = 0) {
  const scale = sizePx / font.unitsPerEm;
  const W = Math.ceil(text.length * sizePx * 1.2) + 64;
  const H = Math.ceil(sizePx * 1.8) + 64;
  const baseline = Math.round(sizePx * 1.3);

  const edges = [];
  let penX = 32;
  for (const ch of text) {
    const gid = font.glyphId(ch);
    for (const contour of font.glyphContours(gid)) {
      contourToEdges(contour, scale, penX, baseline, edges);
    }
    penX += font.advanceOf(gid) * scale + trackingPx;
  }

  const cov = fillEdges(edges, W, H);

  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (cov[y * W + x] > 0.02) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { cov, W, H, minX, minY, maxX, maxY };
}

/* ---------------- composition ---------------- */

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const INK = hex('#1C1C1C');
const BONE = hex('#FDFBFA');
const CAMEL = hex('#B89664');
const TOBACCO = hex('#7A5C43');

function canvas(W, H, bg) {
  const rgb = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    rgb[i * 3] = bg[0];
    rgb[i * 3 + 1] = bg[1];
    rgb[i * 3 + 2] = bg[2];
  }
  return rgb;
}

/** Blits a rendered run so its ink bbox centre lands on (cx, cy). */
function blitRun(rgb, W, H, run, cx, cy, color) {
  const rw = run.maxX - run.minX + 1;
  const rh = run.maxY - run.minY + 1;
  const ox = Math.round(cx - rw / 2) - run.minX;
  const oy = Math.round(cy - rh / 2) - run.minY;
  for (let y = run.minY; y <= run.maxY; y++) {
    const ty = y + oy;
    if (ty < 0 || ty >= H) continue;
    for (let x = run.minX; x <= run.maxX; x++) {
      const a = Math.min(1, run.cov[y * run.W + x]);
      if (a <= 0.003) continue;
      const tx = x + ox;
      if (tx < 0 || tx >= W) continue;
      const i = (ty * W + tx) * 3;
      rgb[i] = rgb[i] * (1 - a) + color[0] * a;
      rgb[i + 1] = rgb[i + 1] * (1 - a) + color[1] * a;
      rgb[i + 2] = rgb[i + 2] * (1 - a) + color[2] * a;
    }
  }
}

function rect(rgb, W, H, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) {
    if (y < 0 || y >= H) continue;
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || x >= W) continue;
      const i = (y * W + x) * 3;
      rgb[i] = color[0];
      rgb[i + 1] = color[1];
      rgb[i + 2] = color[2];
    }
  }
}

/* ---------------- assets ---------------- */

const playfair = parseFont(
  path.join(__dirname, '../node_modules/@expo-google-fonts/playfair-display/500Medium/PlayfairDisplay_500Medium.ttf')
);
const instrument = parseFont(
  path.join(__dirname, '../node_modules/@expo-google-fonts/instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf')
);

const outDir = path.join(__dirname, '../assets');

// App icon: the "33" mark in bone on ink, a camel rule beneath - the same
// eyebrow-and-rule language the app's screens use.
{
  const S = 1024;
  const rgb = canvas(S, S, INK);
  const mark = renderRun(playfair, '33', 520, -14);
  blitRun(rgb, S, S, mark, S / 2, S * 0.46, BONE);
  rect(rgb, S, S, Math.round(S / 2 - 70), Math.round(S * 0.72), 140, 8, CAMEL);
  writePng(path.join(outDir, 'icon.png'), rgb, S, S);
  console.log('  icon.png');
}

// Adaptive icon: Android masks to circles/squircles and only the central ~66%
// is safe, so the mark is smaller and the rule is dropped.
{
  const S = 1024;
  const rgb = canvas(S, S, INK);
  const mark = renderRun(playfair, '33', 380, -10);
  blitRun(rgb, S, S, mark, S / 2, S / 2, BONE);
  writePng(path.join(outDir, 'adaptive-icon.png'), rgb, S, S);
  console.log('  adaptive-icon.png');
}

// Splash: full lockup on bone - ink "33", camel rule, TRENDS letterspaced in
// tobacco. resizeMode is contain, and the splash backgroundColor is set to
// the same bone so the PNG edge is invisible.
{
  const S = 1024;
  const rgb = canvas(S, S, BONE);
  const mark = renderRun(playfair, '33', 430, -12);
  blitRun(rgb, S, S, mark, S / 2, S * 0.42, INK);
  rect(rgb, S, S, Math.round(S / 2 - 55), Math.round(S * 0.635), 110, 6, CAMEL);
  const word = renderRun(instrument, 'TRENDS', 92, 34);
  blitRun(rgb, S, S, word, S / 2 + 17, S * 0.735, TOBACCO);
  writePng(path.join(outDir, 'splash-icon.png'), rgb, S, S);
  console.log('  splash-icon.png');
}

// Favicon: just the numerals - anything more is noise at 16px.
{
  const S = 96;
  const rgb = canvas(S, S, INK);
  const mark = renderRun(playfair, '33', 58, -2);
  blitRun(rgb, S, S, mark, S / 2, S / 2, BONE);
  writePng(path.join(outDir, 'favicon.png'), rgb, S, S);
  console.log('  favicon.png');
}

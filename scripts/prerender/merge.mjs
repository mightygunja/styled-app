/**
 * Pre-rendering, step 2 of 2: fold the snapshots into the exported build.
 *
 * Runs on every web build (see vercel.json buildCommand) after `expo export`.
 * For each snapshot written by snapshot.mjs it takes the freshly exported
 * dist/index.html - so the script tags always point at the current bundle -
 * and writes a copy at dist/<path>/index.html whose <title>, description,
 * Open Graph tags and canonical are that page's own, and whose #root already
 * holds the rendered markup. Vercel serves a real file before it applies the
 * catch-all rewrite, so /about and /guides/* get their page; every other URL
 * still gets the untouched shell, kept as dist/app.html.
 *
 * Plain Node, no browser, and it must never fail the deploy: any problem is
 * logged and the plain shell ships, which is exactly what shipped before.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const dist = path.join(root, 'dist');
const snapDir = path.join(here, 'snapshots');
const SITE = 'https://www.thirtythreetrends.com';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function setTag(html, pattern, replacement, what) {
  if (!pattern.test(html)) { console.warn(`  shell has no ${what}; left as is`); return html; }
  return html.replace(pattern, replacement);
}

/**
 * Signed-in visitors never see the static frame: this runs before first
 * paint and empties #root when a Firebase session is in localStorage, so a
 * returning user gets the same boot as before, not a flash of the landing
 * page (they were the only people the shell served well).
 */
const HIDE_FOR_SIGNED_IN = `<script>(function(){try{for(var i=0;i<localStorage.length;i++){if(localStorage.key(i).indexOf('firebase:authUser:')===0){document.getElementById('root').innerHTML='';break;}}}catch(e){}})();</script>`;

function build(shell, snap) {
  const url = `${SITE}/${snap.path}`;
  let html = shell;
  // The home page keeps the shell's own title and description: they are the
  // site-wide pitch, better for the root than the intro screen's "Welcome".
  if (snap.path === '') {
    html = html.replace('</head>', `    <style id="prerender-css">\n${snap.css}\n    </style>\n  </head>`);
    return fillRoot(html, snap);
  }
  const title = esc(snap.title);
  const description = esc(snap.description);
  html = setTag(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`, '<title>');
  html = setTag(html, /(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${description}$2`, 'description');
  html = setTag(html, /(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`, 'og:title');
  html = setTag(html, /(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${description}$2`, 'og:description');
  html = setTag(html, /(<meta property="og:url" content=")[^"]*(")/, `$1${esc(url)}$2`, 'og:url');
  html = setTag(html, /(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`, 'twitter:title');
  html = setTag(html, /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${description}$2`, 'twitter:description');
  html = setTag(html, /(<link rel="canonical" href=")[^"]*(")/, `$1${esc(url)}$2`, 'canonical');
  if (snap.path.startsWith('guides/')) {
    html = html.replace('</head>', `    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article', headline: snap.title, description: snap.description,
      url, mainEntityOfPage: url, publisher: { '@id': `${SITE}/#org` }, author: { '@type': 'Organization', name: '33 Trends' },
    })}</script>\n  </head>`);
  }
  html = html.replace('</head>', `    <style id="prerender-css">\n${snap.css}\n    </style>\n  </head>`);
  return fillRoot(html, snap);
}

function fillRoot(html, snap) {
  const rootTag = /<div id="root"><\/div>/;
  if (!rootTag.test(html)) throw new Error('shell has no empty <div id="root"></div>');
  return html.replace(rootTag, `<div id="root">${snap.html}</div>\n    ${HIDE_FOR_SIGNED_IN}`);
}

function main() {
  const shellPath = path.join(dist, 'index.html');
  const appPath = path.join(dist, 'app.html');
  // The plain shell: a fresh export's index.html, or - when this dist was
  // merged already (a local re-run) - the app.html kept from that merge.
  const isPlain = file => fs.existsSync(file) && /<div id="root"><\/div>/.test(fs.readFileSync(file, 'utf8'));
  const source = isPlain(shellPath) ? shellPath : isPlain(appPath) ? appPath : null;
  if (!source) { console.warn('prerender: no plain shell in dist/, nothing to do'); return; }
  const shell = fs.readFileSync(source, 'utf8');
  // The untouched shell keeps serving every non-public URL (vercel.json catch-all).
  fs.writeFileSync(appPath, shell);

  const files = fs.existsSync(snapDir) ? fs.readdirSync(snapDir).filter(f => f.endsWith('.json')) : [];
  if (files.length === 0) { console.warn('prerender: no snapshots found; shipping the plain shell'); return; }
  let done = 0;
  for (const file of files) {
    try {
      const snap = JSON.parse(fs.readFileSync(path.join(snapDir, file), 'utf8'));
      if (!snap.html || !snap.title) throw new Error('snapshot missing html or title');
      const out = snap.path === '' ? shellPath : path.join(dist, snap.path, 'index.html');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, build(shell, snap));
      done++;
    } catch (err) {
      console.warn(`prerender: skipped ${file}: ${err.message}`);
    }
  }
  console.log(`prerender: ${done}/${files.length} pages written`);
}

try { main(); } catch (err) { console.warn(`prerender: failed, shipping the plain shell (${err.message})`); }

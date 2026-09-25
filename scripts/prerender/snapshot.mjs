/**
 * Pre-rendering, step 1 of 2: snapshot the public pages.
 *
 * The web build is a single-page app, so every URL used to ship the same
 * eleven-word shell and the same <title>; the guide text only existed after
 * the JavaScript ran. Search engines and affiliate-network reviewers mostly
 * do not run it, so to them the site was twenty copies of an empty page
 * (Search Console: "Discovered - currently not indexed", never crawled).
 *
 * This script renders each public page in a real browser and saves what it
 * painted - the markup inside #root plus the CSS rules react-native-web
 * inserts through the CSSOM (which never appear in outerHTML) - as JSON under
 * snapshots/. merge.mjs folds those into the exported shell on every Vercel
 * build, so the served HTML carries real content while the app still boots
 * on top exactly as before.
 *
 * Run locally whenever a public page's content changes, then commit the
 * snapshots:
 *
 *   npm run prerender
 *
 * It needs an exported build in dist/ (the script makes one if missing) and
 * a local Edge or Chrome; nothing is downloaded. The Vercel build never runs
 * this step - it only runs merge.mjs, which is plain Node.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const dist = path.join(root, 'dist');
const outDir = path.join(here, 'snapshots');
const PORT = 4173;

/** Pages that exist logged-out. Guides are read from the one list that drives them. */
function publicRoutes() {
  const src = fs.readFileSync(path.join(root, 'src/screens/GuideScreens.tsx'), 'utf8');
  const list = src.slice(src.indexOf('export const GUIDES'), src.indexOf('];', src.indexOf('export const GUIDES')));
  const guides = [];
  const re = /path:\s*'([^']+)',\s*label:\s*'[^']*',\s*title:\s*'([^']+)'/g;
  for (const m of list.matchAll(re)) guides.push({ path: m[1], title: m[2] });
  if (guides.length === 0) throw new Error('No guides parsed from GuideScreens.tsx - the regex needs updating.');
  return [
    { path: '' },
    { path: 'about' },
    { path: 'privacy' },
    { path: 'terms' },
    { path: 'login' },
    { path: 'signup' },
    { path: 'trending' },
    ...guides,
  ];
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2' };

/**
 * Serves the PLAIN shell for every page (app.html when a merge has already
 * run in this dist, else the fresh index.html) plus the static assets, so a
 * snapshot always captures what the app renders, never a previous snapshot.
 */
function serveDist() {
  const shell = fs.existsSync(path.join(dist, 'app.html')) ? path.join(dist, 'app.html') : path.join(dist, 'index.html');
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = path.join(dist, urlPath);
      if (!urlPath.includes('.') || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = shell;
      const ext = path.extname(file).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      fs.createReadStream(file).on('error', () => { res.statusCode = 404; res.end(); }).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try { return await chromium.launch({ channel, headless: true }); } catch { /* try the next */ }
  }
  throw new Error('No local Edge or Chrome found for playwright-core.');
}

async function main() {
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.log('No dist/index.html - exporting the web build first.');
    execSync('npx expo export --platform web', { cwd: root, stdio: 'inherit' });
  }
  fs.mkdirSync(outDir, { recursive: true });
  const server = await serveDist();
  const browser = await launch();
  const routes = publicRoutes();
  let failures = 0;
  for (const route of routes) {
    // A fresh context per page: no intro-seen flag, no auth, so `/` renders
    // what a first-time visitor gets.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    try {
      // Not `networkidle`: a logged-out page still opens a Firestore stream
      // that never goes quiet. Wait for real content, then for it to stop
      // changing, which covers async loads like the trend page.
      await page.goto(`http://localhost:${PORT}/${route.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => (document.getElementById('root')?.innerText || '').length > 200, null, { timeout: 30000 });
      let previous = -1;
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(500);
        const length = await page.evaluate(() => (document.getElementById('root')?.innerText || '').length);
        if (length === previous) break;
        previous = length;
      }
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(500);
      const snap = await page.evaluate(() => {
        const css = [];
        for (const sheet of Array.from(document.styleSheets)) {
          const id = sheet.ownerNode?.id;
          if (id === 'expo-reset' || id === 'prerender-css') continue; // already in the shell / a previous merge
          try { for (const rule of Array.from(sheet.cssRules)) css.push(rule.cssText); } catch { /* cross-origin */ }
        }
        const meta = name => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';
        return {
          title: document.title,
          description: meta('description'),
          html: document.getElementById('root').innerHTML,
          css: css.join('\n'),
          words: (document.getElementById('root').innerText || '').split(/\s+/).filter(Boolean).length,
        };
      });
      if (route.title) snap.title = route.title; // the guide's full SEO title beats the short header one
      const slug = route.path === '' ? 'index' : route.path.replace(/\//g, '__');
      fs.writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify({ path: route.path, ...snap }, null, 1));
      console.log(`ok   /${route.path}  ${snap.words} words  "${snap.title}"`);
    } catch (err) {
      failures++;
      console.error(`FAIL /${route.path}: ${err.message}`);
    } finally {
      await context.close();
    }
  }
  await browser.close();
  server.close();
  if (failures) { console.error(`${failures} page(s) failed; their old snapshots (if any) were kept.`); process.exitCode = 1; }
}

main().catch(err => { console.error(err); process.exitCode = 1; });

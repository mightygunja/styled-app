/**
 * Stocks the Channel3 shelves against the REAL API, on this machine, using
 * the very code the Cloud Function runs (functions/src/channel3.ts), with a
 * folder standing in for Firestore. For checking what the Shop's browse view
 * will show before (or without) a deploy.
 *
 * Costs credits the first time (3 searches a shelf, 33 for all of them);
 * re-running inside a week re-reads by id, which is free.
 *
 *   cd functions && npx tsc -p . --outDir ../.shelf-build && cd ..
 *   node scripts/tryChannel3Shelves.cjs <folder> [women|men] [category] [--force] [--age-hours=N]
 *
 * --age-hours pretends the saved shelves are N hours old, to exercise the
 * free re-read. The key is read from functions/.env and never printed.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const c3 = require(path.join(root, '.shelf-build', 'channel3.js'));
const env = fs.readFileSync(path.join(root, 'functions', '.env'), 'utf8');
const key = ((env.match(/^CHANNEL3_API_KEY=(.+)$/m) || [])[1] || '').trim();
if (!key) {
  console.error('CHANNEL3_API_KEY is not in functions/.env');
  process.exit(1);
}

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const [folder, onlyDepartment, onlyCategory] = args.filter(a => !a.startsWith('--'));
if (!folder) {
  console.error('usage: node scripts/tryChannel3Shelves.cjs <folder> [women|men] [category] [--force] [--age-hours=N]');
  process.exit(1);
}
fs.mkdirSync(folder, { recursive: true });
const force = flags.includes('--force');
const ageHours = Number((flags.find(f => f.startsWith('--age-hours=')) || '').split('=')[1]) || 0;

let searches = 0;
let reads = 0;
let gone = 0;
const deps = {
  search: async body => {
    searches += 1;
    const res = await fetch(`${c3.CHANNEL3_API}/search`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.log(`  search "${body.query}" -> HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    return (await res.json()).products || [];
  },
  product: async id => {
    reads += 1;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${c3.CHANNEL3_API}/products/${encodeURIComponent(id)}`, { headers: { 'x-api-key': key } });
      if (res.status === 429 && attempt === 0) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (!res.ok) {
        gone += 1;
        return null;
      }
      return res.json();
    }
    gone += 1;
    return null;
  },
  now: () => Date.now(),
};

(async () => {
  for (const department of c3.SHELF_DEPARTMENTS) {
    if (onlyDepartment && department !== onlyDepartment) continue;
    for (const category of c3.shelfCategories(department)) {
      if (onlyCategory && category !== onlyCategory) continue;
      const file = path.join(folder, `${c3.shelfDocId(department, category)}.json`);
      let previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
      if (previous && ageHours) previous = { ...previous, productsAt: previous.productsAt - ageHours * 3600 * 1000 };
      const before = { searches, reads };
      const started = Date.now();
      const next = await c3.refreshShelf(previous, department, category, deps, { force });
      const what =
        next === previous ? 'still fresh, nothing done' : searches > before.searches ? 'restocked by search' : 're-read by id';
      if (next && next !== previous) fs.writeFileSync(file, JSON.stringify(next));
      const rows = next ? next.products : [];
      const paying = rows.filter(r => r.commissionRate > 0).length;
      console.log(
        `${department}/${category}: ${what} - ${rows.length} products (${paying} paying), ` +
          `${searches - before.searches} searches, ${reads - before.reads} reads, ${((Date.now() - started) / 1000).toFixed(1)}s`
      );
    }
  }
  console.log(`\nTotal: ${searches} searches (credits), ${reads} free reads, ${gone} products gone.`);
})().catch(error => {
  console.error('FAILED', error.message);
  process.exit(1);
});

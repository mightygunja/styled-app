/**
 * Session cache audit: the helper behind the shared closet and style-profile
 * reads (src/services/sessionCache.ts), and that the app is wired to it.
 *
 * Fails when:
 *   - two readers asking at once cause two loads, or a second reader inside
 *     the TTL causes another;
 *   - a value is served after its TTL, or after invalidate();
 *   - a load that was in the air when a write invalidated the cache gets
 *     stored anyway (the stale-after-write race);
 *   - a failed load is cached, or stops the next read from retrying;
 *   - one caller's changes to what it received reach another caller;
 *   - a closet write, a profile save, pull-to-refresh or a change of account
 *     does not drop the cache;
 *   - an artificial delay is back in the catalogue adapter.
 *
 * Run:  npx tsx scripts/auditSessionCache.ts
 */

import fs from 'fs';
import path from 'path';
import { createSessionCache } from '../src/services/sessionCache';

let failures = 0;
let checks = 0;
const check = (ok: boolean, message: string) => {
  checks += 1;
  if (!ok) {
    failures += 1;
    console.log(`  FAIL  ${message}`);
  }
};
const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

interface Piece {
  id: string;
  tags: string[];
}

function harness(ttlMs = 1000) {
  let clock = 0;
  let loads = 0;
  let version = 1;
  const gates: Array<() => void> = [];
  const cache = createSessionCache<Piece[]>({
    ttlMs,
    copy: items => items.map(item => ({ ...item, tags: [...item.tags] })),
    now: () => clock,
  });
  /** A load that resolves only when released, returning the data version current when it STARTED. */
  const gatedLoad = () => {
    loads += 1;
    const snapshot = version;
    return new Promise<Piece[]>(resolve => gates.push(() => resolve([{ id: `v${snapshot}`, tags: ['a'] }])));
  };
  const instantLoad = async () => {
    loads += 1;
    return [{ id: `v${version}`, tags: ['a'] }];
  };
  return {
    cache,
    gatedLoad,
    instantLoad,
    release: () => gates.splice(0).forEach(open => open()),
    tick: (ms: number) => (clock += ms),
    write: () => (version += 1),
    loads: () => loads,
  };
}

(async () => {
  // ---- 1. Sharing ----
  console.log('# Sharing');
  {
    const h = harness();
    const a = h.cache.get('u1', h.gatedLoad);
    const b = h.cache.get('u1', h.gatedLoad);
    const c = h.cache.get('u1', h.gatedLoad);
    h.release();
    const [ra, rb, rc] = await Promise.all([a, b, c]);
    check(h.loads() === 1, `three readers at once share one load (got ${h.loads()})`);
    check(ra[0].id === 'v1' && rb[0].id === 'v1' && rc[0].id === 'v1', 'they all get the value');
    await h.cache.get('u1', h.instantLoad);
    await h.cache.get('u1', h.instantLoad);
    check(h.loads() === 1, `later readers inside the TTL do not load again (got ${h.loads()})`);
    await h.cache.get('u2', h.instantLoad);
    check(h.loads() === 2, 'another user is its own entry');
  }

  // ---- 2. Expiry ----
  console.log('# Expiry');
  {
    const h = harness(1000);
    await h.cache.get('u1', h.instantLoad);
    h.tick(999);
    await h.cache.get('u1', h.instantLoad);
    check(h.loads() === 1, 'still served just inside the TTL');
    check(h.cache.peek('u1')?.[0].id === 'v1', 'peek sees a fresh value');
    h.tick(2);
    check(h.cache.peek('u1') === undefined && h.cache.values().length === 0, 'peek and values() see nothing once it has expired');
    h.write();
    const after = await h.cache.get('u1', h.instantLoad);
    check(h.loads() === 2 && after[0].id === 'v2', `an expired value is loaded again (${after[0].id})`);
  }

  // ---- 3. Invalidation ----
  console.log('# Invalidation');
  {
    const h = harness();
    await h.cache.get('u1', h.instantLoad);
    h.write();
    h.cache.invalidate();
    check(h.cache.peek('u1') === undefined, 'invalidate() drops the value');
    const after = await h.cache.get('u1', h.instantLoad);
    check(after[0].id === 'v2', `the next read sees the write (${after[0].id})`);
  }
  {
    // The race: a read starts, a write lands and invalidates, the read finishes.
    const h = harness();
    const early = h.cache.get('u1', h.gatedLoad); // will resolve with v1
    h.write();
    h.cache.invalidate();
    const late = h.cache.get('u1', h.gatedLoad); // a new load, v2
    check(h.loads() === 2, 'a read after an invalidation does not join the pre-write load');
    h.release();
    const [e, l] = await Promise.all([early, late]);
    check(e[0].id === 'v1', 'the pre-write read still answers its own caller');
    check(l[0].id === 'v2', 'the post-write read gets post-write data');
    const next = await h.cache.get('u1', h.instantLoad);
    check(next[0].id === 'v2' && h.loads() === 2, `the pre-write result was not stored over the post-write one (${next[0].id}, ${h.loads()} loads)`);
  }
  {
    // Same race, but nothing reads again until the stale load has finished.
    const h = harness();
    const early = h.cache.get('u1', h.gatedLoad);
    h.write();
    h.cache.invalidate();
    h.release();
    await early;
    check(h.cache.peek('u1') === undefined, 'a load finished after an invalidation is not stored');
    const next = await h.cache.get('u1', h.instantLoad);
    check(next[0].id === 'v2', `so the next read loads the written data (${next[0].id})`);
  }

  // ---- 4. Failure ----
  console.log('# Failure');
  {
    const h = harness();
    let attempts = 0;
    const failing = async () => {
      attempts += 1;
      throw new Error('offline');
    };
    const one = h.cache.get('u1', failing).then(() => 'ok', e => (e as Error).message);
    const two = h.cache.get('u1', failing).then(() => 'ok', e => (e as Error).message);
    check((await one) === 'offline' && (await two) === 'offline', 'a failed load rejects for every reader that joined it');
    check(attempts === 1, 'they shared the one failed attempt');
    check(h.cache.peek('u1') === undefined, 'the failure is not cached');
    const retry = await h.cache.get('u1', h.instantLoad);
    check(retry[0].id === 'v1', 'the next read tries again and succeeds');
  }

  // ---- 5. Isolation ----
  console.log('# Isolation');
  {
    const h = harness();
    const first = await h.cache.get('u1', h.instantLoad);
    first.push({ id: 'mine', tags: [] });
    first[0].id = 'changed';
    first[0].tags.push('z');
    const second = await h.cache.get('u1', h.instantLoad);
    check(second.length === 1 && second[0].id === 'v1' && second[0].tags.length === 1, "one caller's changes do not reach the next");
    const peeked = h.cache.peek('u1')!;
    peeked[0].id = 'changed-again';
    check((await h.cache.get('u1', h.instantLoad))[0].id === 'v1', 'nor do changes to a peeked value');
    const a = h.cache.get('u3', h.gatedLoad);
    const b = h.cache.get('u3', h.gatedLoad);
    h.release();
    const [ra, rb] = await Promise.all([a, b]);
    ra[0].id = 'x';
    check(rb[0].id === 'v1', 'readers who shared one load still get separate copies');
  }

  // ---- 6. Wiring ----
  console.log('# Wiring');
  const firestore = read('src/services/firestore.ts');
  check(/closetCache = createSessionCache<ClosetItem\[\]>/.test(firestore) && /profileCache = createSessionCache<PersonalStyleProfile \| null>/.test(firestore), 'the closet and the style profile are read through the cache');
  const closetBlock = firestore.slice(firestore.indexOf('export const closetService'), firestore.indexOf('// Get closet stats'));
  ['create: async', 'update: async', 'delete: async', 'markWorn: async'].forEach(method => {
    const from = closetBlock.indexOf(method);
    const body = closetBlock.slice(from, closetBlock.indexOf('\n  },', from));
    check(from >= 0 && /invalidateClosetCache\(\);/.test(body), `closetService.${method.replace(': async', '')} drops the cached closet`);
  });
  const writers: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name) && !full.replace(/\\/g, '/').endsWith('src/services/firestore.ts')) {
        if (/(collection|doc)\(db, 'closetItems'/.test(fs.readFileSync(full, 'utf8'))) writers.push(path.relative(path.join(__dirname, '..'), full));
      }
    }
  };
  walk(path.join(__dirname, '../src'));
  check(writers.length === 0, `closet documents are touched outside closetService (the cache cannot see those writes): ${writers.join(', ')}`);
  const saveBlock = firestore.slice(firestore.indexOf('saveStyleProfile: async'));
  check(/invalidateStyleProfileCache\(\);\s*\n\s*bumpProfileRevision\(\);/.test(saveBlock), 'saving the style profile drops the cached profile before screens are told to reload');
  check(/invalidateUserDataCaches\(\);/.test(read('src/contexts/AuthContext.tsx')), 'a change of account drops both caches');
  check(/invalidateUserDataCaches\(\);/.test(read('src/screens/ClosetScreen.tsx')) && /invalidateUserDataCaches\(\);/.test(read('src/screens/HomeScreen.tsx')), 'pull-to-refresh on Closet and Home drops both caches');

  const adapter = read('src/services/affiliateNetwork.ts');
  const mock = adapter.slice(adapter.indexOf('class MockCatalogAdapter'), adapter.indexOf('class AmazonAssociatesAdapter'));
  check(!/setTimeout\(resolve/.test(mock), 'the in-memory catalogue has no artificial delay');

  const weather = read('src/services/weatherService.ts');
  check(/WEATHER_FRESH_MS/.test(weather) && /getLastKnownPositionAsync/.test(weather) && /inFlight/.test(weather), 'weather is cached, shared between callers, and uses the last known position first');
  check(/if \(weather\) \{\s*\n\s*memory = /.test(weather), 'only a real weather reading is cached - a failed lookup is retried');
  check(/withinOrUndefined\(/.test(read('src/services/trendRemixService.ts')), 'trend ranking does not wait indefinitely on the city-style AI call');
  check(/onEdit/.test(read('src/screens/ExploreScreen.tsx')), 'Explore shows before its AI-written edit arrives');
  check(/preloadScreens\(\)/.test(read('src/navigation/AppNavigator.tsx')), 'lazy screens are preloaded once the signed-in app is up');

  console.log(`\n${checks} checks.`);
  if (failures) {
    console.log(`${failures} failure(s).`);
    process.exit(1);
  }
  console.log('OK - shared reads are loaded once, never served stale after a write, and never cache a failure.');
})();

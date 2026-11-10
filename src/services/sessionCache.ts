/**
 * A small in-memory cache for data that many screens read and few actions
 * change - the closet, the style profile.
 *
 * The app's screens each load what they need when they open, which is simple
 * and correct but meant the same Firestore query ran again and again: Home,
 * then Closet, then Shop each fetched the whole closet inside a minute, and
 * each waited on that round trip before it could draw. This cache makes the
 * second reader free without changing what any of them receive:
 *
 *   - readers that ask while a load is in the air share that one load;
 *   - a loaded value is reused until `ttlMs` has passed;
 *   - `invalidate()` drops everything - call it on every write;
 *   - a load that was already in the air when `invalidate()` ran still
 *     answers its own callers, but is NOT stored (it may predate the write);
 *   - a load that fails is never stored, and rejects exactly as an uncached
 *     read would, so callers' error handling is untouched;
 *   - every caller gets its own copy, so nothing one screen does to its data
 *     can reach another's.
 *
 * Pure - no Firebase, no React Native - so scripts/auditSessionCache.ts
 * exercises the real thing.
 */

export interface SessionCache<T> {
  /** The cached value for `key`, loading it with `load` when there is none. */
  get(key: string, load: () => Promise<T>): Promise<T>;
  /** The cached value if there is a fresh one, without loading. */
  peek(key: string): T | undefined;
  /** Every fresh cached value (copies), for lookups across keys. */
  values(): T[];
  /** Drops everything, and stops any load in the air from being stored. */
  invalidate(): void;
}

export function createSessionCache<T>(options: {
  ttlMs: number;
  /** Returns an independent copy of a value, handed to each caller. */
  copy: (value: T) => T;
  /** Clock, injectable for tests. */
  now?: () => number;
}): SessionCache<T> {
  const now = options.now ?? Date.now;
  const entries = new Map<string, { at: number; value: T }>();
  const inFlight = new Map<string, Promise<T>>();
  let epoch = 0;

  const fresh = (key: string) => {
    const entry = entries.get(key);
    return entry && now() - entry.at < options.ttlMs ? entry : undefined;
  };

  return {
    async get(key, load) {
      const entry = fresh(key);
      if (entry) return options.copy(entry.value);

      let pending = inFlight.get(key);
      if (!pending) {
        const startedIn = epoch;
        pending = load().then(value => {
          if (startedIn === epoch) entries.set(key, { at: now(), value });
          return value;
        });
        inFlight.set(key, pending);
        const settle = () => {
          if (inFlight.get(key) === pending) inFlight.delete(key);
        };
        pending.then(settle, settle);
      }
      return options.copy(await pending);
    },

    peek(key) {
      const entry = fresh(key);
      return entry ? options.copy(entry.value) : undefined;
    },

    values() {
      return [...entries.keys()]
        .map(key => fresh(key))
        .filter((entry): entry is { at: number; value: T } => !!entry)
        .map(entry => options.copy(entry.value));
    },

    invalidate() {
      epoch += 1;
      entries.clear();
      inFlight.clear();
    },
  };
}

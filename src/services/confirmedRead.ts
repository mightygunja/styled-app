/**
 * Reads that only count once the server has answered.
 *
 * When Firestore believes it is offline - one failed connection attempt is
 * enough, and a phone waking from the background does that routinely - a
 * read does not fail. It is answered from the local copy, and this app keeps
 * no local copy between launches, so that answer is whatever happens to be
 * in memory:
 *
 *   - the closet query comes back EMPTY;
 *   - the user document comes back holding only the fields of a write still
 *     waiting to be sent (the once-per-launch presence write), so it has no
 *     style profile.
 *
 * Read literally, that is "a new account": no clothes, no survey taken. Home
 * offered the survey again, the stylist asked for a profile, and the closet
 * invited the member to add their first pieces - to people who had done all
 * of it. Worse, a save made on top of that answer replaces the real profile.
 *
 * Every such answer says so (`metadata.fromCache`). This helper refuses to
 * take one at face value: it waits a moment and asks the server directly,
 * and if the server still cannot be reached it reports the read as
 * unconfirmed so the caller treats it as a failed read, never as "nothing
 * there".
 *
 * Pure - no Firebase import - so scripts/auditSurveyGate.ts runs the real
 * thing.
 */

export interface ReadSnapshot {
  metadata: { fromCache: boolean };
}

export interface ConfirmedRead<S> {
  /** The server's answer when confirmed; otherwise the local copy (may be undefined if even that failed). */
  snapshot: S | undefined;
  /** True only when the server answered. */
  confirmed: boolean;
}

/** How long to wait before each direct attempt at the server. */
export const SERVER_RETRY_DELAYS_MS = [700, 1800];

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function readConfirmed<S extends ReadSnapshot>(
  /** The ordinary read (server first, local copy when offline). */
  read: () => Promise<S>,
  /** The same read, answered by the server or not at all. */
  readFromServer: () => Promise<S>,
  options: { delaysMs?: number[]; sleep?: (ms: number) => Promise<void> } = {}
): Promise<ConfirmedRead<S>> {
  const delays = options.delaysMs ?? SERVER_RETRY_DELAYS_MS;
  const sleep = options.sleep ?? wait;

  let local: S | undefined;
  let firstError: unknown;
  try {
    const snapshot = await read();
    if (!snapshot.metadata.fromCache) return { snapshot, confirmed: true };
    local = snapshot;
  } catch (error) {
    firstError = error;
  }

  for (const delay of delays) {
    await sleep(delay);
    try {
      const snapshot = await readFromServer();
      if (!snapshot.metadata.fromCache) return { snapshot, confirmed: true };
    } catch {
      // Still unreachable; try again or give up below.
    }
  }

  // Nothing at all came back: fail exactly as the ordinary read did.
  if (local === undefined && firstError !== undefined) throw firstError;
  return { snapshot: local, confirmed: false };
}

/** Thrown when a read could not be confirmed by the server. A failed read, not an empty one. */
export class UnconfirmedReadError extends Error {
  readonly code = 'read-unconfirmed';
  constructor(what: string) {
    super(`Could not confirm ${what} with the server (offline?)`);
    this.name = 'UnconfirmedReadError';
  }
}

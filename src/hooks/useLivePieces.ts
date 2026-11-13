/**
 * Real products for a set of piece phrases, for one department - for pages
 * that draw first with their curated pieces and swap real ones in when the
 * live feed answers (the logged-out guides and trend page).
 *
 * Returns the feed's answer by phrase, growing as answers arrive; empty until
 * then, and empty for good when the feed is off. Phrases nobody has asked
 * for before are found a few at a time on the server, so the hook asks again
 * for whatever was not reached, as long as each answer brings something new.
 *
 * Never runs while the static snapshot of a page is being taken
 * (scripts/prerender sets window.__PRERENDER__): that HTML is what search
 * engines and affiliate reviewers read, and it must be the same on every
 * build - the curated pieces, with their own links.
 */

import { useEffect, useState } from 'react';
import { Product } from '../models/product';
import { liveTrendPieces } from '../services/affiliateNetwork';

const ROUNDS = 4;

export function isPrerendering(): boolean {
  return typeof window !== 'undefined' && (window as any).__PRERENDER__ === true;
}

export function useLivePieces(phrases: string[], focus: 'womens' | 'mens'): Record<string, Product[]> {
  const [found, setFound] = useState<Record<string, Product[]>>({});
  // A stable key: callers build the phrase list on every render.
  const key = `${focus}|${Array.from(new Set(phrases)).sort().join('|')}`;

  useEffect(() => {
    const wanted = Array.from(new Set(phrases));
    setFound({});
    if (wanted.length === 0 || isPrerendering()) return;
    let cancelled = false;
    const gathered: Record<string, Product[]> = {};
    const ask = async (round: number): Promise<void> => {
      const missing = wanted.filter(phrase => !(phrase in gathered));
      if (missing.length === 0 || round > ROUNDS) return;
      const answer = await liveTrendPieces(missing, focus);
      if (cancelled) return;
      const before = Object.keys(gathered).length;
      Object.assign(gathered, answer);
      if (Object.keys(gathered).length === before) return;
      setFound({ ...gathered });
      await ask(round + 1);
    };
    ask(1).catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return found;
}

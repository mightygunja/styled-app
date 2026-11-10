import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getProfileRevision, subscribeProfileRevision } from '../services/profileEvents';

/**
 * Reloads a screen when the style profile has been saved since it last loaded.
 *
 * The screen is assumed to load on mount, so the revision at mount is the one
 * it "has". Coming back into focus with a newer revision calls `reload` once;
 * with the same revision it does nothing, so returning from a product page
 * keeps the grid and its scroll position. A save that lands while the screen
 * is in front reloads it there and then.
 */
export function useProfileRevisionReload(reload: () => void): void {
  const loadedRevision = useRef(getProfileRevision());
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useFocusEffect(
    useCallback(() => {
      const catchUp = () => {
        const current = getProfileRevision();
        if (current === loadedRevision.current) return;
        loadedRevision.current = current;
        reloadRef.current();
      };
      catchUp();
      return subscribeProfileRevision(catchUp);
    }, [])
  );
}

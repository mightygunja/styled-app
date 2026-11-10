import { useCallback, useEffect, useState } from 'react';
import { getCurrentUserId } from '../services/api';
import { WardrobeFocus } from '../services/departmentFit';
import { buildProfileMatchContext } from '../services/profileMatchContext';
import { useProfileRevisionReload } from './useProfileRevisionReload';

/**
 * The account's wardrobe choice, for screens that only need to know which
 * department they are dressing (see services/departmentFit.ts).
 *
 * Undefined until it has loaded AND when the account has not chosen - both
 * mean "show nothing gendered", so callers treat them the same. Re-read when
 * the style profile is saved, because a tab can stay mounted behind the
 * profile builder.
 */
export function useWardrobeFocus(): WardrobeFocus {
  const [focus, setFocus] = useState<WardrobeFocus>(undefined);

  const load = useCallback(() => {
    buildProfileMatchContext(getCurrentUserId())
      .then(profile => setFocus(profile?.wardrobeFocus))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useProfileRevisionReload(load);

  return focus;
}

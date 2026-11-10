import React from 'react';
import { View } from 'react-native';

/**
 * Web build of the Login hero.
 *
 * The animated card stack is the one thing on the web that needs Reanimated
 * and gesture-handler - about 900 KB that every page used to download and
 * parse before anything could be shown. Here it is loaded right after the
 * page instead: the sign-in form appears at once, and the cards arrive a
 * moment later into a space already reserved for them, so nothing jumps.
 */
const Animated = React.lazy(() => import('./LoginHeroImpl'));

// The hero's own height: the card stage (168 x 1.36 + 96) plus its caption
// (46 + 2). Kept in step with LoginHeroImpl's styles.
const RESERVED_HEIGHT = Math.round(168 * 1.36) + 96 + 48;

export default function LoginHero() {
  return (
    <React.Suspense fallback={<View style={{ height: RESERVED_HEIGHT }} />}>
      <Animated />
    </React.Suspense>
  );
}

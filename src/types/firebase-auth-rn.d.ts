/**
 * Declares `getReactNativePersistence`, which exists at runtime but not in the
 * type definitions TypeScript resolves.
 *
 * The `firebase` wrapper package's exports map hardcodes
 * `"types": "./auth/dist/auth/index.d.ts"` for `./auth` with no `react-native`
 * condition, so TypeScript always reads the web-flavoured declarations. The
 * runtime path is different: `firebase/auth` re-exports `@firebase/auth`, and
 * `@firebase/auth` DOES declare a `react-native` condition resolving to
 * `dist/rn/index.js`, which exports this function. Metro follows that
 * condition; tsc never sees it.
 *
 * The result was a permanent error in src/config/firebase.ts that looked like
 * auth persistence was broken. It is not - sessions do survive app restarts.
 * But a standing error in the baseline is exactly where a real one goes
 * unnoticed, which is the actual cost of leaving it.
 *
 * Remove this file if Firebase ever adds a `react-native` types condition to
 * the wrapper package, or if the app imports `@firebase/auth` directly.
 */

import 'firebase/auth';

declare module 'firebase/auth' {
  /**
   * React Native persistence backed by an AsyncStorage-compatible store.
   * Only present in the react-native build of @firebase/auth.
   */
  export function getReactNativePersistence(
    storage: unknown
  ): import('firebase/auth').Persistence;
}

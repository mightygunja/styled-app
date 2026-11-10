/**
 * The gesture root the app is wrapped in. On native this is gesture-handler's
 * root view, exactly as before. The web build (GestureRoot.web.tsx) is a plain
 * View: nothing in the signed-in web app uses gesture-handler, and importing
 * it here put the whole library in the web startup bundle.
 */
export { GestureHandlerRootView as default } from 'react-native-gesture-handler';

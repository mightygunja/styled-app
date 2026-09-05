import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { affiliateImpressions } from './src/services/affiliateImpressions';
import { fontAssets, colors } from './src/theme/designSystem';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Web layout lives in the navigators, not here: a full-bleed top nav bar on
// desktop with per-surface content widths (see AppNavigator's screenLayout
// frames and src/theme/responsive.ts) — a real web app, not a phone column.

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Impression counts buffer locally and flush on a threshold; without this a
  // user who browses a little and closes the app would never flush at all, and
  // tap-through would be measured against a denominator missing those views.
  useEffect(() => {
    affiliateImpressions.flush().catch(() => {});
  }, []);

  // Web: hide native scrollbars. Screens scroll inside centred columns, so
  // the browser would paint its scrollbar at the column edge — a bar floating
  // mid-page. Scrolling itself is untouched (wheel, trackpad, keys, touch);
  // the gutters forward wheel events too (see ContentFrame in AppNavigator).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = `
      * { scrollbar-width: none; -ms-overflow-style: none; }
      *::-webkit-scrollbar { width: 0; height: 0; display: none; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Native keeps the gate: the splash screen covers the wait, so holding here
  // costs nothing visible and avoids a flash of system text.
  //
  // Web deliberately does not. Blocking on useFonts meant six .ttf faces
  // (~370KB over 11 requests) had to finish before ANYTHING painted, so the
  // first seconds were an empty bone rectangle. Rendering immediately shows
  // real content straight away; the faces swap in when they arrive.
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') {
    return <View style={{ flex: 1, backgroundColor: colors.bone }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

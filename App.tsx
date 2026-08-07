import React, { useEffect } from 'react';
import { View } from 'react-native';
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

  if (!fontsLoaded && !fontError) {
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

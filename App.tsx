import React, { useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { affiliateImpressions } from './src/services/affiliateImpressions';
import { fontAssets, colors } from './src/theme/designSystem';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * On web the app renders as a centred column at phone width against a paper
 * ground, hairline-edged - the pattern mobile-first products use on desktop.
 * Letting a phone-designed layout stretch across a monitor is how web builds
 * end up looking broken; constraining it is what makes the same codebase
 * read as deliberate on both.
 */
function WebShell({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={shellStyles.page}>
      <View style={shellStyles.column}>{children}</View>
    </View>
  );
}

const shellStyles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.bone,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.hair,
  },
});

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
        <WebShell>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </WebShell>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

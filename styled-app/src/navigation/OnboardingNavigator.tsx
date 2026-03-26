/**
 * Onboarding Navigator
 * 
 * Linear progression flow for StyleDNA onboarding.
 * Users cannot skip steps - must complete in order.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Onboarding screens (to be created)
import OnboardingWelcomeScreen from '../screens/onboarding/OnboardingWelcomeScreen';
import OnboardingLifestyleScreen from '../screens/onboarding/OnboardingLifestyleScreen';
import OnboardingArchetypesScreen from '../screens/onboarding/OnboardingArchetypesScreen';
import OnboardingColorsScreen from '../screens/onboarding/OnboardingColorsScreen';
import OnboardingAvoidScreen from '../screens/onboarding/OnboardingAvoidScreen';
import OnboardingGuidanceScreen from '../screens/onboarding/OnboardingGuidanceScreen';
import OnboardingCompleteScreen from '../screens/onboarding/OnboardingCompleteScreen';

export type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingLifestyle: undefined;
  OnboardingArchetypes: undefined;
  OnboardingColors: undefined;
  OnboardingAvoid: undefined;
  OnboardingGuidance: undefined;
  OnboardingComplete: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Onboarding Navigator
 * 
 * Linear progression:
 * 1. Welcome
 * 2. Lifestyle weights
 * 3. Style archetypes
 * 4. Color preferences
 * 5. Avoid rules
 * 6. Guidance level
 * 7. Complete
 * 
 * Navigation restrictions:
 * - Back button disabled on first screen
 * - Users must use "Next" button to progress
 * - Cannot navigate directly to later steps
 * - Gesture-based back navigation disabled
 */
export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,  // Prevent swipe-back gesture
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="OnboardingWelcome" 
        component={OnboardingWelcomeScreen}
        options={{
          gestureEnabled: false,  // Cannot go back from welcome
        }}
      />
      <Stack.Screen 
        name="OnboardingLifestyle" 
        component={OnboardingLifestyleScreen}
      />
      <Stack.Screen 
        name="OnboardingArchetypes" 
        component={OnboardingArchetypesScreen}
      />
      <Stack.Screen 
        name="OnboardingColors" 
        component={OnboardingColorsScreen}
      />
      <Stack.Screen 
        name="OnboardingAvoid" 
        component={OnboardingAvoidScreen}
      />
      <Stack.Screen 
        name="OnboardingGuidance" 
        component={OnboardingGuidanceScreen}
      />
      <Stack.Screen 
        name="OnboardingComplete" 
        component={OnboardingCompleteScreen}
        options={{
          gestureEnabled: false,  // Cannot go back from complete
        }}
      />
    </Stack.Navigator>
  );
}

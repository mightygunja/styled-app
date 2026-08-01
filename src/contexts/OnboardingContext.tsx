/**
 * Onboarding Context
 * 
 * Manages partial PersonalStyleProfile state during onboarding flow.
 * Data is persisted across steps but not submitted until completion.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PersonalStyleProfile, DEFAULT_PERSONAL_STYLE_PROFILE } from '../models/personalStyleProfile';

interface OnboardingContextType {
  partialStyleProfile: Partial<PersonalStyleProfile>;
  updateLifestyleWeights: (weights: PersonalStyleProfile['lifestyleWeights']) => void;
  updateStyleArchetypes: (archetypes: string[]) => void;
  updateColorProfile: (colorProfile: PersonalStyleProfile['colorProfile']) => void;
  updateAvoidRules: (avoidRules: string[]) => void;
  updateGuidanceLevel: (guidanceLevel: PersonalStyleProfile['guidanceLevel']) => void;
  resetOnboarding: () => void;
  getCompletedStyleProfile: () => PersonalStyleProfile;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [partialStyleProfile, setPartialStyleProfile] = useState<Partial<PersonalStyleProfile>>({
    lifestyleWeights: DEFAULT_PERSONAL_STYLE_PROFILE.lifestyleWeights,
    styleArchetypes: [],
    avoidRules: [],
    colorProfile: {
      primary: [],
      secondary: [],
      stretch: [],
    },
    fitPreferences: {},
    guidanceLevel: 'guided',
  });

  const updateLifestyleWeights = (weights: PersonalStyleProfile['lifestyleWeights']) => {
    setPartialStyleProfile(prev => ({
      ...prev,
      lifestyleWeights: weights,
    }));
  };

  const updateStyleArchetypes = (archetypes: string[]) => {
    setPartialStyleProfile(prev => ({
      ...prev,
      styleArchetypes: archetypes,
    }));
  };

  const updateColorProfile = (colorProfile: PersonalStyleProfile['colorProfile']) => {
    setPartialStyleProfile(prev => ({
      ...prev,
      colorProfile,
    }));
  };

  const updateAvoidRules = (avoidRules: string[]) => {
    setPartialStyleProfile(prev => ({
      ...prev,
      avoidRules,
    }));
  };

  const updateGuidanceLevel = (guidanceLevel: PersonalStyleProfile['guidanceLevel']) => {
    setPartialStyleProfile(prev => ({
      ...prev,
      guidanceLevel,
    }));
  };

  const resetOnboarding = () => {
    setPartialStyleProfile({
      lifestyleWeights: DEFAULT_PERSONAL_STYLE_PROFILE.lifestyleWeights,
      styleArchetypes: [],
      avoidRules: [],
      colorProfile: {
        primary: [],
        secondary: [],
        stretch: [],
      },
      fitPreferences: {},
      guidanceLevel: 'guided',
    });
  };

  const getCompletedStyleProfile = (): PersonalStyleProfile => {
    return {
      ...DEFAULT_PERSONAL_STYLE_PROFILE,
      ...partialStyleProfile,
    } as PersonalStyleProfile;
  };

  return (
    <OnboardingContext.Provider
      value={{
        partialStyleProfile,
        updateLifestyleWeights,
        updateStyleArchetypes,
        updateColorProfile,
        updateAvoidRules,
        updateGuidanceLevel,
        resetOnboarding,
        getCompletedStyleProfile,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

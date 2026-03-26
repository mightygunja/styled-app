/**
 * Onboarding Context
 * 
 * Manages partial StyleDNA state during onboarding flow.
 * Data is persisted across steps but not submitted until completion.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { StyleDNA, DEFAULT_STYLE_DNA } from '../models/styleDNA';

interface OnboardingContextType {
  partialStyleDNA: Partial<StyleDNA>;
  updateLifestyleWeights: (weights: StyleDNA['lifestyleWeights']) => void;
  updateStyleArchetypes: (archetypes: string[]) => void;
  updateColorProfile: (colorProfile: StyleDNA['colorProfile']) => void;
  updateAvoidRules: (avoidRules: string[]) => void;
  updateGuidanceLevel: (guidanceLevel: StyleDNA['guidanceLevel']) => void;
  resetOnboarding: () => void;
  getCompletedStyleDNA: () => StyleDNA;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [partialStyleDNA, setPartialStyleDNA] = useState<Partial<StyleDNA>>({
    lifestyleWeights: DEFAULT_STYLE_DNA.lifestyleWeights,
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

  const updateLifestyleWeights = (weights: StyleDNA['lifestyleWeights']) => {
    setPartialStyleDNA(prev => ({
      ...prev,
      lifestyleWeights: weights,
    }));
  };

  const updateStyleArchetypes = (archetypes: string[]) => {
    setPartialStyleDNA(prev => ({
      ...prev,
      styleArchetypes: archetypes,
    }));
  };

  const updateColorProfile = (colorProfile: StyleDNA['colorProfile']) => {
    setPartialStyleDNA(prev => ({
      ...prev,
      colorProfile,
    }));
  };

  const updateAvoidRules = (avoidRules: string[]) => {
    setPartialStyleDNA(prev => ({
      ...prev,
      avoidRules,
    }));
  };

  const updateGuidanceLevel = (guidanceLevel: StyleDNA['guidanceLevel']) => {
    setPartialStyleDNA(prev => ({
      ...prev,
      guidanceLevel,
    }));
  };

  const resetOnboarding = () => {
    setPartialStyleDNA({
      lifestyleWeights: DEFAULT_STYLE_DNA.lifestyleWeights,
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

  const getCompletedStyleDNA = (): StyleDNA => {
    return {
      ...DEFAULT_STYLE_DNA,
      ...partialStyleDNA,
    } as StyleDNA;
  };

  return (
    <OnboardingContext.Provider
      value={{
        partialStyleDNA,
        updateLifestyleWeights,
        updateStyleArchetypes,
        updateColorProfile,
        updateAvoidRules,
        updateGuidanceLevel,
        resetOnboarding,
        getCompletedStyleDNA,
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

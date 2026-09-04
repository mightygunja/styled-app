/**
 * Onboarding Lifestyle Screen
 * Step 2: Lifestyle weights configuration
 * 
 * Uses tap-based multi-select to set lifestyle distribution.
 * Persists to partial PersonalStyleProfile state without submitting.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { normalizeLifestyleWeights } from '../../models/personalStyleProfile';

import { radius } from '../../theme/designSystem';
type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingLifestyle'>;

type LifestyleCategory = 'work' | 'casual' | 'social' | 'travel';

interface LifestyleOption {
  key: LifestyleCategory;
  label: string;
  description: string;
  icon: string;
}

const LIFESTYLE_OPTIONS: LifestyleOption[] = [
  {
    key: 'work',
    label: 'Work',
    description: 'Professional settings, meetings, office',
    icon: '💼',
  },
  {
    key: 'casual',
    label: 'Casual',
    description: 'Everyday wear, running errands, relaxing',
    icon: '👕',
  },
  {
    key: 'social',
    label: 'Social',
    description: 'Dates, events, going out with friends',
    icon: '🎉',
  },
  {
    key: 'travel',
    label: 'Travel',
    description: 'Vacations, trips, exploring',
    icon: '✈️',
  },
];

export default function OnboardingLifestyleScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { partialStyleProfile, updateLifestyleWeights } = useOnboarding();

  // Initialize from existing partial state
  const [selectedCategories, setSelectedCategories] = useState<Set<LifestyleCategory>>(
    new Set(
      Object.entries(partialStyleProfile.lifestyleWeights || {})
        .filter(([_, value]) => value > 0)
        .map(([key]) => key as LifestyleCategory)
    )
  );

  const toggleCategory = (category: LifestyleCategory) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    // Convert selected categories to weights
    const selectedCount = selectedCategories.size;
    
    if (selectedCount === 0) {
      // If nothing selected, use defaults
      updateLifestyleWeights({
        work: 0.4,
        casual: 0.4,
        social: 0.15,
        travel: 0.05,
      });
    } else {
      // Distribute weight equally among selected categories
      const equalWeight = 1.0 / selectedCount;
      const weights = {
        work: selectedCategories.has('work') ? equalWeight : 0,
        casual: selectedCategories.has('casual') ? equalWeight : 0,
        social: selectedCategories.has('social') ? equalWeight : 0,
        travel: selectedCategories.has('travel') ? equalWeight : 0,
      };
      
      // Normalize to ensure sum is exactly 1.0
      updateLifestyleWeights(normalizeLifestyleWeights(weights));
    }

    // Navigate to next step
    navigation.navigate('OnboardingArchetypes');
  };

  const canProceed = selectedCategories.size > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>How do you spend your time?</Text>
        <Text style={styles.subtitle}>
          Select all that apply. We'll use this to personalize your wardrobe.
        </Text>

        <View style={styles.optionsContainer}>
          {LIFESTYLE_OPTIONS.map(option => {
            const isSelected = selectedCategories.has(option.key);
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => toggleCategory(option.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionSelected]}>
                    {option.description}
                  </Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedCategories.size > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Your wardrobe will be:</Text>
            <Text style={styles.previewText}>
              {Math.round((1 / selectedCategories.size) * 100)}% {Array.from(selectedCategories).join(', ')}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={[styles.nextButtonText, !canProceed && styles.nextButtonTextDisabled]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#161616',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5E5A55',
    marginBottom: 24,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 2,
    borderColor: '#DED7CF',
  },
  optionCardSelected: {
    borderColor: '#2B1F1A',
    backgroundColor: '#F8F6F3',
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#2B1F1A',
  },
  optionDescription: {
    fontSize: 14,
    color: '#5E5A55',
  },
  optionDescriptionSelected: {
    color: '#2B1F1A',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: '#DED7CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2B1F1A',
    borderColor: '#2B1F1A',
  },
  checkmark: {
    color: '#F1ECE7',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F8F6F3',
    borderRadius: radius.sm,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E5A55',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 16,
    color: '#161616',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#DED7CF',
  },
  nextButton: {
    height: 56,
    backgroundColor: '#2B1F1A',
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#DED7CF',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1ECE7',
  },
  nextButtonTextDisabled: {
    color: '#9CA3AF',
  },
});

/**
 * Onboarding Guidance Screen
 * Step 6: Mindset/Guidance level selection
 * 
 * Final step before completion - captures how user wants to receive recommendations.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { PersonalStyleProfile } from '../../models/personalStyleProfile';

import { radius } from '../../theme/designSystem';
type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingGuidance'>;

type GuidanceLevel = PersonalStyleProfile['guidanceLevel'];

interface GuidanceOption {
  level: GuidanceLevel;
  title: string;
  description: string;
  example: string;
}

const GUIDANCE_OPTIONS: GuidanceOption[] = [
  {
    level: 'inspiration',
    title: 'Inspire me',
    description: 'Show me possibilities and let me explore. I like to make my own choices.',
    example: 'You might like this combination...',
  },
  {
    level: 'guided',
    title: 'Guide me',
    description: 'Give me suggestions with reasons. Help me understand what works.',
    example: 'This works because the colors complement each other...',
  },
  {
    level: 'directive',
    title: 'Tell me what to wear',
    description: 'Just give me clear recommendations. I trust your expertise.',
    example: 'Wear this outfit today. It matches your style perfectly.',
  },
];

export default function OnboardingGuidanceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { partialStyleProfile, updateGuidanceLevel } = useOnboarding();

  const [selectedLevel, setSelectedLevel] = useState<GuidanceLevel>(
    partialStyleProfile.guidanceLevel || 'guided'
  );

  const handleNext = () => {
    // Save guidance level to partial state
    updateGuidanceLevel(selectedLevel);
    
    // Navigate to completion screen
    navigation.navigate('OnboardingComplete');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>How should we help you?</Text>
        <Text style={styles.subtitle}>
          Choose how you'd like to receive outfit recommendations
        </Text>

        <View style={styles.optionsContainer}>
          {GUIDANCE_OPTIONS.map(option => {
            const isSelected = selectedLevel === option.level;
            return (
              <TouchableOpacity
                key={option.level}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => setSelectedLevel(option.level)}
                activeOpacity={0.7}
              >
                <View style={styles.optionHeader}>
                  <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                    {option.title}
                  </Text>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </View>
                <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionSelected]}>
                  {option.description}
                </Text>
                <View style={styles.exampleContainer}>
                  <Text style={[styles.exampleLabel, isSelected && styles.exampleLabelSelected]}>
                    Example:
                  </Text>
                  <Text style={[styles.exampleText, isSelected && styles.exampleTextSelected]}>
                    "{option.example}"
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>
            💡 You can always change this later in your settings
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Complete Setup</Text>
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
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: 20,
    borderWidth: 2,
    borderColor: '#DED7CF',
  },
  optionCardSelected: {
    borderColor: '#2B1F1A',
    backgroundColor: '#F8F6F3',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#161616',
  },
  optionTitleSelected: {
    color: '#2B1F1A',
  },
  optionDescription: {
    fontSize: 15,
    color: '#5E5A55',
    lineHeight: 22,
    marginBottom: 12,
  },
  optionDescriptionSelected: {
    color: '#2B1F1A',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: '#DED7CF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#2B1F1A',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: '#2B1F1A',
  },
  exampleContainer: {
    backgroundColor: '#F4F1ED',
    padding: 12,
    borderRadius: radius.sm,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E5A55',
    marginBottom: 4,
  },
  exampleLabelSelected: {
    color: '#2B1F1A',
  },
  exampleText: {
    fontSize: 14,
    color: '#5E5A55',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  exampleTextSelected: {
    color: '#2B1F1A',
  },
  noteContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F8F6F3',
    borderRadius: radius.sm,
  },
  noteText: {
    fontSize: 14,
    color: '#5E5A55',
    textAlign: 'center',
    lineHeight: 20,
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
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1ECE7',
  },
});

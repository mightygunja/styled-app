/**
 * Onboarding Archetypes Screen
 * Step 3: Style descriptors/archetypes selection
 * 
 * Captures user's style instinct with friendly, non-judgmental language.
 * Persists to partial PersonalStyleProfile state without submitting.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { STYLE_ARCHETYPES } from '../../models/personalStyleProfile';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingArchetypes'>;

export default function OnboardingArchetypesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { partialStyleProfile, updateStyleArchetypes } = useOnboarding();

  // Initialize from existing partial state
  const [selectedArchetypes, setSelectedArchetypes] = useState<Set<string>>(
    new Set(partialStyleProfile.styleArchetypes || [])
  );

  const toggleArchetype = (archetype: string) => {
    setSelectedArchetypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(archetype)) {
        newSet.delete(archetype);
      } else {
        newSet.add(archetype);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    // Save selected archetypes to partial state
    updateStyleArchetypes(Array.from(selectedArchetypes));
    
    // Navigate to next step
    navigation.navigate('OnboardingColors');
  };

  const canProceed = selectedArchetypes.size > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What's your style vibe?</Text>
        <Text style={styles.subtitle}>
          Pick the words that feel like you. There's no wrong answer—just what feels right.
        </Text>

        <View style={styles.archetypesContainer}>
          {Object.entries(STYLE_ARCHETYPES).map(([key, archetype]) => {
            const isSelected = selectedArchetypes.has(key);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.archetypeCard, isSelected && styles.archetypeCardSelected]}
                onPress={() => toggleArchetype(key)}
                activeOpacity={0.7}
              >
                <View style={styles.archetypeHeader}>
                  <Text style={[styles.archetypeName, isSelected && styles.archetypeNameSelected]}>
                    {archetype.name}
                  </Text>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </View>
                <Text style={[styles.archetypeDescription, isSelected && styles.archetypeDescriptionSelected]}>
                  {archetype.description}
                </Text>
                <View style={styles.keywordsContainer}>
                  {archetype.keywords.slice(0, 3).map((keyword, index) => (
                    <View key={index} style={styles.keywordBadge}>
                      <Text style={[styles.keywordText, isSelected && styles.keywordTextSelected]}>
                        {keyword}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedArchetypes.size > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Your style:</Text>
            <Text style={styles.previewText}>
              {Array.from(selectedArchetypes).map(key => STYLE_ARCHETYPES[key as keyof typeof STYLE_ARCHETYPES].name).join(', ')}
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
  archetypesContainer: {
    gap: 12,
  },
  archetypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#DED7CF',
  },
  archetypeCardSelected: {
    borderColor: '#2B1F1A',
    backgroundColor: '#F8F6F3',
  },
  archetypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  archetypeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#161616',
  },
  archetypeNameSelected: {
    color: '#2B1F1A',
  },
  archetypeDescription: {
    fontSize: 14,
    color: '#5E5A55',
    marginBottom: 12,
    lineHeight: 20,
  },
  archetypeDescriptionSelected: {
    color: '#2B1F1A',
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F4F1ED',
    borderRadius: 12,
  },
  keywordText: {
    fontSize: 12,
    color: '#5E5A55',
  },
  keywordTextSelected: {
    color: '#2B1F1A',
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    borderRadius: 8,
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
    borderRadius: 12,
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

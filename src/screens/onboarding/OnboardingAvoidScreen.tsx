/**
 * Onboarding Avoid Screen
 * Step 5: Avoid rules
 * 
 * Captures what user prefers not to wear with friendly, non-judgmental language.
 * Avoid-rules are stored explicitly in partial PersonalStyleProfile state.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useOnboarding } from '../../contexts/OnboardingContext';

import { radius } from '../../theme/designSystem';
type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingAvoid'>;

// Common avoid-rules with friendly, non-judgmental descriptions
const COMMON_AVOID_OPTIONS = [
  { key: 'tight', label: 'Too tight', description: 'Prefer more breathing room' },
  { key: 'loose', label: 'Too loose', description: 'Like a more fitted look' },
  { key: 'formal', label: 'Too formal', description: 'Prefer casual vibes' },
  { key: 'casual', label: 'Too casual', description: 'Prefer polished looks' },
  { key: 'trendy', label: 'Too trendy', description: 'Prefer timeless pieces' },
  { key: 'loud', label: 'Too bold', description: 'Prefer subtle styles' },
  { key: 'plain', label: 'Too plain', description: 'Like more personality' },
  { key: 'revealing', label: 'Too revealing', description: 'Prefer more coverage' },
];

export default function OnboardingAvoidScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { partialStyleProfile, updateAvoidRules } = useOnboarding();

  // Initialize from existing partial state
  const [selectedAvoidRules, setSelectedAvoidRules] = useState<Set<string>>(
    new Set(partialStyleProfile.avoidRules || [])
  );
  const [customRule, setCustomRule] = useState('');

  const toggleAvoidRule = (rule: string) => {
    setSelectedAvoidRules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rule)) {
        newSet.delete(rule);
      } else {
        newSet.add(rule);
      }
      return newSet;
    });
  };

  const addCustomRule = () => {
    if (customRule.trim()) {
      setSelectedAvoidRules(prev => new Set([...prev, customRule.trim().toLowerCase()]));
      setCustomRule('');
    }
  };

  const removeCustomRule = (rule: string) => {
    setSelectedAvoidRules(prev => {
      const newSet = new Set(prev);
      newSet.delete(rule);
      return newSet;
    });
  };

  const handleNext = () => {
    // Explicitly store avoid-rules to partial state
    updateAvoidRules(Array.from(selectedAvoidRules));
    
    // Navigate to next step
    navigation.navigate('OnboardingGuidance');
  };

  const handleSkip = () => {
    // Store empty avoid-rules explicitly
    updateAvoidRules([]);
    navigation.navigate('OnboardingGuidance');
  };

  // Get custom rules (not in common options)
  const customRules = Array.from(selectedAvoidRules).filter(
    rule => !COMMON_AVOID_OPTIONS.some(opt => opt.key === rule)
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Anything you'd rather skip?</Text>
        <Text style={styles.subtitle}>
          We all have preferences! Let us know what doesn't work for you—no judgment, just better recommendations.
        </Text>

        <View style={styles.optionsContainer}>
          {COMMON_AVOID_OPTIONS.map(option => {
            const isSelected = selectedAvoidRules.has(option.key);
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => toggleAvoidRule(option.key)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
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

        <View style={styles.customSection}>
          <Text style={styles.customLabel}>Add your own (optional)</Text>
          <View style={styles.customInputContainer}>
            <TextInput
              style={styles.customInput}
              placeholder="e.g., stripes, turtlenecks..."
              placeholderTextColor="#9CA3AF"
              value={customRule}
              onChangeText={setCustomRule}
              onSubmitEditing={addCustomRule}
            />
            <TouchableOpacity
              style={[styles.addButton, !customRule.trim() && styles.addButtonDisabled]}
              onPress={addCustomRule}
              disabled={!customRule.trim()}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {customRules.length > 0 && (
            <View style={styles.customRulesContainer}>
              {customRules.map(rule => (
                <TouchableOpacity
                  key={rule}
                  style={styles.customRuleTag}
                  onPress={() => removeCustomRule(rule)}
                >
                  <Text style={styles.customRuleText}>{rule}</Text>
                  <Text style={styles.removeIcon}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {selectedAvoidRules.size > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>We'll avoid:</Text>
            <Text style={styles.previewText}>
              {Array.from(selectedAvoidRules).join(', ')}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip this step</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
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
    marginBottom: 24,
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
    borderColor: '#C62828',
    backgroundColor: '#FEF2F2',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#C62828',
  },
  optionDescription: {
    fontSize: 14,
    color: '#5E5A55',
  },
  optionDescriptionSelected: {
    color: '#991B1B',
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
    backgroundColor: '#C62828',
    borderColor: '#C62828',
  },
  checkmark: {
    color: '#F1ECE7',
    fontSize: 16,
    fontWeight: '600',
  },
  customSection: {
    marginBottom: 24,
  },
  customLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 12,
  },
  customInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  customInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#161616',
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  addButton: {
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: '#2B1F1A',
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#DED7CF',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1ECE7',
  },
  customRulesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  customRuleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C62828',
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 12,
    gap: 8,
  },
  customRuleText: {
    fontSize: 14,
    color: '#F1ECE7',
    textTransform: 'capitalize',
  },
  removeIcon: {
    fontSize: 20,
    color: '#F1ECE7',
    fontWeight: '600',
  },
  previewContainer: {
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 16,
    color: '#7F1D1D',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#DED7CF',
  },
  skipButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DED7CF',
  },
  skipButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5E5A55',
  },
  nextButton: {
    flex: 1,
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

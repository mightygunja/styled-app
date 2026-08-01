/**
 * Onboarding Complete Screen
 * Final step: Validation, save PersonalStyleProfile, and transition to main app
 * 
 * Validates required fields, saves complete PersonalStyleProfile to user profile,
 * shows trust-emphasizing confirmation, and redirects to outfits screen.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { validatePersonalStyleProfile } from '../../models/personalStyleProfile';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingComplete'>;

export default function OnboardingCompleteScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { getCompletedStyleProfile, resetOnboarding } = useOnboarding();
  
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    // Validate PersonalStyleProfile on mount
    const completedStyleProfile = getCompletedStyleProfile();
    const validation = validatePersonalStyleProfile(completedStyleProfile);
    
    if (!validation.valid) {
      setValidationErrors(validation.errors);
    }
  }, []);

  const handleComplete = async () => {
    setIsSaving(true);

    try {
      // Get completed PersonalStyleProfile
      const completedStyleProfile = getCompletedStyleProfile();
      
      // Validate required fields
      const validation = validatePersonalStyleProfile(completedStyleProfile);
      
      if (!validation.valid) {
        Alert.alert(
          'Incomplete Profile',
          `Please complete the following:\n${validation.errors.join('\n')}`,
          [{ text: 'OK' }]
        );
        setIsSaving(false);
        return;
      }

      // TODO: Save to user profile via API/service
      // Example: await userProfileService.updateStyleProfile(completedStyleProfile);
      console.log('Saving PersonalStyleProfile:', completedStyleProfile);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Reset onboarding state
      resetOnboarding();

      // Navigate to main app (StylingAssistant/Outfits screen)
      // Note: This assumes the navigation structure allows this
      // You may need to adjust based on your actual navigation setup
      navigation.reset({
        index: 0,
        routes: [{ name: 'OnboardingWelcome' as any }], // Placeholder - adjust to actual main screen
      });

      // TODO: Replace with actual navigation to main app
      console.log('Onboarding complete - redirect to outfits screen');
      
    } catch (error) {
      console.error('Error saving PersonalStyleProfile:', error);
      Alert.alert(
        'Save Failed',
        'We couldn\'t save your profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✨</Text>
        </View>
        
        <Text style={styles.title}>Your style profile is ready!</Text>
        
        <Text style={styles.subtitle}>
          We've learned about your preferences, and we're excited to help you look and feel your best.
        </Text>

        <View style={styles.trustMessage}>
          <Text style={styles.trustTitle}>We've got you</Text>
          <Text style={styles.trustText}>
            Your style is unique, and we respect that. Every recommendation is personalized just for you—no trends, no pressure, just what works for your life.
          </Text>
        </View>

        {validationErrors.length > 0 && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>⚠️ Please complete:</Text>
            {validationErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>• {error}</Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.completeButton, isSaving && styles.completeButtonDisabled]} 
          onPress={handleComplete}
          disabled={isSaving || validationErrors.length > 0}
        >
          {isSaving ? (
            <ActivityIndicator color="#F1ECE7" />
          ) : (
            <Text style={styles.completeButtonText}>Start Styling</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.footerNote}>
          You can update your preferences anytime in settings
        </Text>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#161616',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#5E5A55',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 32,
  },
  trustMessage: {
    backgroundColor: '#F8F6F3',
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DED7CF',
  },
  trustTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2B1F1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  trustText: {
    fontSize: 16,
    color: '#5E5A55',
    lineHeight: 24,
    textAlign: 'center',
  },
  errorContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 4,
  },
  footer: {
    padding: 20,
  },
  completeButton: {
    height: 56,
    backgroundColor: '#2B1F1A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  completeButtonDisabled: {
    backgroundColor: '#DED7CF',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1ECE7',
  },
  footerNote: {
    fontSize: 14,
    color: '#5E5A55',
    textAlign: 'center',
  },
});

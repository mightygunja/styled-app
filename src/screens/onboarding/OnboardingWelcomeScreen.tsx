/**
 * Onboarding Welcome Screen
 * First step in the style profile onboarding flow
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

import { radius } from '../../theme/designSystem';
type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingWelcome'>;

export default function OnboardingWelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  const handleNext = () => {
    navigation.navigate('OnboardingLifestyle');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Your Style Profile</Text>
        <Text style={styles.subtitle}>
          Let's build your personalized style profile in a few simple steps
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Get Started</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#161616',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#5E5A55',
    lineHeight: 26,
  },
  footer: {
    padding: 20,
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

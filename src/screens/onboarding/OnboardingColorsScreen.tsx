/**
 * Onboarding Colors Screen
 * Step 4: Color confidence/preferences
 * 
 * Captures primary, secondary, and stretch colors.
 * Stretch colors are subtly explained as colors to explore.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useOnboarding } from '../../contexts/OnboardingContext';

import { radius } from '../../theme/designSystem';
type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingColors'>;

type ColorCategory = 'primary' | 'secondary' | 'stretch';

interface ColorOption {
  name: string;
  hex: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  { name: 'black', hex: '#000000' },
  { name: 'white', hex: '#FFFFFF' },
  { name: 'gray', hex: '#6B7280' },
  { name: 'navy', hex: '#1E3A8A' },
  { name: 'blue', hex: '#3B82F6' },
  { name: 'red', hex: '#DC2626' },
  { name: 'burgundy', hex: '#7F1D1D' },
  { name: 'pink', hex: '#EC4899' },
  { name: 'purple', hex: '#9333EA' },
  { name: 'green', hex: '#10B981' },
  { name: 'olive', hex: '#65A30D' },
  { name: 'yellow', hex: '#EAB308' },
  { name: 'orange', hex: '#F97316' },
  { name: 'brown', hex: '#92400E' },
  { name: 'beige', hex: '#D4B896' },
  { name: 'cream', hex: '#F5F5DC' },
];

export default function OnboardingColorsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { partialStyleProfile, updateColorProfile } = useOnboarding();

  const [activeCategory, setActiveCategory] = useState<ColorCategory>('primary');
  const [selectedColors, setSelectedColors] = useState({
    primary: new Set(partialStyleProfile.colorProfile?.primary || []),
    secondary: new Set(partialStyleProfile.colorProfile?.secondary || []),
    stretch: new Set(partialStyleProfile.colorProfile?.stretch || []),
  });

  const toggleColor = (colorName: string) => {
    setSelectedColors(prev => {
      const newSet = new Set(prev[activeCategory]);
      if (newSet.has(colorName)) {
        newSet.delete(colorName);
      } else {
        newSet.add(colorName);
      }
      return {
        ...prev,
        [activeCategory]: newSet,
      };
    });
  };

  const handleNext = () => {
    // Save color profile to partial state
    updateColorProfile({
      primary: Array.from(selectedColors.primary),
      secondary: Array.from(selectedColors.secondary),
      stretch: Array.from(selectedColors.stretch),
    });

    // Navigate to next step
    navigation.navigate('OnboardingAvoid');
  };

  const canProceed = selectedColors.primary.size > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your color palette</Text>
        <Text style={styles.subtitle}>
          Build your personal color story in three simple steps
        </Text>

        {/* Category Tabs */}
        <View style={styles.categoryTabs}>
          <TouchableOpacity
            style={[styles.categoryTab, activeCategory === 'primary' && styles.categoryTabActive]}
            onPress={() => setActiveCategory('primary')}
          >
            <Text style={[styles.categoryTabText, activeCategory === 'primary' && styles.categoryTabTextActive]}>
              Go-To Colors
            </Text>
            {selectedColors.primary.size > 0 && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{selectedColors.primary.size}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryTab, activeCategory === 'secondary' && styles.categoryTabActive]}
            onPress={() => setActiveCategory('secondary')}
          >
            <Text style={[styles.categoryTabText, activeCategory === 'secondary' && styles.categoryTabTextActive]}>
              Mix-In Colors
            </Text>
            {selectedColors.secondary.size > 0 && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{selectedColors.secondary.size}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryTab, activeCategory === 'stretch' && styles.categoryTabActive]}
            onPress={() => setActiveCategory('stretch')}
          >
            <Text style={[styles.categoryTabText, activeCategory === 'stretch' && styles.categoryTabTextActive]}>
              Explore
            </Text>
            {selectedColors.stretch.size > 0 && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{selectedColors.stretch.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Category Description */}
        <View style={styles.categoryDescription}>
          {activeCategory === 'primary' && (
            <>
              <Text style={styles.categoryDescriptionTitle}>Your go-to colors</Text>
              <Text style={styles.categoryDescriptionText}>
                The colors you love and wear most often. Your wardrobe staples.
              </Text>
            </>
          )}
          {activeCategory === 'secondary' && (
            <>
              <Text style={styles.categoryDescriptionTitle}>Mix-in colors</Text>
              <Text style={styles.categoryDescriptionText}>
                Colors you enjoy for variety and accent pieces. They complement your go-tos.
              </Text>
            </>
          )}
          {activeCategory === 'stretch' && (
            <>
              <Text style={styles.categoryDescriptionTitle}>Colors to explore</Text>
              <Text style={styles.categoryDescriptionText}>
                Colors outside your comfort zone that you're curious about. We'll suggest these occasionally to help you grow your style.
              </Text>
            </>
          )}
        </View>

        {/* Color Grid */}
        <View style={styles.colorGrid}>
          {COLOR_OPTIONS.map(color => {
            const isSelected = selectedColors[activeCategory].has(color.name);
            const isWhite = color.hex === '#FFFFFF';
            
            return (
              <TouchableOpacity
                key={color.name}
                style={[
                  styles.colorButton,
                  { backgroundColor: color.hex },
                  isWhite && styles.colorButtonWhite,
                  isSelected && styles.colorButtonSelected,
                ]}
                onPress={() => toggleColor(color.name)}
                activeOpacity={0.7}
              >
                {isSelected && (
                  <View style={styles.colorCheckmark}>
                    <Text style={[styles.checkmarkText, isWhite && styles.checkmarkTextDark]}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Color Names Preview */}
        {selectedColors[activeCategory].size > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Selected:</Text>
            <Text style={styles.previewText}>
              {Array.from(selectedColors[activeCategory]).join(', ')}
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
        {!canProceed && (
          <Text style={styles.footerHint}>Select at least one go-to color to continue</Text>
        )}
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
  categoryTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: '#DED7CF',
    gap: 6,
  },
  categoryTabActive: {
    borderColor: '#2B1F1A',
    backgroundColor: '#F8F6F3',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E5A55',
  },
  categoryTabTextActive: {
    color: '#2B1F1A',
  },
  categoryBadge: {
    backgroundColor: '#2B1F1A',
    borderRadius: radius.full,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F1ECE7',
  },
  categoryDescription: {
    padding: 16,
    backgroundColor: '#F8F6F3',
    borderRadius: radius.sm,
    marginBottom: 20,
  },
  categoryDescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 4,
  },
  categoryDescriptionText: {
    fontSize: 14,
    color: '#5E5A55',
    lineHeight: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonWhite: {
    borderColor: '#DED7CF',
  },
  colorButtonSelected: {
    borderColor: '#2B1F1A',
    borderWidth: 4,
  },
  colorCheckmark: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkmarkTextDark: {
    color: '#000000',
  },
  previewContainer: {
    marginTop: 20,
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
    textTransform: 'capitalize',
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
  footerHint: {
    fontSize: 14,
    color: '#5E5A55',
    textAlign: 'center',
    marginTop: 12,
  },
});

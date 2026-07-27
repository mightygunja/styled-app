import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import { StyleDNA, STYLE_ARCHETYPES, DEFAULT_STYLE_DNA, normalizeLifestyleWeights } from '../models/styleDNA';
import { styleDnaService } from '../services/firestore';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type BuilderStep = 'lifestyle' | 'archetypes' | 'colors' | 'avoid' | 'fit' | 'guidance' | 'review';

export default function StyleProfileBuilderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { toast, showToast, hideToast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<BuilderStep>('lifestyle');
  const [styleDNA, setStyleDNA] = useState<StyleDNA>(DEFAULT_STYLE_DNA);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  // Color input states
  const [primaryInput, setPrimaryInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const [stretchInput, setStretchInput] = useState('');

  // Avoid rules input state
  const [avoidInput, setAvoidInput] = useState('');

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const existing = await styleDnaService.getStyleDNA(getCurrentUserId());
      if (existing) {
        setStyleDNA(existing);
      }
    } catch (error) {
      console.error('Error loading style profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const steps: BuilderStep[] = ['lifestyle', 'archetypes', 'colors', 'avoid', 'fit', 'guidance', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const updateLifestyleWeight = (key: keyof StyleDNA['lifestyleWeights'], value: number) => {
    const newWeights = { ...styleDNA.lifestyleWeights, [key]: value };
    setStyleDNA({
      ...styleDNA,
      lifestyleWeights: newWeights,
    });
  };

  const toggleArchetype = (archetype: string) => {
    const archetypes = styleDNA.styleArchetypes.includes(archetype)
      ? styleDNA.styleArchetypes.filter(a => a !== archetype)
      : [...styleDNA.styleArchetypes, archetype];
    
    setStyleDNA({ ...styleDNA, styleArchetypes: archetypes });
  };

  const addColor = (category: 'primary' | 'secondary' | 'stretch', color: string) => {
    if (!color.trim()) return;
    
    const colors = [...styleDNA.colorProfile[category]];
    if (!colors.includes(color.toLowerCase())) {
      colors.push(color.toLowerCase());
      setStyleDNA({
        ...styleDNA,
        colorProfile: { ...styleDNA.colorProfile, [category]: colors },
      });
    }
  };

  const removeColor = (category: 'primary' | 'secondary' | 'stretch', color: string) => {
    setStyleDNA({
      ...styleDNA,
      colorProfile: {
        ...styleDNA.colorProfile,
        [category]: styleDNA.colorProfile[category].filter(c => c !== color),
      },
    });
  };

  const addAvoidRule = (rule: string) => {
    if (!rule.trim()) return;
    
    if (!styleDNA.avoidRules.includes(rule.toLowerCase())) {
      setStyleDNA({
        ...styleDNA,
        avoidRules: [...styleDNA.avoidRules, rule.toLowerCase()],
      });
    }
  };

  const removeAvoidRule = (rule: string) => {
    setStyleDNA({
      ...styleDNA,
      avoidRules: styleDNA.avoidRules.filter(r => r !== rule),
    });
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    // Normalize lifestyle weights before saving
    const normalizedDNA = {
      ...styleDNA,
      lifestyleWeights: normalizeLifestyleWeights(styleDNA.lifestyleWeights),
    };

    try {
      setSaving(true);
      await styleDnaService.saveStyleDNA(getCurrentUserId(), normalizedDNA);
      showToast('Style profile saved!', 'success');
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error saving style profile:', error);
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderLifestyleStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How do you split your wardrobe?</Text>
      <Text style={styles.stepSubtitle}>
        Adjust the sliders to show how you divide your clothing needs
      </Text>

      {Object.entries(styleDNA.lifestyleWeights).map(([key, value]) => (
        <View key={key} style={styles.sliderContainer}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sliderLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
            <Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text>
          </View>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${value * 100}%` }]} />
          </View>
          <View style={styles.sliderButtons}>
            <TouchableOpacity
              style={styles.sliderButton}
              onPress={() => updateLifestyleWeight(key as keyof StyleDNA['lifestyleWeights'], Math.max(0, value - 0.05))}
            >
              <Text style={styles.sliderButtonText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sliderButton}
              onPress={() => updateLifestyleWeight(key as keyof StyleDNA['lifestyleWeights'], Math.min(1, value + 0.05))}
            >
              <Text style={styles.sliderButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderArchetypesStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your style vibe?</Text>
      <Text style={styles.stepSubtitle}>Select all that apply (2-3 recommended)</Text>

      <View style={styles.archetypeGrid}>
        {Object.entries(STYLE_ARCHETYPES).map(([key, archetype]) => {
          const isSelected = styleDNA.styleArchetypes.includes(key);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.archetypeCard, isSelected && styles.archetypeCardSelected]}
              onPress={() => toggleArchetype(key)}
            >
              <Text style={[styles.archetypeName, isSelected && styles.archetypeNameSelected]}>
                {archetype.name}
              </Text>
              <Text style={[styles.archetypeDescription, isSelected && styles.archetypeDescriptionSelected]}>
                {archetype.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderColorsStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Your color palette</Text>
        <Text style={styles.stepSubtitle}>Define your go-to colors</Text>

        <View style={styles.colorSection}>
          <Text style={styles.colorSectionTitle}>Primary Colors</Text>
          <Text style={styles.colorSectionSubtitle}>Colors you love and wear frequently</Text>
          <View style={styles.colorInputContainer}>
            <TextInput
              style={styles.colorInput}
              placeholder="Add a color..."
              placeholderTextColor="#9CA3AF"
              value={primaryInput}
              onChangeText={setPrimaryInput}
              onSubmitEditing={() => {
                addColor('primary', primaryInput);
                setPrimaryInput('');
              }}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                addColor('primary', primaryInput);
                setPrimaryInput('');
              }}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.colorTags}>
            {styleDNA.colorProfile.primary.map(color => (
              <TouchableOpacity
                key={color}
                style={styles.colorTag}
                onPress={() => removeColor('primary', color)}
              >
                <Text style={styles.colorTagText}>{color}</Text>
                <Text style={styles.colorTagRemove}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.colorSection}>
          <Text style={styles.colorSectionTitle}>Secondary Colors</Text>
          <Text style={styles.colorSectionSubtitle}>Complementary colors for variety</Text>
          <View style={styles.colorInputContainer}>
            <TextInput
              style={styles.colorInput}
              placeholder="Add a color..."
              placeholderTextColor="#9CA3AF"
              value={secondaryInput}
              onChangeText={setSecondaryInput}
              onSubmitEditing={() => {
                addColor('secondary', secondaryInput);
                setSecondaryInput('');
              }}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                addColor('secondary', secondaryInput);
                setSecondaryInput('');
              }}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.colorTags}>
            {styleDNA.colorProfile.secondary.map(color => (
              <TouchableOpacity
                key={color}
                style={styles.colorTag}
                onPress={() => removeColor('secondary', color)}
              >
                <Text style={styles.colorTagText}>{color}</Text>
                <Text style={styles.colorTagRemove}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.colorSection}>
          <Text style={styles.colorSectionTitle}>Stretch Colors</Text>
          <Text style={styles.colorSectionSubtitle}>Colors to explore occasionally</Text>
          <View style={styles.colorInputContainer}>
            <TextInput
              style={styles.colorInput}
              placeholder="Add a color..."
              placeholderTextColor="#9CA3AF"
              value={stretchInput}
              onChangeText={setStretchInput}
              onSubmitEditing={() => {
                addColor('stretch', stretchInput);
                setStretchInput('');
              }}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                addColor('stretch', stretchInput);
                setStretchInput('');
              }}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.colorTags}>
            {styleDNA.colorProfile.stretch.map(color => (
              <TouchableOpacity
                key={color}
                style={styles.colorTag}
                onPress={() => removeColor('stretch', color)}
              >
                <Text style={styles.colorTagText}>{color}</Text>
                <Text style={styles.colorTagRemove}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderAvoidStep = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>What to avoid?</Text>
        <Text style={styles.stepSubtitle}>
          Style elements you prefer not to wear (e.g., "tight", "trendy", "loud")
        </Text>

        <View style={styles.colorInputContainer}>
          <TextInput
            style={styles.colorInput}
            placeholder="Add a style to avoid..."
            placeholderTextColor="#9CA3AF"
            value={avoidInput}
            onChangeText={setAvoidInput}
            onSubmitEditing={() => {
              addAvoidRule(avoidInput);
              setAvoidInput('');
            }}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              addAvoidRule(avoidInput);
              setAvoidInput('');
            }}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.colorTags}>
          {styleDNA.avoidRules.map(rule => (
            <TouchableOpacity
              key={rule}
              style={[styles.colorTag, styles.avoidTag]}
              onPress={() => removeAvoidRule(rule)}
            >
              <Text style={styles.colorTagText}>{rule}</Text>
              <Text style={styles.colorTagRemove}>×</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderFitStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Fit preferences (Optional)</Text>
      <Text style={styles.stepSubtitle}>
        This helps us recommend flattering silhouettes
      </Text>

      <Text style={styles.fitLabel}>Areas to highlight:</Text>
      <Text style={styles.fitHint}>e.g., shoulders, waist, legs</Text>
      
      <Text style={styles.fitLabel}>Areas to downplay:</Text>
      <Text style={styles.fitHint}>e.g., hips, arms, midsection</Text>
      
      <Text style={styles.skipText}>You can skip this step and add it later</Text>
    </View>
  );

  const renderGuidanceStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How much guidance do you want?</Text>
      <Text style={styles.stepSubtitle}>Choose your preferred styling approach</Text>

      <TouchableOpacity
        style={[
          styles.guidanceOption,
          styleDNA.guidanceLevel === 'inspiration' && styles.guidanceOptionSelected,
        ]}
        onPress={() => setStyleDNA({ ...styleDNA, guidanceLevel: 'inspiration' })}
      >
        <Text style={[
          styles.guidanceTitle,
          styleDNA.guidanceLevel === 'inspiration' && styles.guidanceTitleSelected,
        ]}>
          Inspiration
        </Text>
        <Text style={styles.guidanceDescription}>
          Show me ideas and let me decide
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.guidanceOption,
          styleDNA.guidanceLevel === 'guided' && styles.guidanceOptionSelected,
        ]}
        onPress={() => setStyleDNA({ ...styleDNA, guidanceLevel: 'guided' })}
      >
        <Text style={[
          styles.guidanceTitle,
          styleDNA.guidanceLevel === 'guided' && styles.guidanceTitleSelected,
        ]}>
          Guided
        </Text>
        <Text style={styles.guidanceDescription}>
          Provide suggestions with explanations
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.guidanceOption,
          styleDNA.guidanceLevel === 'directive' && styles.guidanceOptionSelected,
        ]}
        onPress={() => setStyleDNA({ ...styleDNA, guidanceLevel: 'directive' })}
      >
        <Text style={[
          styles.guidanceTitle,
          styleDNA.guidanceLevel === 'directive' && styles.guidanceTitleSelected,
        ]}>
          Directive
        </Text>
        <Text style={styles.guidanceDescription}>
          Give me specific recommendations
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review your style profile</Text>
      <Text style={styles.stepSubtitle}>Everything looks good?</Text>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Lifestyle Split</Text>
        {Object.entries(styleDNA.lifestyleWeights).map(([key, value]) => (
          <Text key={key} style={styles.reviewText}>
            {key.charAt(0).toUpperCase() + key.slice(1)}: {Math.round(value * 100)}%
          </Text>
        ))}
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Style Archetypes</Text>
        <Text style={styles.reviewText}>{styleDNA.styleArchetypes.join(', ') || 'None selected'}</Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Primary Colors</Text>
        <Text style={styles.reviewText}>{styleDNA.colorProfile.primary.join(', ') || 'None added'}</Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Guidance Level</Text>
        <Text style={styles.reviewText}>{styleDNA.guidanceLevel}</Text>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 'lifestyle':
        return renderLifestyleStep();
      case 'archetypes':
        return renderArchetypesStep();
      case 'colors':
        return renderColorsStep();
      case 'avoid':
        return renderAvoidStep();
      case 'fit':
        return renderFitStep();
      case 'guidance':
        return renderGuidanceStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2B1F1A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={handleBack} />
        <Text style={styles.headerTitle}>Build Your Style Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Step {currentStepIndex + 1} of {steps.length}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep !== 'review' ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#F1ECE7" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {toast.visible && (
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DED7CF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#161616',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#DED7CF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2B1F1A',
  },
  progressText: {
    fontSize: 12,
    color: '#5E5A55',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#161616',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#5E5A55',
    marginBottom: 24,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#161616',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B1F1A',
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#DED7CF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#2B1F1A',
  },
  sliderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sliderButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  sliderButtonText: {
    fontSize: 24,
    color: '#161616',
  },
  archetypeGrid: {
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
  archetypeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 4,
  },
  archetypeNameSelected: {
    color: '#2B1F1A',
  },
  archetypeDescription: {
    fontSize: 14,
    color: '#5E5A55',
  },
  archetypeDescriptionSelected: {
    color: '#2B1F1A',
  },
  colorSection: {
    marginBottom: 24,
  },
  colorSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 4,
  },
  colorSectionSubtitle: {
    fontSize: 14,
    color: '#5E5A55',
    marginBottom: 12,
  },
  colorInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  colorInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1ECE7',
  },
  colorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B1F1A',
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 12,
    gap: 8,
  },
  avoidTag: {
    backgroundColor: '#C62828',
  },
  colorTagText: {
    fontSize: 14,
    color: '#F1ECE7',
    textTransform: 'capitalize',
  },
  colorTagRemove: {
    fontSize: 20,
    color: '#F1ECE7',
    fontWeight: '600',
  },
  fitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#161616',
    marginTop: 16,
    marginBottom: 4,
  },
  fitHint: {
    fontSize: 14,
    color: '#5E5A55',
    marginBottom: 12,
  },
  skipText: {
    fontSize: 14,
    color: '#5E5A55',
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
  guidanceOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#DED7CF',
  },
  guidanceOptionSelected: {
    borderColor: '#2B1F1A',
    backgroundColor: '#F8F6F3',
  },
  guidanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 4,
  },
  guidanceTitleSelected: {
    color: '#2B1F1A',
  },
  guidanceDescription: {
    fontSize: 14,
    color: '#5E5A55',
  },
  reviewSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DED7CF',
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#5E5A55',
    marginBottom: 4,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#DED7CF',
    backgroundColor: '#F4F1ED',
  },
  nextButton: {
    height: 56,
    backgroundColor: '#2B1F1A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1ECE7',
  },
  saveButton: {
    height: 56,
    backgroundColor: '#2B1F1A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1ECE7',
  },
});

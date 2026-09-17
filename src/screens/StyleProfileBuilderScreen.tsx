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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import {
  PersonalStyleProfile,
  STYLE_ARCHETYPES,
  DEFAULT_PERSONAL_STYLE_PROFILE,
  normalizeLifestyleWeights,
  WardrobeFocus,
  WOMENS_BODY_TYPES,
  MENS_BODY_TYPES,
} from '../models/personalStyleProfile';
import { rememberWardrobeFocus } from '../services/profileMatchContext';
import { styleProfileService } from '../services/firestore';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors as ds, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type BuilderStep = 'wardrobe' | 'lifestyle' | 'archetypes' | 'colors' | 'avoid' | 'fit' | 'guidance' | 'review';

// Body areas offered on the fit step. Neutral wording that works across
// wardrobes - the Body & Fit analysis writes the same fitPreferences shape.
// Same three answers, same wording, as the first-run survey's department
// question (FOCUS_OPTIONS in OnboardingScreen) - this is where it is edited.
const FOCUS_OPTIONS: Array<{ key: WardrobeFocus; label: string; line: string }> = [
  { key: 'womens', label: 'Womenswear', line: 'Dresses and skirts included — the full range' },
  { key: 'mens', label: 'Menswear', line: 'Tailoring, denim, knits — menswear cuts and sizing' },
  { key: 'all', label: 'A bit of both', line: 'Show everything; I dress across the aisle' },
];

/**
 * The survey clears a chosen build when the department changes, because the
 * build lists are per department. Same rule here: a saved Body & Fit result
 * survives only if its body type is one the new department offers.
 */
function bodyResultFitsFocus(profile: PersonalStyleProfile): boolean {
  const bodyType = profile.bodyAnalysis?.bodyType;
  if (!bodyType) return true;
  if (profile.wardrobeFocus === 'mens') return (MENS_BODY_TYPES as readonly string[]).includes(bodyType);
  if (profile.wardrobeFocus === 'womens') return (WOMENS_BODY_TYPES as readonly string[]).includes(bodyType);
  return true;
}

const FIT_AREAS = ['shoulders', 'chest', 'waist', 'midsection', 'hips', 'legs', 'arms', 'neckline'];

export default function StyleProfileBuilderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { toast, showToast, hideToast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<BuilderStep>('wardrobe');
  const [styleProfile, setStyleProfile] = useState<PersonalStyleProfile>(DEFAULT_PERSONAL_STYLE_PROFILE);
  const [loadingProfile, setLoadingProfile] = useState(true);
  // A failed read must never be mistaken for "no profile": saving replaces the
  // whole styleProfile map, so saving defaults over an unread profile would
  // erase the department, colour analysis and body analysis.
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  // Editing a saved profile: Save is offered on every step, so changing one
  // preference doesn't mean walking the whole wizard.
  const [hasExisting, setHasExisting] = useState(false);

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
      setLoadingProfile(true);
      setLoadError(false);
      const existing = await styleProfileService.getStyleProfile(getCurrentUserId());
      if (existing) {
        setStyleProfile(existing);
        setHasExisting(true);
      }
    } catch (error) {
      console.error('Error loading style profile:', error);
      setLoadError(true);
    } finally {
      setLoadingProfile(false);
    }
  };

  const steps: BuilderStep[] = ['wardrobe', 'lifestyle', 'archetypes', 'colors', 'avoid', 'fit', 'guidance', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const updateLifestyleWeight = (key: keyof PersonalStyleProfile['lifestyleWeights'], value: number) => {
    const newWeights = { ...styleProfile.lifestyleWeights, [key]: value };
    setStyleProfile({
      ...styleProfile,
      lifestyleWeights: newWeights,
    });
  };

  const toggleArchetype = (archetype: string) => {
    const archetypes = styleProfile.styleArchetypes.includes(archetype)
      ? styleProfile.styleArchetypes.filter(a => a !== archetype)
      : [...styleProfile.styleArchetypes, archetype];
    
    setStyleProfile({ ...styleProfile, styleArchetypes: archetypes });
  };

  const addColor = (category: 'primary' | 'secondary' | 'stretch', color: string) => {
    if (!color.trim()) return;
    
    const colors = [...styleProfile.colorProfile[category]];
    if (!colors.includes(color.toLowerCase())) {
      colors.push(color.toLowerCase());
      setStyleProfile({
        ...styleProfile,
        colorProfile: { ...styleProfile.colorProfile, [category]: colors },
      });
    }
  };

  const removeColor = (category: 'primary' | 'secondary' | 'stretch', color: string) => {
    setStyleProfile({
      ...styleProfile,
      colorProfile: {
        ...styleProfile.colorProfile,
        [category]: styleProfile.colorProfile[category].filter(c => c !== color),
      },
    });
  };

  const addAvoidRule = (rule: string) => {
    if (!rule.trim()) return;
    
    if (!styleProfile.avoidRules.includes(rule.toLowerCase())) {
      setStyleProfile({
        ...styleProfile,
        avoidRules: [...styleProfile.avoidRules, rule.toLowerCase()],
      });
    }
  };

  const removeAvoidRule = (rule: string) => {
    setStyleProfile({
      ...styleProfile,
      avoidRules: styleProfile.avoidRules.filter(r => r !== rule),
    });
  };

  // An area can be highlighted or downplayed, never both - selecting it on
  // one list clears it from the other.
  const toggleFitArea = (list: 'highlight' | 'downplay', area: string) => {
    setStyleProfile(prev => {
      const current = prev.fitPreferences[list] || [];
      const adding = !current.includes(area);
      const next = adding ? [...current, area] : current.filter(a => a !== area);
      const other: 'highlight' | 'downplay' = list === 'highlight' ? 'downplay' : 'highlight';
      const otherNext = adding
        ? (prev.fitPreferences[other] || []).filter(a => a !== area)
        : prev.fitPreferences[other] || [];
      return {
        ...prev,
        fitPreferences:
          list === 'highlight'
            ? { highlight: next, downplay: otherNext }
            : { highlight: otherNext, downplay: next },
      };
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
    // Never write over a profile that could not be read.
    if (loadError) return;
    // Normalize lifestyle weights before saving
    const normalizedProfile: PersonalStyleProfile = {
      ...styleProfile,
      lifestyleWeights: normalizeLifestyleWeights(styleProfile.lifestyleWeights),
    };
    // A Body & Fit result from the other department goes with the change, as
    // in the survey. Deleted, not set to undefined - Firestore rejects undefined.
    if (!bodyResultFitsFocus(normalizedProfile)) {
      delete normalizedProfile.bodyAnalysis;
    }

    try {
      setSaving(true);
      await styleProfileService.saveStyleProfile(getCurrentUserId(), normalizedProfile);
      rememberWardrobeFocus(getCurrentUserId(), normalizedProfile.wardrobeFocus);
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

  const renderWardrobeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Whose wardrobe are we dressing?</Text>
      <Text style={styles.stepSubtitle}>
        This decides which cuts, sizes and pieces you'll ever be shown — every recommendation and
        every shopping link stays in your department.
      </Text>

      {FOCUS_OPTIONS.map(option => {
        const selected = styleProfile.wardrobeFocus === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.guidanceOption, selected && styles.guidanceOptionSelected]}
            onPress={() => setStyleProfile(prev => ({ ...prev, wardrobeFocus: option.key }))}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.guidanceTitle, selected && styles.guidanceTitleSelected]}>
              {option.label}
            </Text>
            <Text style={[styles.guidanceDescription, selected && styles.archetypeDescriptionSelected]}>
              {option.line}
            </Text>
          </TouchableOpacity>
        );
      })}

      {!bodyResultFitsFocus(styleProfile) && (
        <Text style={styles.skipText}>
          Your saved Body & Fit result belongs to the other department, so it will be cleared when
          you save. You can retake it from the Style tab.
        </Text>
      )}
    </View>
  );

  const renderLifestyleStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How do you split your wardrobe?</Text>
      <Text style={styles.stepSubtitle}>
        Adjust the sliders to show how you divide your clothing needs
      </Text>

      {/* Each control moves one share on its own, so the total can drift from
          100%. Say so; the split is scaled to 100% on save (and in the review). */}
      <Text style={styles.fitHint}>
        Total: {Math.round(Object.values(styleProfile.lifestyleWeights).reduce((sum, v) => sum + v, 0) * 100)}%
        {' '}— saved scaled to 100%.
      </Text>

      {Object.entries(styleProfile.lifestyleWeights).map(([key, value]) => (
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
              onPress={() => updateLifestyleWeight(key as keyof PersonalStyleProfile['lifestyleWeights'], Math.max(0, value - 0.05))}
            >
              <Text style={styles.sliderButtonText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sliderButton}
              onPress={() => updateLifestyleWeight(key as keyof PersonalStyleProfile['lifestyleWeights'], Math.min(1, value + 0.05))}
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
          const isSelected = styleProfile.styleArchetypes.includes(key);
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
              placeholderTextColor={ds.inkFaint}
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
            {styleProfile.colorProfile.primary.map(color => (
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
              placeholderTextColor={ds.inkFaint}
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
            {styleProfile.colorProfile.secondary.map(color => (
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
              placeholderTextColor={ds.inkFaint}
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
            {styleProfile.colorProfile.stretch.map(color => (
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
            placeholderTextColor={ds.inkFaint}
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
          {styleProfile.avoidRules.map(rule => (
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

  const renderFitStep = () => {
    const highlight = styleProfile.fitPreferences.highlight || [];
    const downplay = styleProfile.fitPreferences.downplay || [];
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Fit preferences (Optional)</Text>
        <Text style={styles.stepSubtitle}>
          This helps us recommend silhouettes cut for you
        </Text>

        <Text style={styles.fitLabel}>Areas to highlight:</Text>
        <View style={styles.colorTags}>
          {FIT_AREAS.map(area => {
            const selected = highlight.includes(area);
            return (
              <TouchableOpacity
                key={area}
                style={[styles.colorTag, selected && styles.fitChipSelected]}
                onPress={() => toggleFitArea('highlight', area)}
              >
                <Text style={[styles.colorTagText, selected && styles.fitChipTextSelected]}>
                  {area}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fitLabel}>Areas to downplay:</Text>
        <View style={styles.colorTags}>
          {FIT_AREAS.map(area => {
            const selected = downplay.includes(area);
            return (
              <TouchableOpacity
                key={area}
                style={[styles.colorTag, selected && styles.fitChipSelected]}
                onPress={() => toggleFitArea('downplay', area)}
              >
                <Text style={[styles.colorTagText, selected && styles.fitChipTextSelected]}>
                  {area}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.skipText}>
          Leave both empty to skip - the Body & Fit analysis can fill these in for you later.
        </Text>
      </View>
    );
  };

  const renderGuidanceStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How much guidance do you want?</Text>
      <Text style={styles.stepSubtitle}>Choose your preferred styling approach</Text>

      <TouchableOpacity
        style={[
          styles.guidanceOption,
          styleProfile.guidanceLevel === 'inspiration' && styles.guidanceOptionSelected,
        ]}
        onPress={() => setStyleProfile({ ...styleProfile, guidanceLevel: 'inspiration' })}
      >
        <Text style={[
          styles.guidanceTitle,
          styleProfile.guidanceLevel === 'inspiration' && styles.guidanceTitleSelected,
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
          styleProfile.guidanceLevel === 'guided' && styles.guidanceOptionSelected,
        ]}
        onPress={() => setStyleProfile({ ...styleProfile, guidanceLevel: 'guided' })}
      >
        <Text style={[
          styles.guidanceTitle,
          styleProfile.guidanceLevel === 'guided' && styles.guidanceTitleSelected,
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
          styleProfile.guidanceLevel === 'directive' && styles.guidanceOptionSelected,
        ]}
        onPress={() => setStyleProfile({ ...styleProfile, guidanceLevel: 'directive' })}
      >
        <Text style={[
          styles.guidanceTitle,
          styleProfile.guidanceLevel === 'directive' && styles.guidanceTitleSelected,
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
        <Text style={styles.reviewLabel}>Whose Wardrobe</Text>
        <Text style={styles.reviewText}>
          {FOCUS_OPTIONS.find(o => o.key === styleProfile.wardrobeFocus)?.label ?? 'Not chosen'}
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Lifestyle Split</Text>
        {/* The normalised split - exactly what handleSave writes. */}
        {Object.entries(normalizeLifestyleWeights(styleProfile.lifestyleWeights)).map(([key, value]) => (
          <Text key={key} style={styles.reviewText}>
            {key.charAt(0).toUpperCase() + key.slice(1)}: {Math.round(value * 100)}%
          </Text>
        ))}
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Style Archetypes</Text>
        <Text style={styles.reviewText}>{styleProfile.styleArchetypes.join(', ') || 'None selected'}</Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Primary Colors</Text>
        <Text style={styles.reviewText}>{styleProfile.colorProfile.primary.join(', ') || 'None added'}</Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Secondary Colors</Text>
        <Text style={styles.reviewText}>{styleProfile.colorProfile.secondary.join(', ') || 'None added'}</Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Stretch Colors</Text>
        <Text style={styles.reviewText}>{styleProfile.colorProfile.stretch.join(', ') || 'None added'}</Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Avoid</Text>
        <Text style={styles.reviewText}>{styleProfile.avoidRules.join(', ') || 'None added'}</Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Fit Preferences</Text>
        <Text style={styles.reviewText}>
          {(styleProfile.fitPreferences.highlight?.length || styleProfile.fitPreferences.downplay?.length)
            ? [
                styleProfile.fitPreferences.highlight?.length
                  ? `Highlight: ${styleProfile.fitPreferences.highlight.join(', ')}`
                  : null,
                styleProfile.fitPreferences.downplay?.length
                  ? `Downplay: ${styleProfile.fitPreferences.downplay.join(', ')}`
                  : null,
              ].filter(Boolean).join(' · ')
            : 'None set'}
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Guidance Level</Text>
        <Text style={styles.reviewText}>{styleProfile.guidanceLevel}</Text>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 'wardrobe':
        return renderWardrobeStep();
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
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ds.ink} />
        </View>
      </SafeAreaView>
    );
  }

  // The form is not shown at all when the saved profile could not be read -
  // there is no Save to press, so defaults can never overwrite the real one.
  if (loadError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={[styles.loadingContainer, styles.loadErrorBody]}>
          <Text style={[styles.stepTitle, styles.loadErrorText]}>We couldn't load your style profile</Text>
          <Text style={[styles.stepSubtitle, styles.loadErrorText]}>
            Nothing has been changed. Check your connection and try again — editing is paused until
            your saved profile is in front of you.
          </Text>
          <TouchableOpacity
            style={[styles.nextButton, styles.loadErrorButton]}
            onPress={loadExistingProfile}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.nextButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={handleBack} />
        {/* Back steps through the wizard; this leaves it (unsaved changes are dropped). */}
        {currentStepIndex > 0 && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Close without saving"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color={ds.ink} />
          </TouchableOpacity>
        )}
      </View>

      {/* Step count reads first, then the rule - an eyebrow above a hairline,
          rather than a rounded progress pill with a caption under it. */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Step {currentStepIndex + 1} of {steps.length}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep !== 'review' ? (
          <>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
            {hasExisting && (
              <TouchableOpacity
                style={[styles.saveNowButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
                accessibilityRole="button"
              >
                <Text style={styles.saveNowText}>{saving ? 'Saving…' : 'Save changes now'}</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={ds.bone} />
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
    backgroundColor: ds.bone,
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
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  headerTitle: {
    // Retired in favour of each step carrying its own serif heading - a fixed
    // title above a changing one just competed with it.
    display: 'none',
  },

  // Progress reads as an eyebrow and a hairline rule rather than a rounded
  // pill, matching how progress is expressed elsewhere in the app.
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 4,
  },
  progressText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: ds.tobacco,
    marginBottom: 10,
  },
  progressBar: {
    height: 1,
    backgroundColor: ds.hair,
    overflow: 'hidden',
  },
  progressFill: {
    height: 1,
    backgroundColor: ds.ink,
  },

  content: {
    flex: 1,
  },
  stepContainer: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  stepTitle: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    color: ds.ink,
  },
  stepSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: ds.inkMuted,
    marginTop: 12,
    marginBottom: 32,
  },

  // ---- Lifestyle sliders ----
  sliderContainer: {
    marginBottom: 28,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sliderLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: ds.ink,
  },
  sliderValue: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: ds.camel,
  },
  sliderTrack: {
    height: 2,
    backgroundColor: ds.hair,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 2,
    backgroundColor: ds.ink,
  },
  sliderButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  sliderButton: {
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: ds.hair,
    backgroundColor: ds.card,
  },
  sliderButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: ds.ink,
    lineHeight: 18,
  },

  // ---- Archetypes ----
  archetypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  archetypeCard: {
    borderRadius: radius.md,
    width: '47.5%',
    padding: 16,
    borderWidth: 1,
    borderColor: ds.hair,
    backgroundColor: ds.card,
  },
  archetypeCardSelected: {
    backgroundColor: ds.ink,
    borderColor: ds.ink,
  },
  archetypeName: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: ds.ink,
  },
  archetypeNameSelected: {
    color: ds.bone,
  },
  archetypeDescription: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: ds.inkMuted,
    marginTop: 6,
  },
  archetypeDescriptionSelected: {
    color: ds.bone,
    opacity: 0.7,
  },

  // ---- Colours ----
  colorSection: {
    marginBottom: 32,
  },
  colorSectionTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: ds.tobacco,
    marginBottom: 6,
  },
  colorSectionSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: ds.inkMuted,
    marginBottom: 12,
  },
  colorInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  colorInput: {
    borderRadius: radius.md,
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: ds.ink,
    backgroundColor: ds.card,
    borderWidth: 1,
    borderColor: ds.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  // Secondary action: an outline, so the rust footer CTA stays the one
  // primary on the page.
  addButton: {
    borderRadius: radius.full,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: ds.ink,
  },
  addButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: ds.ink,
  },
  colorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  colorTag: {
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: ds.paper,
    borderWidth: 1,
    borderColor: ds.hair,
  },
  avoidTag: {
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: ds.sand,
    borderWidth: 1,
    borderColor: ds.hair,
  },
  colorTagText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: ds.ink,
    textTransform: 'capitalize',
  },
  colorTagRemove: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: ds.inkFaint,
  },
  fitChipSelected: {
    backgroundColor: ds.ink,
    borderColor: ds.ink,
  },
  fitChipTextSelected: {
    color: ds.bone,
  },

  // ---- Fit ----
  fitLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: ds.tobacco,
    marginTop: 20,
    marginBottom: 8,
  },
  fitHint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: ds.inkMuted,
    marginBottom: 10,
  },
  skipText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: ds.inkFaint,
    textAlign: 'center',
    marginTop: 24,
  },

  // ---- Guidance ----
  guidanceOption: {
    borderRadius: radius.md,
    padding: 18,
    borderWidth: 1,
    borderColor: ds.hair,
    backgroundColor: ds.card,
    marginBottom: 10,
  },
  guidanceOptionSelected: {
    backgroundColor: ds.ink,
    borderColor: ds.ink,
  },
  guidanceTitle: {
    fontFamily: fonts.serif,
    fontSize: 19,
    color: ds.ink,
  },
  guidanceTitleSelected: {
    color: ds.bone,
  },
  guidanceDescription: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: ds.inkMuted,
    marginTop: 6,
  },

  // ---- Review ----
  reviewSection: {
    marginBottom: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: ds.hair,
  },
  reviewLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: ds.tobacco,
    marginBottom: 6,
  },
  reviewText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: ds.ink,
    textTransform: 'capitalize',
  },

  // ---- Footer ----
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: ds.hair,
    backgroundColor: ds.bone,
  },
  loadErrorBody: {
    paddingHorizontal: 24,
  },
  loadErrorText: {
    textAlign: 'center',
  },
  loadErrorButton: {
    alignSelf: 'stretch',
  },
  nextButton: {
    borderRadius: radius.full,
    backgroundColor: ds.rust,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    letterSpacing: 0.4,
    color: ds.bone,
  },
  saveButton: {
    borderRadius: radius.full,
    backgroundColor: ds.rust,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveNowButton: {
    alignItems: 'center',
    paddingTop: 12,
  },
  saveNowText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: ds.tobacco,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    letterSpacing: 0.4,
    color: ds.bone,
  },
});

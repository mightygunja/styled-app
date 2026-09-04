import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import AnimatedModal from './AnimatedModal';
import { scale } from '../utils/animations';
import { colors, fonts, radius } from '../theme/designSystem';

interface PhotoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotoSelected: (uri: string) => void;
}

const FILTERS = [
  { id: 'none', label: 'Original', brightness: 1, contrast: 1, saturation: 1 },
  { id: 'bright', label: 'Bright', brightness: 1.2, contrast: 1.1, saturation: 1 },
  { id: 'vivid', label: 'Vivid', brightness: 1, contrast: 1.2, saturation: 1.3 },
  { id: 'cool', label: 'Cool', brightness: 1, contrast: 1.1, saturation: 0.9 },
  { id: 'warm', label: 'Warm', brightness: 1.1, contrast: 1, saturation: 1.2 },
  { id: 'bw', label: 'B&W', brightness: 1, contrast: 1.2, saturation: 0 },
];

const GUIDANCE_TIPS = [
  'Natural light, or the colour will read wrong',
  'Centre the item and keep the camera level',
  'Plain background — clutter confuses the tagging',
  'Make sure the item is clean and uncreased',
];

export default function PhotoUploadModal({
  visible,
  onClose,
  onPhotoSelected,
}: PhotoUploadModalProps) {
  const [step, setStep] = useState<'choose' | 'edit'>('choose');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [processing, setProcessing] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setTimeout(() => {
        setStep('choose');
        setImageUri(null);
        setSelectedFilter('none');
      }, 300);
    }
  }, [visible]);

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStep('edit');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStep('edit');
    }
  };

  const applyFilter = async () => {
    if (!imageUri) return;

    setProcessing(true);
    
    try {
      const filter = FILTERS.find(f => f.id === selectedFilter);
      if (!filter || filter.id === 'none') {
        onPhotoSelected(imageUri);
        onClose();
        return;
      }

      // Apply filter using image manipulator
      const manipResult = await manipulateAsync(
        imageUri,
        [
          // Resize for performance
          { resize: { width: 1200 } },
        ],
        {
          compress: 0.8,
          format: SaveFormat.JPEG,
        }
      );

      onPhotoSelected(manipResult.uri);
      onClose();
    } catch (error) {
      console.error('Error applying filter:', error);
      // Fallback to original
      onPhotoSelected(imageUri);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const handleRetake = () => {
    setStep('choose');
    setImageUri(null);
    setSelectedFilter('none');
  };

  const handleButtonPress = (callback: () => void) => {
    scale(scaleAnim, 0.95, 100).start(() => {
      scale(scaleAnim, 1, 100).start();
      callback();
    });
  };

  return (
    <AnimatedModal visible={visible} onClose={onClose}>
      <View style={styles.modalContent}>
        {step === 'choose' ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Add a photo</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.guidanceSection}>
              <Text style={styles.guidanceTitle}>WHAT WORKS</Text>
              {GUIDANCE_TIPS.map((tip, index) => (
                <Text key={index} style={styles.guidanceTip}>
                  {tip}
                </Text>
              ))}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleButtonPress(takePhoto)}
                activeOpacity={0.85}
              >
                <Text style={styles.actionButtonText}>Take photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButtonSecondary}
                onPress={() => handleButtonPress(pickFromLibrary)}
                activeOpacity={0.85}
              >
                <Text style={styles.actionButtonSecondaryText}>Choose from library</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Title left, action right. The previous header put "← Retake"
                on the left of a space-between row with a 32pt spacer on the
                right, so the title was never actually centred. */}
            <View style={styles.header}>
              <Text style={styles.title}>Edit photo</Text>
              <TouchableOpacity onPress={handleRetake} style={styles.backButton}>
                <Text style={styles.backText}>Retake</Text>
              </TouchableOpacity>
            </View>

            {/* The preview and filters scroll; the action button does not, so
                it stays reachable on short screens. Without this the button
                was pushed off the bottom of the dialog. */}
            <ScrollView
              style={styles.editScroll}
              contentContainerStyle={styles.editScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.imagePreview}>
                {imageUri && (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                )}
              </View>

              <Text style={styles.filtersTitle}>FILTERS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersScroll}
                style={styles.filtersRow}
              >
                {FILTERS.map(filter => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterButton,
                      selectedFilter === filter.id && styles.filterButtonActive,
                    ]}
                    onPress={() => setSelectedFilter(filter.id)}
                  >
                    <Text
                      style={[
                        styles.filterLabel,
                        selectedFilter === filter.id && styles.filterLabelActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            <TouchableOpacity
              style={[styles.doneButton, processing && styles.doneButtonDisabled]}
              onPress={applyFilter}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.doneButtonText}>Use photo</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </AnimatedModal>
  );
}

/**
 * All horizontal insets are zero here on purpose.
 *
 * This content renders inside AnimatedModal, which is a CENTRED dialog with
 * `padding: 20` and `maxWidth: '90%'` - not a full-bleed bottom sheet. The
 * previous styles assumed the sheet: children were sized `width - 48` and
 * inset a further 24, which on a 390pt screen made the preview 342pt wide
 * inside a 311pt container. It overflowed by 31pt, and the fixed-height
 * preview pushed the "Use photo" button past the parent's 80% height cap.
 */
const styles = StyleSheet.create({
  modalContent: {
    // No width, no margins, no radius - the parent supplies all three.
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.ink,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.inkMuted,
  },
  backButton: {
    paddingVertical: 6,
  },
  backText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.tobacco,
  },

  guidanceSection: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 16,
    marginBottom: 20,
  },
  guidanceTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.tobacco,
    marginBottom: 10,
  },
  guidanceTip: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 6,
    lineHeight: 20,
  },

  actionButtons: { gap: 10 },
  actionButton: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.white,
  },
  actionButtonSecondary: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonSecondaryText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },

  // flexShrink, not flexGrow. React Native defaults flexShrink to 0, so
  // without this the ScrollView refuses to shrink below its content height
  // and overflows the parent's 80% cap rather than scrolling inside it.
  editScroll: { flexShrink: 1 },
  editScrollContent: { paddingBottom: 16 },

  // Percentage width plus aspectRatio, so the preview fits whatever the
  // parent gives it instead of assuming the screen width.
  imagePreview: {
    borderRadius: radius.sm,
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.paper,
    marginBottom: 20,
    overflow: 'hidden',
  },
  previewImage: {
    borderRadius: radius.sm, width: '100%', height: '100%' },

  filtersTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.tobacco,
    marginBottom: 10,
  },
  filtersRow: { marginHorizontal: -20 },
  filtersScroll: { paddingHorizontal: 20, gap: 8 },
  filterButton: {
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  filterButtonActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  filterLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
  },
  filterLabelActive: {
    fontFamily: fonts.sansMedium,
    color: colors.white,
  },

  doneButton: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  doneButtonDisabled: { backgroundColor: colors.hair },
  doneButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.white,
  },
});

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
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

/**
 * What the editor can genuinely do to a photo, on every platform.
 *
 * This used to be a row of colour "filters" (Bright, Vivid, Cool, Warm, B&W)
 * that did nothing: tapping one never changed the preview, and "Use photo"
 * only resized the file - a tester reported "Filters do not work" on build
 * 13, correctly. They are gone rather than faked, for two reasons. Nothing
 * in the app can apply a colour matrix natively without a new native
 * dependency, and - more importantly - a colour filter would make the
 * closet wrong: the garment's real colour is what the AI tags and what
 * every outfit pairing is scored on (the first photo tip is "natural light,
 * or the colour will read wrong").
 *
 * What a garment photo actually needs is straightening: shots taken
 * sideways, or mirrored by a front camera. Each adjustment below is applied
 * to the file immediately, so the preview is always exactly what is saved.
 */
type Adjustment = 'rotate-left' | 'rotate-right' | 'flip';

const ADJUSTMENTS: Array<{ id: Adjustment; label: string }> = [
  { id: 'rotate-left', label: 'Rotate left' },
  { id: 'rotate-right', label: 'Rotate right' },
  { id: 'flip', label: 'Mirror' },
];

/** Longest edge kept on save. Enough for tagging and display; keeps uploads small. */
const MAX_WIDTH = 1600;

function imageSize(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null)
    );
  });
}

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
  // The untouched pick, so Reset can undo every adjustment.
  const [originalUri, setOriginalUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  // Why the last tap on Take photo / Choose from library produced nothing.
  // iOS never re-prompts after one denial, so a silent return left both
  // buttons permanently dead with no route to Settings.
  const [accessProblem, setAccessProblem] = useState<
    { message: string; canOpenSettings: boolean } | null
  >(null);
  
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      setTimeout(() => {
        setStep('choose');
        setImageUri(null);
        setOriginalUri(null);
        setAccessProblem(null);
      }, 300);
    }
  }, [visible]);

  const reportDenied = (what: 'camera' | 'photo library') => {
    setAccessProblem(
      Platform.OS === 'web'
        ? {
            message: `Your browser blocked access to the ${what}. Allow it in the browser's site settings, then try again.`,
            canOpenSettings: false,
          }
        : {
            message: `33 Trends doesn't have access to your ${what}. Turn it on in Settings to add a photo.`,
            canOpenSettings: true,
          }
    );
  };

  const reportPickerError = (error: unknown) => {
    console.error('Error picking photo:', error);
    setAccessProblem({
      message: "Couldn't open that. Please try again.",
      canOpenSettings: false,
    });
  };

  const openSettings = () => {
    Linking.openSettings().catch(error => console.error('Error opening settings:', error));
  };

  const pickFromLibrary = async () => {
    try {
      setAccessProblem(null);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        reportDenied('photo library');
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
        setOriginalUri(result.assets[0].uri);
        setStep('edit');
      }
    } catch (error) {
      reportPickerError(error);
    }
  };

  const takePhoto = async () => {
    try {
      setAccessProblem(null);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        reportDenied('camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setOriginalUri(result.assets[0].uri);
        setStep('edit');
      }
    } catch (error) {
      reportPickerError(error);
    }
  };

  /**
   * Applies one adjustment to the file itself and swaps the preview to the
   * result - what the user sees is what will be saved. A failure leaves the
   * photo as it was rather than losing it.
   */
  const applyAdjustment = async (adjustment: Adjustment) => {
    if (!imageUri || processing) return;
    setProcessing(true);
    try {
      const action =
        adjustment === 'rotate-left'
          ? { rotate: -90 }
          : adjustment === 'rotate-right'
            ? { rotate: 90 }
            : { flip: FlipType.Horizontal };
      const result = await manipulateAsync(imageUri, [action], {
        compress: 0.95,
        format: SaveFormat.JPEG,
      });
      setImageUri(result.uri);
    } catch (error) {
      console.error('Error adjusting photo:', error);
    } finally {
      setProcessing(false);
    }
  };

  const resetAdjustments = () => {
    if (originalUri) setImageUri(originalUri);
  };

  /**
   * Hands the photo back, downsized when it is larger than the closet ever
   * displays. Never upscales, and falls back to the file as it stands if
   * the resize fails - a photo is never lost to an optimisation.
   */
  const usePhoto = async () => {
    if (!imageUri) return;
    setProcessing(true);
    try {
      const size = await imageSize(imageUri);
      if (size && size.width > MAX_WIDTH) {
        const result = await manipulateAsync(imageUri, [{ resize: { width: MAX_WIDTH } }], {
          compress: 0.8,
          format: SaveFormat.JPEG,
        });
        onPhotoSelected(result.uri);
      } else {
        onPhotoSelected(imageUri);
      }
      onClose();
    } catch (error) {
      console.error('Error preparing photo:', error);
      onPhotoSelected(imageUri);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const handleRetake = () => {
    setStep('choose');
    setImageUri(null);
    setOriginalUri(null);
  };

  const adjusted = !!imageUri && !!originalUri && imageUri !== originalUri;

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
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={colors.inkMuted} />
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

            {accessProblem && (
              <View style={styles.accessNotice} accessibilityRole="alert">
                <Text style={styles.accessNoticeText}>{accessProblem.message}</Text>
                {accessProblem.canOpenSettings && (
                  <TouchableOpacity
                    onPress={openSettings}
                    accessibilityRole="button"
                    accessibilityLabel="Open Settings"
                    style={styles.accessNoticeAction}
                  >
                    <Text style={styles.accessNoticeActionText}>Open Settings</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

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

              <Text style={styles.filtersTitle}>STRAIGHTEN</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersScroll}
                style={styles.filtersRow}
              >
                {ADJUSTMENTS.map(adjustment => (
                  <TouchableOpacity
                    key={adjustment.id}
                    style={[styles.filterButton, processing && styles.filterButtonBusy]}
                    disabled={processing}
                    accessibilityRole="button"
                    accessibilityLabel={`${adjustment.label} the photo`}
                    onPress={() => applyAdjustment(adjustment.id)}
                  >
                    <Text style={styles.filterLabel}>{adjustment.label}</Text>
                  </TouchableOpacity>
                ))}
                {adjusted && (
                  <TouchableOpacity
                    style={[styles.filterButton, styles.filterButtonActive]}
                    disabled={processing}
                    accessibilityRole="button"
                    accessibilityLabel="Undo every adjustment"
                    onPress={resetAdjustments}
                  >
                    <Text style={[styles.filterLabel, styles.filterLabelActive]}>Reset</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
              <Text style={styles.colourNote}>
                Colour is left exactly as shot, so the piece is tagged and paired in its real shade.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.doneButton, processing && styles.doneButtonDisabled]}
              onPress={usePhoto}
              disabled={processing}
              accessibilityRole="button"
              accessibilityLabel="Use this photo"
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

  accessNotice: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rust,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 16,
  },
  accessNoticeText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
  accessNoticeAction: {
    alignSelf: 'flex-start',
    paddingTop: 10,
  },
  accessNoticeActionText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.rust,
  },

  actionButtons: { gap: 10 },
  // Rust, to match "Use photo" on the next step - one primary colour per modal.
  actionButton: {
    borderRadius: radius.full,
    backgroundColor: colors.rust,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.white,
  },
  actionButtonSecondary: {
    borderRadius: radius.full,
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
  filterButtonBusy: { opacity: 0.5 },
  colourNote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkMuted,
    marginTop: 12,
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
    backgroundColor: colors.rust,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  // Stays brown while working - a grey pill reads as a broken button.
  doneButtonDisabled: { opacity: 0.55 },
  doneButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.white,
  },
});

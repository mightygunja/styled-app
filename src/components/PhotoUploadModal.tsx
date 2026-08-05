import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import AnimatedModal from './AnimatedModal';
import { scale } from '../utils/animations';
import { colors, fonts } from '../theme/designSystem';

const { width, height } = Dimensions.get('window');

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
  '📸 Use natural lighting',
  '🎯 Center the item in frame',
  '🧹 Remove background clutter',
  '📐 Keep camera level',
  '✨ Ensure item is clean',
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
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Add Photo</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Guidance Tips */}
            <View style={styles.guidanceSection}>
              <Text style={styles.guidanceTitle}>📋 Photo Tips</Text>
              {GUIDANCE_TIPS.map((tip, index) => (
                <Text key={index} style={styles.guidanceTip}>
                  {tip}
                </Text>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleButtonPress(takePhoto)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonEmoji}>📷</Text>
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleButtonPress(pickFromLibrary)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonEmoji}>🖼️</Text>
                <Text style={styles.actionButtonText}>Choose from Library</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Edit Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleRetake} style={styles.backButton}>
                <Text style={styles.backText}>← Retake</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Edit Photo</Text>
              <View style={styles.placeholder} />
            </View>

            {/* Image Preview */}
            <View style={styles.imagePreview}>
              {imageUri && (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Filters */}
            <View style={styles.filtersSection}>
              <Text style={styles.filtersTitle}>Filters</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersScroll}
              >
                {FILTERS.map((filter) => (
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
            </View>

            {/* Done Button */}
            <TouchableOpacity
              style={[styles.doneButton, processing && styles.doneButtonDisabled]}
              onPress={applyFilter}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.doneButtonText}>Use Photo</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: height * 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: colors.inkMuted,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    fontSize: 16,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  placeholder: {
    width: 32,
  },
  guidanceSection: {
    backgroundColor: colors.paper,
    marginHorizontal: 24,
    padding: 20,
    marginBottom: 24,
  },
  guidanceTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
  },
  guidanceTip: {
    fontSize: 15,
    color: colors.inkMuted,
    marginBottom: 8,
    lineHeight: 22,
  },
  actionButtons: {
    paddingHorizontal: 24,
    gap: 16,
  },
  actionButton: {
    backgroundColor: colors.ink,
    padding: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonEmoji: {
    fontSize: 32,
  },
  actionButtonText: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  imagePreview: {
    width: width - 48,
    height: (width - 48) * 1.33,
    backgroundColor: colors.paper,
    marginHorizontal: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  filtersSection: {
    marginBottom: 24,
  },
  filtersTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  filtersScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    // Ink, not hair. This is the selected state - a hairline against a
    // transparent-bordered neighbour is not a distinction anyone would see.
    backgroundColor: colors.sand,
    borderColor: colors.ink,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
  },
  filterLabelActive: {
    color: colors.ink,
  },
  doneButton: {
    backgroundColor: colors.ink,
    marginHorizontal: 24,
    padding: 18,
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonDisabled: {
    opacity: 0.6,
  },
  doneButtonText: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
});

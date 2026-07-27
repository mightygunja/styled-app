import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useNavigation } from '@react-navigation/native';
import { MOCK_USER_ID, closetAPI } from '../services/api';
import PhotoUploadModal from '../components/PhotoUploadModal';
import SuccessAnimation from '../components/SuccessAnimation';

const CATEGORIES = [
  { id: 'tops', label: 'Tops', emoji: '👕' },
  { id: 'bottoms', label: 'Bottoms', emoji: '👖' },
  { id: 'dresses', label: 'Dresses', emoji: '👗' },
  { id: 'outerwear', label: 'Outerwear', emoji: '🧥' },
  { id: 'shoes', label: 'Shoes', emoji: '👟' },
  { id: 'accessories', label: 'Accessories', emoji: '👜' },
];

const COLORS = [
  { id: 'black', label: 'Black', hex: '#000000' },
  { id: 'white', label: 'White', hex: '#FFFFFF' },
  { id: 'gray', label: 'Gray', hex: '#9CA3AF' },
  { id: 'red', label: 'Red', hex: '#EF4444' },
  { id: 'blue', label: 'Blue', hex: '#3B82F6' },
  { id: 'green', label: 'Green', hex: '#10B981' },
  { id: 'yellow', label: 'Yellow', hex: '#F59E0B' },
  { id: 'pink', label: 'Pink', hex: '#EC4899' },
  { id: 'purple', label: 'Purple', hex: '#8B5CF6' },
  { id: 'brown', label: 'Brown', hex: '#92400E' },
];

export default function AddClosetItemScreen() {
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePhotoSelected = (uri: string) => {
    setImageUri(uri);
  };

  const handleSave = async () => {
    if (!imageUri) {
      Alert.alert('Image required', 'Please select or take a photo of your item.');
      return;
    }

    setUploading(true);

    try {
      // Convert image to base64 with very small size
      console.log('Converting image to base64...');
      const base64 = await readAsStringAsync(imageUri, {
        encoding: 'base64',
      });
      const base64Image = `data:image/jpeg;base64,${base64}`;
      
      console.log('Sending to API...');
      
      // Send to API - Firebase will upload to Storage
      const itemData: any = {
        userId: MOCK_USER_ID,
        imageBase64: base64Image, // Firebase API expects imageBase64
        tags: [],
        seasons: [],
      };
      
      if (category) itemData.category = category;
      if (color) itemData.color = color;
      if (brand) itemData.brand = brand;
      if (notes) itemData.notes = notes;
      
      const response = await closetAPI.createItem(itemData);

      console.log('Item saved:', response.data);
      
      // Show success animation
      setShowSuccess(true);
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Item</Text>
          <TouchableOpacity onPress={handleSave} disabled={uploading}>
            <Text style={[styles.saveButton, uploading && styles.saveButtonDisabled]}>
              {uploading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Image Section */}
        <View style={styles.imageSection}>
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
              <TouchableOpacity style={styles.changeImageButton} onPress={() => setShowPhotoModal(true)}>
                <Text style={styles.changeImageText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.imagePlaceholder}
              onPress={() => setShowPhotoModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.imagePlaceholderEmoji}>📸</Text>
              <Text style={styles.imagePlaceholderText}>Add a photo of your item</Text>
              <Text style={styles.imagePlaceholderSubtext}>Tap to get started</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category (AI will detect if not selected)</Text>
          <View style={styles.optionsGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.optionCard,
                  category === cat.id && styles.optionCardSelected,
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Text style={styles.optionEmoji}>{cat.emoji}</Text>
                <Text style={[
                  styles.optionLabel,
                  category === cat.id && styles.optionLabelSelected,
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Primary Color (AI will detect if not selected)</Text>
          <View style={styles.colorGrid}>
            {COLORS.map((col) => (
              <TouchableOpacity
                key={col.id}
                style={[
                  styles.colorOption,
                  { backgroundColor: col.hex },
                  col.hex === '#FFFFFF' && styles.colorOptionWhite,
                  color === col.id && styles.colorOptionSelected,
                ]}
                onPress={() => setColor(col.id)}
              >
                {color === col.id && (
                  <Text style={styles.colorCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Brand Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brand (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Zara, H&M, Nike"
            value={brand}
            onChangeText={setBrand}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Notes Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any notes about this item..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#ef4444" />
            <Text style={styles.uploadingText}>Uploading your item...</Text>
          </View>
        )}
      </ScrollView>
      
      <PhotoUploadModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoSelected={handlePhotoSelected}
      />
      
      <SuccessAnimation
        visible={showSuccess}
        message="Item added to closet! ✨"
        onComplete={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  cancelButton: {
    fontSize: 16,
    color: '#64748b',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  saveButtonDisabled: {
    color: '#cbd5e1',
  },
  imageSection: {
    padding: 20,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeImageText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePlaceholder: {
    aspectRatio: 0.75,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  imagePlaceholderEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  imagePlaceholderSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  optionCardSelected: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#ef4444',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionWhite: {
    borderColor: '#e2e8f0',
  },
  colorOptionSelected: {
    borderColor: '#0f172a',
    borderWidth: 4,
  },
  colorCheckmark: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  uploadingOverlay: {
    padding: 40,
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
});

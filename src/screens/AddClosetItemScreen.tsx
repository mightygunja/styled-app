import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useNavigation } from '@react-navigation/native';
import { getCurrentUserId, closetAPI } from '../services/api';
import PhotoUploadModal from '../components/PhotoUploadModal';
import SuccessAnimation from '../components/SuccessAnimation';
import { colors, fonts } from '../theme/designSystem';

const CATEGORIES = [
  { id: 'tops', label: 'Tops' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'dresses', label: 'Dresses' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'accessories', label: 'Accessories' },
];

const COLORS = [
  { id: 'black', label: 'Black', hex: colors.ink },
  { id: 'white', label: 'White', hex: '#FFFFFF' },
  { id: 'gray', label: 'Gray', hex: colors.inkFaint },
  { id: 'red', label: 'Red', hex: colors.ink },
  { id: 'blue', label: 'Blue', hex: colors.tobacco },
  { id: 'green', label: 'Green', hex: colors.camel },
  { id: 'yellow', label: 'Yellow', hex: colors.camel },
  { id: 'pink', label: 'Pink', hex: '#EC4899' },
  { id: 'purple', label: 'Purple', hex: colors.tobacco },
  { id: 'brown', label: 'Brown', hex: colors.tobacco },
];

export default function AddClosetItemScreen() {
  const navigation = useNavigation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [price, setPrice] = useState<string>('');
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
        userId: getCurrentUserId(),
        imageBase64: base64Image, // Firebase API expects imageBase64
        tags: [],
        seasons: [],
      };
      
      if (category) itemData.category = category;
      if (color) itemData.color = color;
      if (brand) itemData.brand = brand;
      if (notes) itemData.notes = notes;
      if (price && !isNaN(parseFloat(price))) itemData.price = parseFloat(price);
      
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
          <TouchableOpacity onPress={() =>navigation.goBack()}>
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
              <TouchableOpacity style={styles.changeImageButton} onPress={() =>setShowPhotoModal(true)}>
                <Text style={styles.changeImageText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.imagePlaceholder}
              onPress={() =>setShowPhotoModal(true)}
              activeOpacity={0.8}
            >
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
                onPress={() =>setCategory(cat.id)}
              >
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
                  col.hex === colors.white && styles.colorOptionWhite,
                  color === col.id && styles.colorOptionSelected,
                ]}
                onPress={() =>setColor(col.id)}
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
            placeholderTextColor={colors.inkFaint}
          />
        </View>

        {/* Price Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purchase Price (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 45.00"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.inkFaint}
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
            placeholderTextColor={colors.inkFaint}
          />
        </View>

        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color={colors.ink} />
            <Text style={styles.uploadingText}>Uploading your item...</Text>
          </View>
        )}
      </ScrollView>
      
      <PhotoUploadModal
        visible={showPhotoModal}
        onClose={() =>setShowPhotoModal(false)}
        onPhotoSelected={handlePhotoSelected}
      />
      
      <SuccessAnimation
        visible={showSuccess}
        message="Item added to closet! "
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
    backgroundColor: colors.card,
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
    borderBottomColor: colors.hair,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  saveButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  saveButtonDisabled: {
    color: colors.hair,
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
    backgroundColor: colors.paper,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    alignItems: 'center',
  },
  changeImageText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  imagePlaceholder: {
    aspectRatio: 0.75,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.hair,
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
    color: colors.inkMuted,
    marginBottom: 8,
    textAlign: 'center',
  },
  imagePlaceholderSubtext: {
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
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
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.hair,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  optionCardSelected: {
    backgroundColor: colors.sand,
    borderColor: colors.ink,
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: colors.ink,
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
    borderColor: colors.hair,
  },
  colorOptionSelected: {
    borderColor: colors.ink,
    borderWidth: 4,
  },
  colorCheckmark: {
    fontSize: 24,
    color: colors.white,
    fontFamily: fonts.sansSemiBold,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: 12,
    fontSize: 16,
    color: colors.ink,
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
    color: colors.inkMuted,
  },
});

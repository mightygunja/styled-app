import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { RootStackParamList } from '../navigation/types';
import { socialFeedService, PostType } from '../services/socialFeedService';
import { uploadImageToFirebase } from '../services/firebaseStorage';
import SuccessAnimation from '../components/SuccessAnimation';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';
import { colors } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const POST_TYPES: { id: PostType; label: string; icon: string }[] = [
  { id: 'transformation', label: 'Transformation', icon: '✨' },
  { id: 'outfit', label: 'Outfit', icon: '👗' },
  { id: 'closet', label: 'Closet', icon: '🗄️' },
  { id: 'tip', label: 'Style Tip', icon: '💡' },
  { id: 'product', label: 'Product', icon: '🛍️' },
];

export default function CreatePostScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [postType, setPostType] = useState<PostType>('outfit');
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [posting, setPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages([...images, ...newImages].slice(0, 10));
      }
    } catch (error) {
      console.error('Error picking images:', error);
      showToast('Failed to pick images', 'error');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (images.length === 0) {
      showToast('Please add at least one image', 'error');
      return;
    }

    if (caption.trim().length === 0) {
      showToast('Please add a caption', 'error');
      return;
    }

    try {
      setPosting(true);

      const hashtagArray = hashtags
        .split(' ')
        .filter(tag => tag.startsWith('#'))
        .map(tag => tag.slice(1));

      // Upload each local image to Firebase Storage so it's durably viewable
      const uploadedUrls = await Promise.all(
        images.map(async uri => {
          const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
          return uploadImageToFirebase(`data:image/jpeg;base64,${base64}`, getCurrentUserId());
        })
      );

      await socialFeedService.createPost(
        getCurrentUserId(),
        postType,
        uploadedUrls,
        caption,
        hashtagArray,
        'public'
      );

      setShowSuccess(true);
    } catch (error) {
      console.error('Error creating post:', error);
      showToast('Failed to create post', 'error');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Post</Text>
        <TouchableOpacity onPress={handlePost} disabled={posting}>
          {posting ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={styles.postButton}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Post Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Post Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.typeButtons}>
              {POST_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeButton, postType === type.id && styles.typeButtonActive]}
                  onPress={() => setPostType(type.id)}
                >
                  <Text style={styles.typeIcon}>{type.icon}</Text>
                  <Text style={[styles.typeLabel, postType === type.id && styles.typeLabelActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos ({images.length}/10)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.imagesContainer}>
              <TouchableOpacity style={styles.addImageButton} onPress={pickImages}>
                <Text style={styles.addImageIcon}>+</Text>
                <Text style={styles.addImageText}>Add Photos</Text>
              </TouchableOpacity>
              {images.map((image, index) => (
                <View key={index} style={styles.imagePreview}>
                  <Image source={{ uri: image }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Caption */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Caption</Text>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.characterCount}>{caption.length}/500</Text>
        </View>

        {/* Hashtags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hashtags</Text>
          <TextInput
            style={styles.hashtagInput}
            placeholder="#fashion #style #ootd"
            value={hashtags}
            onChangeText={setHashtags}
          />
          <Text style={styles.hashtagHint}>Separate hashtags with spaces</Text>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Posting Tips</Text>
          <Text style={styles.tipText}>• Use clear, well-lit photos</Text>
          <Text style={styles.tipText}>• Write engaging captions</Text>
          <Text style={styles.tipText}>• Add relevant hashtags</Text>
          <Text style={styles.tipText}>• Tag items from your closet</Text>
        </View>
      </ScrollView>

      <SuccessAnimation
        visible={showSuccess}
        message="Post created! 🎉"
        onComplete={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.ink,
  },
  postButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.hair,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: colors.sand,
    borderColor: colors.ink,
  },
  typeIcon: {
    fontSize: 16,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.inkMuted,
  },
  typeLabelActive: {
    color: colors.ink,
    fontWeight: '600',
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  addImageButton: {
    width: 120,
    height: 120,
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.hair,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageIcon: {
    fontSize: 32,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  addImageText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontWeight: '500',
  },
  imagePreview: {
    width: 120,
    height: 120,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  captionInput: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hair,
    minHeight: 120,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 8,
  },
  hashtagInput: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  hashtagHint: {
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 8,
  },
  tipsSection: {
    margin: 20,
    padding: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.tobacco,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#78350f',
    marginBottom: 6,
    lineHeight: 18,
  },
});

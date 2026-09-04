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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { RootStackParamList } from '../navigation/types';
import { socialFeedService, PostType } from '../services/socialFeedService';
import { challengeService } from '../services/challengeService';
import { uploadImageToFirebase } from '../services/firebaseStorage';
import SuccessAnimation from '../components/SuccessAnimation';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const POST_TYPES: { id: PostType; label: string }[] = [
  { id: 'transformation', label: 'Transformation' },
  { id: 'outfit', label: 'Outfit' },
  { id: 'closet', label: 'Closet' },
  { id: 'tip', label: 'Style Tip' },
  { id: 'product', label: 'Product' },
];

export default function CreatePostScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreatePost'>>();
  // Arriving from a challenge: publishing also submits this post as the entry.
  const challengeId = route.params?.challengeId;
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
        const newImages = result.assets.map(asset =>asset.uri);
        setImages([...images, ...newImages].slice(0, 10));
      }
    } catch (error) {
      console.error('Error picking images:', error);
      showToast('Failed to pick images', 'error');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) =>i !== index));
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
        .filter(tag =>tag.startsWith('#'))
        .map(tag =>tag.slice(1));

      // Upload each local image to Firebase Storage so it's durably viewable
      const uploadedUrls = await Promise.all(
        images.map(async uri => {
          const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
          return uploadImageToFirebase(`data:image/jpeg;base64,${base64}`, getCurrentUserId());
        })
      );

      const post = await socialFeedService.createPost(
        getCurrentUserId(),
        postType,
        uploadedUrls,
        caption,
        hashtagArray,
        'public'
      );

      // Entering a challenge is publishing a post INTO it - this is the
      // submission path that used to not exist anywhere in the UI.
      if (challengeId && post?.id) {
        await challengeService
          .submitEntry(challengeId, getCurrentUserId(), post.id, uploadedUrls[0], caption)
          .catch(error => {
            console.error('Post published but challenge entry failed:', error);
            showToast('Posted, but the challenge entry failed — try again from the challenge', 'error');
          });
      }

      setShowSuccess(true);
    } catch (error) {
      console.error('Error creating post:', error);
      showToast('Failed to create post', 'error');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* BackButton is the cancel affordance. The header previously carried a
          second one labelled "Cancel" alongside it. */}
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>COMMUNITY</Text>
          <Text style={styles.title}>Share a look</Text>
          <Text style={styles.subtitle}>
            Post an outfit, a closet edit or a tip. Anyone can see a public post.
          </Text>
        </View>
        {/* Post Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Post Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.typeButtons}>
              {POST_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeButton, postType === type.id && styles.typeButtonActive]}
                  onPress={() =>setPostType(type.id)}
                >
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
                    onPress={() =>removeImage(index)}
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
          <Text style={styles.tipsTitle}>WHAT WORKS</Text>
          <Text style={styles.tipText}>Clear, well-lit photos in front of a plain wall.</Text>
          <Text style={styles.tipText}>Say what the pieces are and where they came from.</Text>
          <Text style={styles.tipText}>Tag items from your closet so people can see the detail.</Text>
        </View>

        <TouchableOpacity
          style={[styles.postButton, posting && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={posting}
        >
          {posting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <SuccessAnimation
        visible={showSuccess}
        message="Posted"
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
    backgroundColor: colors.bone,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  intro: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 34,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    color: colors.inkMuted,
    marginTop: 12,
  },
  postButton: {
    borderRadius: radius.full,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 60,
    backgroundColor: colors.ink,
    paddingVertical: 16,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: colors.hair,
  },
  postButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  sectionTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.hair,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: colors.sand,
    borderColor: colors.ink,
  },
  typeLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
  },
  typeLabelActive: {
    fontFamily: fonts.sansMedium,
    color: colors.ink,
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  addImageButton: {
    borderRadius: radius.sm,
    width: 120,
    height: 120,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageIcon: {
    fontFamily: fonts.sans,
    fontSize: 28,
    color: colors.inkFaint,
    marginBottom: 4,
  },
  addImageText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.inkMuted,
  },
  imagePreview: {
    borderRadius: radius.sm,
    width: 120,
    height: 120,
    position: 'relative',
  },
  previewImage: {
    borderRadius: radius.sm,
    width: '100%',
    height: '100%',
    backgroundColor: colors.paper,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.white,
  },
  captionInput: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 14,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hair,
    minHeight: 120,
  },
  characterCount: {
    textAlign: 'right',
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 8,
  },
  hashtagInput: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 14,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  hashtagHint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 8,
  },
  tipsSection: {
    borderRadius: radius.md,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    backgroundColor: colors.paper,
  },
  tipsTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.tobacco,
    marginBottom: 12,
  },
  tipText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 8,
    lineHeight: 20,
  },
});

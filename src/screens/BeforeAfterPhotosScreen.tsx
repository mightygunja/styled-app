import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../navigation/types';
import { beforeAfterService, BeforeAfterPhoto, PhotoPair } from '../services/beforeAfterService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import SuccessAnimation from '../components/SuccessAnimation';
import { colors, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 2;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type BeforeAfterRouteProp = RouteProp<RootStackParamList, 'BeforeAfterPhotos'>;

export default function BeforeAfterPhotosScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BeforeAfterRouteProp>();
  const { sessionId } = route.params;

  const [beforePhotos, setBeforePhotos] = useState<BeforeAfterPhoto[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<BeforeAfterPhoto[]>([]);
  const [photoPairs, setPhotoPairs] = useState<PhotoPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'pairs' | 'before' | 'after'>('pairs');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadPhotos();
  }, [sessionId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      
      // Create mock data
      await beforeAfterService.createMockTransformation(sessionId);
      
      const [before, after, pairs] = await Promise.all([
        beforeAfterService.getBeforePhotos(sessionId),
        beforeAfterService.getAfterPhotos(sessionId),
        beforeAfterService.getPhotoPairs(sessionId),
      ]);

      setBeforePhotos(before);
      setAfterPhotos(after);
      setPhotoPairs(pairs);
    } catch (error) {
      console.error('Error loading photos:', error);
      showToast('Failed to load photos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type: 'before' | 'after') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(type, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast('Failed to pick image', 'error');
    }
  };

  const uploadPhoto = async (type: 'before' | 'after', uri: string) => {
    try {
      setUploading(true);
      
      const photo = await beforeAfterService.uploadPhoto(
        sessionId,
        type,
        uri,
        'full-outfit',
        undefined,
        true
      );

      if (type === 'before') {
        setBeforePhotos([...beforePhotos, photo]);
      } else {
        setAfterPhotos([...afterPhotos, photo]);
      }

      setShowSuccess(true);
      showToast(`${type === 'before' ? 'Before' : 'After'} photo uploaded!`, 'success');
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast('Failed to upload photo', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Real system share sheet with the real uploaded photo URLs - no
  // fabricated "link copied" claim. The former Export button is gone: there
  // is no media-library integration to genuinely save a file with.
  const handleShare = async (pair: PhotoPair) => {
    try {
      await Share.share({
        message: `Before: ${pair.beforePhoto.imageUrl}\nAfter: ${pair.afterPhoto.imageUrl}`,
      });
    } catch (error) {
      showToast('Could not open the share sheet', 'error');
    }
  };

  const renderPhotoPair = (pair: PhotoPair) => (
    <View key={pair.id} style={styles.pairCard}>
      <View style={styles.comparisonContainer}>
        {/* Before Photo */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: pair.beforePhoto.imageUrl }} style={styles.comparisonPhoto} />
          <View style={styles.photoLabel}>
            <Text style={styles.photoLabelText}>Before</Text>
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>→</Text>
        </View>

        {/* After Photo */}
        <View style={styles.photoContainer}>
          <Image source={{ uri: pair.afterPhoto.imageUrl }} style={styles.comparisonPhoto} />
          <View style={[styles.photoLabel, styles.photoLabelAfter]}>
            <Text style={styles.photoLabelText}>After</Text>
          </View>
        </View>
      </View>

      {pair.caption && (
        <Text style={styles.pairCaption}>{pair.caption}</Text>
      )}

      {/* Actions */}
      <View style={styles.pairActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() =>handleShare(pair)}>
                    <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPhoto = (photo: BeforeAfterPhoto) => (
    <View key={photo.id} style={styles.photoCard}>
      <Image source={{ uri: photo.imageUrl }} style={styles.gridPhoto} />
      <View style={[styles.typeTag, photo.type === 'before' ? styles.typeTagBefore : styles.typeTagAfter]}>
        <Text style={styles.typeTagText}>{photo.type}</Text>
      </View>
      {photo.caption && (
        <Text style={styles.photoCaption} numberOfLines={2}>
          {photo.caption}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Transformation</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pairs' && styles.tabActive]}
          onPress={() =>setActiveTab('pairs')}
        >
          <Text style={[styles.tabText, activeTab === 'pairs' && styles.tabTextActive]}>Comparisons ({photoPairs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'before' && styles.tabActive]}
          onPress={() =>setActiveTab('before')}
        >
          <Text style={[styles.tabText, activeTab === 'before' && styles.tabTextActive]}>Before ({beforePhotos.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'after' && styles.tabActive]}
          onPress={() =>setActiveTab('after')}
        >
          <Text style={[styles.tabText, activeTab === 'after' && styles.tabTextActive]}>After ({afterPhotos.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'pairs' && (
          <View style={styles.pairsContainer}>
            {photoPairs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>◎</Text>
                <Text style={styles.emptyText}>No comparisons yet</Text>
                <Text style={styles.emptySubtext}>Upload before and after photos to create comparisons</Text>
              </View>
            ) : (
              photoPairs.map(renderPhotoPair)
            )}
          </View>
        )}

        {activeTab === 'before' && (
          <View style={styles.gridContainer}>
            {beforePhotos.map(renderPhoto)}
            {beforePhotos.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>○</Text>
                <Text style={styles.emptyText}>No before photos</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'after' && (
          <View style={styles.gridContainer}>
            {afterPhotos.map(renderPhoto)}
            {afterPhotos.length === 0 && (
              <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No after photos</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Upload Buttons */}
      <View style={styles.uploadButtons}>
        <TouchableOpacity
          style={[styles.uploadButton, styles.uploadButtonBefore]}
          onPress={() =>pickImage('before')}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
                            <Text style={styles.uploadText}>Add Before</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.uploadButton, styles.uploadButtonAfter]}
          onPress={() =>pickImage('after')}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
                            <Text style={styles.uploadText}>Add After</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <SuccessAnimation
        visible={showSuccess}
        message="Photo uploaded! "
        onComplete={() =>setShowSuccess(false)}
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
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.inkMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  backButton: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  tabText: {
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  tabTextActive: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  content: {
    flex: 1,
  },
  pairsContainer: {
    padding: 20,
  },
  pairCard: {
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoContainer: {
    flex: 1,
    position: 'relative',
  },
  comparisonPhoto: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.paper,
  },
  photoLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.inkMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoLabelAfter: {
    backgroundColor: colors.camel,
  },
  photoLabelText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
  },
  arrowContainer: {
    width: 40,
    alignItems: 'center',
  },
  arrow: {
    fontSize: 24,
    color: colors.ink,
  },
  pairCaption: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  pairActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  actionText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
  },
  photoCard: {
    width: PHOTO_SIZE,
    position: 'relative',
  },
  gridPhoto: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.paper,
    marginBottom: 8,
  },
  typeTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeTagBefore: {
    backgroundColor: colors.inkMuted,
  },
  typeTagAfter: {
    backgroundColor: colors.camel,
  },
  typeTagText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    textTransform: 'capitalize',
  },
  photoCaption: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  emptyState: {
    width: '100%',
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
    color: colors.ink,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  uploadButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  uploadButtonBefore: {
    backgroundColor: colors.inkMuted,
  },
  uploadButtonAfter: {
    backgroundColor: colors.camel,
  },
  uploadIcon: {
    fontSize: 20,
  },
  uploadText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
});

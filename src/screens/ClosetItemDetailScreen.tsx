import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { closetAPI, getCurrentUserId, ClosetItem } from '../services/api';
import { uploadImageToFirebase } from '../services/firebaseStorage';
import { readAsStringAsync } from 'expo-file-system/legacy';
import PhotoUploadModal from '../components/PhotoUploadModal';
import SuccessAnimation from '../components/SuccessAnimation';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts } from '../theme/designSystem';

type ClosetItemDetailRouteProp = RouteProp<RootStackParamList, 'ClosetItemDetail'>;

export default function ClosetItemDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<ClosetItemDetailRouteProp>();
  const { closetItemId } = route.params;
  
  const [item, setItem] = useState<ClosetItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [removingBackground, setRemovingBackground] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  /**
   * Attaches a photo to an item that was created without one (receipt imports
   * store needsPhoto: true and an empty imageUrl). This is the only add-photo
   * path for an existing item, so the placeholder below has to offer it.
   */
  const handlePhotoSelected = async (uri: string) => {
    setAddingPhoto(true);
    try {
      const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
      const imageUrl = await uploadImageToFirebase(
        `data:image/jpeg;base64,${base64}`,
        getCurrentUserId()
      );
      await closetAPI.update(closetItemId, {
        imageUrl,
        thumbnailUrl: imageUrl,
        needsPhoto: false,
      } as any);
      setItem(prev => (prev ? ({ ...prev, imageUrl } as ClosetItem) : prev));
      showToast('Photo added', 'success');
    } catch (error: any) {
      console.error('Error adding photo:', error);
      Alert.alert('Could not add the photo', error?.message || 'Please try again.');
    } finally {
      setAddingPhoto(false);
    }
  };

  /**
   * Cuts the garment out onto transparency for a cleaner closet grid.
   *
   * The original image URL is kept in `originalImageUrl` rather than being
   * overwritten, so a bad cutout is always recoverable - this is the one edit
   * in the app that visibly destroys the user's own photo if it goes wrong.
   */
  const handleRemoveBackground = async () => {
    if (!item?.imageUrl) return;

    setRemovingBackground(true);
    try {
      const { garmentImageAPI } = await import('../services/firebaseApi');
      const { getCurrentUserId } = await import('../services/api');
      const cutoutUrl = await garmentImageAPI.removeBackground(item.imageUrl, getCurrentUserId());

      await closetAPI.update(closetItemId, {
        imageUrl: cutoutUrl,
        thumbnailUrl: cutoutUrl,
        originalImageUrl: (item as any).originalImageUrl || item.imageUrl,
      } as any);

      setItem(prev => (prev ? ({ ...prev, imageUrl: cutoutUrl } as ClosetItem) : prev));
      showToast('Background removed', 'success');
    } catch (error: any) {
      console.error('Error removing background:', error);
      Alert.alert(
        'Could not remove the background',
        error?.message || 'Please try again. Your original photo has not been changed.'
      );
    } finally {
      setRemovingBackground(false);
    }
  };

  useEffect(() => {
    fetchItemDetail();
  }, [closetItemId]);

  const fetchItemDetail = async () => {
    try {
      const response = await closetAPI.getItemById(closetItemId);
      console.log('Closet item detail:', response.data);
      setItem(response.data);
    } catch (error) {
      console.error('Error fetching item detail:', error);
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this item from your closet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await closetAPI.deleteItem(closetItemId);
              Alert.alert('Deleted', 'Item removed from your closet');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleFindSimilar = async () => {
    try {
      setLoading(true);
      const response = await closetAPI.findSimilar(closetItemId, 10);
      setLoading(false);

      // Navigate even when empty - the screen explains why nothing matched,
      // which is more use than an alert that just says "none found".
      navigation.navigate('SimilarItems' as any, {
        sourceItemId: closetItemId,
        similarItems: response.data,
      });
    } catch (error) {
      setLoading(false);
      console.error('Error finding similar items:', error);
      Alert.alert('Error', 'Failed to find similar items');
    }
  };

  const handleMarkWorn = async () => {
    try {
      await closetAPI.markWorn(closetItemId);
      // Refresh item data
      await fetchItemDetail();
      setShowSuccess(true);
    } catch (error) {
      showToast('Failed to update item', 'error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <BackButton />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Item not found</Text>
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
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteButton}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Image - items imported from receipts arrive without one, so the
            blank slot doubles as the add-photo control. */}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <TouchableOpacity
            style={[styles.image, styles.addPhotoPlaceholder]}
            onPress={() => setShowPhotoModal(true)}
            disabled={addingPhoto}
            activeOpacity={0.8}
          >
            {addingPhoto ? (
              <ActivityIndicator size="large" color={colors.ink} />
            ) : (
              <>
                <Text style={styles.addPhotoText}>No photo yet</Text>
                <Text style={styles.addPhotoSubtext}>Tap to add one — outfit building needs it</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>{item.category}</Text>
          </View>
          {item.subcategory && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>{item.subcategory}</Text>
            </View>
          )}
          {item.brand && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Brand:</Text>
              <Text style={styles.infoValue}>{item.brand}</Text>
            </View>
          )}
        </View>

        {/* Colors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Colors</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Primary:</Text>
            <View style={styles.colorRow}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={styles.infoValue}>{item.color}</Text>
            </View>
          </View>
          {item.secondaryColors && item.secondaryColors.length >0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Secondary:</Text>
              <View style={styles.colorRow}>
                {item.secondaryColors.map((color, index) => (
                  <View key={index} style={[styles.colorDot, { backgroundColor: color }]} />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* AI-Detected Attributes */}
        {(item.pattern || item.neckline || item.sleeveLength || item.fitType || item.fabricTexture || item.style) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI-Detected Attributes</Text>
            {item.pattern && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pattern:</Text>
                <Text style={styles.infoValue}>{item.pattern}</Text>
              </View>
            )}
            {item.neckline && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Neckline:</Text>
                <Text style={styles.infoValue}>{item.neckline}</Text>
              </View>
            )}
            {item.sleeveLength && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sleeve Length:</Text>
                <Text style={styles.infoValue}>{item.sleeveLength}</Text>
              </View>
            )}
            {item.fitType && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fit:</Text>
                <Text style={styles.infoValue}>{item.fitType}</Text>
              </View>
            )}
            {item.fabricTexture && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fabric:</Text>
                <Text style={styles.infoValue}>{item.fabricTexture}</Text>
              </View>
            )}
            {item.style && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Style:</Text>
                <Text style={styles.infoValue}>{item.style}</Text>
              </View>
            )}
          </View>
        )}

        {/* Tags */}
        {item.tags && item.tags.length >0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {item.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Seasons */}
        {item.seasons && item.seasons.length >0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seasons</Text>
            <View style={styles.tagsContainer}>
              {item.seasons.map((season, index) => (
                <View key={index} style={styles.seasonTag}>
                  <Text style={styles.seasonTagText}>{season}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Usage Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Times Worn:</Text>
            <Text style={styles.infoValue}>{item.wornCount}</Text>
          </View>
          {item.lastWornDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Worn:</Text>
              <Text style={styles.infoValue}>
                {new Date(item.lastWornDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {item.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.outfitButton} 
            onPress={() =>navigation.navigate('SmartOutfitBuilder' as any, { sourceItemId: closetItemId })}
          >
            <Text style={styles.outfitButtonText}>Create Outfit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.similarButton} onPress={handleFindSimilar}>
            <Text style={styles.similarButtonText}>Find Similar Items</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.wornButton} onPress={handleMarkWorn}>
            <Text style={styles.wornButtonText}>Mark as Worn Today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cutoutButton, removingBackground && styles.cutoutButtonBusy]}
            onPress={handleRemoveBackground}
            disabled={removingBackground}
          >
            <Text style={styles.cutoutButtonText}>
              {removingBackground ? 'Cutting it out…' : 'Remove background'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <PhotoUploadModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoSelected={uri => {
          setShowPhotoModal(false);
          handlePhotoSelected(uri);
        }}
      />

      <SuccessAnimation
        visible={showSuccess}
        message="Marked as worn!"
        onComplete={() =>setShowSuccess(false)}
        duration={1500}
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
  deleteButton: {
    fontSize: 16,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  content: {
    flex: 1,
  },
  image: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: colors.paper,
  },
  addPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.hair,
    borderStyle: 'dashed',
    padding: 32,
  },
  addPhotoText: {
    fontSize: 16,
    color: colors.inkMuted,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 8,
  },
  addPhotoSubtext: {
    fontSize: 13,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  // The eyebrow treatment used for section headings everywhere else. This
  // screen has no page title - it is led by the garment image - so these are
  // the only headings it has, and an 18pt semibold sans read as a different
  // app sitting under a photo.
  sectionTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.inkMuted,
    fontFamily: fonts.sansMedium,
  },
  infoValue: {
    fontSize: 14,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
    textTransform: 'capitalize',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.hair,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    color: colors.inkMuted,
    fontFamily: fonts.sansMedium,
  },
  seasonTag: {
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seasonTagText: {
    fontSize: 12,
    color: colors.tobacco,
    fontFamily: fonts.sansMedium,
    textTransform: 'capitalize',
  },
  notesText: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  actionButtons: {
    padding: 20,
    gap: 12,
  },
  outfitButton: {
    backgroundColor: colors.ink,
    padding: 16,
    alignItems: 'center',
  },
  outfitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  cutoutButton: {
    backgroundColor: colors.paper,
    padding: 16,
    alignItems: 'center',
  },
  cutoutButtonBusy: {
    opacity: 0.6,
  },
  cutoutButtonText: {
    color: colors.ink,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  similarButton: {
    backgroundColor: colors.tobacco,
    padding: 16,
    alignItems: 'center',
  },
  similarButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  wornButton: {
    backgroundColor: colors.ink,
    padding: 16,
    alignItems: 'center',
  },
  wornButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
});

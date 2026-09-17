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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { closetAPI, getCurrentUserId, ClosetItem } from '../services/api';
import { generateOutfitSuggestions, OutfitSuggestion } from '../services/outfitPairing';
import { outfitsService } from '../services/firestore';
import SuccessAnimation from '../components/SuccessAnimation';
import Button from '../components/Button';
import BackButton from '../components/BackButton';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius, type as textType } from '../theme/designSystem';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 60) / 3;

export default function SmartOutfitBuilderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SmartOutfitBuilder'>>();
  const sourceItemId = route.params?.sourceItemId;
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<ClosetItem[]>([]);
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  // A failed closet read must not be presented as an empty closet.
  const [loadError, setLoadError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [occasion, setOccasion] = useState<'casual' | 'work' | 'formal' | 'athletic'>('casual');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadClosetItems();
  }, []);

  useEffect(() => {
    if (closetItems.length >0) {
      generateSuggestions();
    }
  }, [closetItems, occasion]);

  const loadClosetItems = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response = await closetAPI.getItems(getCurrentUserId());
      setClosetItems(response.data);
      // Arriving from an item's "Create Outfit" button starts the outfit
      // with that piece already in it.
      if (sourceItemId) {
        const source = response.data.find((i: any) => i.id === sourceItemId);
        if (source) setSelectedItems([source as any]);
      }
    } catch (error) {
      console.error('Error loading closet:', error);
      setLoadError(true);
      showToast('Failed to load closet items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = () => {
    const outfitSuggestions = generateOutfitSuggestions(closetItems, occasion, 5);
    setSuggestions(outfitSuggestions);
  };

  const toggleItemSelection = (item: ClosetItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i =>i.id === item.id);
      if (isSelected) {
        return prev.filter(i =>i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const applySuggestion = (suggestion: OutfitSuggestion) => {
    setSelectedItems(suggestion.items);
    showToast('Outfit applied', 'success');
  };

  const saveOutfit = async () => {
    // A double tap used to write two identical outfits before the success
    // animation appeared.
    if (saving) return;
    if (selectedItems.length === 0) {
      showToast('Please select at least one item', 'error');
      return;
    }

    setSaving(true);
    try {
      await outfitsService.create(
        getCurrentUserId(),
        selectedItems.map(item =>item.id),
        occasion
      );
      setShowSuccess(true);
    } catch (error) {
      console.error('Error saving outfit:', error);
      showToast('Failed to save outfit', 'error');
    } finally {
      setSaving(false);
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Back stays available while the closet loads: web has no swipe-back,
            so a slow read used to leave no exit. */}
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading your closet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Pinned, with the primary Save in a footer below: both used to scroll
          away with the closet grid, so after picking pieces there was no
          Save on screen (same flaw testers reported on Add Item). */}
      <View style={styles.header}>
        <BackButton />
      </View>
      <ScrollView>
        {/* Same header as Planner / Packing / Try-on: shared BackButton, tobacco
            eyebrow, serif title. The header "Save" duplicated the footer CTA. */}
        <Text style={styles.eyebrow}>WARDROBE</Text>
        <Text style={styles.title}>Outfit builder</Text>

        {/* Selected Items Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Your Outfit ({selectedItems.length} items)</Text>
          {selectedItems.length === 0 ? (
            <View style={styles.emptyPreview}>
              {closetItems.length === 0 ? (
                <Text style={styles.emptyText}>
                  {loadError
                    ? "Couldn't load your closet"
                    : 'Add items to your closet to build outfits'}
                </Text>
              ) : (
                <>
                  <Text style={styles.emptyText}>Tap items below to build your outfit</Text>
                  <Text style={styles.emptySubtext}>or start from a suggested pairing</Text>
                </>
              )}
            </View>
          ) : (
            <View style={styles.previewGrid}>
              {selectedItems.map(item => (
                <View key={item.id} style={styles.previewItem}>
                  <Image source={{ uri: item.imageUrl }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() =>toggleItemSelection(item)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove from outfit"
                  >
                    <Ionicons name="close" size={14} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {selectedItems.length >0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSelection}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Occasion Selector */}
        <View style={styles.occasionSection}>
          <Text style={styles.sectionTitle}>Occasion</Text>
          <View style={styles.occasionButtons}>
            {(['casual', 'work', 'formal', 'athletic'] as const).map(occ => (
              <TouchableOpacity
                key={occ}
                style={[styles.occasionButton, occasion === occ && styles.occasionButtonActive]}
                onPress={() =>setOccasion(occ)}
              >
                <Text style={[styles.occasionText, occasion === occ && styles.occasionTextActive]}>
                  {occ.charAt(0).toUpperCase() + occ.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Suggested pairings. These come from a local colour/occasion rules
            score, not a model, so they are not called "AI" and the score is
            not shown as a "% match" confidence. */}
        {suggestions.length >0 && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionTitle}>Suggested pairings</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {suggestions.map(suggestion => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={styles.suggestionCard}
                  onPress={() =>applySuggestion(suggestion)}
                >
                  <View style={styles.suggestionImages}>
                    {suggestion.items.slice(0, 3).map((item, idx) => (
                      <Image
                        key={item.id}
                        source={{ uri: item.imageUrl }}
                        style={[styles.suggestionImage, { zIndex: 3 - idx }]}
                      />
                    ))}
                  </View>
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionReason} numberOfLines={2}>
                      {suggestion.reason}
                    </Text>
                  </View>
                  <View style={styles.applyButton}>
                    <Text style={styles.applyButtonText}>Apply</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Closet Items Grid */}
        <View style={styles.closetSection}>
          <Text style={styles.sectionTitle}>Your Closet</Text>
          {closetItems.length === 0 && loadError && (
            <TouchableOpacity
              style={styles.emptyCloset}
              onPress={loadClosetItems}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={[styles.emptyClosetText, styles.loadErrorText]}>
                Couldn't load your closet. Tap to retry.
              </Text>
            </TouchableOpacity>
          )}
          {closetItems.length === 0 && !loadError && (
            <View style={styles.emptyCloset}>
              <Text style={styles.emptyClosetText}>
                Your closet is empty. Add your first item to start building outfits.
              </Text>
              {/* The only action in the empty state, so it is the rust primary. */}
              <Button
                title="Add an item"
                variant="primary"
                onPress={() => navigation.navigate('AddClosetItem')}
              />
            </View>
          )}
          <View style={styles.itemsGrid}>
            {closetItems.map(item => {
              const isSelected = selectedItems.some(i =>i.id === item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                  onPress={() =>toggleItemSelection(item)}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    </View>
                  )}
                  <Text style={styles.itemCategory} numberOfLines={1}>
                    {item.category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {selectedItems.length > 0 && (
        <View style={styles.saveFooter}>
          <Button
            title={`Save outfit · ${selectedItems.length} ${selectedItems.length === 1 ? 'piece' : 'pieces'}`}
            variant="primary"
            size="large"
            fullWidth
            onPress={saveOutfit}
            loading={saving || showSuccess}
          />
        </View>
      )}

      <SuccessAnimation
        visible={showSuccess}
        message="Outfit saved"
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
  saveFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    backgroundColor: colors.bone,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...textType.body,
    marginTop: 12,
    color: colors.inkMuted,
  },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 34,
    color: colors.ink,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  loadErrorText: {
    marginBottom: 0,
    color: colors.ink,
  },
  previewSection: {
    borderRadius: radius.sm,
    padding: 20,
    backgroundColor: colors.paper,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
  },
  emptyPreview: {
    borderRadius: radius.sm,
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.hair,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  emptySubtext: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkFaint,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  previewItem: {
    position: 'relative',
  },
  previewImage: {
    borderRadius: radius.sm,
    width: 80,
    height: 80,
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
  clearButton: {
    borderRadius: radius.full,
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  occasionSection: {
    padding: 20,
    paddingTop: 0,
  },
  occasionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  occasionButton: {
    borderRadius: radius.full,
    flex: 1,
    padding: 12,
    backgroundColor: colors.paper,
    alignItems: 'center',
  },
  occasionButtonActive: {
    backgroundColor: colors.ink,
  },
  occasionText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
  },
  occasionTextActive: {
    color: colors.white,
  },
  suggestionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  suggestionCard: {
    borderRadius: radius.md,
    width: 200,
    marginRight: 12,
    backgroundColor: colors.card,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  suggestionImages: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  suggestionImage: {
    borderRadius: radius.sm,
    width: 50,
    height: 50,
    backgroundColor: colors.paper,
    marginLeft: -10,
    borderWidth: 2,
    borderColor: colors.card,
  },
  suggestionInfo: {
    marginBottom: 8,
  },
  suggestionReason: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
  },
  applyButton: {
    borderRadius: radius.full,
    padding: 8,
    backgroundColor: colors.paper,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  closetSection: {
    padding: 20,
    paddingTop: 0,
  },
  emptyCloset: {
    borderRadius: radius.md,
    padding: 32,
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  emptyClosetText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // A rounded card, so the selected border follows the tile.
  itemCard: {
    borderRadius: radius.md,
    overflow: 'hidden',
    width: ITEM_SIZE,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.hair,
  },
  itemCardSelected: {
    borderColor: colors.ink,
    borderWidth: 3,
  },
  itemImage: {
    // The card's radius and overflow clip the top corners.
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.paper,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCategory: {
    fontFamily: fonts.sans,
    padding: 8,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});

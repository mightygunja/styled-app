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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { closetAPI, getCurrentUserId, ClosetItem } from '../services/api';
import { generateOutfitSuggestions, OutfitSuggestion } from '../services/outfitPairing';
import { outfitsService } from '../services/firestore';
import SuccessAnimation from '../components/SuccessAnimation';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts } from '../theme/designSystem';

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
  const [showSuccess, setShowSuccess] = useState(false);
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
    if (selectedItems.length === 0) {
      showToast('Please select at least one item', 'error');
      return;
    }

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
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading your closet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() =>navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Outfit Builder</Text>
          <TouchableOpacity onPress={saveOutfit}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Items Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Your Outfit ({selectedItems.length} items)</Text>
          {selectedItems.length === 0 ? (
            <View style={styles.emptyPreview}>
              {closetItems.length === 0 ? (
                <Text style={styles.emptyText}>Add items to your closet to build outfits</Text>
              ) : (
                <>
                  <Text style={styles.emptyText}>Tap items below to build your outfit</Text>
                  <Text style={styles.emptySubtext}>or choose from AI suggestions</Text>
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
                  >
                    <Text style={styles.removeButtonText}>×</Text>
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

        {/* AI Suggestions */}
        {suggestions.length >0 && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionTitle}>AI Suggestions</Text>
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
                    <Text style={styles.suggestionScore}>
                      {Math.round(suggestion.score * 100)}% match
                    </Text>
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
          {closetItems.length === 0 && (
            <View style={styles.emptyCloset}>
              <Text style={styles.emptyClosetText}>
                Your closet is empty. Add your first item to start building outfits.
              </Text>
              <TouchableOpacity
                style={styles.emptyClosetButton}
                onPress={() => navigation.navigate('AddClosetItem')}
              >
                <Text style={styles.emptyClosetButtonText}>Add an item</Text>
              </TouchableOpacity>
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
                      <Text style={styles.selectedBadgeText}>✓</Text>
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
  saveButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  previewSection: {
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
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.hair,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  emptySubtext: {
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
    borderRadius: 12,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
  },
  clearButton: {
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
  suggestionScore: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.camel,
    marginBottom: 4,
  },
  suggestionReason: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  applyButton: {
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
    padding: 32,
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  emptyClosetText: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyClosetButton: {
    backgroundColor: colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyClosetButtonText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
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
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: colors.paper,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  itemCategory: {
    padding: 8,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});

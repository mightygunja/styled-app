import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import SuccessAnimation from '../components/SuccessAnimation';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { closetAPI, getCurrentUserId } from '../services/api';
import { outfitsService } from '../services/firestore';
import { ClosetItem, Season } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'OutfitBuilder'>;

export default function OutfitBuilderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { sourceItemId } = route.params || {};

  const [sourceItem, setSourceItem] = useState<ClosetItem | null>(null);
  const [suggestedItems, setSuggestedItems] = useState<ClosetItem[]>([]);
  const [allItems, setAllItems] = useState<ClosetItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);

  const occasions = [
    { id: 'casual', label: 'Casual', icon: '👕' },
    { id: 'work', label: 'Work', icon: '💼' },
    { id: 'formal', label: 'Formal', icon: '🎩' },
    { id: 'athletic', label: 'Athletic', icon: '⚡' },
  ];

  useEffect(() => {
    if (sourceItemId) {
      loadOutfitSuggestions();
    } else {
      loadAllItems();
    }
  }, [sourceItemId]);

  const loadAllItems = async () => {
    try {
      setLoading(true);
      console.log('OutfitBuilder: Loading all closet items...');
      
      // Get all closet items to choose from
      const allItemsResponse = await closetAPI.getItems(getCurrentUserId());
      const items = allItemsResponse.data;
      
      console.log(`OutfitBuilder: Loaded ${items.length} closet items`);
      
      setAllItems(items);
      setSuggestedItems(items);
    } catch (error) {
      console.error('OutfitBuilder: Error loading closet items:', error);
      Alert.alert('Error', 'Failed to load closet items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadOutfitSuggestions = async () => {
    try {
      setLoading(true);
      
      if (!sourceItemId) {
        loadAllItems();
        return;
      }
      
      // Get the source item
      const itemResponse = await closetAPI.getItemById(sourceItemId);
      const sourceItem = itemResponse.data;
      setSourceItem(sourceItem);
      setSelectedItems([sourceItem]);

      // Get all closet items
      const allItemsResponse = await closetAPI.getItems(getCurrentUserId());
      const allItems = allItemsResponse.data;
      
      // Apply outfit pairing rules
      const suggestions = getOutfitPairings(sourceItem, allItems);
      
      setAllItems(allItems);
      setSuggestedItems(suggestions);
    } catch (error) {
      console.error('Error loading outfit suggestions:', error);
      Alert.alert('Error', 'Failed to load outfit suggestions');
    } finally {
      setLoading(false);
    }
  };

  // Outfit pairing rules based on fashion industry best practices
  const getOutfitPairings = (sourceItem: ClosetItem, allItems: ClosetItem[]): ClosetItem[] => {
    // Define category compatibility (what goes with what)
    const categoryPairs: Record<string, string[]> = {
      'tops': ['bottoms', 'outerwear', 'accessories'],
      'bottoms': ['tops', 'outerwear', 'accessories'],
      'dresses': ['outerwear', 'accessories'],
      'outerwear': ['tops', 'bottoms', 'dresses', 'accessories'],
      'accessories': ['tops', 'bottoms', 'dresses', 'outerwear'],
      'shoes': ['tops', 'bottoms', 'dresses', 'outerwear'],
    };

    // Comprehensive color harmony rules from fashion experts
    // Based on color wheel theory and complementary/analogous color matching
    const colorHarmony: Record<string, string[]> = {
      // Neutrals - go with everything
      'black': ['white', 'gray', 'grey', 'red', 'blue', 'navy', 'green', 'yellow', 'pink', 'purple', 'brown', 'beige', 'cream', 'tan', 'camel', 'burgundy', 'maroon', 'olive', 'teal', 'orange'],
      'white': ['black', 'gray', 'grey', 'red', 'blue', 'navy', 'green', 'yellow', 'pink', 'purple', 'brown', 'beige', 'cream', 'tan', 'camel', 'burgundy', 'maroon', 'olive', 'teal', 'orange'],
      'gray': ['black', 'white', 'red', 'blue', 'navy', 'green', 'yellow', 'pink', 'purple', 'brown', 'beige', 'burgundy', 'teal'],
      'grey': ['black', 'white', 'red', 'blue', 'navy', 'green', 'yellow', 'pink', 'purple', 'brown', 'beige', 'burgundy', 'teal'],
      
      // Blues
      'navy': ['white', 'gray', 'grey', 'beige', 'cream', 'tan', 'brown', 'camel', 'red', 'burgundy', 'pink', 'yellow', 'gold', 'orange'],
      'blue': ['white', 'gray', 'grey', 'beige', 'cream', 'brown', 'tan', 'yellow', 'orange', 'navy', 'camel', 'khaki'],
      'teal': ['white', 'gray', 'grey', 'beige', 'cream', 'brown', 'coral', 'orange', 'yellow', 'navy'],
      
      // Reds & Pinks
      'red': ['black', 'white', 'gray', 'grey', 'navy', 'beige', 'cream', 'tan', 'camel', 'denim', 'blue'],
      'burgundy': ['black', 'white', 'gray', 'grey', 'navy', 'beige', 'cream', 'tan', 'camel', 'olive', 'brown'],
      'maroon': ['black', 'white', 'gray', 'grey', 'navy', 'beige', 'cream', 'tan', 'camel', 'olive', 'brown'],
      'pink': ['white', 'gray', 'grey', 'black', 'navy', 'beige', 'cream', 'tan', 'blue', 'green'],
      'coral': ['white', 'navy', 'teal', 'beige', 'cream', 'tan', 'gray', 'grey'],
      
      // Greens
      'green': ['white', 'beige', 'cream', 'brown', 'tan', 'black', 'navy', 'gray', 'grey', 'yellow', 'orange'],
      'olive': ['white', 'beige', 'cream', 'brown', 'tan', 'black', 'navy', 'burgundy', 'maroon', 'orange'],
      
      // Browns & Earth Tones
      'brown': ['white', 'beige', 'cream', 'tan', 'camel', 'green', 'olive', 'blue', 'navy', 'orange', 'yellow', 'burgundy', 'pink'],
      'beige': ['white', 'brown', 'tan', 'camel', 'navy', 'blue', 'green', 'olive', 'black', 'burgundy', 'pink'],
      'cream': ['brown', 'tan', 'camel', 'navy', 'blue', 'green', 'olive', 'black', 'burgundy', 'gray', 'grey'],
      'tan': ['white', 'brown', 'beige', 'cream', 'navy', 'blue', 'green', 'olive', 'burgundy', 'orange'],
      'camel': ['white', 'brown', 'beige', 'cream', 'navy', 'blue', 'burgundy', 'black', 'gray', 'grey'],
      'khaki': ['white', 'navy', 'blue', 'brown', 'olive', 'burgundy', 'black'],
      
      // Yellows & Oranges
      'yellow': ['white', 'gray', 'grey', 'blue', 'navy', 'black', 'brown', 'green'],
      'gold': ['black', 'white', 'navy', 'brown', 'burgundy', 'green'],
      'orange': ['white', 'navy', 'blue', 'brown', 'olive', 'teal', 'black', 'beige', 'cream'],
      
      // Purples
      'purple': ['white', 'gray', 'grey', 'black', 'navy', 'beige', 'cream'],
      'lavender': ['white', 'gray', 'grey', 'navy', 'beige', 'cream'],
    };

    const compatibleItems = allItems.filter(item => {
      // Don't suggest the same item
      if (item.id === sourceItem.id) return false;

      // Rule 1: Category compatibility
      const compatibleCategories = categoryPairs[sourceItem.category.toLowerCase()] || [];
      if (!compatibleCategories.includes(item.category.toLowerCase())) {
        return false;
      }

      // Rule 2: Color harmony
      const sourceColor = sourceItem.color?.toLowerCase() || '';
      const itemColor = item.color?.toLowerCase() || '';
      const harmonious = colorHarmony[sourceColor] || [];
      
      // Allow if colors harmonize OR if either is neutral
      const neutrals = ['black', 'white', 'gray', 'beige', 'cream', 'navy'];
      const isHarmonious = harmonious.some(c => itemColor.includes(c)) ||
                          neutrals.some(n => sourceColor.includes(n)) ||
                          neutrals.some(n => itemColor.includes(n));
      
      if (!isHarmonious) return false;

      // Rule 3: Season compatibility (at least one season in common)
      if (sourceItem.season && item.season) {
        const hasCommonSeason = sourceItem.season.some((s: Season) => item.season.includes(s));
        if (!hasCommonSeason) return false;
      }

      return true;
    });

    // Sort by relevance
    return compatibleItems.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Prefer items with exact color matches in harmony list
      const sourceColor = sourceItem.color?.toLowerCase() || '';
      const harmonious = colorHarmony[sourceColor] || [];
      if (harmonious.includes(a.color?.toLowerCase() || '')) scoreA += 2;
      if (harmonious.includes(b.color?.toLowerCase() || '')) scoreB += 2;

      // Prefer items with more season overlap
      if (sourceItem.season && a.season) {
        scoreA += sourceItem.season.filter((s: Season) => a.season.includes(s)).length;
      }
      if (sourceItem.season && b.season) {
        scoreB += sourceItem.season.filter((s: Season) => b.season.includes(s)).length;
      }

      return scoreB - scoreA;
    }).slice(0, 20); // Limit to top 20 suggestions
  };

  const toggleItemSelection = (item: ClosetItem) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const isItemSelected = (itemId: string) => {
    return selectedItems.some(i => i.id === itemId);
  };

  const filterByOccasion = (occasion: string | null) => {
    setSelectedOccasion(occasion);
    
    if (!occasion) {
      // Show all items if no occasion selected
      if (sourceItem) {
        const suggestions = getOutfitPairings(sourceItem, allItems);
        setSuggestedItems(suggestions);
      } else {
        setSuggestedItems(allItems);
      }
      console.log(`OutfitBuilder: Showing all ${allItems.length} items`);
      return;
    }

    // Filter items by occasion
    const itemsToFilter = sourceItem ? getOutfitPairings(sourceItem, allItems) : allItems;
    const filtered = itemsToFilter.filter(item => {
      const itemOccasion = item.occasion?.toLowerCase();
      return itemOccasion === occasion.toLowerCase();
    });
    
    console.log(`OutfitBuilder: Filtered to ${filtered.length} items for occasion: ${occasion}`);
    setSuggestedItems(filtered);
  };

  const handleSaveOutfit = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('No items selected', 'Please select at least one item to create an outfit.');
      return;
    }
    try {
      await outfitsService.create(
        getCurrentUserId(),
        selectedItems.map(item => item.id),
        selectedOccasion || undefined
      );
      setShowSuccess(true);
    } catch (error) {
      console.error('Error saving outfit:', error);
      Alert.alert('Error', 'Failed to save outfit. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Creating outfit suggestions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Build Outfit</Text>
          <TouchableOpacity onPress={handleSaveOutfit}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Source Item */}
        {sourceItem && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Starting With</Text>
            <View style={styles.sourceItemCard}>
              <Image source={{ uri: sourceItem.imageUrl }} style={styles.sourceItemImage} />
              <View style={styles.sourceItemInfo}>
                <Text style={styles.sourceItemCategory}>{sourceItem.category}</Text>
                {sourceItem.brand && (
                  <Text style={styles.sourceItemBrand}>{sourceItem.brand}</Text>
                )}
                <Text style={styles.sourceItemColor}>{sourceItem.color}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Selected Items Preview */}
        {selectedItems.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Outfit ({selectedItems.length} items)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.selectedItemsRow}>
                {selectedItems.map(item => (
                  <View key={item.id} style={styles.selectedItemPreview}>
                    <Image source={{ uri: item.imageUrl }} style={styles.selectedItemImage} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => toggleItemSelection(item)}
                    >
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Occasion Filter */}
        <View style={styles.section}>
          <Text style={styles.filterTitle}>Filter by Occasion</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.occasionFilters}>
              <TouchableOpacity
                style={[styles.occasionButton, !selectedOccasion && styles.occasionButtonActive]}
                onPress={() => filterByOccasion(null)}
              >
                <Text style={[styles.occasionButtonText, !selectedOccasion && styles.occasionButtonTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {occasions.map(occasion => (
                <TouchableOpacity
                  key={occasion.id}
                  style={[
                    styles.occasionButton,
                    selectedOccasion === occasion.id && styles.occasionButtonActive
                  ]}
                  onPress={() => filterByOccasion(occasion.id)}
                >
                  <Text style={styles.occasionIcon}>{occasion.icon}</Text>
                  <Text style={[
                    styles.occasionButtonText,
                    selectedOccasion === occasion.id && styles.occasionButtonTextActive
                  ]}>
                    {occasion.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Suggested Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sourceItem ? 'Suggested Pairings' : 'Your Closet'}</Text>
          <Text style={styles.sectionSubtitle}>
            {sourceItem ? 'Tap items to add them to your outfit' : 'Select items to build your outfit'}
          </Text>
          
          {suggestedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {selectedOccasion 
                  ? `No items found for ${selectedOccasion}. Try selecting "All" or add items with this occasion to your closet.`
                  : allItems.length === 0
                    ? 'No items in your closet yet. Add some items to get started!'
                    : 'No matching items found. Try adjusting your filters.'}
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {suggestedItems.map(item => {
                const selected = isItemSelected(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemCard, selected && styles.itemCardSelected]}
                    onPress={() => toggleItemSelection(item)}
                  >
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                    {selected && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>✓</Text>
                      </View>
                    )}
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                      {item.brand && (
                        <Text style={styles.itemBrand}>{item.brand}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
      
      <SuccessAnimation
        visible={showSuccess}
        message={`Outfit with ${selectedItems.length} items saved! 🎉`}
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    fontSize: 16,
    color: '#000',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  sourceItemCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#000',
  },
  sourceItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  sourceItemInfo: {
    marginLeft: 16,
    justifyContent: 'center',
  },
  sourceItemCategory: {
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sourceItemBrand: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sourceItemColor: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  selectedItemsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectedItemPreview: {
    position: 'relative',
  },
  selectedItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemCardSelected: {
    borderColor: '#000',
  },
  itemImage: {
    width: '100%',
    height: 150,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#000',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemInfo: {
    padding: 12,
  },
  itemCategory: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  itemBrand: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#161616',
  },
  occasionFilters: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  occasionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F4F1ED',
    borderWidth: 2,
    borderColor: '#DED7CF',
    gap: 6,
  },
  occasionButtonActive: {
    backgroundColor: '#2B1F1A',
    borderColor: '#2B1F1A',
  },
  occasionIcon: {
    fontSize: 16,
  },
  occasionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#161616',
  },
  occasionButtonTextActive: {
    color: '#F1ECE7',
  },
});

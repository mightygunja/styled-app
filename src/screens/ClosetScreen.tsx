import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { getCurrentUserId, closetAPI, ClosetItem as APIClosetItem } from '../services/api';
import ClosetStats from '../components/ClosetStats';
import { fadeIn } from '../utils/animations';
import { ClosetGridSkeleton } from '../components/ClosetItemSkeleton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ClosetItem {
  id: string;
  imageUrl: string;
  category: string;
  color: string;
  brand?: string;
  wornCount: number;
  isFavorite: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'tops', label: 'Tops' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'dresses', label: 'Dresses' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'accessories', label: 'Accessories' },
];

export default function ClosetScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showStats, setShowStats] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'worn' | 'category'>('date');
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchClosetItems();
  }, [selectedCategory]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchClosetItems();
    }, [selectedCategory])
  );

  const fetchClosetItems = async () => {
    try {
      const response = await closetAPI.getItems(
        getCurrentUserId(), 
        selectedCategory !== 'all' ? selectedCategory : undefined
      );
      
      console.log('Fetched closet items:', response.data.length);
      setItems(response.data as any);
      
      // Animate in
      if (!refreshing) {
        fadeIn(fadeAnim, 300).start();
      }
    } catch (error) {
      console.error('Error fetching closet items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchClosetItems();
  };

  const handleAddItem = () => {
    navigation.navigate('AddClosetItem');
  };

  const handleItemPress = (item: ClosetItem) => {
    navigation.navigate('ClosetItemDetail', { closetItemId: item.id });
  };

  // Filter and search
  let filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  // Apply search
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter(item => 
      item.category?.toLowerCase().includes(query) ||
      item.brand?.toLowerCase().includes(query) ||
      item.color?.toLowerCase().includes(query)
    );
  }

  // Apply sorting
  filteredItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'worn':
        return (b.wornCount || 0) - (a.wornCount || 0);
      case 'category':
        return a.category.localeCompare(b.category);
      case 'date':
      default:
        return 0; // Keep original order (newest first from API)
    }
  });

  // Calculate stats
  const itemsByCategory = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostWornItems = [...items]
    .sort((a, b) => (b.wornCount || 0) - (a.wornCount || 0))
    .slice(0, 3)
    .map(item => ({ name: item.brand || item.category, wornCount: item.wornCount || 0 }));

  const leastWornItems = [...items]
    .sort((a, b) => (a.wornCount || 0) - (b.wornCount || 0))
    .slice(0, 3)
    .map(item => ({ name: item.brand || item.category, wornCount: item.wornCount || 0 }));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Closet</Text>
          <Text style={styles.subtitle}>{items.length} items</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('ClosetAnalytics')}
          >
            <Text style={styles.iconButtonText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('SmartOutfitBuilder')}
          >
            <Text style={styles.iconButtonText}>✨</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('AdvancedAnalytics')}
          >
            <Text style={styles.iconButtonText}>📈</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('ClosetOrganization')}
          >
            <Text style={styles.iconButtonText}>🗂️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Section */}
      {showStats && items.length > 0 && (
        <ScrollView style={styles.statsContainer}>
          <ClosetStats
            totalItems={items.length}
            itemsByCategory={itemsByCategory}
            mostWornItems={mostWornItems}
            leastWornItems={leastWornItems}
          />
        </ScrollView>
      )}

      {/* Search and Sort */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by category, brand, or color..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.sortScroll}
        >
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>
              Newest
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'worn' && styles.sortButtonActive]}
            onPress={() => setSortBy('worn')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'worn' && styles.sortButtonTextActive]}>
              Most Worn
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'category' && styles.sortButtonActive]}
            onPress={() => setSortBy('category')}
          >
            <Text style={[styles.sortButtonText, sortBy === 'category' && styles.sortButtonTextActive]}>
              Category
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Category Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryTab,
              selectedCategory === category.id && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items Grid */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <ClosetGridSkeleton count={6} />
        ) : filteredItems.length === 0 ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEmoji}>👗</Text>
            <Text style={styles.placeholderText}>
              {selectedCategory === 'all' 
                ? 'Your closet is empty'
                : `No ${selectedCategory} yet`}
            </Text>
            <Text style={styles.placeholderSubtext}>
              Tap the + button to add your first item
            </Text>
          </View>
        ) : (
          <Animated.View style={[styles.grid, { opacity: fadeAnim }]}>
            {filteredItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.gridItem}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
                {item.isFavorite && (
                  <View style={styles.favoriteBadge}>
                    <Text style={styles.favoriteBadgeText}>❤️</Text>
                  </View>
                )}
                {item.wornCount > 0 && (
                  <View style={styles.wornBadge}>
                    <Text style={styles.wornBadgeText}>Worn {item.wornCount}x</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddItem}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconButtonText: {
    fontSize: 20,
  },
  statsButton: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    maxHeight: 400,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  sortScroll: {
    flexDirection: 'row',
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EEE9E3',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  sortButtonActive: {
    backgroundColor: '#2B1F1A',
    borderColor: '#2B1F1A',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#161616',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#F4F1ED',
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#EEE9E3',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DED7CF',
  },
  categoryTabActive: {
    backgroundColor: '#2B1F1A',
    borderColor: '#2B1F1A',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#161616',
  },
  categoryTextActive: {
    color: '#F4F1ED',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  placeholderEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  gridItem: {
    width: '47%',
    aspectRatio: 0.75,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteBadgeText: {
    fontSize: 16,
  },
  wornBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  wornBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '300',
    lineHeight: 36,
  },
});

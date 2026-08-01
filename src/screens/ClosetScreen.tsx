import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, TextInput, Animated, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { getCurrentUserId, closetAPI } from '../services/api';
import ClosetStats from '../components/ClosetStats';
import { fadeIn } from '../utils/animations';
import { ClosetGridSkeleton } from '../components/ClosetItemSkeleton';
import { colors, fonts, type as textType } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ClosetItem {
  id: string;
  imageUrl: string;
  category: string;
  color: string;
  brand?: string;
  price?: number;
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

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchClosetItems();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchClosetItems();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const fetchClosetItems = async () => {
    try {
      // Fetch the full closet once - category switching below is a pure client-side
      // filter over `items`, so tapping a tab never needs another round trip.
      const response = await closetAPI.getItems(getCurrentUserId());
      setItems(response.data as any);
      if (!refreshing) fadeIn(fadeAnim, 300).start();
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

  const handleAddItem = () => navigation.navigate('AddClosetItem');
  const handleItemPress = (item: ClosetItem) => navigation.navigate('ClosetItemDetail', { closetItemId: item.id });

  let filteredItems = selectedCategory === 'all' ? items : items.filter(item => item.category === selectedCategory);

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter(item =>
      item.category?.toLowerCase().includes(query) ||
      item.brand?.toLowerCase().includes(query) ||
      item.color?.toLowerCase().includes(query)
    );
  }

  filteredItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'worn':
        return (b.wornCount || 0) - (a.wornCount || 0);
      case 'category':
        return a.category.localeCompare(b.category);
      default:
        return 0;
    }
  });

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

  const totalWears = items.reduce((sum, item) => sum + (item.wornCount || 0), 0);
  const avgWearsPerPiece = items.length > 0 ? (totalWears / items.length).toFixed(1) : '0';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.sectionLabel}>YOUR CLOSET</Text>
            <Text style={styles.title}>
              <Text style={styles.titleAccent}>{items.length}</Text> pieces
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddItem} activeOpacity={0.8}>
            <Text style={styles.addButtonText}>+ ADD</Text>
          </TouchableOpacity>
        </View>
        {items.length > 0 && (
          <Text style={styles.insightLine}>
            Worn on average <Text style={styles.insightAccent}>{avgWearsPerPiece}×</Text> per piece this season.
          </Text>
        )}
        <View style={styles.headerIconRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('ClosetAnalytics')}>
            <Ionicons name="stats-chart-outline" size={17} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('SmartOutfitBuilder')}>
            <Ionicons name="sparkles-outline" size={17} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Sustainability')}>
            <Ionicons name="leaf-outline" size={17} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('ClosetOrganization')}>
            <Ionicons name="folder-outline" size={17} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('InStoreCheck')}>
            <Ionicons name="bag-handle-outline" size={17} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Shop')}>
            <Ionicons name="storefront-outline" size={17} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowStats(!showStats)}>
            <Ionicons name={showStats ? 'chevron-up' : 'chevron-down'} size={17} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by category, brand, or color..."
          placeholderTextColor={colors.inkFaint}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll}>
          {(['date', 'worn', 'category'] as const).map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.sortButton, sortBy === key && styles.sortButtonActive]}
              onPress={() => setSortBy(key)}
            >
              <Text style={[styles.sortButtonText, sortBy === key && styles.sortButtonTextActive]}>
                {key === 'date' ? 'NEWEST' : key === 'worn' ? 'MOST WORN' : 'CATEGORY'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryTab, selectedCategory === category.id && styles.categoryTabActive]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[styles.categoryText, selectedCategory === category.id && styles.categoryTextActive]}>
              {category.label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ScrollView style={styles.content}>
          <ClosetGridSkeleton count={6} />
        </ScrollView>
      ) : (
        <Animated.FlatList
          style={[styles.content, { opacity: fadeAnim }]}
          data={filteredItems}
          keyExtractor={(item: ClosetItem) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          ListHeaderComponent={
            showStats && items.length > 0 ? (
              <View style={styles.statsContainer}>
                <ClosetStats
                  totalItems={items.length}
                  itemsByCategory={itemsByCategory}
                  mostWornItems={mostWornItems}
                  leastWornItems={leastWornItems}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>
                {selectedCategory === 'all' ? 'Your closet is empty' : `No ${selectedCategory} yet`}
              </Text>
              <Text style={styles.placeholderSubtext}>Tap + Add to add your first item</Text>
            </View>
          }
          renderItem={({ item }: { item: ClosetItem }) => {
            const costPerWear = item.price
              ? (item.price / Math.max(item.wornCount || 1, 1)).toFixed(2)
              : undefined;
            return (
              <TouchableOpacity
                style={styles.gridItem}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.85}
              >
                <View style={styles.gridImageWrap}>
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
                  {item.wornCount > 0 && (
                    <View style={styles.wornBadge}>
                      <Text style={styles.wornBadgeText}>{item.wornCount}×</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.brand || item.category}
                </Text>
                <View style={styles.itemMetaRow}>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    {item.category.toUpperCase()}
                  </Text>
                  {costPerWear && <Text style={styles.itemCostPerWear}>${costPerWear}/wear</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleAddItem} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionLabel: {
    ...textType.eyebrow,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: 28,
    color: colors.ink,
  },
  titleAccent: {
    fontFamily: fonts.serifItalic,
    color: colors.camel,
    fontSize: 30,
  },
  addButton: {
    borderWidth: 1,
    borderColor: colors.ink,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.ink,
  },
  insightLine: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 10,
  },
  insightAccent: {
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  headerIconRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.hair,
    marginBottom: 10,
    color: colors.ink,
  },
  sortScroll: {
    flexDirection: 'row',
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  sortButtonActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  sortButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.ink,
  },
  sortButtonTextActive: {
    color: colors.bone,
  },
  categoryScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  categoryTab: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryTabActive: {
    borderBottomColor: colors.ink,
  },
  categoryText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.inkFaint,
  },
  categoryTextActive: {
    color: colors.ink,
  },
  content: {
    flex: 1,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  placeholderText: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtext: {
    ...textType.meta,
    textAlign: 'center',
  },
  gridContent: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridItem: {
    width: '48%',
  },
  gridImageWrap: {
    aspectRatio: 0.85,
    backgroundColor: colors.paper,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  wornBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.card,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  wornBadgeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: colors.ink,
  },
  itemName: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.ink,
    marginTop: 8,
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  itemMeta: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.inkFaint,
    flex: 1,
  },
  itemCostPerWear: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.tobacco,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: colors.bone,
    fontWeight: '300',
    lineHeight: 32,
  },
});

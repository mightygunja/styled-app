import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Chip from '../components/Chip';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  smartSearchService,
  SearchResult,
  SearchSuggestion,
  DiscoverySection,
  SearchCategory,
  SortBy,
} from '../services/smartSearchService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';
import { colors, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 60) / 2;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SmartSearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [discoverySections, setDiscoverySections] = useState<DiscoverySection[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const categories: { id: SearchCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'items', label: 'Items' },
    { id: 'looks', label: 'Looks' },
    { id: 'styles', label: 'Styles' },
    { id: 'posts', label: 'Posts' },
    { id: 'users', label: 'Users' },
  ];

  const sortOptions: { id: SortBy; label: string }[] = [
    { id: 'relevance', label: 'Relevance' },
    { id: 'recent', label: 'Recent' },
    { id: 'popular', label: 'Popular' },
    { id: 'price_low', label: 'Price: Low to High' },
    { id: 'price_high', label: 'Price: High to Low' },
  ];

  useEffect(() => {
    loadDiscovery();
    loadSuggestions('');
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      loadSuggestions(searchQuery);
    } else {
      loadSuggestions('');
    }
  }, [searchQuery]);

  const loadDiscovery = async () => {
    try {
      const sections = await smartSearchService.getDiscoverySections(getCurrentUserId());
      setDiscoverySections(sections);
    } catch (error) {
      console.error('Error loading discovery:', error);
    }
  };

  const loadSuggestions = async (query: string) => {
    try {
      const suggs = await smartSearchService.getSearchSuggestions(query);
      setSuggestions(suggs);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleSearch = async (query?: string) => {
    const searchText = query || searchQuery.trim();
    if (!searchText) return;

    try {
      setSearching(true);
      const searchResults = await smartSearchService.search(getCurrentUserId(), {
        query: searchText,
        category: selectedCategory,
        sortBy,
      });
      setResults(searchResults);
    } catch (error) {
      console.error('Error searching:', error);
      showToast('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setSelectedCategory('all');
    setSortBy('relevance');
  };

  const renderSearchResult = (result: SearchResult) => (
    <TouchableOpacity key={result.id} style={styles.resultCard}>
      <Image source={{ uri: result.imageUrl }} style={styles.resultImage} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {result.title}
        </Text>
        {result.subtitle && (
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {result.subtitle}
          </Text>
        )}
        <View style={styles.resultMeta}>
          <View style={styles.resultType}>
            <Text style={styles.resultTypeText}>
              {result.type === 'item' ? 'ITEM' : result.type === 'style' ? 'STYLE' : 'PERSON'}
            </Text>
          </View>
          {result.relevanceScore >0 && (
            <Text style={styles.relevanceScore}>
              {Math.round(result.relevanceScore)}% match
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDiscoverySection = (section: DiscoverySection) => (
    <View key={section.id} style={styles.discoverySection}>
      <View style={styles.discoverySectionHeader}>
        <View>
          <Text style={styles.discoverySectionTitle}>{section.title}</Text>
          {section.subtitle && (
            <Text style={styles.discoverySectionSubtitle}>{section.subtitle}</Text>
          )}
        </View>
        <TouchableOpacity>
          <Text style={styles.seeAllButton}>See All →</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.discoveryGrid}>
          {section.items.map((item) => (
            <TouchableOpacity key={item.id} style={styles.discoveryCard}>
              <Image source={{ uri: item.imageUrl }} style={styles.discoveryImage} />
              <Text style={styles.discoveryTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {/* Single back control, and the title moves below the header rather than
          sitting centred between two actions - which is where every other
          screen in the app puts it. */}
      <View style={styles.header}>
        <BackButton />
        <TouchableOpacity onPress={handleClearSearch}>
          <Text style={styles.clearButton}>Clear</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.eyebrow}>WARDROBE</Text>
      <Text style={styles.headerTitle}>Smart search</Text>
      <Text style={styles.subtitle}>
        Search your own closet, the people you follow, and style guidance — all at once.
      </Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
                    <TextInput
            style={styles.searchInput}
            placeholder="Search items, styles, looks..."
            placeholderTextColor={colors.inkFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() =>handleSearch()}
            returnKeyType="search"
          />
          {searchQuery.length >0 && (
            <TouchableOpacity onPress={() =>setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() =>handleSearch()}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.label}
            active={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            style={styles.categoryChipSpacing}
          />
        ))}
      </ScrollView>

      {/* Sort & Filter */}
      {results.length >0 && (
        <View style={styles.toolbarContainer}>
          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.toolbarButton}>
              <Text style={styles.toolbarButtonText}>Sort: {sortOptions.find(s =>s.id === sortBy)?.label}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton}>
              <Text style={styles.toolbarButtonText}>Filters</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.resultCount}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <ScrollView>
        {/* Suggestions */}
        {searchQuery.length >0 && suggestions.length >0 && results.length === 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Suggestions</Text>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => {
                  setSearchQuery(suggestion.query);
                  handleSearch(suggestion.query);
                }}
              >
                                <Text style={styles.suggestionText}>{suggestion.query}</Text>
                <Text style={styles.suggestionCategory}>in {suggestion.category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Loading */}
        {searching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.ink} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {/* Results */}
        {!searching && results.length >0 && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsGrid}>
              {results.map(renderSearchResult)}
            </View>
          </View>
        )}

        {/* No Results */}
        {!searching && searchQuery.length >0 && results.length === 0 && (
          <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>Try different keywords or browse discovery sections below
            </Text>
          </View>
        )}

        {/* Discovery */}
        {!searching && results.length === 0 && (
          <View style={styles.discoveryContainer}>
            {discoverySections.map(renderDiscoverySection)}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

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
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 4,
  },
  categoryChipSpacing: { marginRight: 8 },
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  backButton: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 34,
    color: colors.ink,
    marginHorizontal: 24,
  },
  clearButton: {
    fontSize: 14,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 12,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.inkFaint,
    fontFamily: fonts.sansSemiBold,
  },
  searchButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: colors.bone,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  categoriesScroll: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  categoryTextActive: {
    color: colors.bone,
  },
  toolbarContainer: {
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  toolbarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.paper,
  },
  toolbarButtonText: {
    fontSize: 13,
    color: colors.inkMuted,
    fontFamily: fonts.sansMedium,
  },
  resultCount: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.inkMuted,
  },
  suggestionsContainer: {
    padding: 20,
  },
  suggestionsTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
    gap: 12,
  },
  suggestionIcon: {
    fontSize: 16,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
  },
  suggestionCategory: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  resultsContainer: {
    padding: 20,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  resultCard: {
    width: GRID_ITEM_SIZE,
    backgroundColor: colors.bone,
    borderWidth: 1,
    borderColor: colors.hair,
    overflow: 'hidden',
  },
  resultImage: {
    width: '100%',
    height: GRID_ITEM_SIZE,
    backgroundColor: colors.paper,
  },
  resultInfo: {
    padding: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: 8,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultType: {
    backgroundColor: colors.paper,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resultTypeText: {
    fontSize: 12,
  },
  relevanceScore: {
    fontSize: 11,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  discoveryContainer: {
    paddingTop: 20,
  },
  discoverySection: {
    marginBottom: 32,
  },
  discoverySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  discoverySectionTitle: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  discoverySectionSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 2,
  },
  seeAllButton: {
    fontSize: 14,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  discoveryGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  discoveryCard: {
    width: 140,
  },
  discoveryImage: {
    width: 140,
    height: 140,
    backgroundColor: colors.paper,
    marginBottom: 8,
  },
  discoveryTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 12,
  },
});

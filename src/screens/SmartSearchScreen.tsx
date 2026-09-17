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
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
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
import { colors, fonts, radius } from '../theme/designSystem';

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
  const [discoveryState, setDiscoveryState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('all');
  const [sortBy, setSortBy] = useState<SortBy>('relevance');
  const { toast, showToast, hideToast } = useToast();

  // Only categories the search index actually contains: closet items, the
  // editorial style guides, and people. "Looks" and "Posts" chips used to sit
  // here too, but nothing indexes looks or posts, so those searches could only
  // ever dead-end at "No results found".
  const categories: { id: SearchCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'items', label: 'Items' },
    { id: 'styles', label: 'Styles' },
    { id: 'users', label: 'Users' },
  ];

  // Only sorts the service genuinely implements. Two price sorts used to be
  // declared here too, but most closet items have no price, so they mostly
  // shuffled zeros - dropped rather than pretended.
  const sortOptions: { id: SortBy; label: string }[] = [
    { id: 'relevance', label: 'Relevance' },
    { id: 'recent', label: 'Recently added' },
    { id: 'popular', label: 'Most worn' },
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
      setDiscoveryState('loading');
      const sections = await smartSearchService.getDiscoverySections(getCurrentUserId());
      setDiscoverySections(sections);
      setDiscoveryState('ready');
    } catch (error) {
      console.error('Error loading discovery:', error);
      setDiscoveryState('error');
    }
  };

  // Headings over empty rows say nothing; only sections with items are shown.
  const visibleSections = discoverySections.filter(section => section.items.length > 0);

  const loadSuggestions = async (query: string) => {
    try {
      const suggs = await smartSearchService.getSearchSuggestions(query);
      setSuggestions(suggs);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const handleSearch = async (
    query?: string,
    sortOverride?: SortBy,
    categoryOverride?: typeof selectedCategory
  ) => {
    const searchText = query || searchQuery.trim();
    if (!searchText) return;

    try {
      setSearching(true);
      const searchResults = await smartSearchService.search(getCurrentUserId(), {
        query: searchText,
        // Same reason as sortOverride below: a chip tap re-runs the search
        // before setSelectedCategory has landed.
        category: categoryOverride ?? selectedCategory,
        // setSortBy hasn't landed yet when the sort button re-runs the
        // search, so the new value arrives as an explicit override.
        sortBy: sortOverride ?? sortBy,
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

  /** Every result opens its real destination - these cards used to have no
   *  onPress at all, so search worked and tapping did nothing. */
  const openResult = (result: SearchResult) => {
    switch (result.type) {
      case 'item':
        navigation.navigate('ClosetItemDetail', { closetItemId: result.id });
        return;
      case 'look':
        navigation.navigate('LookDetail', { lookId: result.id });
        return;
      case 'post':
        navigation.navigate('PostDetail', { postId: result.id });
        return;
      case 'user':
        navigation.navigate('UserProfile', { userId: result.id });
        return;
      case 'style':
        // Style results are the editorial guides; their id is the route.
        navigation.navigate(result.id as any);
        return;
    }
  };

  const renderSearchResult = (result: SearchResult) => (
    <TouchableOpacity
      key={result.id}
      style={styles.resultCard}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Open ${result.title}`}
      onPress={() => openResult(result)}
    >
      {result.imageUrl ? (
        <Image source={{ uri: result.imageUrl }} style={styles.resultImage} />
      ) : (
        // Style guides and some closet items have no image - a typographic
        // tile rather than a blank grey box.
        <View style={[styles.resultImage, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText} numberOfLines={3}>{result.title}</Text>
        </View>
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {result.title}
        </Text>
        {result.subtitle && (
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {result.subtitle}
          </Text>
        )}
        {/* No "% match" badge here: the relevance score is an additive
            ranking weight, not a percentage - it happily exceeds 100 and
            rendered as impossible stats like "120% match". It still orders
            the results; it just isn't shown as a number. */}
        <View style={styles.resultMeta}>
          <View style={styles.resultType}>
            <Text style={styles.resultTypeText}>
              {result.type === 'item' ? 'ITEM' : result.type === 'style' ? 'STYLE' : 'PERSON'}
            </Text>
          </View>
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
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.discoveryGrid}>
          {section.items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.discoveryCard}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              onPress={() => openResult(item)}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.discoveryImage} />
              ) : (
                <View style={[styles.discoveryImage, styles.imagePlaceholder]}>
                  <Ionicons name="camera-outline" size={22} color={colors.inkFaint} />
                </View>
              )}
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
            placeholder="Search items, styles, people..."
            placeholderTextColor={colors.inkFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() =>handleSearch()}
            returnKeyType="search"
          />
          {searchQuery.length >0 && (
            <TouchableOpacity
              onPress={() =>setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
            >
              <Ionicons name="close" size={18} color={colors.inkFaint} />
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
            onPress={() => {
              setSelectedCategory(cat.id);
              // Re-run the search so the chip filters what is on screen,
              // the way the Sort button already does.
              if (searchQuery.trim()) handleSearch(undefined, undefined, cat.id);
            }}
            style={styles.categoryChipSpacing}
          />
        ))}
      </ScrollView>

      {/* Result count. A previous toolbar here offered "Sort" and "Filters"
          buttons whose onPress did not exist - controls that look
          interactive and do nothing are worse than no controls. Sort cycles
          via the button below instead. */}
      {results.length >0 && (
        <View style={styles.toolbarContainer}>
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.toolbarButton}
              accessibilityRole="button"
              accessibilityLabel="Change sort order"
              onPress={() => {
                const next = sortOptions[(sortOptions.findIndex(s => s.id === sortBy) + 1) % sortOptions.length].id;
                setSortBy(next);
                handleSearch(undefined, next);
              }}
            >
              <Text style={styles.toolbarButtonText}>Sort: {sortOptions.find(s =>s.id === sortBy)?.label}
              </Text>
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
        {!searching && results.length === 0 && discoveryState === 'error' && (
          <TouchableOpacity
            style={styles.emptyState}
            onPress={loadDiscovery}
            accessibilityRole="button"
          >
            <Text style={styles.emptyText}>Couldn't load your closet</Text>
            <Text style={styles.emptySubtext}>Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {!searching && results.length === 0 && discoveryState === 'ready' && (
          visibleSections.length > 0 ? (
            <View style={styles.discoveryContainer}>
              {visibleSections.map(renderDiscoverySection)}
            </View>
          ) : searchQuery.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Your closet is empty</Text>
              <Text style={styles.emptySubtext}>
                Add a few pieces and they'll show up here to search and rediscover.
              </Text>
              <Button
                title="Add an item"
                variant="primary"
                onPress={() => navigation.navigate('AddClosetItem')}
                style={styles.emptyButton}
              />
            </View>
          ) : null
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
    borderRadius: radius.md,
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
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 12,
  },
  searchButton: {
    borderRadius: radius.full,
    backgroundColor: colors.rust,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: colors.white,
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
    borderRadius: radius.full,
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
    borderRadius: radius.full,
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
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontFamily: fonts.sans,
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
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  suggestionCategory: {
    fontFamily: fonts.sans,
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
    borderRadius: radius.md,
    width: GRID_ITEM_SIZE,
    backgroundColor: colors.bone,
    borderWidth: 1,
    borderColor: colors.hair,
    overflow: 'hidden',
  },
  resultImage: {
    borderRadius: radius.sm,
    width: '100%',
    height: GRID_ITEM_SIZE,
    backgroundColor: colors.paper,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  imagePlaceholderText: {
    fontFamily: fonts.serifItalic,
    fontSize: 16,
    lineHeight: 21,
    color: colors.tobacco,
    textAlign: 'center',
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
    fontFamily: fonts.sans,
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
    borderRadius: radius.full,
    backgroundColor: colors.paper,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resultTypeText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.inkMuted,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  emptyButton: {
    marginTop: 20,
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
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 2,
  },
  discoveryGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  discoveryCard: {
    borderRadius: radius.sm,
    width: 140,
  },
  discoveryImage: {
    borderRadius: radius.sm,
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

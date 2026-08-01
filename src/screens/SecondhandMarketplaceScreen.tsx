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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  secondhandMarketplaceService,
  MarketplaceItem,
  PlatformInfo,
  MarketplaceTrends,
  MarketplacePlatform,
} from '../services/secondhandMarketplaceService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SecondhandMarketplaceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [trends, setTrends] = useState<MarketplaceTrends | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<MarketplacePlatform[]>([]);
  const [selectedTab, setSelectedTab] = useState<'search' | 'platforms' | 'trends'>('search');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [platformsData, trendsData] = await Promise.all([
        secondhandMarketplaceService.getAllPlatforms(),
        secondhandMarketplaceService.getMarketplaceTrends(),
      ]);
      setPlatforms(platformsData);
      setTrends(trendsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load marketplace data', 'error');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      showToast('Please enter a search term', 'error');
      return;
    }

    try {
      setLoading(true);
      const results = await secondhandMarketplaceService.searchMarketplaces({
        query: searchQuery,
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
      });
      setItems(results.items);
      showToast(`Found ${results.totalResults} items`, 'success');
    } catch (error) {
      console.error('Error searching:', error);
      showToast('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: MarketplacePlatform) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  const getConditionColor = (condition: string): string => {
    const colors = {
      'new-with-tags': '#10b981',
      'like-new': '#22c55e',
      'excellent': '#84cc16',
      'good': '#f59e0b',
      'fair': '#f97316',
    };
    return colors[condition as keyof typeof colors] || '#64748b';
  };

  const getConditionLabel = (condition: string): string => {
    const labels = {
      'new-with-tags': 'New with Tags',
      'like-new': 'Like New',
      'excellent': 'Excellent',
      'good': 'Good',
      'fair': 'Fair',
    };
    return labels[condition as keyof typeof labels] || condition;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secondhand Marketplace</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'search' && styles.tabActive]}
          onPress={() => setSelectedTab('search')}
        >
          <Text style={[styles.tabText, selectedTab === 'search' && styles.tabTextActive]}>
            Search
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'platforms' && styles.tabActive]}
          onPress={() => setSelectedTab('platforms')}
        >
          <Text style={[styles.tabText, selectedTab === 'platforms' && styles.tabTextActive]}>
            Platforms
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'trends' && styles.tabActive]}
          onPress={() => setSelectedTab('trends')}
        >
          <Text style={[styles.tabText, selectedTab === 'trends' && styles.tabTextActive]}>
            Trends
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Search Tab */}
        {selectedTab === 'search' && (
          <>
            {/* Platform Filters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Filter by Platform</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.platformFilters}>
                  {platforms.map((platform) => (
                    <TouchableOpacity
                      key={platform.platform}
                      style={[
                        styles.platformFilter,
                        selectedPlatforms.includes(platform.platform) && styles.platformFilterActive,
                      ]}
                      onPress={() => togglePlatform(platform.platform)}
                    >
                      <Text style={styles.platformFilterIcon}>{platform.logo}</Text>
                      <Text style={[
                        styles.platformFilterText,
                        selectedPlatforms.includes(platform.platform) && styles.platformFilterTextActive,
                      ]}>
                        {platform.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Loading */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Searching marketplaces...</Text>
              </View>
            )}

            {/* Results */}
            {!loading && items.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {items.length} Results
                </Text>
                <View style={styles.itemsGrid}>
                  {items.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                      
                      {/* Platform Badge */}
                      <View style={styles.platformBadge}>
                        <Text style={styles.platformBadgeText}>
                          {platforms.find(p => p.platform === item.platform)?.logo}
                        </Text>
                      </View>

                      {/* Discount Badge */}
                      {item.discount && item.discount > 0 && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>-{item.discount}%</Text>
                        </View>
                      )}

                      <View style={styles.itemInfo}>
                        <Text style={styles.itemBrand}>{item.brand}</Text>
                        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                        
                        <View style={styles.itemPriceRow}>
                          <Text style={styles.itemPrice}>${item.price}</Text>
                          {item.originalPrice && (
                            <Text style={styles.itemOriginalPrice}>${item.originalPrice.toFixed(0)}</Text>
                          )}
                        </View>

                        <View style={[styles.itemCondition, { backgroundColor: getConditionColor(item.condition) }]}>
                          <Text style={styles.itemConditionText}>
                            {getConditionLabel(item.condition)}
                          </Text>
                        </View>

                        {/* Sustainability */}
                        <View style={styles.itemSustainability}>
                          <Text style={styles.itemSustainabilityText}>
                            🌱 Saves {item.sustainability.co2Saved.toFixed(1)} kg CO₂
                          </Text>
                        </View>

                        {/* Shipping */}
                        {item.shipping.free && (
                          <View style={styles.itemShipping}>
                            <Text style={styles.itemShippingText}>📦 Free Shipping</Text>
                          </View>
                        )}

                        {/* Seller */}
                        <View style={styles.itemSeller}>
                          <Text style={styles.itemSellerText}>
                            ⭐ {item.seller.rating.toFixed(1)} • {item.seller.totalSales} sales
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Empty State */}
            {!loading && items.length === 0 && searchQuery && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔍</Text>
                <Text style={styles.emptyStateText}>No results found</Text>
                <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
              </View>
            )}

            {/* Initial State */}
            {!loading && items.length === 0 && !searchQuery && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🛍️</Text>
                <Text style={styles.emptyStateText}>Search for secondhand items</Text>
                <Text style={styles.emptyStateSubtext}>
                  Find pre-owned fashion across multiple platforms
                </Text>
              </View>
            )}
          </>
        )}

        {/* Platforms Tab */}
        {selectedTab === 'platforms' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Platforms</Text>
            {platforms.map((platform) => (
              <View key={platform.platform} style={styles.platformCard}>
                <View style={styles.platformHeader}>
                  <Text style={styles.platformLogo}>{platform.logo}</Text>
                  <View style={styles.platformHeaderInfo}>
                    <Text style={styles.platformName}>{platform.name}</Text>
                    <Text style={styles.platformUsers}>{platform.userCount} users</Text>
                  </View>
                  <View style={styles.platformRating}>
                    <Text style={styles.platformRatingText}>⭐ {platform.rating}</Text>
                  </View>
                </View>

                <Text style={styles.platformDescription}>{platform.description}</Text>

                <View style={styles.platformDetails}>
                  <View style={styles.platformDetail}>
                    <Text style={styles.platformDetailLabel}>Price Range</Text>
                    <Text style={styles.platformDetailValue}>{platform.priceRange}</Text>
                  </View>
                  <View style={styles.platformDetail}>
                    <Text style={styles.platformDetailLabel}>Shipping</Text>
                    <Text style={styles.platformDetailValue}>{platform.shippingInfo}</Text>
                  </View>
                  <View style={styles.platformDetail}>
                    <Text style={styles.platformDetailLabel}>Returns</Text>
                    <Text style={styles.platformDetailValue}>{platform.returnPolicy}</Text>
                  </View>
                </View>

                <View style={styles.platformSpecialties}>
                  <Text style={styles.platformSpecialtiesTitle}>Specialties:</Text>
                  <View style={styles.platformSpecialtiesTags}>
                    {platform.specialties.map((specialty, index) => (
                      <View key={index} style={styles.platformSpecialtyTag}>
                        <Text style={styles.platformSpecialtyText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <TouchableOpacity style={styles.platformButton}>
                  <Text style={styles.platformButtonText}>Visit {platform.name}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Trends Tab */}
        {selectedTab === 'trends' && trends && (
          <>
            {/* Trending Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
              {trends.trending.map((trend, index) => (
                <View key={index} style={styles.trendCard}>
                  <View style={styles.trendHeader}>
                    <Text style={styles.trendCategory}>{trend.category}</Text>
                    <View style={styles.trendGrowth}>
                      <Text style={styles.trendGrowthText}>↗️ +{trend.growth}%</Text>
                    </View>
                  </View>
                  <Text style={styles.trendPrice}>Avg. ${trend.avgPrice}</Text>
                  <View style={styles.trendBrands}>
                    <Text style={styles.trendBrandsLabel}>Top brands:</Text>
                    <Text style={styles.trendBrandsText}>{trend.topBrands.join(', ')}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Seasonal Deals */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎁 Seasonal Deals</Text>
              {trends.seasonalDeals.map((deal, index) => (
                <View key={index} style={styles.dealCard}>
                  <View style={styles.dealHeader}>
                    <Text style={styles.dealCategory}>{deal.category}</Text>
                    <View style={styles.dealDiscount}>
                      <Text style={styles.dealDiscountText}>-{deal.discount}%</Text>
                    </View>
                  </View>
                  <Text style={styles.dealDescription}>{deal.description}</Text>
                </View>
              ))}
            </View>

            {/* Popular Searches */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔍 Popular Searches</Text>
              <View style={styles.popularSearches}>
                {trends.popularSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.popularSearchTag}
                    onPress={() => {
                      setSearchQuery(search);
                      setSelectedTab('search');
                    }}
                  >
                    <Text style={styles.popularSearchText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sustainability Impact */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌍 Why Buy Secondhand?</Text>
              <View style={styles.impactCard}>
                <View style={styles.impactItem}>
                  <Text style={styles.impactIcon}>💰</Text>
                  <Text style={styles.impactTitle}>Save Money</Text>
                  <Text style={styles.impactDescription}>
                    Save 50-80% compared to buying new
                  </Text>
                </View>
                <View style={styles.impactItem}>
                  <Text style={styles.impactIcon}>🌱</Text>
                  <Text style={styles.impactTitle}>Reduce CO₂</Text>
                  <Text style={styles.impactDescription}>
                    Avoid 80% of carbon emissions
                  </Text>
                </View>
                <View style={styles.impactItem}>
                  <Text style={styles.impactIcon}>💧</Text>
                  <Text style={styles.impactTitle}>Save Water</Text>
                  <Text style={styles.impactDescription}>
                    Conserve thousands of liters
                  </Text>
                </View>
                <View style={styles.impactItem}>
                  <Text style={styles.impactIcon}>♻️</Text>
                  <Text style={styles.impactTitle}>Reduce Waste</Text>
                  <Text style={styles.impactDescription}>
                    Keep items out of landfills
                  </Text>
                </View>
              </View>
            </View>
          </>
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    fontSize: 16,
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: '#10b981',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 20,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  platformFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  platformFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  platformFilterActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  platformFilterIcon: {
    fontSize: 16,
  },
  platformFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  platformFilterTextActive: {
    color: '#10b981',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    width: (width - 52) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f1f5f9',
  },
  platformBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  platformBadgeText: {
    fontSize: 14,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  itemInfo: {
    padding: 12,
  },
  itemBrand: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 8,
    height: 32,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  itemOriginalPrice: {
    fontSize: 13,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  itemCondition: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  itemConditionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  itemSustainability: {
    marginBottom: 6,
  },
  itemSustainabilityText: {
    fontSize: 10,
    color: '#10b981',
  },
  itemShipping: {
    marginBottom: 6,
  },
  itemShippingText: {
    fontSize: 10,
    color: '#3b82f6',
  },
  itemSeller: {},
  itemSellerText: {
    fontSize: 10,
    color: '#64748b',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  platformCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  platformLogo: {
    fontSize: 32,
  },
  platformHeaderInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  platformUsers: {
    fontSize: 12,
    color: '#64748b',
  },
  platformRating: {
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  platformRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  platformDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  platformDetails: {
    gap: 8,
    marginBottom: 16,
  },
  platformDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  platformDetailLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  platformDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  platformSpecialties: {
    marginBottom: 16,
  },
  platformSpecialtiesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  platformSpecialtiesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  platformSpecialtyTag: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  platformSpecialtyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  platformButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  platformButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  trendCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  trendGrowth: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendGrowthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  trendPrice: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  trendBrands: {
    flexDirection: 'row',
    gap: 4,
  },
  trendBrandsLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  trendBrandsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  dealCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dealCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7f1d1d',
  },
  dealDiscount: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dealDiscountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dealDescription: {
    fontSize: 13,
    color: '#991b1b',
  },
  popularSearches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularSearchTag: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  popularSearchText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  impactCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    gap: 20,
  },
  impactItem: {
    alignItems: 'center',
  },
  impactIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  impactDescription: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});

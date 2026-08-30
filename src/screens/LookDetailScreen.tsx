import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Look, Item } from '../types';
import { lookAPI, closetAPI, getCurrentUserId } from '../services/api';
import { colors, fonts } from '../theme/designSystem';

interface LookDetailScreenProps {
  route: {
    params: {
      lookId: string;
    };
  };
  navigation: any;
}

export default function LookDetailScreen({ route, navigation }: LookDetailScreenProps) {
  const { lookId } = route.params;
  const [look, setLook] = useState<Look | null>(null);
  const [paletteLooks, setPaletteLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    fetchLookDetail();
  }, [lookId]);

  const fetchLookDetail = async () => {
    try {
      console.log('Fetching look detail for ID:', lookId);
      const response = await lookAPI.getById(lookId);
      console.log('Look detail response:', response);
      console.log('Look data:', response.data);
      setLook(response.data);

      // Fetch other looks in the same palette
      if (response.data.paletteId) {
        const allLooksResponse = await lookAPI.getAll({ limit: 50 });
        const samePaletteLooks = allLooksResponse.data.filter(
          l =>l.paletteId === response.data.paletteId && l.id !== lookId
        );
        setPaletteLooks(samePaletteLooks);
      }

      // Seed the favorite state from the user's real favorites. The heart
      // used to open blank every time, so tapping it on an already-favorited
      // look silently removed it while claiming to add it.
      try {
        const favoritesResponse = await lookAPI.getFavorites(getCurrentUserId());
        setIsFavorited(favoritesResponse.data.some(favorite => favorite.id === lookId));
      } catch (favoriteError) {
        console.error('Error loading favorite state:', favoriteError);
      }
    } catch (error) {
      console.error('Error fetching look detail:', error);
      Alert.alert('Something went wrong', "Couldn't load that look. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    try {
      console.log('Toggling favorite for look:', lookId);
      const response = await lookAPI.toggleFavorite(lookId, getCurrentUserId());
      console.log('Favorite response:', response);
      setIsFavorited(response.isFavorited);
      Alert.alert(response.isFavorited ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Something went wrong', "Couldn't update your favorites. Please try again.");
    }
  };

  const handleShopMyCloset = async () => {
    try {
      setLoading(true);
      const response = await closetAPI.shopMyCloset(lookId, getCurrentUserId(), 10);
      setLoading(false);
      
      if (response.data.length === 0) {
        Alert.alert('No matches yet', 'Nothing in your closet matches this look. Add more items and try again.');
        return;
      }
      
      // Navigate to similar items screen
      navigation.navigate('SimilarItems', {
        sourceItemId: lookId,
        similarItems: response.data,
      });
    } catch (error) {
      setLoading(false);
      console.error('Error finding closet items:', error);
      Alert.alert('Something went wrong', "Couldn't search your closet. Please try again.");
    }
  };

  const handleShopCompleteLook = async (items: Item[]) => {
    const shoppableItems = items.filter(item =>item.affiliateLink);

    if (shoppableItems.length === 0) {
      Alert.alert('Not shoppable yet', 'No shop links are available for this look yet.');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(shoppableItems[0].affiliateLink!);
      if (canOpen) {
        await Linking.openURL(shoppableItems[0].affiliateLink!);
      }

      if (shoppableItems.length >1) {
        Alert.alert(
          'Opening first item',
          `Opening "${shoppableItems[0].name}". ${shoppableItems.length - 1} more item${
            shoppableItems.length - 1 === 1 ? '' : 's'
          } in this look can be shopped individually below.`
        );
      }
    } catch (error) {
      console.error('Error opening shop links:', error);
      Alert.alert('Something went wrong', "Couldn't open that shop link. Please try again.");
    }
  };

  const handleShopItem = async (item: Item) => {
    try {
      // Track click event (analytics would go here)
      console.log('Shopping item:', item.name, 'Link:', item.affiliateLink);
      
      // Open affiliate link
      if (item.affiliateLink) {
        const canOpen = await Linking.canOpenURL(item.affiliateLink);
        console.log('Can open URL:', canOpen);
        if (canOpen) {
          await Linking.openURL(item.affiliateLink);
        } else {
          Alert.alert('Link unavailable', "That shop link can't be opened on this device.");
        }
      } else {
        Alert.alert('Not shoppable yet', 'No shop link is available for this item yet.');
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Something went wrong', "Couldn't open that shop link. Please try again.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading look details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!look) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Look not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() =>navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Transform backend response - Firebase returns items directly with itemType
  const allItems = (look as any).items?.map((item: any) => ({
    ...item,
    type: item.itemType, // 'hero', 'alternate', or 'budget'
  })) || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* One back control: the arrow overlaid on the hero image. A second,
          ink-block BackButton used to render above it. */}
      <ScrollView>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: look.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() =>navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleFavorite}
          >
            <Text style={styles.favoriteIcon}>
              {isFavorited ? '●' : '○'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Look Info */}
        <View style={styles.content}>
          <Text style={styles.title}>{look.title}</Text>
          
          {look.description && (
            <Text style={styles.description}>{look.description}</Text>
          )}

          {/* Tags */}
          {look.tags && look.tags.length >0 && (
            <View style={styles.tagsContainer}>
              {look.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Shop My Closet Button */}
          <TouchableOpacity style={styles.shopMyClosetButton} onPress={handleShopMyCloset}>
            <Text style={styles.shopMyClosetText}>Shop My Closet</Text>
            <Text style={styles.shopMyClosetSubtext}>Find similar items you already own</Text>
          </TouchableOpacity>

          {/* Palette Info */}
          {look.palette && (
            <View style={styles.paletteSection}>
              <Text style={styles.sectionTitle}>More from {look.palette.name}</Text>
              <Text style={styles.paletteDescription}>{look.palette.description}</Text>
              
              {paletteLooks.length >0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.paletteLooksScroll}
                >
                  {paletteLooks.map((paletteLook) => (
                    <TouchableOpacity
                      key={paletteLook.id}
                      style={styles.miniLookCard}
                      onPress={() =>navigation.push('LookDetail', { lookId: paletteLook.id })}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: paletteLook.imageUrl }}
                        style={styles.miniLookImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.miniLookTitle} numberOfLines={2}>
                        {paletteLook.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  
                  {/* View All Button */}
                  <TouchableOpacity
                    style={styles.viewAllCard}
                    onPress={() =>navigation.navigate('PaletteDetail', { paletteId: look.palette!.id })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewAllText}>View All{'\n'}Looks →</Text>
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                <TouchableOpacity
                  style={styles.paletteCard}
                  onPress={() =>navigation.navigate('PaletteDetail', { paletteId: look.palette!.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.colorsContainer}>
                    {look.palette.colors.map((color, index) => (
                      <View
                        key={index}
                        style={[styles.colorSwatch, { backgroundColor: color }]}
                      />
                    ))}
                  </View>
                  <Text style={styles.tapToExplore}>Tap to explore this palette →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Items Section */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Shop This Look</Text>
            <Text style={styles.itemCount}>{allItems.length} items</Text>

            {allItems.map((item: any, index: number) => (
              <View key={index} style={styles.itemCard}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
                
                <View style={styles.itemInfo}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.type === 'hero' && (
                      <View style={styles.heroBadge}>
                        <Text style={styles.heroBadgeText}>HERO</Text>
                      </View>
                    )}
                    {item.type === 'budget' && (
                      <View style={styles.budgetBadge}>
                        <Text style={styles.budgetBadgeText}>BUDGET</Text>
                      </View>
                    )}
                  </View>
                  
                  {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
                  {item.retailer && <Text style={styles.itemRetailer}>{item.retailer}</Text>}
                  
                  {item.price !== undefined && item.price !== null && (
                    <View style={styles.priceRow}>
                      <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                      {item.originalPrice && item.originalPrice >item.price && (
                        <Text style={styles.originalPrice}>
                          ${item.originalPrice.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  )}

                  {item.color && (
                    <Text style={styles.itemDetail}>Color: {item.color}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.shopButton}
                    onPress={() =>handleShopItem(item)}
                  >
                    <Text style={styles.shopButtonText}>Shop Now →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Shop All Button */}
          <TouchableOpacity
            style={styles.shopAllButton}
            onPress={() =>handleShopCompleteLook(allItems)}
          >
            <Text style={styles.shopAllButtonText}>Shop Complete Look</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.inkMuted,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: colors.inkMuted,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.ink,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  imageContainer: {
    width: '100%',
    height: 500,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backIconButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.ink,
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 24,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.inkMuted,
    lineHeight: 24,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
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
  paletteSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
  },
  paletteCard: {
    backgroundColor: colors.paper,
    padding: 16,
  },
  paletteName: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  paletteDescription: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  colorsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.card,
  },
  tapToExplore: {
    fontSize: 14,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
    marginTop: 12,
    textAlign: 'center',
  },
  itemsSection: {
    marginBottom: 24,
  },
  itemCount: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.hair,
    overflow: 'hidden',
  },
  itemImage: {
    width: 120,
    height: 160,
  },
  itemInfo: {
    flex: 1,
    padding: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  heroBadge: {
    backgroundColor: colors.camel,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  budgetBadge: {
    backgroundColor: colors.camel,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  budgetBadgeText: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  itemBrand: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 2,
  },
  itemRetailer: {
    fontSize: 12,
    color: colors.inkFaint,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.inkFaint,
    textDecorationLine: 'line-through',
  },
  itemDetail: {
    fontSize: 12,
    color: colors.inkMuted,
    marginBottom: 8,
  },
  shopButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  shopButtonText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  shopAllButton: {
    backgroundColor: colors.ink,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  shopAllButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  paletteLooksScroll: {
    marginTop: 16,
  },
  miniLookCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: colors.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  miniLookImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.paper,
  },
  miniLookTitle: {
    padding: 12,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    lineHeight: 18,
  },
  viewAllCard: {
    width: 140,
    height: 180,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  viewAllText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    textAlign: 'center',
  },
  shopMyClosetButton: {
    backgroundColor: colors.tobacco,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  shopMyClosetText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 4,
  },
  shopMyClosetSubtext: {
    color: colors.white,
    fontSize: 12,
    opacity: 0.9,
  },
});

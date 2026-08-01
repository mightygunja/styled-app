import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { getActiveAdapter } from '../services/affiliateNetwork';
import { buildProfileMatchContext } from '../services/profileMatchContext';
import { scoreProduct } from '../services/marketplaceMatchingService';
import { wishlistService, affiliateClicksService } from '../services/firestore';
import { closetAPI, getCurrentUserId } from '../services/api';
import { findSimilarOwnedItems } from '../models/storeCheck';
import { Product, MatchedProduct, isOnSale, discountPercent } from '../models/product';
import { Item } from '../types';
import { haptics } from '../utils/haptics';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen() {
  const route = useRoute<ProductDetailRouteProp>();
  const { productId } = route.params;

  const [loading, setLoading] = useState(true);
  const [matched, setMatched] = useState<MatchedProduct | null>(null);
  const [ownedMatches, setOwnedMatches] = useState<ReturnType<typeof findSimilarOwnedItems>>([]);
  const [wishlistDocId, setWishlistDocId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      const [product, profile, closetResponse, savedId] = await Promise.all([
        getActiveAdapter().getById(productId),
        buildProfileMatchContext(userId),
        closetAPI.getItems(userId),
        wishlistService.isSaved(userId, productId),
      ]);
      if (!product) {
        setMatched(null);
        return;
      }
      const closetItems: Item[] = (closetResponse.data || []).map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category,
        color: item.color,
        brand: item.brand,
        price: item.price || 0,
        wornCount: item.wornCount,
        lastWornDate: item.lastWornDate,
        createdAt: item.createdAt,
        tags: item.tags,
        style: item.style,
      }));
      setMatched(scoreProduct(product, profile, closetItems));
      setOwnedMatches(
        findSimilarOwnedItems(
          {
            category: product.category,
            subcategory: product.subcategory || product.category,
            color: product.color || '',
            pattern: 'solid',
            style: product.styleTags?.[0] || '',
          },
          closetResponse.data || []
        )
      );
      setWishlistDocId(savedId);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleWishlist = async (product: Product) => {
    haptics.tap();
    try {
      const userId = getCurrentUserId();
      if (wishlistDocId) {
        await wishlistService.remove(wishlistDocId);
        setWishlistDocId(null);
      } else {
        const id = await wishlistService.add(userId, product);
        setWishlistDocId(id);
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const handleShop = async (product: Product) => {
    setOpening(true);
    haptics.impact();
    try {
      const userId = getCurrentUserId();
      const [wrappedUrl] = await Promise.all([
        getActiveAdapter().wrapLink(product),
        affiliateClicksService.record(userId, product),
      ]);
      await Linking.openURL(wrappedUrl);
    } catch (error) {
      console.error('Error opening product link:', error);
      Alert.alert('Could not open link', 'Please try again.');
    } finally {
      setOpening(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><BackButton /></View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  if (!matched) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><BackButton /></View>
        <View style={styles.loadingBox}>
          <Text style={styles.emptyText}>This item is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { product, matchScore, matchReasons } = matched;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
        <TouchableOpacity style={styles.wishlistToggle} onPress={() => toggleWishlist(product)}>
          <Text style={styles.wishlistToggleText}>{wishlistDocId ? '♥ SAVED' : '♡ SAVE'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="cover" />

        <View style={styles.body}>
          <Text style={styles.brand}>{product.brand.toUpperCase()}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
            {isOnSale(product) && (
              <>
                <Text style={styles.originalPrice}>${product.originalPrice!.toFixed(2)}</Text>
                <View style={styles.saleBadge}>
                  <Text style={styles.saleBadgeText}>-{discountPercent(product)}%</Text>
                </View>
              </>
            )}
          </View>
          <Text style={styles.retailer}>at {product.retailer}</Text>

          {matchScore >= 60 && (
            <View style={styles.matchBox}>
              <Text style={styles.matchBoxTitle}>Why this matches you</Text>
              {matchReasons.map((reason, i) => (
                <Text key={i} style={styles.matchReason}>· {reason}</Text>
              ))}
            </View>
          )}

          {ownedMatches.length > 0 && (
            <View style={styles.ownedBox}>
              <Text style={styles.matchBoxTitle}>Already in your closet</Text>
              <Text style={styles.ownedIntro}>
                You own {ownedMatches.length} similar {ownedMatches.length === 1 ? 'piece' : 'pieces'} - worth a look before buying another.
              </Text>
            </View>
          )}

          <Button
            title={opening ? 'Opening…' : `Shop at ${product.retailer}`}
            onPress={() => handleShop(product)}
            disabled={opening}
            fullWidth
            style={{ marginTop: spacing.section }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
  },
  wishlistToggle: {
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  wishlistToggleText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: colors.ink,
  },
  content: {
    paddingBottom: 60,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...textType.body,
    color: colors.inkMuted,
  },
  heroImage: {
    width: '100%',
    height: 420,
    backgroundColor: colors.paper,
    marginTop: 12,
  },
  body: {
    paddingHorizontal: spacing.page,
    paddingTop: 20,
  },
  brand: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.inkFaint,
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.ink,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  price: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 20,
    color: colors.ink,
  },
  originalPrice: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.inkFaint,
    textDecorationLine: 'line-through',
    marginLeft: 10,
  },
  saleBadge: {
    backgroundColor: colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
  },
  saleBadgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: colors.bone,
  },
  retailer: {
    ...textType.meta,
    marginTop: 4,
  },
  matchBox: {
    marginTop: spacing.section,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: colors.camel,
  },
  matchBoxTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.ink,
    marginBottom: 6,
  },
  matchReason: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 2,
  },
  ownedBox: {
    marginTop: spacing.section,
    backgroundColor: colors.paper,
    padding: 14,
  },
  ownedIntro: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
});

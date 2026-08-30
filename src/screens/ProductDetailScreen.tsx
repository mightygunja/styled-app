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
import { useRoute, RouteProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { getActiveAdapter, activeProviderName, curatedCatalogNotice } from '../services/affiliateNetwork';
import { buildProfileMatchContext } from '../services/profileMatchContext';
import {
  spendProfile,
  budgetVerdict,
  forecastCostPerWear,
  WearForecast,
} from '../services/costPerWearForecast';
import { shopperSignals } from '../services/shopperSignals';
import { scoreProduct, MATCH_THRESHOLD } from '../services/marketplaceMatchingService';
import { wishlistService, affiliateClicksService } from '../services/firestore';
import { closetAPI, getCurrentUserId } from '../services/api';
import { findSimilarOwnedItems } from '../models/storeCheck';
import { Product, MatchedProduct, isOnSale, discountPercent } from '../models/product';
import { Item } from '../types';
import { haptics } from '../utils/haptics';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen() {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { productId, surface, reason } = route.params;

  const [loading, setLoading] = useState(true);
  const [matched, setMatched] = useState<MatchedProduct | null>(null);
  const [ownedMatches, setOwnedMatches] = useState<ReturnType<typeof findSimilarOwnedItems>>([]);
  const [wishlistDocId, setWishlistDocId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [budget, setBudget] = useState<{ label: string; withinBudget: boolean } | null>(null);
  const [wearForecast, setWearForecast] = useState<WearForecast | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      const [liveProduct, profile, closetResponse, saved] = await Promise.all([
        getActiveAdapter().getById(productId),
        buildProfileMatchContext(userId),
        closetAPI.getItems(userId),
        wishlistService.getSaved(userId, productId),
      ]);
      // The adapter can lose track of a product the user saved - curated ids
      // get renamed, and live providers can't resolve an id from a previous
      // session. The wishlist doc keeps a snapshot of what they saw, so a
      // saved item always opens instead of dead-ending.
      const product = liveProduct ?? saved?.product ?? null;
      if (!product) {
        setMatched(null);
        setWishlistDocId(saved?.id ?? null);
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

      // Budget and cost-per-wear are both inferred from this user's own closet
      // rather than a budget they had to configure.
      const rawCloset = closetResponse.data || [];
      setBudget(budgetVerdict(spendProfile(rawCloset, product.category), product.price));
      setWearForecast(forecastCostPerWear(rawCloset, product.category, product.price));
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
      setWishlistDocId(saved?.id ?? null);
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
        shopperSignals.recordSave(product);
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
        // Two separate records on purpose: Firestore for revenue accounting,
        // local signals for ranking. Different lifetimes, different costs.
        // Attributed so the admin view can say which surface and which kind of
        // reason actually produced the click.
        affiliateClicksService.record(userId, product, {
          surface: surface || 'unknown',
          reason,
          matchScore: (product as any).matchScore,
          provider: activeProviderName(),
        }),
        shopperSignals.recordTap(product),
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
          <TouchableOpacity onPress={() => navigation.navigate('Shop')}>
            <Text style={styles.emptyLink}>Browse the shop →</Text>
          </TouchableOpacity>
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
          <Text style={styles.wishlistToggleText}>{wishlistDocId ? 'SAVED' : 'SAVE'}</Text>
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

          {/* Amazon's operating agreement requires its disclosure wherever
              its links appear, and the shop button below is one - and the
              same line owns up that the photo above is representative, not
              the SKU, before the user compares it to the landing page. */}
          {!!curatedCatalogNotice() && (
            <Text style={styles.catalogNotice}>{curatedCatalogNotice()}</Text>
          )}

          {(budget || (wearForecast && wearForecast.verdict !== 'unknown')) && (
            <View style={styles.affordabilityBox}>
              {budget && (
                <Text style={[styles.budgetLine, !budget.withinBudget && styles.budgetLineOver]}>
                  {budget.label}
                </Text>
              )}
              {wearForecast && wearForecast.projectedCostPerWear !== null && (
                <Text style={styles.cpwLine}>
                  Likely about ${wearForecast.projectedCostPerWear.toFixed(2)} per wear — you wear
                  your {product.category} around {wearForecast.projectedWears} times over two years.
                </Text>
              )}
            </View>
          )}

          {matched.unlock && matched.unlock.newOutfits > 0 && (
            <View style={styles.unlockBox}>
              <Text style={styles.unlockNumber}>
                +{matched.unlock.newOutfits} {matched.unlock.newOutfits === 1 ? 'outfit' : 'outfits'}
              </Text>
              <Text style={styles.unlockSub}>
                that you can't make today, from pieces already in your closet
              </Text>
              {matched.unlock.bestPairings.length > 0 && (
                <Text style={styles.unlockPairs}>
                  Pairs with your {matched.unlock.bestPairings.map(p => p.label).join(', ')}
                </Text>
              )}
            </View>
          )}

          {matched.signals.length > 0 && (
            <View style={styles.matchBox}>
              <Text style={styles.matchBoxTitle}>Why this works for you</Text>
              {matched.signals.map((signal, i) => (
                <View key={i} style={styles.signalRow}>
                  <View
                    style={[
                      styles.signalDot,
                      signal.strength === 'strong' && styles.signalDotStrong,
                    ]}
                  />
                  <Text
                    style={[
                      styles.signalText,
                      signal.strength === 'strong' && styles.signalTextStrong,
                    ]}
                  >
                    {signal.text}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Shown deliberately. A recommender that only ever argues in favour
              is advertising; naming the catch is what makes the rest credible. */}
          {matched.concerns.length > 0 && (
            <View style={styles.concernBox}>
              <Text style={styles.concernTitle}>Worth knowing</Text>
              {matched.concerns.map((concern, i) => (
                <Text key={i} style={styles.concernText}>{concern}</Text>
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

          {/* The only explicit negative signal in the app. Without it the
              ranking only ever learns from approval, which biases it toward
              whatever it already shows. */}
          <TouchableOpacity
            style={styles.dismissRow}
            onPress={async () => {
              await shopperSignals.recordDismiss(product);
              navigation.goBack();
            }}
          >
            <Text style={styles.dismissText}>Not for me — show me less like this</Text>
          </TouchableOpacity>

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
  emptyLink: {
    ...textType.body,
    color: colors.camel,
    marginTop: 8,
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
  affordabilityBox: {
    marginTop: spacing.md,
    backgroundColor: colors.paper,
    padding: 14,
  },
  budgetLine: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.ink,
  },
  budgetLineOver: {
    color: colors.tobacco,
  },
  cpwLine: {
    ...textType.body,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 6,
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
  catalogNotice: {
    ...textType.meta,
    fontSize: 11,
    color: colors.tobacco,
    marginTop: 10,
  },
  // The unlock is the headline argument, so it gets the only filled panel on
  // the page rather than sharing the hairline-rule treatment of the reasons.
  unlockBox: {
    marginTop: spacing.section,
    backgroundColor: colors.paper,
    padding: spacing.lg,
  },
  unlockNumber: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.ink,
  },
  unlockSub: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 4,
  },
  unlockPairs: {
    ...textType.meta,
    fontSize: 12,
    marginTop: 10,
    textTransform: 'capitalize',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  signalDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.inkFaint,
    marginTop: 8,
    marginRight: 10,
  },
  signalDotStrong: {
    backgroundColor: colors.camel,
  },
  signalText: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
    flex: 1,
  },
  signalTextStrong: {
    color: colors.ink,
  },
  dismissRow: {
    marginTop: spacing.section,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissText: {
    ...textType.meta,
    fontSize: 12,
    color: colors.inkFaint,
  },
  concernBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.sand,
    padding: spacing.md,
  },
  concernTitle: {
    ...textType.microLabel,
    color: colors.tobacco,
    marginBottom: 6,
  },
  concernText: {
    ...textType.body,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 4,
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

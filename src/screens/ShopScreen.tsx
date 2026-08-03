import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Chip from '../components/Chip';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { getActiveAdapter, isMockProvider } from '../services/affiliateNetwork';
import { buildProfileMatchContext } from '../services/profileMatchContext';
import { scoreAndRankProducts, MATCH_THRESHOLD } from '../services/marketplaceMatchingService';
import { MatchedProduct, isOnSale, discountPercent, ProductSort } from '../models/product';
import { ItemCategory, Item } from '../types';
import { closetAPI, getCurrentUserId } from '../services/api';
import { shopperSignals } from '../services/shopperSignals';
import { getCurrentWeather } from '../services/weatherService';

const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: 'match', label: 'Best match' },
  { value: 'price-low', label: 'Price ↑' },
  { value: 'price-high', label: 'Price ↓' },
  { value: 'discount', label: 'Biggest discount' },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ShopRouteProp = RouteProp<RootStackParamList, 'Shop'>;

const CATEGORY_FILTERS: { label: string; value: ItemCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Tops', value: 'tops' },
  { label: 'Bottoms', value: 'bottoms' },
  { label: 'Dresses', value: 'dresses' },
  { label: 'Outerwear', value: 'outerwear' },
  { label: 'Shoes', value: 'shoes' },
  { label: 'Accessories', value: 'accessories' },
];

export default function ShopScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ShopRouteProp>();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ItemCategory | 'all'>(route.params?.category || 'all');
  const [matchedOnly, setMatchedOnly] = useState(!!route.params?.matchedOnly);
  const [secondhandOnly, setSecondhandOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sort, setSort] = useState<ProductSort>('match');
  const [products, setProducts] = useState<MatchedProduct[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      const [searchResult, profile, closetResponse, signals, weather] = await Promise.all([
        getActiveAdapter().search({
          query: query.trim() || undefined,
          category: category === 'all' ? undefined : category,
          condition: secondhandOnly ? 'secondhand' : undefined,
          onSaleOnly: onSaleOnly || undefined,
          sort,
          pageSize: 60,
        }),
        buildProfileMatchContext(userId),
        closetAPI.getItems(userId),
        shopperSignals.load(),
        // Weather sharpens seasonality but must never block the page - a failed
        // lookup just means the calendar season carries the signal alone.
        getCurrentWeather().catch(() => undefined),
      ]);
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
        purchaseDate: item.purchaseDate,
        createdAt: item.createdAt,
        tags: item.tags,
        seasons: item.seasons,
        style: item.style,
      }));
      const ranked = scoreAndRankProducts(searchResult.products, profile, closetItems, {
        signals,
        weather: weather ? { condition: weather.condition, temperature: weather.temperature } : undefined,
      });

      // Only the first screenful counts as seen. Recording the whole result set
      // would decay products the user never actually scrolled to.
      shopperSignals.recordImpressions(ranked.slice(0, 12).map(r => r.product.id));
      setProducts(ranked);
    } catch (error) {
      console.error('Error loading marketplace products:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, secondhandOnly, onSaleOnly, sort]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      // Re-run on focus too so wishlist/closet changes made on other screens
      // are reflected in match scores when the user comes back.
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const visibleProducts = useMemo(
    () => (matchedOnly ? products.filter(p => p.matchScore >= MATCH_THRESHOLD) : products),
    [products, matchedOnly]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
        <TouchableOpacity style={styles.wishlistButton} onPress={() => navigation.navigate('Wishlist')}>
          <Text style={styles.wishlistButtonText}>SAVED</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>SHOP</Text>
        <Text style={styles.title}>Shop your matches</Text>
        <Text style={styles.subtitle}>
          Filtered against your color season, body & fit profile, style archetypes, and what's already in your closet.
        </Text>
        {isMockProvider() && (
          <Text style={styles.devNotice}>
            Sample picks curated by us, not a live retailer feed yet - each one links to a real search on the
            retailer's site rather than a specific in-stock item.
          </Text>
        )}
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search brands, items, styles..."
        placeholderTextColor={colors.inkFaint}
        value={query}
        onChangeText={setQuery}
        clearButtonMode="while-editing"
      />

      {/* Category is primary navigation, so it sits directly under search and
          keeps a row to itself. Refinements are secondary and share the row
          below. Both scroll horizontally - chips are flexShrink: 0, so any
          non-scrolling row silently clips once its contents outgrow the
          screen, which is exactly what happened when a third filter landed in
          what used to be a plain View. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORY_FILTERS.map(item => (
          <Chip
            key={item.value}
            label={item.label}
            active={category === item.value}
            onPress={() => setCategory(item.value)}
            style={styles.chipSpacing}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.refineScroll}
        contentContainerStyle={styles.refineContent}
      >
        <Chip
          label="Matched to you"
          active={matchedOnly}
          onPress={() => setMatchedOnly(!matchedOnly)}
          style={styles.chipSpacing}
        />
        <Chip
          label="Secondhand"
          active={secondhandOnly}
          onPress={() => setSecondhandOnly(!secondhandOnly)}
          style={styles.chipSpacing}
        />
        <Chip
          label="On sale"
          active={onSaleOnly}
          onPress={() => setOnSaleOnly(!onSaleOnly)}
          style={styles.chipSpacing}
        />
        <View style={styles.refineDivider} />
        {SORT_OPTIONS.map(option => (
          <Chip
            key={option.value}
            label={option.label}
            active={sort === option.value}
            onPress={() => setSort(option.value)}
            style={styles.chipSpacing}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      ) : (
        <FlatList
          data={visibleProducts}
          keyExtractor={m => m.product.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No matches for this filter yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.product.id })}
            >
              <View style={styles.cardImageWrap}>
                <Image source={{ uri: item.product.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                {isOnSale(item.product) && (
                  <View style={styles.saleBadge}>
                    <Text style={styles.saleBadgeText}>-{discountPercent(item.product)}%</Text>
                  </View>
                )}
                {/* The outfit count beats a generic MATCH badge: it says what
                    the user gets rather than that an algorithm approved. */}
                {item.unlock && item.unlock.newOutfits >= 2 ? (
                  <View style={styles.unlockBadge}>
                    <Text style={styles.unlockBadgeText}>+{item.unlock.newOutfits} OUTFITS</Text>
                  </View>
                ) : item.matchScore >= MATCH_THRESHOLD ? (
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>MATCH</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardBrand}>{item.product.brand}</Text>
              <Text style={styles.cardName} numberOfLines={1}>{item.product.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.cardPrice}>${item.product.price.toFixed(0)}</Text>
                {isOnSale(item.product) && (
                  <Text style={styles.cardOriginalPrice}>${item.product.originalPrice!.toFixed(0)}</Text>
                )}
              </View>
              {!!item.headline && (
                <Text style={styles.matchReason} numberOfLines={2}>{item.headline}</Text>
              )}
              {item.concerns[0] && (
                <Text style={styles.cardConcern} numberOfLines={1}>{item.concerns[0]}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
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
  wishlistButton: {
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  wishlistButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.ink,
  },
  titleBlock: {
    paddingHorizontal: spacing.page,
    marginTop: 12,
  },
  eyebrow: {
    ...textType.eyebrow,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    color: colors.ink,
  },
  subtitle: {
    ...textType.body,
    color: colors.inkMuted,
    marginTop: 8,
  },
  devNotice: {
    ...textType.meta,
    fontSize: 11,
    color: colors.tobacco,
    marginTop: 8,
  },
  searchInput: {
    marginHorizontal: spacing.page,
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.hair,
    color: colors.ink,
  },
  // A ScrollView's own `style` carries only its box layout; anything that
  // positions children (alignItems, justifyContent) belongs on
  // contentContainerStyle or React Native throws an invariant violation.
  //
  // No fixed heights here on purpose. The previous version pinned these rows
  // to 48px, which clips the moment a chip grows - larger accessibility text
  // sizes being the obvious case. flexGrow/flexShrink 0 keeps the row from
  // stealing space from the product grid while still sizing to its content.
  categoryScroll: {
    marginTop: 10,
    flexGrow: 0,
    flexShrink: 0,
  },
  categoryContent: {
    paddingHorizontal: spacing.page,
    paddingVertical: 6,
    alignItems: 'center',
  },
  refineScroll: {
    marginTop: 8,
    flexGrow: 0,
    flexShrink: 0,
  },
  refineContent: {
    paddingHorizontal: spacing.page,
    paddingVertical: 6,
    alignItems: 'center',
  },
  // Separates filters from sort options inside the shared refinement row, so
  // two different kinds of control don't read as one undifferentiated list.
  refineDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 6,
    marginRight: 8,
    backgroundColor: colors.hair,
  },
  chipSpacing: {
    marginRight: 8,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    ...textType.body,
    color: colors.inkMuted,
  },
  gridContent: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: '48%',
  },
  cardImageWrap: {
    aspectRatio: 0.85,
    backgroundColor: colors.paper,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  saleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  saleBadgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    color: colors.bone,
  },
  unlockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  unlockBadgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: colors.bone,
  },
  cardConcern: {
    ...textType.meta,
    fontSize: 10,
    color: colors.tobacco,
    marginTop: 2,
  },
  matchBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.camel,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  matchBadgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: colors.ink,
  },
  cardBrand: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.inkFaint,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  cardName: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.ink,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardPrice: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.ink,
  },
  cardOriginalPrice: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.inkFaint,
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  matchReason: {
    ...textType.meta,
    fontSize: 10,
    color: colors.tobacco,
    marginTop: 4,
  },
});

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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Chip from '../components/Chip';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { getActiveAdapter, curatedCatalogNotice, amazonSearchUrl } from '../services/affiliateNetwork';
import { buildProfileMatchContext } from '../services/profileMatchContext';
import { scoreAndRankProducts, MATCH_THRESHOLD } from '../services/marketplaceMatchingService';
import { MatchedProduct, isOnSale, discountPercent, ProductSort } from '../models/product';
import { ItemCategory, Item } from '../types';
import { closetAPI, getCurrentUserId } from '../services/api';
import { shopperSignals } from '../services/shopperSignals';
import { affiliateImpressions } from '../services/affiliateImpressions';
import { getCurrentWeather } from '../services/weatherService';
import { getPublishedTrends } from '../services/trendService';
import { FashionTrend, trendTextMatch, TrendMatchKind } from '../models/fashionTrend';
import { useGridColumns, padToColumns, isGridSpacer, gridItemWidth } from '../theme/responsive';

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
  const gridColumns = useGridColumns();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ItemCategory | 'all'>(route.params?.category || 'all');
  // On web the param arrives as a string, where "false" is truthy — compare,
  // don't coerce. String(undefined) is "undefined", so absent stays off.
  const [matchedOnly, setMatchedOnly] = useState(
    String(route.params?.matchedOnly) === 'true'
  );
  const toggleMatchedOnly = () => {
    const next = !matchedOnly;
    setMatchedOnly(next);
    // Keep the address bar honest on web: without this the URL pins the old
    // value and a refresh silently re-enables the filter the user turned off.
    navigation.setParams({ matchedOnly: next ? true : undefined });
  };
  const [secondhandOnly, setSecondhandOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sort, setSort] = useState<ProductSort>('match');
  const [products, setProducts] = useState<MatchedProduct[]>([]);
  const [wardrobeFocus, setWardrobeFocus] = useState<'womens' | 'mens' | 'all'>('all');
  const [allTrends, setAllTrends] = useState<FashionTrend[]>([]);
  // "Shopping the trend" focus, set when a trend surface sent the user here.
  // Filters and orders the grid to pieces that actually carry the trend.
  const [focusTrend, setFocusTrend] = useState<FashionTrend | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      // Profile is fetched first so its colours and archetypes can be sent as
      // part of the search brief. Providers that take a natural-language brief
      // (Sovrn) use it to return better candidates; keyword providers ignore
      // the extra fields harmlessly.
      const profile = await buildProfileMatchContext(userId);
      setWardrobeFocus(profile?.wardrobeFocus ?? 'all');

      const [searchResult, closetResponse, signals, weather, publishedTrends] = await Promise.all([
        getActiveAdapter().search({
          query: query.trim() || undefined,
          category: category === 'all' ? undefined : category,
          condition: secondhandOnly ? 'secondhand' : undefined,
          onSaleOnly: onSaleOnly || undefined,
          // Palette is deliberately NOT sent: colors is a hard filter, and it
          // was deleting whole subcategories from browse and search (every
          // sunglass is black/tortoise/gold — none survive a warm palette).
          // Color affinity is scoring's job: scoreAndRankProducts boosts
          // palette hits, knows neutrals, and penalizes avoid-list colors.
          styleArchetypes: profile?.styleArchetypes,
          silhouettes: profile?.recommendedSilhouettes?.slice(0, 4),
          sort,
          // Deep enough to cover the largest catalogue category (tops, 94):
          // a 60-item page silently cut the tail of every big category — the
          // newest additions, since balanced order puts them last per bucket.
          pageSize: 160,
        }),
        closetAPI.getItems(userId),
        shopperSignals.load(),
        // Weather sharpens seasonality but must never block the page - a failed
        // lookup just means the calendar season carries the signal alone.
        getCurrentWeather().catch(() => undefined),
        // Session-cached; enriches ranking (trend signals on cards) and powers
        // the trend focus. Never blocks the page.
        getPublishedTrends().catch(() => [] as FashionTrend[]),
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
      setAllTrends(publishedTrends);
      const ranked = scoreAndRankProducts(searchResult.products, profile, closetItems, {
        signals,
        weather: weather ? { condition: weather.condition, temperature: weather.temperature } : undefined,
        trends: publishedTrends,
      });

      // Only the first screenful counts as seen. Recording the whole result set
      // would decay products the user never actually scrolled to.
      shopperSignals.recordImpressions(ranked.slice(0, 12).map(r => r.product.id));
      // Same first-screenful rule, counted centrally so tap-through has a
      // denominator. Counts only - no product or user identity leaves here.
      affiliateImpressions.recordImpressions(
        'shop',
        ranked.slice(0, 12).map(r => r.product.price || 0)
      );
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

  // Resolve the trend focus whenever a trend surface navigates here (or the
  // params clear). Kept in an effect rather than the load path so tapping a
  // different trend on the report refocuses an already-mounted Shop.
  useEffect(() => {
    const trendId = route.params?.trendId;
    if (!trendId) {
      setFocusTrend(null);
      return;
    }
    if (allTrends.length) {
      setFocusTrend(allTrends.find(t => t.id === trendId) ?? null);
    }
  }, [route.params?.trendId, allTrends]);

  const clearTrendFocus = () => {
    setFocusTrend(null);
    navigation.setParams({ trendId: undefined, trendName: undefined, trendGap: undefined });
  };

  // Under a trend focus the grid shows only pieces that carry the trend, in
  // honesty order: pieces matching the specific gap the user came to fill,
  // then real garment matches, then the trend's cuts, then its colours - and
  // within each, the personal match score.
  const trendFiltered = useMemo(() => {
    if (!focusTrend) return products;
    const kindOrder: Record<TrendMatchKind, number> = { garment: 1, silhouette: 2, color: 3 };
    // "Worth adding: camel wide-leg trousers" -> significant tokens the user
    // is actually here for. Short filler words carry no meaning.
    const gapTokens = (route.params?.trendGap || '')
      .toLowerCase()
      .split(/[^a-z-]+/)
      .filter(t => t.length > 3);
    return products
      .map(m => {
        const haystack = [m.product.name, m.product.subcategory, ...(m.product.styleTags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const kind = trendTextMatch(focusTrend, haystack, m.product.color);
        if (!kind) return null;
        const fillsGap = gapTokens.length > 0 && gapTokens.some(t => haystack.includes(t));
        return { m, order: fillsGap ? 0 : kindOrder[kind] };
      })
      .filter((x): x is { m: MatchedProduct; order: number } => x !== null)
      .sort((a, b) => a.order - b.order || b.m.matchScore - a.m.matchScore)
      .map(x => x.m);
  }, [products, focusTrend, route.params?.trendGap]);

  const visibleProducts = useMemo(
    () => (matchedOnly ? trendFiltered.filter(p => p.matchScore >= MATCH_THRESHOLD) : trendFiltered),
    [trendFiltered, matchedOnly]
  );

  // A menswear focus never sees a dress - departmentAllowed drops the whole
  // category, so offering the chip would guarantee an empty grid. Hide it
  // rather than explain it.
  const categoryFilters = useMemo(
    () =>
      wardrobeFocus === 'mens'
        ? CATEGORY_FILTERS.filter(f => f.value !== 'dresses')
        : CATEGORY_FILTERS,
    [wardrobeFocus]
  );

  // If a route param or an earlier tap left Dresses selected before the
  // profile loaded, snap back to All so the user isn't stuck on a filter
  // whose chip no longer exists.
  useEffect(() => {
    if (wardrobeFocus === 'mens' && category === 'dresses') {
      setCategory('all');
    }
  }, [wardrobeFocus, category]);

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
          Ranked against your color season, body & fit profile, style archetypes, and what's already in your closet.
        </Text>
        {!!curatedCatalogNotice() && (
          <Text style={styles.devNotice}>{curatedCatalogNotice()}</Text>
        )}

        {/* Trend focus: the user tapped "Find the piece" on a specific trend,
            so the page owes them results that carry THAT trend - and a plain
            statement of what they came for. */}
        {focusTrend && (
          <View style={styles.trendFocusBox}>
            <View style={styles.trendFocusText}>
              <Text style={styles.trendFocusLabel}>
                SHOPPING THE TREND · {focusTrend.stage.toUpperCase()} IN {focusTrend.region.toUpperCase()}
              </Text>
              <Text style={styles.trendFocusName}>{focusTrend.name}</Text>
              {!!route.params?.trendGap && (
                <Text style={styles.trendFocusGap}>Looking for: {route.params.trendGap}</Text>
              )}
              {/* The exact piece, straight from the source. The in-app grid
                  is bounded by the catalogue; this is not - a tagged Amazon
                  search for precisely what the trend told them to find. */}
              {!!route.params?.trendGap && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Search Amazon for ${route.params.trendGap}`}
                  onPress={() => Linking.openURL(amazonSearchUrl(route.params!.trendGap!))}
                >
                  <Text style={styles.trendFocusSearch}>
                    Search Amazon for “{route.params.trendGap}” →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={clearTrendFocus}
              accessibilityRole="button"
              accessibilityLabel="Stop shopping this trend"
            >
              <Text style={styles.trendFocusClear}>CLEAR</Text>
            </TouchableOpacity>
          </View>
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
        {categoryFilters.map(item => (
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
          onPress={toggleMatchedOnly}
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
          // numColumns can't change on a mounted list; the key remounts it
          // when a browser resize crosses a breakpoint.
          key={`shop-grid-${gridColumns}`}
          data={padToColumns(visibleProducts as any[], gridColumns)}
          keyExtractor={(m: any) => m.product?.id ?? m.id}
          numColumns={gridColumns}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {focusTrend
                  ? `Nothing in the catalogue carries "${focusTrend.name}" right now — clear the trend to browse everything.`
                  : 'No matches for this filter yet.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            isGridSpacer(item) ? <View style={{ width: gridItemWidth(gridColumns) }} /> :
            <TouchableOpacity
              style={[styles.card, { width: gridItemWidth(gridColumns) }]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('ProductDetail', {
                  productId: item.product.id,
                  surface: 'shop',
                  reason: item.headline,
                })
              }
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
  // Same camel-rule "trend voice" treatment as Home and the Trend Report.
  trendFocusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.paper,
    borderLeftWidth: 2,
    borderLeftColor: colors.camel,
  },
  trendFocusText: { flex: 1, paddingRight: 10 },
  trendFocusLabel: { ...textType.eyebrow, fontSize: 9, color: colors.camel },
  trendFocusName: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink, marginTop: 4 },
  trendFocusGap: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.ink,
    marginTop: 4,
  },
  trendFocusClear: { ...textType.eyebrow, fontSize: 10, color: colors.tobacco, paddingVertical: 4 },
  trendFocusSearch: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
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

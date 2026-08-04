/**
 * Explore
 *
 * Discovery grounded in the closet the user actually owns. Every section
 * answers a question about their wardrobe: what it can make today, what is
 * holding it back, and what would open it up.
 *
 * This is deliberately not Shop. Shop has a search box, filters and a sort,
 * because that is where someone goes when they already know what they want.
 * Nothing on this screen is user-driven - it is the app making an argument,
 * and it has to be able to say why every time.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from '../components/BackButton';
import { RootStackParamList } from '../navigation/types';
import { MatchedProduct } from '../models/product';
import {
  discoveryService,
  DiscoveryData,
  MIN_CLOSET_FOR_ARITHMETIC,
} from '../services/discoveryService';
import { isMockProvider } from '../services/affiliateNetwork';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ExploreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [data, setData] = useState<DiscoveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      const result = await discoveryService.loadDiscovery();
      setData(result);
    } catch (error) {
      console.error('Error loading discovery:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openProduct = (productId: string) =>
    navigation.navigate('ProductDetail', { productId });

  const renderProductRow = (matched: MatchedProduct, reason: string, emphasis?: string) => {
    const { product } = matched;
    return (
      <TouchableOpacity
        key={product.id}
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => openProduct(product.id)}
      >
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.thumb} />
        ) : (
          <View style={styles.thumb} />
        )}
        <View style={styles.rowText}>
          {!!emphasis && <Text style={styles.emphasis}>{emphasis}</Text>}
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.productMeta}>
            {[product.brand, product.price ? `$${product.price}` : null]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
          <Text style={styles.reason} numberOfLines={2}>
            {reason}
          </Text>
          {/* Concerns are shown, not buried. A recommendation that cannot
              admit a downside is an advert. */}
          {matched.concerns?.length > 0 && (
            <Text style={styles.concern} numberOfLines={1}>
              {matched.concerns[0]}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderBody = () => {
    if (!data) return null;

    const { summary, unlocks, matched, fillsGap, edit, productsById } = data;
    const closetLine = discoveryService.summaryLine(summary);
    const thinCloset = summary.totalItems < MIN_CLOSET_FOR_ARITHMETIC;

    if (matched.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nothing to show yet</Text>
          <Text style={styles.emptyText}>
            No pieces came back from the retailers we search. Pull down to try again.
          </Text>
        </View>
      );
    }

    return (
      <>
        {/* The arithmetic comes first because everything below it is an
            argument from these numbers. */}
        {closetLine && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>YOUR WARDROBE, TODAY</Text>
            <Text style={styles.summaryText}>{closetLine}</Text>
          </View>
        )}

        {thinCloset && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>ADD A FEW PIECES</Text>
            <Text style={styles.summaryText}>
              With {summary.totalItems} {summary.totalItems === 1 ? 'item' : 'items'} logged we
              can't yet tell you what a piece would add to your wardrobe. Everything below is
              matched to your style profile only.
            </Text>
            <TouchableOpacity
              style={styles.summaryAction}
              onPress={() => navigation.navigate('AddClosetItem')}
            >
              <Text style={styles.summaryActionText}>Add to closet</Text>
            </TouchableOpacity>
          </View>
        )}

        {edit && (
          <View style={styles.editSection}>
            <Text style={styles.sectionLabel}>THE EDIT</Text>
            <Text style={styles.editTitle}>{edit.title}</Text>
            {!!edit.standfirst && <Text style={styles.editStandfirst}>{edit.standfirst}</Text>}
            <View style={styles.editPicks}>
              {edit.picks.map(pick => {
                const product = productsById.get(pick.productId);
                return product ? renderProductRow(product, pick.line) : null;
              })}
            </View>
          </View>
        )}

        {unlocks.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>OPENS UP YOUR CLOSET</Text>
            <Text style={styles.sectionNote}>
              Ranked by how many outfits each would create from pieces you already own. Counted,
              not estimated.
            </Text>
            {unlocks.slice(0, 8).map(m => {
              // unlocks is already filtered on newOutfits > 0, so unlock is
              // present here - but the type is nullable, so read it once.
              const unlock = m.unlock;
              if (!unlock) return null;
              return renderProductRow(
                m,
                unlock.bestPairings.length
                  ? `Works with your ${unlock.bestPairings.map(p => p.label).join(', ')}`
                  : m.headline,
                `+${unlock.newOutfits} ${unlock.newOutfits === 1 ? 'outfit' : 'outfits'}`
              );
            })}
          </>
        )}

        {summary.bottleneckRole && fillsGap.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              FILLS YOUR GAP · {summary.bottleneckRole === 'top' ? 'TOPS' : 'BOTTOMS'}
            </Text>
            <Text style={styles.sectionNote}>
              You own more {summary.bottleneckRole === 'top' ? 'bottoms than tops' : 'tops than bottoms'}, so
              this is the side of your wardrobe with the most room in it.
            </Text>
            {fillsGap.slice(0, 6).map(m => renderProductRow(m, m.headline))}
          </>
        )}

        <Text style={styles.sectionLabel}>MATCHED TO YOUR PROFILE</Text>
        <Text style={styles.sectionNote}>
          Scored against your colours, silhouettes and the season — regardless of what it pairs
          with.
        </Text>
        {matched.slice(0, 10).map(m => renderProductRow(m, m.headline))}

        <TouchableOpacity
          style={styles.footerLink}
          onPress={() => navigation.navigate('Shop', undefined)}
        >
          <Text style={styles.footerLinkText}>Browse everything in Shop →</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.ink} />
        }
      >
        <Text style={styles.eyebrow}>DISCOVER</Text>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>
          Pieces chosen against the wardrobe you already own — with the reason attached to every
          one.
        </Text>

        {/* Named plainly rather than dressed up. Someone deciding whether to
            trust a recommendation deserves to know it is a demo catalogue. */}
        {isMockProvider() && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Showing a sample catalogue. Connect a retail partner and these become live,
              purchasable products — the scoring below is already real.
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : failed ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Couldn't load</Text>
            <Text style={styles.emptyText}>Pull down to try again.</Text>
          </View>
        ) : (
          renderBody()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  busyBox: { paddingVertical: 80, alignItems: 'center' },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },

  noticeBox: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.md,
  },
  noticeText: { ...textType.meta, fontSize: 12, lineHeight: 18 },

  summaryBox: { marginTop: spacing.lg, backgroundColor: colors.paper, padding: spacing.lg },
  summaryLabel: { ...textType.eyebrow, marginBottom: 10 },
  summaryText: { ...textType.body, color: colors.ink, lineHeight: 22 },
  summaryAction: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  summaryActionText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.white },

  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 10 },
  sectionNote: { ...textType.meta, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },

  // The Edit is the one place on the screen with a voice rather than a
  // ranking, so it gets the serif treatment and room to breathe.
  editSection: { marginTop: spacing.section },
  editTitle: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 30, color: colors.ink },
  editStandfirst: { ...textType.body, color: colors.inkMuted, marginTop: 10, lineHeight: 22 },
  editPicks: { marginTop: spacing.lg },

  row: {
    flexDirection: 'row',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  thumb: { width: 76, height: 96, backgroundColor: colors.paper },
  rowText: { flex: 1, marginLeft: 14 },
  emphasis: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.tobacco, marginBottom: 4 },
  productName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  productMeta: { ...textType.meta, fontSize: 12, marginTop: 2 },
  reason: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginTop: 6, lineHeight: 19 },
  concern: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkFaint, marginTop: 4 },

  emptyBox: { marginTop: spacing.section, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },

  footerLink: { marginTop: spacing.section, paddingVertical: spacing.md },
  footerLinkText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.tobacco },
});

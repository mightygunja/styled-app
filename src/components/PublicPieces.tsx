/**
 * A rail of catalogue pieces for the logged-out pages (guides, the public
 * trend page). Everything about it exists so that a reader without an
 * account - and a crawler or affiliate-network reviewer, who never has one -
 * sees real products with real outbound links.
 *
 * On web each shop button is a genuine <a href> rendered into the static
 * HTML (the public pages are pre-rendered, see scripts/prerender), with
 * rel="sponsored" as affiliate links must carry. On native it is a press
 * that opens the same URL. The link is the one the signed-in Shop would
 * build (staticShopUrl), so nothing here is a second, weaker route.
 *
 * Two rails per surface, women's and men's, switched by the reader: a
 * public page has no wardrobe focus to read, and the one thing it must not
 * do is show menswear to someone shopping womenswear or the reverse.
 */

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { Product } from '../models/product';
import { BALANCED_CATALOG } from '../data/mockProductCatalog';
import { staticShopUrl, shopDestination, curatedCatalogNotice } from '../services/affiliateNetwork';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

export type PublicFocus = 'womens' | 'mens';

const byId = new Map(BALANCED_CATALOG.map(p => [p.id, p]));

/** Catalogue rows for a list of short ids (`b001`), in the given order; unknown ids are skipped. */
export function resolvePieces(ids: string[]): Product[] {
  return ids.map(id => byId.get(id.startsWith('p-') ? id : `p-${id}`)).filter((p): p is Product => !!p);
}

function ShopLink({ product }: { product: Product }) {
  const url = staticShopUrl(product);
  const store = shopDestination(product);
  if (!url || !store) return null;
  const label = `Shop at ${store}`;
  if (Platform.OS === 'web') {
    // react-native-web turns a Text with href into an anchor.
    const anchor = { href: url, hrefAttrs: { target: '_blank', rel: 'sponsored noopener' } } as any;
    return (
      <Text {...anchor} accessibilityRole="link" style={styles.shopLink}>
        {label}
      </Text>
    );
  }
  return (
    <TouchableOpacity accessibilityRole="link" onPress={() => Linking.openURL(url).catch(() => {})}>
      <Text style={styles.shopLink}>{label}</Text>
    </TouchableOpacity>
  );
}

export function PieceCard({ product }: { product: Product }) {
  return (
    <View style={styles.card}>
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.photo} accessibilityLabel={product.name} />
      ) : (
        <View style={styles.photo} />
      )}
      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {[product.brand, product.price ? `$${product.price.toFixed(0)}` : null].filter(Boolean).join('  ·  ')}
      </Text>
      <ShopLink product={product} />
    </View>
  );
}

export function FocusToggle({ focus, onChange }: { focus: PublicFocus; onChange: (f: PublicFocus) => void }) {
  return (
    <View style={styles.toggle} accessibilityRole="tablist">
      {(['womens', 'mens'] as PublicFocus[]).map(f => {
        const active = f === focus;
        return (
          <TouchableOpacity
            key={f}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.toggleChip, active && styles.toggleChipActive]}
            onPress={() => onChange(f)}
          >
            <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
              {f === 'womens' ? 'Womenswear' : 'Menswear'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface Props {
  eyebrow?: string;
  title: string;
  note?: string;
  women: Product[];
  men: Product[];
  /** Lifted focus, when a page has several rails under one toggle. */
  focus?: PublicFocus;
  onFocusChange?: (f: PublicFocus) => void;
  /** Whether to print the catalogue/affiliate disclosure under this rail. */
  disclosure?: boolean;
}

export default function PublicPieces({
  eyebrow = 'PIECES',
  title,
  note,
  women,
  men,
  focus,
  onFocusChange,
  disclosure = true,
}: Props) {
  const [ownFocus, setOwnFocus] = useState<PublicFocus>('womens');
  const current = focus ?? ownFocus;
  const setFocus = onFocusChange ?? setOwnFocus;
  const pieces = current === 'womens' ? women : men;
  if (women.length === 0 && men.length === 0) return null;
  const notice = curatedCatalogNotice();

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!note && <Text style={styles.note}>{note}</Text>}
      {focus === undefined && <FocusToggle focus={current} onChange={setFocus} />}
      {pieces.length > 0 ? (
        <View style={styles.grid}>
          {pieces.map(p => <PieceCard key={p.id} product={p} />)}
        </View>
      ) : (
        <Text style={styles.note}>Nothing in this department yet for this one.</Text>
      )}
      {disclosure && !!notice && <Text style={styles.disclosure}>{notice}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.section },
  eyebrow: { ...textType.eyebrow, marginBottom: 8 },
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: colors.ink },
  note: { ...textType.body, fontSize: 14, lineHeight: 21, color: colors.inkMuted, marginTop: 8 },
  toggle: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  toggleChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  toggleChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  toggleText: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 0.3, color: colors.ink },
  toggleTextActive: { color: colors.bone },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: spacing.md },
  card: {
    width: '30%',
    minWidth: 140,
    flexGrow: 1,
    maxWidth: 220,
  },
  photo: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    backgroundColor: colors.sand,
    marginBottom: 8,
  },
  name: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18, color: colors.ink },
  meta: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  shopLink: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 0.3,
    color: colors.rust,
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  disclosure: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, color: colors.inkFaint, marginTop: spacing.md },
});

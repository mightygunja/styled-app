import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { wishlistService, WishlistDoc } from '../services/firestore';
import { getCurrentUserId } from '../services/api';
import { isOnSale, discountPercent } from '../models/product';
import { haptics } from '../utils/haptics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function WishlistScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WishlistDoc[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await wishlistService.getAll(getCurrentUserId());
      setItems(data);
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRemove = async (wishlistDocId: string) => {
    haptics.tap();
    await wishlistService.remove(wishlistDocId);
    setItems(prev => prev.filter(i => i.id !== wishlistDocId));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>
      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>SAVED</Text>
        <Text style={styles.title}>Your wishlist</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nothing saved yet.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Shop')}>
                <Text style={styles.emptyLink}>Browse the shop →</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
              >
                <View style={styles.cardImageWrap}>
                  <Image source={{ uri: item.product.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                  {isOnSale(item.product) && (
                    <View style={styles.saleBadge}>
                      <Text style={styles.saleBadgeText}>-{discountPercent(item.product)}%</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardBrand}>{item.product.brand}</Text>
                <Text style={styles.cardName} numberOfLines={1}>{item.product.name}</Text>
                <Text style={styles.cardPrice}>${item.product.price.toFixed(0)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item.id)}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
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
  emptyLink: {
    ...textType.body,
    color: colors.camel,
    marginTop: 8,
  },
  gridContent: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 24,
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
  cardPrice: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 4,
  },
  removeButton: {
    marginTop: 8,
  },
  removeButtonText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.tobacco,
  },
});

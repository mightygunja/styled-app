import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { ClosetItem } from '../services/api';
import { colors, fonts } from '../theme/designSystem';

type SimilarItemsRouteProp = RouteProp<RootStackParamList, 'SimilarItems'>;

export default function SimilarItemsScreen() {
  const navigation = useNavigation();
  const route = useRoute<SimilarItemsRouteProp>();
  const { similarItems } = route.params;

  const renderItem = ({ item }: { item: { item: ClosetItem; similarity: number } }) => {
    const closetItem = item.item;
    const similarityPercent = Math.round(item.similarity * 100);

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => {
          navigation.navigate('ClosetItemDetail' as any, {
            closetItemId: closetItem.id,
          });
        }}
      >
        <Image
          source={{ uri: closetItem.thumbnailUrl || closetItem.imageUrl }}
          style={styles.itemImage}
          resizeMode="cover"
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemCategory}>{closetItem.category}</Text>
          <Text style={styles.itemColor}>{closetItem.color}</Text>
          {closetItem.brand && (
            <Text style={styles.itemBrand}>{closetItem.brand}</Text>
          )}
          <View style={styles.similarityBadge}>
            <Text style={styles.similarityText}>{similarityPercent}% similar</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Similar Items</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={styles.subtitle}>Found {similarItems.length} similar {similarItems.length === 1 ? 'item' : 'items'} in your closet
      </Text>

      <FlatList
        data={similarItems}
        renderItem={renderItem}
        keyExtractor={(item) =>item.item.id}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.row}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  backButton: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    padding: 16,
  },
  listContent: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  itemCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: colors.paper,
  },
  itemInfo: {
    padding: 12,
  },
  itemCategory: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  itemColor: {
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  itemBrand: {
    fontSize: 12,
    color: colors.inkFaint,
    marginBottom: 8,
  },
  similarityBadge: {
    backgroundColor: colors.tobacco,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  similarityText: {
    fontSize: 11,
    color: colors.white,
    fontFamily: fonts.sansSemiBold,
  },
});

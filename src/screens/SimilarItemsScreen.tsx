import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import { RootStackParamList } from '../navigation/types';
import { ClosetItem } from '../services/api';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

type SimilarItemsRouteProp = RouteProp<RootStackParamList, 'SimilarItems'>;

interface Match {
  item: ClosetItem;
  similarity: number;
  reasons?: string[];
}

export default function SimilarItemsScreen() {
  const navigation = useNavigation();
  const route = useRoute<SimilarItemsRouteProp>();
  // Guard: on a cold load (deep link, web refresh) the computed match list is
  // gone. Fall back to an empty list; the empty state below explains itself.
  const similarItems = Array.isArray(route.params?.similarItems)
    ? route.params.similarItems
    : [];

  const renderItem = ({ item }: { item: Match }) => {
    const closetItem = item.item;
    const reason = item.reasons?.length
      ? item.reasons.join(' · ')
      : 'Same category and general look';

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('ClosetItemDetail' as any, { closetItemId: closetItem.id })
        }
      >
        <Image
          source={{ uri: closetItem.thumbnailUrl || closetItem.imageUrl }}
          style={styles.thumb}
          resizeMode="cover"
        />
        <View style={styles.rowText}>
          {/* The reason leads. Ordering without a stated basis is the thing
              that made this feature feel arbitrary. */}
          <Text style={styles.reason}>{reason}</Text>
          <Text style={styles.itemName} numberOfLines={1}>
            {closetItem.subcategory || closetItem.category}
          </Text>
          <Text style={styles.itemMeta}>
            {[closetItem.color, closetItem.brand].filter(Boolean).join('  ·  ')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <FlatList
        data={similarItems as Match[]}
        renderItem={renderItem}
        keyExtractor={m => m.item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>FROM YOUR CLOSET</Text>
            <Text style={styles.title}>Similar pieces</Text>
            <Text style={styles.subtitle}>
              {similarItems.length === 0
                ? 'Nothing close enough to show.'
                : `${similarItems.length} ${
                    similarItems.length === 1 ? 'piece' : 'pieces'
                  } you already own, matched on cut, colour, fabric and pattern.`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No close matches</Text>
            <Text style={styles.emptyText}>
              Nothing else in this category is similar enough to be worth showing. That is usually a
              good sign — it means the piece is not a duplicate.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { paddingHorizontal: spacing.page, paddingBottom: 60 },

  intro: { marginBottom: spacing.lg },
  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  thumb: { width: 76, height: 96, backgroundColor: colors.paper },
  rowText: { flex: 1, marginLeft: 14 },
  reason: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.tobacco },
  itemName: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
    textTransform: 'capitalize',
    marginTop: 4,
  },
  itemMeta: { ...textType.meta, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },

  emptyBox: { backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
});

/**
 * Saved looks.
 *
 * Five surfaces let users save an outfit (Home's Dress Me Today, both
 * outfit builders, Smart Recommendations, the stylist chat) - and until
 * this screen existed, nothing anywhere could display one. Every "Look
 * saved!" toast wrote into a collection with no reader: a black hole
 * wearing a success message.
 *
 * Deliberately simple: the saved compositions, newest first, resolved
 * against the real closet, with wear-it and delete as the only actions.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { outfitsService, SavedOutfit } from '../services/firestore';
import { closetAPI, getCurrentUserId } from '../services/api';
import { Item } from '../types';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SavedOutfitsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [itemsById, setItemsById] = useState<Map<string, Item>>(new Map());
  const [loading, setLoading] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  const load = useCallback(async () => {
    try {
      const userId = getCurrentUserId();
      const [saved, closetResponse] = await Promise.all([
        outfitsService.getAll(userId),
        closetAPI.getItems(userId).catch(() => ({ data: [] })),
      ]);
      setOutfits(saved);
      setItemsById(
        new Map(((closetResponse as any).data || []).map((item: any) => [item.id, item as Item]))
      );
    } catch (error) {
      console.error('Error loading saved outfits:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = async (outfit: SavedOutfit) => {
    try {
      await outfitsService.delete(outfit.id);
      setOutfits(current => current.filter(o => o.id !== outfit.id));
      showToast('Look removed', 'success');
    } catch (error) {
      console.error('Error deleting outfit:', error);
      showToast('Could not remove that look', 'error');
    }
  };

  /** Items resolved against the live closet; deleted garments drop out honestly. */
  const resolveItems = (outfit: SavedOutfit): Item[] =>
    outfit.itemIds.map(id => itemsById.get(id)).filter((i): i is Item => Boolean(i));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>WARDROBE</Text>
        <Text style={styles.title}>Saved looks</Text>
        <Text style={styles.subtitle}>
          Outfits you've saved from Dress Me Today, the builders, and your stylist — composed from
          your own closet.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.ink} style={{ marginTop: 48 }} />
        ) : outfits.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyText}>
              When a look works, save it — from Home's Dress Me Today or the outfit builder — and
              it lives here, ready for the next morning it fits.
            </Text>
            <Button
              title="Build an outfit"
              variant="primary"
              onPress={() => navigation.navigate('SmartOutfitBuilder')}
              style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
            />
          </View>
        ) : (
          outfits.map(outfit => {
            const items = resolveItems(outfit);
            const missing = outfit.itemIds.length - items.length;
            return (
              <View key={outfit.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{outfit.name}</Text>
                    {!!outfit.occasion && (
                      <Text style={styles.cardMeta}>{outfit.occasion.toUpperCase()}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${outfit.name}`}
                    onPress={() => handleDelete(outfit)}
                  >
                    <Text style={styles.remove}>REMOVE</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.thumbRow}>
                    {items.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${item.name || item.category}`}
                        onPress={() =>
                          navigation.navigate('ClosetItemDetail', { closetItemId: item.id })
                        }
                      >
                        <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                {missing > 0 && (
                  <Text style={styles.missingNote}>
                    {missing} {missing === 1 ? 'piece' : 'pieces'} from this look {missing === 1 ? 'is' : 'are'} no
                    longer in your closet.
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  eyebrow: { ...textType.eyebrow, marginBottom: 8 },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 8 },

  emptyBox: { marginTop: spacing.section, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8, lineHeight: 21 },

  card: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    padding: spacing.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardName: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink },
  cardMeta: { ...textType.eyebrow, fontSize: 9, marginTop: 4 },
  remove: { ...textType.eyebrow, fontSize: 10, color: colors.tobacco, paddingVertical: 4 },
  thumbRow: { flexDirection: 'row', gap: 8 },
  thumb: { width: 84, height: 104, backgroundColor: colors.paper },
  missingNote: { ...textType.meta, fontSize: 11, color: colors.inkFaint, marginTop: 8 },
});

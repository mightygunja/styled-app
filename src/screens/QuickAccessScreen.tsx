import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  quickAccessService,
  QuickAccessItem,
  AVAILABLE_QUICK_ACCESS_ITEMS,
} from '../services/quickAccessService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function QuickAccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [pinnedItems, setPinnedItems] = useState<QuickAccessItem[]>([]);
  const [availableItems, setAvailableItems] = useState<QuickAccessItem[]>([]);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pinned, available] = await Promise.all([
        quickAccessService.getQuickAccessItems(),
        quickAccessService.getAvailableItems(),
      ]);
      setPinnedItems(pinned);
      setAvailableItems(available);
    } catch (error) {
      console.error('Error loading quick access:', error);
      showToast('Failed to load quick access', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (item: QuickAccessItem) => {
    try {
      const maxItems = quickAccessService.getMaxItems();
      if (pinnedItems.length >= maxItems) {
        showToast(`Maximum ${maxItems} items allowed`, 'error');
        return;
      }

      await quickAccessService.addQuickAccessItem(item);
      showToast(`${item.title} added!`, 'success');
      await loadData();
    } catch (error) {
      console.error('Error adding item:', error);
      showToast('Failed to add item', 'error');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await quickAccessService.removeQuickAccessItem(itemId);
      showToast('Item removed', 'success');
      await loadData();
    } catch (error) {
      console.error('Error removing item:', error);
      showToast('Failed to remove item', 'error');
    }
  };

  const handleReset = async () => {
    try {
      await quickAccessService.resetToDefaults();
      showToast('Reset to defaults', 'success');
      await loadData();
    } catch (error) {
      console.error('Error resetting:', error);
      showToast('Failed to reset', 'error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tobacco} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const maxItems = quickAccessService.getMaxItems();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Access</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetButton}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerIcon}>◈</Text>
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Customize Your Home Screen</Text>
            <Text style={styles.infoBannerText}>
              Pin your favorite features for quick access. Max {maxItems} items.
            </Text>
          </View>
        </View>

        {/* Pinned Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Pinned to Home ({pinnedItems.length}/{maxItems})
            </Text>
          </View>

          {pinnedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>◎</Text>
              <Text style={styles.emptyStateTitle}>No items pinned</Text>
              <Text style={styles.emptyStateText}>
                Add items from the available list below
              </Text>
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {pinnedItems.map((item) => (
                <View key={item.id} style={styles.pinnedItem}>
                  <View style={[styles.itemIcon, { backgroundColor: item.color }]}>
                    <Text style={styles.itemIconText}>{item.icon}</Text>
                  </View>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(item.id)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Available Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Features</Text>
          <Text style={styles.sectionSubtitle}>
            Tap to add to your home screen
          </Text>

          {availableItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>◉</Text>
              <Text style={styles.emptyStateTitle}>All items added!</Text>
              <Text style={styles.emptyStateText}>
                You've pinned all available features
              </Text>
            </View>
          ) : (
            <View style={styles.availableList}>
              {availableItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.availableItem}
                  onPress={() => handleAddItem(item)}
                  disabled={pinnedItems.length >= maxItems}
                >
                  <View style={[styles.availableIcon, { backgroundColor: item.color }]}>
                    <Text style={styles.availableIconText}>{item.icon}</Text>
                  </View>
                  <View style={styles.availableInfo}>
                    <Text style={styles.availableTitle}>{item.title}</Text>
                    <Text style={styles.availableSubtitle}>{item.subtitle}</Text>
                  </View>
                  <View style={styles.addButton}>
                    <Text style={styles.addButtonText}>+</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>◈</Text>
            <Text style={styles.tipText}>
              Quick access items appear on your Home tab for easy navigation
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>◉</Text>
            <Text style={styles.tipText}>
              Pin your most-used features to save time
            </Text>
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>○</Text>
            <Text style={styles.tipText}>
              Tap "Reset" to restore default quick access items
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.inkMuted,
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
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  resetButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.sand,
    gap: 12,
  },
  infoBannerIcon: {
    fontSize: 24,
    color: colors.ink,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 16,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pinnedItem: {
    width: '22%',
    alignItems: 'center',
    position: 'relative',
  },
  itemIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIconText: {
    fontSize: 28,
    color: colors.white,
    textAlign: 'center',
  },
  itemTitle: {
    fontSize: 11,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  availableList: {
    gap: 12,
  },
  availableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sand,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  availableIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableIconText: {
    fontSize: 24,
    color: colors.white,
    textAlign: 'center',
  },
  availableInfo: {
    flex: 1,
  },
  availableTitle: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 2,
  },
  availableSubtitle: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: colors.ink,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.sand,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  tipIcon: {
    fontSize: 24,
    color: colors.ink,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },
});

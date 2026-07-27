import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  shoppingAssistantService,
  ShoppingRecommendation,
  BudgetAllocation,
} from '../services/shoppingAssistantService';
import { aiStyleService } from '../services/aiStyleService';
import { closetAPI, getCurrentUserId } from '../services/api';
import { shoppingListService, ShoppingListEntry } from '../services/firestore';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ShoppingAssistantScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<ShoppingRecommendation[]>([]);
  const [budgetAllocations, setBudgetAllocations] = useState<BudgetAllocation[]>([]);
  const [budget, setBudget] = useState('500');
  const [selectedTab, setSelectedTab] = useState<'recommendations' | 'budget' | 'myList'>('recommendations');
  const [myList, setMyList] = useState<ShoppingListEntry[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadRecommendations();
    loadMyList();
  }, []);

  const loadMyList = async () => {
    try {
      const entries = await shoppingListService.getAll(getCurrentUserId());
      setMyList(entries);
      setAddedIds(new Set(entries.map(e => e.item.id)));
    } catch (error) {
      console.error('Error loading shopping list:', error);
    }
  };

  const handleViewDetails = async (rec: ShoppingRecommendation) => {
    if (rec.item.affiliateLink) {
      try {
        const canOpen = await Linking.canOpenURL(rec.item.affiliateLink);
        if (canOpen) {
          await Linking.openURL(rec.item.affiliateLink);
          return;
        }
      } catch (error) {
        console.error('Error opening product link:', error);
      }
    }
    showToast(`${rec.item.name} — $${rec.item.price} at ${rec.item.retailer}`, 'info');
  };

  const handleAddToList = async (rec: ShoppingRecommendation) => {
    if (addedIds.has(rec.item.id)) {
      showToast('Already in your list', 'info');
      return;
    }
    try {
      await shoppingListService.add(getCurrentUserId(), rec.item);
      setAddedIds(prev => new Set(prev).add(rec.item.id));
      showToast('Added to your shopping list', 'success');
      loadMyList();
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      showToast('Failed to add to list', 'error');
    }
  };

  const handleRemoveFromList = async (entry: ShoppingListEntry) => {
    try {
      await shoppingListService.remove(entry.id);
      setMyList(prev => prev.filter(e => e.id !== entry.id));
      setAddedIds(prev => {
        const next = new Set(prev);
        next.delete(entry.item.id);
        return next;
      });
    } catch (error) {
      console.error('Error removing from shopping list:', error);
      showToast('Failed to remove item', 'error');
    }
  };

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      
      // Get closet items
      const response = await closetAPI.getItems(getCurrentUserId());
      const items: Item[] = response.data.map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category as any,
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

      // Get style profile
      const styleProfile = await aiStyleService.analyzeStyle(items);

      // Get recommendations
      const recs = await shoppingAssistantService.getRecommendations(
        getCurrentUserId(),
        items,
        styleProfile,
        parseFloat(budget) || undefined
      );
      setRecommendations(recs);

      // Get budget allocation
      const allocations = await shoppingAssistantService.getBudgetAllocation(
        parseFloat(budget) || 500
      );
      setBudgetAllocations(allocations);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      showToast('Failed to load recommendations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetChange = (value: string) => {
    setBudget(value);
  };

  const handleApplyBudget = () => {
    loadRecommendations();
  };

  const getPriorityColor = (priority: string): string => {
    const colors = {
      essential: '#ef4444',
      recommended: '#f59e0b',
      'nice-to-have': '#10b981',
    };
    return colors[priority as keyof typeof colors] || '#64748b';
  };

  const getPriorityLabel = (priority: string): string => {
    const labels = {
      essential: 'Essential',
      recommended: 'Recommended',
      'nice-to-have': 'Nice to Have',
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const renderRecommendationCard = (rec: ShoppingRecommendation) => (
    <View key={rec.id} style={styles.recCard}>
      <Image source={{ uri: rec.item.imageUrl }} style={styles.recImage} />
      
      <View style={styles.recContent}>
        <View style={styles.recHeader}>
          <View style={styles.recTitleRow}>
            <Text style={styles.recName} numberOfLines={2}>
              {rec.item.name}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.priority) }]}>
              <Text style={styles.priorityText}>{getPriorityLabel(rec.priority)}</Text>
            </View>
          </View>
          <Text style={styles.recBrand}>{rec.item.brand}</Text>
        </View>

        <View style={styles.recMeta}>
          <View style={styles.recPrice}>
            <Text style={styles.recPriceAmount}>${rec.item.price}</Text>
            <Text style={styles.recRetailer}>{rec.item.retailer}</Text>
          </View>
          {rec.item.rating && (
            <View style={styles.recRating}>
              <Text style={styles.recRatingStars}>⭐ {rec.item.rating.toFixed(1)}</Text>
              <Text style={styles.recReviews}>({rec.item.reviews})</Text>
            </View>
          )}
        </View>

        <View style={styles.recStats}>
          <View style={styles.recStat}>
            <Text style={styles.recStatLabel}>Versatility</Text>
            <View style={styles.recStatBar}>
              <View style={[styles.recStatFill, { width: `${rec.versatilityScore}%` }]} />
            </View>
            <Text style={styles.recStatValue}>{rec.versatilityScore}%</Text>
          </View>
          <View style={styles.recStat}>
            <Text style={styles.recStatLabel}>Outfit Potential</Text>
            <Text style={styles.recStatNumber}>+{rec.outfitPotential} outfits</Text>
          </View>
        </View>

        <View style={styles.recReasons}>
          <Text style={styles.recReasonsTitle}>Why we recommend this:</Text>
          {rec.reason.map((reason, index) => (
            <View key={index} style={styles.recReasonItem}>
              <Text style={styles.recReasonBullet}>•</Text>
              <Text style={styles.recReasonText}>{reason}</Text>
            </View>
          ))}
        </View>

        <View style={styles.recActions}>
          <TouchableOpacity style={styles.recActionButton} onPress={() => handleViewDetails(rec)}>
            <Text style={styles.recActionText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.recActionButton, styles.recActionButtonPrimary]}
            onPress={() => handleAddToList(rec)}
          >
            <Text style={styles.recActionTextPrimary}>
              {addedIds.has(rec.item.id) ? 'Added ✓' : 'Add to List'}
            </Text>
          </TouchableOpacity>
        </View>

        {rec.alternatives.length > 0 && (
          <View style={styles.recAlternatives}>
            <Text style={styles.recAlternativesTitle}>Alternatives:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {rec.alternatives.map((alt, index) => (
                <TouchableOpacity key={index} style={styles.altCard}>
                  <Image source={{ uri: alt.imageUrl }} style={styles.altImage} />
                  <Text style={styles.altPrice}>${alt.price}</Text>
                  <Text style={styles.altBrand} numberOfLines={1}>{alt.brand}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );

  const renderBudgetAllocation = (allocation: BudgetAllocation) => (
    <View key={allocation.category} style={styles.budgetCard}>
      <View style={styles.budgetHeader}>
        <Text style={styles.budgetCategory}>{allocation.category}</Text>
        <Text style={styles.budgetAmount}>${allocation.amount.toFixed(0)}</Text>
      </View>
      <View style={styles.budgetBar}>
        <View style={[styles.budgetFill, { width: `${allocation.percentage}%` }]} />
      </View>
      <View style={styles.budgetFooter}>
        <Text style={styles.budgetPercentage}>{allocation.percentage}%</Text>
        <View style={[styles.budgetPriority, { backgroundColor: getPriorityColor(allocation.priority) }]}>
          <Text style={styles.budgetPriorityText}>{getPriorityLabel(allocation.priority)}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Analyzing your wardrobe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalCost = recommendations.reduce((sum, rec) => sum + rec.item.price, 0);
  const budgetNum = parseFloat(budget) || 0;
  const remaining = budgetNum - totalCost;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping Assistant</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Budget Input */}
      <View style={styles.budgetInput}>
        <View style={styles.budgetInputRow}>
          <Text style={styles.budgetLabel}>Budget:</Text>
          <TextInput
            style={styles.budgetField}
            value={budget}
            onChangeText={handleBudgetChange}
            keyboardType="numeric"
            placeholder="500"
          />
          <TouchableOpacity style={styles.applyButton} onPress={handleApplyBudget}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
        {budgetNum > 0 && (
          <View style={styles.budgetSummary}>
            <Text style={styles.budgetSummaryText}>
              Total: ${totalCost.toFixed(0)} / ${budgetNum.toFixed(0)}
            </Text>
            <Text style={[styles.budgetRemaining, { color: remaining >= 0 ? '#10b981' : '#ef4444' }]}>
              {remaining >= 0 ? `$${remaining.toFixed(0)} remaining` : `$${Math.abs(remaining).toFixed(0)} over budget`}
            </Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'recommendations' && styles.tabActive]}
          onPress={() => setSelectedTab('recommendations')}
        >
          <Text style={[styles.tabText, selectedTab === 'recommendations' && styles.tabTextActive]}>
            Recommendations ({recommendations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'budget' && styles.tabActive]}
          onPress={() => setSelectedTab('budget')}
        >
          <Text style={[styles.tabText, selectedTab === 'budget' && styles.tabTextActive]}>
            Budget Plan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'myList' && styles.tabActive]}
          onPress={() => setSelectedTab('myList')}
        >
          <Text style={[styles.tabText, selectedTab === 'myList' && styles.tabTextActive]}>
            My List ({myList.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Recommendations Tab */}
        {selectedTab === 'recommendations' && (
          <View style={styles.section}>
            {recommendations.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Personalized for You</Text>
                <Text style={styles.sectionSubtitle}>
                  Based on your wardrobe gaps and style preferences
                </Text>
                {recommendations.map(renderRecommendationCard)}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🛍️</Text>
                <Text style={styles.emptyText}>No recommendations</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your budget or add more items to your closet
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Budget Tab */}
        {selectedTab === 'budget' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Allocation</Text>
            <Text style={styles.sectionSubtitle}>
              Suggested distribution for ${budgetNum.toFixed(0)} budget
            </Text>
            {budgetAllocations.map(renderBudgetAllocation)}

            <View style={styles.budgetTips}>
              <Text style={styles.budgetTipsTitle}>💡 Smart Shopping Tips</Text>
              <View style={styles.budgetTip}>
                <Text style={styles.budgetTipBullet}>•</Text>
                <Text style={styles.budgetTipText}>
                  Invest 40% in quality basics that you'll wear frequently
                </Text>
              </View>
              <View style={styles.budgetTip}>
                <Text style={styles.budgetTipBullet}>•</Text>
                <Text style={styles.budgetTipText}>
                  Allocate 25% for versatile shoes that match multiple outfits
                </Text>
              </View>
              <View style={styles.budgetTip}>
                <Text style={styles.budgetTipBullet}>•</Text>
                <Text style={styles.budgetTipText}>
                  Save 20% for seasonal outerwear and layering pieces
                </Text>
              </View>
              <View style={styles.budgetTip}>
                <Text style={styles.budgetTipBullet}>•</Text>
                <Text style={styles.budgetTipText}>
                  Use remaining 15% for accessories to complete your looks
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* My List Tab */}
        {selectedTab === 'myList' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Shopping List</Text>
            {myList.length > 0 ? (
              <>
                <Text style={styles.sectionSubtitle}>
                  Total: $
                  {myList.reduce((sum, e) => sum + (e.item.price || 0), 0).toFixed(0)}
                </Text>
                {myList.map(entry => (
                  <View key={entry.id} style={styles.recCard}>
                    <Image source={{ uri: entry.item.imageUrl }} style={styles.recImage} />
                    <View style={styles.recContent}>
                      <View style={styles.recTitleRow}>
                        <Text style={styles.recName} numberOfLines={2}>
                          {entry.item.name}
                        </Text>
                      </View>
                      <Text style={styles.recBrand}>{entry.item.brand}</Text>
                      <View style={styles.recMeta}>
                        <View style={styles.recPrice}>
                          <Text style={styles.recPriceAmount}>${entry.item.price}</Text>
                          <Text style={styles.recRetailer}>{entry.item.retailer}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.recActionButton}
                        onPress={() => handleRemoveFromList(entry)}
                      >
                        <Text style={styles.recActionText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📝</Text>
                <Text style={styles.emptyText}>Your list is empty</Text>
                <Text style={styles.emptySubtext}>
                  Tap "Add to List" on any recommendation to save it here
                </Text>
              </View>
            )}
          </View>
        )}

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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    fontSize: 16,
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  budgetInput: {
    padding: 20,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  budgetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  budgetField: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  applyButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  budgetSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  budgetSummaryText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  budgetRemaining: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#ef4444',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  recCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#f1f5f9',
  },
  recContent: {
    padding: 16,
  },
  recHeader: {
    marginBottom: 12,
  },
  recTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  recName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 12,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  recBrand: {
    fontSize: 14,
    color: '#64748b',
  },
  recMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  recPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  recPriceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  recRetailer: {
    fontSize: 13,
    color: '#64748b',
  },
  recRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recRatingStars: {
    fontSize: 14,
    fontWeight: '600',
  },
  recReviews: {
    fontSize: 12,
    color: '#64748b',
  },
  recStats: {
    marginBottom: 16,
    gap: 12,
  },
  recStat: {
    gap: 6,
  },
  recStatLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  recStatBar: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  recStatFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  recStatValue: {
    fontSize: 12,
    color: '#64748b',
  },
  recStatNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  recReasons: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  recReasonsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  recReasonItem: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 8,
  },
  recReasonBullet: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  recReasonText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  recActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  recActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  recActionButtonPrimary: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  recActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  recActionTextPrimary: {
    color: '#ffffff',
  },
  recAlternatives: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  recAlternativesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  altCard: {
    width: 100,
    marginRight: 12,
  },
  altImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginBottom: 6,
  },
  altPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 2,
  },
  altBrand: {
    fontSize: 11,
    color: '#64748b',
  },
  budgetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  budgetBar: {
    height: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  budgetFill: {
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 6,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetPercentage: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  budgetPriority: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  budgetPriorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  budgetTips: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  budgetTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  budgetTip: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  budgetTipBullet: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: 'bold',
  },
  budgetTipText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});

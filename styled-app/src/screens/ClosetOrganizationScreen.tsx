import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  closetOrganizationService,
  OrganizationPlan,
  DeclutterSuggestion,
  CapsuleWardrobe,
  OrganizationMethod,
  OrganizationTip,
} from '../services/closetOrganizationService';
import { closetAPI, MOCK_USER_ID } from '../services/api';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 60) / 3;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ClosetOrganizationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [organizationPlan, setOrganizationPlan] = useState<OrganizationPlan | null>(null);
  const [declutterSuggestions, setDeclutterSuggestions] = useState<DeclutterSuggestion[]>([]);
  const [capsuleWardrobe, setCapsuleWardrobe] = useState<CapsuleWardrobe | null>(null);
  const [tips, setTips] = useState<OrganizationTip[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<OrganizationMethod>('category');
  const [selectedTab, setSelectedTab] = useState<'organize' | 'declutter' | 'capsule'>('organize');
  const { toast, showToast, hideToast } = useToast();

  const organizationMethods: { id: OrganizationMethod; label: string; emoji: string }[] = [
    { id: 'category', label: 'Category', emoji: '📦' },
    { id: 'color', label: 'Color', emoji: '🎨' },
    { id: 'season', label: 'Season', emoji: '🌤️' },
    { id: 'occasion', label: 'Occasion', emoji: '🎉' },
    { id: 'frequency', label: 'Frequency', emoji: '📊' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      generateOrganizationPlan(selectedMethod);
    }
  }, [selectedMethod]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get closet items
      const response = await closetAPI.getItems(MOCK_USER_ID);
      const closetItems: Item[] = response.data.map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category as any,
        color: item.color,
        brand: item.brand,
        price: 0,
      }));
      setItems(closetItems);

      // Get organization plan
      const plan = await closetOrganizationService.generateOrganizationPlan(
        closetItems,
        selectedMethod
      );
      setOrganizationPlan(plan);

      // Get declutter suggestions
      const suggestions = await closetOrganizationService.getDeclutterSuggestions(closetItems);
      setDeclutterSuggestions(suggestions);

      // Get capsule wardrobe
      const capsule = await closetOrganizationService.createCapsuleWardrobe(
        closetItems,
        'year-round',
        30
      );
      setCapsuleWardrobe(capsule);

      // Get tips
      const orgTips = await closetOrganizationService.getOrganizationTips();
      setTips(orgTips);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load organization data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateOrganizationPlan = async (method: OrganizationMethod) => {
    try {
      const plan = await closetOrganizationService.generateOrganizationPlan(items, method);
      setOrganizationPlan(plan);
    } catch (error) {
      console.error('Error generating plan:', error);
    }
  };

  const getDeclutterReasonLabel = (reason: string): string => {
    const labels: Record<string, string> = {
      unused: 'Not Worn Recently',
      duplicate: 'Duplicate Item',
      'poor-fit': 'Poor Fit',
      outdated: 'Outdated Style',
      damaged: 'Damaged',
    };
    return labels[reason] || reason;
  };

  const getDeclutterReasonColor = (reason: string): string => {
    const colors: Record<string, string> = {
      unused: '#f59e0b',
      duplicate: '#8b5cf6',
      'poor-fit': '#ef4444',
      outdated: '#64748b',
      damaged: '#dc2626',
    };
    return colors[reason] || '#64748b';
  };

  const renderOrganizationSection = (section: any) => (
    <View key={section.id} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.name}</Text>
        <Text style={styles.sectionCount}>{section.items.length} items</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.itemsGrid}>
          {section.items.slice(0, 6).map((item: Item) => (
            <View key={item.id} style={styles.itemCard}>
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
          ))}
          {section.items.length > 6 && (
            <View style={[styles.itemCard, styles.moreCard]}>
              <Text style={styles.moreText}>+{section.items.length - 6}</Text>
              <Text style={styles.moreLabel}>more</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const renderDeclutterSuggestion = (suggestion: DeclutterSuggestion) => (
    <View key={suggestion.id} style={styles.declutterCard}>
      <Image source={{ uri: suggestion.item.imageUrl }} style={styles.declutterImage} />
      <View style={styles.declutterContent}>
        <Text style={styles.declutterName}>{suggestion.item.name}</Text>
        <View style={[styles.declutterReason, { backgroundColor: getDeclutterReasonColor(suggestion.reason) }]}>
          <Text style={styles.declutterReasonText}>
            {getDeclutterReasonLabel(suggestion.reason)}
          </Text>
        </View>
        <Text style={styles.declutterExplanation}>{suggestion.explanation}</Text>
        <View style={styles.declutterConfidence}>
          <Text style={styles.declutterConfidenceLabel}>Confidence:</Text>
          <View style={styles.declutterConfidenceBar}>
            <View style={[styles.declutterConfidenceFill, { width: `${suggestion.confidence}%` }]} />
          </View>
          <Text style={styles.declutterConfidenceValue}>{suggestion.confidence}%</Text>
        </View>
        <View style={styles.declutterActions}>
          <TouchableOpacity style={styles.declutterActionButton}>
            <Text style={styles.declutterActionText}>Keep</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.declutterActionButton, styles.declutterActionButtonPrimary]}>
            <Text style={styles.declutterActionTextPrimary}>Donate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderTip = (tip: OrganizationTip) => (
    <View key={tip.id} style={styles.tipCard}>
      <Text style={styles.tipIcon}>{tip.icon}</Text>
      <View style={styles.tipContent}>
        <View style={styles.tipHeader}>
          <Text style={styles.tipCategory}>{tip.category}</Text>
          <View style={[styles.tipPriority, { 
            backgroundColor: tip.priority === 'high' ? '#ef4444' : tip.priority === 'medium' ? '#f59e0b' : '#10b981' 
          }]}>
            <Text style={styles.tipPriorityText}>{tip.priority.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.tipText}>{tip.tip}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Organizing your closet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Closet Organization</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{declutterSuggestions.length}</Text>
          <Text style={styles.statLabel}>To Review</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{organizationPlan?.estimatedTime || 0}m</Text>
          <Text style={styles.statLabel}>Est. Time</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'organize' && styles.tabActive]}
          onPress={() => setSelectedTab('organize')}
        >
          <Text style={[styles.tabText, selectedTab === 'organize' && styles.tabTextActive]}>
            Organize
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'declutter' && styles.tabActive]}
          onPress={() => setSelectedTab('declutter')}
        >
          <Text style={[styles.tabText, selectedTab === 'declutter' && styles.tabTextActive]}>
            Declutter
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'capsule' && styles.tabActive]}
          onPress={() => setSelectedTab('capsule')}
        >
          <Text style={[styles.tabText, selectedTab === 'capsule' && styles.tabTextActive]}>
            Capsule
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Organize Tab */}
        {selectedTab === 'organize' && (
          <>
            {/* Organization Methods */}
            <View style={styles.methodsContainer}>
              <Text style={styles.methodsTitle}>Organization Method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.methodsGrid}>
                  {organizationMethods.map((method) => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        styles.methodChip,
                        selectedMethod === method.id && styles.methodChipActive,
                      ]}
                      onPress={() => setSelectedMethod(method.id)}
                    >
                      <Text style={styles.methodEmoji}>{method.emoji}</Text>
                      <Text
                        style={[
                          styles.methodText,
                          selectedMethod === method.id && styles.methodTextActive,
                        ]}
                      >
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Organization Sections */}
            {organizationPlan?.sections.map(renderOrganizationSection)}

            {/* Tips */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>💡 Organization Tips</Text>
              {tips.map(renderTip)}
            </View>
          </>
        )}

        {/* Declutter Tab */}
        {selectedTab === 'declutter' && (
          <View style={styles.declutterContainer}>
            <Text style={styles.declutterTitle}>Declutter Suggestions</Text>
            <Text style={styles.declutterSubtitle}>
              {declutterSuggestions.length} items to review
            </Text>
            {declutterSuggestions.map(renderDeclutterSuggestion)}
          </View>
        )}

        {/* Capsule Tab */}
        {selectedTab === 'capsule' && capsuleWardrobe && (
          <View style={styles.capsuleContainer}>
            <Text style={styles.capsuleTitle}>{capsuleWardrobe.name}</Text>
            <Text style={styles.capsuleSubtitle}>
              {capsuleWardrobe.items.length} pieces • {capsuleWardrobe.outfitCombinations} outfit combinations
            </Text>

            <View style={styles.capsuleStats}>
              <View style={styles.capsuleStat}>
                <Text style={styles.capsuleStatLabel}>Color Palette</Text>
                <View style={styles.colorPalette}>
                  {capsuleWardrobe.colorPalette.map((color, index) => (
                    <View
                      key={index}
                      style={[styles.colorSwatch, { backgroundColor: color }]}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.capsuleEssentials}>
              <Text style={styles.capsuleEssentialsTitle}>Essential Pieces</Text>
              {capsuleWardrobe.essentialPieces.map((piece, index) => (
                <View key={index} style={styles.essentialItem}>
                  <Text style={styles.essentialBullet}>✓</Text>
                  <Text style={styles.essentialText}>{piece}</Text>
                </View>
              ))}
            </View>

            <View style={styles.capsuleItems}>
              <Text style={styles.capsuleItemsTitle}>Your Capsule Items</Text>
              <View style={styles.capsuleGrid}>
                {capsuleWardrobe.items.slice(0, 12).map((item) => (
                  <View key={item.id} style={styles.capsuleItemCard}>
                    <Image source={{ uri: item.imageUrl }} style={styles.capsuleItemImage} />
                  </View>
                ))}
              </View>
            </View>
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
  statsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
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
  methodsContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  methodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  methodsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  methodChipActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  methodEmoji: {
    fontSize: 16,
  },
  methodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  methodTextActive: {
    color: '#ffffff',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  sectionCount: {
    fontSize: 14,
    color: '#64748b',
  },
  itemsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  itemCard: {
    width: ITEM_SIZE,
  },
  itemImage: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  moreCard: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  moreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#64748b',
  },
  moreLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  tipsContainer: {
    padding: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  tipIcon: {
    fontSize: 24,
  },
  tipContent: {
    flex: 1,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tipPriority: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tipPriorityText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tipText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  declutterContainer: {
    padding: 20,
  },
  declutterTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  declutterSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  declutterCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  declutterImage: {
    width: 120,
    height: 160,
    backgroundColor: '#f1f5f9',
  },
  declutterContent: {
    flex: 1,
    padding: 12,
  },
  declutterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  declutterReason: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  declutterReasonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  declutterExplanation: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  declutterConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  declutterConfidenceLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  declutterConfidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  declutterConfidenceFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  declutterConfidenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  declutterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  declutterActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  declutterActionButtonPrimary: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  declutterActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  declutterActionTextPrimary: {
    color: '#ffffff',
  },
  capsuleContainer: {
    padding: 20,
  },
  capsuleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  capsuleSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  capsuleStats: {
    marginBottom: 20,
  },
  capsuleStat: {
    marginBottom: 16,
  },
  capsuleStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  colorPalette: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  capsuleEssentials: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  capsuleEssentialsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  essentialItem: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  essentialBullet: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: 'bold',
  },
  essentialText: {
    fontSize: 14,
    color: '#64748b',
  },
  capsuleItems: {
    marginBottom: 20,
  },
  capsuleItemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  capsuleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  capsuleItemCard: {
    width: (width - 56) / 3,
  },
  capsuleItemImage: {
    width: '100%',
    height: (width - 56) / 3,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
});

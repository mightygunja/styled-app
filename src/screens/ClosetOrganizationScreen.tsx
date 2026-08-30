import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
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
  CapsuleProfileContext,
  OrganizationMethod,
  OrganizationTip,
} from '../services/closetOrganizationService';
import { closetAPI, getCurrentUserId } from '../services/api';
import { styleProfileService } from '../services/firestore';
import { BODY_TYPE_GUIDES } from '../models/personalStyleProfile';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors as ds, fonts } from '../theme/designSystem';

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

  const organizationMethods: { id: OrganizationMethod; label: string }[] = [
    { id: 'category', label: 'Category' },
    { id: 'color', label: 'Color' },
    { id: 'season', label: 'Season' },
    { id: 'occasion', label: 'Occasion' },
    { id: 'frequency', label: 'Frequency' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (items.length >0) {
      generateOrganizationPlan(selectedMethod);
    }
  }, [selectedMethod]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get closet items
      const response = await closetAPI.getItems(getCurrentUserId());
      // Items the user already chose to keep during a declutter review are
      // flagged on the document so they stop being re-suggested.
      const keptIds = new Set<string>(
        response.data.filter((item: any) => item.declutterKeep).map((item: any) => item.id)
      );
      const closetItems: Item[] = response.data.map((item: any) => ({
        id: item.id,
        // Closet items have no name field - compose one from what the AI
        // classification actually stores, like the sharing screen does.
        name:
          [item.color, item.subcategory || item.category].filter(Boolean).join(' ') || 'Item',
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
      setItems(closetItems);

      // Get organization plan
      const plan = await closetOrganizationService.generateOrganizationPlan(
        closetItems,
        selectedMethod
      );
      setOrganizationPlan(plan);

      // Get declutter suggestions
      const suggestions = await closetOrganizationService.getDeclutterSuggestions(closetItems);
      setDeclutterSuggestions(suggestions.filter(s => !keptIds.has(s.item.id)));

      // Get capsule wardrobe, personalized with color/body/style profile data when available
      let profileContext: CapsuleProfileContext | undefined;
      try {
        const savedProfile = await styleProfileService.getStyleProfile(getCurrentUserId());
        if (savedProfile) {
          const bodyGuide = savedProfile.bodyAnalysis ? BODY_TYPE_GUIDES[savedProfile.bodyAnalysis.bodyType] : null;
          profileContext = {
            recommendedColors: savedProfile.colorAnalysis?.palette.map(s =>s.name),
            colorsToAvoid: savedProfile.colorAnalysis?.colorsToAvoid.map(s =>s.name),
            bodyMatchKeywords: bodyGuide?.matchKeywords,
            styleArchetypes: savedProfile.styleArchetypes,
            avoidRules: savedProfile.avoidRules,
          };
        }
      } catch (profileError) {
        console.error('Error loading style profile for capsule:', profileError);
        // Non-critical - the capsule builder works fine without profile context
      }

      const capsule = await closetOrganizationService.createCapsuleWardrobe(
        closetItems,
        'year-round',
        30,
        profileContext
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

  // "Keep" writes a flag on the item so this suggestion never comes back;
  // "Donate" removes the item from the closet after a confirm.
  const handleKeep = async (suggestion: DeclutterSuggestion) => {
    try {
      await closetAPI.update(suggestion.item.id, { declutterKeep: true });
      setDeclutterSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      showToast('Kept. It will not be suggested again.', 'success');
    } catch (error) {
      console.error('Error keeping item:', error);
      showToast('Could not save that decision', 'error');
    }
  };

  const handleDonate = (suggestion: DeclutterSuggestion) => {
    Alert.alert(
      'Donate this item?',
      'This removes it from your closet. The clothes are yours to pass on.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await closetAPI.deleteItem(suggestion.item.id);
              setDeclutterSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
              setItems(prev => prev.filter(i => i.id !== suggestion.item.id));
              showToast('Removed from your closet', 'success');
            } catch (error) {
              console.error('Error removing item:', error);
              showToast('Could not remove the item', 'error');
            }
          },
        },
      ]
    );
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
      unused: ds.camel,
      duplicate: ds.tobacco,
      'poor-fit': ds.ink,
      outdated: ds.inkMuted,
      damaged: ds.ink,
    };
    return colors[reason] || ds.inkMuted;
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
          {section.items.length >6 && (
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
          <TouchableOpacity style={styles.declutterActionButton} onPress={() => handleKeep(suggestion)}>
            <Text style={styles.declutterActionText}>Keep</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.declutterActionButton, styles.declutterActionButtonPrimary]}
            onPress={() => handleDonate(suggestion)}
          >
            <Text style={styles.declutterActionTextPrimary}>Donate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderTip = (tip: OrganizationTip) => (
    <View key={tip.id} style={styles.tipCard}>
      <View style={styles.tipContent}>
        <View style={styles.tipHeader}>
          <Text style={styles.tipCategory}>{tip.category}</Text>
          <View style={[styles.tipPriority, { 
            backgroundColor: tip.priority === 'high' ? ds.ink : tip.priority === 'medium' ? ds.camel : ds.camel 
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
        <BackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ds.ink} />
          <Text style={styles.loadingText}>Organizing your closet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>navigation.goBack()}>
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
          onPress={() =>setSelectedTab('organize')}
        >
          <Text style={[styles.tabText, selectedTab === 'organize' && styles.tabTextActive]}>Organize
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'declutter' && styles.tabActive]}
          onPress={() =>setSelectedTab('declutter')}
        >
          <Text style={[styles.tabText, selectedTab === 'declutter' && styles.tabTextActive]}>Declutter
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'capsule' && styles.tabActive]}
          onPress={() =>setSelectedTab('capsule')}
        >
          <Text style={[styles.tabText, selectedTab === 'capsule' && styles.tabTextActive]}>Capsule
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
                      onPress={() =>setSelectedMethod(method.id)}
                    >
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
              <Text style={styles.tipsTitle}>Organization Tips</Text>
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
            {capsuleWardrobe.personalized && (
              <View style={styles.personalizedBadge}>
                <Text style={styles.personalizedBadgeText}>Personalized to your style profile</Text>
              </View>
            )}

            {capsuleWardrobe.gaps.length >0 && (
              <View style={styles.gapsBox}>
                {capsuleWardrobe.gaps.map((gap, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() =>navigation.navigate('Shop', { category: gap.category as any })}
                  >
                    <Text style={styles.gapText}> {gap.message}</Text>
                    <Text style={styles.gapShopLink}>Shop {gap.category} →</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

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

            {capsuleWardrobe.outfitPreviews.length >0 && (
              <View style={styles.capsuleEssentials}>
                <Text style={styles.capsuleEssentialsTitle}>Try These First</Text>
                {capsuleWardrobe.outfitPreviews.map((preview, index) => (
                  <View key={index} style={styles.essentialItem}>
                    <Text style={styles.essentialBullet}>→</Text>
                    <Text style={styles.essentialText}>{preview.label}</Text>
                  </View>
                ))}
              </View>
            )}

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
    backgroundColor: ds.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: ds.inkMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: ds.hair,
  },
  backButton: {
    fontSize: 16,
    color: ds.inkMuted,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  statsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: ds.paper,
    borderBottomWidth: 1,
    borderBottomColor: ds.hair,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: ds.inkMuted,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: ds.hair,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: ds.ink,
  },
  tabText: {
    fontSize: 15,
    fontFamily: fonts.sansMedium,
    color: ds.inkMuted,
  },
  tabTextActive: {
    color: ds.ink,
    fontFamily: fonts.sansSemiBold,
  },
  methodsContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: ds.paper,
  },
  methodsTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
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
    backgroundColor: ds.paper,
    borderWidth: 1,
    borderColor: ds.hair,
    gap: 6,
  },
  methodChipActive: {
    backgroundColor: ds.ink,
    borderColor: ds.ink,
  },
  methodEmoji: {
    fontSize: 16,
  },
  methodText: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: ds.inkMuted,
  },
  methodTextActive: {
    color: ds.white,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: ds.paper,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  sectionCount: {
    fontSize: 14,
    color: ds.inkMuted,
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
    backgroundColor: ds.paper,
    marginBottom: 6,
  },
  itemName: {
    fontSize: 12,
    color: ds.inkMuted,
    lineHeight: 16,
    textTransform: 'capitalize',
  },
  moreCard: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ds.paper,
    borderWidth: 2,
    borderColor: ds.hair,
    borderStyle: 'dashed',
  },
  moreText: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: ds.inkMuted,
  },
  moreLabel: {
    fontSize: 12,
    color: ds.inkFaint,
  },
  tipsContainer: {
    padding: 20,
  },
  tipsTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: ds.paper,
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
    fontFamily: fonts.sansSemiBold,
    color: ds.inkMuted,
  },
  tipPriority: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tipPriorityText: {
    fontSize: 9,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  tipText: {
    fontSize: 14,
    color: ds.inkMuted,
    lineHeight: 20,
  },
  declutterContainer: {
    padding: 20,
  },
  declutterTitle: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 4,
  },
  declutterSubtitle: {
    fontSize: 14,
    color: ds.inkMuted,
    marginBottom: 20,
  },
  declutterCard: {
    flexDirection: 'row',
    backgroundColor: ds.card,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ds.hair,
  },
  declutterImage: {
    width: 120,
    height: 160,
    backgroundColor: ds.paper,
  },
  declutterContent: {
    flex: 1,
    padding: 12,
  },
  declutterName: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  declutterReason: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  declutterReasonText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  declutterExplanation: {
    fontSize: 13,
    color: ds.inkMuted,
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
    color: ds.inkMuted,
  },
  declutterConfidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: ds.paper,
    overflow: 'hidden',
  },
  declutterConfidenceFill: {
    height: '100%',
    backgroundColor: ds.camel,
  },
  declutterConfidenceValue: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: ds.camel,
  },
  declutterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  declutterActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: ds.hair,
    alignItems: 'center',
  },
  declutterActionButtonPrimary: {
    backgroundColor: ds.ink,
    borderColor: ds.ink,
  },
  declutterActionText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.inkMuted,
  },
  declutterActionTextPrimary: {
    color: ds.white,
  },
  capsuleContainer: {
    padding: 20,
  },
  capsuleTitle: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 4,
  },
  capsuleSubtitle: {
    fontSize: 14,
    color: ds.inkMuted,
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
    fontFamily: fonts.sansSemiBold,
    color: ds.inkMuted,
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
    borderColor: ds.hair,
  },
  personalizedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ds.sand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  personalizedBadgeText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
  },
  gapsBox: {
    marginTop: 16,
    backgroundColor: ds.sand,
    padding: 14,
  },
  gapText: {
    fontSize: 13,
    color: ds.tobacco,
    marginBottom: 2,
  },
  gapShopLink: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: ds.tobacco,
    marginBottom: 8,
  },
  capsuleEssentials: {
    backgroundColor: ds.paper,
    padding: 16,
    marginBottom: 20,
  },
  capsuleEssentialsTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
    marginBottom: 12,
  },
  essentialItem: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  essentialBullet: {
    fontSize: 14,
    color: ds.camel,
    fontFamily: fonts.sansSemiBold,
  },
  essentialText: {
    fontSize: 14,
    color: ds.inkMuted,
  },
  capsuleItems: {
    marginBottom: 20,
  },
  capsuleItemsTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
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
    backgroundColor: ds.paper,
  },
});

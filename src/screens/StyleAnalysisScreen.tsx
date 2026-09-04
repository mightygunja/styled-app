import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { aiStyleService, StyleProfile } from '../services/aiStyleService';
import { closetAPI, getCurrentUserId } from '../services/api';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius } from '../theme/designSystem';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StyleAnalysisScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const response = await closetAPI.getItems(getCurrentUserId());
      // Convert API items to Item type
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
      const analysis = await aiStyleService.analyzeStyle(items);
      setProfile(analysis);
    } catch (error) {
      console.error('Error loading analysis:', error);
      showToast('Failed to load analysis', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    try {
      setAnalyzing(true);
      showToast('Analyzing your style...', 'success');
      await loadAnalysis();
      showToast('Analysis complete!', 'success');
    } catch (error) {
      showToast('Failed to analyze', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const getStyleEmoji = (style: string): string => {
    const emojiMap: { [key: string]: string } = {
      minimalist: '',
      bohemian: '',
      streetwear: '',
      vintage: '',
      classic: '',
      athleisure: '',
      formal: '',
      casual: '',
    };
    return emojiMap[style] || '';
  };

  const getInsightIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      strength: '',
      gap: '',
      suggestion: '',
      trend: '',
    };
    return iconMap[type] || '';
  };

  const getPriorityColor = (priority: string): string => {
    const colorMap: { [key: string]: string } = {
      high: colors.ink,
      medium: colors.camel,
      low: colors.camel,
    };
    return colorMap[priority] || colors.inkMuted;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Analyzing your style...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No analysis available</Text>
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
        <Text style={styles.headerTitle}>Style Analysis</Text>
        <TouchableOpacity onPress={handleReanalyze} disabled={analyzing}>
          <Text style={[styles.reanalyzeButton, analyzing && styles.reanalyzeButtonDisabled]}>
            {analyzing ? 'Analysing…' : 'Reanalyse'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Style Profile</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewNumber}>{profile.wardrobeStats.totalItems}</Text>
                <Text style={styles.overviewLabel}>Items</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewNumber}>
                  ${Math.round(profile.wardrobeStats.totalValue)}
                </Text>
                <Text style={styles.overviewLabel}>Total Value</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewNumber}>
                  {profile.dominantStyles.length}
                </Text>
                <Text style={styles.overviewLabel}>Styles</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dominant Styles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Style Profile</Text>
          {profile.dominantStyles.map((style, index) => (
            <View key={style.category} style={styles.styleCard}>
              <View style={styles.styleHeader}>
                <View style={styles.styleInfo}>
                  <Text style={styles.styleEmoji}>{getStyleEmoji(style.category)}</Text>
                  <View>
                    <Text style={styles.styleName}>
                      {style.category.charAt(0).toUpperCase() + style.category.slice(1)}
                    </Text>
                    <Text style={styles.styleCount}>{style.itemCount} items</Text>
                  </View>
                </View>
                <Text style={styles.stylePercentage}>{style.percentage}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${style.percentage}%` },
                    index === 0 && styles.progressFillPrimary,
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>

        {/* Color Palette */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Color Palette</Text>
          <View style={styles.colorCard}>
            <View style={styles.colorHeader}>
              <Text style={styles.colorSeasonTitle}>
                {profile.colorPalette.seasonalPalette.charAt(0).toUpperCase() + 
                 profile.colorPalette.seasonalPalette.slice(1)} Palette
              </Text>
              <Text style={styles.colorSeasonSubtitle}>Based on your color choices
              </Text>
            </View>
            
            <View style={styles.colorGrid}>
              {profile.colorPalette.dominantColors.slice(0, 6).map((color, index) => (
                <View key={index} style={styles.colorItem}>
                  <View 
                    style={[
                      styles.colorSwatch, 
                      { backgroundColor: color.color === 'white' ? colors.paper : color.color }
                    ]} 
                  >
                    {color.color === 'white' && (
                      <View style={styles.colorSwatchBorder} />
                    )}
                  </View>
                  <Text style={styles.colorName}>{color.name}</Text>
                  <Text style={styles.colorPercentage}>{color.percentage}%</Text>
                </View>
              ))}
            </View>

            <View style={styles.colorFamilies}>
              <Text style={styles.colorFamiliesTitle}>Color Families</Text>
              {profile.colorPalette.colorFamilies.map((family, index) => (
                <View key={index} style={styles.familyRow}>
                  <Text style={styles.familyName}>
                    {family.family.charAt(0).toUpperCase() + family.family.slice(1)}
                  </Text>
                  <View style={styles.familyBar}>
                    <View 
                      style={[styles.familyFill, { width: `${family.percentage}%` }]} 
                    />
                  </View>
                  <Text style={styles.familyPercentage}>{family.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Brand Preferences */}
        {profile.brandPreferences.length >0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Brands</Text>
            <View style={styles.brandCard}>
              {profile.brandPreferences.slice(0, 5).map((brand, index) => (
                <View key={index} style={styles.brandRow}>
                  <View style={styles.brandInfo}>
                    <Text style={styles.brandName}>{brand.brand}</Text>
                    <Text style={styles.brandStats}>
                      {brand.itemCount} items • ${brand.averagePrice} avg
                    </Text>
                  </View>
                  <Text style={styles.brandPercentage}>{brand.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Category Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wardrobe Breakdown</Text>
          <View style={styles.categoryCard}>
            {profile.categoryDistribution.map((cat, index) => (
              <View key={index} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>
                    {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
                  </Text>
                  <Text style={styles.categoryCount}>{cat.count} items</Text>
                </View>
                <View style={styles.categoryBar}>
                  <View 
                    style={[styles.categoryFill, { width: `${cat.percentage}%` }]} 
                  />
                </View>
                <Text style={styles.categoryPercentage}>{cat.percentage}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights & Recommendations</Text>
          {profile.insights.map((insight) => (
            <View 
              key={insight.id} 
              style={[
                styles.insightCard,
                { borderLeftColor: getPriorityColor(insight.priority) }
              ]}
            >
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>{getInsightIcon(insight.type)}</Text>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightDescription}>{insight.description}</Text>
                  {insight.actionable && insight.action && (
                    <TouchableOpacity
                      style={styles.insightAction}
                      onPress={() => {
                        // Color insights lead to the color analysis; gap and
                        // balance insights lead to the shop, where matches
                        // against the profile fill what's missing.
                        if (insight.id === 'color-diversity') {
                          navigation.navigate('ColorAnalysis');
                        } else {
                          navigation.navigate('Shop', { matchedOnly: true });
                        }
                      }}
                    >
                      <Text style={styles.insightActionText}>{insight.action} →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wardrobe Stats</Text>
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Average Item Price</Text>
              <Text style={styles.statValue}>
                ${profile.wardrobeStats.averageItemPrice}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Most Worn Category</Text>
              <Text style={styles.statValue}>
                {profile.wardrobeStats.mostWornCategory}
              </Text>
            </View>
            {profile.wardrobeStats.wardrobeGaps.length >0 && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Wardrobe Gaps</Text>
                <Text style={styles.statValue}>
                  {profile.wardrobeStats.wardrobeGaps.join(', ')}
                </Text>
              </View>
            )}
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
    backgroundColor: colors.card,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
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
  reanalyzeButton: {
    fontSize: 20,
  },
  reanalyzeButtonDisabled: {
    opacity: 0.5,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 16,
  },
  overviewCard: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 20,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewNumber: {
    fontSize: 28,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  styleCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  styleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  styleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  styleEmoji: {
    fontSize: 32,
  },
  styleName: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  styleCount: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 2,
  },
  stylePercentage: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.inkFaint,
  },
  progressFillPrimary: {
    backgroundColor: colors.ink,
  },
  colorCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  colorHeader: {
    marginBottom: 16,
  },
  colorSeasonTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  colorSeasonSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  colorItem: {
    alignItems: 'center',
    width: (width - 80) / 3,
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    marginBottom: 8,
    position: 'relative',
  },
  colorSwatchBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  colorName: {
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
    marginBottom: 2,
  },
  colorPercentage: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  colorFamilies: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.paper,
  },
  colorFamiliesTitle: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
  },
  familyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  familyName: {
    fontSize: 13,
    color: colors.inkMuted,
    width: 80,
  },
  familyBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  familyFill: {
    height: '100%',
    backgroundColor: colors.ink,
  },
  familyPercentage: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    width: 40,
    textAlign: 'right',
  },
  brandCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  brandStats: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  brandPercentage: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  categoryCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  categoryInfo: {
    width: 100,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  categoryBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    backgroundColor: colors.ink,
  },
  categoryPercentage: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    width: 40,
    textAlign: 'right',
  },
  insightCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.hair,
    borderLeftWidth: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  insightIcon: {
    fontSize: 24,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  insightAction: {
    marginTop: 8,
  },
  insightActionText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  statsCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  statLabel: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  statValue: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
});

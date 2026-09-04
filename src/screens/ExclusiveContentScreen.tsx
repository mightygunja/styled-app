import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  exclusiveContentService,
  ExclusiveContent,
  ContentType,
  ContentStats,
} from '../services/exclusiveContentService';
import { subscriptionService } from '../services/subscriptionService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors as ds, fonts, radius } from '../theme/designSystem';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ExclusiveContentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<ExclusiveContent[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'premium' | 'pro'>('free');
  const [selectedFilter, setSelectedFilter] = useState<ContentType | 'all'>('all');
  const [selectedTab, setSelectedTab] = useState<'all' | 'featured' | 'new'>('all');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, [selectedFilter, selectedTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const subscription = await subscriptionService.getUserSubscription(getCurrentUserId());
      setUserTier(subscription.tier);

      let contentData: ExclusiveContent[];
      
      if (selectedTab === 'featured') {
        contentData = await exclusiveContentService.getFeaturedContent(subscription.tier);
      } else if (selectedTab === 'new') {
        contentData = await exclusiveContentService.getEarlyAccessContent(subscription.tier);
      } else {
        contentData = await exclusiveContentService.getExclusiveContent(
          subscription.tier,
          selectedFilter !== 'all' ? { type: selectedFilter } : undefined
        );
      }

      const statsData = await exclusiveContentService.getContentStats(subscription.tier);

      setContent(contentData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading content:', error);
      showToast('Failed to load exclusive content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleContentPress = async (item: ExclusiveContent) => {
    const access = await exclusiveContentService.checkContentAccess(item.id, userTier);
    
    if (!access.hasAccess) {
      showToast(access.reason || 'Access denied', 'error');
      return;
    }

    // Navigate to content detail (would be implemented)
    showToast(`Opening ${item.title}`, 'info');
  };

  const handleLike = async (contentId: string) => {
    try {
      await exclusiveContentService.likeContent(contentId);
      showToast('Added to favorites', 'success');
      await loadData();
    } catch (error) {
      console.error('Error liking content:', error);
      showToast('Failed to like content', 'error');
    }
  };

  const getContentTypeIcon = (type: ContentType): string => {
    const icons = {
      look: '👗',
      'trend-report': '📊',
      collection: '📚',
      tutorial: '🎓',
      event: '📅',
    };
    return icons[type] || '📄';
  };

  const getAccessLevelColor = (level: string): string => {
    const colors = {
      free: ds.inkMuted,
      premium: ds.ink,
      pro: ds.camel,
    };
    return colors[level as keyof typeof colors] || ds.inkMuted;
  };

  if (loading && content.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ds.tobacco} />
          <Text style={styles.loadingText}>Loading exclusive content...</Text>
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
        <Text style={styles.headerTitle}>Exclusive Content</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tier Badge */}
      <View style={[styles.tierBanner, { backgroundColor: getAccessLevelColor(userTier) }]}>
        <Text style={styles.tierBannerText}>
          {userTier.toUpperCase()} MEMBER
        </Text>
        {userTier === 'free' && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalContent}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.recentlyAdded}</Text>
            <Text style={styles.statLabel}>New</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.trending}</Text>
            <Text style={styles.statLabel}>Featured</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'featured' && styles.tabActive]}
          onPress={() => setSelectedTab('featured')}
        >
          <Text style={[styles.tabText, selectedTab === 'featured' && styles.tabTextActive]}>
            Featured
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'new' && styles.tabActive]}
          onPress={() => setSelectedTab('new')}
        >
          <Text style={[styles.tabText, selectedTab === 'new' && styles.tabTextActive]}>
            New
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'look' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('look')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'look' && styles.filterChipTextActive]}>
            👗 Looks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'trend-report' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('trend-report')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'trend-report' && styles.filterChipTextActive]}>
            📊 Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'collection' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('collection')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'collection' && styles.filterChipTextActive]}>
            📚 Collections
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'tutorial' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('tutorial')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'tutorial' && styles.filterChipTextActive]}>
            🎓 Tutorials
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'event' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('event')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'event' && styles.filterChipTextActive]}>
            📅 Events
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView>
        {/* Content Grid */}
        <View style={styles.contentGrid}>
          {content.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No content available</Text>
              {userTier === 'free' && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => navigation.navigate('Subscription')}
                >
                  <Text style={styles.emptyStateButtonText}>Upgrade to Premium</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            content.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.contentCard}
                onPress={() => handleContentPress(item)}
              >
                <Image source={{ uri: item.imageUrl }} style={styles.contentImage} />
                
                {/* Badges */}
                <View style={styles.badgeContainer}>
                  {item.isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                  {item.featured && (
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredBadgeText}>⭐</Text>
                    </View>
                  )}
                  <View style={[styles.accessBadge, { backgroundColor: getAccessLevelColor(item.accessLevel) }]}>
                    <Text style={styles.accessBadgeText}>{item.accessLevel.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.contentInfo}>
                  <View style={styles.contentHeader}>
                    <Text style={styles.contentType}>{getContentTypeIcon(item.type)}</Text>
                    <Text style={styles.contentTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </View>
                  
                  <Text style={styles.contentDescription} numberOfLines={2}>
                    {item.description}
                  </Text>

                  {item.author && (
                    <View style={styles.authorContainer}>
                      <Image source={{ uri: item.author.imageUrl }} style={styles.authorImage} />
                      <View style={styles.authorInfo}>
                        <Text style={styles.authorName}>{item.author.name}</Text>
                        <Text style={styles.authorTitle}>{item.author.title}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.contentFooter}>
                    <View style={styles.stats}>
                      <Text style={styles.statText}>👁️ {item.views}</Text>
                      <Text style={styles.statText}>❤️ {item.likes}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.likeButton}
                      onPress={() => handleLike(item.id)}
                    >
                      <Text style={styles.likeButtonText}>♡</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.tagContainer}>
                    {item.tags.slice(0, 2).map((tag, idx) => (
                      <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
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
  tierBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  tierBannerText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  upgradeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: ds.paper,
    borderRadius: radius.md,
    padding: 16,
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
    color: ds.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ds.hair,
  },
  filterChip: {
    backgroundColor: ds.paper,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: ds.ink,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: ds.inkMuted,
  },
  filterChipTextActive: {
    color: ds.white,
  },
  contentGrid: {
    padding: 16,
    gap: 16,
  },
  contentCard: {
    backgroundColor: ds.paper,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 16,
  },
  contentImage: {
    borderRadius: radius.sm,
    width: '100%',
    height: 200,
    backgroundColor: ds.hair,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  newBadge: {
    backgroundColor: ds.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  newBadgeText: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  featuredBadge: {
    backgroundColor: ds.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  featuredBadgeText: {
    fontSize: 12,
  },
  accessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  accessBadgeText: {
    fontSize: 9,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
  contentInfo: {
    padding: 16,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  contentType: {
    fontSize: 20,
  },
  contentTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  contentDescription: {
    fontSize: 14,
    color: ds.inkMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  authorImage: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: ds.hair,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: ds.ink,
  },
  authorTitle: {
    fontSize: 11,
    color: ds.inkMuted,
  },
  contentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 12,
    color: ds.inkMuted,
  },
  likeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: ds.paper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButtonText: {
    fontSize: 16,
    color: ds.inkMuted,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    backgroundColor: ds.sand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  tagText: {
    fontSize: 11,
    fontFamily: fonts.sansMedium,
    color: ds.tobacco,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: ds.inkFaint,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: ds.ink,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: ds.white,
  },
});

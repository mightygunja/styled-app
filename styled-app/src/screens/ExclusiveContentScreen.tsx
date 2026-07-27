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
import { MOCK_USER_ID } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

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
      const subscription = await subscriptionService.getUserSubscription(MOCK_USER_ID);
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
      free: '#64748b',
      premium: '#8b5cf6',
      pro: '#f59e0b',
    };
    return colors[level as keyof typeof colors] || '#64748b';
  };

  if (loading && content.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
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
  tierBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  tierBannerText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  upgradeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
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
    borderBottomColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#8b5cf6',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  contentGrid: {
    padding: 16,
    gap: 16,
  },
  contentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  contentImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e2e8f0',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  newBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  featuredBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredBadgeText: {
    fontSize: 12,
  },
  accessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  accessBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
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
    fontWeight: 'bold',
    color: '#0f172a',
  },
  contentDescription: {
    fontSize: 14,
    color: '#64748b',
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
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  authorTitle: {
    fontSize: 11,
    color: '#64748b',
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
    color: '#64748b',
  },
  likeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#7c3aed',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

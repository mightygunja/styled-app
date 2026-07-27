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
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { socialFeedService, Post } from '../services/socialFeedService';
import { userProfileService, UserProfile } from '../services/userProfileService';
import { getCurrentUserId } from '../services/api';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 6) / 3;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TrendingHashtag {
  tag: string;
  count: number;
  growth: number;
}

interface StyleCategory {
  id: string;
  name: string;
  emoji: string;
  count: number;
}

export default function ExploreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'trending' | 'hashtags' | 'people'>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResultPosts, setSearchResultPosts] = useState<Post[] | null>(null);
  const [searchResultUsers, setSearchResultUsers] = useState<UserProfile[] | null>(null);

  // Trending posts
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [allPublicPosts, setAllPublicPosts] = useState<Post[]>([]);

  // Trending hashtags
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);

  // Style categories
  const [categories, setCategories] = useState<StyleCategory[]>([
    { id: '1', name: 'Minimalist', emoji: '⚪', count: 0 },
    { id: '2', name: 'Streetwear', emoji: '🧢', count: 0 },
    { id: '3', name: 'Vintage', emoji: '👗', count: 0 },
    { id: '4', name: 'Bohemian', emoji: '🌸', count: 0 },
    { id: '5', name: 'Athleisure', emoji: '👟', count: 0 },
    { id: '6', name: 'Formal', emoji: '👔', count: 0 },
  ]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Suggested users
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    loadExploreData();
  }, []);

  const loadExploreData = async () => {
    try {
      setLoading(true);

      // Load trending posts (recent public posts across the app)
      const posts = await socialFeedService.getFeed(getCurrentUserId(), 1, 30);
      const postsWithUsers = await Promise.all(
        posts.map(async (post) => {
          const user = await userProfileService.getUserProfile(post.userId);
          return { ...post, user: user || undefined };
        })
      );
      setTrendingPosts(postsWithUsers);
      setAllPublicPosts(postsWithUsers);

      // Real trending hashtags: aggregate actual hashtag usage across loaded posts
      const hashtagCounts = new Map<string, number>();
      postsWithUsers.forEach(post => {
        post.hashtags.forEach(tag => {
          hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
        });
      });
      const sortedHashtags = Array.from(hashtagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag, count]) => ({ tag, count, growth: 0 }));
      setTrendingHashtags(sortedHashtags);

      // Style categories: count real posts whose hashtags/caption mention the category
      setCategories(prev =>
        prev.map(cat => {
          const key = cat.name.toLowerCase();
          const count = postsWithUsers.filter(
            post =>
              post.hashtags.some(tag => tag.toLowerCase().includes(key)) ||
              post.caption.toLowerCase().includes(key)
          ).length;
          return { ...cat, count };
        })
      );

      // Load suggested users
      const suggestions = await userProfileService.getFollowSuggestions(getCurrentUserId());
      setSuggestedUsers(suggestions.map(s => s.user));

    } catch (error) {
      console.error('Error loading explore data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadExploreData();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResultPosts(null);
      setSearchResultUsers(null);
      return;
    }

    try {
      setSearching(true);
      const lowerQuery = trimmed.replace(/^#/, '').toLowerCase();

      const [matchingPosts, matchingUsers] = await Promise.all([
        Promise.resolve(
          allPublicPosts.filter(
            post =>
              post.caption.toLowerCase().includes(lowerQuery) ||
              post.hashtags.some(tag => tag.toLowerCase().includes(lowerQuery))
          )
        ),
        userProfileService.searchUsers(trimmed),
      ]);

      setSearchResultPosts(matchingPosts);
      setSearchResultUsers(matchingUsers);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleHashtagPress = (tag: string) => {
    setSearchQuery(`#${tag}`);
    setSearchResultPosts(allPublicPosts.filter(post => post.hashtags.includes(tag)));
    setSearchResultUsers([]);
  };

  const handleCategoryPress = (category: StyleCategory) => {
    const key = category.name.toLowerCase();
    setActiveCategory(prev => (prev === category.id ? null : category.id));
    if (activeCategory === category.id) {
      setTrendingPosts(allPublicPosts);
    } else {
      setTrendingPosts(
        allPublicPosts.filter(
          post =>
            post.hashtags.some(tag => tag.toLowerCase().includes(key)) ||
            post.caption.toLowerCase().includes(key)
        )
      );
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResultPosts(null);
    setSearchResultUsers(null);
  };

  const renderTrendingTab = () => (
    <View>
      {/* Style Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Style Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, activeCategory === category.id && styles.categoryCardActive]}
              onPress={() => handleCategoryPress(category)}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>{category.count} posts</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Trending Posts Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {activeCategory ? `${categories.find(c => c.id === activeCategory)?.name} Posts` : 'Trending Posts'}
        </Text>
        {trendingPosts.length === 0 && (
          <Text style={styles.emptyHint}>No posts match this category yet.</Text>
        )}
        <View style={styles.postsGrid}>
          {trendingPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.gridItem}
              onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
            >
              <Image source={{ uri: post.images[0] }} style={styles.gridImage} />
              {post.images.length > 1 && (
                <View style={styles.multipleIndicator}>
                  <Text style={styles.multipleIcon}>📷</Text>
                </View>
              )}
              <View style={styles.gridOverlay}>
                <View style={styles.gridStats}>
                  <Text style={styles.gridStat}>❤️ {post.likes}</Text>
                  <Text style={styles.gridStat}>💬 {post.comments}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderHashtagsTab = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Trending Hashtags</Text>
      {trendingHashtags.length === 0 && (
        <Text style={styles.emptyHint}>No hashtags trending yet — be the first to post one!</Text>
      )}
      {trendingHashtags.map((hashtag, index) => (
        <TouchableOpacity
          key={hashtag.tag}
          style={styles.hashtagCard}
          onPress={() => handleHashtagPress(hashtag.tag)}
        >
          <View style={styles.hashtagRank}>
            <Text style={styles.rankNumber}>{index + 1}</Text>
          </View>
          <View style={styles.hashtagContent}>
            <Text style={styles.hashtagName}>#{hashtag.tag}</Text>
            <Text style={styles.hashtagCount}>{hashtag.count} post{hashtag.count === 1 ? '' : 's'}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const handleQuickFollow = async (targetUserId: string) => {
    try {
      await userProfileService.followUser(getCurrentUserId(), targetUserId);
      setSuggestedUsers(prev => prev.filter(u => u.userId !== targetUserId));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const renderUserCard = (user: UserProfile) => (
    <TouchableOpacity
      key={user.id}
      style={styles.userCard}
      onPress={() => navigation.navigate('UserProfile', { userId: user.userId })}
    >
      {user.profileImageUrl ? (
        <Image source={{ uri: user.profileImageUrl }} style={styles.userAvatar} />
      ) : (
        <View style={styles.userAvatarPlaceholder}>
          <Text style={styles.userInitial}>{user.displayName.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.displayName}</Text>
        <Text style={styles.userUsername}>@{user.username}</Text>
        {user.bio && (
          <Text style={styles.userBio} numberOfLines={1}>
            {user.bio}
          </Text>
        )}
        <View style={styles.userTags}>
          {user.styleTags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.userTag}>
              <Text style={styles.userTagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.followButton} onPress={() => handleQuickFollow(user.userId)}>
        <Text style={styles.followButtonText}>Follow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPeopleTab = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Suggested For You</Text>
      {suggestedUsers.length === 0 && (
        <Text style={styles.emptyHint}>No new suggestions right now — check back later!</Text>
      )}
      {suggestedUsers.map(renderUserCard)}
    </View>
  );

  const renderSearchResults = () => (
    <View style={styles.section}>
      {searching ? (
        <ActivityIndicator size="small" color="#ef4444" />
      ) : (
        <>
          {searchResultUsers && searchResultUsers.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>People</Text>
              {searchResultUsers.map(renderUserCard)}
            </>
          )}
          {searchResultPosts && searchResultPosts.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Posts</Text>
              <View style={styles.postsGrid}>
                {searchResultPosts.map(post => (
                  <TouchableOpacity
                    key={post.id}
                    style={styles.gridItem}
                    onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                  >
                    <Image source={{ uri: post.images[0] }} style={styles.gridImage} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          {(!searchResultUsers || searchResultUsers.length === 0) &&
            (!searchResultPosts || searchResultPosts.length === 0) && (
              <Text style={styles.emptyHint}>No results for "{searchQuery}"</Text>
            )}
        </>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search styles, hashtags, people..."
          value={searchQuery}
          onChangeText={text => {
            setSearchQuery(text);
            if (!text.trim()) {
              setSearchResultPosts(null);
              setSearchResultUsers(null);
            }
          }}
          onSubmitEditing={handleSearch}
        />
        {searchResultPosts || searchResultUsers ? (
          <TouchableOpacity style={styles.searchButton} onPress={clearSearch}>
            <Text style={styles.searchIcon}>✕</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs - hidden while showing search results */}
      {!(searchResultPosts || searchResultUsers) && (
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
            onPress={() => setActiveTab('trending')}
          >
            <Text style={[styles.tabText, activeTab === 'trending' && styles.activeTabText]}>
              Trending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'hashtags' && styles.activeTab]}
            onPress={() => setActiveTab('hashtags')}
          >
            <Text style={[styles.tabText, activeTab === 'hashtags' && styles.activeTabText]}>
              Hashtags
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'people' && styles.activeTab]}
            onPress={() => setActiveTab('people')}
          >
            <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>
              People
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {(searchResultPosts || searchResultUsers) ? (
          renderSearchResults()
        ) : (
          <>
            {activeTab === 'trending' && renderTrendingTab()}
            {activeTab === 'hashtags' && renderHashtagsTab()}
            {activeTab === 'people' && renderPeopleTab()}
          </>
        )}
      </ScrollView>
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
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 20,
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
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#ef4444',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  categoriesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryCard: {
    width: 120,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryCardActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  emptyHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: '#64748b',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginHorizontal: -16,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
  },
  multipleIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  multipleIcon: {
    fontSize: 12,
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 8,
  },
  gridStats: {
    flexDirection: 'row',
    gap: 12,
  },
  gridStat: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  hashtagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  hashtagRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  hashtagContent: {
    flex: 1,
  },
  hashtagName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  hashtagCount: {
    fontSize: 13,
    color: '#64748b',
  },
  hashtagGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  growthIcon: {
    fontSize: 16,
  },
  growthText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
  },
  userAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  userUsername: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
  },
  userTags: {
    flexDirection: 'row',
    gap: 6,
  },
  userTag: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userTagText: {
    fontSize: 11,
    color: '#64748b',
  },
  followButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

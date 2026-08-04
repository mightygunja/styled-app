import React, { useState, useEffect, useMemo } from 'react';
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
import BackButton from '../components/BackButton';
import Chip from '../components/Chip';
import { RootStackParamList } from '../navigation/types';
import { Post } from '../services/socialFeedService';
import { userProfileService, UserProfile, FollowSuggestion } from '../services/userProfileService';
import { buildProfileMatchContext, ProfileMatchContext } from '../services/profileMatchContext';
import {
  exploreService,
  TrendingPost,
  TrendingHashtag,
  ExploreCollection,
} from '../services/exploreService';
import { getCurrentUserId } from '../services/api';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - spacing.page * 2 - 8) / 3;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'for-you' | 'trending' | 'hashtags' | 'people';

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'for-you', label: 'For you' },
  { value: 'trending', label: 'Trending' },
  { value: 'hashtags', label: 'Tags' },
  { value: 'people', label: 'People' },
];

export default function ExploreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<Tab>('for-you');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [pool, setPool] = useState<Post[]>([]);
  const [profile, setProfile] = useState<ProfileMatchContext | undefined>();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [collections, setCollections] = useState<ExploreCollection[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<FollowSuggestion[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [searchResultPosts, setSearchResultPosts] = useState<Post[] | null>(null);
  const [searchResultUsers, setSearchResultUsers] = useState<UserProfile[] | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const userId = getCurrentUserId();

      const [posts, matchContext, following] = await Promise.all([
        exploreService.fetchExplorePool(200),
        buildProfileMatchContext(userId),
        userProfileService.getFollowing(userId).catch(() => []),
      ]);

      setPool(posts);
      setProfile(matchContext);
      setFollowingIds(following.map(u => u.userId));

      // Curation is enrichment, so the screen renders without waiting on it.
      exploreService.curateCollections(posts).then(setCollections);

      // getFollowSuggestions already ranks by follower count and excludes both
      // the user and anyone they follow - the same exclusion rankForYou applies
      // to posts.
      userProfileService
        .getFollowSuggestions(userId, 12)
        .then(setSuggestedUsers)
        .catch(() => setSuggestedUsers([]));
    } catch (error) {
      console.error('Error loading explore:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length < 2) {
      setSearchResultPosts(null);
      setSearchResultUsers(null);
      return;
    }

    const q = text.trim().toLowerCase();
    setSearchResultPosts(
      pool.filter(
        p =>
          p.caption?.toLowerCase().includes(q) ||
          (p.hashtags || []).some(t => t.toLowerCase().includes(q))
      )
    );
    try {
      setSearchResultUsers(await userProfileService.searchUsers(text.trim()));
    } catch {
      setSearchResultUsers([]);
    }
  };

  const trending = useMemo(() => exploreService.rankTrending(pool), [pool]);
  const forYou = useMemo(
    () => exploreService.rankForYou(pool, profile, followingIds, getCurrentUserId()),
    [pool, profile, followingIds]
  );
  const hashtags = useMemo(() => exploreService.rankHashtags(pool), [pool]);
  const postsById = useMemo(() => new Map(pool.map(p => [p.id, p])), [pool]);

  const tagFiltered = useMemo(
    () => (activeTag ? pool.filter(p => (p.hashtags || []).some(t => t.toLowerCase() === activeTag)) : []),
    [pool, activeTag]
  );

  const openPost = (postId: string) => navigation.navigate('PostDetail', { postId });

  const renderGrid = (posts: Post[]) => (
    <View style={styles.grid}>
      {posts.map(post => (
        <TouchableOpacity key={post.id} onPress={() => openPost(post.id)} activeOpacity={0.85}>
          {post.images?.[0] ? (
            <Image source={{ uri: post.images[0] }} style={styles.gridImage} />
          ) : (
            <View style={styles.gridImage} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderUserCard = (user: UserProfile, reason?: string) => (
    <TouchableOpacity
      key={user.id}
      style={styles.userRow}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('UserProfile', { userId: user.userId })}
    >
      {user.profileImageUrl ? (
        <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
      )}
      <View style={styles.userText}>
        <Text style={styles.userName}>{user.displayName}</Text>
        <Text style={styles.userMeta}>
          @{user.username}
          {reason ? `  ·  ${reason}` : ''}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderPostRow = (post: Post, reason: string) => (
    <TouchableOpacity
      key={post.id}
      style={styles.postRow}
      activeOpacity={0.85}
      onPress={() => openPost(post.id)}
    >
      {post.images?.[0] ? (
        <Image source={{ uri: post.images[0] }} style={styles.postThumb} />
      ) : (
        <View style={styles.postThumb} />
      )}
      <View style={styles.postText}>
        <Text style={styles.postReason}>{reason}</Text>
        {!!post.caption && (
          <Text style={styles.postCaption} numberOfLines={2}>
            {post.caption}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderForYou = () => {
    if (forYou.length === 0 && collections.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Nothing new yet</Text>
          <Text style={styles.emptyText}>
            This shows posts from people you don't already follow. As the community grows, so does
            this.
          </Text>
        </View>
      );
    }

    return (
      <>
        {collections.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>CURATED THIS WEEK</Text>
            {collections.map(collection => {
              const posts = collection.postIds
                .map(id => postsById.get(id))
                .filter((p): p is Post => !!p);
              if (posts.length === 0) return null;
              return (
                <View key={collection.title} style={styles.collection}>
                  <Text style={styles.collectionTitle}>{collection.title}</Text>
                  <Text style={styles.collectionRationale}>{collection.rationale}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.collectionStrip}
                  >
                    {posts.map(post => (
                      <TouchableOpacity
                        key={post.id}
                        onPress={() => openPost(post.id)}
                        activeOpacity={0.85}
                      >
                        {post.images?.[0] ? (
                          <Image source={{ uri: post.images[0] }} style={styles.collectionImage} />
                        ) : (
                          <View style={styles.collectionImage} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              );
            })}
          </>
        )}

        {forYou.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>MATCHED TO YOUR PROFILE</Text>
            {forYou.slice(0, 12).map(({ post, reason }) => renderPostRow(post, reason))}
          </>
        )}
      </>
    );
  };

  const renderTrending = () =>
    trending.length === 0 ? (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>Nothing trending yet</Text>
        <Text style={styles.emptyText}>
          Trending ranks by how fast a post gathers likes, comments and saves — so it needs some
          activity before it can say anything honest.
        </Text>
      </View>
    ) : (
      <>
        <Text style={styles.sectionLabel}>MOVING FASTEST</Text>
        {trending.slice(0, 12).map(({ post, reason }: TrendingPost) => renderPostRow(post, reason))}
      </>
    );

  const renderHashtags = () =>
    hashtags.length === 0 ? (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>No tags yet</Text>
        <Text style={styles.emptyText}>Tags appear here once posts start using them.</Text>
      </View>
    ) : (
      <>
        <Text style={styles.sectionLabel}>MOST USED</Text>
        {hashtags.map((tag: TrendingHashtag) => (
          <TouchableOpacity
            key={tag.tag}
            style={styles.tagRow}
            activeOpacity={0.85}
            onPress={() => setActiveTag(activeTag === tag.tag ? null : tag.tag)}
          >
            <View style={styles.userText}>
              <Text style={styles.tagName}>#{tag.tag}</Text>
              <Text style={styles.userMeta}>
                {tag.count} {tag.count === 1 ? 'post' : 'posts'}
                {/* Real growth: the share of this tag's uses from the last two
                    days. The previous version hardcoded growth to zero. */}
                {tag.growth >= 40 ? `  ·  ${tag.growth}% in the last 48h` : ''}
              </Text>
            </View>
            <Text style={styles.chevron}>{activeTag === tag.tag ? '−' : '+'}</Text>
          </TouchableOpacity>
        ))}
        {activeTag && tagFiltered.length > 0 && renderGrid(tagFiltered)}
      </>
    );

  const renderPeople = () =>
    suggestedUsers.length === 0 ? (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>No one to show yet</Text>
        <Text style={styles.emptyText}>People appear here as the community grows.</Text>
      </View>
    ) : (
      <>
        <Text style={styles.sectionLabel}>PEOPLE TO FOLLOW</Text>
        {suggestedUsers.map(s => renderUserCard(s.user, s.reason))}
      </>
    );

  const isSearching = searchQuery.trim().length >= 2;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.ink} />
        }
      >
        <Text style={styles.eyebrow}>COMMUNITY</Text>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>
          What the community is wearing — ranked by what's actually moving, and matched to how you
          dress.
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search posts and people…"
          placeholderTextColor={colors.inkFaint}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCorrect={false}
        />

        {!isSearching && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabScroll}
            contentContainerStyle={styles.tabContent}
          >
            {TABS.map(tab => (
              <Chip
                key={tab.value}
                label={tab.label}
                active={activeTab === tab.value}
                onPress={() => setActiveTab(tab.value)}
                style={styles.tabChip}
              />
            ))}
          </ScrollView>
        )}

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : isSearching ? (
          <>
            {!!searchResultUsers?.length && (
              <>
                <Text style={styles.sectionLabel}>PEOPLE</Text>
                {searchResultUsers.map(u => renderUserCard(u))}
              </>
            )}
            {!!searchResultPosts?.length && (
              <>
                <Text style={styles.sectionLabel}>POSTS</Text>
                {renderGrid(searchResultPosts)}
              </>
            )}
            {!searchResultUsers?.length && !searchResultPosts?.length && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Nothing found</Text>
                <Text style={styles.emptyText}>Try a different word or tag.</Text>
              </View>
            )}
          </>
        ) : activeTab === 'for-you' ? (
          renderForYou()
        ) : activeTab === 'trending' ? (
          renderTrending()
        ) : activeTab === 'hashtags' ? (
          renderHashtags()
        ) : (
          renderPeople()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  busyBox: { paddingVertical: 80, alignItems: 'center' },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12, marginBottom: spacing.lg },
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 14 },

  searchInput: {
    ...textType.body,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  tabScroll: {
    marginTop: spacing.sm,
    marginHorizontal: -spacing.page,
    flexGrow: 0,
    flexShrink: 0,
  },
  tabContent: { paddingHorizontal: spacing.page, paddingVertical: 6, alignItems: 'center' },
  tabChip: { marginRight: 8 },

  emptyBox: { marginTop: spacing.section, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },

  // Curated collections get the editorial treatment - a serif title and a
  // written rationale - because that is what separates them from a ranking.
  collection: { marginBottom: spacing.lg },
  collectionTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  collectionRationale: {
    ...textType.body,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  collectionStrip: {
    marginTop: spacing.sm,
    marginHorizontal: -spacing.page,
    paddingHorizontal: spacing.page,
  },
  collectionImage: { width: 150, height: 190, marginRight: 8, backgroundColor: colors.paper },

  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  postThumb: { width: 72, height: 88, backgroundColor: colors.paper },
  postText: { flex: 1, marginLeft: 14 },
  // The reason leads. A discovery surface that cannot say why it chose
  // something is indistinguishable from a random feed.
  postReason: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.tobacco },
  postCaption: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginTop: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  gridImage: { width: GRID_SIZE, height: GRID_SIZE, backgroundColor: colors.paper },

  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  tagName: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 18, color: colors.tobacco },
  userText: { flex: 1, marginLeft: 12 },
  userName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  userMeta: { ...textType.meta, fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 20, color: colors.inkFaint },
});

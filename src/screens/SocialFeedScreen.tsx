import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { socialFeedService, Post } from '../services/socialFeedService';
import { userProfileService, FollowSuggestion } from '../services/userProfileService';
import { exploreService } from '../services/exploreService';
import { userSettingsService } from '../services/userSettingsService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';
import { colors, fonts, radius } from '../theme/designSystem';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SocialFeedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Finding people to follow lives here, not on Explore. Explore is now about
  // the user's own wardrobe, and a feed with nothing in it is exactly where
  // someone needs a way out.
  const [suggestions, setSuggestions] = useState<FollowSuggestion[]>([]);
  const [discoverable, setDiscoverable] = useState<Post[]>([]);
  // Paging state. The feed used to be hard-capped at the newest 10 posts -
  // anything older simply vanished from the app.
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // When set, the screen shows public posts carrying this tag instead of the
  // feed. Tags rendered as links but did nothing before this.
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const [loadError, setLoadError] = useState(false);
  // Images and the discover grid are sized to the measured content column,
  // not the browser window: on desktop web the feed sits in a 720px frame, so
  // window-width images overflowed it and broke paging. On a phone the two
  // widths are the same.
  const [columnWidth, setColumnWidth] = useState(
    Platform.OS === 'web' ? Math.min(width, 720) : width
  );

  const PAGE_SIZE = 10;

  useEffect(() => {
    loadFeed();
  }, []);

  // The feed stays mounted under CreatePost and PostDetail, so a post just
  // published (or deleted, liked, saved) was missing or stale on return until
  // a pull-to-refresh - which does nothing on web. Coming back into focus
  // quietly re-reads the pages already on screen: no spinner, no scroll jump.
  const pageRef = useRef(1);
  const activeHashtagRef = useRef<string | null>(null);
  const hasFocusedOnce = useRef(false);
  const refreshOnFocusRef = useRef<() => void>(() => {});
  pageRef.current = page;
  activeHashtagRef.current = activeHashtag;

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true; // the mount effect above does the first load
        return;
      }
      refreshOnFocusRef.current();
    }, [])
  );

  // The "Show following only" toggle in Settings is a real filter here, not a
  // stored bit nothing reads: when it's on, the feed keeps posts from people
  // the user follows plus their own. A settings failure falls back to the
  // unfiltered feed rather than an empty screen.
  const applyFeedSettings = async (userId: string, feedPosts: Post[]): Promise<Post[]> => {
    try {
      const settings = await userSettingsService.get(userId);
      if (!settings.feedShowFollowingOnly) return feedPosts;
      const following = await userProfileService.getFollowing(userId);
      const followedIds = new Set(following.map(profile => profile.userId));
      return feedPosts.filter(post => post.userId === userId || followedIds.has(post.userId));
    } catch (error) {
      console.error('Error applying feed settings:', error);
      return feedPosts;
    }
  };

  const loadFeed = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const userId = getCurrentUserId();
      const fetchedPosts = await socialFeedService.getFeed(userId);
      const feedPosts = await applyFeedSettings(userId, fetchedPosts);

      // Load user profiles for posts
      const postsWithUsers = await Promise.all(
        feedPosts.map(async (post) => {
          const user = await userProfileService.getUserProfile(post.userId);
          // Post.user is optional, not nullable - getUserProfile returns null
          // when there is no profile, which is not the same type.
          return { ...post, user: user || undefined };
        })
      );
      
      setPosts(postsWithUsers);
      setActiveHashtag(null);
      setPage(1);
      // Paging tracks what the server returned, not what the filter kept.
      setHasMore(fetchedPosts.length === PAGE_SIZE);

      // Suggestions are enrichment - they load after the feed and never block
      // it, and they stay empty rather than inventing anyone.
      userProfileService
        .getFollowSuggestions(userId, 8)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));

      if (feedPosts.length < 5) {
        exploreService
          .fetchExplorePool(120)
          .then(pool => {
            const following = postsWithUsers.map(p => p.userId);
            const trending = exploreService
              .rankTrending(pool)
              .map(t => t.post)
              .filter(p => p.userId !== userId && !following.includes(p.userId));
            setDiscoverable(trending.slice(0, 9));
          })
          .catch(() => setDiscoverable([]));
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      setLoadError(true);
      showToast('Failed to load feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Silent re-read used when the screen regains focus. It fetches as many
  // posts as are already showing (page x PAGE_SIZE) so paging stays intact,
  // and on failure it leaves what is on screen alone.
  const refreshOnFocus = async () => {
    if (activeHashtagRef.current) return;
    try {
      const userId = getCurrentUserId();
      const shownPages = pageRef.current;
      const fetchedPosts = await socialFeedService.getFeed(userId, 1, shownPages * PAGE_SIZE);
      const feedPosts = await applyFeedSettings(userId, fetchedPosts);
      const postsWithUsers = await Promise.all(
        feedPosts.map(async (post) => {
          const user = await userProfileService.getUserProfile(post.userId);
          return { ...post, user: user || undefined };
        })
      );
      // The user may have opened a tag or paged on while this was in flight.
      if (activeHashtagRef.current || pageRef.current !== shownPages) return;
      setPosts(postsWithUsers);
      setHasMore(fetchedPosts.length === shownPages * PAGE_SIZE);
      setLoadError(false);
    } catch (error) {
      console.error('Error refreshing feed on focus:', error);
    }
  };
  refreshOnFocusRef.current = refreshOnFocus;

  const loadMore = async () => {
    if (loadingMore || !hasMore || activeHashtag) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const userId = getCurrentUserId();
      const fetchedPosts = await socialFeedService.getFeed(userId, nextPage, PAGE_SIZE);
      const morePosts = await applyFeedSettings(userId, fetchedPosts);
      const moreWithUsers = await Promise.all(
        morePosts.map(async (post) => {
          const user = await userProfileService.getUserProfile(post.userId);
          return { ...post, user: user || undefined };
        })
      );
      setPosts(prev => [
        ...prev,
        ...moreWithUsers.filter(p => !prev.some(existing => existing.id === p.id)),
      ]);
      setPage(nextPage);
      setHasMore(fetchedPosts.length === PAGE_SIZE);
    } catch (error) {
      showToast('Could not load older posts', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  // Public posts carrying one tag, newest first, with the same like/save
  // state the feed loads. Replaces the empty onPress the hashtags shipped with.
  const normaliseTag = (value: string) => value.replace(/^#+/, '').trim().toLowerCase();

  const loadHashtag = async (rawTag: string) => {
    const tag = normaliseTag(rawTag);
    if (!tag) return;
    try {
      setLoading(true);
      setLoadError(false);
      const userId = getCurrentUserId();
      const tagPosts = await socialFeedService.searchByHashtag(tag);
      // The search matches lower-case tags exactly, but posts published before
      // tags were normalised on write kept their typed case (#OOTD), so the
      // post that was just tapped could be missing from its own tag. Any
      // public post already on screen that carries the tag is kept in.
      const known = new Set(tagPosts.map(p => p.id));
      const alreadyShown = posts.filter(
        p =>
          p.privacy === 'public' &&
          !known.has(p.id) &&
          (p.hashtags || []).some(h => normaliseTag(h) === tag)
      );
      const merged = [...tagPosts, ...alreadyShown].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const withState = await Promise.all(
        merged.map(async (post) => {
          const [user, isLiked, isSaved] = await Promise.all([
            userProfileService.getUserProfile(post.userId),
            socialFeedService.isPostLiked(post.id, userId),
            socialFeedService.isPostSaved(post.id, userId),
          ]);
          return { ...post, user: user || undefined, isLiked, isSaved };
        })
      );
      setActiveHashtag(tag);
      setPosts(withState);
    } catch (error) {
      showToast('Could not load that tag', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeHashtag) {
      await loadHashtag(activeHashtag);
    } else {
      await loadFeed();
    }
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    const post = posts.find(p =>p.id === postId);
    if (!post) return;

    try {
      if (post.isLiked) {
        await socialFeedService.unlikePost(postId, getCurrentUserId());
        setPosts(posts.map(p =>p.id === postId ? { ...p, isLiked: false, likes: p.likes - 1 } : p
        ));
      } else {
        await socialFeedService.likePost(postId, getCurrentUserId());
        setPosts(posts.map(p =>p.id === postId ? { ...p, isLiked: true, likes: p.likes + 1 } : p
        ));
      }
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  const handleSave = async (postId: string) => {
    const post = posts.find(p =>p.id === postId);
    if (!post) return;

    try {
      if (post.isSaved) {
        await socialFeedService.unsavePost(postId, getCurrentUserId());
        setPosts(posts.map(p =>p.id === postId ? { ...p, isSaved: false, saves: p.saves - 1 } : p
        ));
        showToast('Removed from saved', 'success');
      } else {
        await socialFeedService.savePost(postId, getCurrentUserId());
        setPosts(posts.map(p =>p.id === postId ? { ...p, isSaved: true, saves: p.saves + 1 } : p
        ));
        showToast('Saved — find it under Your profile', 'success');
      }
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  // Shares the post's own link. Where the share sheet is unavailable (most
  // desktop browsers) the link is copied instead, and the share is counted
  // only when one of the two actually happened.
  const handleShare = async (post: Post) => {
    const url = `https://www.thirtythreetrends.com/post/${post.id}`;
    const message = post.caption ? `${post.caption}\n${url}` : url;
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
    let shared = false;
    try {
      if (Platform.OS === 'web' && typeof nav?.share !== 'function') {
        throw new Error('share-unsupported');
      }
      const result = await Share.share({ message });
      shared = !result || result.action !== Share.dismissedAction;
    } catch (error: any) {
      if (error?.name === 'AbortError') return; // the user closed the share sheet
      if (Platform.OS === 'web' && nav?.clipboard?.writeText) {
        try {
          await nav.clipboard.writeText(url);
          shared = true;
          showToast('Link copied', 'success');
        } catch {
          shared = false;
        }
      }
      if (!shared) {
        showToast("Couldn't share this post", 'error');
        return;
      }
    }
    if (!shared) return;
    try {
      await socialFeedService.sharePost(post.id);
      setPosts(prev =>prev.map(p => (p.id === post.id ? { ...p, shares: p.shares + 1 } : p)));
    } catch (error) {
      console.error('Error recording share:', error);
    }
  };

  // Three across inside the 20px page gutters, with two 4px gaps.
  const discoverCell = (columnWidth - 40 - 8) / 3;
  const discoverSize = { width: discoverCell, height: discoverCell };

  const openOwnProfile = () => {
    const userId = getCurrentUserId();
    if (userId) navigation.navigate('UserProfile', { userId });
  };

  const renderPost = (post: Post) => (
    <View key={post.id} style={styles.postCard}>
      {/* Post Header */}
      <TouchableOpacity
        style={styles.postHeader}
        onPress={() =>navigation.navigate('UserProfile', { userId: post.userId })}
      >
        {post.user?.profileImageUrl ? (
          <Image source={{ uri: post.user.profileImageUrl }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatarPlaceholder}>
            <Text style={styles.userInitial}>
              {post.user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{post.user?.displayName || 'User'}</Text>
          <Text style={styles.postTime}>
            {new Date(post.createdAt).toLocaleDateString()}
          </Text>
        </View>
        {post.type === 'transformation' && (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>Transformation</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Post Images */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={[styles.imagesContainer, { width: columnWidth }]}
      >
        {post.images.map((image, index) => (
          <TouchableOpacity
            key={index}
            onPress={() =>navigation.navigate('PostDetail', { postId: post.id })}
          >
            <Image
              source={{ uri: image }}
              style={[styles.postImage, { width: columnWidth, height: columnWidth }]}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {post.images.length >1 && (
        <View style={[styles.imageIndicator, { top: columnWidth - 40 }]}>
          <Text style={styles.imageCount}>1/{post.images.length}</Text>
        </View>
      )}

      {/* Every control carries a word. The icon-only version left Comment,
          Share and Save rendering as a bare number or nothing at all after the
          emoji sweep removed their only child. */}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(post.id)}>
          <Text style={[styles.actionLabel, post.isLiked && styles.actionLabelActive]}>
            {post.isLiked ? 'Liked' : 'Like'}
          </Text>
          <Text style={styles.actionCount}>{post.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
        >
          <Text style={styles.actionLabel}>Comment</Text>
          <Text style={styles.actionCount}>{post.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(post)}>
          <Text style={styles.actionLabel}>Share</Text>
          <Text style={styles.actionCount}>{post.shares}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.actionButton} onPress={() => handleSave(post.id)}>
          <Text style={[styles.actionLabel, post.isSaved && styles.actionLabelActive]}>
            {post.isSaved ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Post Caption */}
      <View style={styles.postCaption}>
        <Text style={styles.captionText}>
          <Text style={styles.captionUser}>{post.user?.displayName} </Text>
          {post.caption}
        </Text>
        {post.hashtags.length >0 && (
          <View style={styles.hashtagsContainer}>
            {post.hashtags.map((tag, index) => (
              <TouchableOpacity key={index} onPress={() => loadHashtag(tag)}>
                <Text style={styles.hashtag}>#{tag} </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* View Comments */}
      {post.comments >0 && (
        <TouchableOpacity
          style={styles.viewComments}
          onPress={() =>navigation.navigate('PostDetail', { postId: post.id })}
        >
          <Text style={styles.viewCommentsText}>View all {post.comments} comments
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <View style={styles.headerRow}>
          <BackButton />
          {/* The only way into your own profile - and so to your saved posts
              and Edit profile - used to be tapping your avatar on something
              you had already posted. */}
          <TouchableOpacity
            style={styles.profileLink}
            onPress={openOwnProfile}
            accessibilityRole="button"
            accessibilityLabel="Your profile and saved posts"
          >
            <Ionicons name="person-circle-outline" size={18} color={colors.tobacco} />
            <Text style={styles.profileLinkText}>Your profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        onLayout={event => {
          const measured = event.nativeEvent.layout.width;
          if (measured > 0 && Math.abs(measured - columnWidth) > 1) setColumnWidth(measured);
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.ink} />
        }
      >
        {activeHashtag ? (
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>TAGGED</Text>
            <Text style={styles.title}>#{activeHashtag}</Text>
            <Text style={styles.subtitle}>Public posts using this tag, newest first.</Text>
            <TouchableOpacity style={styles.clearTagButton} onPress={loadFeed}>
              <Text style={styles.clearTagButtonText}>Back to the feed</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>COMMUNITY</Text>
            <Text style={styles.title}>The feed</Text>
            {/* The feed is every public post, so the copy says so - it used to
                claim it was driven by who you follow, which was never true. */}
            <Text style={styles.subtitle}>The newest public looks from the community.</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreatePost')}
            >
              <Text style={styles.createButtonText}>Share a look</Text>
            </TouchableOpacity>
          </View>
        )}

        {posts.length === 0 && loadError && (
          <TouchableOpacity style={styles.emptyState} activeOpacity={0.85} onPress={loadFeed}>
            <Text style={styles.emptyText}>Couldn't load the feed</Text>
            <Text style={styles.emptySubtext}>Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {posts.length === 0 && !loadError && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {activeHashtag ? 'Nothing under this tag' : 'The feed is quiet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeHashtag
                ? 'No public posts use this tag yet.'
                : 'No one has posted yet. Share a look to start it off.'}
            </Text>
          </View>
        )}

        {posts.map(renderPost)}

        {!activeHashtag && posts.length > 0 && hasMore && (
          <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore} disabled={loadingMore}>
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.ink} />
            ) : (
              <Text style={styles.loadMoreButtonText}>Load older posts</Text>
            )}
          </TouchableOpacity>
        )}

        {!activeHashtag && suggestions.length > 0 && (
          <View style={styles.railSection}>
            <Text style={styles.railLabel}>PEOPLE TO FOLLOW</Text>
            {suggestions.map(({ user, reason }) => (
              <TouchableOpacity
                key={user.userId}
                style={styles.suggestionRow}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('UserProfile', { userId: user.userId })}
              >
                {user.profileImageUrl ? (
                  <Image source={{ uri: user.profileImageUrl }} style={styles.suggestionAvatar} />
                ) : (
                  <View style={styles.suggestionAvatarPlaceholder}>
                    <Text style={styles.suggestionInitial}>
                      {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionName}>{user.displayName}</Text>
                  <Text style={styles.suggestionMeta}>
                    @{user.username}
                    {reason ? `  ·  ${reason}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!activeHashtag && discoverable.length > 0 && (
          <View style={styles.railSection}>
            <Text style={styles.railLabel}>WHAT'S MOVING</Text>
            <Text style={styles.railNote}>
              Ranked by how fast each post is gathering likes, comments and saves — not by how
              recent it is.
            </Text>
            <View style={styles.discoverGrid}>
              {discoverable.map(post => (
                <TouchableOpacity
                  key={post.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                >
                  {post.images?.[0] ? (
                    <Image source={{ uri: post.images[0] }} style={[styles.discoverImage, discoverSize]} />
                  ) : (
                    <View style={[styles.discoverImage, discoverSize]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
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
    backgroundColor: colors.bone,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 12,
  },
  profileLinkText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.tobacco,
  },
  content: {
    paddingBottom: 60,
  },
  intro: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 34,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    color: colors.inkMuted,
    marginTop: 12,
  },
  createButton: {
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: 20,
    backgroundColor: colors.rust,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  createButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.white,
  },
  clearTagButton: {
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  clearTagButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.ink,
  },
  loadMoreButton: {
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  loadMoreButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.ink,
  },
  // A hairline rule between posts rather than an 8px slab of paper. The
  // separation should read as editorial, not as a gap in the page.
  postCard: {
    marginBottom: 28,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.paper,
  },
  userAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.tobacco,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  postTime: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  typeBadge: {
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  imagesContainer: {
    width: width,
  },
  postImage: {
    borderRadius: radius.sm,
    width: width,
    height: width,
    backgroundColor: colors.paper,
  },
  imageIndicator: {
    borderRadius: radius.sm,
    position: 'absolute',
    top: width - 40,
    right: 20,
    backgroundColor: 'rgba(28, 28, 28, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  imageCount: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.white,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.inkMuted,
  },
  actionLabelActive: {
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  actionCount: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkFaint,
  },
  postCaption: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  captionText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 21,
  },
  captionUser: {
    fontFamily: fonts.sansSemiBold,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 10,
  },
  hashtag: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.tobacco,
  },
  viewComments: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  viewCommentsText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
  },
  emptyState: {
    borderRadius: radius.md,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: colors.paper,
    padding: 20,
  },
  emptyText: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
  },
  emptySubtext: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    color: colors.inkMuted,
    marginTop: 8,
  },

  railSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 20,
  },
  railLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 10,
  },
  railNote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: colors.inkMuted,
    marginBottom: 16,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  suggestionAvatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.paper },
  suggestionAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionInitial: { fontFamily: fonts.serif, fontSize: 18, color: colors.tobacco },
  suggestionText: { flex: 1, marginLeft: 12 },
  suggestionName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  suggestionMeta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },

  discoverGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  discoverImage: {
    borderRadius: radius.sm,
    width: (width - 40 - 8) / 3,
    height: (width - 40 - 8) / 3,
    backgroundColor: colors.paper,
  },
});

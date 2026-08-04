import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import { socialFeedService, Post } from '../services/socialFeedService';
import { userProfileService, FollowSuggestion } from '../services/userProfileService';
import { exploreService } from '../services/exploreService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';
import { colors, fonts } from '../theme/designSystem';

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
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const feedPosts = await socialFeedService.getFeed(getCurrentUserId());
      
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

      // Suggestions are enrichment - they load after the feed and never block
      // it, and they stay empty rather than inventing anyone.
      const userId = getCurrentUserId();
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
      showToast('Failed to load feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
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
        showToast('Saved!', 'success');
      }
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  const handleShare = async (post: Post) => {
    try {
      await Share.share({ message: `${post.caption}\n${post.images[0]}` });
      await socialFeedService.sharePost(post.id);
      setPosts(prev =>prev.map(p => (p.id === post.id ? { ...p, shares: p.shares + 1 } : p)));
    } catch (error) {
      console.error('Error sharing post:', error);
    }
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
        style={styles.imagesContainer}
      >
        {post.images.map((image, index) => (
          <TouchableOpacity
            key={index}
            onPress={() =>navigation.navigate('PostDetail', { postId: post.id })}
          >
            <Image source={{ uri: image }} style={styles.postImage} />
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {post.images.length >1 && (
        <View style={styles.imageIndicator}>
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
              <TouchableOpacity key={index} onPress={() => {}}>
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
        <BackButton />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.ink} />
        }
      >
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>COMMUNITY</Text>
          <Text style={styles.title}>The feed</Text>
          <Text style={styles.subtitle}>Looks from the people you follow, newest first.</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Text style={styles.createButtonText}>Share a look</Text>
          </TouchableOpacity>
        </View>

        {posts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Your feed is quiet</Text>
            <Text style={styles.emptySubtext}>
              Posts from people you follow appear here. Follow a few to get it going.
            </Text>
          </View>
        )}

        {posts.map(renderPost)}

        {suggestions.length > 0 && (
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
                <Text style={styles.suggestionChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {discoverable.length > 0 && (
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
                    <Image source={{ uri: post.images[0] }} style={styles.discoverImage} />
                  ) : (
                    <View style={styles.discoverImage} />
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
    alignSelf: 'flex-start',
    marginTop: 20,
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  createButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.white,
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
    borderRadius: 22,
    backgroundColor: colors.paper,
  },
  userAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    width: width,
    height: width,
    backgroundColor: colors.paper,
  },
  imageIndicator: {
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
  suggestionAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper },
  suggestionAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  suggestionChevron: { fontSize: 20, color: colors.inkFaint },

  discoverGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  discoverImage: {
    width: (width - 40 - 8) / 3,
    height: (width - 40 - 8) / 3,
    backgroundColor: colors.paper,
  },
});

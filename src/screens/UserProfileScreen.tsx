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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from '../components/BackButton';
import { RootStackParamList } from '../navigation/types';
import { userProfileService, UserProfile } from '../services/userProfileService';
import { socialFeedService, Post } from '../services/socialFeedService';
import { messagingService } from '../services/messagingService';
import { getCurrentUserId } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - spacing.page * 2 - 8) / 3;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

export default function UserProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<UserProfileRouteProp>();
  const { userId } = route.params;
  const { user: authUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const { toast, showToast, hideToast } = useToast();

  const isOwnProfile = userId === getCurrentUserId();

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // If this is the signed-in user's own profile, seed it from their real
      // Firebase Auth identity the first time it's created rather than a fake persona.
      const realUserInfo =
        isOwnProfile && authUser
          ? { displayName: authUser.displayName, email: authUser.email, photoURL: authUser.photoURL }
          : undefined;

      const [profileData, postsData, followingStatus] = await Promise.all([
        userProfileService.getUserProfile(userId, realUserInfo),
        socialFeedService.getUserPosts(userId),
        userProfileService.isFollowing(getCurrentUserId(), userId),
      ]);

      setProfile(profileData);
      setPosts(postsData);
      setIsFollowing(followingStatus);
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await userProfileService.unfollowUser(getCurrentUserId(), userId);
        setIsFollowing(false);
      } else {
        await userProfileService.followUser(getCurrentUserId(), userId);
        setIsFollowing(true);
      }
      loadProfile();
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  const handleMessage = async () => {
    try {
      const conversation = await messagingService.getOrCreateConversation(
        getCurrentUserId(),
        userId
      );
      navigation.navigate('Chat', { conversationId: conversation.id });
    } catch (error) {
      console.error('Error starting conversation:', error);
      showToast('Failed to open conversation', 'error');
    }
  };

  const renderPost = (post: Post) => (
    <TouchableOpacity
      key={post.id}
      style={styles.gridItem}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
    >
      <Image source={{ uri: post.images[0] }} style={styles.gridImage} />
      {post.images.length > 1 && (
        <View style={styles.multipleIndicator}>
          <Text style={styles.multipleCount}>{post.images.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <BackButton />
        </View>
        <View style={styles.centred}>
          <Text style={styles.emptyTitle}>Profile not found</Text>
          <Text style={styles.emptyText}>This account may have been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>@{profile.username}</Text>
        <Text style={styles.title}>{profile.displayName}</Text>
        {!!profile.bio && <Text style={styles.subtitle}>{profile.bio}</Text>}

        <View style={styles.identityRow}>
          {profile.profileImageUrl ? (
            <Image source={{ uri: profile.profileImageUrl }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileInitial}>
                {profile.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.stats.posts}</Text>
              <Text style={styles.statLabel}>POSTS</Text>
            </View>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigation.navigate('Followers', { userId })}
            >
              <Text style={styles.statValue}>{profile.stats.followers}</Text>
              <Text style={styles.statLabel}>FOLLOWERS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigation.navigate('Following', { userId })}
            >
              <Text style={styles.statValue}>{profile.stats.following}</Text>
              <Text style={styles.statLabel}>FOLLOWING</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!!profile.location && <Text style={styles.location}>{profile.location}</Text>}

        {profile.styleTags.length > 0 && (
          <View style={styles.tagsContainer}>
            {profile.styleTags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionButtons}>
          {isOwnProfile ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Text style={styles.secondaryButtonText}>Edit profile</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={isFollowing ? styles.secondaryButton : styles.primaryButton}
                onPress={handleFollow}
              >
                <Text style={isFollowing ? styles.secondaryButtonText : styles.primaryButtonText}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleMessage}>
                <Text style={styles.secondaryButtonText}>Message</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
            onPress={() => setActiveTab('saved')}
          >
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
              Saved
            </Text>
          </TouchableOpacity>
        </View>

        {/* Saved posts are private to their owner, so the tab reads as
            deliberately empty for anyone else rather than looking broken. */}
        {activeTab === 'saved' && !isOwnProfile ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Saved posts are private</Text>
            <Text style={styles.emptyText}>Only {profile.displayName} can see this.</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              {isOwnProfile
                ? 'Share a look and it will appear here.'
                : 'Nothing published to this profile yet.'}
            </Text>
            {isOwnProfile && (
              <TouchableOpacity
                style={styles.primaryButtonInline}
                onPress={() => navigation.navigate('CreatePost')}
              >
                <Text style={styles.primaryButtonText}>Create first post</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.grid}>{posts.map(renderPost)}</View>
        )}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.page },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },

  identityRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  profileImage: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.paper },
  profileImagePlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: { fontFamily: fonts.serif, fontSize: 30, color: colors.tobacco },

  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: spacing.lg,
  },
  stat: { alignItems: 'center' },
  statValue: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  statLabel: { ...textType.microLabel, fontSize: 9, color: colors.inkFaint, marginTop: 4 },

  location: { ...textType.meta, marginTop: spacing.md },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  tag: {
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  tagText: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },

  actionButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  primaryButton: { flex: 1, backgroundColor: colors.ink, paddingVertical: 14, alignItems: 'center' },
  primaryButtonInline: {
    backgroundColor: colors.ink,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  primaryButtonText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.white },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  secondaryButtonText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
    marginTop: spacing.section,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 1, borderBottomColor: colors.ink },
  tabText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  tabTextActive: { fontFamily: fonts.sansMedium, color: colors.ink },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.md },
  gridItem: { width: GRID_SIZE, height: GRID_SIZE },
  gridImage: { width: '100%', height: '100%', backgroundColor: colors.paper },
  multipleIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(28, 28, 28, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  multipleCount: { fontFamily: fonts.sansMedium, fontSize: 10, color: colors.white },

  emptyBox: { backgroundColor: colors.paper, padding: spacing.lg, marginTop: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
});

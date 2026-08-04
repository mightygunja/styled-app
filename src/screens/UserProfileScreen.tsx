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
import { RootStackParamList } from '../navigation/types';
import { userProfileService, UserProfile } from '../services/userProfileService';
import { socialFeedService, Post } from '../services/socialFeedService';
import { messagingService } from '../services/messagingService';
import { getCurrentUserId } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 6) / 3;

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
      const realUserInfo = isOwnProfile && authUser
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
        showToast('Unfollowed', 'success');
      } else {
        await userProfileService.followUser(getCurrentUserId(), userId);
        setIsFollowing(true);
        showToast('Following!', 'success');
      }
      // Reload to update stats
      loadProfile();
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleMessage = async () => {
    try {
      const conversation = await messagingService.getOrCreateConversation(getCurrentUserId(), userId);
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
      onPress={() =>navigation.navigate('PostDetail', { postId: post.id })}
    >
      <Image source={{ uri: post.images[0] }} style={styles.gridImage} />
      {post.images.length >1 && (
        <View style={styles.multipleIndicator}>
                  </View>
      )}
    </TouchableOpacity>
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

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Profile not found</Text>
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
        <Text style={styles.username}>@{profile.username}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            {profile.profileImageUrl ? (
              <Image source={{ uri: profile.profileImageUrl }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileInitial}>{profile.displayName.charAt(0)}</Text>
              </View>
            )}
            
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.stats.posts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <TouchableOpacity
                style={styles.stat}
                onPress={() =>navigation.navigate('Followers', { userId })}
              >
                <Text style={styles.statValue}>{profile.stats.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stat}
                onPress={() =>navigation.navigate('Following', { userId })}
              >
                <Text style={styles.statValue}>{profile.stats.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{profile.displayName}</Text>
            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
            {profile.location && (
              <Text style={styles.location}> {profile.location}</Text>
            )}
            {profile.styleTags.length >0 && (
              <View style={styles.tagsContainer}>
                {profile.styleTags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.followButton, isFollowing && styles.followingButton]}
                  onPress={handleFollow}
                >
                  <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() =>setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
            onPress={() =>setActiveTab('saved')}
          >
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>Saved
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Grid */}
        <View style={styles.gridContainer}>
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>◎</Text>
              <Text style={styles.emptyText}>No posts yet</Text>
              {isOwnProfile && (
                <TouchableOpacity
                  style={styles.createPostButton}
                  onPress={() =>navigation.navigate('CreatePost')}
                >
                  <Text style={styles.createPostButtonText}>Create First Post</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.grid}>
              {posts.map(renderPost)}
            </View>
          )}
        </View>
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
  username: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  profileSection: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.paper,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 32,
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  statLabel: {
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  profileInfo: {
    marginBottom: 16,
  },
  displayName: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  tagText: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  followButton: {
    flex: 1,
    backgroundColor: colors.ink,
    padding: 12,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  followButtonText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
  },
  followingButtonText: {
    color: colors.ink,
  },
  messageButton: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  messageButtonText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  tabTextActive: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  gridContainer: {
    minHeight: 300,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.paper,
  },
  multipleIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 4,
  },
  multipleIcon: {
    fontSize: 12,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
    color: colors.ink,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 16,
  },
  createPostButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createPostButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
});

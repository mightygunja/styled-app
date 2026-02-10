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
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 6) / 3;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

export default function UserProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<UserProfileRouteProp>();
  const { userId } = route.params;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const { toast, showToast, hideToast } = useToast();

  const isOwnProfile = userId === 'current-user';

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profileData, postsData, followingStatus] = await Promise.all([
        userProfileService.getUserProfile(userId),
        socialFeedService.getUserPosts(userId),
        userProfileService.isFollowing('current-user', userId),
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
        await userProfileService.unfollowUser('current-user', userId);
        setIsFollowing(false);
        showToast('Unfollowed', 'success');
      } else {
        await userProfileService.followUser('current-user', userId);
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

  const renderPost = (post: Post) => (
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
    </TouchableOpacity>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
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
                onPress={() => navigation.navigate('Followers', { userId })}
              >
                <Text style={styles.statValue}>{profile.stats.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stat}
                onPress={() => navigation.navigate('Following', { userId })}
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
              <Text style={styles.location}>📍 {profile.location}</Text>
            )}
            {profile.styleTags.length > 0 && (
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
                <TouchableOpacity style={styles.messageButton}>
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
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
              📸 Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
            onPress={() => setActiveTab('saved')}
          >
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
              🔖 Saved
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
                  onPress={() => navigation.navigate('CreatePost')}
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
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
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
    backgroundColor: '#f1f5f9',
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 32,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  profileInfo: {
    marginBottom: 16,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tagText: {
    fontSize: 12,
    color: '#64748b',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  followButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  followingButtonText: {
    color: '#0f172a',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
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
    borderBottomColor: '#ef4444',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ef4444',
    fontWeight: '600',
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
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
    color: '#2B1F1A',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  createPostButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createPostButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

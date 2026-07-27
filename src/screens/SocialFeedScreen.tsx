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
import { socialFeedService, Post } from '../services/socialFeedService';
import { userProfileService } from '../services/userProfileService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SocialFeedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
          return { ...post, user };
        })
      );
      
      setPosts(postsWithUsers);
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
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      if (post.isLiked) {
        await socialFeedService.unlikePost(postId, getCurrentUserId());
        setPosts(posts.map(p => 
          p.id === postId ? { ...p, isLiked: false, likes: p.likes - 1 } : p
        ));
      } else {
        await socialFeedService.likePost(postId, getCurrentUserId());
        setPosts(posts.map(p => 
          p.id === postId ? { ...p, isLiked: true, likes: p.likes + 1 } : p
        ));
      }
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  const handleSave = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    try {
      if (post.isSaved) {
        await socialFeedService.unsavePost(postId, getCurrentUserId());
        setPosts(posts.map(p => 
          p.id === postId ? { ...p, isSaved: false, saves: p.saves - 1 } : p
        ));
        showToast('Removed from saved', 'success');
      } else {
        await socialFeedService.savePost(postId, getCurrentUserId());
        setPosts(posts.map(p => 
          p.id === postId ? { ...p, isSaved: true, saves: p.saves + 1 } : p
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
      setPosts(prev => prev.map(p => (p.id === post.id ? { ...p, shares: p.shares + 1 } : p)));
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const renderPost = (post: Post) => (
    <View key={post.id} style={styles.postCard}>
      {/* Post Header */}
      <TouchableOpacity
        style={styles.postHeader}
        onPress={() => navigation.navigate('UserProfile', { userId: post.userId })}
      >
        {post.user?.profileImageUrl ? (
          <Image source={{ uri: post.user.profileImageUrl }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatarPlaceholder}>
            <Text style={styles.userInitial}>
              {post.user?.displayName.charAt(0) || 'U'}
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
            <Text style={styles.typeBadgeText}>✨ Transformation</Text>
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
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
          >
            <Image source={{ uri: image }} style={styles.postImage} />
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {post.images.length > 1 && (
        <View style={styles.imageIndicator}>
          <Text style={styles.imageCount}>1/{post.images.length}</Text>
        </View>
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(post.id)}
        >
          <Text style={styles.actionIcon}>{post.isLiked ? '❤️' : '🤍'}</Text>
          <Text style={styles.actionText}>{post.likes}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>{post.comments}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(post)}>
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>{post.shares}</Text>
        </TouchableOpacity>
        
        <View style={{ flex: 1 }} />
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleSave(post.id)}
        >
          <Text style={styles.actionIcon}>{post.isSaved ? '🔖' : '📑'}</Text>
        </TouchableOpacity>
      </View>

      {/* Post Caption */}
      <View style={styles.postCaption}>
        <Text style={styles.captionText}>
          <Text style={styles.captionUser}>{post.user?.displayName} </Text>
          {post.caption}
        </Text>
        {post.hashtags.length > 0 && (
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
      {post.comments > 0 && (
        <TouchableOpacity
          style={styles.viewComments}
          onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
        >
          <Text style={styles.viewCommentsText}>
            View all {post.comments} comments
          </Text>
        </TouchableOpacity>
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
        <Text style={styles.title}>Feed</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
          <Text style={styles.createButton}>+ New Post</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Follow users to see their posts</Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation.navigate('Explore')}
            >
              <Text style={styles.exploreButtonText}>Explore</Text>
            </TouchableOpacity>
          </View>
        ) : (
          posts.map(renderPost)
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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  createButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  postCard: {
    marginBottom: 20,
    borderBottomWidth: 8,
    borderBottomColor: '#f8fafc',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  postTime: {
    fontSize: 12,
    color: '#64748b',
  },
  typeBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },
  imagesContainer: {
    width: width,
  },
  postImage: {
    width: width,
    height: width,
    backgroundColor: '#f1f5f9',
  },
  imageIndicator: {
    position: 'absolute',
    top: width - 40,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  postCaption: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  captionText: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  captionUser: {
    fontWeight: '600',
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  hashtag: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  viewComments: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  viewCommentsText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

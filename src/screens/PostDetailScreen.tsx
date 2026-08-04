import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { socialFeedService, Post, Comment } from '../services/socialFeedService';
import { userProfileService } from '../services/userProfileService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';
import { colors, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PostDetailRouteProp = RouteProp<RootStackParamList, 'PostDetail'>;

export default function PostDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PostDetailRouteProp>();
  const { postId } = route.params;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const commentInputRef = useRef<TextInput>(null);

  const handleShare = async () => {
    if (!post) return;
    try {
      await Share.share({ message: `${post.caption}\n${post.images[0]}` });
      await socialFeedService.sharePost(post.id);
      setPost(prev => (prev ? { ...prev, shares: prev.shares + 1 } : prev));
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const [feedPosts, postComments] = await Promise.all([
        socialFeedService.getFeed(getCurrentUserId()),
        socialFeedService.getPostComments(postId),
      ]);

      const foundPost = feedPosts.find(p =>p.id === postId);
      if (foundPost) {
        const user = await userProfileService.getUserProfile(foundPost.userId);
        setPost({ ...foundPost, user: user || undefined });
      }

      // Load user data for comments
      const commentsWithUsers = await Promise.all(
        postComments.map(async (comment) => {
          const user = await userProfileService.getUserProfile(comment.userId);
          return { ...comment, user: user || undefined };
        })
      );

      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error loading post:', error);
      showToast('Failed to load post', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;

    try {
      if (post.isLiked) {
        await socialFeedService.unlikePost(postId, getCurrentUserId());
        setPost({ ...post, isLiked: false, likes: post.likes - 1 });
      } else {
        await socialFeedService.likePost(postId, getCurrentUserId());
        setPost({ ...post, isLiked: true, likes: post.likes + 1 });
      }
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  const handleSave = async () => {
    if (!post) return;

    try {
      if (post.isSaved) {
        await socialFeedService.unsavePost(postId, getCurrentUserId());
        setPost({ ...post, isSaved: false, saves: post.saves - 1 });
        showToast('Removed from saved', 'success');
      } else {
        await socialFeedService.savePost(postId, getCurrentUserId());
        setPost({ ...post, isSaved: true, saves: post.saves + 1 });
        showToast('Saved!', 'success');
      }
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      setPosting(true);
      const newComment = await socialFeedService.addComment(
        postId,
        getCurrentUserId(),
        commentText,
        replyingTo?.id
      );

      const user = await userProfileService.getUserProfile(getCurrentUserId());
      const commentWithUser = { ...newComment, user: user || undefined };

      if (replyingTo) {
        // Add to replies
        setComments(comments.map(c =>c.id === replyingTo.id 
            ? { ...c, replies: [...(c.replies || []), commentWithUser] }
            : c
        ));
      } else {
        // Add as top-level comment
        setComments([commentWithUser, ...comments]);
      }

      if (post) {
        setPost({ ...post, comments: post.comments + 1 });
      }

      setCommentText('');
      setReplyingTo(null);
      showToast('Comment added!', 'success');
    } catch (error) {
      showToast('Failed to add comment', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await socialFeedService.deleteComment(commentId, getCurrentUserId());
      setComments(comments.filter(c =>c.id !== commentId));
      
      if (post) {
        setPost({ ...post, comments: post.comments - 1 });
      }
      
      showToast('Comment deleted', 'success');
    } catch (error) {
      showToast('Failed to delete comment', 'error');
    }
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <View key={comment.id} style={[styles.commentCard, isReply && styles.replyCard]}>
      <TouchableOpacity
        onPress={() =>navigation.navigate('UserProfile', { userId: comment.userId })}
      >
        {comment.user?.profileImageUrl ? (
          <Image source={{ uri: comment.user.profileImageUrl }} style={styles.commentAvatar} />
        ) : (
          <View style={styles.commentAvatarPlaceholder}>
            <Text style={styles.commentInitial}>
              {comment.user?.displayName.charAt(0) || 'U'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUser}>{comment.user?.displayName || 'User'}</Text>
          <Text style={styles.commentTime}>
            {new Date(comment.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
        
        <View style={styles.commentActions}>
          <TouchableOpacity onPress={() =>setReplyingTo(comment)}>
            <Text style={styles.commentAction}>Reply</Text>
          </TouchableOpacity>
          {comment.userId === getCurrentUserId() && (
            <TouchableOpacity onPress={() =>handleDeleteComment(comment.id)}>
              <Text style={[styles.commentAction, styles.deleteAction]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Replies */}
        {comment.replies && comment.replies.length >0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map(reply =>renderComment(reply, true))}
          </View>
        )}
      </View>
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

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() =>navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Post</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView>
          {/* Post */}
          <View style={styles.postSection}>
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
            </TouchableOpacity>

            {/* Post Images */}
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imagesContainer}
            >
              {post.images.map((image, index) => (
                <Image key={index} source={{ uri: image }} style={styles.postImage} />
              ))}
            </ScrollView>

            {/* Post Actions */}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Text style={styles.actionIcon}>{post.isLiked ? '●' : '○'}</Text>
                <Text style={styles.actionText}>{post.likes}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() =>commentInputRef.current?.focus()}>
                                <Text style={styles.actionText}>{post.comments}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                                <Text style={styles.actionText}>{post.shares}</Text>
              </TouchableOpacity>
              
              <View style={{ flex: 1 }} />
              
              <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
                <Text style={styles.actionIcon}>{post.isSaved ? '●' : '○'}</Text>
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
                    <Text key={index} style={styles.hashtag}>#{tag} </Text>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments ({comments.length})
            </Text>
            
            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyEmoji}>◎</Text>
                <Text style={styles.emptyText}>No comments yet</Text>
                <Text style={styles.emptySubtext}>Be the first to comment!</Text>
              </View>
            ) : (
              comments.map(comment =>renderComment(comment))
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          {replyingTo && (
            <View style={styles.replyingToBar}>
              <Text style={styles.replyingToText}>Replying to {replyingTo.user?.displayName}
              </Text>
              <TouchableOpacity onPress={() =>setReplyingTo(null)}>
                <Text style={styles.cancelReply}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.commentInputRow}>
            <TextInput
              ref={commentInputRef}
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
              onPress={handleAddComment}
              disabled={!commentText.trim() || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

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
  title: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  postSection: {
    borderBottomWidth: 8,
    borderBottomColor: colors.paper,
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
    backgroundColor: colors.paper,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  postTime: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  imagesContainer: {
    width: width,
  },
  postImage: {
    width: width,
    height: width,
    backgroundColor: colors.paper,
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
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  postCaption: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  captionText: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  captionUser: {
    fontFamily: fonts.sansSemiBold,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  hashtag: {
    fontSize: 14,
    color: colors.tobacco,
    fontFamily: fonts.sansMedium,
  },
  commentsSection: {
    padding: 20,
  },
  commentsTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 16,
  },
  commentCard: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  replyCard: {
    marginLeft: 20,
    marginTop: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.paper,
  },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInitial: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  commentTime: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  commentText: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  commentAction: {
    fontSize: 13,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  deleteAction: {
    color: colors.ink,
  },
  repliesContainer: {
    marginTop: 8,
  },
  emptyComments: {
    padding: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
    color: colors.ink,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  commentInputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    backgroundColor: '#ffffff',
  },
  replyingToBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.paper,
  },
  replyingToText: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  cancelReply: {
    fontSize: 16,
    color: colors.inkMuted,
    fontFamily: fonts.sansSemiBold,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.hair,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
});

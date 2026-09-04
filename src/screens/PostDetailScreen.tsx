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
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

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
      // Fetch the post by id directly - searching the newest feed page for
      // it made every older post's detail view a "Post not found" dead end.
      const [foundPost, postComments] = await Promise.all([
        socialFeedService.getPostById(postId),
        socialFeedService.getPostComments(postId),
      ]);

      if (foundPost) {
        const user = await userProfileService.getUserProfile(foundPost.userId);
        setPost({ ...foundPost, user: user || undefined });
      }

      const commentsWithUsers = await Promise.all(
        postComments.map(async comment => {
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
        showToast('Saved', 'success');
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
        setComments(
          comments.map(c =>
            c.id === replyingTo.id ? { ...c, replies: [...(c.replies || []), commentWithUser] } : c
          )
        );
      } else {
        setComments([commentWithUser, ...comments]);
      }

      if (post) setPost({ ...post, comments: post.comments + 1 });

      setCommentText('');
      setReplyingTo(null);
    } catch (error) {
      showToast('Failed to add comment', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await socialFeedService.deleteComment(commentId, getCurrentUserId());
      setComments(comments.filter(c => c.id !== commentId));
      if (post) setPost({ ...post, comments: post.comments - 1 });
      showToast('Comment deleted', 'success');
    } catch (error) {
      showToast('Failed to delete comment', 'error');
    }
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <View key={comment.id} style={[styles.commentRow, isReply && styles.replyRow]}>
      <TouchableOpacity
        onPress={() => navigation.navigate('UserProfile', { userId: comment.userId })}
      >
        {comment.user?.profileImageUrl ? (
          <Image source={{ uri: comment.user.profileImageUrl }} style={styles.commentAvatar} />
        ) : (
          <View style={styles.commentAvatarPlaceholder}>
            <Text style={styles.commentInitial}>
              {comment.user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
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
          <TouchableOpacity onPress={() => setReplyingTo(comment)}>
            <Text style={styles.commentAction}>Reply</Text>
          </TouchableOpacity>
          {comment.userId === getCurrentUserId() && (
            <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
              <Text style={styles.commentAction}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map(reply => renderComment(reply, true))}
          </View>
        )}
      </View>
    </View>
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

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <BackButton />
        </View>
        <View style={styles.centred}>
          <Text style={styles.emptyTitle}>Post not found</Text>
          <Text style={styles.emptyText}>It may have been removed or made private.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>POST</Text>
            <TouchableOpacity
              style={styles.postHeader}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('UserProfile', { userId: post.userId })}
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
                  {new Date(post.createdAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

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

          <View style={styles.body}>
            {!!post.caption && (
              <Text style={styles.captionText}>
                <Text style={styles.captionUser}>{post.user?.displayName} </Text>
                {post.caption}
              </Text>
            )}

            {post.hashtags.length > 0 && (
              <View style={styles.hashtagsContainer}>
                {post.hashtags.map((tag, index) => (
                  <Text key={index} style={styles.hashtag}>
                    #{tag}
                  </Text>
                ))}
              </View>
            )}

            {/* Every control carries a word. The icon-only version left two of
                these rendering as a bare number with nothing to tap-label it. */}
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Text style={[styles.actionLabel, post.isLiked && styles.actionLabelActive]}>
                  {post.isLiked ? 'Liked' : 'Like'}
                </Text>
                <Text style={styles.actionCount}>{post.likes}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => commentInputRef.current?.focus()}
              >
                <Text style={styles.actionLabel}>Comment</Text>
                <Text style={styles.actionCount}>{post.comments}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Text style={styles.actionLabel}>Share</Text>
                <Text style={styles.actionCount}>{post.shares}</Text>
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
                <Text style={[styles.actionLabel, post.isSaved && styles.actionLabelActive]}>
                  {post.isSaved ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.commentsSection}>
            <Text style={styles.sectionLabel}>
              {comments.length === 0
                ? 'COMMENTS'
                : `COMMENTS · ${comments.length}`}
            </Text>

            {comments.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No comments yet</Text>
                <Text style={styles.emptyText}>Be the first to say something.</Text>
              </View>
            ) : (
              comments.map(comment => renderComment(comment))
            )}
          </View>
        </ScrollView>

        <View style={styles.commentInputContainer}>
          {replyingTo && (
            <View style={styles.replyingToBar}>
              <Text style={styles.replyingToText}>
                Replying to {replyingTo.user?.displayName}
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Text style={styles.cancelReply}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.commentInputRow}>
            <TextInput
              ref={commentInputRef}
              style={styles.commentInput}
              placeholder="Add a comment…"
              placeholderTextColor={colors.inkFaint}
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
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.sendButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.page },

  intro: { paddingHorizontal: spacing.page },
  eyebrow: { ...textType.eyebrow, marginBottom: spacing.md },

  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  userAvatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.paper },
  userAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: { fontFamily: fonts.serif, fontSize: 18, color: colors.tobacco },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  postTime: { ...textType.meta, fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 20, color: colors.inkFaint },

  imagesContainer: { width },
  postImage: {
    borderRadius: radius.sm, width, height: width, backgroundColor: colors.paper },

  body: { paddingHorizontal: spacing.page, paddingTop: spacing.md },
  captionText: { ...textType.body, color: colors.ink },
  captionUser: { fontFamily: fonts.sansMedium },
  hashtagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs, gap: 10 },
  hashtag: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.tobacco },

  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLabel: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkMuted },
  actionLabelActive: { color: colors.ink, fontFamily: fonts.sansSemiBold },
  actionCount: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkFaint },

  commentsSection: { padding: spacing.page, paddingBottom: 40 },
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: spacing.md },

  emptyBox: {
    borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },

  commentRow: {
    flexDirection: 'row',
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  replyRow: { marginLeft: spacing.lg, borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 },
  commentAvatar: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.paper },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInitial: { fontFamily: fonts.serif, fontSize: 15, color: colors.tobacco },
  commentContent: { flex: 1, marginLeft: 12 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentUser: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  commentTime: { ...textType.meta, fontSize: 12 },
  commentText: { ...textType.body, fontSize: 14, color: colors.inkMuted, marginBottom: 8 },
  commentActions: { flexDirection: 'row', gap: spacing.md },
  commentAction: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.tobacco },
  repliesContainer: { marginTop: spacing.sm },

  commentInputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    backgroundColor: colors.bone,
  },
  replyingToBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.xs,
    backgroundColor: colors.paper,
  },
  replyingToText: { ...textType.meta, fontSize: 12 },
  cancelReply: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.tobacco },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    paddingHorizontal: spacing.page,
    gap: spacing.sm,
  },
  commentInput: {
    borderRadius: radius.md,
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    minWidth: 72,
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: colors.hair },
  sendButtonText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.white },
});

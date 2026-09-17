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
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Images are sized to the measured content column, not the browser window:
  // on desktop web this screen sits in a 720px frame, so window-width images
  // overflowed it and broke paging. On a phone the two widths are the same.
  const [columnWidth, setColumnWidth] = useState(
    Platform.OS === 'web' ? Math.min(width, 720) : width
  );

  // Shares the post's own link. Where the share sheet is unavailable (most
  // desktop browsers) the link is copied instead, and the share is counted
  // only when one of the two actually happened.
  const handleShare = async () => {
    if (!post) return;
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
      setPost(prev => (prev ? { ...prev, shares: prev.shares + 1 } : prev));
    } catch (error) {
      console.error('Error recording share:', error);
    }
  };

  useEffect(() => {
    loadPost();
  }, [postId]);

  // Comments with their authors attached - replies included, which used to
  // render as "User" with no avatar because only top-level rows were enriched.
  const fetchComments = async (): Promise<Comment[]> => {
    const postComments = await socialFeedService.getPostComments(postId);
    const withUser = async (comment: Comment): Promise<Comment> => {
      const user = await userProfileService.getUserProfile(comment.userId);
      return { ...comment, user: user || undefined };
    };
    return Promise.all(
      postComments.map(async comment => ({
        ...(await withUser(comment)),
        replies: await Promise.all((comment.replies || []).map(withUser)),
      }))
    );
  };

  const loadPost = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const currentUserId = getCurrentUserId();
      // Fetch the post by id directly - searching the newest feed page for
      // it made every older post's detail view a "Post not found" dead end.
      // getPostById carries no liked/saved state, so it is loaded alongside:
      // without it an already-liked post opened as "Like" and the first tap
      // added a like that didn't exist.
      const [foundPost, commentsWithUsers, isLiked, isSaved] = await Promise.all([
        socialFeedService.getPostById(postId),
        fetchComments(),
        socialFeedService.isPostLiked(postId, currentUserId),
        socialFeedService.isPostSaved(postId, currentUserId),
      ]);

      if (foundPost) {
        const user = await userProfileService.getUserProfile(foundPost.userId);
        setPost({ ...foundPost, isLiked, isSaved, user: user || undefined });
      }

      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error loading post:', error);
      setLoadError(true);
      showToast('Failed to load post', 'error');
    } finally {
      setLoading(false);
    }
  };

  // The count only moves when the service says something changed; a false
  // return means the like/save was already in that state.
  const handleLike = async () => {
    if (!post) return;
    try {
      if (post.isLiked) {
        const changed = await socialFeedService.unlikePost(postId, getCurrentUserId());
        setPost({ ...post, isLiked: false, likes: changed ? Math.max(0, post.likes - 1) : post.likes });
      } else {
        const changed = await socialFeedService.likePost(postId, getCurrentUserId());
        setPost({ ...post, isLiked: true, likes: changed ? post.likes + 1 : post.likes });
      }
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  const handleSave = async () => {
    if (!post) return;
    try {
      if (post.isSaved) {
        const changed = await socialFeedService.unsavePost(postId, getCurrentUserId());
        setPost({ ...post, isSaved: false, saves: changed ? Math.max(0, post.saves - 1) : post.saves });
        showToast('Removed from saved', 'success');
      } else {
        const changed = await socialFeedService.savePost(postId, getCurrentUserId());
        setPost({ ...post, isSaved: true, saves: changed ? post.saves + 1 : post.saves });
        showToast('Saved', 'success');
      }
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  const leaveScreen = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('SocialFeed');
  };

  const deletePost = async () => {
    if (!post) return;
    try {
      setDeleting(true);
      const removed = await socialFeedService.deletePost(post.id, getCurrentUserId());
      if (!removed) {
        showToast("Couldn't delete this post", 'error');
        return;
      }
      leaveScreen();
    } catch (error) {
      // The service removes the post first and then tidies up its likes and
      // comments; that tidy-up can be refused for rows other people own. If
      // the post itself is gone, the delete worked.
      const stillThere = await socialFeedService.getPostById(post.id).catch(() => post);
      if (!stillThere) {
        leaveScreen();
      } else {
        console.error('Error deleting post:', error);
        showToast("Couldn't delete this post", 'error');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePost = () => {
    Alert.alert('Delete this post?', 'It will be removed from the feed and your profile.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete post', style: 'destructive', onPress: deletePost },
    ]);
  };

  // There is no in-app reports queue yet, so a report is an email to support
  // with the post id filled in - a real route to a person, not a fake form.
  const handleReportPost = () => {
    if (!post) return;
    const subject = encodeURIComponent(`Report post ${post.id}`);
    const body = encodeURIComponent(
      `Post id: ${post.id}\nLink: https://www.thirtythreetrends.com/post/${post.id}\n\nWhat is wrong with this post?\n`
    );
    Linking.openURL(`mailto:support@thirtythreetrends.com?subject=${subject}&body=${body}`).catch(() => {
      showToast('Email support@thirtythreetrends.com to report this post', 'error');
    });
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      setPosting(true);
      // Threads are one level deep: a reply to a reply attaches to the same
      // top-level comment. Using the reply's own id as the parent wrote a
      // comment that no screen could ever render.
      const parentId = replyingTo ? replyingTo.parentCommentId || replyingTo.id : undefined;
      const newComment = await socialFeedService.addComment(
        postId,
        getCurrentUserId(),
        commentText,
        parentId
      );

      const user = await userProfileService.getUserProfile(getCurrentUserId());
      const commentWithUser = { ...newComment, user: user || undefined };

      if (replyingTo) {
        setComments(
          comments.map(c =>
            c.id === parentId ? { ...c, replies: [...(c.replies || []), commentWithUser] } : c
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

  // Replies live inside their parent's `replies`, so both levels are pruned.
  const removeCommentLocally = (commentId: string) => {
    setComments(prev =>
      prev
        .filter(c => c.id !== commentId)
        .map(c =>
          c.replies && c.replies.some(r => r.id === commentId)
            ? { ...c, replies: c.replies.filter(r => r.id !== commentId) }
            : c
        )
    );
    setPost(prev => (prev ? { ...prev, comments: Math.max(0, prev.comments - 1) } : prev));
    setReplyingTo(prev =>
      prev && (prev.id === commentId || prev.parentCommentId === commentId) ? null : prev
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const removed = await socialFeedService.deleteComment(commentId, getCurrentUserId());
      if (!removed) {
        showToast('Failed to delete comment', 'error');
        return;
      }
      removeCommentLocally(commentId);
      showToast('Comment deleted', 'success');
    } catch (error) {
      // The service deletes the comment before tidying up its replies, and
      // that tidy-up can be refused for replies other people wrote. Check
      // what is really left rather than reporting a failure that didn't happen.
      try {
        const fresh = await fetchComments();
        const stillThere = fresh.some(
          c => c.id === commentId || (c.replies || []).some(r => r.id === commentId)
        );
        if (stillThere) {
          showToast('Failed to delete comment', 'error');
        } else {
          removeCommentLocally(commentId);
          showToast('Comment deleted', 'success');
        }
      } catch {
        showToast('Failed to delete comment', 'error');
      }
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
        {loadError ? (
          <TouchableOpacity style={styles.centred} activeOpacity={0.85} onPress={loadPost}>
            <Text style={styles.emptyTitle}>Couldn't load this post</Text>
            <Text style={styles.emptyText}>Tap to retry.</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.centred}>
            <Text style={styles.emptyTitle}>Post not found</Text>
            <Text style={styles.emptyText}>It may have been removed or made private.</Text>
          </View>
        )}
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
        <ScrollView
          keyboardShouldPersistTaps="handled"
          onLayout={event => {
            const measured = event.nativeEvent.layout.width;
            if (measured > 0 && Math.abs(measured - columnWidth) > 1) setColumnWidth(measured);
          }}
        >
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
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={[styles.imagesContainer, { width: columnWidth }]}
          >
            {post.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={[styles.postImage, { width: columnWidth, height: columnWidth }]}
              />
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

            {/* The author can take their post down; everyone else can report it. */}
            <View style={styles.postManageRow}>
              {post.userId === getCurrentUserId() ? (
                <TouchableOpacity onPress={handleDeletePost} disabled={deleting}>
                  <Text style={styles.postManageText}>
                    {deleting ? 'Deleting…' : 'Delete post'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleReportPost}>
                  <Text style={styles.postManageText}>Report post</Text>
                </TouchableOpacity>
              )}
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
  postManageRow: { flexDirection: 'row', marginTop: spacing.md },
  postManageText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.tobacco },

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
    backgroundColor: colors.rust,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    minWidth: 72,
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.white },
});

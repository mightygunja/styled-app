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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { notificationService, Notification } from '../services/notificationService';
import { userProfileService } from '../services/userProfileService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notifs, unread] = await Promise.all([
        notificationService.getNotifications(getCurrentUserId()),
        notificationService.getUnreadCount(getCurrentUserId()),
      ]);

      // Load actor profiles
      const notifsWithActors = await Promise.all(
        notifs.map(async (notif) => {
          // System notifications come from the backend with no acting user.
          const actor = notif.actorId
            ? await userProfileService.getUserProfile(notif.actorId)
            : null;
          return { ...notif, actor: actor || undefined };
        })
      );

      setNotifications(notifsWithActors);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await notificationService.markAsRead(notification.id, getCurrentUserId());
      setNotifications(notifications.map(n =>n.id === notification.id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(unreadCount - 1);
    }

    // Navigate based on type
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'post_share':
        if (notification.targetId) {
          navigation.navigate('PostDetail', { postId: notification.targetId });
        }
        break;
      case 'follow':
        if (notification.actorId) {
          navigation.navigate('UserProfile', { userId: notification.actorId });
        }
        break;
      case 'message':
        if (notification.targetId) {
          navigation.navigate('Chat', { conversationId: notification.targetId });
        }
        break;
      case 'stylist_booking':
      case 'session_reminder':
        navigation.navigate('MySessions');
        break;
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(getCurrentUserId());
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      showToast('All marked as read', 'success');
    } catch (error) {
      showToast('Failed to mark as read', 'error');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId, getCurrentUserId());
      const deletedNotif = notifications.find(n =>n.id === notificationId);
      setNotifications(notifications.filter(n =>n.id !== notificationId));
      
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(unreadCount - 1);
      }
      
      showToast('Notification deleted', 'success');
    } catch (error) {
      showToast('Failed to delete', 'error');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // The type is named in words rather than glyphs. The icon map this replaces
  // returned an empty string for eight of its ten cases, so most notifications
  // rendered an invisible element where a badge was meant to be.
  const notificationKind = (type: string) => {
    switch (type) {
      case 'like':
        return 'LIKE';
      case 'comment':
        return 'COMMENT';
      case 'follow':
        return 'FOLLOW';
      case 'mention':
        return 'MENTION';
      case 'message':
        return 'MESSAGE';
      case 'post_share':
        return 'SHARE';
      case 'stylist_booking':
        return 'BOOKING';
      case 'session_reminder':
        return 'REMINDER';
      case 'challenge_invite':
        return 'CHALLENGE';
      case 'group_invite':
        return 'GROUP';
      case 'system':
        return 'ACCOUNT';
      default:
        return null;
    }
  };

  const renderNotification = (notification: Notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[styles.notificationCard, !notification.isRead && styles.unreadCard]}
      onPress={() =>handleNotificationPress(notification)}
    >
      <View style={styles.notificationContent}>
        {notification.imageUrl ? (
          <Image source={{ uri: notification.imageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {notification.actor?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}

        <View style={styles.notificationText}>
          {!!notificationKind(notification.type) && (
            <Text style={styles.kindBadge}>{notificationKind(notification.type)}</Text>
          )}
          <View style={styles.notificationHeader}>
            <Text style={styles.title}>{notification.title}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={styles.time}>{formatTime(notification.createdAt)}</Text>
        </View>

        {!notification.isRead && <View style={styles.unreadDot} />}
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          handleDelete(notification.id);
        }}
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
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
          <Text style={styles.eyebrow}>ACTIVITY</Text>
          <Text style={styles.screenTitle}>Notifications</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0
              ? `${unreadCount} unread`
              : 'Everything that has happened on your account.'}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
              <Text style={styles.markAllButtonText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nothing yet</Text>
            <Text style={styles.emptySubtext}>
              Likes, comments, follows and booking updates land here.
            </Text>
          </View>
        ) : (
          notifications.map(renderNotification)
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
  screenTitle: {
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
  markAllButton: {
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  markAllButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.ink,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
    gap: 12,
  },
  unreadCard: {
    backgroundColor: colors.sand,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.paper,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.serif,
    fontSize: 19,
    color: colors.tobacco,
  },
  notificationText: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  kindBadge: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: colors.tobacco,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.ink,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkFaint,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ink,
  },
  deleteButton: {
    padding: 8,
  },
  deleteIcon: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.inkFaint,
  },
  emptyState: {
    borderRadius: radius.md,
    marginHorizontal: 20,
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
});

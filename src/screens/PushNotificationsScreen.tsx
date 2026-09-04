import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  pushNotificationsService,
  NotificationSettings,
  PushNotification,
  NotificationSchedule,
  NotificationAnalytics,
} from '../services/pushNotificationsService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PushNotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [history, setHistory] = useState<PushNotification[]>([]);
  const [schedules, setSchedules] = useState<NotificationSchedule[]>([]);
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null);
  const [selectedTab, setSelectedTab] = useState<'history' | 'scheduled' | 'settings'>('history');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, historyData, schedulesData, analyticsData] = await Promise.all([
        pushNotificationsService.getNotificationSettings(getCurrentUserId()),
        pushNotificationsService.getNotificationHistory(getCurrentUserId()),
        pushNotificationsService.getScheduledNotifications(getCurrentUserId()),
        pushNotificationsService.getNotificationAnalytics(getCurrentUserId()),
      ]);

      setSettings(settingsData);
      setHistory(historyData);
      setSchedules(schedulesData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading notifications:', error);
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!settings) return;

    try {
      const updated = await pushNotificationsService.updateNotificationSettings(getCurrentUserId(), updates);
      setSettings(updated);
      showToast('Settings updated!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  const handleToggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      await pushNotificationsService.updateScheduledNotification(scheduleId, { enabled });
      showToast(enabled ? 'Schedule enabled!' : 'Schedule disabled!', 'success');
      await loadData();
    } catch (error) {
      console.error('Error toggling schedule:', error);
      showToast('Failed to toggle schedule', 'error');
    }
  };

  const handleSendTest = async () => {
    try {
      showToast('Sending test notification...', 'info');
      await pushNotificationsService.sendTestNotification(getCurrentUserId());
      showToast('Test notification sent!', 'success');
    } catch (error) {
      console.error('Error sending test:', error);
      showToast('Failed to send test', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await pushNotificationsService.markAllAsRead(getCurrentUserId());
      showToast('All marked as read!', 'success');
      await loadData();
    } catch (error) {
      console.error('Error marking as read:', error);
      showToast('Failed to mark as read', 'error');
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'outfits': return '👗';
      case 'wardrobe': return '👔';
      case 'social': return '❤️';
      case 'promotions': return '🎁';
      case 'reminders': return '⏰';
      case 'updates': return '🔔';
      default: return '📬';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'outfits': return colors.ink;
      case 'wardrobe': return colors.tobacco;
      case 'social': return colors.tobacco;
      case 'promotions': return colors.camel;
      case 'reminders': return colors.tobacco;
      case 'updates': return colors.ink;
      default: return colors.inkMuted;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'read': return colors.tobacco;
      case 'delivered': return colors.tobacco;
      case 'sent': return colors.ink;
      case 'failed': return colors.tobacco;
      default: return colors.inkMuted;
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (loading && !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tobacco} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!settings) return null;

  const unreadCount = history.filter(n => n.status === 'delivered').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleSendTest}>
          <Text style={styles.testButton}>Test</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: settings.enabled ? colors.sand : colors.sand }]}>
        <Text style={styles.infoBannerIcon}>{settings.enabled ? '🔔' : '🔕'}</Text>
        <View style={styles.infoBannerContent}>
          <Text style={[styles.infoBannerTitle, { color: settings.enabled ? colors.tobacco : colors.tobacco }]}>
            {settings.enabled ? 'Notifications Enabled' : 'Notifications Disabled'}
          </Text>
          <Text style={[styles.infoBannerText, { color: settings.enabled ? colors.tobacco : colors.tobacco }]}>
            {settings.enabled 
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'Enable to receive notifications'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      {analytics && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.totalSent}</Text>
            <Text style={styles.statLabel}>Sent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.deliveryRate.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.readRate.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Read</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'history' && styles.tabActive]}
          onPress={() => setSelectedTab('history')}
        >
          <Text style={[styles.tabText, selectedTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'scheduled' && styles.tabActive]}
          onPress={() => setSelectedTab('scheduled')}
        >
          <Text style={[styles.tabText, selectedTab === 'scheduled' && styles.tabTextActive]}>
            Scheduled
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'settings' && styles.tabActive]}
          onPress={() => setSelectedTab('settings')}
        >
          <Text style={[styles.tabText, selectedTab === 'settings' && styles.tabTextActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* History Tab */}
        {selectedTab === 'history' && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Notifications ({history.length})</Text>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={handleMarkAllRead}>
                    <Text style={styles.markAllButton}>Mark all read</Text>
                  </TouchableOpacity>
                )}
              </View>

              {history.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>📭</Text>
                  <Text style={styles.emptyText}>No notifications yet</Text>
                  <Text style={styles.emptySubtext}>
                    You'll see your notifications here
                  </Text>
                </View>
              ) : (
                history.map((notification) => (
                  <View
                    key={notification.id}
                    style={[
                      styles.notificationCard,
                      notification.status === 'delivered' && styles.notificationUnread,
                    ]}
                  >
                    <View style={[
                      styles.notificationIcon,
                      { backgroundColor: getCategoryColor(notification.category) + '20' }
                    ]}>
                      <Text style={styles.notificationIconText}>
                        {getCategoryIcon(notification.category)}
                      </Text>
                    </View>

                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(notification.status) }
                        ]}>
                          <Text style={styles.statusBadgeText}>
                            {notification.status === 'read' ? '✓' :
                             notification.status === 'delivered' ? '●' : '○'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.notificationBody}>{notification.body}</Text>

                      {notification.imageUrl && (
                        <Image
                          source={{ uri: notification.imageUrl }}
                          style={styles.notificationImage}
                          resizeMode="cover"
                        />
                      )}

                      <View style={styles.notificationMeta}>
                        <Text style={styles.notificationTime}>
                          {notification.sentAt && formatTimeAgo(notification.sentAt)}
                        </Text>
                        <Text style={[
                          styles.notificationCategory,
                          { color: getCategoryColor(notification.category) }
                        ]}>
                          {notification.category}
                        </Text>
                      </View>

                      {notification.actionButtons && notification.actionButtons.length > 0 && (
                        <View style={styles.actionButtons}>
                          {notification.actionButtons.map((button) => (
                            <TouchableOpacity
                              key={button.id}
                              style={styles.actionButton}
                            >
                              <Text style={styles.actionButtonText}>{button.title}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* Scheduled Tab */}
        {selectedTab === 'scheduled' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scheduled Notifications ({schedules.length})</Text>

              {schedules.map((schedule) => (
                <View key={schedule.id} style={styles.scheduleCard}>
                  <View style={styles.scheduleHeader}>
                    <View style={styles.scheduleIcon}>
                      <Text style={styles.scheduleIconText}>
                        {getCategoryIcon(schedule.category)}
                      </Text>
                    </View>
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                      <Text style={styles.scheduleBody}>{schedule.body}</Text>
                    </View>
                    <Switch
                      value={schedule.enabled}
                      onValueChange={(value) => handleToggleSchedule(schedule.id, value)}
                      trackColor={{ false: colors.hair, true: colors.ink }}
                      thumbColor={colors.white}
                    />
                  </View>

                  <View style={styles.scheduleDetails}>
                    <View style={styles.scheduleTime}>
                      <Text style={styles.scheduleTimeIcon}>⏰</Text>
                      <Text style={styles.scheduleTimeText}>{schedule.time}</Text>
                    </View>

                    {schedule.type === 'daily' && (
                      <View style={styles.scheduleFrequency}>
                        <Text style={styles.scheduleFrequencyText}>Every day</Text>
                      </View>
                    )}

                    {schedule.type === 'weekly' && schedule.days && (
                      <View style={styles.scheduleFrequency}>
                        <Text style={styles.scheduleFrequencyText}>
                          {schedule.days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Settings Tab */}
        {selectedTab === 'settings' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notification Settings</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Enable Notifications</Text>
                  <Text style={styles.toggleDescription}>
                    Receive push notifications
                  </Text>
                </View>
                <Switch
                  value={settings.enabled}
                  onValueChange={(value) => handleUpdateSettings({ enabled: value })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Sound</Text>
                  <Text style={styles.toggleDescription}>
                    Play sound for notifications
                  </Text>
                </View>
                <Switch
                  value={settings.sound}
                  onValueChange={(value) => handleUpdateSettings({ sound: value })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Vibration</Text>
                  <Text style={styles.toggleDescription}>
                    Vibrate on notification
                  </Text>
                </View>
                <Switch
                  value={settings.vibration}
                  onValueChange={(value) => handleUpdateSettings({ vibration: value })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Badge</Text>
                  <Text style={styles.toggleDescription}>
                    Show badge count on app icon
                  </Text>
                </View>
                <Switch
                  value={settings.badge}
                  onValueChange={(value) => handleUpdateSettings({ badge: value })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Preview</Text>
                  <Text style={styles.toggleDescription}>
                    Show notification content
                  </Text>
                </View>
                <Switch
                  value={settings.preview}
                  onValueChange={(value) => handleUpdateSettings({ preview: value })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>👗 Outfit Suggestions</Text>
                  <Text style={styles.toggleDescription}>
                    Daily outfit recommendations
                  </Text>
                </View>
                <Switch
                  value={settings.categories.outfits}
                  onValueChange={(value) => handleUpdateSettings({
                    categories: { ...settings.categories, outfits: value }
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>👔 Wardrobe Updates</Text>
                  <Text style={styles.toggleDescription}>
                    New items and changes
                  </Text>
                </View>
                <Switch
                  value={settings.categories.wardrobe}
                  onValueChange={(value) => handleUpdateSettings({
                    categories: { ...settings.categories, wardrobe: value }
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>❤️ Social Activity</Text>
                  <Text style={styles.toggleDescription}>
                    Likes, comments, follows
                  </Text>
                </View>
                <Switch
                  value={settings.categories.social}
                  onValueChange={(value) => handleUpdateSettings({
                    categories: { ...settings.categories, social: value }
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>🎁 Promotions</Text>
                  <Text style={styles.toggleDescription}>
                    Special offers and deals
                  </Text>
                </View>
                <Switch
                  value={settings.categories.promotions}
                  onValueChange={(value) => handleUpdateSettings({
                    categories: { ...settings.categories, promotions: value }
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>⏰ Reminders</Text>
                  <Text style={styles.toggleDescription}>
                    Planning and tasks
                  </Text>
                </View>
                <Switch
                  value={settings.categories.reminders}
                  onValueChange={(value) => handleUpdateSettings({
                    categories: { ...settings.categories, reminders: value }
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>🔔 App Updates</Text>
                  <Text style={styles.toggleDescription}>
                    New features and improvements
                  </Text>
                </View>
                <Switch
                  value={settings.categories.updates}
                  onValueChange={(value) => handleUpdateSettings({
                    categories: { ...settings.categories, updates: value }
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quiet Hours</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Enable Quiet Hours</Text>
                  <Text style={styles.toggleDescription}>
                    Silence notifications during set hours
                  </Text>
                </View>
                <Switch
                  value={settings.quietHours.enabled}
                  onValueChange={(value) => handleUpdateSettings({
                    quietHours: { ...settings.quietHours, enabled: value }
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              {settings.quietHours.enabled && (
                <View style={styles.quietHoursCard}>
                  <View style={styles.quietHoursRow}>
                    <Text style={styles.quietHoursLabel}>Start Time:</Text>
                    <Text style={styles.quietHoursValue}>{settings.quietHours.startTime}</Text>
                  </View>
                  <View style={styles.quietHoursRow}>
                    <Text style={styles.quietHoursLabel}>End Time:</Text>
                    <Text style={styles.quietHoursValue}>{settings.quietHours.endTime}</Text>
                  </View>
                </View>
              )}
            </View>

            {analytics && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Analytics</Text>

                <View style={styles.analyticsCard}>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Total Sent:</Text>
                    <Text style={styles.analyticsValue}>{analytics.totalSent}</Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Delivered:</Text>
                    <Text style={styles.analyticsValue}>
                      {analytics.totalDelivered} ({analytics.deliveryRate.toFixed(1)}%)
                    </Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Read:</Text>
                    <Text style={styles.analyticsValue}>
                      {analytics.totalRead} ({analytics.readRate.toFixed(1)}%)
                    </Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Avg Time to Read:</Text>
                    <Text style={styles.analyticsValue}>{analytics.avgTimeToRead} min</Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Most Engaging:</Text>
                    <Text style={styles.analyticsValue}>{analytics.mostEngagingCategory}</Text>
                  </View>
                  {analytics.lastSent && (
                    <View style={styles.analyticsRow}>
                      <Text style={styles.analyticsLabel}>Last Sent:</Text>
                      <Text style={styles.analyticsValue}>
                        {formatTimeAgo(analytics.lastSent)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
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
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
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
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  testButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  infoBannerIcon: {
    fontSize: 32,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.inkMuted,
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
    flexDirection: 'row',
    justifyContent: 'center',
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
    color: colors.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  badge: {
    backgroundColor: colors.ink,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  markAllButton: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  emptyCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
  },
  notificationUnread: {
    backgroundColor: colors.sand,
    borderLeftWidth: 4,
    borderLeftColor: colors.ink,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginRight: 8,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 12,
    color: colors.white,
  },
  notificationBody: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationImage: {
    width: '100%',
    height: 120,
    borderRadius: radius.sm,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  notificationCategory: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingVertical: 8,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  scheduleCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleIconText: {
    fontSize: 20,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  scheduleBody: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  scheduleDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  scheduleTimeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  scheduleTimeText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  scheduleFrequency: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  scheduleFrequencyText: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleName: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  quietHoursCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 8,
  },
  quietHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  quietHoursLabel: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  quietHoursValue: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  analyticsCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  analyticsLabel: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  analyticsValue: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
});

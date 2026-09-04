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
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  appleWatchService,
  WatchSettings,
  TodaysOutfit,
  OutfitSuggestion,
  WatchActivity,
  WatchStats,
} from '../services/appleWatchService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AppleWatchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<WatchSettings | null>(null);
  const [todaysOutfit, setTodaysOutfit] = useState<TodaysOutfit | null>(null);
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [activity, setActivity] = useState<WatchActivity[]>([]);
  const [stats, setStats] = useState<WatchStats | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'outfits' | 'settings'>('overview');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        settingsData,
        outfitData,
        suggestionsData,
        activityData,
        statsData,
        battery,
        connected,
      ] = await Promise.all([
        appleWatchService.getWatchSettings(getCurrentUserId()),
        appleWatchService.getTodaysOutfit(getCurrentUserId()),
        appleWatchService.getOutfitSuggestions(getCurrentUserId()),
        appleWatchService.getWatchActivity(getCurrentUserId()),
        appleWatchService.getWatchStats(getCurrentUserId()),
        appleWatchService.getWatchBatteryLevel(),
        appleWatchService.isWatchConnected(),
      ]);

      setSettings(settingsData);
      setTodaysOutfit(outfitData);
      setSuggestions(suggestionsData);
      setActivity(activityData);
      setStats(statsData);
      setBatteryLevel(battery);
      setIsConnected(connected);
    } catch (error) {
      console.error('Error loading Apple Watch:', error);
      showToast('Failed to load watch settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<WatchSettings>) => {
    if (!settings) return;

    try {
      const updated = await appleWatchService.updateWatchSettings(getCurrentUserId(), updates);
      setSettings(updated);
      showToast('Settings updated!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  const handleSync = async () => {
    try {
      showToast('Syncing with watch...', 'info');
      const result = await appleWatchService.syncWithWatch(getCurrentUserId());
      showToast(`Synced ${result.synced} items!`, 'success');
      await loadData();
    } catch (error) {
      console.error('Error syncing:', error);
      showToast('Failed to sync', 'error');
    }
  };

  const handleRateOutfit = async (outfitId: string, rating: number) => {
    try {
      await appleWatchService.rateOutfit(outfitId, rating);
      showToast('Outfit rated!', 'success');
    } catch (error) {
      console.error('Error rating outfit:', error);
      showToast('Failed to rate outfit', 'error');
    }
  };

  const getBatteryColor = (level: number): string => {
    if (level > 50) return colors.tobacco;
    if (level > 20) return colors.camel;
    return colors.tobacco;
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
          <Text style={styles.loadingText}>Loading Apple Watch...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!settings) return null;

  // Show pairing screen if not paired
  if (!settings.paired) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apple Watch</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.pairingContainer}>
          <Text style={styles.pairingIcon}>⌚</Text>
          <Text style={styles.pairingTitle}>Pair Your Apple Watch</Text>
          <Text style={styles.pairingDescription}>
            Connect your Apple Watch to view outfits, get suggestions, and track your style on your wrist
          </Text>

          <View style={styles.pairingFeatures}>
            <View style={styles.pairingFeature}>
              <Text style={styles.pairingFeatureIcon}>✓</Text>
              <Text style={styles.pairingFeatureText}>View today's outfit</Text>
            </View>
            <View style={styles.pairingFeature}>
              <Text style={styles.pairingFeatureIcon}>✓</Text>
              <Text style={styles.pairingFeatureText}>Quick outfit suggestions</Text>
            </View>
            <View style={styles.pairingFeature}>
              <Text style={styles.pairingFeatureIcon}>✓</Text>
              <Text style={styles.pairingFeatureText}>Weather-based recommendations</Text>
            </View>
            <View style={styles.pairingFeature}>
              <Text style={styles.pairingFeatureIcon}>✓</Text>
              <Text style={styles.pairingFeatureText}>Rate and log outfits</Text>
            </View>
            <View style={styles.pairingFeature}>
              <Text style={styles.pairingFeatureIcon}>✓</Text>
              <Text style={styles.pairingFeatureText}>Watch face complications</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.pairButton}>
            <Text style={styles.pairButtonText}>Open Watch App to Pair</Text>
          </TouchableOpacity>

          <Text style={styles.pairingFooter}>
            Requires Apple Watch Series 4 or later with watchOS 7.0+
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apple Watch</Text>
        <TouchableOpacity onPress={handleSync}>
          <Text style={styles.syncButton}>Sync</Text>
        </TouchableOpacity>
      </View>

      {/* Watch Status */}
      <View style={[styles.statusBanner, { backgroundColor: isConnected ? colors.tobacco : colors.tobacco }]}>
        <Text style={styles.statusIcon}>⌚</Text>
        <View style={styles.statusInfo}>
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          <Text style={styles.statusSubtext}>
            {settings.watchModel} • {settings.watchOS}
          </Text>
        </View>
        <View style={styles.batteryContainer}>
          <View style={[styles.batteryBar, { backgroundColor: getBatteryColor(batteryLevel) }]}>
            <View style={[styles.batteryFill, { width: `${batteryLevel}%` }]} />
          </View>
          <Text style={styles.batteryText}>{batteryLevel}%</Text>
        </View>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalViews}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalRatings}</Text>
            <Text style={styles.statLabel}>Ratings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'outfits' && styles.tabActive]}
          onPress={() => setSelectedTab('outfits')}
        >
          <Text style={[styles.tabText, selectedTab === 'outfits' && styles.tabTextActive]}>
            Outfits
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
        {/* Overview Tab */}
        {selectedTab === 'overview' && todaysOutfit && (
          <>
            {/* Today's Outfit */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Outfit</Text>

              <View style={styles.outfitCard}>
                <Image
                  source={{ uri: todaysOutfit.imageUrl }}
                  style={styles.outfitImage}
                  resizeMode="cover"
                />
                <View style={styles.outfitInfo}>
                  <Text style={styles.outfitName}>{todaysOutfit.name}</Text>
                  <Text style={styles.outfitOccasion}>For: {todaysOutfit.occasion}</Text>
                  
                  <View style={styles.weatherInfo}>
                    <Text style={styles.weatherIcon}>{todaysOutfit.weather.icon}</Text>
                    <Text style={styles.weatherText}>
                      {todaysOutfit.weather.temp}°F • {todaysOutfit.weather.condition}
                    </Text>
                  </View>

                  {todaysOutfit.rating && (
                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingStars}>
                        {'⭐'.repeat(Math.floor(todaysOutfit.rating))}
                      </Text>
                      <Text style={styles.ratingValue}>{todaysOutfit.rating}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.itemsList}>
                <Text style={styles.itemsTitle}>Items ({todaysOutfit.items.length})</Text>
                {todaysOutfit.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>

              {activity.slice(0, 5).map((act) => (
                <View key={act.id} style={styles.activityCard}>
                  <View style={styles.activityIcon}>
                    <Text style={styles.activityIconText}>
                      {act.type === 'view' ? '👁️' :
                       act.type === 'rate' ? '⭐' :
                       act.type === 'log' ? '📝' : '💡'}
                    </Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityType}>
                      {act.type.charAt(0).toUpperCase() + act.type.slice(1)}
                    </Text>
                    <Text style={styles.activityTime}>{formatTimeAgo(act.timestamp)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Outfits Tab */}
        {selectedTab === 'outfits' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Outfit Suggestions</Text>
              <Text style={styles.sectionSubtitle}>
                Quick picks for your watch
              </Text>

              {suggestions.map((suggestion) => (
                <View key={suggestion.id} style={styles.suggestionCard}>
                  <Image
                    source={{ uri: suggestion.imageUrl }}
                    style={styles.suggestionImage}
                    resizeMode="cover"
                  />
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionName}>{suggestion.name}</Text>
                    <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
                    <View style={styles.suggestionWeather}>
                      <Text style={styles.suggestionTemp}>
                        {suggestion.weather.temp}°F • {suggestion.weather.condition}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchScore}>{suggestion.matchScore}%</Text>
                    <Text style={styles.matchLabel}>Match</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Settings Tab */}
        {selectedTab === 'settings' && (
          <>
            {/* Complications */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Watch Face Complications</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Enable Complications</Text>
                  <Text style={styles.toggleDescription}>
                    Show outfit info on watch face
                  </Text>
                </View>
                <Switch
                  value={settings.complications.enabled}
                  onValueChange={(value) => handleUpdateSettings({
                    complications: { ...settings.complications, enabled: value },
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Show Outfit</Text>
                  <Text style={styles.toggleDescription}>
                    Display today's outfit
                  </Text>
                </View>
                <Switch
                  value={settings.complications.showOutfit}
                  onValueChange={(value) => handleUpdateSettings({
                    complications: { ...settings.complications, showOutfit: value },
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Show Weather</Text>
                  <Text style={styles.toggleDescription}>
                    Display weather info
                  </Text>
                </View>
                <Switch
                  value={settings.complications.showWeather}
                  onValueChange={(value) => handleUpdateSettings({
                    complications: { ...settings.complications, showWeather: value },
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>
            </View>

            {/* Notifications */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notifications</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Enable Notifications</Text>
                  <Text style={styles.toggleDescription}>
                    Receive alerts on watch
                  </Text>
                </View>
                <Switch
                  value={settings.notifications.enabled}
                  onValueChange={(value) => handleUpdateSettings({
                    notifications: { ...settings.notifications, enabled: value },
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Outfit Reminders</Text>
                  <Text style={styles.toggleDescription}>
                    Morning outfit suggestions
                  </Text>
                </View>
                <Switch
                  value={settings.notifications.outfitReminders}
                  onValueChange={(value) => handleUpdateSettings({
                    notifications: { ...settings.notifications, outfitReminders: value },
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Weather Alerts</Text>
                  <Text style={styles.toggleDescription}>
                    Weather-based outfit tips
                  </Text>
                </View>
                <Switch
                  value={settings.notifications.weatherAlerts}
                  onValueChange={(value) => handleUpdateSettings({
                    notifications: { ...settings.notifications, weatherAlerts: value },
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>
            </View>

            {/* Standalone Mode */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Standalone Mode</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Enable Standalone</Text>
                  <Text style={styles.toggleDescription}>
                    Use watch without phone nearby
                  </Text>
                </View>
                <Switch
                  value={settings.standalone.enabled}
                  onValueChange={(value) => handleUpdateSettings({
                    standalone: { ...settings.standalone, enabled: value },
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Cache Outfits</Text>
                  <Text style={styles.toggleDescription}>
                    Store outfits on watch
                  </Text>
                </View>
                <Switch
                  value={settings.standalone.cacheOutfits}
                  onValueChange={(value) => handleUpdateSettings({
                    standalone: { ...settings.standalone, cacheOutfits: value },
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Cache Images</Text>
                  <Text style={styles.toggleDescription}>
                    Download outfit images
                  </Text>
                </View>
                <Switch
                  value={settings.standalone.cacheImages}
                  onValueChange={(value) => handleUpdateSettings({
                    standalone: { ...settings.standalone, cacheImages: value },
                  })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>
            </View>
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
  syncButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  statusIcon: {
    fontSize: 32,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.9,
  },
  batteryContainer: {
    alignItems: 'center',
  },
  batteryBar: {
    width: 40,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.card,
    padding: 2,
    marginBottom: 4,
  },
  batteryFill: {
    height: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
  },
  batteryText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
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
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 16,
  },
  outfitCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: 16,
  },
  outfitImage: {
    borderRadius: radius.sm,
    width: '100%',
    height: 200,
  },
  outfitInfo: {
    padding: 16,
  },
  outfitName: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  outfitOccasion: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  weatherText: {
    fontSize: 14,
    color: colors.ink,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStars: {
    fontSize: 16,
    marginRight: 8,
  },
  ratingValue: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  itemsList: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
  },
  itemsTitle: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  itemName: {
    fontSize: 14,
    color: colors.ink,
  },
  itemCategory: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIconText: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  suggestionCard: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  suggestionImage: {
    borderRadius: radius.sm,
    width: 100,
    height: 100,
  },
  suggestionInfo: {
    flex: 1,
    padding: 12,
  },
  suggestionName: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 6,
  },
  suggestionReason: {
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 8,
  },
  suggestionWeather: {
    flexDirection: 'row',
  },
  suggestionTemp: {
    fontSize: 12,
    color: colors.tobacco,
  },
  matchBadge: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchScore: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
    marginBottom: 2,
  },
  matchLabel: {
    fontSize: 10,
    color: colors.white,
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
  pairingContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pairingIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  pairingTitle: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
    textAlign: 'center',
  },
  pairingDescription: {
    fontSize: 16,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  pairingFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  pairingFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pairingFeatureIcon: {
    fontSize: 20,
    color: colors.tobacco,
    marginRight: 12,
    width: 24,
  },
  pairingFeatureText: {
    fontSize: 15,
    color: colors.ink,
  },
  pairButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: radius.full,
    marginBottom: 16,
  },
  pairButtonText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  pairingFooter: {
    fontSize: 13,
    color: colors.inkFaint,
    textAlign: 'center',
  },
});

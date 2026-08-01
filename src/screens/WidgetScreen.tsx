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
  widgetService,
  Widget,
  WidgetSettings,
  OutfitWidget,
  StatsWidget,
  WidgetAnalytics,
} from '../services/widgetService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function WidgetScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<WidgetSettings | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [outfitData, setOutfitData] = useState<OutfitWidget | null>(null);
  const [statsData, setStatsData] = useState<StatsWidget | null>(null);
  const [analytics, setAnalytics] = useState<WidgetAnalytics | null>(null);
  const [selectedTab, setSelectedTab] = useState<'widgets' | 'preview' | 'settings'>('widgets');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, widgetsData, outfitWidgetData, statsWidgetData, analyticsData] = await Promise.all([
        widgetService.getWidgetSettings(getCurrentUserId()),
        widgetService.getAvailableWidgets(),
        widgetService.getOutfitWidgetData(getCurrentUserId()),
        widgetService.getStatsWidgetData(getCurrentUserId()),
        widgetService.getWidgetAnalytics(getCurrentUserId()),
      ]);

      setSettings(settingsData);
      setWidgets(widgetsData);
      setOutfitData(outfitWidgetData);
      setStatsData(statsWidgetData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading widgets:', error);
      showToast('Failed to load widgets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<WidgetSettings>) => {
    if (!settings) return;

    try {
      const updated = await widgetService.updateWidgetSettings(getCurrentUserId(), updates);
      setSettings(updated);
      showToast('Settings updated!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  const handleToggleWidget = async (widgetId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await widgetService.enableWidget(widgetId);
        showToast('Widget enabled!', 'success');
      } else {
        await widgetService.disableWidget(widgetId);
        showToast('Widget disabled!', 'success');
      }
      await loadData();
    } catch (error) {
      console.error('Error toggling widget:', error);
      showToast('Failed to toggle widget', 'error');
    }
  };

  const handleRefreshAll = async () => {
    try {
      showToast('Refreshing widgets...', 'info');
      await widgetService.refreshAllWidgets(getCurrentUserId());
      showToast('Widgets refreshed!', 'success');
      await loadData();
    } catch (error) {
      console.error('Error refreshing:', error);
      showToast('Failed to refresh', 'error');
    }
  };

  const getWidgetIcon = (type: string): string => {
    switch (type) {
      case 'outfit': return '👗';
      case 'stats': return '📊';
      case 'calendar': return '📅';
      case 'quick-actions': return '⚡';
      default: return '📱';
    }
  };

  const getSizeBadgeColor = (size: string): string => {
    switch (size) {
      case 'small': return '#3b82f6';
      case 'medium': return '#8b5cf6';
      case 'large': return '#ec4899';
      default: return '#64748b';
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (loading && !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading widgets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!settings) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Widgets</Text>
        <TouchableOpacity onPress={handleRefreshAll}>
          <Text style={styles.refreshButton}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: '#fff3cd' }]}>
        <Text style={styles.infoBannerIcon}>⚠️</Text>
        <View style={styles.infoBannerContent}>
          <Text style={[styles.infoBannerTitle, { color: '#856404' }]}>
            Widget Preview Mode
          </Text>
          <Text style={[styles.infoBannerText, { color: '#856404' }]}>
            This screen shows widget preferences. Actual home screen widgets require native iOS/Android implementation.
          </Text>
        </View>
      </View>

      {/* Stats */}
      {analytics && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.totalViews}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.totalTaps}</Text>
            <Text style={styles.statLabel}>Taps</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{widgets.filter(w => w.enabled).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'widgets' && styles.tabActive]}
          onPress={() => setSelectedTab('widgets')}
        >
          <Text style={[styles.tabText, selectedTab === 'widgets' && styles.tabTextActive]}>
            Widgets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'preview' && styles.tabActive]}
          onPress={() => setSelectedTab('preview')}
        >
          <Text style={[styles.tabText, selectedTab === 'preview' && styles.tabTextActive]}>
            Preview
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
        {/* Widgets Tab */}
        {selectedTab === 'widgets' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Widgets ({widgets.length})</Text>
              <Text style={styles.sectionSubtitle}>
                Enable widgets to add them to your home screen
              </Text>

              {widgets.map((widget) => (
                <View key={widget.id} style={styles.widgetCard}>
                  <View style={styles.widgetIcon}>
                    <Text style={styles.widgetIconText}>{getWidgetIcon(widget.type)}</Text>
                  </View>

                  <View style={styles.widgetInfo}>
                    <View style={styles.widgetHeader}>
                      <Text style={styles.widgetName}>{widget.title}</Text>
                      <View style={[styles.sizeBadge, { backgroundColor: getSizeBadgeColor(widget.size) }]}>
                        <Text style={styles.sizeBadgeText}>{widget.size.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.widgetDescription}>{widget.description}</Text>
                    {widget.lastUpdated && (
                      <Text style={styles.widgetUpdated}>
                        Updated {formatTimeAgo(widget.lastUpdated)}
                      </Text>
                    )}
                  </View>

                  <Switch
                    value={widget.enabled}
                    onValueChange={(value) => handleToggleWidget(widget.id, value)}
                    trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                    thumbColor="#ffffff"
                  />
                </View>
              ))}
            </View>

            {/* How to Add */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How to Add Widgets</Text>

              <View style={styles.instructionCard}>
                <Text style={styles.instructionStep}>1️⃣</Text>
                <View style={styles.instructionContent}>
                  <Text style={styles.instructionTitle}>Long press home screen</Text>
                  <Text style={styles.instructionText}>
                    Press and hold on an empty area of your home screen
                  </Text>
                </View>
              </View>

              <View style={styles.instructionCard}>
                <Text style={styles.instructionStep}>2️⃣</Text>
                <View style={styles.instructionContent}>
                  <Text style={styles.instructionTitle}>Tap the + button</Text>
                  <Text style={styles.instructionText}>
                    Look for the plus icon in the top corner
                  </Text>
                </View>
              </View>

              <View style={styles.instructionCard}>
                <Text style={styles.instructionStep}>3️⃣</Text>
                <View style={styles.instructionContent}>
                  <Text style={styles.instructionTitle}>Search for Styled</Text>
                  <Text style={styles.instructionText}>
                    Find the Styled app in the widget gallery
                  </Text>
                </View>
              </View>

              <View style={styles.instructionCard}>
                <Text style={styles.instructionStep}>4️⃣</Text>
                <View style={styles.instructionContent}>
                  <Text style={styles.instructionTitle}>Choose widget size</Text>
                  <Text style={styles.instructionText}>
                    Select Small, Medium, or Large widget
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Preview Tab */}
        {selectedTab === 'preview' && outfitData && statsData && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Widget Previews</Text>
              <Text style={styles.sectionSubtitle}>
                See how widgets look on your home screen
              </Text>

              {/* Outfit Widget Preview */}
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>👗 Outfit Widget</Text>
                
                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>Small (155 x 155)</Text>
                  <View style={styles.widgetPreviewSmall}>
                    <Image
                      source={{ uri: outfitData.imageUrl }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <View style={styles.previewOverlay}>
                      <Text style={styles.previewOutfitName}>{outfitData.outfitName}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>Medium (329 x 155)</Text>
                  <View style={styles.widgetPreviewMedium}>
                    <Image
                      source={{ uri: outfitData.imageUrl }}
                      style={styles.previewImageMedium}
                      resizeMode="cover"
                    />
                    <View style={styles.previewContentMedium}>
                      <Text style={styles.previewOutfitNameMedium}>{outfitData.outfitName}</Text>
                      <Text style={styles.previewOccasion}>{outfitData.occasion}</Text>
                      <View style={styles.previewWeather}>
                        <Text style={styles.previewWeatherIcon}>{outfitData.weather.icon}</Text>
                        <Text style={styles.previewWeatherText}>
                          {outfitData.weather.temp}°F
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Stats Widget Preview */}
              <View style={styles.previewSection}>
                <Text style={styles.previewTitle}>📊 Stats Widget</Text>
                
                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>Small (155 x 155)</Text>
                  <View style={styles.widgetPreviewSmall}>
                    <View style={styles.statsPreviewContent}>
                      <Text style={styles.statsPreviewTitle}>Wardrobe</Text>
                      <Text style={styles.statsPreviewValue}>{statsData.totalItems}</Text>
                      <Text style={styles.statsPreviewLabel}>Items</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.previewCard}>
                  <Text style={styles.previewLabel}>Medium (329 x 155)</Text>
                  <View style={styles.widgetPreviewMedium}>
                    <View style={styles.statsPreviewGrid}>
                      <View style={styles.statsPreviewItem}>
                        <Text style={styles.statsPreviewItemValue}>{statsData.totalItems}</Text>
                        <Text style={styles.statsPreviewItemLabel}>Items</Text>
                      </View>
                      <View style={styles.statsPreviewItem}>
                        <Text style={styles.statsPreviewItemValue}>{statsData.totalOutfits}</Text>
                        <Text style={styles.statsPreviewItemLabel}>Outfits</Text>
                      </View>
                      <View style={styles.statsPreviewItem}>
                        <Text style={styles.statsPreviewItemValue}>{statsData.favoriteItems}</Text>
                        <Text style={styles.statsPreviewItemLabel}>Favorites</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Settings Tab */}
        {selectedTab === 'settings' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Widget Settings</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Auto Refresh</Text>
                  <Text style={styles.toggleDescription}>
                    Automatically update widgets
                  </Text>
                </View>
                <Switch
                  value={settings.autoRefresh}
                  onValueChange={(value) => handleUpdateSettings({ autoRefresh: value })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Show Images</Text>
                  <Text style={styles.toggleDescription}>
                    Display outfit images in widgets
                  </Text>
                </View>
                <Switch
                  value={settings.showImages}
                  onValueChange={(value) => handleUpdateSettings({ showImages: value })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Show Weather</Text>
                  <Text style={styles.toggleDescription}>
                    Include weather information
                  </Text>
                </View>
                <Switch
                  value={settings.showWeather}
                  onValueChange={(value) => handleUpdateSettings({ showWeather: value })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Theme</Text>

              <View style={styles.optionCard}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    settings.theme === 'light' && styles.optionButtonActive,
                  ]}
                  onPress={() => handleUpdateSettings({ theme: 'light' })}
                >
                  <Text style={styles.optionIcon}>☀️</Text>
                  <Text style={[
                    styles.optionText,
                    settings.theme === 'light' && styles.optionTextActive,
                  ]}>
                    Light
                  </Text>
                  {settings.theme === 'light' && (
                    <Text style={styles.optionCheck}>✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    settings.theme === 'dark' && styles.optionButtonActive,
                  ]}
                  onPress={() => handleUpdateSettings({ theme: 'dark' })}
                >
                  <Text style={styles.optionIcon}>🌙</Text>
                  <Text style={[
                    styles.optionText,
                    settings.theme === 'dark' && styles.optionTextActive,
                  ]}>
                    Dark
                  </Text>
                  {settings.theme === 'dark' && (
                    <Text style={styles.optionCheck}>✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    settings.theme === 'auto' && styles.optionButtonActive,
                  ]}
                  onPress={() => handleUpdateSettings({ theme: 'auto' })}
                >
                  <Text style={styles.optionIcon}>🔄</Text>
                  <Text style={[
                    styles.optionText,
                    settings.theme === 'auto' && styles.optionTextActive,
                  ]}>
                    Auto
                  </Text>
                  {settings.theme === 'auto' && (
                    <Text style={styles.optionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tap Action</Text>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  settings.tapAction === 'open-app' && styles.actionCardActive,
                ]}
                onPress={() => handleUpdateSettings({ tapAction: 'open-app' })}
              >
                <Text style={styles.actionName}>Open App</Text>
                <Text style={styles.actionDescription}>Launch Styled app</Text>
                {settings.tapAction === 'open-app' && (
                  <View style={styles.actionCheck}>
                    <Text style={styles.actionCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  settings.tapAction === 'open-outfit' && styles.actionCardActive,
                ]}
                onPress={() => handleUpdateSettings({ tapAction: 'open-outfit' })}
              >
                <Text style={styles.actionName}>Open Outfit</Text>
                <Text style={styles.actionDescription}>Go directly to outfit</Text>
                {settings.tapAction === 'open-outfit' && (
                  <View style={styles.actionCheck}>
                    <Text style={styles.actionCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  settings.tapAction === 'open-wardrobe' && styles.actionCardActive,
                ]}
                onPress={() => handleUpdateSettings({ tapAction: 'open-wardrobe' })}
              >
                <Text style={styles.actionName}>Open Wardrobe</Text>
                <Text style={styles.actionDescription}>View all items</Text>
                {settings.tapAction === 'open-wardrobe' && (
                  <View style={styles.actionCheck}>
                    <Text style={styles.actionCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {analytics && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Analytics</Text>

                <View style={styles.analyticsCard}>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Total Views:</Text>
                    <Text style={styles.analyticsValue}>{analytics.totalViews}</Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Total Taps:</Text>
                    <Text style={styles.analyticsValue}>{analytics.totalTaps}</Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Most Viewed:</Text>
                    <Text style={styles.analyticsValue}>{analytics.mostViewedWidget}</Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Avg Refresh:</Text>
                    <Text style={styles.analyticsValue}>{analytics.averageRefreshRate.toFixed(1)} min</Text>
                  </View>
                  {analytics.lastInteraction && (
                    <View style={styles.analyticsRow}>
                      <Text style={styles.analyticsLabel}>Last Interaction:</Text>
                      <Text style={styles.analyticsValue}>
                        {formatTimeAgo(analytics.lastInteraction)}
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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  refreshButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
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
    fontWeight: '600',
    color: '#5b21b6',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#7c3aed',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
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
    borderBottomColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  widgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  widgetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  widgetIconText: {
    fontSize: 24,
  },
  widgetInfo: {
    flex: 1,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  widgetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 8,
  },
  sizeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sizeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  widgetDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  widgetUpdated: {
    fontSize: 12,
    color: '#8b5cf6',
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  instructionStep: {
    fontSize: 24,
    marginRight: 12,
  },
  instructionContent: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 13,
    color: '#64748b',
  },
  previewSection: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  previewCard: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  widgetPreviewSmall: {
    width: 155,
    height: 155,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  widgetPreviewMedium: {
    width: '100%',
    maxWidth: 329,
    height: 155,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewImageMedium: {
    width: 155,
    height: 155,
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
  },
  previewOutfitName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  previewContentMedium: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  previewOutfitNameMedium: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  previewOccasion: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  previewWeather: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewWeatherIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  previewWeatherText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  statsPreviewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  statsPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  statsPreviewValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  statsPreviewLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  statsPreviewGrid: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
  },
  statsPreviewItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsPreviewItemValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  statsPreviewItemLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  optionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionButtonActive: {
    backgroundColor: '#ede9fe',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  optionTextActive: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  optionCheck: {
    fontSize: 16,
    color: '#7c3aed',
  },
  actionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  actionCardActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#faf5ff',
  },
  actionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  actionCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCheckText: {
    fontSize: 14,
    color: '#ffffff',
  },
  analyticsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  analyticsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
});

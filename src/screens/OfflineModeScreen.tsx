import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  offlineService,
  OfflineSettings,
  OfflineStats,
  NetworkStatus,
  CachedData,
  SyncQueueItem,
  DownloadableContent,
} from '../services/offlineService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function OfflineModeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<OfflineSettings | null>(null);
  const [stats, setStats] = useState<OfflineStats | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [cachedData, setCachedData] = useState<CachedData[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [downloadable, setDownloadable] = useState<DownloadableContent[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'cache' | 'sync'>('overview');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, statsData, networkData, cachedDataList, queueData, downloadableData] = await Promise.all([
        offlineService.getOfflineSettings(getCurrentUserId()),
        offlineService.getOfflineStats(getCurrentUserId()),
        offlineService.getNetworkStatus(),
        offlineService.getCachedData(),
        offlineService.getSyncQueue(),
        offlineService.getDownloadableContent(),
      ]);

      setSettings(settingsData);
      setStats(statsData);
      setNetworkStatus(networkData);
      setCachedData(cachedDataList);
      setSyncQueue(queueData);
      setDownloadable(downloadableData);
    } catch (error) {
      console.error('Error loading offline mode:', error);
      showToast('Failed to load offline settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<OfflineSettings>) => {
    if (!settings) return;

    try {
      const updated = await offlineService.updateOfflineSettings(getCurrentUserId(), updates);
      setSettings(updated);
      showToast('Settings updated!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  const handleSyncNow = async () => {
    try {
      showToast('Syncing data...', 'info');
      const result = await offlineService.syncNow();
      showToast(`Synced ${result.success}/${result.total} items!`, 'success');
      await loadData();
    } catch (error) {
      console.error('Error syncing:', error);
      showToast('Failed to sync', 'error');
    }
  };

  const handleClearCache = async () => {
    try {
      showToast('Clearing cache...', 'info');
      await offlineService.clearCache();
      showToast('Cache cleared!', 'success');
      await loadData();
    } catch (error) {
      console.error('Error clearing cache:', error);
      showToast('Failed to clear cache', 'error');
    }
  };

  const handleOptimizeCache = async () => {
    try {
      showToast('Optimizing cache...', 'info');
      const result = await offlineService.optimizeCache();
      showToast(`Saved ${result.saved.toFixed(1)} MB!`, 'success');
      await loadData();
    } catch (error) {
      console.error('Error optimizing cache:', error);
      showToast('Failed to optimize cache', 'error');
    }
  };

  const getConnectionColor = (status: NetworkStatus | null): string => {
    if (!status || !status.isConnected) return '#ef4444';
    if (status.isWifi) return '#10b981';
    return '#f59e0b';
  };

  const getConnectionIcon = (status: NetworkStatus | null): string => {
    if (!status || !status.isConnected) return '📴';
    if (status.isWifi) return '📶';
    return '📱';
  };

  const formatBytes = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(1);
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
          <Text style={styles.loadingText}>Loading offline mode...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!settings || !stats || !networkStatus) return null;

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline Mode</Text>
        <TouchableOpacity onPress={handleSyncNow}>
          <Text style={styles.syncButton}>Sync</Text>
        </TouchableOpacity>
      </View>

      {/* Network Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: getConnectionColor(networkStatus) }]}>
        <Text style={styles.statusIcon}>{getConnectionIcon(networkStatus)}</Text>
        <View style={styles.statusInfo}>
          <Text style={styles.statusText}>
            {networkStatus.isConnected ? 'Online' : 'Offline'}
          </Text>
          <Text style={styles.statusSubtext}>
            {networkStatus.isConnected 
              ? `${networkStatus.connectionType.toUpperCase()} • ${networkStatus.speed} speed`
              : 'No internet connection'}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalCached}</Text>
          <Text style={styles.statLabel}>Cached</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.cacheSize.toFixed(1)} MB</Text>
          <Text style={styles.statLabel}>Storage</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pendingSync}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

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
          style={[styles.tab, selectedTab === 'cache' && styles.tabActive]}
          onPress={() => setSelectedTab('cache')}
        >
          <Text style={[styles.tabText, selectedTab === 'cache' && styles.tabTextActive]}>
            Cache
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'sync' && styles.tabActive]}
          onPress={() => setSelectedTab('sync')}
        >
          <Text style={[styles.tabText, selectedTab === 'sync' && styles.tabTextActive]}>
            Sync Queue
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Offline Settings</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Enable Offline Mode</Text>
                  <Text style={styles.toggleDescription}>
                    Access your data without internet
                  </Text>
                </View>
                <Switch
                  value={settings.enabled}
                  onValueChange={(value) => handleUpdateSettings({ enabled: value })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Auto Sync</Text>
                  <Text style={styles.toggleDescription}>
                    Automatically sync when online
                  </Text>
                </View>
                <Switch
                  value={settings.autoSync}
                  onValueChange={(value) => handleUpdateSettings({ autoSync: value })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Sync on WiFi Only</Text>
                  <Text style={styles.toggleDescription}>
                    Save mobile data
                  </Text>
                </View>
                <Switch
                  value={settings.syncOnWifi}
                  onValueChange={(value) => handleUpdateSettings({ syncOnWifi: value })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Cache Images</Text>
                  <Text style={styles.toggleDescription}>
                    Download images for offline viewing
                  </Text>
                </View>
                <Switch
                  value={settings.cacheImages}
                  onValueChange={(value) => handleUpdateSettings({ cacheImages: value })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Cache Videos</Text>
                  <Text style={styles.toggleDescription}>
                    Download videos (uses more storage)
                  </Text>
                </View>
                <Switch
                  value={settings.cacheVideos}
                  onValueChange={(value) => handleUpdateSettings({ cacheVideos: value })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Storage */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Storage Usage</Text>

              <View style={styles.storageCard}>
                <View style={styles.storageHeader}>
                  <Text style={styles.storageLabel}>Used Storage</Text>
                  <Text style={styles.storageValue}>
                    {stats.cacheSize.toFixed(1)} / {stats.maxCacheSize} MB
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(stats.cacheSize / stats.maxCacheSize) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.storageSubtext}>
                  {(stats.maxCacheSize - stats.cacheSize).toFixed(1)} MB available
                </Text>
              </View>

              <TouchableOpacity style={styles.actionButton} onPress={handleOptimizeCache}>
                <Text style={styles.actionButtonText}>🗜️ Optimize Cache</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dangerButton} onPress={handleClearCache}>
                <Text style={styles.dangerButtonText}>🗑️ Clear All Cache</Text>
              </TouchableOpacity>
            </View>

            {/* Sync Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sync Status</Text>

              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last Sync:</Text>
                  <Text style={styles.infoValue}>
                    {stats.lastSyncAt ? formatTimeAgo(stats.lastSyncAt) : 'Never'}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Success Rate:</Text>
                  <Text style={styles.infoValue}>{stats.syncSuccessRate}%</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pending Items:</Text>
                  <Text style={styles.infoValue}>{stats.pendingSync}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Sync Interval:</Text>
                  <Text style={styles.infoValue}>{settings.syncInterval} minutes</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Cache Tab */}
        {selectedTab === 'cache' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cached Data ({cachedData.length})</Text>

              {cachedData.map((item) => (
                <View key={item.id} style={styles.cacheCard}>
                  <View style={styles.cacheIcon}>
                    <Text style={styles.cacheIconText}>
                      {item.type === 'wardrobe' ? '👔' :
                       item.type === 'outfits' ? '👗' :
                       item.type === 'favorites' ? '⭐' :
                       item.type === 'profile' ? '👤' : '⚙️'}
                    </Text>
                  </View>
                  
                  <View style={styles.cacheInfo}>
                    <Text style={styles.cacheName}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>
                    <Text style={styles.cacheDetails}>
                      {formatBytes(item.size)} MB • Cached {formatTimeAgo(item.cachedAt)}
                    </Text>
                    <Text style={styles.cacheExpiry}>
                      Expires {formatTimeAgo(item.expiresAt)}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}>
                    <Text style={styles.statusBadgeText}>✓</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Download for Offline</Text>

              {downloadable.map((item) => (
                <View key={item.id} style={styles.downloadCard}>
                  <View style={styles.downloadInfo}>
                    <Text style={styles.downloadName}>{item.title}</Text>
                    <Text style={styles.downloadSize}>{item.size} MB</Text>
                  </View>

                  {item.downloaded ? (
                    <View style={styles.downloadedBadge}>
                      <Text style={styles.downloadedText}>✓ Downloaded</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.downloadButton}>
                      <Text style={styles.downloadButtonText}>Download</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Sync Queue Tab */}
        {selectedTab === 'sync' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Sync ({syncQueue.length})</Text>

              {syncQueue.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>✓</Text>
                  <Text style={styles.emptyText}>All synced!</Text>
                  <Text style={styles.emptySubtext}>
                    No pending changes to sync
                  </Text>
                </View>
              ) : (
                syncQueue.map((item) => (
                  <View key={item.id} style={styles.syncCard}>
                    <View style={[
                      styles.syncTypeBadge,
                      { backgroundColor: 
                        item.type === 'create' ? '#10b981' :
                        item.type === 'update' ? '#3b82f6' : '#ef4444'
                      }
                    ]}>
                      <Text style={styles.syncTypeText}>
                        {item.type.toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.syncInfo}>
                      <Text style={styles.syncDataType}>
                        {item.dataType.charAt(0).toUpperCase() + item.dataType.slice(1)}
                      </Text>
                      <Text style={styles.syncTimestamp}>
                        {formatTimeAgo(item.timestamp)}
                      </Text>
                    </View>

                    <View style={styles.syncStatus}>
                      <Text style={styles.syncStatusText}>
                        {item.status === 'pending' ? '⏳' :
                         item.status === 'syncing' ? '🔄' :
                         item.status === 'synced' ? '✓' : '✗'}
                      </Text>
                    </View>
                  </View>
                ))
              )}

              {syncQueue.length > 0 && (
                <TouchableOpacity style={styles.syncNowButton} onPress={handleSyncNow}>
                  <Text style={styles.syncNowButtonText}>Sync All Now</Text>
                </TouchableOpacity>
              )}
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
  syncButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
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
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.9,
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
    fontSize: 18,
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
    marginBottom: 16,
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
  storageCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  storageValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
  },
  storageSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
  actionButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  cacheCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cacheIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cacheIconText: {
    fontSize: 24,
  },
  cacheInfo: {
    flex: 1,
  },
  cacheName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  cacheDetails: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  cacheExpiry: {
    fontSize: 12,
    color: '#8b5cf6',
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 16,
    color: '#ffffff',
  },
  downloadCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  downloadInfo: {
    flex: 1,
  },
  downloadName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  downloadSize: {
    fontSize: 13,
    color: '#64748b',
  },
  downloadedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  downloadedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  downloadButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  syncTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  syncTypeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  syncInfo: {
    flex: 1,
  },
  syncDataType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  syncTimestamp: {
    fontSize: 12,
    color: '#64748b',
  },
  syncStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncStatusText: {
    fontSize: 16,
  },
  syncNowButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  syncNowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

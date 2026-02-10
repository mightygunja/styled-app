import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  smartMirrorService,
  SmartMirror,
  MirrorSession,
  MirrorSettings,
  TryOnResult,
  StyleCheckResult,
} from '../services/smartMirrorService';
import { MOCK_USER_ID } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SmartMirrorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [mirrors, setMirrors] = useState<SmartMirror[]>([]);
  const [connectedMirror, setConnectedMirror] = useState<SmartMirror | null>(null);
  const [currentSession, setCurrentSession] = useState<MirrorSession | null>(null);
  const [settings, setSettings] = useState<MirrorSettings | null>(null);
  const [tryOnResult, setTryOnResult] = useState<TryOnResult | null>(null);
  const [styleCheck, setStyleCheck] = useState<StyleCheckResult | null>(null);
  const [selectedTab, setSelectedTab] = useState<'connect' | 'session' | 'settings'>('connect');
  const [usageStats, setUsageStats] = useState<any>(null);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [availableMirrors, mirrorSettings, stats] = await Promise.all([
        smartMirrorService.discoverMirrors(),
        smartMirrorService.getSettings(),
        smartMirrorService.getUsageStats(MOCK_USER_ID),
      ]);

      setMirrors(availableMirrors);
      setSettings(mirrorSettings);
      setUsageStats(stats);

      const connected = smartMirrorService.getConnectedMirror();
      if (connected) {
        setConnectedMirror(connected);
        setSelectedTab('session');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load mirror data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMirror = async (mirrorId: string) => {
    try {
      setLoading(true);
      showToast('Connecting to mirror...', 'info');

      const mirror = await smartMirrorService.connectToMirror(mirrorId);
      setConnectedMirror(mirror);
      setSelectedTab('session');
      showToast('Connected successfully!', 'success');
    } catch (error) {
      console.error('Error connecting:', error);
      showToast('Failed to connect', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await smartMirrorService.disconnectFromMirror();
      setConnectedMirror(null);
      setCurrentSession(null);
      setSelectedTab('connect');
      showToast('Disconnected', 'success');
    } catch (error) {
      console.error('Error disconnecting:', error);
      showToast('Failed to disconnect', 'error');
    }
  };

  const handleStartSession = async (mode: 'try-on' | 'outfit' | 'style-check') => {
    try {
      setLoading(true);
      const session = await smartMirrorService.startSession(MOCK_USER_ID, mode);
      setCurrentSession(session);
      showToast(`${mode} session started`, 'success');
    } catch (error) {
      console.error('Error starting session:', error);
      showToast('Failed to start session', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    try {
      const session = await smartMirrorService.endSession();
      if (session) {
        showToast(`Session ended: ${Math.floor(session.duration / 60)} minutes`, 'success');
      }
      setCurrentSession(null);
      setTryOnResult(null);
      setStyleCheck(null);
    } catch (error) {
      console.error('Error ending session:', error);
      showToast('Failed to end session', 'error');
    }
  };

  const handleTryOn = async () => {
    try {
      setLoading(true);
      // Mock item
      const mockItem = {
        id: 'item-1',
        name: 'Casual Dress',
        imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b',
        category: 'dresses' as const,
        color: 'Blue',
        brand: 'Fashion Brand',
      };

      const result = await smartMirrorService.tryOnItem(mockItem);
      setTryOnResult(result);
      showToast('Try-on complete!', 'success');
    } catch (error) {
      console.error('Error trying on:', error);
      showToast('Failed to try on item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStyleCheck = async () => {
    try {
      setLoading(true);
      // Mock items
      const mockItems = [
        {
          id: 'item-1',
          name: 'Casual Top',
          imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b',
          category: 'tops' as const,
          color: 'Blue',
          brand: 'Fashion Brand',
        },
      ];

      const result = await smartMirrorService.performStyleCheck(mockItems);
      setStyleCheck(result);
      showToast('Style check complete!', 'success');
    } catch (error) {
      console.error('Error checking style:', error);
      showToast('Failed to check style', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setLoading(true);
      const mockItems = [
        {
          id: 'item-1',
          name: 'Outfit',
          imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b',
          category: 'tops' as const,
          color: 'Blue',
          brand: 'Fashion Brand',
        },
      ];

      await smartMirrorService.takePhoto(mockItems);
      showToast('Photo saved!', 'success');
    } catch (error) {
      console.error('Error taking photo:', error);
      showToast('Failed to take photo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (key: keyof MirrorSettings, value: any) => {
    if (!settings) return;

    try {
      const updates = { [key]: value };
      const updatedSettings = await smartMirrorService.updateSettings(updates);
      setSettings(updatedSettings);
      showToast('Settings updated', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  const getFitColor = (fit: string): string => {
    const colors = {
      perfect: '#10b981',
      good: '#22c55e',
      loose: '#f59e0b',
      tight: '#ef4444',
    };
    return colors[fit as keyof typeof colors] || '#64748b';
  };

  if (loading && mirrors.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Discovering mirrors...</Text>
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
        <Text style={styles.headerTitle}>Smart Mirror</Text>
        {connectedMirror && (
          <TouchableOpacity onPress={handleDisconnect}>
            <Text style={styles.disconnectButton}>Disconnect</Text>
          </TouchableOpacity>
        )}
        {!connectedMirror && <View style={{ width: 50 }} />}
      </View>

      {/* Connection Status */}
      {connectedMirror && (
        <View style={styles.statusBar}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            Connected to {connectedMirror.name}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'connect' && styles.tabActive]}
          onPress={() => setSelectedTab('connect')}
        >
          <Text style={[styles.tabText, selectedTab === 'connect' && styles.tabTextActive]}>
            Connect
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'session' && styles.tabActive]}
          onPress={() => setSelectedTab('session')}
          disabled={!connectedMirror}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'session' && styles.tabTextActive,
            !connectedMirror && styles.tabTextDisabled,
          ]}>
            Session
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
        {/* Connect Tab */}
        {selectedTab === 'connect' && (
          <>
            {/* Available Mirrors */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Mirrors</Text>
              {mirrors.map((mirror) => (
                <View key={mirror.id} style={styles.mirrorCard}>
                  <View style={styles.mirrorIcon}>
                    <Text style={styles.mirrorIconText}>🪞</Text>
                  </View>
                  <View style={styles.mirrorInfo}>
                    <Text style={styles.mirrorName}>{mirror.name}</Text>
                    <Text style={styles.mirrorModel}>{mirror.model}</Text>
                    <Text style={styles.mirrorLocation}>📍 {mirror.location}</Text>
                    <View style={styles.mirrorFeatures}>
                      {mirror.features.slice(0, 2).map((feature, idx) => (
                        <View key={idx} style={styles.featureTag}>
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.connectButton,
                      mirror.status === 'connected' && styles.connectButtonConnected,
                    ]}
                    onPress={() => handleConnectMirror(mirror.id)}
                    disabled={mirror.status === 'connected'}
                  >
                    <Text style={styles.connectButtonText}>
                      {mirror.status === 'connected' ? 'Connected' : 'Connect'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Usage Stats */}
            {usageStats && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Usage Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{usageStats.totalSessions}</Text>
                    <Text style={styles.statLabel}>Sessions</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{usageStats.itemsTried}</Text>
                    <Text style={styles.statLabel}>Items Tried</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{usageStats.photosTaken}</Text>
                    <Text style={styles.statLabel}>Photos</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      {Math.floor(usageStats.averageSessionDuration / 60)}m
                    </Text>
                    <Text style={styles.statLabel}>Avg Duration</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Session Tab */}
        {selectedTab === 'session' && connectedMirror && (
          <>
            {!currentSession ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Start a Session</Text>
                <TouchableOpacity
                  style={styles.sessionButton}
                  onPress={() => handleStartSession('try-on')}
                >
                  <Text style={styles.sessionButtonIcon}>👗</Text>
                  <View style={styles.sessionButtonInfo}>
                    <Text style={styles.sessionButtonTitle}>Virtual Try-On</Text>
                    <Text style={styles.sessionButtonDescription}>
                      Try on items virtually with AR
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sessionButton}
                  onPress={() => handleStartSession('outfit')}
                >
                  <Text style={styles.sessionButtonIcon}>👔</Text>
                  <View style={styles.sessionButtonInfo}>
                    <Text style={styles.sessionButtonTitle}>Outfit Preview</Text>
                    <Text style={styles.sessionButtonDescription}>
                      View complete outfits
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sessionButton}
                  onPress={() => handleStartSession('style-check')}
                >
                  <Text style={styles.sessionButtonIcon}>✨</Text>
                  <View style={styles.sessionButtonInfo}>
                    <Text style={styles.sessionButtonTitle}>Style Check</Text>
                    <Text style={styles.sessionButtonDescription}>
                      Get AI style feedback
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Active Session */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active Session</Text>
                    <TouchableOpacity onPress={handleEndSession}>
                      <Text style={styles.endButton}>End Session</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionMode}>
                      Mode: {currentSession.mode.replace('-', ' ')}
                    </Text>
                    <Text style={styles.sessionTime}>
                      Started: {new Date(currentSession.startTime).toLocaleTimeString()}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsGrid}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleTryOn}>
                      <Text style={styles.actionButtonIcon}>👗</Text>
                      <Text style={styles.actionButtonText}>Try On</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={handleStyleCheck}>
                      <Text style={styles.actionButtonIcon}>✨</Text>
                      <Text style={styles.actionButtonText}>Style Check</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
                      <Text style={styles.actionButtonIcon}>📸</Text>
                      <Text style={styles.actionButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Try-On Result */}
                {tryOnResult && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Try-On Result</Text>
                    <View style={styles.resultCard}>
                      <Image
                        source={{ uri: tryOnResult.screenshot }}
                        style={styles.resultImage}
                      />
                      <View style={styles.resultInfo}>
                        <View style={styles.fitBadge} style={{ backgroundColor: getFitColor(tryOnResult.fit) }}>
                          <Text style={styles.fitBadgeText}>
                            {tryOnResult.fit.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.resultConfidence}>
                          {(tryOnResult.confidence * 100).toFixed(0)}% confidence
                        </Text>
                        {tryOnResult.adjustments.size && (
                          <Text style={styles.resultAdjustment}>
                            💡 {tryOnResult.adjustments.size}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* Style Check Result */}
                {styleCheck && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Style Check</Text>
                    <View style={styles.styleCheckCard}>
                      <View style={styles.overallScore}>
                        <Text style={styles.overallScoreValue}>
                          {styleCheck.overallScore.toFixed(0)}
                        </Text>
                        <Text style={styles.overallScoreLabel}>Overall Score</Text>
                      </View>

                      <View style={styles.categoryScores}>
                        {Object.entries(styleCheck.categories).map(([key, value]) => (
                          <View key={key} style={styles.categoryScore}>
                            <Text style={styles.categoryName}>
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </Text>
                            <View style={styles.categoryBar}>
                              <View
                                style={[styles.categoryBarFill, { width: `${value}%` }]}
                              />
                            </View>
                            <Text style={styles.categoryValue}>{value.toFixed(0)}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.feedback}>
                        <Text style={styles.feedbackTitle}>✓ Compliments</Text>
                        {styleCheck.compliments.map((item, idx) => (
                          <Text key={idx} style={styles.feedbackItem}>• {item}</Text>
                        ))}

                        <Text style={styles.feedbackTitle}>💡 Suggestions</Text>
                        {styleCheck.suggestions.map((item, idx) => (
                          <Text key={idx} style={styles.feedbackItem}>• {item}</Text>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* Settings Tab */}
        {selectedTab === 'settings' && settings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mirror Settings</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Brightness</Text>
                <Text style={styles.settingValue}>{settings.brightness}%</Text>
              </View>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Contrast</Text>
                <Text style={styles.settingValue}>{settings.contrast}%</Text>
              </View>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto Capture</Text>
                <Text style={styles.settingDescription}>Automatically take photos</Text>
              </View>
              <Switch
                value={settings.autoCapture}
                onValueChange={(value) => handleSettingChange('autoCapture', value)}
                trackColor={{ false: '#cbd5e1', true: '#c4b5fd' }}
                thumbColor={settings.autoCapture ? '#8b5cf6' : '#f1f5f9'}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Gesture Control</Text>
                <Text style={styles.settingDescription}>Control with hand gestures</Text>
              </View>
              <Switch
                value={settings.gestureControl}
                onValueChange={(value) => handleSettingChange('gestureControl', value)}
                trackColor={{ false: '#cbd5e1', true: '#c4b5fd' }}
                thumbColor={settings.gestureControl ? '#8b5cf6' : '#f1f5f9'}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Voice Control</Text>
                <Text style={styles.settingDescription}>Voice commands enabled</Text>
              </View>
              <Switch
                value={settings.voiceControl}
                onValueChange={(value) => handleSettingChange('voiceControl', value)}
                trackColor={{ false: '#cbd5e1', true: '#c4b5fd' }}
                thumbColor={settings.voiceControl ? '#8b5cf6' : '#f1f5f9'}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Background Blur</Text>
                <Text style={styles.settingDescription}>Blur background in photos</Text>
              </View>
              <Switch
                value={settings.backgroundBlur}
                onValueChange={(value) => handleSettingChange('backgroundBlur', value)}
                trackColor={{ false: '#cbd5e1', true: '#c4b5fd' }}
                thumbColor={settings.backgroundBlur ? '#8b5cf6' : '#f1f5f9'}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Lighting</Text>
                <Text style={styles.settingValue}>{settings.lighting}</Text>
              </View>
            </View>
          </View>
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
  disconnectButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
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
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  tabTextDisabled: {
    color: '#cbd5e1',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  endButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  mirrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  mirrorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mirrorIconText: {
    fontSize: 30,
  },
  mirrorInfo: {
    flex: 1,
  },
  mirrorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  mirrorModel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  mirrorLocation: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  mirrorFeatures: {
    flexDirection: 'row',
    gap: 6,
  },
  featureTag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featureText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7c3aed',
  },
  connectButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  connectButtonConnected: {
    backgroundColor: '#10b981',
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  sessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  sessionButtonIcon: {
    fontSize: 32,
  },
  sessionButtonInfo: {
    flex: 1,
  },
  sessionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  sessionButtonDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  sessionInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sessionMode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  sessionTime: {
    fontSize: 13,
    color: '#64748b',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7c3aed',
  },
  resultCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e2e8f0',
  },
  resultInfo: {
    padding: 16,
  },
  fitBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  fitBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  resultConfidence: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  resultAdjustment: {
    fontSize: 14,
    color: '#0f172a',
  },
  styleCheckCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
  },
  overallScore: {
    alignItems: 'center',
    marginBottom: 24,
  },
  overallScoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  overallScoreLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  categoryScores: {
    gap: 16,
    marginBottom: 24,
  },
  categoryScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryName: {
    width: 80,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  categoryBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
  },
  categoryValue: {
    width: 40,
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
    textAlign: 'right',
  },
  feedback: {
    gap: 8,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 4,
  },
  feedbackItem: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
});

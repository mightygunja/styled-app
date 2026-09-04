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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  siriShortcutsService,
  SiriShortcut,
  ShortcutSettings,
  ShortcutAnalytics,
  ShortcutExecution,
} from '../services/siriShortcutsService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SiriShortcutsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ShortcutSettings | null>(null);
  const [shortcuts, setShortcuts] = useState<SiriShortcut[]>([]);
  const [analytics, setAnalytics] = useState<ShortcutAnalytics | null>(null);
  const [history, setHistory] = useState<ShortcutExecution[]>([]);
  const [selectedTab, setSelectedTab] = useState<'shortcuts' | 'history' | 'settings'>('shortcuts');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, shortcutsData, analyticsData, historyData] = await Promise.all([
        siriShortcutsService.getShortcutSettings(getCurrentUserId()),
        siriShortcutsService.getAvailableShortcuts(),
        siriShortcutsService.getShortcutAnalytics(getCurrentUserId()),
        siriShortcutsService.getShortcutHistory(getCurrentUserId()),
      ]);

      setSettings(settingsData);
      setShortcuts(shortcutsData);
      setAnalytics(analyticsData);
      setHistory(historyData);
    } catch (error) {
      console.error('Error loading shortcuts:', error);
      showToast('Failed to load shortcuts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<ShortcutSettings>) => {
    if (!settings) return;

    try {
      const updated = await siriShortcutsService.updateShortcutSettings(getCurrentUserId(), updates);
      setSettings(updated);
      showToast('Settings updated!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  const handleToggleShortcut = async (shortcutId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await siriShortcutsService.enableShortcut(shortcutId);
        showToast('Shortcut enabled!', 'success');
      } else {
        await siriShortcutsService.disableShortcut(shortcutId);
        showToast('Shortcut disabled!', 'success');
      }
      await loadData();
    } catch (error) {
      console.error('Error toggling shortcut:', error);
      showToast('Failed to toggle shortcut', 'error');
    }
  };

  const handleAddToSiri = async (shortcutId: string) => {
    try {
      showToast('Adding to Siri...', 'info');
      await siriShortcutsService.addToSiri(shortcutId);
      showToast('Added to Siri!', 'success');
    } catch (error) {
      console.error('Error adding to Siri:', error);
      showToast('Failed to add to Siri', 'error');
    }
  };

  const handleTestShortcut = async (shortcutId: string) => {
    try {
      showToast('Testing shortcut...', 'info');
      const result = await siriShortcutsService.testShortcut(shortcutId);
      if (result.success) {
        showToast(`Test successful! (${result.duration}ms)`, 'success');
      } else {
        showToast('Test failed', 'error');
      }
    } catch (error) {
      console.error('Error testing shortcut:', error);
      showToast('Failed to test shortcut', 'error');
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'wardrobe': return '👔';
      case 'outfits': return '👗';
      case 'planning': return '📅';
      case 'quick-actions': return '⚡';
      default: return '🎯';
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'wardrobe': return colors.tobacco;
      case 'outfits': return colors.ink;
      case 'planning': return colors.tobacco;
      case 'quick-actions': return colors.tobacco;
      default: return colors.inkMuted;
    }
  };

  const getTriggerIcon = (trigger: string): string => {
    switch (trigger) {
      case 'voice': return '🎤';
      case 'widget': return '📱';
      case 'automation': return '🤖';
      default: return '🔘';
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
          <Text style={styles.loadingText}>Loading Siri Shortcuts...</Text>
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
        <Text style={styles.headerTitle}>Siri Shortcuts</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerIcon}>🎤</Text>
        <View style={styles.infoBannerContent}>
          <Text style={styles.infoBannerTitle}>Voice Control</Text>
          <Text style={styles.infoBannerText}>
            Use Siri to control 33 Trends with your voice
          </Text>
        </View>
      </View>

      {/* Stats */}
      {analytics && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.totalExecutions}</Text>
            <Text style={styles.statLabel}>Uses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.successRate.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{shortcuts.filter(s => s.enabled).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'shortcuts' && styles.tabActive]}
          onPress={() => setSelectedTab('shortcuts')}
        >
          <Text style={[styles.tabText, selectedTab === 'shortcuts' && styles.tabTextActive]}>
            Shortcuts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'history' && styles.tabActive]}
          onPress={() => setSelectedTab('history')}
        >
          <Text style={[styles.tabText, selectedTab === 'history' && styles.tabTextActive]}>
            History
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
        {/* Shortcuts Tab */}
        {selectedTab === 'shortcuts' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Shortcuts ({shortcuts.length})</Text>
              <Text style={styles.sectionSubtitle}>
                Enable shortcuts to use with Siri
              </Text>

              {shortcuts.map((shortcut) => (
                <View key={shortcut.id} style={styles.shortcutCard}>
                  <View style={styles.shortcutHeader}>
                    <View style={styles.shortcutIconContainer}>
                      <Text style={styles.shortcutIcon}>{shortcut.icon}</Text>
                    </View>
                    <View style={styles.shortcutInfo}>
                      <Text style={styles.shortcutTitle}>{shortcut.title}</Text>
                      <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(shortcut.category) }]}>
                        <Text style={styles.categoryBadgeText}>
                          {getCategoryIcon(shortcut.category)} {shortcut.category}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={shortcut.enabled}
                      onValueChange={(value) => handleToggleShortcut(shortcut.id, value)}
                      trackColor={{ false: colors.hair, true: colors.ink }}
                      thumbColor={colors.white}
                    />
                  </View>

                  <Text style={styles.shortcutDescription}>{shortcut.description}</Text>

                  <View style={styles.phraseContainer}>
                    <Text style={styles.phraseLabel}>Say:</Text>
                    <Text style={styles.phraseText}>"{shortcut.phrase}"</Text>
                  </View>

                  {shortcut.suggestedPhrases.length > 0 && (
                    <View style={styles.suggestedPhrases}>
                      <Text style={styles.suggestedLabel}>Also try:</Text>
                      {shortcut.suggestedPhrases.slice(0, 2).map((phrase, index) => (
                        <Text key={index} style={styles.suggestedPhrase}>
                          • "{phrase}"
                        </Text>
                      ))}
                    </View>
                  )}

                  <View style={styles.shortcutStats}>
                    <Text style={styles.shortcutStat}>
                      Used {shortcut.usageCount} times
                    </Text>
                    {shortcut.lastUsed && (
                      <Text style={styles.shortcutStat}>
                        Last: {formatTimeAgo(shortcut.lastUsed)}
                      </Text>
                    )}
                  </View>

                  {shortcut.enabled && (
                    <View style={styles.shortcutActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleAddToSiri(shortcut.id)}
                      >
                        <Text style={styles.actionButtonText}>Add to Siri</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.testButton}
                        onPress={() => handleTestShortcut(shortcut.id)}
                      >
                        <Text style={styles.testButtonText}>Test</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* How to Use */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How to Use Siri Shortcuts</Text>

              <View style={styles.instructionCard}>
                <Text style={styles.instructionStep}>1️⃣</Text>
                <View style={styles.instructionContent}>
                  <Text style={styles.instructionTitle}>Enable shortcuts</Text>
                  <Text style={styles.instructionText}>
                    Toggle on the shortcuts you want to use
                  </Text>
                </View>
              </View>

              <View style={styles.instructionCard}>
                <Text style={styles.instructionStep}>2️⃣</Text>
                <View style={styles.instructionContent}>
                  <Text style={styles.instructionTitle}>Add to Siri</Text>
                  <Text style={styles.instructionText}>
                    Tap "Add to Siri" and record your phrase
                  </Text>
                </View>
              </View>

              <View style={styles.instructionCard}>
                <Text style={styles.instructionStep}>3️⃣</Text>
                <View style={styles.instructionContent}>
                  <Text style={styles.instructionTitle}>Say the phrase</Text>
                  <Text style={styles.instructionText}>
                    Activate Siri and say your custom phrase
                  </Text>
                </View>
              </View>

              <View style={styles.instructionCard}>
                <Text style={styles.instructionStep}>4️⃣</Text>
                <View style={styles.instructionContent}>
                  <Text style={styles.instructionTitle}>Enjoy hands-free control</Text>
                  <Text style={styles.instructionText}>
                    Access 33 Trends features with your voice
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* History Tab */}
        {selectedTab === 'history' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity ({history.length})</Text>

              {history.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>🎤</Text>
                  <Text style={styles.emptyText}>No shortcuts used yet</Text>
                  <Text style={styles.emptySubtext}>
                    Start using Siri shortcuts to see your activity
                  </Text>
                </View>
              ) : (
                history.map((execution) => {
                  const shortcut = shortcuts.find(s => s.id === execution.shortcutId);
                  return (
                    <View key={execution.id} style={styles.historyCard}>
                      <View style={styles.historyIcon}>
                        <Text style={styles.historyIconText}>
                          {shortcut?.icon || '🎯'}
                        </Text>
                      </View>

                      <View style={styles.historyInfo}>
                        <Text style={styles.historyTitle}>
                          {shortcut?.title || 'Unknown Shortcut'}
                        </Text>
                        <View style={styles.historyMeta}>
                          <Text style={styles.historyTrigger}>
                            {getTriggerIcon(execution.trigger)} {execution.trigger}
                          </Text>
                          <Text style={styles.historyTime}>
                            {formatTimeAgo(execution.timestamp)}
                          </Text>
                        </View>
                        <Text style={styles.historyDuration}>
                          {execution.duration}ms
                        </Text>
                      </View>

                      <View style={[
                        styles.historyStatus,
                        { backgroundColor: execution.success ? colors.sand : colors.sand }
                      ]}>
                        <Text style={[
                          styles.historyStatusText,
                          { color: execution.success ? colors.tobacco : colors.tobacco }
                        ]}>
                          {execution.success ? '✓' : '✗'}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {analytics && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Analytics</Text>

                <View style={styles.analyticsCard}>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Total Executions:</Text>
                    <Text style={styles.analyticsValue}>{analytics.totalExecutions}</Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Success Rate:</Text>
                    <Text style={styles.analyticsValue}>{analytics.successRate.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Most Used:</Text>
                    <Text style={styles.analyticsValue}>{analytics.mostUsedShortcut}</Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Avg Duration:</Text>
                    <Text style={styles.analyticsValue}>{analytics.averageDuration}ms</Text>
                  </View>
                  {analytics.lastExecution && (
                    <View style={styles.analyticsRow}>
                      <Text style={styles.analyticsLabel}>Last Used:</Text>
                      <Text style={styles.analyticsValue}>
                        {formatTimeAgo(analytics.lastExecution)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        )}

        {/* Settings Tab */}
        {selectedTab === 'settings' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Shortcut Settings</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Enable Siri Shortcuts</Text>
                  <Text style={styles.toggleDescription}>
                    Allow Siri to run shortcuts
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
                  <Text style={styles.toggleName}>Allow Suggestions</Text>
                  <Text style={styles.toggleDescription}>
                    Siri can suggest shortcuts
                  </Text>
                </View>
                <Switch
                  value={settings.allowSuggestions}
                  onValueChange={(value) => handleUpdateSettings({ allowSuggestions: value })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Voice Confirmation</Text>
                  <Text style={styles.toggleDescription}>
                    Siri confirms actions verbally
                  </Text>
                </View>
                <Switch
                  value={settings.voiceConfirmation}
                  onValueChange={(value) => handleUpdateSettings({ voiceConfirmation: value })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Haptic Feedback</Text>
                  <Text style={styles.toggleDescription}>
                    Vibrate when shortcut runs
                  </Text>
                </View>
                <Switch
                  value={settings.hapticFeedback}
                  onValueChange={(value) => handleUpdateSettings({ hapticFeedback: value })}
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tips</Text>

              <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>💡</Text>
                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>Use natural phrases</Text>
                  <Text style={styles.tipText}>
                    Choose phrases you'll remember and say naturally
                  </Text>
                </View>
              </View>

              <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>🎯</Text>
                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>Keep it short</Text>
                  <Text style={styles.tipText}>
                    Shorter phrases are easier to remember and say
                  </Text>
                </View>
              </View>

              <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>🔄</Text>
                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>Test your shortcuts</Text>
                  <Text style={styles.tipText}>
                    Use the test button to make sure they work
                  </Text>
                </View>
              </View>

              <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>⚡</Text>
                <View style={styles.tipContent}>
                  <Text style={styles.tipTitle}>Combine with automations</Text>
                  <Text style={styles.tipText}>
                    Set up time or location-based triggers
                  </Text>
                </View>
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
  infoBanner: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sand,
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
    color: colors.tobacco,
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    color: colors.tobacco,
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
  shortcutCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  shortcutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shortcutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shortcutIcon: {
    fontSize: 24,
  },
  shortcutInfo: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  shortcutDescription: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  phraseContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 8,
  },
  phraseLabel: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  phraseText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  suggestedPhrases: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 8,
  },
  suggestedLabel: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    marginBottom: 6,
  },
  suggestedPhrase: {
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 2,
  },
  shortcutStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  shortcutStat: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  shortcutActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingVertical: 10,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  testButton: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 10,
    borderRadius: radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.ink,
  },
  testButtonText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
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
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 13,
    color: colors.inkMuted,
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
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyIconText: {
    fontSize: 20,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  historyMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 2,
  },
  historyTrigger: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  historyTime: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  historyDuration: {
    fontSize: 11,
    color: colors.tobacco,
  },
  historyStatus: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyStatusText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
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
  tipCard: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: colors.inkMuted,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  voiceCommandService,
  VoiceCommandResult,
  VoiceSettings,
  VoiceCommandHistory,
} from '../services/voiceCommandService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius } from '../theme/designSystem';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function VoiceCommandScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const [history, setHistory] = useState<VoiceCommandHistory | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<'voice' | 'history' | 'settings'>('voice');
  const [pulseAnim] = useState(new Animated.Value(1));
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isListening]);

  const loadData = async () => {
    try {
      const [voiceSettings, commandHistory, commandSuggestions] = await Promise.all([
        voiceCommandService.getSettings(),
        voiceCommandService.getCommandHistory(),
        voiceCommandService.getCommandSuggestions(),
      ]);

      setSettings(voiceSettings);
      setHistory(commandHistory);
      setSuggestions(commandSuggestions);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load voice data', 'error');
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.setValue(1);
  };

  const handleToggleListening = async () => {
    if (isListening) {
      await voiceCommandService.stopListening();
      setIsListening(false);
      setTranscript('');
    } else {
      await voiceCommandService.startListening();
      setIsListening(true);
      setTranscript('Listening...');

      // Simulate voice recognition
      setTimeout(async () => {
        const testResult = await voiceCommandService.testVoiceRecognition();
        setTranscript(testResult.transcript);

        // Process the command
        setTimeout(async () => {
          const result = await voiceCommandService.processVoiceInput(testResult.transcript);
          setLastResult(result);
          setIsListening(false);
          showToast(result.response, result.success ? 'success' : 'error');

          // Reload history
          const updatedHistory = await voiceCommandService.getCommandHistory();
          setHistory(updatedHistory);
        }, 1000);
      }, 2000);
    }
  };

  const handleSuggestionPress = async (suggestion: string) => {
    setTranscript(suggestion);
    const result = await voiceCommandService.processVoiceInput(suggestion);
    setLastResult(result);
    showToast(result.response, result.success ? 'success' : 'error');

    const updatedHistory = await voiceCommandService.getCommandHistory();
    setHistory(updatedHistory);
  };

  const handleSettingChange = async (key: keyof VoiceSettings, value: any) => {
    if (!settings) return;

    const updates = { [key]: value };
    const updatedSettings = await voiceCommandService.updateSettings(updates);
    setSettings(updatedSettings);
    showToast('Settings updated', 'success');
  };

  const handleClearHistory = async () => {
    await voiceCommandService.clearHistory();
    const updatedHistory = await voiceCommandService.getCommandHistory();
    setHistory(updatedHistory);
    showToast('History cleared', 'success');
  };

  if (!settings || !history) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tobacco} />
          <Text style={styles.loadingText}>Loading voice assistant...</Text>
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
        <Text style={styles.headerTitle}>Voice Commands</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'voice' && styles.tabActive]}
          onPress={() => setSelectedTab('voice')}
        >
          <Text style={[styles.tabText, selectedTab === 'voice' && styles.tabTextActive]}>
            Voice
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
        {/* Voice Tab */}
        {selectedTab === 'voice' && (
          <>
            {/* Voice Button */}
            <View style={styles.voiceContainer}>
              <TouchableOpacity
                style={styles.voiceButtonContainer}
                onPress={handleToggleListening}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.voiceButton,
                    isListening && styles.voiceButtonActive,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Text style={styles.voiceIcon}>🎤</Text>
                </Animated.View>
              </TouchableOpacity>

              <Text style={styles.voiceStatus}>
                {isListening ? 'Listening...' : 'Tap to speak'}
              </Text>

              {transcript && (
                <View style={styles.transcriptContainer}>
                  <Text style={styles.transcriptLabel}>You said:</Text>
                  <Text style={styles.transcriptText}>{transcript}</Text>
                </View>
              )}

              {lastResult && (
                <View style={[
                  styles.resultContainer,
                  lastResult.success ? styles.resultSuccess : styles.resultError
                ]}>
                  <Text style={styles.resultIcon}>
                    {lastResult.success ? '✓' : '✗'}
                  </Text>
                  <Text style={styles.resultText}>{lastResult.response}</Text>
                </View>
              )}
            </View>

            {/* Suggestions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Try saying:</Text>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionCard}
                  onPress={() => handleSuggestionPress(suggestion)}
                >
                  <Text style={styles.suggestionIcon}>💬</Text>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                  <Text style={styles.suggestionArrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Help */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Voice Command Guide</Text>
              <View style={styles.helpCard}>
                <View style={styles.helpItem}>
                  <Text style={styles.helpCategory}>Search</Text>
                  <Text style={styles.helpExample}>"Show me casual dresses"</Text>
                  <Text style={styles.helpExample}>"Find black jeans under 50"</Text>
                </View>
                <View style={styles.helpItem}>
                  <Text style={styles.helpCategory}>Navigate</Text>
                  <Text style={styles.helpExample}>"Go to my closet"</Text>
                  <Text style={styles.helpExample}>"Open sustainability"</Text>
                </View>
                <View style={styles.helpItem}>
                  <Text style={styles.helpCategory}>Actions</Text>
                  <Text style={styles.helpExample}>"Add to favorites"</Text>
                  <Text style={styles.helpExample}>"Save this outfit"</Text>
                </View>
                <View style={styles.helpItem}>
                  <Text style={styles.helpCategory}>Questions</Text>
                  <Text style={styles.helpExample}>"What should I wear today?"</Text>
                  <Text style={styles.helpExample}>"What's trending?"</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* History Tab */}
        {selectedTab === 'history' && (
          <>
            {/* Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Usage Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{history.totalCommands}</Text>
                  <Text style={styles.statLabel}>Total Commands</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{history.successRate.toFixed(0)}%</Text>
                  <Text style={styles.statLabel}>Success Rate</Text>
                </View>
              </View>
            </View>

            {/* Top Commands */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Most Used Commands</Text>
              {history.topCommands.map((cmd, index) => (
                <View key={index} style={styles.topCommandCard}>
                  <View style={styles.topCommandRank}>
                    <Text style={styles.topCommandRankText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.topCommandText}>{cmd.command}</Text>
                  <Text style={styles.topCommandCount}>{cmd.count}×</Text>
                </View>
              ))}
            </View>

            {/* Recent Commands */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Commands</Text>
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text style={styles.clearButton}>Clear</Text>
                </TouchableOpacity>
              </View>
              {history.commands.length > 0 ? (
                history.commands.slice().reverse().map((cmd, index) => (
                  <View key={cmd.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyType}>{cmd.type}</Text>
                      <Text style={styles.historyTime}>
                        {new Date(cmd.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text style={styles.historyTranscript}>{cmd.transcript}</Text>
                    <View style={styles.historyFooter}>
                      <Text style={styles.historyConfidence}>
                        {(cmd.confidence * 100).toFixed(0)}% confidence
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No commands yet</Text>
                  <Text style={styles.emptyStateSubtext}>Start using voice commands to see history</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Settings Tab */}
        {selectedTab === 'settings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Voice Settings</Text>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Voice Commands</Text>
                <Text style={styles.settingDescription}>Enable voice control</Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(value) => handleSettingChange('enabled', value)}
                trackColor={{ false: colors.hair, true: colors.ink }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Continuous Listening</Text>
                <Text style={styles.settingDescription}>Keep microphone active</Text>
              </View>
              <Switch
                value={settings.continuousListening}
                onValueChange={(value) => handleSettingChange('continuousListening', value)}
                trackColor={{ false: colors.hair, true: colors.ink }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Feedback Sound</Text>
                <Text style={styles.settingDescription}>Play sound on activation</Text>
              </View>
              <Switch
                value={settings.feedbackSound}
                onValueChange={(value) => handleSettingChange('feedbackSound', value)}
                trackColor={{ false: colors.hair, true: colors.ink }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Voice Response</Text>
                <Text style={styles.settingDescription}>Speak command results</Text>
              </View>
              <Switch
                value={settings.voiceResponse}
                onValueChange={(value) => handleSettingChange('voiceResponse', value)}
                trackColor={{ false: colors.hair, true: colors.ink }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Wake Word</Text>
                <Text style={styles.settingDescription}>{settings.wakeWord}</Text>
              </View>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Language</Text>
                <Text style={styles.settingDescription}>{settings.language}</Text>
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
    fontSize: 15,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  tabTextActive: {
    color: colors.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  voiceContainer: {
    padding: 40,
    alignItems: 'center',
  },
  voiceButtonContainer: {
    marginBottom: 20,
  },
  voiceButton: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // The listening state has to read differently from the resting one. Both
  // sides mapped to ink, which would have made "listening" invisible.
  voiceButtonActive: {
    backgroundColor: colors.tobacco,
    shadowColor: colors.tobacco,
  },
  voiceIcon: {
    fontSize: 48,
  },
  voiceStatus: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    marginBottom: 20,
  },
  transcriptContainer: {
    width: '100%',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  transcriptLabel: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 16,
    color: colors.ink,
    lineHeight: 24,
  },
  resultContainer: {
    width: '100%',
    borderRadius: radius.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultSuccess: {
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  resultError: {
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  resultIcon: {
    fontSize: 20,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
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
    marginBottom: 16,
  },
  clearButton: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  suggestionIcon: {
    fontSize: 20,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
  },
  suggestionArrow: {
    fontSize: 16,
    color: colors.tobacco,
  },
  helpCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
    gap: 16,
  },
  helpItem: {
    gap: 6,
  },
  helpCategory: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
    marginBottom: 4,
  },
  helpExample: {
    fontSize: 13,
    color: colors.inkMuted,
    paddingLeft: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  topCommandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  topCommandRank: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCommandRankText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  topCommandText: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
  },
  topCommandCount: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  historyCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyType: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
    textTransform: 'uppercase',
  },
  historyTime: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  historyTranscript: {
    fontSize: 15,
    color: colors.ink,
    marginBottom: 8,
    lineHeight: 22,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyConfidence: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.inkMuted,
  },
});

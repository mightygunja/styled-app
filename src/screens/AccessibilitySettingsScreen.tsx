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
  accessibilityService,
  AccessibilitySettings,
  FontSizeInfo,
  ContrastInfo,
  ColorBlindInfo,
  AccessibilityAudit,
} from '../services/accessibilityService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AccessibilitySettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings | null>(null);
  const [fontSizes, setFontSizes] = useState<FontSizeInfo[]>([]);
  const [contrastModes, setContrastModes] = useState<ContrastInfo[]>([]);
  const [colorBlindModes, setColorBlindModes] = useState<ColorBlindInfo[]>([]);
  const [audit, setAudit] = useState<AccessibilityAudit | null>(null);
  const [selectedTab, setSelectedTab] = useState<'visual' | 'interaction' | 'audit'>('visual');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, fontData, contrastData, colorBlindData, auditData] = await Promise.all([
        accessibilityService.getAccessibilitySettings(getCurrentUserId()),
        accessibilityService.getFontSizeOptions(),
        accessibilityService.getContrastModes(),
        accessibilityService.getColorBlindModes(),
        accessibilityService.runAccessibilityAudit(),
      ]);

      setSettings(settingsData);
      setFontSizes(fontData);
      setContrastModes(contrastData);
      setColorBlindModes(colorBlindData);
      setAudit(auditData);
    } catch (error) {
      console.error('Error loading accessibility settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<AccessibilitySettings>) => {
    if (!settings) return;

    try {
      const updated = await accessibilityService.updateAccessibilitySettings(
        getCurrentUserId(),
        updates
      );
      setSettings(updated);
      showToast('Settings updated!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  const handleRunAudit = async () => {
    try {
      showToast('Running accessibility audit...', 'info');
      const auditResult = await accessibilityService.runAccessibilityAudit();
      setAudit(auditResult);
      showToast('Audit complete!', 'success');
    } catch (error) {
      console.error('Error running audit:', error);
      showToast('Failed to run audit', 'error');
    }
  };

  const getSeverityColor = (severity: string): string => {
    const colors = {
      critical: '#dc2626',
      serious: '#f59e0b',
      moderate: '#3b82f6',
      minor: '#64748b',
    };
    return colors[severity as keyof typeof colors] || '#64748b';
  };

  if (loading && !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading accessibility settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!settings) return null;

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accessibility</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* WCAG Badge */}
      {audit && (
        <View style={styles.wcagBanner}>
          <View style={styles.wcagBadge}>
            <Text style={styles.wcagLevel}>{audit.wcagLevel}</Text>
          </View>
          <View style={styles.wcagInfo}>
            <Text style={styles.wcagScore}>Score: {audit.score}/100</Text>
            <Text style={styles.wcagText}>WCAG {audit.wcagLevel} Compliant</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'visual' && styles.tabActive]}
          onPress={() => setSelectedTab('visual')}
        >
          <Text style={[styles.tabText, selectedTab === 'visual' && styles.tabTextActive]}>
            Visual
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'interaction' && styles.tabActive]}
          onPress={() => setSelectedTab('interaction')}
        >
          <Text style={[styles.tabText, selectedTab === 'interaction' && styles.tabTextActive]}>
            Interaction
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'audit' && styles.tabActive]}
          onPress={() => setSelectedTab('audit')}
        >
          <Text style={[styles.tabText, selectedTab === 'audit' && styles.tabTextActive]}>
            Audit
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Visual Tab */}
        {selectedTab === 'visual' && (
          <>
            {/* Font Size */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Font Size</Text>
              <Text style={styles.sectionSubtitle}>
                Adjust text size for better readability
              </Text>

              {fontSizes.map((font) => (
                <TouchableOpacity
                  key={font.size}
                  style={[
                    styles.optionCard,
                    settings.visual.fontSize === font.size && styles.optionCardSelected,
                  ]}
                  onPress={() => handleUpdateSettings({
                    visual: { ...settings.visual, fontSize: font.size },
                  })}
                >
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionName}>{font.name}</Text>
                    <Text style={styles.optionDescription}>{font.description}</Text>
                    <Text style={[styles.previewText, { fontSize: 14 * font.scale }]}>
                      Preview Text
                    </Text>
                  </View>
                  {settings.visual.fontSize === font.size && (
                    <View style={styles.selectedIcon}>
                      <Text style={styles.selectedIconText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Contrast Mode */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contrast Mode</Text>
              <Text style={styles.sectionSubtitle}>
                Enhance contrast for better visibility
              </Text>

              {contrastModes.map((contrast) => (
                <TouchableOpacity
                  key={contrast.mode}
                  style={[
                    styles.optionCard,
                    settings.visual.contrastMode === contrast.mode && styles.optionCardSelected,
                  ]}
                  onPress={() => handleUpdateSettings({
                    visual: { ...settings.visual, contrastMode: contrast.mode },
                  })}
                >
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionName}>{contrast.name}</Text>
                    <Text style={styles.optionDescription}>{contrast.description}</Text>
                    <Text style={styles.optionMeta}>Ratio: {contrast.ratio}</Text>
                  </View>
                  {settings.visual.contrastMode === contrast.mode && (
                    <View style={styles.selectedIcon}>
                      <Text style={styles.selectedIconText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Color Blind Mode */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color Blind Mode</Text>
              <Text style={styles.sectionSubtitle}>
                Adjust colors for color vision deficiency
              </Text>

              {colorBlindModes.map((mode) => (
                <TouchableOpacity
                  key={mode.mode}
                  style={[
                    styles.optionCard,
                    settings.visual.colorBlindMode === mode.mode && styles.optionCardSelected,
                  ]}
                  onPress={() => handleUpdateSettings({
                    visual: { ...settings.visual, colorBlindMode: mode.mode },
                  })}
                >
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionName}>{mode.name}</Text>
                    <Text style={styles.optionDescription}>{mode.description}</Text>
                    {mode.prevalence !== 'N/A' && (
                      <Text style={styles.optionMeta}>Prevalence: {mode.prevalence}</Text>
                    )}
                  </View>
                  {settings.visual.colorBlindMode === mode.mode && (
                    <View style={styles.selectedIcon}>
                      <Text style={styles.selectedIconText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Visual Toggles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Options</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Bold Text</Text>
                  <Text style={styles.toggleDescription}>
                    Make text bolder for better readability
                  </Text>
                </View>
                <Switch
                  value={settings.visual.boldText}
                  onValueChange={(value) => handleUpdateSettings({
                    visual: { ...settings.visual, boldText: value },
                  })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Underline Links</Text>
                  <Text style={styles.toggleDescription}>
                    Underline all clickable links
                  </Text>
                </View>
                <Switch
                  value={settings.visual.underlineLinks}
                  onValueChange={(value) => handleUpdateSettings({
                    visual: { ...settings.visual, underlineLinks: value },
                  })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </>
        )}

        {/* Interaction Tab */}
        {selectedTab === 'interaction' && (
          <>
            {/* Screen Reader */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Screen Reader</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Enable Screen Reader</Text>
                  <Text style={styles.toggleDescription}>
                    VoiceOver (iOS) / TalkBack (Android)
                  </Text>
                </View>
                <Switch
                  value={settings.screenReader.enabled}
                  onValueChange={(value) => handleUpdateSettings({
                    screenReader: { ...settings.screenReader, enabled: value },
                  })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Announce Changes</Text>
                  <Text style={styles.toggleDescription}>
                    Speak when content updates
                  </Text>
                </View>
                <Switch
                  value={settings.screenReader.announceChanges}
                  onValueChange={(value) => handleUpdateSettings({
                    screenReader: { ...settings.screenReader, announceChanges: value },
                  })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Speak Hints</Text>
                  <Text style={styles.toggleDescription}>
                    Read helpful hints and tips
                  </Text>
                </View>
                <Switch
                  value={settings.screenReader.speakHints}
                  onValueChange={(value) => handleUpdateSettings({
                    screenReader: { ...settings.screenReader, speakHints: value },
                  })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Motion */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Motion & Animation</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Reduce Motion</Text>
                  <Text style={styles.toggleDescription}>
                    Minimize animations and transitions
                  </Text>
                </View>
                <Switch
                  value={settings.motion.reduceMotion}
                  onValueChange={(value) => handleUpdateSettings({
                    motion: { ...settings.motion, reduceMotion: value },
                  })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Disable Animations</Text>
                  <Text style={styles.toggleDescription}>
                    Turn off all animations
                  </Text>
                </View>
                <Switch
                  value={settings.motion.disableAnimations}
                  onValueChange={(value) => handleUpdateSettings({
                    motion: { ...settings.motion, disableAnimations: value },
                  })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Disable Parallax</Text>
                  <Text style={styles.toggleDescription}>
                    Remove parallax scrolling effects
                  </Text>
                </View>
                <Switch
                  value={settings.motion.disableParallax}
                  onValueChange={(value) => handleUpdateSettings({
                    motion: { ...settings.motion, disableParallax: value },
                  })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Touch & Interaction */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Touch & Interaction</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Larger Touch Targets</Text>
                  <Text style={styles.toggleDescription}>
                    Increase button and link sizes
                  </Text>
                </View>
                <Switch
                  value={settings.interaction.largerTouchTargets}
                  onValueChange={(value) => handleUpdateSettings({
                    interaction: { ...settings.interaction, largerTouchTargets: value },
                  })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Haptic Feedback</Text>
                  <Text style={styles.toggleDescription}>
                    Vibrate on button presses
                  </Text>
                </View>
                <Switch
                  value={settings.interaction.hapticFeedback}
                  onValueChange={(value) => handleUpdateSettings({
                    interaction: { ...settings.interaction, hapticFeedback: value },
                  })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </>
        )}

        {/* Audit Tab */}
        {selectedTab === 'audit' && audit && (
          <>
            <View style={styles.section}>
              <View style={styles.auditHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Accessibility Audit</Text>
                  <Text style={styles.sectionSubtitle}>
                    Last run: {new Date().toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity style={styles.runButton} onPress={handleRunAudit}>
                  <Text style={styles.runButtonText}>Run Audit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.scoreCard}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreValue}>{audit.score}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
                <View style={styles.scoreInfo}>
                  <Text style={styles.scoreLabel}>Accessibility Score</Text>
                  <Text style={styles.scoreStatus}>
                    {audit.score >= 90 ? 'Excellent' : audit.score >= 70 ? 'Good' : 'Needs Improvement'}
                  </Text>
                </View>
              </View>

              <View style={styles.checksCard}>
                <Text style={styles.checksText}>
                  {audit.passedChecks} / {audit.totalChecks} checks passed
                </Text>
                <View style={styles.checksBar}>
                  <View
                    style={[
                      styles.checksBarFill,
                      { width: `${(audit.passedChecks / audit.totalChecks) * 100}%` },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Issues Found ({audit.issues.length})</Text>

              {audit.issues.map((issue, idx) => (
                <View key={idx} style={styles.issueCard}>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(issue.severity) },
                    ]}
                  >
                    <Text style={styles.severityText}>{issue.severity.toUpperCase()}</Text>
                  </View>
                  
                  <View style={styles.issueContent}>
                    <Text style={styles.issueType}>{issue.type}</Text>
                    <Text style={styles.issueDescription}>{issue.description}</Text>
                    <Text style={styles.issueLocation}>📍 {issue.location}</Text>
                    
                    <View style={styles.recommendationCard}>
                      <Text style={styles.recommendationLabel}>💡 Recommendation:</Text>
                      <Text style={styles.recommendationText}>{issue.recommendation}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {audit.issues.length === 0 && (
                <View style={styles.noIssuesCard}>
                  <Text style={styles.noIssuesIcon}>✓</Text>
                  <Text style={styles.noIssuesText}>No issues found!</Text>
                  <Text style={styles.noIssuesSubtext}>
                    Your app meets all accessibility standards
                  </Text>
                </View>
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
  wcagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    gap: 12,
  },
  wcagBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wcagLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  wcagInfo: {
    flex: 1,
  },
  wcagScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  wcagText: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.9,
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
  optionCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#8b5cf6',
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  optionMeta: {
    fontSize: 12,
    color: '#8b5cf6',
  },
  previewText: {
    color: '#0f172a',
    marginTop: 8,
  },
  selectedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIconText: {
    fontSize: 16,
    color: '#ffffff',
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
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  runButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  runButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scoreMax: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  scoreStatus: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  checksCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  checksText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  checksBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  checksBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  issueCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  issueContent: {
    gap: 8,
  },
  issueType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  issueDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  issueLocation: {
    fontSize: 13,
    color: '#8b5cf6',
  },
  recommendationCard: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  recommendationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  noIssuesCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  noIssuesIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noIssuesText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 8,
  },
  noIssuesSubtext: {
    fontSize: 14,
    color: '#166534',
    textAlign: 'center',
  },
});

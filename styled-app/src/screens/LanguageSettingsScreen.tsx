import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  i18nService,
  LanguageInfo,
  LocaleSettings,
  SupportedLanguage,
  TranslationStats,
} from '../services/i18nService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LanguageSettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [localeSettings, setLocaleSettings] = useState<LocaleSettings | null>(null);
  const [stats, setStats] = useState<Record<SupportedLanguage, TranslationStats>>({} as any);
  const [selectedTab, setSelectedTab] = useState<'languages' | 'locale'>('languages');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [languagesData, currentLang, localeData] = await Promise.all([
        i18nService.getSupportedLanguages(),
        i18nService.getCurrentLanguage(),
        i18nService.getLocaleSettings(),
      ]);

      setLanguages(languagesData);
      setCurrentLanguage(currentLang);
      setLocaleSettings(localeData);

      // Load stats for all languages
      const statsData: Record<SupportedLanguage, TranslationStats> = {} as any;
      for (const lang of languagesData) {
        statsData[lang.code] = await i18nService.getTranslationStats(lang.code);
      }
      setStats(statsData);
    } catch (error) {
      console.error('Error loading language settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLanguage = async (language: SupportedLanguage) => {
    try {
      showToast('Changing language...', 'info');
      await i18nService.setLanguage(language);
      setCurrentLanguage(language);
      
      const newLocale = await i18nService.getLocaleSettings();
      setLocaleSettings(newLocale);
      
      showToast('Language changed successfully!', 'success');
    } catch (error) {
      console.error('Error changing language:', error);
      showToast('Failed to change language', 'error');
    }
  };

  const handleUpdateLocale = async (updates: Partial<LocaleSettings>) => {
    if (!localeSettings) return;

    try {
      const updated = await i18nService.updateLocaleSettings(updates);
      setLocaleSettings(updated);
      showToast('Settings updated!', 'success');
    } catch (error) {
      console.error('Error updating locale:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  if (loading && languages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading languages...</Text>
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
        <Text style={styles.headerTitle}>Language & Region</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Current Language Banner */}
      <View style={styles.currentBanner}>
        <Text style={styles.currentFlag}>
          {languages.find(l => l.code === currentLanguage)?.flag}
        </Text>
        <View style={styles.currentInfo}>
          <Text style={styles.currentName}>
            {languages.find(l => l.code === currentLanguage)?.nativeName}
          </Text>
          <Text style={styles.currentSubtext}>Current Language</Text>
        </View>
        {i18nService.isRTL(currentLanguage) && (
          <View style={styles.rtlBadge}>
            <Text style={styles.rtlBadgeText}>RTL</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'languages' && styles.tabActive]}
          onPress={() => setSelectedTab('languages')}
        >
          <Text style={[styles.tabText, selectedTab === 'languages' && styles.tabTextActive]}>
            Languages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'locale' && styles.tabActive]}
          onPress={() => setSelectedTab('locale')}
        >
          <Text style={[styles.tabText, selectedTab === 'locale' && styles.tabTextActive]}>
            Locale Settings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Languages Tab */}
        {selectedTab === 'languages' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Languages</Text>
              <Text style={styles.sectionSubtitle}>
                Select your preferred language
              </Text>

              {languages.map((language) => {
                const isSelected = language.code === currentLanguage;
                const langStats = stats[language.code];

                return (
                  <TouchableOpacity
                    key={language.code}
                    style={[styles.languageCard, isSelected && styles.languageCardSelected]}
                    onPress={() => handleSelectLanguage(language.code)}
                  >
                    <Text style={styles.languageFlag}>{language.flag}</Text>
                    
                    <View style={styles.languageInfo}>
                      <Text style={styles.languageName}>{language.nativeName}</Text>
                      <Text style={styles.languageEnglishName}>{language.name}</Text>
                      
                      {langStats && (
                        <View style={styles.translationProgress}>
                          <View style={styles.progressBar}>
                            <View
                              style={[
                                styles.progressFill,
                                { width: `${langStats.completionPercentage}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.progressText}>
                            {langStats.completionPercentage}% translated
                          </Text>
                        </View>
                      )}
                    </View>

                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>✓</Text>
                      </View>
                    )}

                    {language.direction === 'rtl' && (
                      <View style={styles.directionBadge}>
                        <Text style={styles.directionBadgeText}>RTL</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Translation Status</Text>
              
              <View style={styles.infoCard}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>About Translations</Text>
                  <Text style={styles.infoText}>
                    We're continuously improving translations. Some languages may have incomplete translations.
                  </Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>9</Text>
                  <Text style={styles.statLabel}>Languages</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>500+</Text>
                  <Text style={styles.statLabel}>Translations</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Locale Settings Tab */}
        {selectedTab === 'locale' && localeSettings && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date & Time</Text>

              <View style={styles.settingCard}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Date Format</Text>
                  <Text style={styles.settingValue}>{localeSettings.dateFormat}</Text>
                </View>
                <TouchableOpacity style={styles.settingButton}>
                  <Text style={styles.settingButtonText}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingCard}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Time Format</Text>
                  <Text style={styles.settingValue}>
                    {localeSettings.timeFormat === '12h' ? '12-hour' : '24-hour'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.settingButton}
                  onPress={() => handleUpdateLocale({
                    timeFormat: localeSettings.timeFormat === '12h' ? '24h' : '12h',
                  })}
                >
                  <Text style={styles.settingButtonText}>Toggle</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingCard}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>First Day of Week</Text>
                  <Text style={styles.settingValue}>
                    {localeSettings.firstDayOfWeek === 0 ? 'Sunday' : 'Monday'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.settingButton}
                  onPress={() => handleUpdateLocale({
                    firstDayOfWeek: localeSettings.firstDayOfWeek === 0 ? 1 : 0,
                  })}
                >
                  <Text style={styles.settingButtonText}>Toggle</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Number & Currency</Text>

              <View style={styles.settingCard}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Number Format</Text>
                  <Text style={styles.settingValue}>
                    {localeSettings.numberFormat === 'comma' ? '1,000.00' :
                     localeSettings.numberFormat === 'period' ? '1.000,00' : '1 000,00'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.settingButton}>
                  <Text style={styles.settingButtonText}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingCard}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Currency</Text>
                  <Text style={styles.settingValue}>{localeSettings.currency}</Text>
                </View>
                <TouchableOpacity style={styles.settingButton}>
                  <Text style={styles.settingButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preview</Text>

              <View style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Date:</Text>
                  <Text style={styles.previewValue}>
                    {localeSettings.dateFormat.replace('DD', '15').replace('MM', '12').replace('YYYY', '2025')}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Time:</Text>
                  <Text style={styles.previewValue}>
                    {localeSettings.timeFormat === '12h' ? '3:45 PM' : '15:45'}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Number:</Text>
                  <Text style={styles.previewValue}>
                    {localeSettings.numberFormat === 'comma' ? '1,234.56' :
                     localeSettings.numberFormat === 'period' ? '1.234,56' : '1 234,56'}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Currency:</Text>
                  <Text style={styles.previewValue}>
                    {localeSettings.currency === 'USD' ? '$1,234.56' :
                     localeSettings.currency === 'EUR' ? '1.234,56 €' :
                     localeSettings.currency === 'JPY' ? '¥1,235' :
                     `${localeSettings.currency} 1,234.56`}
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
  currentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    padding: 20,
    gap: 12,
  },
  currentFlag: {
    fontSize: 40,
  },
  currentInfo: {
    flex: 1,
  },
  currentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  currentSubtext: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.9,
  },
  rtlBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rtlBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
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
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageCardSelected: {
    backgroundColor: '#ede9fe',
    borderColor: '#8b5cf6',
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  languageEnglishName: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  translationProgress: {
    gap: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
  },
  progressText: {
    fontSize: 11,
    color: '#64748b',
  },
  selectedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  selectedBadgeText: {
    fontSize: 16,
    color: '#ffffff',
  },
  directionBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  directionBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
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
  settingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 13,
    color: '#64748b',
  },
  settingButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  settingButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  previewCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
});

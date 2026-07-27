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
  emailCampaignsService,
  EmailSettings,
  EmailCampaign,
  EmailTemplate,
  CampaignAnalytics,
} from '../services/emailCampaignsService';
import { MOCK_USER_ID } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EmailCampaignsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [selectedTab, setSelectedTab] = useState<'campaigns' | 'templates' | 'settings'>('campaigns');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, campaignsData, templatesData, analyticsData] = await Promise.all([
        emailCampaignsService.getEmailSettings(MOCK_USER_ID),
        emailCampaignsService.getEmailCampaigns(),
        emailCampaignsService.getEmailTemplates(),
        emailCampaignsService.getCampaignAnalytics(),
      ]);

      setSettings(settingsData);
      setCampaigns(campaignsData);
      setTemplates(templatesData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      showToast('Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<EmailSettings>) => {
    if (!settings) return;

    try {
      const updated = await emailCampaignsService.updateEmailSettings(MOCK_USER_ID, updates);
      setSettings(updated);
      showToast('Settings updated!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  const handleSendTest = async () => {
    try {
      showToast('Sending test email...', 'info');
      await emailCampaignsService.sendTestEmail(MOCK_USER_ID, 'campaign-1');
      showToast('Test email sent!', 'success');
    } catch (error) {
      console.error('Error sending test:', error);
      showToast('Failed to send test', 'error');
    }
  };

  const handleVerifyEmail = async () => {
    try {
      showToast('Sending verification email...', 'info');
      await emailCampaignsService.sendVerificationEmail(MOCK_USER_ID);
      showToast('Verification email sent!', 'success');
    } catch (error) {
      console.error('Error sending verification:', error);
      showToast('Failed to send verification', 'error');
    }
  };

  const getCampaignTypeIcon = (type: string): string => {
    switch (type) {
      case 'newsletter': return '📰';
      case 'promotional': return '🎁';
      case 'transactional': return '📧';
      case 'announcement': return '📢';
      default: return '✉️';
    }
  };

  const getCampaignTypeColor = (type: string): string => {
    switch (type) {
      case 'newsletter': return '#3b82f6';
      case 'promotional': return '#f59e0b';
      case 'transactional': return '#10b981';
      case 'announcement': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'sent': return '#10b981';
      case 'sending': return '#3b82f6';
      case 'scheduled': return '#8b5cf6';
      case 'draft': return '#64748b';
      case 'paused': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#64748b';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading && !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
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
        <Text style={styles.headerTitle}>Email Campaigns</Text>
        <TouchableOpacity onPress={handleSendTest}>
          <Text style={styles.testButton}>Test</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: settings.subscribed ? '#dcfce7' : '#fee2e2' }]}>
        <Text style={styles.infoBannerIcon}>{settings.subscribed ? '✉️' : '📪'}</Text>
        <View style={styles.infoBannerContent}>
          <Text style={[styles.infoBannerTitle, { color: settings.subscribed ? '#166534' : '#991b1b' }]}>
            {settings.subscribed ? 'Email Subscribed' : 'Email Unsubscribed'}
          </Text>
          <Text style={[styles.infoBannerText, { color: settings.subscribed ? '#15803d' : '#b91c1c' }]}>
            {settings.subscribed 
              ? `${settings.emailAddress} • ${settings.frequency} emails`
              : 'Subscribe to receive email updates'}
          </Text>
        </View>
        {!settings.verified && settings.subscribed && (
          <TouchableOpacity onPress={handleVerifyEmail}>
            <Text style={styles.verifyButton}>Verify</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      {analytics && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.totalCampaigns}</Text>
            <Text style={styles.statLabel}>Campaigns</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.avgOpenRate.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Open Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.avgClickRate.toFixed(1)}%</Text>
            <Text style={styles.statLabel}>Click Rate</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'campaigns' && styles.tabActive]}
          onPress={() => setSelectedTab('campaigns')}
        >
          <Text style={[styles.tabText, selectedTab === 'campaigns' && styles.tabTextActive]}>
            Campaigns
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'templates' && styles.tabActive]}
          onPress={() => setSelectedTab('templates')}
        >
          <Text style={[styles.tabText, selectedTab === 'templates' && styles.tabTextActive]}>
            Templates
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
        {/* Campaigns Tab */}
        {selectedTab === 'campaigns' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Campaigns ({campaigns.length})</Text>

              {campaigns.map((campaign) => (
                <View key={campaign.id} style={styles.campaignCard}>
                  <View style={styles.campaignHeader}>
                    <View style={[
                      styles.campaignIcon,
                      { backgroundColor: getCampaignTypeColor(campaign.type) + '20' }
                    ]}>
                      <Text style={styles.campaignIconText}>
                        {getCampaignTypeIcon(campaign.type)}
                      </Text>
                    </View>

                    <View style={styles.campaignInfo}>
                      <Text style={styles.campaignName}>{campaign.name}</Text>
                      <Text style={styles.campaignSubject}>{campaign.subject}</Text>
                    </View>

                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(campaign.status) }
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {campaign.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.campaignPreview}>{campaign.previewText}</Text>

                  {campaign.status === 'sent' && (
                    <View style={styles.campaignStats}>
                      <View style={styles.campaignStat}>
                        <Text style={styles.campaignStatValue}>
                          {formatNumber(campaign.recipients)}
                        </Text>
                        <Text style={styles.campaignStatLabel}>Recipients</Text>
                      </View>
                      <View style={styles.campaignStat}>
                        <Text style={styles.campaignStatValue}>
                          {campaign.openRate.toFixed(1)}%
                        </Text>
                        <Text style={styles.campaignStatLabel}>Opened</Text>
                      </View>
                      <View style={styles.campaignStat}>
                        <Text style={styles.campaignStatValue}>
                          {campaign.clickRate.toFixed(1)}%
                        </Text>
                        <Text style={styles.campaignStatLabel}>Clicked</Text>
                      </View>
                    </View>
                  )}

                  {campaign.status === 'scheduled' && campaign.scheduledFor && (
                    <View style={styles.scheduledInfo}>
                      <Text style={styles.scheduledIcon}>📅</Text>
                      <Text style={styles.scheduledText}>
                        Scheduled for {formatDate(campaign.scheduledFor)}
                      </Text>
                    </View>
                  )}

                  {campaign.sentAt && (
                    <Text style={styles.campaignDate}>
                      Sent on {formatDate(campaign.sentAt)}
                    </Text>
                  )}
                </View>
              ))}
            </View>

            {analytics && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Performance Overview</Text>

                <View style={styles.analyticsCard}>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Total Campaigns:</Text>
                    <Text style={styles.analyticsValue}>{analytics.totalCampaigns}</Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Campaigns Sent:</Text>
                    <Text style={styles.analyticsValue}>{analytics.totalSent}</Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Total Recipients:</Text>
                    <Text style={styles.analyticsValue}>
                      {formatNumber(analytics.totalRecipients)}
                    </Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Avg Open Rate:</Text>
                    <Text style={styles.analyticsValue}>
                      {analytics.avgOpenRate.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Avg Click Rate:</Text>
                    <Text style={styles.analyticsValue}>
                      {analytics.avgClickRate.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.analyticsRow}>
                    <Text style={styles.analyticsLabel}>Best Performing:</Text>
                    <Text style={styles.analyticsValue}>
                      {analytics.bestPerformingCampaign}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Templates Tab */}
        {selectedTab === 'templates' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Email Templates ({templates.length})</Text>
              <Text style={styles.sectionSubtitle}>
                Choose a template to create your campaign
              </Text>

              {templates.map((template) => (
                <View key={template.id} style={styles.templateCard}>
                  <Image
                    source={{ uri: template.thumbnail }}
                    style={styles.templateImage}
                    resizeMode="cover"
                  />

                  <View style={styles.templateContent}>
                    <View style={styles.templateHeader}>
                      <Text style={styles.templateName}>{template.name}</Text>
                      <View style={[
                        styles.templateBadge,
                        { backgroundColor: getCampaignTypeColor(template.type) }
                      ]}>
                        <Text style={styles.templateBadgeText}>
                          {template.type.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.templateDescription}>
                      {template.description}
                    </Text>

                    <TouchableOpacity style={styles.useTemplateButton}>
                      <Text style={styles.useTemplateButtonText}>Use Template</Text>
                    </TouchableOpacity>
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
              <Text style={styles.sectionTitle}>Email Preferences</Text>

              <View style={styles.toggleCard}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleName}>Subscribe to Emails</Text>
                  <Text style={styles.toggleDescription}>
                    Receive email updates and newsletters
                  </Text>
                </View>
                <Switch
                  value={settings.subscribed}
                  onValueChange={(value) => handleUpdateSettings({ subscribed: value })}
                  trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                  thumbColor="#ffffff"
                />
              </View>

              {settings.subscribed && (
                <>
                  <View style={styles.emailCard}>
                    <View style={styles.emailInfo}>
                      <Text style={styles.emailLabel}>Email Address</Text>
                      <Text style={styles.emailValue}>{settings.emailAddress}</Text>
                    </View>
                    {settings.verified ? (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓ Verified</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.verifyEmailButton}
                        onPress={handleVerifyEmail}
                      >
                        <Text style={styles.verifyEmailButtonText}>Verify</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.frequencyCard}>
                    <Text style={styles.frequencyLabel}>Email Frequency</Text>
                    
                    <TouchableOpacity
                      style={[
                        styles.frequencyOption,
                        settings.frequency === 'daily' && styles.frequencyOptionActive,
                      ]}
                      onPress={() => handleUpdateSettings({ frequency: 'daily' })}
                    >
                      <Text style={[
                        styles.frequencyOptionText,
                        settings.frequency === 'daily' && styles.frequencyOptionTextActive,
                      ]}>
                        Daily
                      </Text>
                      {settings.frequency === 'daily' && (
                        <Text style={styles.frequencyCheck}>✓</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.frequencyOption,
                        settings.frequency === 'weekly' && styles.frequencyOptionActive,
                      ]}
                      onPress={() => handleUpdateSettings({ frequency: 'weekly' })}
                    >
                      <Text style={[
                        styles.frequencyOptionText,
                        settings.frequency === 'weekly' && styles.frequencyOptionTextActive,
                      ]}>
                        Weekly
                      </Text>
                      {settings.frequency === 'weekly' && (
                        <Text style={styles.frequencyCheck}>✓</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.frequencyOption,
                        settings.frequency === 'monthly' && styles.frequencyOptionActive,
                      ]}
                      onPress={() => handleUpdateSettings({ frequency: 'monthly' })}
                    >
                      <Text style={[
                        styles.frequencyOptionText,
                        settings.frequency === 'monthly' && styles.frequencyOptionTextActive,
                      ]}>
                        Monthly
                      </Text>
                      {settings.frequency === 'monthly' && (
                        <Text style={styles.frequencyCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {settings.subscribed && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Email Categories</Text>

                  <View style={styles.toggleCard}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleName}>📰 Newsletter</Text>
                      <Text style={styles.toggleDescription}>
                        Weekly style digest and tips
                      </Text>
                    </View>
                    <Switch
                      value={settings.categories.newsletter}
                      onValueChange={(value) => handleUpdateSettings({
                        categories: { ...settings.categories, newsletter: value }
                      })}
                      trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  <View style={styles.toggleCard}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleName}>🎁 Promotional</Text>
                      <Text style={styles.toggleDescription}>
                        Sales, offers, and deals
                      </Text>
                    </View>
                    <Switch
                      value={settings.categories.promotional}
                      onValueChange={(value) => handleUpdateSettings({
                        categories: { ...settings.categories, promotional: value }
                      })}
                      trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  <View style={styles.toggleCard}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleName}>📧 Transactional</Text>
                      <Text style={styles.toggleDescription}>
                        Order updates and receipts
                      </Text>
                    </View>
                    <Switch
                      value={settings.categories.transactional}
                      onValueChange={(value) => handleUpdateSettings({
                        categories: { ...settings.categories, transactional: value }
                      })}
                      trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  <View style={styles.toggleCard}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleName}>📢 Announcements</Text>
                      <Text style={styles.toggleDescription}>
                        New features and updates
                      </Text>
                    </View>
                    <Switch
                      value={settings.categories.announcement}
                      onValueChange={(value) => handleUpdateSettings({
                        categories: { ...settings.categories, announcement: value }
                      })}
                      trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Content Preferences</Text>

                  <View style={styles.toggleCard}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleName}>HTML Emails</Text>
                      <Text style={styles.toggleDescription}>
                        Rich formatted emails with images
                      </Text>
                    </View>
                    <Switch
                      value={settings.preferences.htmlEmails}
                      onValueChange={(value) => handleUpdateSettings({
                        preferences: { ...settings.preferences, htmlEmails: value }
                      })}
                      trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  <View style={styles.toggleCard}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleName}>Personalized Content</Text>
                      <Text style={styles.toggleDescription}>
                        Content based on your preferences
                      </Text>
                    </View>
                    <Switch
                      value={settings.preferences.personalizedContent}
                      onValueChange={(value) => handleUpdateSettings({
                        preferences: { ...settings.preferences, personalizedContent: value }
                      })}
                      trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  <View style={styles.toggleCard}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleName}>Product Recommendations</Text>
                      <Text style={styles.toggleDescription}>
                        Suggested items based on your style
                      </Text>
                    </View>
                    <Switch
                      value={settings.preferences.productRecommendations}
                      onValueChange={(value) => handleUpdateSettings({
                        preferences: { ...settings.preferences, productRecommendations: value }
                      })}
                      trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  <View style={styles.toggleCard}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleName}>Style Insights</Text>
                      <Text style={styles.toggleDescription}>
                        Analytics and wardrobe reports
                      </Text>
                    </View>
                    <Switch
                      value={settings.preferences.styleInsights}
                      onValueChange={(value) => handleUpdateSettings({
                        preferences: { ...settings.preferences, styleInsights: value }
                      })}
                      trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </View>
              </>
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
  testButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
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
    fontWeight: '600',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
  },
  verifyButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
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
  campaignCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  campaignIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  campaignIconText: {
    fontSize: 24,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  campaignSubject: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  campaignPreview: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  campaignStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  campaignStat: {
    flex: 1,
    alignItems: 'center',
  },
  campaignStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 2,
  },
  campaignStatLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  scheduledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  scheduledIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  scheduledText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7c3aed',
  },
  campaignDate: {
    fontSize: 12,
    color: '#94a3b8',
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
  templateCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  templateImage: {
    width: '100%',
    height: 150,
  },
  templateContent: {
    padding: 16,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  templateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  templateBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  templateDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  useTemplateButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  useTemplateButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  emailCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  emailInfo: {
    flex: 1,
  },
  emailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  emailValue: {
    fontSize: 14,
    color: '#0f172a',
  },
  verifiedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  verifyEmailButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyEmailButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  frequencyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  frequencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  frequencyOptionActive: {
    backgroundColor: '#ede9fe',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  frequencyOptionText: {
    fontSize: 14,
    color: '#64748b',
  },
  frequencyOptionTextActive: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  frequencyCheck: {
    fontSize: 16,
    color: '#7c3aed',
  },
});

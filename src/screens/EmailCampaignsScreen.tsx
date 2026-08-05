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
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts } from '../theme/designSystem';

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
        emailCampaignsService.getEmailSettings(getCurrentUserId()),
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
      const updated = await emailCampaignsService.updateEmailSettings(getCurrentUserId(), updates);
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
      await emailCampaignsService.sendTestEmail(getCurrentUserId(), 'campaign-1');
      showToast('Test email sent!', 'success');
    } catch (error) {
      console.error('Error sending test:', error);
      showToast('Failed to send test', 'error');
    }
  };

  const handleVerifyEmail = async () => {
    try {
      showToast('Sending verification email...', 'info');
      await emailCampaignsService.sendVerificationEmail(getCurrentUserId());
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
      case 'newsletter': return colors.tobacco;
      case 'promotional': return colors.camel;
      case 'transactional': return colors.tobacco;
      case 'announcement': return colors.ink;
      default: return colors.inkMuted;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'sent': return colors.tobacco;
      case 'sending': return colors.tobacco;
      case 'scheduled': return colors.ink;
      case 'draft': return colors.inkMuted;
      case 'paused': return colors.camel;
      case 'failed': return colors.tobacco;
      default: return colors.inkMuted;
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
          <ActivityIndicator size="large" color={colors.tobacco} />
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
      <View style={[styles.infoBanner, { backgroundColor: settings.subscribed ? colors.sand : colors.sand }]}>
        <Text style={styles.infoBannerIcon}>{settings.subscribed ? '✉️' : '📪'}</Text>
        <View style={styles.infoBannerContent}>
          <Text style={[styles.infoBannerTitle, { color: settings.subscribed ? colors.tobacco : colors.tobacco }]}>
            {settings.subscribed ? 'Email Subscribed' : 'Email Unsubscribed'}
          </Text>
          <Text style={[styles.infoBannerText, { color: settings.subscribed ? colors.tobacco : colors.tobacco }]}>
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
                  trackColor={{ false: colors.hair, true: colors.ink }}
                  thumbColor={colors.white}
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
                      trackColor={{ false: colors.hair, true: colors.ink }}
                      thumbColor={colors.white}
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
                      trackColor={{ false: colors.hair, true: colors.ink }}
                      thumbColor={colors.white}
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
                      trackColor={{ false: colors.hair, true: colors.ink }}
                      thumbColor={colors.white}
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
                      trackColor={{ false: colors.hair, true: colors.ink }}
                      thumbColor={colors.white}
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
                      trackColor={{ false: colors.hair, true: colors.ink }}
                      thumbColor={colors.white}
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
                      trackColor={{ false: colors.hair, true: colors.ink }}
                      thumbColor={colors.white}
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
                      trackColor={{ false: colors.hair, true: colors.ink }}
                      thumbColor={colors.white}
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
                      trackColor={{ false: colors.hair, true: colors.ink }}
                      thumbColor={colors.white}
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
  verifyButton: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
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
    borderRadius: 12,
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
  campaignCard: {
    backgroundColor: colors.paper,
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
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  campaignSubject: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  campaignPreview: {
    fontSize: 13,
    color: colors.inkMuted,
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
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
    marginBottom: 2,
  },
  campaignStatLabel: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  scheduledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sand,
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
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  campaignDate: {
    fontSize: 12,
    color: colors.inkFaint,
  },
  analyticsCard: {
    backgroundColor: colors.paper,
    borderRadius: 12,
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
  templateCard: {
    backgroundColor: colors.paper,
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
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  templateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  templateBadgeText: {
    fontSize: 10,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  templateDescription: {
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 12,
  },
  useTemplateButton: {
    backgroundColor: colors.ink,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  useTemplateButtonText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  toggleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.paper,
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
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  emailCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  emailInfo: {
    flex: 1,
  },
  emailLabel: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  emailValue: {
    fontSize: 14,
    color: colors.ink,
  },
  verifiedBadge: {
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  verifyEmailButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyEmailButtonText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  frequencyCard: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  frequencyLabel: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 12,
  },
  frequencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  frequencyOptionActive: {
    backgroundColor: colors.sand,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  frequencyOptionText: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  frequencyOptionTextActive: {
    color: colors.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  frequencyCheck: {
    fontSize: 16,
    color: colors.tobacco,
  },
});

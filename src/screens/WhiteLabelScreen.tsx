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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  whiteLabelService,
  WhiteLabelConfig,
  WhiteLabelFeatures,
  WhiteLabelStats,
} from '../services/whiteLabelService';
import { subscriptionService } from '../services/subscriptionService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function WhiteLabelScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<WhiteLabelConfig | null>(null);
  const [features, setFeatures] = useState<WhiteLabelFeatures | null>(null);
  const [stats, setStats] = useState<WhiteLabelStats | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'premium' | 'pro'>('free');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'deployment' | 'settings'>('overview');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const subscription = await subscriptionService.getUserSubscription(getCurrentUserId());
      setUserTier(subscription.tier);

      const [configData, featuresData, statsData] = await Promise.all([
        whiteLabelService.getWhiteLabelConfig(getCurrentUserId()),
        whiteLabelService.getWhiteLabelFeatures(subscription.tier),
        subscription.tier === 'pro' 
          ? whiteLabelService.getWhiteLabelStats(getCurrentUserId())
          : Promise.resolve(null),
      ]);

      setConfig(configData);
      setFeatures(featuresData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading white-label:', error);
      showToast('Failed to load white-label settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!config) return;

    try {
      showToast('Deploying application...', 'info');
      await whiteLabelService.deployApp(config.id, {
        platform: 'all',
        branding: config.branding,
        customDomain: config.customDomain,
        features: [],
      });
      showToast('Deployment started!', 'success');
      await loadData();
    } catch (error) {
      console.error('Error deploying:', error);
      showToast('Failed to deploy', 'error');
    }
  };

  const handleGenerateApiKey = async () => {
    if (!config) return;

    try {
      showToast('Generating API key...', 'info');
      const apiKey = await whiteLabelService.generateApiKey(config.id);
      showToast('API key generated!', 'success');
    } catch (error) {
      console.error('Error generating API key:', error);
      showToast('Failed to generate API key', 'error');
    }
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      active: '#10b981',
      deploying: '#f59e0b',
      pending: '#64748b',
      failed: '#ef4444',
      suspended: '#64748b',
    };
    return colors[status as keyof typeof colors] || '#64748b';
  };

  const getTierColor = (tier: string): string => {
    const colors = {
      free: '#64748b',
      premium: '#8b5cf6',
      pro: '#f59e0b',
    };
    return colors[tier as keyof typeof colors] || '#64748b';
  };

  if (loading && !config) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading white-label settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show upgrade prompt for non-Pro users
  if (userTier !== 'pro') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>White-Label</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.upgradeContainer}>
          <Text style={styles.upgradeIcon}>🏢</Text>
          <Text style={styles.upgradeTitle}>White-Label Solutions</Text>
          <Text style={styles.upgradeDescription}>
            Create your own branded fashion app with complete customization
          </Text>

          <View style={styles.upgradeFeatures}>
            <View style={styles.upgradeFeature}>
              <Text style={styles.upgradeFeatureIcon}>✓</Text>
              <Text style={styles.upgradeFeatureText}>Custom domain & branding</Text>
            </View>
            <View style={styles.upgradeFeature}>
              <Text style={styles.upgradeFeatureIcon}>✓</Text>
              <Text style={styles.upgradeFeatureText}>Remove Styled branding</Text>
            </View>
            <View style={styles.upgradeFeature}>
              <Text style={styles.upgradeFeatureIcon}>✓</Text>
              <Text style={styles.upgradeFeatureText}>Multi-platform deployment</Text>
            </View>
            <View style={styles.upgradeFeature}>
              <Text style={styles.upgradeFeatureIcon}>✓</Text>
              <Text style={styles.upgradeFeatureText}>API access & integrations</Text>
            </View>
            <View style={styles.upgradeFeature}>
              <Text style={styles.upgradeFeatureIcon}>✓</Text>
              <Text style={styles.upgradeFeatureText}>SSO & enterprise features</Text>
            </View>
            <View style={styles.upgradeFeature}>
              <Text style={styles.upgradeFeatureIcon}>✓</Text>
              <Text style={styles.upgradeFeatureText}>Dedicated account manager</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>

          <Text style={styles.upgradeFooter}>
            White-label solutions are available exclusively for Pro members
          </Text>
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
        <Text style={styles.headerTitle}>White-Label</Text>
        <TouchableOpacity onPress={handleDeploy}>
          <Text style={styles.deployButton}>Deploy</Text>
        </TouchableOpacity>
      </View>

      {/* Status Banner */}
      {config && (
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(config.deployment.status) }]}>
          <Text style={styles.statusText}>
            {config.deployment.status.toUpperCase()}
          </Text>
          {config.deployment.lastDeployedAt && (
            <Text style={styles.statusSubtext}>
              Last deployed: {new Date(config.deployment.lastDeployedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalUsers.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.monthlyActiveUsers}</Text>
            <Text style={styles.statLabel}>MAU</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activeDeployments}</Text>
            <Text style={styles.statLabel}>Active</Text>
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
          style={[styles.tab, selectedTab === 'deployment' && styles.tabActive]}
          onPress={() => setSelectedTab('deployment')}
        >
          <Text style={[styles.tabText, selectedTab === 'deployment' && styles.tabTextActive]}>
            Deployment
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
        {selectedTab === 'overview' && config && (
          <>
            {/* Configuration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Configuration</Text>

              <View style={styles.configCard}>
                <Text style={styles.configLabel}>Business Name</Text>
                <Text style={styles.configValue}>{config.businessName}</Text>
              </View>

              <View style={styles.configCard}>
                <Text style={styles.configLabel}>Custom Domain</Text>
                <Text style={styles.configValue}>
                  {config.customDomain || 'Not configured'}
                </Text>
              </View>

              <View style={styles.configCard}>
                <Text style={styles.configLabel}>Subdomain</Text>
                <Text style={styles.configValue}>{config.subdomain}.styled-app.com</Text>
              </View>

              <View style={styles.configCard}>
                <Text style={styles.configLabel}>Platforms</Text>
                <View style={styles.platformTags}>
                  {config.platforms.map((platform) => (
                    <View key={platform} style={styles.platformTag}>
                      <Text style={styles.platformTagText}>
                        {platform === 'web' ? '🌐' : platform === 'ios' ? '📱' : '🤖'} {platform.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Features */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enabled Features</Text>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🌐</Text>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureName}>Custom Domain</Text>
                  <Text style={styles.featureDescription}>Use your own domain</Text>
                </View>
                <Text style={styles.featureStatus}>
                  {config.features.customDomain ? '✓' : '✗'}
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🎨</Text>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureName}>Remove Branding</Text>
                  <Text style={styles.featureDescription}>Hide Styled branding</Text>
                </View>
                <Text style={styles.featureStatus}>
                  {config.features.removeStyledBranding ? '✓' : '✗'}
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>📱</Text>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureName}>Custom Splash Screen</Text>
                  <Text style={styles.featureDescription}>Branded app launch</Text>
                </View>
                <Text style={styles.featureStatus}>
                  {config.features.customSplashScreen ? '✓' : '✗'}
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🔌</Text>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureName}>API Access</Text>
                  <Text style={styles.featureDescription}>RESTful API integration</Text>
                </View>
                <Text style={styles.featureStatus}>
                  {config.features.apiAccess ? '✓' : '✗'}
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🔐</Text>
                <View style={styles.featureInfo}>
                  <Text style={styles.featureName}>SSO Integration</Text>
                  <Text style={styles.featureDescription}>Single sign-on support</Text>
                </View>
                <Text style={styles.featureStatus}>
                  {config.features.ssoIntegration ? '✓' : '✗'}
                </Text>
              </View>
            </View>

            {/* Usage Stats */}
            {stats && features && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Usage & Limits</Text>

                <View style={styles.usageCard}>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageLabel}>API Calls</Text>
                    <Text style={styles.usageValue}>
                      {stats.apiCallsUsed.toLocaleString()} / {stats.apiCallsLimit.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${(stats.apiCallsUsed / stats.apiCallsLimit) * 100}%` },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.usageCard}>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageLabel}>Storage</Text>
                    <Text style={styles.usageValue}>
                      {stats.storageUsed} GB / {stats.storageLimit} GB
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${(stats.storageUsed / stats.storageLimit) * 100}%` },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.usageCard}>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageLabel}>Deployments</Text>
                    <Text style={styles.usageValue}>
                      {stats.activeDeployments} / {features.limits.deployments}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${(stats.activeDeployments / features.limits.deployments) * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Deployment Tab */}
        {selectedTab === 'deployment' && config && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deployment URLs</Text>

              {config.deployment.webUrl && (
                <View style={styles.urlCard}>
                  <Text style={styles.urlLabel}>🌐 Web App</Text>
                  <Text style={styles.urlValue}>{config.deployment.webUrl}</Text>
                  <TouchableOpacity style={styles.urlButton}>
                    <Text style={styles.urlButtonText}>Open →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {config.deployment.iosAppId && (
                <View style={styles.urlCard}>
                  <Text style={styles.urlLabel}>📱 iOS App</Text>
                  <Text style={styles.urlValue}>{config.deployment.iosAppId}</Text>
                  <TouchableOpacity style={styles.urlButton}>
                    <Text style={styles.urlButtonText}>View →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {config.deployment.androidAppId && (
                <View style={styles.urlCard}>
                  <Text style={styles.urlLabel}>🤖 Android App</Text>
                  <Text style={styles.urlValue}>{config.deployment.androidAppId}</Text>
                  <TouchableOpacity style={styles.urlButton}>
                    <Text style={styles.urlButtonText}>View →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>API Access</Text>

              <View style={styles.apiCard}>
                <Text style={styles.apiLabel}>API Endpoint</Text>
                <Text style={styles.apiValue}>https://api.styled-app.com/v1</Text>
              </View>

              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGenerateApiKey}
              >
                <Text style={styles.generateButtonText}>Generate API Key</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.docsButton}>
                <Text style={styles.docsButtonText}>View API Documentation →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deployment Actions</Text>

              <TouchableOpacity style={styles.actionButton} onPress={handleDeploy}>
                <Text style={styles.actionButtonText}>🚀 Deploy Now</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>📋 View Logs</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>📦 Export Configuration</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Settings Tab */}
        {selectedTab === 'settings' && config && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>App Settings</Text>

              <View style={styles.settingCard}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Allow User Signup</Text>
                  <Text style={styles.settingDescription}>Let users create accounts</Text>
                </View>
                <View style={[styles.toggle, config.settings.allowUserSignup && styles.toggleActive]}>
                  <Text style={styles.toggleText}>
                    {config.settings.allowUserSignup ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </View>

              <View style={styles.settingCard}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Email Verification</Text>
                  <Text style={styles.settingDescription}>Require email confirmation</Text>
                </View>
                <View style={[styles.toggle, config.settings.requireEmailVerification && styles.toggleActive]}>
                  <Text style={styles.toggleText}>
                    {config.settings.requireEmailVerification ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </View>

              <View style={styles.settingCard}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Social Login</Text>
                  <Text style={styles.settingDescription}>Enable Google/Facebook login</Text>
                </View>
                <View style={[styles.toggle, config.settings.enableSocialLogin && styles.toggleActive]}>
                  <Text style={styles.toggleText}>
                    {config.settings.enableSocialLogin ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Legal Pages</Text>

              <View style={styles.legalCard}>
                <Text style={styles.legalLabel}>Terms of Service</Text>
                <Text style={styles.legalValue}>
                  {config.settings.customTermsUrl || 'Using default'}
                </Text>
              </View>

              <View style={styles.legalCard}>
                <Text style={styles.legalLabel}>Privacy Policy</Text>
                <Text style={styles.legalValue}>
                  {config.settings.customPrivacyUrl || 'Using default'}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Danger Zone</Text>

              <TouchableOpacity style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>Suspend Deployment</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>Delete Configuration</Text>
              </TouchableOpacity>
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
  deployButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  statusBanner: {
    padding: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 11,
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
    marginBottom: 16,
  },
  configCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  configValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  platformTags: {
    flexDirection: 'row',
    gap: 8,
  },
  platformTag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  platformTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7c3aed',
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  featureStatus: {
    fontSize: 20,
    marginLeft: 8,
  },
  usageCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  usageValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
  },
  urlCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  urlLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  urlValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  urlButton: {
    alignSelf: 'flex-start',
  },
  urlButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  apiCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  apiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  apiValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  generateButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  docsButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  docsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  actionButton: {
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
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
  settingDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  toggle: {
    backgroundColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  toggleActive: {
    backgroundColor: '#10b981',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  legalCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  legalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
  },
  legalValue: {
    fontSize: 13,
    color: '#0f172a',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  upgradeContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  upgradeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  upgradeDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  upgradeFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  upgradeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  upgradeFeatureIcon: {
    fontSize: 20,
    color: '#10b981',
    marginRight: 12,
    width: 24,
  },
  upgradeFeatureText: {
    fontSize: 15,
    color: '#0f172a',
  },
  upgradeButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  upgradeFooter: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

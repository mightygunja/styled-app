import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  customBrandingService,
  CustomBranding,
  BrandingTemplate,
  BrandingFeatures,
} from '../services/customBrandingService';
import { subscriptionService } from '../services/subscriptionService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CustomBrandingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<CustomBranding | null>(null);
  const [templates, setTemplates] = useState<BrandingTemplate[]>([]);
  const [features, setFeatures] = useState<BrandingFeatures | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'premium' | 'pro'>('free');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'templates' | 'customize'>('overview');
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const subscription = await subscriptionService.getUserSubscription(getCurrentUserId());
      setUserTier(subscription.tier);

      const [brandingData, templatesData, featuresData] = await Promise.all([
        customBrandingService.getUserBranding(getCurrentUserId()),
        customBrandingService.getBrandingTemplates(subscription.tier),
        customBrandingService.getBrandingFeatures(subscription.tier),
      ]);

      setBranding(brandingData);
      setTemplates(templatesData);
      setFeatures(featuresData);
      
      if (brandingData) {
        setBusinessName(brandingData.businessName);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
      showToast('Failed to load branding', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      showToast('Applying template...', 'info');
      const updated = await customBrandingService.applyTemplate(getCurrentUserId(), templateId);
      setBranding(updated);
      showToast('Template applied successfully!', 'success');
    } catch (error) {
      console.error('Error applying template:', error);
      showToast('Failed to apply template', 'error');
    }
  };

  const handleExportBrandKit = async () => {
    try {
      showToast('Exporting brand kit...', 'info');
      await customBrandingService.exportBrandKit(getCurrentUserId());
      showToast('Brand kit exported!', 'success');
    } catch (error) {
      console.error('Error exporting:', error);
      showToast('Failed to export brand kit', 'error');
    }
  };

  const handleUpdateBusinessName = async () => {
    if (!branding) return;
    
    try {
      const updated = await customBrandingService.updateBranding(branding.id, {
        businessName,
      });
      setBranding(updated);
      setEditingBusinessName(false);
      showToast('Business name updated!', 'success');
    } catch (error) {
      console.error('Error updating:', error);
      showToast('Failed to update', 'error');
    }
  };

  const getTierColor = (tier: string): string => {
    const colors = {
      free: '#64748b',
      premium: '#8b5cf6',
      pro: '#f59e0b',
    };
    return colors[tier as keyof typeof colors] || '#64748b';
  };

  if (loading && !branding) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading branding...</Text>
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
        <Text style={styles.headerTitle}>Custom Branding</Text>
        <TouchableOpacity onPress={handleExportBrandKit}>
          <Text style={[styles.exportButton, !features?.features.exportBrandKit && styles.exportButtonDisabled]}>
            Export
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tier Badge */}
      <View style={[styles.tierBanner, { backgroundColor: getTierColor(userTier) }]}>
        <Text style={styles.tierBannerText}>
          {userTier.toUpperCase()} MEMBER
        </Text>
        {userTier === 'free' && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade →</Text>
          </TouchableOpacity>
        )}
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
          style={[styles.tab, selectedTab === 'templates' && styles.tabActive]}
          onPress={() => setSelectedTab('templates')}
        >
          <Text style={[styles.tabText, selectedTab === 'templates' && styles.tabTextActive]}>
            Templates
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'customize' && styles.tabActive]}
          onPress={() => setSelectedTab('customize')}
        >
          <Text style={[styles.tabText, selectedTab === 'customize' && styles.tabTextActive]}>
            Customize
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Overview Tab */}
        {selectedTab === 'overview' && branding && (
          <>
            {/* Current Branding */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Brand Identity</Text>

              {/* Business Name */}
              <View style={styles.brandCard}>
                <Text style={styles.brandLabel}>Business Name</Text>
                {editingBusinessName ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.input}
                      value={businessName}
                      onChangeText={setBusinessName}
                      placeholder="Enter business name"
                    />
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleUpdateBusinessName}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.valueContainer}>
                    <Text style={styles.brandValue}>{branding.businessName}</Text>
                    {features?.features.customMessaging && (
                      <TouchableOpacity onPress={() => setEditingBusinessName(true)}>
                        <Text style={styles.editButton}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Logo */}
              {branding.logo && (
                <View style={styles.brandCard}>
                  <Text style={styles.brandLabel}>Logo</Text>
                  <Image source={{ uri: branding.logo.url }} style={styles.logoPreview} />
                </View>
              )}

              {/* Colors */}
              <View style={styles.brandCard}>
                <Text style={styles.brandLabel}>Brand Colors</Text>
                <View style={styles.colorGrid}>
                  {Object.entries(branding.colors).slice(0, 4).map(([name, color]) => (
                    <View key={name} style={styles.colorItem}>
                      <View style={[styles.colorSwatch, { backgroundColor: color }]} />
                      <Text style={styles.colorName}>{name}</Text>
                      <Text style={styles.colorHex}>{color}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Fonts */}
              <View style={styles.brandCard}>
                <Text style={styles.brandLabel}>Typography</Text>
                <View style={styles.fontList}>
                  <View style={styles.fontItem}>
                    <Text style={styles.fontLabel}>Heading:</Text>
                    <Text style={styles.fontValue}>{branding.fonts.heading}</Text>
                  </View>
                  <View style={styles.fontItem}>
                    <Text style={styles.fontLabel}>Body:</Text>
                    <Text style={styles.fontValue}>{branding.fonts.body}</Text>
                  </View>
                  <View style={styles.fontItem}>
                    <Text style={styles.fontLabel}>Accent:</Text>
                    <Text style={styles.fontValue}>{branding.fonts.accent}</Text>
                  </View>
                </View>
              </View>

              {/* Messaging */}
              <View style={styles.brandCard}>
                <Text style={styles.brandLabel}>Brand Messaging</Text>
                <View style={styles.messagingContainer}>
                  <Text style={styles.tagline}>"{branding.messaging.tagline}"</Text>
                  <Text style={styles.description}>{branding.messaging.description}</Text>
                  <View style={styles.toneContainer}>
                    <Text style={styles.toneLabel}>Tone:</Text>
                    <Text style={styles.toneValue}>{branding.messaging.tone}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Features */}
            {features && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Available Features</Text>
                
                <View style={styles.featureCard}>
                  <Text style={styles.featureIcon}>🎨</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureName}>Custom Logo</Text>
                    <Text style={styles.featureDescription}>Upload your own logo</Text>
                  </View>
                  <Text style={styles.featureStatus}>
                    {features.features.customLogo ? '✓' : '🔒'}
                  </Text>
                </View>

                <View style={styles.featureCard}>
                  <Text style={styles.featureIcon}>🎨</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureName}>Custom Colors</Text>
                    <Text style={styles.featureDescription}>Define your color palette</Text>
                  </View>
                  <Text style={styles.featureStatus}>
                    {features.features.customColors ? '✓' : '🔒'}
                  </Text>
                </View>

                <View style={styles.featureCard}>
                  <Text style={styles.featureIcon}>✍️</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureName}>Custom Fonts</Text>
                    <Text style={styles.featureDescription}>Choose your typography</Text>
                  </View>
                  <Text style={styles.featureStatus}>
                    {features.features.customFonts ? '✓' : '🔒'}
                  </Text>
                </View>

                <View style={styles.featureCard}>
                  <Text style={styles.featureIcon}>📦</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureName}>Export Brand Kit</Text>
                    <Text style={styles.featureDescription}>Download all assets</Text>
                  </View>
                  <Text style={styles.featureStatus}>
                    {features.features.exportBrandKit ? '✓' : '🔒'}
                  </Text>
                </View>

                <View style={styles.featureCard}>
                  <Text style={styles.featureIcon}>📋</Text>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureName}>Brand Guidelines</Text>
                    <Text style={styles.featureDescription}>Professional usage guide</Text>
                  </View>
                  <Text style={styles.featureStatus}>
                    {features.features.brandGuidelines ? '✓' : '🔒'}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Templates Tab */}
        {selectedTab === 'templates' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Brand Templates</Text>
            <Text style={styles.sectionSubtitle}>
              {features?.features.templateCount === -1 
                ? 'Unlimited templates available'
                : `${features?.features.templateCount} templates available`}
            </Text>

            {templates.map((template) => (
              <View key={template.id} style={styles.templateCard}>
                <Image source={{ uri: template.previewUrl }} style={styles.templateImage} />
                
                <View style={styles.templateInfo}>
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    {template.isPremium && (
                      <View style={styles.premiumBadge}>
                        <Text style={styles.premiumBadgeText}>PRO</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.templateDescription}>{template.description}</Text>
                  
                  <View style={styles.templateColors}>
                    {Object.values(template.colors).slice(0, 4).map((color, idx) => (
                      <View
                        key={idx}
                        style={[styles.templateColorSwatch, { backgroundColor: color }]}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => handleApplyTemplate(template.id)}
                  >
                    <Text style={styles.applyButtonText}>Apply Template</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {userTier === 'free' && (
              <TouchableOpacity
                style={styles.upgradeCard}
                onPress={() => navigation.navigate('Subscription')}
              >
                <Text style={styles.upgradeCardTitle}>Unlock More Templates</Text>
                <Text style={styles.upgradeCardText}>
                  Upgrade to Premium for access to all templates
                </Text>
                <Text style={styles.upgradeCardButton}>Upgrade Now →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Customize Tab */}
        {selectedTab === 'customize' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customize Your Brand</Text>

            {!features?.features.customColors ? (
              <View style={styles.lockedCard}>
                <Text style={styles.lockedIcon}>🔒</Text>
                <Text style={styles.lockedTitle}>Custom Branding Locked</Text>
                <Text style={styles.lockedText}>
                  Upgrade to Premium to customize your brand colors, fonts, and more
                </Text>
                <TouchableOpacity
                  style={styles.lockedButton}
                  onPress={() => navigation.navigate('Subscription')}
                >
                  <Text style={styles.lockedButtonText}>Upgrade to Premium</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.customizeCard}>
                  <Text style={styles.customizeLabel}>🎨 Color Palette</Text>
                  <Text style={styles.customizeDescription}>
                    Customize your brand colors to match your style
                  </Text>
                  <TouchableOpacity style={styles.customizeButton}>
                    <Text style={styles.customizeButtonText}>Edit Colors</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.customizeCard}>
                  <Text style={styles.customizeLabel}>✍️ Typography</Text>
                  <Text style={styles.customizeDescription}>
                    Choose fonts that represent your brand
                  </Text>
                  <TouchableOpacity style={styles.customizeButton}>
                    <Text style={styles.customizeButtonText}>Edit Fonts</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.customizeCard}>
                  <Text style={styles.customizeLabel}>🖼️ Logo Upload</Text>
                  <Text style={styles.customizeDescription}>
                    Upload your custom logo (PNG, SVG, or JPG)
                  </Text>
                  <TouchableOpacity style={styles.customizeButton}>
                    <Text style={styles.customizeButtonText}>Upload Logo</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.customizeCard}>
                  <Text style={styles.customizeLabel}>💬 Brand Messaging</Text>
                  <Text style={styles.customizeDescription}>
                    Define your tagline and brand voice
                  </Text>
                  <TouchableOpacity style={styles.customizeButton}>
                    <Text style={styles.customizeButtonText}>Edit Messaging</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  exportButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  exportButtonDisabled: {
    color: '#cbd5e1',
  },
  tierBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  tierBannerText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  upgradeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  upgradeButtonText: {
    fontSize: 12,
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
  brandCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  brandLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  brandValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  editContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  saveButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  logoPreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    alignItems: 'center',
    width: 70,
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  colorName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  colorHex: {
    fontSize: 10,
    color: '#64748b',
  },
  fontList: {
    gap: 8,
  },
  fontItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fontLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  fontValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  messagingContainer: {
    gap: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#0f172a',
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  toneContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  toneLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  toneValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
    textTransform: 'capitalize',
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
    fontSize: 32,
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
  templateCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  templateImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#e2e8f0',
  },
  templateInfo: {
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
    fontWeight: 'bold',
    color: '#0f172a',
  },
  premiumBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  templateDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  templateColors: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  templateColorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  applyButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  upgradeCard: {
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  upgradeCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  upgradeCardText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 16,
    textAlign: 'center',
  },
  upgradeCardButton: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  lockedCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  lockedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  lockedText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  lockedButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  lockedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  customizeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  customizeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  customizeDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  customizeButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  customizeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});

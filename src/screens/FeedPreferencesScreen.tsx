import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { socialFeedService, FeedPreferences, PostType } from '../services/socialFeedService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FeedPreferencesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [preferences, setPreferences] = useState<FeedPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newHashtag, setNewHashtag] = useState('');
  const { toast, showToast, hideToast } = useToast();

  const contentTypes: { type: PostType; label: string; emoji: string }[] = [
    { type: 'transformation', label: 'Transformations', emoji: '◈' },
    { type: 'outfit', label: 'Outfits', emoji: '◉' },
    { type: 'closet', label: 'Closet Tours', emoji: '▭' },
    { type: 'tip', label: 'Style Tips', emoji: '◎' },
    { type: 'product', label: 'Products', emoji: '◇' },
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await socialFeedService.getFeedPreferences(getCurrentUserId());
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      showToast('Failed to load preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      await socialFeedService.updateFeedPreferences(preferences);
      showToast('Preferences saved!', 'success');
    } catch (error) {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleContentType = (type: PostType) => {
    if (!preferences) return;

    const types = preferences.contentTypes.includes(type)
      ? preferences.contentTypes.filter(t => t !== type)
      : [...preferences.contentTypes, type];

    setPreferences({ ...preferences, contentTypes: types });
  };

  const addHashtag = () => {
    if (!preferences || !newHashtag.trim()) return;

    const hashtag = newHashtag.trim().replace('#', '').toLowerCase();
    if (preferences.followedHashtags.includes(hashtag)) {
      showToast('Already following this hashtag', 'error');
      return;
    }

    setPreferences({
      ...preferences,
      followedHashtags: [...preferences.followedHashtags, hashtag],
    });
    setNewHashtag('');
  };

  const removeHashtag = (hashtag: string) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      followedHashtags: preferences.followedHashtags.filter(h => h !== hashtag),
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tobacco} />
        </View>
      </SafeAreaView>
    );
  }

  if (!preferences) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load preferences</Text>
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
        <Text style={styles.headerTitle}>Feed Preferences</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Content Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Types</Text>
          <Text style={styles.sectionSubtitle}>Choose what you want to see</Text>
          
          {contentTypes.map(({ type, label, emoji }) => (
            <TouchableOpacity
              key={type}
              style={styles.contentTypeItem}
              onPress={() => toggleContentType(type)}
            >
              <View style={styles.contentTypeInfo}>
                <Text style={styles.contentTypeEmoji}>{emoji}</Text>
                <Text style={styles.contentTypeLabel}>{label}</Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  preferences.contentTypes.includes(type) && styles.checkboxChecked,
                ]}
              >
                {preferences.contentTypes.includes(type) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Followed Hashtags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Followed Hashtags</Text>
          <Text style={styles.sectionSubtitle}>See more posts with these hashtags</Text>
          
          <View style={styles.hashtagInput}>
            <TextInput
              style={styles.input}
              placeholder="Add hashtag..."
              placeholderTextColor={colors.inkFaint}
              value={newHashtag}
              onChangeText={setNewHashtag}
              onSubmitEditing={addHashtag}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.addButton, !newHashtag.trim() && styles.addButtonDisabled]}
              onPress={addHashtag}
              disabled={!newHashtag.trim()}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hashtagsList}>
            {preferences.followedHashtags.map((hashtag, index) => (
              <View key={index} style={styles.hashtagChip}>
                <Text style={styles.hashtagText}>#{hashtag}</Text>
                <TouchableOpacity onPress={() => removeHashtag(hashtag)}>
                  <Text style={styles.removeButton}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {preferences.followedHashtags.length === 0 && (
              <Text style={styles.emptyText}>No hashtags followed yet</Text>
            )}
          </View>
        </View>

        {/* Feed Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feed Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Show Trending Posts</Text>
              <Text style={styles.settingDescription}>
                See popular posts from the community
              </Text>
            </View>
            <Switch
              value={preferences.showTrending}
              onValueChange={(value) =>
                setPreferences({ ...preferences, showTrending: value })
              }
              trackColor={{ false: colors.hair, true: colors.ink }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Following Only</Text>
              <Text style={styles.settingDescription}>
                Only show posts from people you follow
              </Text>
            </View>
            <Switch
              value={preferences.showFollowingOnly}
              onValueChange={(value) =>
                setPreferences({ ...preferences, showFollowingOnly: value })
              }
              trackColor={{ false: colors.hair, true: colors.ink }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Your feed is personalized based on your preferences, interactions, and the people you follow.
            Adjust these settings to see more of what you love!
          </Text>
        </View>

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
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
  saveButton: {
    fontSize: 16,
    color: colors.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  saveButtonDisabled: {
    opacity: 0.5,
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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 16,
  },
  contentTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  contentTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contentTypeEmoji: {
    fontSize: 24,
  },
  contentTypeLabel: {
    fontSize: 16,
    color: colors.ink,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.hair,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  hashtagInput: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  addButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: colors.hair,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  hashtagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sand,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 6,
  },
  hashtagText: {
    fontSize: 14,
    color: colors.tobacco,
    fontFamily: fonts.sansSemiBold,
  },
  removeButton: {
    fontSize: 16,
    color: colors.inkMuted,
    fontFamily: fonts.sansSemiBold,
  },
  emptyText: {
    fontSize: 14,
    color: colors.inkFaint,
    fontStyle: 'italic',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  infoSection: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: colors.sand,
    margin: 20,
    borderRadius: radius.md,
    gap: 12,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.tobacco,
    lineHeight: 20,
  },
});

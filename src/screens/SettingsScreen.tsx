import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import { colors, fonts, type as textType } from '../theme/designSystem';
import { userSettingsService, UserSettings, DEFAULT_USER_SETTINGS } from '../services/userSettingsService';
import { getCurrentUserId } from '../services/api';

/**
 * Only settings the app actually reads live here. This screen used to carry
 * accessibility, language, push/email and offline-cache rows whose switches
 * persisted a bit that nothing read back - they flipped, saved, reloaded, and
 * changed no behavior anywhere. Those rows are gone until the behavior they
 * name exists.
 */
export default function SettingsScreen() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await userSettingsService.get(getCurrentUserId());
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (key: keyof UserSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await userSettingsService.update(getCurrentUserId(), { [key]: next[key] });
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><BackButton /></View>
        <View style={styles.loadingBox}><ActivityIndicator size="large" color={colors.ink} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><BackButton /></View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionLabel}>SOCIAL FEED</Text>
        <View style={styles.card}>
          <ToggleRow
            label="Show following only"
            value={settings.feedShowFollowingOnly}
            onToggle={() => toggle('feedShowFollowingOnly')}
            last
          />
        </View>
        <Text style={styles.sectionNote}>
          When this is on, your feed keeps posts from people you follow and your own.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({ label, value, onToggle, last }: { label: string; value: boolean; onToggle: () => void; last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: colors.camel }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: 20, paddingTop: 12 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, marginBottom: 8 },
  sectionLabel: { ...textType.eyebrow, marginTop: 24, marginBottom: 12 },
  card: { borderTopWidth: 1, borderTopColor: colors.hair },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.hair,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  sectionNote: { ...textType.meta, marginTop: 8 },
});

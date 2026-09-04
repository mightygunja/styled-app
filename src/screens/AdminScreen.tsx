/**
 * Admin hub.
 *
 * One place for the things only 33 Trends staff do. Built as a hub rather than a
 * single screen because the list will grow - stylist approvals and affiliate
 * performance are the first two, ops actions and moderation will follow.
 *
 * The entry point in Account is hidden for non-admins, but the gate that
 * matters is server-side: every action here calls a function that re-checks
 * the uid allowlist.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from '../components/BackButton';
import { RootStackParamList } from '../navigation/types';
import { adminService } from '../services/adminService';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AdminEntry {
  label: string;
  detail: string;
  route: keyof RootStackParamList;
  eyebrow: string;
}

const ENTRIES: AdminEntry[] = [
  {
    eyebrow: 'EDITORIAL',
    label: 'Trend desk',
    detail: 'Draft the trend report with AI, review it, and publish what users see everywhere.',
    route: 'TrendDeskAdmin',
  },
  {
    eyebrow: 'REVENUE',
    label: 'Affiliate performance',
    detail: 'Impressions, outbound clicks and tap-through by surface, plus recorded payouts.',
    route: 'AffiliateAnalytics',
  },
  {
    eyebrow: 'PEOPLE',
    label: 'Stylist applications',
    detail: 'Review applications and grant stylist status.',
    route: 'StylistApplicationsAdmin',
  },
];

export default function AdminScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    adminService
      .isAdmin()
      .then(setAllowed)
      .finally(() => setChecking(false));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>33 TRENDS</Text>
        <Text style={styles.title}>Admin</Text>
        <Text style={styles.subtitle}>Internal tools. Not visible to anyone else.</Text>

        {checking ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : !allowed ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Not an admin</Text>
            <Text style={styles.emptyText}>
              This area is limited to 33 Trends admins. If that should be you, your uid needs adding to
              the admin allowlist.
            </Text>
          </View>
        ) : (
          ENTRIES.map(entry => (
            <TouchableOpacity
              key={entry.route}
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(entry.route as any)}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowEyebrow}>{entry.eyebrow}</Text>
                <Text style={styles.rowLabel}>{entry.label}</Text>
                <Text style={styles.rowDetail}>{entry.detail}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  busyBox: { paddingVertical: 80, alignItems: 'center' },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12, marginBottom: spacing.lg },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  rowText: { flex: 1, marginRight: spacing.sm },
  rowEyebrow: { ...textType.eyebrow, fontSize: 9, marginBottom: 6 },
  rowLabel: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  rowDetail: { ...textType.meta, fontSize: 12, lineHeight: 18, marginTop: 4 },
  chevron: { fontSize: 20, color: colors.inkFaint },

  emptyBox: {
    borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
});

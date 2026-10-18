/**
 * Admin > Members: every account, when it joined, when it was last in, and
 * what it has done. The question this answers is the one the beta kept
 * raising - "did the people who signed up actually use it?" - without a
 * trip to the Firebase console.
 *
 * Read-only. Data comes from getMemberActivity (admin-gated server-side);
 * nothing here can change an account.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { adminService, MemberActivity, MemberActivityReport } from '../services/adminService';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

type Filter = 'all' | 'never-returned' | 'with-closet';

const DAY = 24 * 60 * 60 * 1000;

function fmtDate(ms: number | null): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function lastSeen(m: MemberActivity): number {
  return Math.max(m.lastActiveAt || 0, m.lastRefreshAt || 0, m.lastSignInAt || 0);
}

function returned(m: MemberActivity): boolean {
  return !!m.createdAt && lastSeen(m) - m.createdAt > 60 * 60 * 1000;
}

function providerLabel(provider: string): string {
  if (provider.startsWith('google')) return 'Google';
  if (provider.startsWith('apple')) return 'Apple';
  if (provider.startsWith('facebook')) return 'Facebook';
  return 'Email';
}

function n(value: number | null): string {
  return value === null ? '?' : String(value);
}

export default function AdminMembersScreen() {
  const [report, setReport] = useState<MemberActivityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setReport(await adminService.memberActivity());
    } catch (error: any) {
      if (String(error?.code || '').includes('permission-denied')) setDenied(true);
      else setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const members = (report?.members || []).filter(m => {
    if (filter === 'never-returned') return !returned(m);
    if (filter === 'with-closet') return (m.counts.closetItems || 0) > 0;
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.ink} />}
      >
        <Text style={styles.eyebrow}>ADMIN · PEOPLE</Text>
        <Text style={styles.title}>Members</Text>
        <Text style={styles.subtitle}>
          Every account, newest first: when they joined, when they were last in, and what they have done.
        </Text>

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
            <Text style={styles.busyText}>Counting across every account…</Text>
          </View>
        ) : denied ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Not an admin</Text>
            <Text style={styles.emptyText}>This page is limited to 33 Trends admins.</Text>
          </View>
        ) : failed || !report ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Couldn't load members</Text>
            <Text style={styles.emptyText}>Check your connection and try again.</Text>
            <Button title="Try again" variant="outline" onPress={load} style={{ marginTop: spacing.md }} />
          </View>
        ) : (
          <>
            <View style={styles.tiles}>
              <Tile value={report.summary.total} label="Accounts" />
              <Tile value={report.summary.newLast7Days} label="New, 7 days" />
              <Tile value={report.summary.returned} label="Came back" />
              <Tile value={report.summary.withCloset} label="Added clothes" />
              <Tile value={report.summary.surveyDone} label="Did the survey" />
              <Tile value={report.summary.activeLast7Days} label="Active, 7 days" />
            </View>
            <Text style={styles.footnote}>
              "Came back" means the account was seen at least an hour after it was created. "Last in" is
              the latest of a sign-in, a token refresh, or the app's own session record (which older builds
              do not write). Counts marked ? could not be read.
            </Text>

            <View style={styles.filters}>
              {([
                ['all', 'All'],
                ['never-returned', 'Never came back'],
                ['with-closet', 'Added clothes'],
              ] as Array<[Filter, string]>).map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  accessibilityRole="button"
                  style={[styles.chip, filter === value && styles.chipActive]}
                  onPress={() => setFilter(value)}
                >
                  <Text style={[styles.chipText, filter === value && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {members.length === 0 ? (
              <Text style={styles.emptyText}>Nobody matches this filter.</Text>
            ) : (
              members.map(m => <MemberRow key={m.uid} member={m} />)
            )}
            <Text style={styles.footnote}>
              Generated {new Date(report.generatedAt).toLocaleString()}. Pull down to refresh.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

function MemberRow({ member: m }: { member: MemberActivity }) {
  const came = returned(m);
  const seen = lastSeen(m);
  const stale = seen ? Date.now() - seen > 14 * DAY : true;
  const device = [m.lastPlatform, m.lastAppVersion].filter(Boolean).join(' ');
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{m.displayName || m.email || m.uid}</Text>
          {!!m.displayName && !!m.email && <Text style={styles.email}>{m.email}</Text>}
        </View>
        <View style={[styles.badge, came ? styles.badgeGood : styles.badgeQuiet]}>
          <Ionicons name={came ? 'repeat-outline' : 'exit-outline'} size={12} color={came ? colors.white : colors.inkMuted} />
          <Text style={[styles.badgeText, came && styles.badgeTextGood]}>{came ? 'Came back' : 'One visit'}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        Joined {fmtDate(m.createdAt)} · {providerLabel(m.provider)} · last in {fmtDate(seen || null)}
        {stale ? '' : ' · recent'}
        {device ? ` · ${device}` : ''}
        {m.wardrobeFocus ? ` · ${m.wardrobeFocus}` : ''}
        {m.disabled ? ' · DISABLED' : ''}
      </Text>
      <View style={styles.stats}>
        <Stat label="Closet" value={n(m.counts.closetItems)} strong={(m.counts.closetItems || 0) > 0} />
        <Stat label="Outfits" value={n(m.counts.outfits)} strong={(m.counts.outfits || 0) > 0} />
        <Stat label="Saved" value={n(m.counts.wishlistItems)} strong={(m.counts.wishlistItems || 0) > 0} />
        <Stat label="Shop taps" value={n(m.counts.affiliateClicks)} strong={(m.counts.affiliateClicks || 0) > 0} />
        <Stat label="Posts" value={n(m.counts.posts)} strong={(m.counts.posts || 0) > 0} />
        <Stat label="Survey" value={m.surveyDone ? 'done' : '—'} strong={m.surveyDone} />
      </View>
    </View>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, strong && styles.statValueStrong]}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60, width: '100%', maxWidth: 820, alignSelf: 'center' },
  busyBox: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  busyText: { ...textType.meta, color: colors.inkMuted },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12, marginBottom: spacing.lg },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tileValue: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  tileLabel: { ...textType.eyebrow, fontSize: 9, marginTop: 4 },
  footnote: { ...textType.meta, fontSize: 11, lineHeight: 16, color: colors.inkFaint, marginTop: spacing.sm },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.lg, marginBottom: spacing.sm },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12, letterSpacing: 0.3, color: colors.ink },
  chipTextActive: { color: colors.bone },

  row: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.hair },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink },
  email: { ...textType.meta, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGood: { backgroundColor: colors.rust },
  badgeQuiet: { backgroundColor: colors.sand },
  badgeText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.inkMuted },
  badgeTextGood: { color: colors.white },
  meta: { ...textType.meta, fontSize: 12, lineHeight: 18, color: colors.inkMuted, marginTop: 6 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  stat: { minWidth: 56 },
  statValue: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.inkFaint },
  statValueStrong: { color: colors.ink },
  statLabel: { ...textType.eyebrow, fontSize: 8, marginTop: 2 },

  emptyBox: { borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.lg, marginTop: spacing.md },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
});

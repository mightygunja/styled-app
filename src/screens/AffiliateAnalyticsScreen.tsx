/**
 * Affiliate performance.
 *
 * The honest shape of this screen matters more than the layout. The app can
 * measure two things: how many products were shown, and how many outbound
 * clicks followed. It cannot see whether a click became an order, whether that
 * order survived the return window, or what it paid - only Sovrn and Rakuten
 * know that, and only on their own reporting schedule.
 *
 * So the screen is split. Activity is measured. Money is recorded from network
 * reports and clearly labelled as such. The flat-rate "potential" figure is
 * shown once, named as a guess, and never added up as revenue.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Chip from '../components/Chip';
import { adminService, AffiliateAnalytics } from '../services/adminService';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

const RANGES = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pct = (n: number | null, digits = 1) =>
  n === null || !isFinite(n) ? '—' : `${(n * 100).toFixed(digits)}%`;

export default function AffiliateAnalyticsScreen() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AffiliateAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [denied, setDenied] = useState(false);

  // Manual entry of a real payout.
  const [period, setPeriod] = useState('');
  const [network, setNetwork] = useState('');
  const [gross, setGross] = useState('');
  const [returned, setReturned] = useState('');
  const [orders, setOrders] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDenied(false);
      setData(await adminService.getAffiliateAnalytics(days));
    } catch (error: any) {
      if (String(error?.code || '').includes('permission-denied')) setDenied(true);
      else console.error('Error loading affiliate analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRecord = async () => {
    setSaveError(null);
    if (!/^\d{4}-\d{2}$/.test(period)) {
      setSaveError('Period must be YYYY-MM.');
      return;
    }
    if (!network.trim()) {
      setSaveError('Network is required.');
      return;
    }
    setSaving(true);
    try {
      await adminService.recordAffiliateRevenue({
        period,
        network: network.trim(),
        gross: Number(gross) || 0,
        returns: Number(returned) || 0,
        orders: Number(orders) || 0,
      });
      setPeriod('');
      setNetwork('');
      setGross('');
      setReturned('');
      setOrders('');
      await load();
    } catch (error: any) {
      setSaveError(error?.message || 'Could not record that.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.ink} />
        }
      >
        <Text style={styles.eyebrow}>ADMIN · REVENUE</Text>
        <Text style={styles.title}>Affiliate performance</Text>
        <Text style={styles.subtitle}>
          What the app can see is activity. What it earned comes from the network reports below.
        </Text>

        {denied ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Admins only</Text>
            <Text style={styles.emptyText}>Your account is not on the admin allowlist.</Text>
          </View>
        ) : loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : !data ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Couldn't load</Text>
            <Text style={styles.emptyText}>Pull down to try again.</Text>
          </View>
        ) : (
          <>
            <View style={styles.rangeRow}>
              {RANGES.map(r => (
                <Chip
                  key={r.value}
                  label={r.label}
                  active={days === r.value}
                  onPress={() => setDays(r.value)}
                  style={styles.rangeChip}
                />
              ))}
            </View>

            {/* Stated before any number, because a screen full of clicks from
                a placeholder catalogue looks exactly like a screen full of
                real ones. */}
            {data.totals.mockShare !== null && data.totals.mockShare > 0 && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  {pct(data.totals.mockShare, 0)} of these clicks came from the sample catalogue, so
                  they earned nothing. Connect a retail partner before reading anything into these
                  figures.
                </Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>ACTIVITY · LAST {data.days} DAYS</Text>
            <View style={styles.statGrid}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.totals.impressions.toLocaleString()}</Text>
                <Text style={styles.statLabel}>SHOWN</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.totals.clicks.toLocaleString()}</Text>
                <Text style={styles.statLabel}>CLICKED OUT</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {pct(
                    data.totals.impressions > 0
                      ? data.totals.clicks / data.totals.impressions
                      : null
                  )}
                </Text>
                <Text style={styles.statLabel}>TAP-THROUGH</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{data.totals.uniqueUsers.toLocaleString()}</Text>
                <Text style={styles.statLabel}>PEOPLE</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>BY SURFACE</Text>
            <Text style={styles.sectionNote}>
              Which part of the app sends people to retailers, and how efficiently.
            </Text>
            {data.surfaces.length === 0 ? (
              <Text style={styles.bodyText}>No clicks recorded in this window.</Text>
            ) : (
              data.surfaces.map(s => (
                <View key={s.surface} style={styles.tableRow}>
                  <View style={styles.tableMain}>
                    <Text style={styles.tableLabel}>{s.surface}</Text>
                    <Text style={styles.tableMeta}>
                      {s.impressions.toLocaleString()} shown · {s.clicks.toLocaleString()} clicked ·{' '}
                      {money(s.clickValue)} of goods
                    </Text>
                  </View>
                  <Text style={styles.tableValue}>{pct(s.tapThrough)}</Text>
                </View>
              ))
            )}

            {data.reasons.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>BY REASON SHOWN</Text>
                <Text style={styles.sectionNote}>
                  Which argument actually persuades people. This is the number worth optimising.
                </Text>
                {data.reasons.map(r => (
                  <View key={r.reason} style={styles.tableRow}>
                    <View style={styles.tableMain}>
                      <Text style={styles.tableLabel} numberOfLines={2}>
                        {r.reason}
                      </Text>
                      <Text style={styles.tableMeta}>{money(r.clickValue)} of goods</Text>
                    </View>
                    <Text style={styles.tableValue}>{r.clicks}</Text>
                  </View>
                ))}
              </>
            )}

            {data.retailers.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>BY RETAILER</Text>
                {data.retailers.map(r => (
                  <View key={r.retailer} style={styles.tableRow}>
                    <View style={styles.tableMain}>
                      <Text style={styles.tableLabel}>{r.retailer}</Text>
                      <Text style={styles.tableMeta}>{money(r.clickValue)} of goods</Text>
                    </View>
                    <Text style={styles.tableValue}>{r.clicks}</Text>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.sectionLabel}>RECORDED EARNINGS</Text>
            <Text style={styles.sectionNote}>
              Entered from Sovrn and Rakuten reports. The app cannot see orders, returns or payouts,
              so nothing here is inferred.
            </Text>

            <View style={styles.figureBox}>
              <Text style={styles.figureValue}>{money(data.recorded.net)}</Text>
              <Text style={styles.figureUnit}>net, all recorded periods</Text>
              <Text style={styles.figureNote}>
                {data.recorded.orders.toLocaleString()} orders ·{' '}
                {data.recorded.conversion !== null
                  ? `${pct(data.recorded.conversion, 2)} of clicks converted`
                  : 'conversion needs both clicks and recorded orders'}
                {data.recorded.revenuePerClick !== null
                  ? ` · $${data.recorded.revenuePerClick.toFixed(3)} per click`
                  : ''}
              </Text>
            </View>

            {/* The flat-rate estimate, shown once and named. Not summed into
                anything that looks like revenue. */}
            <Text style={styles.disclaimer}>
              For reference only: a flat 8% on everything clicked would be{' '}
              {money(data.totals.potential)}. Real rates vary by advertiser and reverse on returns,
              so treat that as an upper bound, not a forecast.
            </Text>

            {data.revenue.length > 0 &&
              data.revenue.map(r => (
                <View key={r.id} style={styles.tableRow}>
                  <View style={styles.tableMain}>
                    <Text style={styles.tableLabel}>
                      {r.period} · {r.network}
                    </Text>
                    <Text style={styles.tableMeta}>
                      {money(r.gross)} gross · {money(r.returns)} reversed · {r.orders} orders
                    </Text>
                  </View>
                  <Text style={styles.tableValue}>{money(r.net)}</Text>
                </View>
              ))}

            <Text style={styles.sectionLabel}>RECORD A PAYOUT</Text>
            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Period (2026-08)"
                placeholderTextColor={colors.inkFaint}
                value={period}
                onChangeText={setPeriod}
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, styles.inputHalf]}
                placeholder="Network"
                placeholderTextColor={colors.inkFaint}
                value={network}
                onChangeText={setNetwork}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, styles.inputThird]}
                placeholder="Gross $"
                placeholderTextColor={colors.inkFaint}
                value={gross}
                onChangeText={setGross}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, styles.inputThird]}
                placeholder="Reversed $"
                placeholderTextColor={colors.inkFaint}
                value={returned}
                onChangeText={setReturned}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, styles.inputThird]}
                placeholder="Orders"
                placeholderTextColor={colors.inkFaint}
                value={orders}
                onChangeText={setOrders}
                keyboardType="number-pad"
              />
            </View>
            {!!saveError && <Text style={styles.errorText}>{saveError}</Text>}
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleRecord}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Record</Text>
              )}
            </TouchableOpacity>
          </>
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
  title: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },

  rangeRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  rangeChip: { marginRight: 0 },

  noticeBox: {
    borderRadius: radius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.md,
  },
  noticeText: { ...textType.meta, fontSize: 12, lineHeight: 18 },

  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 10 },
  sectionNote: { ...textType.meta, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },
  bodyText: { ...textType.body, color: colors.inkMuted },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { width: '50%', marginBottom: spacing.md },
  statValue: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  statLabel: { ...textType.microLabel, fontSize: 9, color: colors.inkFaint, marginTop: 4 },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  tableMain: { flex: 1, marginRight: spacing.sm },
  tableLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  tableMeta: { ...textType.meta, fontSize: 12, marginTop: 2 },
  tableValue: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink },

  figureBox: {
    borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.lg },
  figureValue: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, color: colors.ink },
  figureUnit: { ...textType.body, color: colors.inkMuted, marginTop: 4 },
  figureNote: { ...textType.meta, fontSize: 12, lineHeight: 18, marginTop: 10 },

  disclaimer: { ...textType.meta, fontSize: 12, lineHeight: 18, marginTop: spacing.md },

  formRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
  },
  inputHalf: { flex: 1 },
  inputThird: { flex: 1 },
  errorText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.tobacco, marginBottom: 8 },

  button: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { backgroundColor: colors.hair },
  buttonText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.white },

  emptyBox: {
    borderRadius: radius.md, marginTop: spacing.section, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
});

/**
 * Trend Desk (admin).
 *
 * Where the trend registry is run: the AI drafts a report, the editor reads
 * each draft and publishes or archives it. Nothing reaches users without the
 * publish tap - same human-in-the-loop shape as Edits, because a trend the
 * app asserts to every user deserves an editor.
 *
 * The entry point is hidden for non-admins, but the gate that matters is
 * server-side: every action here calls a function that re-checks the uid
 * allowlist.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { FashionTrend } from '../models/fashionTrend';
import { trendService } from '../services/trendService';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

const STATUS_ORDER: Record<string, number> = { draft: 0, published: 1, archived: 2 };

export default function TrendDeskAdminScreen() {
  const [trends, setTrends] = useState<FashionTrend[]>([]);
  const [loading, setLoading] = useState(true);
  // listTrendDesk always appends the bundled seed set, so an empty list can
  // only mean the call failed. That used to render as "the desk is empty -
  // users are seeing the seed set", a statement about production that the
  // screen had no way of knowing.
  const [loadError, setLoadError] = useState(false);
  const [denied, setDenied] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const load = useCallback(async () => {
    try {
      const desk = await trendService.listTrendDesk();
      setLoadError(false);
      setDenied(false);
      setTrends(
        [...desk].sort(
          (a, b) =>
            (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) ||
            b.createdAt.localeCompare(a.createdAt)
        )
      );
    } catch (error: any) {
      console.error('Error loading the trend desk:', error);
      if (error?.code === 'functions/permission-denied' || error?.code === 'permission-denied') {
        setDenied(true);
      } else {
        setLoadError(true);
        showToast('Could not load the trend desk', 'error');
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDraft = async () => {
    setDrafting(true);
    try {
      const drafted = await trendService.draftTrendReport();
      showToast(`Drafted ${drafted} trends — review below`, 'success');
      await load();
    } catch (error) {
      console.error('Error drafting trends:', error);
      showToast('Drafting failed', 'error');
    } finally {
      setDrafting(false);
    }
  };

  const handlePublish = async (trend: FashionTrend) => {
    setBusyId(trend.id);
    try {
      await trendService.publishTrend(trend.id, trend.name);
      showToast(`"${trend.name}" is live`, 'success');
      await load();
    } catch (error) {
      console.error('Error publishing trend:', error);
      showToast('Publish failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const retry = () => {
    setLoading(true);
    load();
  };

  // Retiring a published trend pulls it from every user at once, and it sat
  // one stray tap away with no confirmation.
  const confirmArchive = (trend: FashionTrend) => {
    const live = trend.status === 'published';
    Alert.alert(
      live ? `Retire "${trend.name}"?` : `Discard "${trend.name}"?`,
      live
        ? 'It stops reaching every user straight away. You can restore it from the archived rows below.'
        : 'The draft moves to the archived rows below.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: live ? 'Retire' : 'Discard', style: 'destructive', onPress: () => handleArchive(trend) },
      ]
    );
  };

  // An archived AI-drafted row goes live to every user when brought back, and
  // it may be a draft that was never published at all - so it asks first.
  // Editorial seed rows restore directly, as they always have.
  const confirmRestore = (trend: FashionTrend) => {
    if (trend.source === 'editorial') {
      handlePublish(trend);
      return;
    }
    Alert.alert(
      `Publish "${trend.name}"?`,
      'It goes live for every user.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', onPress: () => handlePublish(trend) },
      ]
    );
  };

  const handleArchive = async (trend: FashionTrend) => {
    setBusyId(trend.id);
    try {
      await trendService.archiveTrend(trend.id, trend.name);
      showToast(`"${trend.name}" archived`, 'success');
      await load();
    } catch (error) {
      console.error('Error archiving trend:', error);
      showToast('Archive failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>ADMIN</Text>
        <Text style={styles.title}>Trend desk</Text>
        <Text style={styles.subtitle}>
          The AI drafts, you publish. Only published trends reach users — and delivery is
          personal: each user's surfaces rank this pool by their closet, taste, city, weather and
          local style scene, so publish broadly and let the ranking localize. The EDITORIAL rows
          are the curated seed set shipped inside the app (global, accessory-complete, with
          hand-checked pieces); they merge with what you publish here, and you can retire or
          restore any of them.
        </Text>

        <TouchableOpacity
          style={[styles.draftButton, drafting && styles.draftButtonBusy]}
          disabled={drafting}
          onPress={handleDraft}
        >
          <Text style={styles.draftButtonText}>
            {drafting ? 'Drafting…' : 'Draft a fresh trend report'}
          </Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : denied ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>The trend desk is limited to 33 Trends admins.</Text>
          </View>
        ) : loadError || trends.length === 0 ? (
          <TouchableOpacity style={styles.emptyBox} onPress={retry} accessibilityRole="button">
            <Text style={styles.emptyText}>Couldn't load the trend desk. Tap to retry.</Text>
          </TouchableOpacity>
        ) : (
          trends.map(trend => (
            <View key={trend.id} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text
                  style={[
                    styles.statusPill,
                    trend.status === 'published' && styles.statusPublished,
                    trend.status === 'archived' && styles.statusArchived,
                  ]}
                >
                  {trend.status.toUpperCase()}
                </Text>
                {trend.source === 'editorial' && (
                  <Text style={[styles.statusPill, styles.statusEditorial]}>EDITORIAL</Text>
                )}
                <Text style={styles.rowMeta}>
                  {trend.stage.toUpperCase()} · {trend.region.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.rowName}>{trend.name}</Text>
              <Text style={styles.rowSummary}>{trend.summary}</Text>
              <Text style={styles.rowDetail}>
                Anchors: {trend.keyGarments.join(', ') || '—'}
                {trend.keyAccessories?.length ? ` · Accessories: ${trend.keyAccessories.join(', ')}` : ''}
                {trend.silhouettes.length ? ` · Cuts: ${trend.silhouettes.join(', ')}` : ''}
                {trend.regions?.length ? ` · Also: ${trend.regions.join(', ')}` : ''}
                {trend.keyColors.length ? ` · Colours: ${trend.keyColors.join(', ')}` : ''}
              </Text>
              <Text style={styles.rowDetail}>How to wear: {trend.stylingNote}</Text>

              {/* Every archived row can come back. This used to be limited to
                  editorial rows, so an AI-drafted trend retired by mistake had
                  no way back from the app even though the server allows it. */}
              {trend.status === 'archived' && (
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    style={styles.archiveAction}
                    disabled={busyId === trend.id}
                    onPress={() => confirmRestore(trend)}
                  >
                    <Text style={styles.restoreActionText}>
                      {busyId === trend.id
                        ? 'Working…'
                        : trend.source === 'editorial' || trend.publishedAt
                          ? 'Restore'
                          : 'Publish'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {trend.status !== 'archived' && (
                <View style={styles.rowActions}>
                  {trend.status === 'draft' && (
                    <TouchableOpacity
                      style={[styles.publishAction, busyId === trend.id && styles.publishActionBusy]}
                      disabled={busyId === trend.id}
                      onPress={() => handlePublish(trend)}
                    >
                      <Text style={styles.publishActionText}>
                        {busyId === trend.id ? 'Working…' : 'Publish'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.archiveAction}
                    disabled={busyId === trend.id}
                    onPress={() => confirmArchive(trend)}
                  >
                    <Text style={styles.archiveActionText}>
                      {trend.status === 'draft' ? 'Discard' : 'Retire'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  headerBar: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  busyBox: { paddingVertical: 60, alignItems: 'center' },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },

  draftButton: {
    borderRadius: radius.full,
    marginTop: spacing.lg,
    backgroundColor: colors.rust,
    paddingVertical: 14,
    alignItems: 'center',
  },
  draftButtonBusy: { opacity: 0.6 },
  draftButtonText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.bone },

  emptyBox: {
    borderRadius: radius.md, marginTop: spacing.lg, backgroundColor: colors.paper, padding: spacing.lg },
  emptyText: { ...textType.body, color: colors.inkMuted, lineHeight: 21 },

  row: {
    marginTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusPill: {
    borderRadius: radius.full,
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.tobacco,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPublished: { color: colors.white, backgroundColor: colors.ink, borderColor: colors.ink },
  statusArchived: { color: colors.inkFaint },
  statusEditorial: { color: colors.rust, borderColor: colors.rust },
  rowMeta: { ...textType.eyebrow, fontSize: 9 },
  rowName: { fontFamily: fonts.serif, fontSize: 21, color: colors.ink, marginTop: 8 },
  rowSummary: { ...textType.body, fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginTop: 4 },
  rowDetail: { ...textType.meta, fontSize: 11, lineHeight: 17, marginTop: 6 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: spacing.md },
  publishAction: {
    borderRadius: radius.full, backgroundColor: colors.rust, paddingHorizontal: 16, paddingVertical: 10 },
  publishActionBusy: { opacity: 0.6 },
  publishActionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.bone },
  archiveAction: { paddingVertical: 10 },
  archiveActionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkFaint },
  restoreActionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.rust },
});

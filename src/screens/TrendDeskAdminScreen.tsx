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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { FashionTrend } from '../models/fashionTrend';
import { trendService } from '../services/trendService';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

const STATUS_ORDER: Record<string, number> = { draft: 0, published: 1, archived: 2 };

export default function TrendDeskAdminScreen() {
  const [trends, setTrends] = useState<FashionTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const load = useCallback(async () => {
    try {
      const desk = await trendService.listTrendDesk();
      setTrends(
        [...desk].sort(
          (a, b) =>
            (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3) ||
            b.createdAt.localeCompare(a.createdAt)
        )
      );
    } catch (error) {
      console.error('Error loading the trend desk:', error);
      showToast('Could not load the trend desk', 'error');
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
      await trendService.publishTrend(trend.id);
      showToast(`"${trend.name}" is live`, 'success');
      await load();
    } catch (error) {
      console.error('Error publishing trend:', error);
      showToast('Publish failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (trend: FashionTrend) => {
    setBusyId(trend.id);
    try {
      await trendService.archiveTrend(trend.id);
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
          local style scene, so publish broadly and let the ranking localize.
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
        ) : trends.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              The desk is empty — users are seeing the shipped editorial seed set. Draft a report to
              get fresh trends in front of them.
            </Text>
          </View>
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
                <Text style={styles.rowMeta}>
                  {trend.stage.toUpperCase()} · {trend.region.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.rowName}>{trend.name}</Text>
              <Text style={styles.rowSummary}>{trend.summary}</Text>
              <Text style={styles.rowDetail}>
                Anchors: {trend.keyGarments.join(', ') || '—'}
                {trend.silhouettes.length ? ` · Cuts: ${trend.silhouettes.join(', ')}` : ''}
                {trend.keyColors.length ? ` · Colours: ${trend.keyColors.join(', ')}` : ''}
              </Text>
              <Text style={styles.rowDetail}>How to wear: {trend.stylingNote}</Text>

              {trend.status !== 'archived' && (
                <View style={styles.rowActions}>
                  {trend.status === 'draft' && (
                    <TouchableOpacity
                      style={styles.publishAction}
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
                    onPress={() => handleArchive(trend)}
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
    marginTop: spacing.lg,
    backgroundColor: colors.ink,
    paddingVertical: 14,
    alignItems: 'center',
  },
  draftButtonBusy: { opacity: 0.6 },
  draftButtonText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.white },

  emptyBox: { marginTop: spacing.lg, backgroundColor: colors.paper, padding: spacing.lg },
  emptyText: { ...textType.body, color: colors.inkMuted, lineHeight: 21 },

  row: {
    marginTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusPill: {
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
  rowMeta: { ...textType.eyebrow, fontSize: 9 },
  rowName: { fontFamily: fonts.serif, fontSize: 21, color: colors.ink, marginTop: 8 },
  rowSummary: { ...textType.body, fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginTop: 4 },
  rowDetail: { ...textType.meta, fontSize: 11, lineHeight: 17, marginTop: 6 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: spacing.md },
  publishAction: { backgroundColor: colors.ink, paddingHorizontal: 16, paddingVertical: 10 },
  publishActionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.white },
  archiveAction: { paddingVertical: 10 },
  archiveActionText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkFaint },
});

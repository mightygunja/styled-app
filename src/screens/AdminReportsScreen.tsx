/**
 * Admin > Reports: everything members have reported, newest first.
 *
 * Each row is one reported thing (a post, a comment, a message, a member),
 * with what was reported, why, and how many different members reported it.
 * Two decisions: Remove (delete the content, or suspend the member) or Keep
 * (dismiss the report; content hidden by reports comes back).
 *
 * Admins only - the server checks (functions: listContentReports,
 * resolveContentReport), not this screen.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { REPORT_REASONS } from '../services/moderation';
import { ContentReportRow, moderationService } from '../services/moderationService';
import { colors, fonts, radius, spacing, type as textType } from '../theme/designSystem';

const KIND: Record<string, string> = { post: 'POST', comment: 'COMMENT', message: 'MESSAGE', user: 'MEMBER' };
const reasonLabel = (key: string) => REPORT_REASONS.find(r => r.key === key)?.label || key;

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<ContentReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setFailed(false);
      setReports(await moderationService.listReports());
    } catch (error) {
      console.error('Could not load reports:', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (report: ContentReportRow, action: 'remove' | 'dismiss') => {
    if (working) return;
    setWorking(report.id);
    try {
      await moderationService.resolveReport(report.id, action);
      setReports(current =>
        current.filter(r => !(r.targetType === report.targetType && r.targetId === report.targetId))
      );
      showToast(action === 'remove' ? 'Removed' : 'Kept; report dismissed', 'success');
    } catch (error) {
      console.error('Could not resolve the report:', error);
      showToast("That didn't go through. Try again.", 'error');
    } finally {
      setWorking(null);
    }
  };

  const confirmRemove = (report: ContentReportRow) => {
    const member = report.targetType === 'user';
    Alert.alert(
      member ? `Suspend ${report.targetOwnerName}?` : `Remove this ${report.targetType}?`,
      member
        ? 'Their account is disabled: they are signed out and cannot sign back in. It can be re-enabled in the Firebase console.'
        : 'It is deleted for everyone. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: member ? 'Suspend' : 'Remove', style: 'destructive', onPress: () => resolve(report, 'remove') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>COMMUNITY</Text>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.note}>
          What members have reported. A post or comment reported by three different members is hidden from
          everyone until you decide here. Aim to clear this within 24 hours.
        </Text>

        {loading ? (
          <ActivityIndicator style={styles.state} color={colors.ink} />
        ) : failed ? (
          <TouchableOpacity style={styles.empty} onPress={load} accessibilityRole="button">
            <Text style={styles.emptyText}>We couldn't load the reports. Tap to try again.</Text>
          </TouchableOpacity>
        ) : reports.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nothing is waiting. Every report has been dealt with.</Text>
          </View>
        ) : (
          reports.map(report => (
            <View key={report.id} style={styles.card}>
              <Text style={styles.kind}>
                {KIND[report.targetType] || report.targetType.toUpperCase()} · {reasonLabel(report.reason).toUpperCase()}
                {report.hidden ? ' · HIDDEN' : ''}
              </Text>
              <Text style={styles.owner}>
                {report.targetType === 'user' ? report.targetOwnerName : `By ${report.targetOwnerName}`}
              </Text>
              {!!report.imageUrl && <Image source={{ uri: report.imageUrl }} style={styles.image} />}
              {report.exists ? (
                !!report.excerpt && <Text style={styles.excerpt}>{report.excerpt}</Text>
              ) : (
                <Text style={styles.gone}>This has already been deleted.</Text>
              )}
              <Text style={styles.meta}>
                Reported by {report.reporters} {report.reporters === 1 ? 'member' : 'members'} ·{' '}
                {new Date(report.createdAt).toLocaleDateString()}
                {report.note ? ` · "${report.note}"` : ''}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.keep}
                  disabled={working === report.id}
                  onPress={() => resolve(report, 'dismiss')}
                  accessibilityRole="button"
                >
                  <Text style={styles.keepText}>Keep</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.remove}
                  disabled={working === report.id}
                  onPress={() => confirmRemove(report)}
                  accessibilityRole="button"
                >
                  <Text style={styles.removeText}>
                    {working === report.id ? 'Working…' : report.targetType === 'user' ? 'Suspend member' : 'Remove'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  header: { paddingHorizontal: spacing.page, paddingTop: 8 },
  content: { paddingHorizontal: spacing.page, paddingBottom: 60 },
  eyebrow: { ...textType.eyebrow, marginTop: spacing.md },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, marginTop: 6, marginBottom: 8 },
  note: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkMuted, marginBottom: spacing.lg },
  state: { marginTop: spacing.section },
  empty: { borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.lg },
  emptyText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  card: { borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.md, marginBottom: spacing.md },
  kind: { ...textType.eyebrow, fontSize: 11 },
  owner: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink, marginTop: 6 },
  image: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.sm, marginTop: spacing.sm, backgroundColor: colors.sand },
  excerpt: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.ink, marginTop: spacing.sm },
  gone: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  meta: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.inkMuted, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  keep: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingVertical: 12,
    alignItems: 'center',
  },
  keepText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  remove: { flex: 1, borderRadius: radius.full, backgroundColor: colors.rust, paddingVertical: 12, alignItems: 'center' },
  removeText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.bone },
});

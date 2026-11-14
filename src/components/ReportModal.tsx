/**
 * The "why are you reporting this?" sheet, shared by every place something
 * can be reported: a post, a comment, a message, a member.
 *
 * One tap on a reason sends the report. The reasons come from moderation.ts,
 * so the admin queue reads the same words the member chose.
 */

import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { REPORT_REASONS } from '../services/moderation';
import { colors, fonts, radius, spacing, type as textType } from '../theme/designSystem';

interface ReportModalProps {
  visible: boolean;
  /** What is being reported, as the heading reads: "this post", "this comment", "Maya". */
  subject: string;
  busy?: boolean;
  onChoose: (reasonKey: string) => void;
  onClose: () => void;
}

export default function ReportModal({ visible, subject, busy = false, onChoose, onClose }: ReportModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={busy ? undefined : onClose} accessibilityLabel="Close">
        {/* Taps inside the sheet must not close it. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.eyebrow}>REPORT</Text>
          <Text style={styles.title}>What is wrong with {subject}?</Text>
          <Text style={styles.note}>
            You will stop seeing it straight away. We review every report, usually within 24 hours, and remove
            anything that breaks the community rules.
          </Text>
          {REPORT_REASONS.map(reason => (
            <TouchableOpacity
              key={reason.key}
              style={styles.reason}
              disabled={busy}
              onPress={() => onChoose(reason.key)}
              accessibilityRole="button"
              accessibilityLabel={`Report for: ${reason.label}`}
            >
              <Text style={styles.reasonText}>{reason.label}</Text>
            </TouchableOpacity>
          ))}
          {busy ? (
            <ActivityIndicator style={styles.busy} color={colors.ink} />
          ) : (
            <TouchableOpacity style={styles.cancel} onPress={onClose} accessibilityRole="button">
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 28, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bone,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: spacing.section,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  eyebrow: { ...textType.eyebrow, marginBottom: 6 },
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: colors.ink },
  note: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginTop: 8, marginBottom: spacing.md },
  reason: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hair,
  },
  reasonText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  cancel: { marginTop: spacing.md, alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.tobacco },
  busy: { marginTop: spacing.md, paddingVertical: 12 },
});

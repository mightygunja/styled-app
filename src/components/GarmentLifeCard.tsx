/**
 * The "Life" section of a closet item: what the piece has done, what has
 * been done to it, and - one tap away, closed by default - how to fix
 * whatever is wrong with it.
 *
 * It replaces the old two-row "Usage" block and adds nothing a person has to
 * read unless they came for it: four facts, any fixes already logged, one
 * line if the brand repairs its own, and a single quiet "Something need
 * fixing?" row. Everything else opens from that row.
 *
 * The numbers come from garmentLife.ts and are only ever counts. The photo
 * check is a reading ("looks like pilling"), shown with its confidence, and
 * the chips are always there to overrule it.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import PhotoUploadModal from './PhotoUploadModal';
import { repairProgramFor } from '../data/brandRepairPrograms';
import { CareIssue, careIssuesFor, proName } from '../data/careGuide';
import { garmentCareService, IssueReading } from '../services/garmentCareService';
import { CareRecord, LifeItem, careLine, lifeFacts, lifeRecord, newCareRecord } from '../services/garmentLife';
import { colors, fonts, radius } from '../theme/designSystem';

const FIT_CHOICES = [
  { value: 'fitted', label: 'Fitted' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'oversized', label: 'Oversized' },
];

const CONFIDENCE_WORDS: Record<IssueReading['confidence'], string> = {
  high: 'fairly sure',
  medium: 'not certain',
  low: 'a guess',
};

interface Props {
  item: LifeItem & { fitType?: string };
  /** Called with the fields a logged fix changed, so the screen's copy of the item stays current. */
  onChanged: (updates: { careLog: CareRecord[]; fitType?: string }) => void;
  notify: (message: string, kind: 'success' | 'error') => void;
}

export default function GarmentLifeCard({ item, onChanged, notify }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CareIssue | null>(null);
  const [reading, setReading] = useState<IssueReading | null>(null);
  const [checking, setChecking] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [fitNow, setFitNow] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const record = useMemo(() => lifeRecord(item), [item]);
  const facts = useMemo(() => lifeFacts(record), [record]);
  const issues = useMemo(() => careIssuesFor(item.category), [item.category]);
  const program = useMemo(() => repairProgramFor(item.brand), [item.brand]);

  const openLink = (url: string) =>
    Linking.openURL(url).catch(() => notify('Could not open that page', 'error'));

  const pick = (issue: CareIssue | null) => {
    setSelected(issue);
    setFitNow(null);
  };

  const checkPhoto = async (uri: string) => {
    setChecking(true);
    setReading(null);
    try {
      const result = await garmentCareService.readIssueFromPhoto(uri, item.category);
      setReading(result);
      // Only a reading that is offered for this kind of piece is preselected.
      pick(result.issue && issues.some(i => i.id === result.issue!.id) ? result.issue : null);
    } catch (error) {
      console.error('Error reading the issue photo:', error);
      notify('Could not check the photo. Pick what looks closest below.', 'error');
    } finally {
      setChecking(false);
    }
  };

  const log = async (by: CareRecord['by']) => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const changes = selected.alteration && fitNow ? { fitType: fitNow } : {};
      const careLog = await garmentCareService.logCare(item.id, item.careLog, newCareRecord(selected.id, by), changes);
      onChanged({ careLog, ...changes });
      notify(`${selected.done} — added to its life`, 'success');
      setOpen(false);
      pick(null);
      setReading(null);
    } catch (error) {
      console.error('Error logging a fix:', error);
      notify('Could not save that', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Life</Text>

      {facts.map(fact => (
        <View key={fact.label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{fact.label}:</Text>
          <Text style={styles.infoValue}>{fact.value}</Text>
        </View>
      ))}

      {record.care.slice(0, 3).map(entry => (
        <Text key={entry.id} style={styles.careLine}>
          {careLine(entry)}
        </Text>
      ))}
      {record.care.length > 3 && (
        <Text style={styles.careLine}>and {record.care.length - 3} earlier</Text>
      )}

      {program && (
        <TouchableOpacity
          style={styles.programRow}
          onPress={() => openLink(program.url)}
          accessibilityRole="link"
          accessibilityLabel={`${program.brand}: ${program.offer}`}
        >
          <Text style={styles.programTitle}>
            {program.kind === 'repair' ? `${program.brand} repairs its own` : `${program.brand} takes its own back`}
          </Text>
          <Text style={styles.programOffer}>{program.offer} →</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setOpen(current => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.toggleText}>{open ? 'Close' : 'Something need fixing?'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.care}>
          <Text style={styles.prompt}>What is wrong with it?</Text>
          <View style={styles.chips}>
            {issues.map(issue => {
              const on = selected?.id === issue.id;
              return (
                <TouchableOpacity
                  key={issue.id}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => pick(on ? null : issue)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{issue.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => setShowPhoto(true)}
            disabled={checking}
            accessibilityRole="button"
            accessibilityLabel="Check what is wrong from a photo"
          >
            {checking ? (
              <View style={styles.checkingRow}>
                <ActivityIndicator size="small" color={colors.tobacco} />
                <Text style={styles.link}>Looking at the photo…</Text>
              </View>
            ) : (
              <Text style={styles.link}>Not sure? Check from a photo</Text>
            )}
          </TouchableOpacity>

          {reading && (
            <Text style={styles.reading}>
              {reading.issue
                ? `Looks like ${reading.issue.label.toLowerCase()} (${CONFIDENCE_WORDS[reading.confidence]}). `
                : 'Could not tell from that photo. '}
              {reading.seen}
              {reading.issue ? ' Pick a different one above if that is not it.' : ' Pick what looks closest above.'}
            </Text>
          )}

          {selected && (
            <View style={styles.fix}>
              <Text style={styles.fixSummary}>{selected.summary}</Text>

              {selected.tier === 'diy' ? (
                <>
                  <Text style={styles.fixLabel}>THE USUAL FIX, AT HOME</Text>
                  {selected.steps.map((step, index) => (
                    <View key={index} style={styles.step}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                  <Text style={styles.fixLabel}>WHEN TO HAND IT OVER</Text>
                  <Text style={styles.stepText}>{selected.handOver}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.fixLabel}>ONE FOR {proName(selected.pro).toUpperCase()}</Text>
                  <Text style={styles.stepText}>{selected.handOver}</Text>
                </>
              )}

              {program?.kind === 'repair' && (
                <TouchableOpacity onPress={() => openLink(program.url)} accessibilityRole="link">
                  <Text style={styles.link}>Or send it to {program.brand} →</Text>
                </TouchableOpacity>
              )}

              {selected.alteration && (
                <>
                  <Text style={styles.fixLabel}>ONCE IT IS ALTERED, HOW DOES IT FIT?</Text>
                  <View style={styles.chips}>
                    {FIT_CHOICES.map(choice => {
                      const on = fitNow === choice.value;
                      return (
                        <TouchableOpacity
                          key={choice.value}
                          style={[styles.chip, on && styles.chipOn]}
                          onPress={() => setFitNow(on ? null : choice.value)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{choice.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.note}>Your outfits will use the new fit. Leave it blank to keep the old one.</Text>
                </>
              )}

              <Text style={styles.fixLabel}>DONE? ADD IT TO THIS PIECE'S LIFE</Text>
              <View style={styles.logRow}>
                {selected.tier === 'diy' && (
                  <TouchableOpacity style={styles.logButton} disabled={saving} onPress={() => log('self')} accessibilityRole="button">
                    <Text style={styles.logButtonText}>I fixed it</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.logButton} disabled={saving} onPress={() => log('pro')} accessibilityRole="button">
                  <Text style={styles.logButtonText}>
                    {proName(selected.pro).replace(/^a /, 'A ')} did it
                  </Text>
                </TouchableOpacity>
                {program?.kind === 'repair' && (
                  <TouchableOpacity style={styles.logButton} disabled={saving} onPress={() => log('brand')} accessibilityRole="button">
                    <Text style={styles.logButtonText}>{program.brand} did it</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      <PhotoUploadModal
        visible={showPhoto}
        onClose={() => setShowPhoto(false)}
        onPhotoSelected={uri => {
          setShowPhoto(false);
          checkPhoto(uri);
        }}
      />
    </View>
  );
}

// Matches the item page's own section, row and eyebrow treatment.
const styles = StyleSheet.create({
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.paper },
  sectionTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  infoLabel: { fontSize: 14, color: colors.inkMuted, fontFamily: fonts.sansMedium },
  infoValue: { fontSize: 14, color: colors.ink, fontFamily: fonts.sansSemiBold },
  careLine: { fontSize: 13, lineHeight: 19, color: colors.inkMuted, fontFamily: fonts.sans, marginBottom: 4 },

  programRow: {
    marginTop: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  programTitle: { fontSize: 14, color: colors.ink, fontFamily: fonts.sansSemiBold },
  programOffer: { fontSize: 13, color: colors.tobacco, fontFamily: fonts.sansMedium, marginTop: 3 },

  toggle: { paddingTop: 12, paddingBottom: 2 },
  toggleText: { fontSize: 14, color: colors.tobacco, fontFamily: fonts.sansMedium },

  care: { marginTop: 10 },
  prompt: { fontSize: 14, color: colors.ink, fontFamily: fonts.sansMedium, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, color: colors.ink, fontFamily: fonts.sansMedium },
  chipTextOn: { color: colors.bone },
  link: { fontSize: 13, color: colors.tobacco, fontFamily: fonts.sansMedium, paddingVertical: 12 },
  checkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reading: { fontSize: 13, lineHeight: 19, color: colors.inkMuted, fontFamily: fonts.sans, marginBottom: 8 },

  fix: { marginTop: 4, padding: 14, borderRadius: radius.md, backgroundColor: colors.paper },
  fixSummary: { fontSize: 14, lineHeight: 20, color: colors.ink, fontFamily: fonts.sansMedium },
  fixLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: colors.tobacco,
    marginTop: 14,
    marginBottom: 8,
  },
  step: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  stepNumber: { width: 14, fontSize: 13, lineHeight: 19, color: colors.tobacco, fontFamily: fonts.sansSemiBold },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.ink, fontFamily: fonts.sans },
  note: { fontSize: 12, lineHeight: 17, color: colors.inkMuted, fontFamily: fonts.sans, marginTop: 8 },
  logRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  logButton: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  logButtonText: { fontSize: 13, color: colors.ink, fontFamily: fonts.sansMedium },
});

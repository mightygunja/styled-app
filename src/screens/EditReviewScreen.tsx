import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';
import { getCurrentUserId } from '../services/api';
import { styleEditService, StyleEdit, coverageStats } from '../services/styleEditService';

/**
 * Stylist-side review of an Edit.
 *
 * The draft is never shown to the client - a stylist cuts the looks that do
 * not work, rewrites the note in their own voice, and only then delivers. The
 * AI does the assembly; the human owns what ships.
 */
export default function EditReviewScreen() {
  const [edits, setEdits] = useState<StyleEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<StyleEdit | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    try {
      setEdits(await styleEditService.getForStylist(getCurrentUserId()));
    } catch (error) {
      console.error('Error loading stylist edits:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (edit: StyleEdit) => {
    setActive(edit);
    setNote(edit.stylistNote || '');
  };

  const handleDraft = async (edit: StyleEdit) => {
    setBusy(true);
    try {
      const drafted = await styleEditService.draft(edit.id);
      setActive(drafted);
      setNote(drafted.stylistNote || '');
      await load();
    } catch (error: any) {
      Alert.alert('Could not draft', error?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const removeLook = (lookId: string) => {
    if (!active) return;
    setActive({ ...active, looks: active.looks.filter(l => l.id !== lookId) });
  };

  const handleSave = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await styleEditService.saveDraft(active.id, active.looks, note);
      Alert.alert('Saved', 'Your changes are saved. The client still cannot see this Edit.');
    } catch (error: any) {
      Alert.alert('Could not save', error?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeliver = async () => {
    if (!active) return;
    if (active.looks.length < 3) {
      Alert.alert('Too thin to deliver', 'An Edit should have at least three looks in it.');
      return;
    }

    setBusy(true);
    try {
      await styleEditService.saveDraft(active.id, active.looks, note);
      await styleEditService.deliver(active.id);
      Alert.alert('Delivered', 'Your client can now see this Edit.');
      setActive(null);
      await load();
    } catch (error: any) {
      Alert.alert('Could not deliver', error?.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (active) {
    const stats = coverageStats(active);
    const itemsById = new Map(active.items.map(i => [i.id, i]));

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setActive(null)}>
            <Text style={styles.backLink}>‹ All Edits</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>{active.focus.toUpperCase()}</Text>
          <Text style={styles.title}>Review before it ships</Text>
          {!!active.brief && <Text style={styles.brief}>"{active.brief}"</Text>}
          {!!active.revisionNote && (
            <View style={styles.revisionBox}>
              <Text style={styles.revisionText}>{active.revisionNote}</Text>
            </View>
          )}

          {active.looks.length === 0 ? (
            <>
              <Text style={styles.helper}>
                Nothing drafted yet. Generating a first pass from this client's closet takes about
                a minute — you then cut, reorder and rewrite it.
              </Text>
              <Button
                title={busy ? 'Drafting…' : 'Draft from their closet'}
                onPress={() => handleDraft(active)}
                fullWidth
                disabled={busy}
                style={{ marginTop: spacing.lg }}
              />
            </>
          ) : (
            <>
              <Text style={styles.coverage}>
                {stats.looks} looks from {stats.pieces} pieces
              </Text>

              <Text style={styles.sectionLabel}>YOUR NOTE TO THE CLIENT</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="What you saw in their wardrobe, and how you approached it…"
                placeholderTextColor={colors.inkFaint}
              />

              <Text style={styles.sectionLabel}>LOOKS</Text>
              {active.looks.map((look, index) => (
                <View key={look.id} style={styles.lookCard}>
                  <View style={styles.lookHead}>
                    <Text style={styles.lookTitle}>
                      {String(index + 1).padStart(2, '0')} · {look.title}
                    </Text>
                    <TouchableOpacity onPress={() => removeLook(look.id)}>
                      <Text style={styles.removeLink}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.lookItems}>
                    {look.itemIds.map(id => {
                      const item = itemsById.get(id);
                      if (!item) return null;
                      return item.imageUrl ? (
                        <Image key={id} source={{ uri: item.imageUrl }} style={styles.lookThumb} />
                      ) : (
                        <View key={id} style={styles.lookThumb} />
                      );
                    })}
                  </View>
                  <Text style={styles.lookRationale}>{look.rationale}</Text>
                </View>
              ))}

              <Button
                title="Save without delivering"
                variant="secondary"
                onPress={handleSave}
                fullWidth
                disabled={busy}
                style={{ marginTop: spacing.section }}
              />
              <Button
                title={busy ? 'Working…' : 'Deliver to client'}
                onPress={handleDeliver}
                fullWidth
                disabled={busy}
                style={{ marginTop: spacing.sm }}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>STYLIST TOOLS</Text>
        <Text style={styles.title}>Edits to build</Text>
        <Text style={styles.subtitle}>
          Clients who have asked you to go through their wardrobe.
        </Text>

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : edits.length === 0 ? (
          <Text style={styles.helper}>No Edit requests yet.</Text>
        ) : (
          edits.map(edit => (
            <TouchableOpacity
              key={edit.id}
              style={styles.row}
              onPress={() => openEdit(edit)}
              activeOpacity={0.85}
            >
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{edit.focus}</Text>
                <Text style={styles.rowMeta}>
                  {edit.status === 'requested'
                    ? 'Not started'
                    : edit.status === 'drafted'
                    ? `${edit.looks.length} looks drafted`
                    : edit.status === 'delivered'
                    ? 'Delivered'
                    : 'Revision requested'}
                  {' · $'}
                  {edit.price.toFixed(0)}
                </Text>
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
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  backLink: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  content: { padding: spacing.page, paddingBottom: 60 },
  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },
  brief: { ...textType.pullQuote, color: colors.inkMuted, marginTop: 12 },
  helper: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginTop: spacing.lg },
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 12 },
  busyBox: { paddingVertical: 80, alignItems: 'center' },
  coverage: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginTop: spacing.lg },

  revisionBox: {
    borderRadius: radius.md, backgroundColor: colors.sand, padding: 14, marginTop: spacing.md },
  revisionText: { ...textType.body, fontSize: 13, color: colors.ink },

  noteInput: {
    borderRadius: radius.md,
    ...textType.body,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 96,
    textAlignVertical: 'top',
  },

  lookCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lookHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lookTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, flex: 1 },
  removeLink: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.tobacco },
  lookItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  lookThumb: {
    borderRadius: radius.sm, width: 56, height: 56, backgroundColor: colors.paper },
  lookRationale: { ...textType.body, fontSize: 12, color: colors.inkMuted, marginTop: spacing.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  rowMeta: { ...textType.meta, fontSize: 12, marginTop: 3 },
  chevron: { fontSize: 22, color: colors.inkFaint },
});

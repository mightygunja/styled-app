import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';
import { getCurrentUserId } from '../services/api';
import { stylistAPI } from '../services/stylistAPI';
import {
  styleEditService,
  StyleEdit,
  EDIT_FOCUSES,
  EditFocus,
  coverageStats,
} from '../services/styleEditService';
import { Stylist } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_COPY: Record<StyleEdit['status'], string> = {
  requested: 'With your stylist',
  drafted: 'Being finished',
  delivered: 'Ready',
  'revision-requested': 'Revision requested',
};

export default function EditsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [edits, setEdits] = useState<StyleEdit[]>([]);
  const [loading, setLoading] = useState(true);

  const [showRequest, setShowRequest] = useState(false);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  const [focus, setFocus] = useState<EditFocus>(EDIT_FOCUSES[0]);
  const [brief, setBrief] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    try {
      setEdits(await styleEditService.getForUser(getCurrentUserId()));
    } catch (error) {
      console.error('Error loading edits:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRequest = async () => {
    setShowRequest(true);
    if (stylists.length === 0) {
      try {
        setStylists(await stylistAPI.getStylists());
      } catch (error) {
        console.error('Error loading stylists:', error);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedStylist) {
      Alert.alert('Pick a stylist', 'Choose who you would like to build your Edit.');
      return;
    }

    setSubmitting(true);
    try {
      // An Edit is priced as two hours of the stylist's time - it is a
      // deliverable, not a session, and this keeps the number honest against
      // the rate already shown on their profile.
      const price = selectedStylist.hourlyRate * 2;
      await styleEditService.request(
        getCurrentUserId(),
        selectedStylist.id,
        selectedStylist.name,
        focus,
        brief.trim(),
        price
      );
      setShowRequest(false);
      setBrief('');
      setSelectedStylist(null);
      load();
      Alert.alert(
        'Edit requested',
        `${selectedStylist.name} will build your Edit from the clothes you already own. You'll be notified when it's ready.`
      );
    } catch (error: any) {
      Alert.alert('Could not request', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>EDITS</Text>
        <Text style={styles.title}>A stylist, on your own wardrobe</Text>
        <Text style={styles.subtitle}>
          A set of finished looks built entirely from clothes you already own — each one with the
          reasoning written out, so it teaches you something rather than just showing you a grid.
        </Text>

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : (
          <>
            {edits.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No Edits yet</Text>
                <Text style={styles.emptyText}>
                  Request one and a stylist will go through your closet and come back with looks
                  you haven't thought of.
                </Text>
              </View>
            ) : (
              edits.map(edit => {
                const stats = coverageStats(edit);
                const ready = edit.status === 'delivered';
                return (
                  <TouchableOpacity
                    key={edit.id}
                    style={styles.editCard}
                    activeOpacity={ready ? 0.85 : 1}
                    onPress={() => ready && navigation.navigate('EditDetail', { editId: edit.id })}
                  >
                    <View style={styles.editHead}>
                      <Text style={styles.editFocus}>{edit.focus}</Text>
                      <View style={[styles.statusChip, ready && styles.statusChipReady]}>
                        <Text style={[styles.statusText, ready && styles.statusTextReady]}>
                          {STATUS_COPY[edit.status]}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.editStylist}>by {edit.stylistName}</Text>
                    {ready && stats.pieces > 0 && (
                      <Text style={styles.editCoverage}>
                        {stats.looks} looks from {stats.pieces} pieces you own
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}

            <Button
              title="Request an Edit"
              onPress={openRequest}
              fullWidth
              style={{ marginTop: spacing.section }}
            />
          </>
        )}
      </ScrollView>

      <Modal visible={showRequest} animationType="slide" transparent onRequestClose={() => setShowRequest(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request an Edit</Text>
              <TouchableOpacity onPress={() => setShowRequest(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalLabel}>WHAT SHOULD IT FOCUS ON?</Text>
              <View style={styles.chipWrap}>
                {EDIT_FOCUSES.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, focus === f && styles.chipActive]}
                    onPress={() => setFocus(f)}
                  >
                    <Text style={[styles.chipText, focus === f && styles.chipTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>WHO SHOULD BUILD IT?</Text>
              {stylists.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.stylistRow, selectedStylist?.id === s.id && styles.stylistRowActive]}
                  onPress={() => setSelectedStylist(s)}
                >
                  <View style={styles.stylistInfo}>
                    <Text style={styles.stylistName}>{s.name}</Text>
                    <Text style={styles.stylistMeta}>
                      {s.specialties.slice(0, 2).join(' · ')} · ${(s.hourlyRate * 2).toFixed(0)} per Edit
                    </Text>
                  </View>
                  {selectedStylist?.id === s.id && <Text style={styles.tick}>✓</Text>}
                </TouchableOpacity>
              ))}
              {/* Honest about the transaction model: no payment rail exists. */}
              <Text style={styles.paymentNote}>You pay your stylist directly. Nothing is charged in the app.
              </Text>

              <Text style={styles.modalLabel}>ANYTHING THEY SHOULD KNOW? (OPTIONAL)</Text>
              <TextInput
                style={styles.briefInput}
                placeholder="I've got a new job with a smarter dress code…"
                placeholderTextColor={colors.inkFaint}
                value={brief}
                onChangeText={setBrief}
                multiline
              />

              <Button
                title={submitting ? 'Requesting…' : 'Request Edit'}
                onPress={handleSubmit}
                fullWidth
                disabled={submitting || !selectedStylist}
                style={{ marginTop: spacing.lg, marginBottom: spacing.section }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12, marginBottom: spacing.lg },
  busyBox: { paddingVertical: 80, alignItems: 'center' },

  emptyBox: {
    borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },

  editCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  editHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editFocus: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink, flex: 1 },
  editStylist: { ...textType.meta, fontSize: 12, marginTop: 4 },
  editCoverage: { ...textType.body, fontSize: 13, color: colors.tobacco, marginTop: 8 },
  statusChip: {
    borderRadius: radius.full, backgroundColor: colors.sand, paddingHorizontal: 9, paddingVertical: 4 },
  statusChipReady: { backgroundColor: colors.ink },
  statusText: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 0.8, color: colors.ink },
  statusTextReady: { color: colors.white },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bone, maxHeight: '88%', paddingTop: spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.sm,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  closeButton: { fontSize: 20, color: colors.inkMuted },
  modalScroll: { paddingHorizontal: spacing.page },
  modalLabel: { ...textType.eyebrow, marginTop: spacing.lg, marginBottom: 10 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink, lineHeight: 17 },
  chipTextActive: { color: colors.white },

  stylistRow: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  stylistRowActive: { borderColor: colors.ink },
  stylistInfo: { flex: 1 },
  stylistName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  stylistMeta: { ...textType.meta, fontSize: 11, marginTop: 3 },
  tick: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink },
  paymentNote: { ...textType.body, fontSize: 12, color: colors.inkMuted, lineHeight: 18, marginTop: 10 },

  briefInput: {
    borderRadius: radius.md,
    ...textType.body,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 84,
    textAlignVertical: 'top',
  },
});

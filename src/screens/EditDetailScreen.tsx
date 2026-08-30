import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { styleEditService, StyleEdit, coverageStats } from '../services/styleEditService';
import { ItemCategory } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditDetailRouteProp = RouteProp<RootStackParamList, 'EditDetail'>;

const SHOP_CATEGORIES: ItemCategory[] = [
  'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'bags',
];

export default function EditDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditDetailRouteProp>();
  const { editId } = route.params;

  const [edit, setEdit] = useState<StyleEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [submittingRevision, setSubmittingRevision] = useState(false);

  useEffect(() => {
    load();
  }, [editId]);

  const load = async () => {
    try {
      setEdit(await styleEditService.getById(editId));
    } catch (error) {
      console.error('Error loading edit:', error);
    } finally {
      setLoading(false);
    }
  };

  const itemsById = useMemo(
    () => new Map((edit?.items || []).map(i => [i.id, i])),
    [edit]
  );

  // The revision note goes to the stylist word for word, so it has to be the
  // client's own reason - a canned sentence gave them nothing to act on.
  const handleSubmitRevision = async () => {
    const note = revisionNote.trim();
    if (!note) return;
    try {
      setSubmittingRevision(true);
      await styleEditService.requestRevision(editId, note);
      setShowRevisionModal(false);
      setRevisionNote('');
      load();
    } catch (error: any) {
      Alert.alert('Could not request', error?.message || 'Please try again.');
    } finally {
      setSubmittingRevision(false);
    }
  };

  // gap.category is model-drafted text - only pass it to Shop when it is a
  // category the Shop chips can actually represent, otherwise land unfiltered
  // rather than on an inexplicably empty grid.
  const openGapInShop = (rawCategory: string) => {
    const normalized = (rawCategory || '').toLowerCase().trim();
    const category = SHOP_CATEGORIES.find(c => c === normalized || c === `${normalized}s`);
    navigation.navigate('Shop', category ? { category, matchedOnly: true } : { matchedOnly: true });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={styles.busyBox}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  if (!edit) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <BackButton />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Edit not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = coverageStats(edit);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{edit.focus.toUpperCase()}</Text>
        <Text style={styles.title}>Your Edit</Text>
        <Text style={styles.subtitle}>by {edit.stylistName}</Text>

        <View style={styles.coverageCard}>
          <Text style={styles.coverageNumber}>
            {stats.looks} looks from {stats.pieces} pieces
          </Text>
          <Text style={styles.coverageSub}>
            Every one of them already in your closet — nothing here needs buying.
          </Text>
        </View>

        {!!edit.stylistNote && (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>FROM YOUR STYLIST</Text>
            <Text style={styles.noteText}>{edit.stylistNote}</Text>
          </View>
        )}

        {edit.looks.map((look, index) => (
          <View key={look.id} style={styles.lookBlock}>
            <View style={styles.lookHead}>
              <Text style={styles.lookIndex}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.lookTitleWrap}>
                <Text style={styles.lookTitle}>{look.title}</Text>
                {!!look.occasion && <Text style={styles.lookOccasion}>{look.occasion}</Text>}
              </View>
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

            {!!look.rationale && <Text style={styles.lookRationale}>{look.rationale}</Text>}
          </View>
        ))}

        {edit.gaps.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>WHAT WOULD OPEN THIS UP</Text>
            <Text style={styles.gapsIntro}>
              Kept separate from the looks on purpose — an Edit is about what you own. These are
              the only genuine holes your stylist found.
            </Text>
            {edit.gaps.map((gap, i) => (
              <TouchableOpacity
                key={`${gap.category}-${i}`}
                style={styles.gapRow}
                activeOpacity={0.85}
                onPress={() => openGapInShop(gap.category)}
              >
                <View style={styles.gapInfo}>
                  <Text style={styles.gapTitle}>{gap.description}</Text>
                  <Text style={styles.gapWhy}>{gap.whyNeeded}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {edit.status === 'revision-requested' ? (
          <Text style={styles.revisionNote}>
            Your stylist has been asked for another pass on this Edit.
          </Text>
        ) : (
          <Button
            title="Ask for another pass"
            variant="secondary"
            onPress={() => setShowRevisionModal(true)}
            fullWidth
            style={{ marginTop: spacing.section }}
          />
        )}
      </ScrollView>

      {/* Revision request: a short free-text reason the stylist sees verbatim. */}
      <Modal
        visible={showRevisionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRevisionModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRevisionModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Another pass</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.modalHint}>
              Tell {edit.stylistName} what you'd like changed. It goes to them word for word, so
              the more specific, the better the rework.
            </Text>
            <TextInput
              style={styles.revisionInput}
              placeholder="The work looks land, but the weekend ones feel too dressy…"
              placeholderTextColor={colors.inkFaint}
              value={revisionNote}
              onChangeText={setRevisionNote}
              multiline
              textAlignVertical="top"
            />
            <Button
              title={submittingRevision ? 'Sending…' : 'Request revision'}
              onPress={handleSubmitRevision}
              fullWidth
              disabled={submittingRevision || !revisionNote.trim()}
              style={{ marginTop: spacing.lg }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  busyBox: { paddingVertical: 100, alignItems: 'center' },
  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 12 },

  coverageCard: { backgroundColor: colors.paper, padding: spacing.lg, marginTop: spacing.lg },
  coverageNumber: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  coverageSub: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginTop: 6 },

  noteCard: { backgroundColor: colors.sand, padding: spacing.lg, marginTop: spacing.sm },
  noteLabel: { ...textType.microLabel, color: colors.tobacco, marginBottom: 8 },
  noteText: { ...textType.body, color: colors.ink, lineHeight: 22 },

  lookBlock: {
    marginTop: spacing.section,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  lookHead: { flexDirection: 'row', alignItems: 'flex-start' },
  lookIndex: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.camel,
    width: 40,
  },
  lookTitleWrap: { flex: 1 },
  lookTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  lookOccasion: { ...textType.microLabel, color: colors.inkFaint, marginTop: 4 },
  lookItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  lookThumb: { width: 76, height: 76, backgroundColor: colors.paper },
  lookRationale: { ...textType.body, color: colors.inkMuted, marginTop: spacing.md, lineHeight: 22 },

  gapsIntro: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginBottom: 12 },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  gapInfo: { flex: 1 },
  gapTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  gapWhy: { ...textType.body, fontSize: 12, color: colors.inkMuted, marginTop: 3 },
  chevron: { fontSize: 22, color: colors.inkFaint },

  revisionNote: {
    ...textType.body,
    fontSize: 13,
    color: colors.tobacco,
    marginTop: spacing.section,
  },

  modalContainer: { flex: 1, backgroundColor: colors.bone },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  modalClose: { fontSize: 20, color: colors.inkMuted },
  modalTitle: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  modalBody: { paddingHorizontal: spacing.page, paddingBottom: 40 },
  modalHint: { ...textType.body, color: colors.inkMuted, lineHeight: 22, marginBottom: spacing.md },
  revisionInput: {
    ...textType.body,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 120,
  },
});

/**
 * Trend Desk: what a trend shows when a user picks it, and the form that
 * seeds pieces for it.
 *
 * The preview is the same call the app makes (piecesForTrend), per
 * department, so the editor sees the real rail before publishing - including
 * the honest case where nothing carries the trend yet.
 *
 * Seeding keeps the catalogue's rule: the photo comes first. The editor
 * pastes an Unsplash image address, the desk looks at the photo and writes
 * the card from it (describeTrendPiece), and the editor confirms with photo
 * and words side by side. Nothing is stored until that tap.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { FashionTrend, TrendSeedPiece } from '../models/fashionTrend';
import { Product } from '../models/product';
import { piecesForTrend } from '../services/trendLooks';
import { trendService, TrendPieceProposal } from '../services/trendService';
import { MAX_SEED_PIECES, seedAnchor, seedPhotoId, seedPhotoUrl, trendAnchorSearches } from '../services/trendSeeds';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

const DEPARTMENTS: { value: TrendSeedPiece['department']; label: string }[] = [
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
  { value: 'unisex', label: 'Both' },
];

interface Props {
  trend: FashionTrend;
  /** The server's kept set after a save, so the desk row updates in place. */
  onSeedsChanged: (trendId: string, pieces: TrendSeedPiece[]) => void;
  notify: (message: string, kind: 'success' | 'error') => void;
}

/**
 * The desk functions are deployed separately from the app. Until they are,
 * the call fails as "not found" - say that, rather than blame the photo.
 */
function failureMessage(error: any, fallback: string): string {
  const code = String(error?.code || '');
  if (code.includes('not-found') && !/trend no longer exists/i.test(String(error?.message || ''))) {
    return 'Seeding is not switched on yet: the desk functions need deploying.';
  }
  if (code.includes('invalid-argument') || code.includes('permission-denied')) {
    return String(error?.message || fallback);
  }
  return fallback;
}

function Rail({ label, pieces }: { label: string; pieces: Product[] }) {
  return (
    <View style={styles.rail}>
      <Text style={styles.railLabel}>{label}</Text>
      {pieces.length === 0 ? (
        <Text style={styles.railEmpty}>
          Nothing carries it yet. It needs at least two pieces to show a rail; until then the user gets its key
          pieces as Amazon searches.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
          {pieces.map(product => (
            <View key={product.id} style={styles.thumb}>
              <Image source={{ uri: product.imageUrl }} style={styles.thumbImage} resizeMode="cover" />
              <Text style={styles.thumbName} numberOfLines={2}>
                {product.name}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default function TrendSeedPanel({ trend, onSeedsChanged, notify }: Props) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState('');
  const [department, setDepartment] = useState<TrendSeedPiece['department']>('women');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState<TrendPieceProposal | null>(null);
  const [draft, setDraft] = useState<TrendSeedPiece | null>(null);

  const women = useMemo(() => piecesForTrend(trend, 'womens', { limit: 5 }), [trend]);
  const men = useMemo(() => piecesForTrend(trend, 'mens', { limit: 5 }), [trend]);
  const searches = useMemo(() => trendAnchorSearches(trend, 'all', 4), [trend]);

  const seeded = trend.seedPieces ?? [];
  // Editorial seed trends ship in the app bundle; their pieces are curated in code.
  const canSeed = trend.source !== 'editorial' && trend.status !== 'archived';
  const photoId = seedPhotoId(photo);

  const check = async () => {
    if (!photoId) {
      notify('Paste an Unsplash image address (images.unsplash.com/photo-…)', 'error');
      return;
    }
    if (seeded.some(piece => piece.photoId === photoId)) {
      notify('That photo is already seeded on this trend', 'error');
      return;
    }
    setChecking(true);
    setProposal(null);
    setDraft(null);
    try {
      const result = await trendService.describeTrendPiece(trend.id, photo, department);
      setProposal(result);
      setDraft(result.piece);
    } catch (error: any) {
      console.error('Error checking a seed photo:', error);
      notify(failureMessage(error, 'Could not check that photo'), 'error');
    } finally {
      setChecking(false);
    }
  };

  const save = async (pieces: TrendSeedPiece[], done: string) => {
    setSaving(true);
    try {
      const kept = await trendService.saveTrendSeedPieces(trend.id, pieces);
      onSeedsChanged(trend.id, kept);
      if (kept.length < pieces.length) {
        notify("Not kept: the piece has to name one of the trend's key pieces", 'error');
      } else {
        notify(done, 'success');
        setProposal(null);
        setDraft(null);
        setPhoto('');
      }
    } catch (error) {
      console.error('Error saving trend seeds:', error);
      notify(failureMessage(error, 'Could not save the pieces'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const draftAnchor = draft ? seedAnchor(trend, draft) : null;

  return (
    <View style={styles.panel}>
      <TouchableOpacity
        onPress={() => setOpen(current => !current)}
        accessibilityRole="button"
        accessibilityLabel={`${open ? 'Hide' : 'Show'} the pieces for ${trend.name}`}
      >
        <Text style={styles.toggle}>
          {open ? '▾' : '▸'} Pieces users see · women {women.length} · men {men.length}
          {seeded.length ? ` · ${seeded.length} seeded` : ''}
        </Text>
      </TouchableOpacity>

      {open && (
        <View>
          <Rail label="WOMENSWEAR RAIL" pieces={women} />
          <Rail label="MENSWEAR RAIL" pieces={men} />
          {searches.length > 0 && (
            <Text style={styles.searchLine}>Amazon searches offered: {searches.map(s => s.label).join(' · ')}</Text>
          )}

          {seeded.length > 0 && (
            <View style={styles.seededBox}>
              <Text style={styles.railLabel}>SEEDED FOR THIS TREND</Text>
              {seeded.map(piece => (
                <View key={piece.id} style={styles.seededRow}>
                  <Image source={{ uri: seedPhotoUrl(piece.photoId, 200) }} style={styles.seededImage} resizeMode="cover" />
                  <View style={styles.seededText}>
                    <Text style={styles.seededName}>{piece.name}</Text>
                    <Text style={styles.seededMeta}>
                      {[piece.color, piece.department === 'unisex' ? 'women + men' : piece.department, piece.price ? `$${piece.price}` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {canSeed && (
                    <TouchableOpacity
                      disabled={saving}
                      onPress={() => save(seeded.filter(p => p.id !== piece.id), `Removed "${piece.name}"`)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${piece.name}`}
                    >
                      <Text style={styles.remove}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {canSeed && seeded.length < MAX_SEED_PIECES && (
            <View style={styles.form}>
              <Text style={styles.railLabel}>SEED A PIECE</Text>
              <Text style={styles.hint}>
                Find a photo on unsplash.com that clearly shows one of this trend's key pieces, copy its image address
                (it starts with images.unsplash.com/photo-) and paste it here. The desk looks at the photo and writes
                the card from it; nothing is added until you confirm.
              </Text>
              <TextInput
                style={styles.input}
                value={photo}
                onChangeText={setPhoto}
                placeholder="https://images.unsplash.com/photo-…"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Unsplash image address"
              />
              <View style={styles.deptRow}>
                {DEPARTMENTS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.deptChip, department === option.value && styles.deptChipOn]}
                    onPress={() => setDepartment(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: department === option.value }}
                  >
                    <Text style={[styles.deptChipText, department === option.value && styles.deptChipTextOn]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.checkButton, (checking || !photo.trim()) && styles.buttonBusy]}
                  disabled={checking || !photo.trim()}
                  onPress={check}
                  accessibilityRole="button"
                >
                  <Text style={styles.checkButtonText}>{checking ? 'Looking…' : 'Check photo'}</Text>
                </TouchableOpacity>
              </View>

              {proposal && photoId && (
                <View style={styles.proposal}>
                  <Image source={{ uri: seedPhotoUrl(photoId, 400) }} style={styles.proposalImage} resizeMode="cover" />
                  <View style={styles.proposalText}>
                    <Text style={[styles.verdict, !proposal.usable && styles.verdictNo]}>
                      {proposal.usable ? 'Reads as a fit' : 'Not usable'}
                    </Text>
                    {!!proposal.reason && <Text style={styles.reason}>{proposal.reason}</Text>}
                    {proposal.usable && draft && (
                      <View>
                        <Text style={styles.fieldLabel}>NAME ON THE CARD</Text>
                        <TextInput
                          style={styles.input}
                          value={draft.name}
                          onChangeText={name => setDraft({ ...draft, name })}
                          accessibilityLabel="Piece name"
                        />
                        <Text style={styles.fieldLabel}>COLOUR</Text>
                        <TextInput
                          style={styles.input}
                          value={draft.color}
                          onChangeText={color => setDraft({ ...draft, color })}
                          autoCapitalize="none"
                          accessibilityLabel="Piece colour"
                        />
                        <Text style={styles.fieldLabel}>TYPICAL PRICE (USD)</Text>
                        <TextInput
                          style={styles.input}
                          value={draft.price ? String(draft.price) : ''}
                          onChangeText={text => setDraft({ ...draft, price: Number(text.replace(/[^0-9]/g, '')) || 0 })}
                          keyboardType="number-pad"
                          accessibilityLabel="Typical price"
                        />
                        <Text style={styles.seededMeta}>
                          {draft.category} · {draft.subcategory} ·{' '}
                          {draft.department === 'unisex' ? 'women + men' : draft.department}
                        </Text>
                        {!draftAnchor && (
                          <Text style={styles.verdictNo}>
                            The name no longer says one of the trend's key pieces, so it would not be kept.
                          </Text>
                        )}
                      </View>
                    )}
                    <View style={styles.proposalActions}>
                      {proposal.usable && draft && (
                        <TouchableOpacity
                          style={[styles.checkButton, (saving || !draftAnchor || !draft.name.trim()) && styles.buttonBusy]}
                          disabled={saving || !draftAnchor || !draft.name.trim()}
                          onPress={() => save([...seeded, draft], `"${draft.name}" added to ${trend.name}`)}
                          accessibilityRole="button"
                        >
                          <Text style={styles.checkButtonText}>{saving ? 'Saving…' : 'Add to this trend'}</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          setProposal(null);
                          setDraft(null);
                        }}
                        accessibilityRole="button"
                      >
                        <Text style={styles.remove}>Discard</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: spacing.md },
  toggle: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.tobacco, paddingVertical: 6 },

  rail: { marginTop: 10 },
  railLabel: { ...textType.eyebrow, fontSize: 9, color: colors.tobacco },
  railEmpty: { ...textType.meta, fontSize: 11, lineHeight: 16, marginTop: 6, color: colors.inkMuted },
  railContent: { gap: 8, paddingTop: 8 },
  thumb: { width: 76 },
  thumbImage: { width: 76, height: 96, borderRadius: radius.sm, backgroundColor: colors.paper },
  thumbName: { ...textType.meta, fontSize: 10, lineHeight: 13, marginTop: 4 },
  searchLine: { ...textType.meta, fontSize: 11, lineHeight: 16, marginTop: 10, color: colors.inkMuted },

  seededBox: { marginTop: spacing.md },
  seededRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  seededImage: { width: 44, height: 56, borderRadius: radius.sm, backgroundColor: colors.paper },
  seededText: { flex: 1 },
  seededName: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  seededMeta: { ...textType.meta, fontSize: 11, marginTop: 2 },
  remove: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.inkFaint, paddingVertical: 8 },

  form: {
    marginTop: spacing.md,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  hint: { ...textType.meta, fontSize: 11, lineHeight: 16, marginTop: 6, color: colors.inkMuted },
  input: {
    marginTop: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.bone,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.ink,
  },
  deptRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
  deptChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  deptChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  deptChipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.ink },
  deptChipTextOn: { color: colors.bone },
  checkButton: {
    borderRadius: radius.full,
    backgroundColor: colors.rust,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  buttonBusy: { opacity: 0.6 },
  checkButtonText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.bone },

  proposal: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing.md },
  proposalImage: { width: 132, height: 170, borderRadius: radius.sm, backgroundColor: colors.bone },
  proposalText: { flex: 1, minWidth: 180 },
  verdict: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.ink },
  verdictNo: { fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 17, color: colors.rust, marginTop: 4 },
  reason: { ...textType.meta, fontSize: 12, lineHeight: 17, marginTop: 4 },
  fieldLabel: { ...textType.eyebrow, fontSize: 9, marginTop: 10 },
  proposalActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
});

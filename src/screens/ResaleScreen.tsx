import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { closetAPI, getCurrentUserId } from '../services/api';
import {
  resaleService,
  rankResaleCandidates,
  dormantValue,
  ResaleCandidate,
  ResaleValuation,
} from '../services/resaleService';

const CONFIDENCE_COPY: Record<ResaleValuation['confidence'], string> = {
  high: 'Confident estimate',
  medium: 'Rough estimate',
  low: 'Low confidence — add a brand and price for a sharper number',
};

export default function ResaleScreen() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<ResaleCandidate[]>([]);
  const [valuations, setValuations] = useState<Record<string, ResaleValuation>>({});
  const [valuingId, setValuingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const userId = getCurrentUserId();
      const [closetResponse, existing] = await Promise.all([
        closetAPI.getItems(userId),
        resaleService.getForUser(userId),
      ]);
      setCandidates(rankResaleCandidates(closetResponse.data || []));
      setValuations(Object.fromEntries(existing.map(v => [v.itemId, v])));
    } catch (error) {
      console.error('Error loading resale candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValuate = async (candidate: ResaleCandidate) => {
    setValuingId(candidate.itemId);
    try {
      const valuation = await resaleService.valuate(getCurrentUserId(), candidate);
      setValuations(prev => ({ ...prev, [candidate.itemId]: valuation }));
    } catch (error: any) {
      console.error('Error valuing item:', error);
      Alert.alert(
        "Couldn't price that",
        error?.message || 'Something went wrong estimating that item. Please try again.'
      );
    } finally {
      setValuingId(null);
    }
  };

  const handleShareListing = async (valuation: ResaleValuation) => {
    try {
      await Share.share({
        title: valuation.listingTitle,
        message: `${valuation.listingTitle}\n\n${valuation.listingDescription}\n\nAsking $${valuation.suggestedPrice.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error sharing listing:', error);
    }
  };

  const totalDormant = dormantValue(candidates);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>RESALE</Text>
        <Text style={styles.title}>What your closet is sitting on</Text>
        <Text style={styles.subtitle}>
          Pieces you've barely worn, ranked by how much sense selling them makes. We'll price one
          and write the listing — you take it to the marketplace of your choice.
        </Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : candidates.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Nothing worth listing yet</Text>
            <Text style={styles.emptyText}>
              Everything in your closet is either getting worn or too new to call. That's a
              well-used wardrobe — come back in a few months.
            </Text>
          </View>
        ) : (
          <>
            {totalDormant > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>${totalDormant.toFixed(0)}</Text>
                <Text style={styles.summaryLabel}>
                  original spend across {candidates.length}{' '}
                  {candidates.length === 1 ? 'piece' : 'pieces'} you've barely worn
                </Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>WORTH SELLING</Text>
            {candidates.map(candidate => {
              const valuation = valuations[candidate.itemId];
              const isValuing = valuingId === candidate.itemId;

              return (
                <View key={candidate.itemId} style={styles.card}>
                  <View style={styles.cardHead}>
                    {candidate.imageUrl ? (
                      <Image source={{ uri: candidate.imageUrl }} style={styles.thumb} />
                    ) : (
                      <View style={styles.thumb} />
                    )}
                    <View style={styles.cardInfo}>
                      <Text style={styles.itemName}>
                        {candidate.color} {candidate.subcategory || candidate.category}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {candidate.reason}
                        {candidate.price !== null ? ` · paid $${candidate.price.toFixed(0)}` : ''}
                      </Text>
                      {!!candidate.brand && <Text style={styles.itemBrand}>{candidate.brand}</Text>}
                    </View>
                  </View>

                  {valuation ? (
                    <View style={styles.valuation}>
                      <Text style={styles.valuationRange}>
                        ${valuation.estimatedLow.toFixed(0)}–${valuation.estimatedHigh.toFixed(0)}
                      </Text>
                      <Text style={styles.valuationSuggested}>
                        List at ${valuation.suggestedPrice.toFixed(0)}
                      </Text>
                      <Text style={styles.confidence}>{CONFIDENCE_COPY[valuation.confidence]}</Text>
                      {!!valuation.rationale && (
                        <Text style={styles.rationale}>{valuation.rationale}</Text>
                      )}

                      {valuation.bestPlatforms.length > 0 && (
                        <View style={styles.platformRow}>
                          {valuation.bestPlatforms.map(p => (
                            <View key={p} style={styles.platformChip}>
                              <Text style={styles.platformText}>{p}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {!!valuation.listingTitle && (
                        <View style={styles.listingBox}>
                          <Text style={styles.listingLabel}>YOUR LISTING</Text>
                          <Text style={styles.listingTitle}>{valuation.listingTitle}</Text>
                          <Text style={styles.listingBody}>{valuation.listingDescription}</Text>
                        </View>
                      )}

                      <Button
                        title="Share listing"
                        variant="secondary"
                        onPress={() => handleShareListing(valuation)}
                        fullWidth
                        style={{ marginTop: spacing.md }}
                      />
                    </View>
                  ) : (
                    <Button
                      title={isValuing ? 'Pricing…' : 'Price it'}
                      onPress={() => handleValuate(candidate)}
                      disabled={isValuing}
                      fullWidth
                      style={{ marginTop: spacing.md }}
                    />
                  )}
                </View>
              );
            })}

            <Text style={styles.disclaimer}>
              Estimates are guidance, not appraisals. Actual resale value depends on condition,
              size and demand on the day you list.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12 },
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 12 },

  loadingBox: { paddingVertical: 80, alignItems: 'center' },
  emptyBox: { marginTop: spacing.section, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },

  summaryCard: { backgroundColor: colors.paper, padding: spacing.lg, marginTop: spacing.lg },
  summaryNumber: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  summaryLabel: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginTop: 6 },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 60, height: 60, marginRight: 14, backgroundColor: colors.paper },
  cardInfo: { flex: 1 },
  itemName: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  itemMeta: { ...textType.meta, fontSize: 12, marginTop: 3 },
  itemBrand: { ...textType.meta, fontSize: 11, marginTop: 2, color: colors.inkFaint },

  valuation: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.hair },
  valuationRange: { fontFamily: fonts.serif, fontSize: 28, color: colors.ink },
  valuationSuggested: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.tobacco, marginTop: 4 },
  confidence: { ...textType.meta, fontSize: 11, marginTop: 6 },
  rationale: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginTop: 8 },

  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  platformChip: { backgroundColor: colors.sand, paddingHorizontal: 10, paddingVertical: 5 },
  platformText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.ink },

  listingBox: { marginTop: spacing.md, backgroundColor: colors.paper, padding: 14 },
  listingLabel: { ...textType.microLabel, color: colors.inkFaint, marginBottom: 6 },
  listingTitle: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  listingBody: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginTop: 6 },

  disclaimer: {
    ...textType.meta,
    fontSize: 11,
    marginTop: spacing.lg,
    color: colors.inkFaint,
  },
});

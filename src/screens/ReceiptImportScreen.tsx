import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import PhotoUploadModal from '../components/PhotoUploadModal';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { getCurrentUserId } from '../services/api';
import { receiptAPI, ParsedReceipt, ParsedReceiptItem } from '../services/firebaseApi';
import { closetService } from '../services/firestore';
import {
  receiptForwardingService,
  PendingReceiptImport,
} from '../services/receiptForwardingService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenState = 'intro' | 'parsing' | 'review' | 'importing';

const CONFIDENCE_COPY: Record<ParsedReceiptItem['confidence'], string> = {
  high: 'Clear',
  medium: 'Check this',
  low: 'Hard to read — verify',
};

export default function ReceiptImportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [screenState, setScreenState] = useState<ScreenState>('intro');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [receipt, setReceipt] = useState<ParsedReceipt | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [forwardingAddress, setForwardingAddress] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingReceiptImport[]>([]);

  useEffect(() => {
    loadForwarding();
  }, []);

  const loadForwarding = async () => {
    try {
      const userId = getCurrentUserId();
      const [address, staged] = await Promise.all([
        receiptForwardingService.getOrCreateAddress(userId),
        receiptForwardingService.getPending(userId),
      ]);
      setForwardingAddress(address);
      setPending(staged);
    } catch (error) {
      console.error('Error loading receipt forwarding:', error);
    }
  };

  const handleImportPending = async (item: PendingReceiptImport) => {
    try {
      // Everything the parser was confident about is pre-approved; anything it
      // struggled with is left out rather than quietly added.
      const indexes = item.items
        .map((line, i) => (line.confidence !== 'low' ? i : -1))
        .filter(i => i >= 0);

      if (indexes.length === 0) {
        Alert.alert(
          'Nothing confident enough',
          'None of those lines were legible enough to add automatically. Photograph the receipt instead.'
        );
        return;
      }

      const count = await receiptForwardingService.importItems(getCurrentUserId(), item, indexes);
      await loadForwarding();
      Alert.alert('Added to your closet', `${count} item${count === 1 ? '' : 's'} imported.`);
    } catch (error: any) {
      Alert.alert('Import failed', error?.message || 'Please try again.');
    }
  };

  const handleDismissPending = async (item: PendingReceiptImport) => {
    try {
      await receiptForwardingService.dismiss(item.id);
      await loadForwarding();
    } catch (error) {
      console.error('Error dismissing pending import:', error);
    }
  };

  const handleShareAddress = async () => {
    if (!forwardingAddress) return;
    try {
      await Share.share({ message: forwardingAddress });
    } catch (error) {
      console.error('Error sharing address:', error);
    }
  };

  const handlePhotoSelected = async (uri: string) => {
    setScreenState('parsing');
    try {
      const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
      const parsed = await receiptAPI.parse(`data:image/jpeg;base64,${base64}`, getCurrentUserId());

      if (parsed.items.length === 0) {
        Alert.alert(
          'No clothing found',
          "We couldn't find any apparel lines on that receipt. Try a straighter, well-lit photo of the itemised section."
        );
        setScreenState('intro');
        return;
      }

      setReceipt(parsed);
      // Anything the model was unsure about starts unticked, so a misread line
      // has to be actively chosen rather than passively accepted.
      setSelected(
        Object.fromEntries(parsed.items.map((item, i) => [i, item.confidence !== 'low']))
      );
      setScreenState('review');
    } catch (error: any) {
      console.error('Error parsing receipt:', error);
      Alert.alert('Could not read that', error?.message || 'Please try again with a clearer photo.');
      setScreenState('intro');
    }
  };

  const handleImport = async () => {
    if (!receipt) return;
    const chosen = receipt.items.filter((_, i) => selected[i]);
    if (chosen.length === 0) {
      Alert.alert('Nothing selected', 'Tick at least one item to add to your closet.');
      return;
    }

    setScreenState('importing');
    try {
      const userId = getCurrentUserId();
      await Promise.all(
        chosen.map(item =>
          closetService.create(userId, {
            imageUrl: '',
            category: item.category as any,
            subcategory: item.description,
            color: item.color || 'unknown',
            brand: item.brand || undefined,
            price: item.price ?? undefined,
            purchaseDate: receipt.purchaseDate || undefined,
            notes: receipt.retailer ? `Imported from ${receipt.retailer} receipt` : 'Imported from receipt',
            // Flagged so the closet can prompt for a photo later - these items
            // have no image and would otherwise sit as blank tiles forever.
            needsPhoto: true,
          } as any)
        )
      );

      Alert.alert(
        'Added to your closet',
        `${chosen.length} item${chosen.length === 1 ? '' : 's'} imported. Tap an item in your closet to add its photo — outfit building needs one.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Error importing receipt items:', error);
      Alert.alert('Import failed', error?.message || 'Please try again.');
      setScreenState('review');
    }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {screenState === 'intro' && (
          <>
            <Text style={styles.eyebrow}>RECEIPT IMPORT</Text>
            <Text style={styles.title}>Add a whole haul at once</Text>
            <Text style={styles.subtitle}>
              Photograph a receipt and we'll pull out just the clothing lines — brand, colour and
              price — instead of you photographing every piece one at a time.
            </Text>
            <Button
              title="Photograph a receipt"
              onPress={() => setShowPhotoModal(true)}
              fullWidth
              style={{ marginTop: spacing.section }}
            />

            {pending.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>FORWARDED, WAITING FOR YOU</Text>
                {pending.map(item => (
                  <View key={item.id} style={styles.pendingCard}>
                    <Text style={styles.pendingRetailer}>
                      {item.retailer || item.subject || 'Forwarded receipt'}
                    </Text>
                    <Text style={styles.pendingMeta}>
                      {item.items.length} item{item.items.length === 1 ? '' : 's'} found
                    </Text>
                    <View style={styles.pendingActions}>
                      <TouchableOpacity onPress={() => handleImportPending(item)}>
                        <Text style={styles.pendingPrimary}>Add to closet</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDismissPending(item)}>
                        <Text style={styles.pendingSecondary}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.sectionLabel}>OR FORWARD YOUR CONFIRMATION EMAILS</Text>
            <Text style={styles.forwardHelper}>
              Forward any order confirmation to your private address and the clothing lines land
              here for review. Nothing is added to your closet until you say so.
            </Text>
            {forwardingAddress ? (
              <TouchableOpacity style={styles.addressBox} onPress={handleShareAddress} activeOpacity={0.85}>
                <Text style={styles.addressText} selectable>
                  {forwardingAddress}
                </Text>
                <Text style={styles.addressHint}>Tap to share</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.forwardHelper}>Setting up your address…</Text>
            )}
          </>
        )}

        {screenState === 'parsing' && (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
            <Text style={styles.busyText}>Reading the receipt…</Text>
          </View>
        )}

        {screenState === 'importing' && (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
            <Text style={styles.busyText}>Adding to your closet…</Text>
          </View>
        )}

        {screenState === 'review' && receipt && (
          <>
            <Text style={styles.eyebrow}>{receipt.retailer || 'RECEIPT'}</Text>
            <Text style={styles.title}>
              {receipt.items.length} item{receipt.items.length === 1 ? '' : 's'} found
            </Text>
            <Text style={styles.subtitle}>
              Tick what you want in your closet. Anything we struggled to read starts unticked —
              check those before adding.
            </Text>

            {receipt.items.map((item, i) => (
              <TouchableOpacity
                key={`${item.description}-${i}`}
                style={[styles.itemRow, selected[i] && styles.itemRowSelected]}
                onPress={() => setSelected(prev => ({ ...prev, [i]: !prev[i] }))}
                activeOpacity={0.85}
              >
                <View style={[styles.checkbox, selected[i] && styles.checkboxOn]}>
                  {selected[i] && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.description}</Text>
                  <Text style={styles.itemMeta}>
                    {item.category}
                    {item.brand ? ` · ${item.brand}` : ''}
                    {item.price !== null ? ` · $${item.price.toFixed(2)}` : ''}
                  </Text>
                  {item.confidence !== 'high' && (
                    <Text style={styles.confidence}>{CONFIDENCE_COPY[item.confidence]}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <Button
              title={`Add ${selectedCount} to closet`}
              onPress={handleImport}
              fullWidth
              disabled={selectedCount === 0}
              style={{ marginTop: spacing.section }}
            />
          </>
        )}
      </ScrollView>

      <PhotoUploadModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onPhotoSelected={uri => {
          setShowPhotoModal(false);
          handlePhotoSelected(uri);
        }}
      />
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
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 12 },
  forwardHelper: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginBottom: 12 },
  addressBox: { backgroundColor: colors.paper, padding: spacing.md },
  addressText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  addressHint: { ...textType.meta, fontSize: 11, marginTop: 6 },
  pendingCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pendingRetailer: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  pendingMeta: { ...textType.meta, fontSize: 12, marginTop: 3 },
  pendingActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  pendingPrimary: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.ink },
  pendingSecondary: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.inkFaint },
  busyText: { ...textType.body, color: colors.inkMuted, marginTop: 20 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  itemRowSelected: { borderColor: colors.ink },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: colors.inkFaint,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  checkmark: { color: colors.white, fontSize: 13, fontFamily: fonts.sansSemiBold },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  itemMeta: { ...textType.meta, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  confidence: { ...textType.meta, fontSize: 11, marginTop: 4, color: colors.tobacco },
});

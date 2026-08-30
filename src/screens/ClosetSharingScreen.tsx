import React, { useEffect, useState } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { getCurrentUserId, getCurrentUserName } from '../services/firebaseApi';
import {
  closetSharingService,
  ClosetShare,
  SharedClosetItem,
} from '../services/closetSharingService';

type Tab = 'shared-with-me' | 'my-shares';

export default function ClosetSharingScreen() {
  const [tab, setTab] = useState<Tab>('shared-with-me');
  const [loading, setLoading] = useState(true);

  const [sharedWithMe, setSharedWithMe] = useState<ClosetShare[]>([]);
  const [myShares, setMyShares] = useState<ClosetShare[]>([]);

  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [includePrices, setIncludePrices] = useState(false);

  const [viewing, setViewing] = useState<ClosetShare | null>(null);
  const [viewingItems, setViewingItems] = useState<SharedClosetItem[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const userId = getCurrentUserId();
      const [incoming, outgoing] = await Promise.all([
        closetSharingService.getSharedWithMe(userId),
        closetSharingService.getMyShares(userId),
      ]);
      setSharedWithMe(incoming);
      setMyShares(outgoing);
    } catch (error) {
      console.error('Error loading closet shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      const people = await closetSharingService.findPeople(text);
      setResults(people.filter(p => p.id !== getCurrentUserId()).slice(0, 6));
    } catch (error) {
      console.error('Error searching people:', error);
    }
  };

  const handleShare = async (viewerId: string, displayName: string) => {
    try {
      await closetSharingService.share(
        getCurrentUserId(),
        getCurrentUserName(),
        viewerId,
        displayName,
        includePrices
      );
      setSearchText('');
      setResults([]);
      load();
      Alert.alert('Shared', `${displayName} can now see your closet. You can revoke this any time.`);
    } catch (error: any) {
      Alert.alert('Could not share', error?.message || 'Please try again.');
    }
  };

  const handleRevoke = (share: ClosetShare) => {
    Alert.alert('Revoke access?', 'They will no longer be able to see your closet.', [
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await closetSharingService.revoke(share.ownerId, share.viewerId);
            load();
          } catch (error: any) {
            Alert.alert('Could not revoke', error?.message || 'Please try again.');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openSharedCloset = async (share: ClosetShare) => {
    try {
      const items = await closetSharingService.getSharedCloset(share.ownerId, getCurrentUserId());
      setViewing(share);
      setViewingItems(items);
    } catch (error: any) {
      Alert.alert('Could not open', error?.message || 'Please try again.');
    }
  };

  if (viewing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setViewing(null)}>
            <Text style={styles.backLink}>‹ Back</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>SHARED CLOSET</Text>
          <Text style={styles.title}>{viewing.ownerName}</Text>
          <Text style={styles.subtitle}>
            {viewingItems.length} {viewingItems.length === 1 ? 'piece' : 'pieces'}
            {viewing.includePrices ? '' : ' · prices hidden by the owner'}
          </Text>

          <View style={styles.grid}>
            {viewingItems.map(item => (
              <View key={item.id} style={styles.gridItem}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
                ) : (
                  <View style={styles.gridImage} />
                )}
                <Text style={styles.gridCaption} numberOfLines={1}>
                  {item.color} {item.subcategory || item.category}
                </Text>
                {viewing.includePrices && typeof item.price === 'number' && (
                  <Text style={styles.gridPrice}>${item.price.toFixed(0)}</Text>
                )}
              </View>
            ))}
          </View>
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
        <Text style={styles.eyebrow}>CLOSET SHARING</Text>
        <Text style={styles.title}>Borrow each other's eyes</Text>
        <Text style={styles.subtitle}>
          Share your closet with someone you actually trade clothes with. Every share is
          per-person and revocable, and prices stay private unless you say otherwise.
        </Text>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'shared-with-me' && styles.tabActive]}
            onPress={() => setTab('shared-with-me')}
          >
            <Text style={[styles.tabText, tab === 'shared-with-me' && styles.tabTextActive]}>
              Shared with me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'my-shares' && styles.tabActive]}
            onPress={() => setTab('my-shares')}
          >
            <Text style={[styles.tabText, tab === 'my-shares' && styles.tabTextActive]}>
              I'm sharing
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : tab === 'shared-with-me' ? (
          sharedWithMe.length === 0 ? (
            <Text style={styles.empty}>Nobody has shared their closet with you yet.</Text>
          ) : (
            sharedWithMe.map(share => (
              <TouchableOpacity
                key={share.id}
                style={styles.row}
                onPress={() => openSharedCloset(share)}
                activeOpacity={0.85}
              >
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{share.ownerName}</Text>
                  <Text style={styles.rowMeta}>Tap to browse their closet</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )
        ) : (
          <>
            <Text style={styles.sectionLabel}>SHARE WITH SOMEONE</Text>
            <View style={styles.priceToggleRow}>
              <Text style={styles.priceToggleLabel}>Include prices and wear counts</Text>
              <Switch
                value={includePrices}
                onValueChange={setIncludePrices}
                trackColor={{ true: colors.ink, false: colors.sand }}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Search by name or username…"
              placeholderTextColor={colors.inkFaint}
              value={searchText}
              onChangeText={handleSearch}
              autoCorrect={false}
            />
            {results.map(person => (
              <TouchableOpacity
                key={person.id}
                style={styles.row}
                onPress={() => handleShare(person.id, person.displayName)}
                activeOpacity={0.85}
              >
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{person.displayName}</Text>
                  <Text style={styles.rowMeta}>@{person.username}</Text>
                </View>
                <Text style={styles.shareLink}>Share</Text>
              </TouchableOpacity>
            ))}

            {myShares.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>CURRENTLY SHARED WITH</Text>
                {myShares.map(share => (
                  <View key={share.id} style={styles.row}>
                    <View style={styles.rowInfo}>
                      {/* viewerName exists on shares made after it was captured;
                          the uid fallback keeps older shares revocable. */}
                      <Text style={styles.rowName}>{share.viewerName || share.viewerId}</Text>
                      <Text style={styles.rowMeta}>
                        {share.includePrices ? 'Prices visible' : 'Prices hidden'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRevoke(share)}>
                      <Text style={styles.revokeLink}>Revoke</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </>
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
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 12 },
  empty: { ...textType.body, color: colors.inkMuted, marginTop: spacing.lg },

  tabRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  tab: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.paper },
  tabActive: { backgroundColor: colors.ink },
  tabText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  tabTextActive: { color: colors.white },

  busyBox: { paddingVertical: 60, alignItems: 'center' },

  input: {
    ...textType.body,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: spacing.sm,
  },
  priceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  priceToggleLabel: { ...textType.body, fontSize: 13, color: colors.inkMuted, flex: 1 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  rowInfo: { flex: 1 },
  rowName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  rowMeta: { ...textType.meta, fontSize: 12, marginTop: 3 },
  chevron: { fontSize: 22, color: colors.inkFaint },
  shareLink: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.tobacco },
  revokeLink: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.tobacco },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.lg },
  gridItem: { width: 104 },
  gridImage: { width: 104, height: 104, backgroundColor: colors.paper },
  gridCaption: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 5,
    textTransform: 'capitalize',
  },
  gridPrice: { ...textType.meta, fontSize: 11, color: colors.ink },
});

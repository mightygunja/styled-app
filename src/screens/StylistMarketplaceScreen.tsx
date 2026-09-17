import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BackButton from '../components/BackButton';
import Chip from '../components/Chip';
import { Stylist } from '../types';
import { RootStackParamList } from '../navigation/types';
import { stylistAPI } from '../services/stylistAPI';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type Filter = 'all' | 'top-rated' | 'affordable';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Everyone' },
  { value: 'top-rated', label: 'Highest rated' },
  { value: 'affordable', label: 'Under $125' },
];

export default function StylistMarketplaceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<Filter>('all');
  // A failed load/search/filter must not read as "No stylists match that".
  const [loadError, setLoadError] = useState(false);
  // Every load, search and filter takes a ticket; only the newest may write
  // results, so a slow older search cannot overwrite a newer one.
  const requestRef = useRef(0);
  const lastRequestRef = useRef<() => void>(() => {});

  useEffect(() => {
    loadStylists();
  }, []);

  const loadStylists = async () => {
    const requestId = ++requestRef.current;
    lastRequestRef.current = loadStylists;
    try {
      setLoading(true);
      setLoadError(false);
      const data = await stylistAPI.getStylists();
      if (requestId !== requestRef.current) return;
      setStylists(data);
    } catch (error) {
      console.error('Error loading stylists:', error);
      if (requestId === requestRef.current) setLoadError(true);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      loadStylists();
      return;
    }

    const requestId = ++requestRef.current;
    lastRequestRef.current = () => handleSearch(query);
    try {
      setLoadError(false);
      const results = await stylistAPI.searchStylists(query);
      if (requestId !== requestRef.current) return;
      setStylists(results);
      setLoading(false);
    } catch (error) {
      console.error('Error searching:', error);
      if (requestId !== requestRef.current) return;
      setLoadError(true);
      setLoading(false);
    }
  };

  const applyFilter = async (filter: Filter) => {
    setSelectedFilter(filter);

    if (filter === 'all') {
      loadStylists();
      return;
    }

    const requestId = ++requestRef.current;
    lastRequestRef.current = () => applyFilter(filter);
    try {
      setLoadError(false);
      const filtered = await stylistAPI.filterStylists(
        filter === 'top-rated' ? { minRating: 4.8 } : { maxRate: 125 }
      );
      if (requestId !== requestRef.current) return;
      setStylists(filtered);
      setLoading(false);
    } catch (error) {
      console.error('Error filtering:', error);
      if (requestId !== requestRef.current) return;
      setLoadError(true);
      setLoading(false);
    }
  };

  const renderStylistCard = (stylist: Stylist) => (
    <TouchableOpacity
      key={stylist.id}
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('StylistDetail', { stylistId: stylist.id })}
    >
      <View style={styles.cardHead}>
        {stylist.profileImageUrl ? (
          <Image source={{ uri: stylist.profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{stylist.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.cardHeadText}>
          <Text style={styles.name}>{stylist.name}</Text>
          <Text style={styles.meta}>
            {/* A new stylist has no reviews. Showing "0.0" would read as a bad
                score rather than an absent one, so it says so plainly. */}
            {stylist.reviewCount > 0
              ? `${stylist.rating.toFixed(1)} · ${stylist.reviewCount} ${
                  stylist.reviewCount === 1 ? 'review' : 'reviews'
                }`
              : 'New to 33 Trends'}
            {stylist.location ? `  ·  ${stylist.location}` : ''}
          </Text>
          {stylist.isVerified && <Text style={styles.verified}>VERIFIED BY 33 TRENDS</Text>}
        </View>
      </View>

      {!!stylist.bio && (
        <Text style={styles.bio} numberOfLines={3}>
          {stylist.bio}
        </Text>
      )}

      {stylist.specialties?.length > 0 && (
        <Text style={styles.specialties}>{stylist.specialties.slice(0, 3).join('  ·  ')}</Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.rate}>
          ${stylist.hourlyRate}
          <Text style={styles.rateUnit}> / hour</Text>
        </Text>
        {stylist.yearsExperience > 0 && (
          <Text style={styles.years}>
            {stylist.yearsExperience} {stylist.yearsExperience === 1 ? 'year' : 'years'} styling
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>STYLISTS</Text>
        <Text style={styles.title}>Find your stylist</Text>
        <Text style={styles.subtitle}>
          Every stylist here was reviewed by a person before they appeared. Open a profile to
          book a session.
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or specialty…"
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor={colors.inkFaint}
          autoCorrect={false}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map(filter => (
            <Chip
              key={filter.value}
              label={filter.label}
              active={selectedFilter === filter.value}
              onPress={() => applyFilter(filter.value)}
              style={styles.filterChip}
            />
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        ) : loadError ? (
          <TouchableOpacity
            style={styles.emptyBox}
            accessibilityRole="button"
            accessibilityLabel="Retry loading stylists"
            onPress={() => lastRequestRef.current()}
          >
            <Text style={styles.emptyTitle}>Couldn't load stylists</Text>
            <Text style={styles.emptyText}>Check your connection. Tap to retry.</Text>
          </TouchableOpacity>
        ) : stylists.length === 0 ? (
          <View style={styles.emptyBox}>
            {/* An empty catalogue is not a search miss - say which one it is. */}
            <Text style={styles.emptyTitle}>
              {searchQuery.trim() || selectedFilter !== 'all'
                ? 'No stylists match that'
                : 'No stylists yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery.trim() || selectedFilter !== 'all'
                ? 'Try a different search, or clear the filter to see everyone.'
                : 'Stylists appear here as soon as they are approved. Check back soon.'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {stylists.length} {stylists.length === 1 ? 'STYLIST' : 'STYLISTS'}
            </Text>
            {stylists.map(renderStylistCard)}
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
  busyBox: { paddingVertical: 80, alignItems: 'center' },

  eyebrow: { ...textType.eyebrow, marginBottom: 12 },
  title: { fontFamily: fonts.serif, fontSize: 34, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 12, marginBottom: spacing.lg },

  searchInput: {
    borderRadius: radius.md,
    ...textType.body,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  filterScroll: {
    marginTop: spacing.sm,
    marginHorizontal: -spacing.page,
    flexGrow: 0,
    flexShrink: 0,
  },
  filterContent: { paddingHorizontal: spacing.page, paddingVertical: 6, alignItems: 'center' },
  filterChip: { marginRight: 8 },

  resultsCount: { ...textType.microLabel, color: colors.inkFaint, marginTop: spacing.lg },

  emptyBox: {
    borderRadius: radius.md, marginTop: spacing.section, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },

  card: {
    borderRadius: radius.md,
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.lg,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  // Avatars stay circular - the system's square corners are for panels and
  // controls, not for portraits.
  avatar: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.paper },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontFamily: fonts.serif, fontSize: 22, color: colors.tobacco },
  cardHeadText: { flex: 1, marginLeft: 14 },
  name: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  meta: { ...textType.meta, fontSize: 12, marginTop: 3 },
  verified: { ...textType.microLabel, color: colors.camel, marginTop: 6 },

  bio: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginTop: spacing.md, lineHeight: 20 },
  specialties: { ...textType.meta, fontSize: 11, marginTop: spacing.sm, color: colors.tobacco },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  rate: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  rateUnit: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  years: { ...textType.meta, fontSize: 11 },
});

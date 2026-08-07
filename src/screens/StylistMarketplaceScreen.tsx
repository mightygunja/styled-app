import React, { useState, useEffect } from 'react';
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
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';

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

  useEffect(() => {
    loadStylists();
  }, []);

  const loadStylists = async () => {
    try {
      setLoading(true);
      const data = await stylistAPI.getStylists();
      setStylists(data);
    } catch (error) {
      console.error('Error loading stylists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      loadStylists();
      return;
    }

    try {
      const results = await stylistAPI.searchStylists(query);
      setStylists(results);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const applyFilter = async (filter: Filter) => {
    setSelectedFilter(filter);

    try {
      if (filter === 'all') {
        loadStylists();
      } else if (filter === 'top-rated') {
        const filtered = await stylistAPI.filterStylists({ minRating: 4.8 });
        setStylists(filtered);
      } else if (filter === 'affordable') {
        const filtered = await stylistAPI.filterStylists({ maxRate: 125 });
        setStylists(filtered);
      }
    } catch (error) {
      console.error('Error filtering:', error);
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
          Every stylist here was reviewed by a person before they appeared. Book a session, or
          ask one to build an Edit from the clothes you already own.
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
        ) : stylists.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No stylists match that</Text>
            <Text style={styles.emptyText}>
              Try a different search, or clear the filter to see everyone.
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

  emptyBox: { marginTop: spacing.section, backgroundColor: colors.paper, padding: spacing.lg },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },

  card: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: spacing.lg,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  // Avatars stay circular - the system's square corners are for panels and
  // controls, not for portraits.
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.paper },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
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

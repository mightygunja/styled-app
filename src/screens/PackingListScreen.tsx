import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Calendar, DateData } from 'react-native-calendars';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';
import { getCurrentUserId } from '../services/api';
import { packingListService } from '../services/packingListService';
import {
  searchDestinations,
  formatDestination,
  DestinationMatch,
  DailyForecast,
  toISODate,
} from '../services/weatherService';
import {
  PackingList,
  PackingItem,
  PackingRole,
  TRIP_TYPES,
  TripType,
  coverageSummary,
  forecastRange,
  hasEstimatedDays,
} from '../models/tripPacking';

type ScreenState = 'form' | 'generating' | 'result';

const ROLE_SECTIONS: Array<{ role: PackingRole; label: string }> = [
  { role: 'top', label: 'TOPS' },
  { role: 'bottom', label: 'BOTTOMS' },
  { role: 'dress', label: 'DRESSES' },
  { role: 'outerwear', label: 'OUTERWEAR' },
  { role: 'shoes', label: 'SHOES' },
  { role: 'accessory', label: 'ACCESSORIES' },
];

const CONDITION_GLYPH: Record<string, string> = {
  sunny: '☀',
  cloudy: '☁',
  rainy: '☂',
  snowy: '❄',
  cold: '❄',
  hot: '☀',
};

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function PackingListScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('form');

  const [destinationQuery, setDestinationQuery] = useState('');
  const [destinationResults, setDestinationResults] = useState<DestinationMatch[]>([]);
  const [destination, setDestination] = useState<DestinationMatch | null>(null);
  const [searching, setSearching] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tripType, setTripType] = useState<TripType>('city break');
  const [notes, setNotes] = useState('');

  const [list, setList] = useState<PackingList | null>(null);
  const [savedTrips, setSavedTrips] = useState<PackingList[]>([]);

  useEffect(() => {
    loadSavedTrips();
  }, []);

  const loadSavedTrips = async () => {
    try {
      setSavedTrips(await packingListService.getForUser(getCurrentUserId()));
    } catch (error) {
      console.error('Error loading saved trips:', error);
    }
  };

  // Debounced destination lookup so a fast typist doesn't fire a request per keystroke.
  useEffect(() => {
    if (destination || destinationQuery.trim().length < 2) {
      setDestinationResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchDestinations(destinationQuery);
      if (!cancelled) {
        setDestinationResults(results);
        setSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [destinationQuery, destination]);

  const handleDayPress = useCallback(
    (day: DateData) => {
      const picked = day.dateString;
      // First tap sets the start; second tap closes the range, unless it lands
      // before the start, in which case it becomes the new start.
      if (!startDate || (startDate && endDate)) {
        setStartDate(picked);
        setEndDate('');
      } else if (picked < startDate) {
        setStartDate(picked);
      } else {
        setEndDate(picked);
      }
    },
    [startDate, endDate]
  );

  const markedDates = useMemo(() => {
    if (!startDate) return {};
    const marks: Record<string, any> = {};
    const last = endDate || startDate;
    const cursor = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${last}T00:00:00Z`);

    while (cursor <= end) {
      const iso = toISODate(cursor);
      marks[iso] = {
        color: colors.camel,
        textColor: colors.white,
        startingDay: iso === startDate,
        endingDay: iso === last,
      };
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return marks;
  }, [startDate, endDate]);

  const canGenerate = !!destination && !!startDate && !!endDate && screenState !== 'generating';

  const handleGenerate = async () => {
    if (!destination || !startDate || !endDate) return;
    setScreenState('generating');
    try {
      const result = await packingListService.generate({
        userId: getCurrentUserId(),
        destination,
        startDate,
        endDate,
        tripType,
        notes: notes.trim() || undefined,
      });
      setList(result);
      setScreenState('result');
      loadSavedTrips();
    } catch (error: any) {
      console.error('Error generating packing list:', error);
      Alert.alert(
        "Couldn't build that list",
        error?.message || 'Something went wrong building your packing list. Please try again.'
      );
      setScreenState('form');
    }
  };

  const resetToForm = () => {
    setList(null);
    setScreenState('form');
  };

  const startNewTrip = () => {
    setDestination(null);
    setDestinationQuery('');
    setStartDate('');
    setEndDate('');
    setNotes('');
    setList(null);
    setScreenState('form');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {screenState === 'form' && (
          <>
            <Text style={styles.eyebrow}>TRIP PACKING</Text>
            <Text style={styles.title}>Pack lighter, wear more</Text>
            <Text style={styles.subtitle}>
              Tell us where and when. We'll check the real forecast there and pack the fewest
              pieces from your closet that still cover every day.
            </Text>

            {savedTrips.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>YOUR TRIPS</Text>
                {savedTrips.slice(0, 3).map(trip => (
                  <TouchableOpacity
                    key={trip.id}
                    style={styles.savedRow}
                    activeOpacity={0.85}
                    onPress={() => {
                      setList(trip);
                      setScreenState('result');
                    }}
                  >
                    <View style={styles.savedInfo}>
                      <Text style={styles.savedName}>{trip.destinationLabel}</Text>
                      <Text style={styles.savedMeta}>
                        {formatShortDate(trip.startDate)} · {coverageSummary(trip.items)}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <Text style={styles.sectionLabel}>WHERE ARE YOU GOING?</Text>
            {destination ? (
              <View style={styles.selectedDestination}>
                <Text style={styles.selectedDestinationText}>{formatDestination(destination)}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setDestination(null);
                    setDestinationQuery('');
                  }}
                >
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Search a city…"
                  placeholderTextColor={colors.inkFaint}
                  value={destinationQuery}
                  onChangeText={setDestinationQuery}
                  autoCorrect={false}
                />
                {searching && <Text style={styles.searchingText}>Searching…</Text>}
                {destinationResults.map(match => (
                  <TouchableOpacity
                    key={match.id}
                    style={styles.resultRow}
                    activeOpacity={0.85}
                    onPress={() => {
                      setDestination(match);
                      setDestinationResults([]);
                    }}
                  >
                    <Text style={styles.resultText}>{formatDestination(match)}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <Text style={styles.sectionLabel}>WHEN?</Text>
            <Text style={styles.helper}>
              {!startDate
                ? 'Tap your departure date.'
                : !endDate
                ? 'Now tap your return date.'
                : `${formatShortDate(startDate)} → ${formatShortDate(endDate)}`}
            </Text>
            <Calendar
              onDayPress={handleDayPress}
              markingType="period"
              markedDates={markedDates}
              minDate={toISODate(new Date())}
              theme={{
                calendarBackground: colors.bone,
                textSectionTitleColor: colors.inkFaint,
                monthTextColor: colors.ink,
                dayTextColor: colors.ink,
                textDisabledColor: colors.inkFaint,
                arrowColor: colors.tobacco,
                todayTextColor: colors.tobacco,
                textDayFontFamily: fonts.sans,
                textMonthFontFamily: fonts.serif,
                textDayHeaderFontFamily: fonts.sansSemiBold,
              }}
            />

            <Text style={styles.sectionLabel}>WHAT KIND OF TRIP?</Text>
            <View style={styles.chipRow}>
              {TRIP_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, tripType === t && styles.chipActive]}
                  onPress={() => setTripType(t)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, tripType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>ANYTHING WE SHOULD KNOW? (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="One formal dinner, lots of walking…"
              placeholderTextColor={colors.inkFaint}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <Button
              title="Build my packing list"
              onPress={handleGenerate}
              fullWidth
              disabled={!canGenerate}
              style={{ marginTop: spacing.section }}
            />
          </>
        )}

        {screenState === 'generating' && (
          <View style={styles.analyzingBox}>
            <ActivityIndicator size="large" color={colors.ink} />
            <Text style={styles.analyzingText}>
              Checking the forecast in {destination ? destination.name : 'your destination'} and
              working out the smallest bag that covers it…
            </Text>
          </View>
        )}

        {screenState === 'result' && list && <PackingResult list={list} />}
      </ScrollView>

      {screenState === 'result' && list && (
        <View style={styles.footer}>
          <Button title="Plan another trip" variant="secondary" onPress={startNewTrip} fullWidth />
        </View>
      )}
    </SafeAreaView>
  );
}

function PackingResult({ list }: { list: PackingList }) {
  const range = forecastRange(list.forecast);
  const estimated = hasEstimatedDays(list.forecast);
  const itemsById = useMemo(() => new Map(list.items.map(i => [i.itemId, i])), [list.items]);

  return (
    <>
      <Text style={styles.eyebrow}>{list.tripType.toUpperCase()}</Text>
      <Text style={styles.title}>{list.destinationLabel}</Text>
      <Text style={styles.subtitle}>
        {formatShortDate(list.startDate)} → {formatShortDate(list.endDate)}
        {range ? ` · ${range.low}–${range.high}°F` : ''}
      </Text>

      <View style={styles.coverageCard}>
        <Text style={styles.coverageNumber}>{coverageSummary(list.items)}</Text>
        {!!list.headline && <Text style={styles.coverageHeadline}>{list.headline}</Text>}
      </View>

      {estimated && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            Part of this trip is beyond the 16-day forecast window. Those days use the average of
            the days we could forecast — worth a second look closer to departure.
          </Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>THE FORECAST</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastStrip}>
        {list.forecast.map(day => (
          <View key={day.date} style={styles.forecastDay}>
            <Text style={styles.forecastDate}>{formatShortDate(day.date)}</Text>
            <Text style={styles.forecastGlyph}>{CONDITION_GLYPH[day.condition] || '☁'}</Text>
            <Text style={styles.forecastTemp}>
              {day.high}° / {day.low}°
            </Text>
            {day.estimated && <Text style={styles.forecastEstimated}>est.</Text>}
          </View>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>WHAT TO PACK</Text>
      {ROLE_SECTIONS.map(section => {
        const items = list.items.filter(i => i.role === section.role);
        if (items.length === 0) return null;
        return (
          <View key={section.role} style={styles.roleGroup}>
            <Text style={styles.roleLabel}>{section.label}</Text>
            {items.map(item => (
              <PackedItemRow key={item.itemId} item={item} />
            ))}
          </View>
        );
      })}

      {list.dayPlans.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>DAY BY DAY</Text>
          {list.dayPlans.map(plan => (
            <View key={plan.date} style={styles.dayPlan}>
              <View style={styles.dayPlanHead}>
                <Text style={styles.dayPlanDate}>{formatShortDate(plan.date)}</Text>
                {!!plan.occasion && <Text style={styles.dayPlanOccasion}>{plan.occasion}</Text>}
              </View>
              <View style={styles.dayPlanThumbs}>
                {plan.itemIds.map(id => {
                  const item = itemsById.get(id);
                  if (!item) return null;
                  return item.imageUrl ? (
                    <Image key={id} source={{ uri: item.imageUrl }} style={styles.dayThumb} />
                  ) : (
                    <View key={id} style={styles.dayThumb} />
                  );
                })}
              </View>
              {!!plan.note && <Text style={styles.dayPlanNote}>{plan.note}</Text>}
            </View>
          ))}
        </>
      )}

      {list.gaps.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>WORTH PICKING UP</Text>
          <Text style={styles.gapsIntro}>
            Everything above is already yours. These are the only genuine holes for this trip.
          </Text>
          {list.gaps.map((gap, i) => (
            <View key={`${gap.category}-${i}`} style={styles.gapRow}>
              <Text style={styles.gapTitle}>{gap.description}</Text>
              <Text style={styles.gapWhy}>{gap.whyNeeded}</Text>
            </View>
          ))}
        </>
      )}
    </>
  );
}

function PackedItemRow({ item }: { item: PackingItem }) {
  return (
    <View style={styles.itemRow}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} />
      ) : (
        <View style={styles.itemThumb} />
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>
          {item.color} {item.subcategory || item.category}
        </Text>
        {!!item.reason && <Text style={styles.itemReason}>{item.reason}</Text>}
      </View>
    </View>
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
  helper: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginBottom: 12 },

  input: {
    borderRadius: radius.md,
    ...textType.body,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  notesInput: { minHeight: 72, textAlignVertical: 'top' },
  searchingText: { ...textType.meta, fontSize: 12, marginTop: 8 },
  resultRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hair },
  resultText: { ...textType.body, color: colors.ink },
  selectedDestination: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectedDestinationText: { ...textType.body, color: colors.ink, flex: 1 },
  changeLink: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.tobacco },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink, lineHeight: 17 },
  chipTextActive: { color: colors.white },

  analyzingBox: { paddingVertical: 80, alignItems: 'center' },
  analyzingText: { ...textType.body, color: colors.inkMuted, marginTop: 20, textAlign: 'center' },

  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  savedInfo: { flex: 1 },
  savedName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  savedMeta: { ...textType.meta, fontSize: 12, marginTop: 3 },
  chevron: { fontSize: 22, color: colors.inkFaint },

  coverageCard: {
    borderRadius: radius.sm, backgroundColor: colors.paper, padding: spacing.lg, marginTop: spacing.lg },
  coverageNumber: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  coverageHeadline: { ...textType.body, color: colors.inkMuted, marginTop: 8 },

  noticeBox: {
    borderRadius: radius.md, marginTop: spacing.sm, backgroundColor: colors.sand, padding: 14 },
  noticeText: { ...textType.body, fontSize: 12, color: colors.inkMuted },

  forecastStrip: { marginHorizontal: -spacing.page, paddingHorizontal: spacing.page },
  forecastDay: {
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: colors.paper,
    minWidth: 84,
  },
  forecastDate: { ...textType.meta, fontSize: 11 },
  forecastGlyph: { fontSize: 20, marginVertical: 6, color: colors.tobacco },
  forecastTemp: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  forecastEstimated: { ...textType.meta, fontSize: 10, marginTop: 2, color: colors.inkFaint },

  roleGroup: { marginBottom: spacing.lg },
  roleLabel: {
    ...textType.microLabel,
    color: colors.inkFaint,
    marginBottom: 10,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  itemThumb: {
    borderRadius: radius.sm, width: 52, height: 52, marginRight: 12, backgroundColor: colors.paper },
  itemInfo: { flex: 1 },
  itemName: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  itemReason: { ...textType.body, fontSize: 12, color: colors.inkMuted, marginTop: 3 },

  dayPlan: { marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.hair },
  dayPlanHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  dayPlanDate: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.ink },
  dayPlanOccasion: { ...textType.meta, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  dayPlanThumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  dayThumb: {
    borderRadius: radius.sm, width: 44, height: 44, backgroundColor: colors.paper },
  dayPlanNote: { ...textType.body, fontSize: 12, color: colors.inkMuted, marginTop: 10 },

  gapsIntro: { ...textType.body, fontSize: 13, color: colors.inkMuted, marginBottom: 12 },
  gapRow: { marginBottom: 14 },
  gapTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  gapWhy: { ...textType.body, fontSize: 12, color: colors.inkMuted, marginTop: 3 },

  footer: {
    padding: spacing.page,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    backgroundColor: colors.bone,
  },
});

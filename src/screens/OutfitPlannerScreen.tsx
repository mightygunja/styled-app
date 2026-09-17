import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import { Calendar, DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { closetAPI, getCurrentUserId } from '../services/api';
import { outfitPlannerService, PlannedOutfit, PlannedOutfitItem } from '../services/outfitPlannerService';
import { colors, fonts, radius } from '../theme/designSystem';
import {
  getUpcomingEvents,
  planForScheduleDetailed,
  CalendarPermissionError,
} from '../services/schedulePlanningService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const OCCASIONS = ['Casual', 'Work', 'Formal', 'Athletic'];

// Planner keys are date-only strings ("YYYY-MM-DD"). new Date('YYYY-MM-DD') is
// UTC midnight, which west of UTC formats as the previous day, and
// toISOString() flips "today" to tomorrow in the US evening. Both directions
// stay in local time here.
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date(iso);
  return new Date(y, m - 1, d);
}

function todayLocalISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

export default function OutfitPlannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedDate, setSelectedDate] = useState('');
  const [plannedOutfits, setPlannedOutfits] = useState<Record<string, PlannedOutfit>>({});
  const [markedDates, setMarkedDates] = useState<any>({});
  const [showOutfitModal, setShowOutfitModal] = useState(false);

  // Inline closet picker - the planner used to hand off to a screen that never
  // existed, so building the outfit happens here against the real closet.
  const [showPicker, setShowPicker] = useState(false);
  const [closetItems, setClosetItems] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [pickerOccasion, setPickerOccasion] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [planningWeek, setPlanningWeek] = useState(false);
  // A failed read is not an empty planner / an empty closet - say so and retry.
  const [plansLoadError, setPlansLoadError] = useState(false);
  const [closetLoadError, setClosetLoadError] = useState(false);

  useEffect(() => {
    loadPlannedOutfits();
    loadCloset();
  }, []);

  const loadCloset = async (): Promise<any[] | null> => {
    try {
      const response = await closetAPI.getItems(getCurrentUserId());
      const items = response.data || [];
      setClosetItems(items);
      setClosetLoadError(false);
      return items;
    } catch (error) {
      console.error('Error loading closet:', error);
      setClosetLoadError(true);
      return null;
    }
  };

  useEffect(() => {
    // Update marked dates when outfits change
    const marks: any = {};
    Object.keys(plannedOutfits).forEach(date => {
      marks[date] = {
        marked: true,
        dotColor: colors.ink,
        selected: date === selectedDate,
        selectedColor: date === selectedDate ? colors.ink : undefined,
      };
    });
    
    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = {
        selected: true,
        selectedColor: colors.hair,
      };
    }
    
    setMarkedDates(marks);
  }, [plannedOutfits, selectedDate]);

  const loadPlannedOutfits = async () => {
    try {
      const outfits = await outfitPlannerService.getForUser(getCurrentUserId());
      setPlannedOutfits(outfits);
      setPlansLoadError(false);
    } catch (error) {
      console.error('Error loading planned outfits:', error);
      setPlansLoadError(true);
    }
  };

  const promptEmptyCloset = () => {
    Alert.alert(
      'Your closet is empty',
      'Add a few items to your closet first — planned outfits are built from what you own.',
      [
        { text: 'Add an item', onPress: () => navigation.navigate('AddClosetItem') },
        { text: 'Not now', style: 'cancel' },
      ]
    );
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    if (plannedOutfits[day.dateString]) {
      setShowOutfitModal(true);
    }
  };

  const handleAddOutfit = async () => {
    if (!selectedDate) {
      Alert.alert('Select a Date', 'Please select a date to plan an outfit');
      return;
    }
    if (closetLoadError) {
      // The closet read failed - that is not the same as an empty closet.
      const items = await loadCloset();
      if (!items) {
        Alert.alert(
          "Couldn't load your closet",
          'Check your connection and try again. Your items are still there.'
        );
        return;
      }
      if (items.length === 0) {
        promptEmptyCloset();
        return;
      }
    } else if (closetItems.length === 0) {
      promptEmptyCloset();
      return;
    }

    setSelectedItemIds(plannedOutfits[selectedDate]?.items.map(i =>i.id) || []);
    setPickerOccasion(plannedOutfits[selectedDate]?.occasion || '');
    setShowPicker(true);
  };

  /**
   * Reads the real calendar and dresses every event on it. Falls back to a
   * clear explanation rather than a silent no-op when permission is refused or
   * the week is genuinely empty.
   */
  const handlePlanWeek = async () => {
    setPlanningWeek(true);
    try {
      const events = await getUpcomingEvents(7);
      if (events.length === 0) {
        Alert.alert(
          'Nothing on your calendar',
          "There are no events in the next week to plan around. Add an outfit to a date manually instead."
        );
        return;
      }

      const { planned, skippedDates } = await planForScheduleDetailed(getCurrentUserId(), events);
      // Days the user already planned are left exactly as they were.
      const skippedNote =
        skippedDates.length > 0
          ? `${skippedDates.length} day${skippedDates.length === 1 ? '' : 's'} you had already planned ${
              skippedDates.length === 1 ? 'was' : 'were'
            } left as ${skippedDates.length === 1 ? 'it was' : 'they were'}.`
          : '';
      if (planned.length === 0) {
        if (skippedDates.length > 0) {
          Alert.alert(
            'Already planned',
            'Every day with an event in the next week already has an outfit, so nothing was changed. Delete a planned outfit first if you want a new one for that day.'
          );
        } else {
          Alert.alert('Could not plan', 'We could not build outfits for those events. Please try again.');
        }
        return;
      }

      await loadPlannedOutfits();
      Alert.alert(
        'Your week is planned',
        `${planned.length} outfit${planned.length === 1 ? '' : 's'} planned around your calendar. Tap any marked date to see the look and why it was chosen.${skippedNote ? ` ${skippedNote}` : ''}`
      );
    } catch (error: any) {
      console.error('Error planning week:', error);
      if (error instanceof CalendarPermissionError) {
        Alert.alert('Calendar access needed', error.message);
      } else {
        Alert.alert('Could not plan your week', error?.message || 'Please try again.');
      }
    } finally {
      setPlanningWeek(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setSelectedItemIds(prev =>prev.includes(itemId) ? prev.filter(id =>id !== itemId) : [...prev, itemId]
    );
  };

  const handleSavePlannedOutfit = async () => {
    if (selectedItemIds.length === 0) {
      Alert.alert('Pick at least one piece', 'Tap the items you want to wear that day.');
      return;
    }

    setSaving(true);
    try {
      const items: PlannedOutfitItem[] = selectedItemIds
        .map(id =>closetItems.find(i =>i.id === id))
        .filter(Boolean)
        .map(item => ({
          id: item.id,
          imageUrl: item.imageUrl || '',
          category: item.category || '',
        }));

      await outfitPlannerService.save(
        getCurrentUserId(),
        selectedDate,
        items,
        pickerOccasion || undefined
      );

      setPlannedOutfits(prev => ({
        ...prev,
        [selectedDate]: {
          id: `${getCurrentUserId()}_${selectedDate}`,
          date: selectedDate,
          items,
          occasion: pickerOccasion || undefined,
          worn: false,
        },
      }));
      setShowPicker(false);
    } catch (error: any) {
      console.error('Error saving planned outfit:', error);
      Alert.alert('Could not save', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderPickerModal = () => (
    <Modal
      visible={showPicker}
      animationType="slide"
      transparent={true}
      onRequestClose={() =>setShowPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Plan {selectedDate}</Text>
            <TouchableOpacity
              onPress={() =>setShowPicker(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.occasionRow}>
            {OCCASIONS.map(o => (
              <TouchableOpacity
                key={o}
                style={[styles.occasionChip, pickerOccasion === o && styles.occasionChipActive]}
                onPress={() =>setPickerOccasion(pickerOccasion === o ? '' : o)}
              >
                <Text
                  style={[
                    styles.occasionChipText,
                    pickerOccasion === o && styles.occasionChipTextActive,
                  ]}
                >
                  {o}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.modalScroll}>
            <View style={styles.pickerGrid}>
              {closetItems.map(item => {
                const selected = selectedItemIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                    onPress={() =>toggleItem(item.id)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: item.imageUrl }} style={styles.pickerImage} />
                    {selected && (
                      <View style={styles.pickerCheck}>
                        <Ionicons name="checkmark" size={14} color={colors.bone} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, saving && styles.actionButtonDisabled]}
              onPress={handleSavePlannedOutfit}
              disabled={saving}
            >
              <Text style={styles.actionButtonText}>
                {saving
                  ? 'Saving…'
                  : `Save outfit${selectedItemIds.length >0 ? ` (${selectedItemIds.length})` : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const handleDeleteOutfit = (date: string) => {
    Alert.alert(
      'Delete Outfit',
      'Are you sure you want to remove this planned outfit?',
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await outfitPlannerService.delete(getCurrentUserId(), date);
              const updated = { ...plannedOutfits };
              delete updated[date];
              setPlannedOutfits(updated);
              setShowOutfitModal(false);
            } catch (error) {
              // Keep the sheet open: closing it read as a successful delete.
              console.error('Error deleting planned outfit:', error);
              Alert.alert("Couldn't delete", 'That outfit is still planned. Check your connection and try again.');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleMarkWorn = (date: string) => {
    Alert.alert(
      'Mark as Worn',
      'Mark this outfit as worn on ' + date + '?',
      [
        {
          text: 'Mark Worn',
          onPress: async () => {
            try {
              await outfitPlannerService.markWorn(getCurrentUserId(), date);
              setPlannedOutfits(prev => ({ ...prev, [date]: { ...prev[date], worn: true } }));
              setShowOutfitModal(false);
              Alert.alert('Success', 'Outfit marked as worn!');
            } catch (error) {
              console.error('Error marking outfit worn:', error);
              Alert.alert("Couldn't mark as worn", 'Nothing was saved. Check your connection and try again.');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Swapping one piece used to mean delete and rebuild. The picker already
  // pre-fills from the existing plan; iOS won't present a modal while another
  // is still animating out, hence the short wait.
  const handleEditOutfit = () => {
    setShowOutfitModal(false);
    setTimeout(() => handleAddOutfit(), Platform.OS === 'ios' ? 400 : 0);
  };

  const renderOutfitModal = () => {
    const outfit = selectedDate ? plannedOutfits[selectedDate] : null;
    if (!outfit) return null;

    return (
      <Modal
        visible={showOutfitModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() =>setShowOutfitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Outfit for {selectedDate}</Text>
              <TouchableOpacity
                onPress={() =>setShowOutfitModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={colors.inkMuted} />
              </TouchableOpacity>
            </View>

            {outfit.occasion && (
              <View style={styles.occasionBadge}>
                <Text style={styles.occasionText}>{outfit.occasion}</Text>
              </View>
            )}

            <ScrollView style={styles.modalScroll}>
              <View style={styles.outfitItems}>
                {outfit.items.map((item, index) => (
                  <View key={index} style={styles.outfitItem}>
                    <Image source={{ uri: item.imageUrl }} style={styles.outfitItemImage} />
                    <Text style={styles.outfitItemCategory}>{item.category}</Text>
                  </View>
                ))}
              </View>

              {outfit.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{outfit.notes}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>handleMarkWorn(selectedDate)}
              >
                <Text style={styles.actionButtonText}>Mark as worn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton, styles.secondaryAction]}
                onPress={handleEditOutfit}
                accessibilityRole="button"
              >
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton, styles.secondaryAction]}
                onPress={() =>handleDeleteOutfit(selectedDate)}
              >
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Stats scoped to the month the label claims. PLANNED used to count every
  // outfit ever saved, and WORN was a literal 0 that ignored markWorn entirely.
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthOutfits = Object.values(plannedOutfits).filter(o => o.date.startsWith(monthPrefix));
  const monthWornCount = monthOutfits.filter(o => o.worn).length;

  // UPCOMING means from today forward, soonest first - not the five oldest
  // plans ever saved. ISO date keys sort chronologically as strings.
  const todayIso = todayLocalISO();
  const upcomingOutfits = Object.entries(plannedOutfits)
    .filter(([date]) => date >= todayIso)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(0, 5);

  // One rust primary per view: once a date is waiting for an outfit, "Plan an
  // outfit" is the primary and the calendar shortcut steps back to an outline.
  const planWeekSecondary = !!selectedDate && !plannedOutfits[selectedDate];

  return (
    <SafeAreaView style={styles.container}>
      {/* One back control. There was a shared BackButton and a hand-rolled
          "← Back" directly beneath it, and the three-column header pushed the
          title into the middle where no other screen puts it. */}
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>WARDROBE</Text>
        <Text style={styles.title}>Outfit planner</Text>
        <Text style={styles.subtitle}>
          Plan what you'll wear before the morning decides for you. Tap a date to build a look,
          or let your calendar do it.
        </Text>

        <Calendar
          current={todayIso}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          theme={{
            backgroundColor: colors.bone,
            calendarBackground: colors.bone,
            textSectionTitleColor: colors.inkFaint,
            selectedDayBackgroundColor: colors.ink,
            selectedDayTextColor: colors.bone,
            todayTextColor: colors.tobacco,
            dayTextColor: colors.ink,
            textDisabledColor: colors.inkFaint,
            dotColor: colors.camel,
            selectedDotColor: colors.bone,
            arrowColor: colors.tobacco,
            monthTextColor: colors.ink,
            // The calendar library takes font families directly, so it can
            // render Playfair and Instrument Sans rather than the system face.
            textDayFontFamily: fonts.sans,
            textMonthFontFamily: fonts.serif,
            textDayHeaderFontFamily: fonts.sansSemiBold,
            textDayFontSize: 15,
            textMonthFontSize: 20,
            textDayHeaderFontSize: 11,
          }}
        />

        {/* expo-calendar has no browser implementation: on web the permission
            request can never be granted, so the most prominent button on the
            screen could only flash and do nothing. De-scoped in words there. */}
        {Platform.OS === 'web' ? (
          <View style={styles.planWeekWebNote}>
            <Text style={styles.planWeekWebNoteText}>
              Planning a whole week from your calendar is available in the iOS app, where 33 Trends
              can read your events. Here you can still plan any day by tapping it.
            </Text>
          </View>
        ) : (
        <TouchableOpacity
          style={[
            styles.planWeekButton,
            planWeekSecondary && styles.planWeekButtonOutline,
            planningWeek && styles.planWeekButtonBusy,
          ]}
          onPress={handlePlanWeek}
          disabled={planningWeek}
          activeOpacity={0.85}
        >
          <Text style={[styles.planWeekText, planWeekSecondary && styles.planWeekTextOutline]}>
            {planningWeek ? 'Reading your calendar…' : 'Plan my week from my calendar'}
          </Text>
          <Text style={[styles.planWeekSub, planWeekSecondary && styles.planWeekSubOutline]}>Dresses every event in the next 7 days from your closet, against the forecast
          </Text>
        </TouchableOpacity>
        )}

        {plansLoadError && (
          <TouchableOpacity
            style={styles.loadErrorRow}
            onPress={loadPlannedOutfits}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.loadErrorText}>Couldn't load your planned outfits. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {!!selectedDate && (
          <View style={styles.selectedDateSection}>
            <Text style={styles.selectedDateTitle}>
              {plannedOutfits[selectedDate] ? 'Outfit Planned' : 'No Outfit Planned'}
            </Text>
            <Text style={styles.selectedDateText}>{selectedDate}</Text>
            
            {plannedOutfits[selectedDate] ? (
              <View style={styles.plannedActions}>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() =>setShowOutfitModal(true)}
                >
                  <Text style={styles.viewButtonText}>View outfit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={handleAddOutfit}
                  accessibilityRole="button"
                >
                  <Text style={styles.viewButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.planButton}
                onPress={handleAddOutfit}
              >
                <Text style={styles.planButtonText}>Plan an outfit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>THIS MONTH</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{monthOutfits.length}</Text>
              <Text style={styles.statLabel}>PLANNED</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{monthWornCount}</Text>
              <Text style={styles.statLabel}>WORN</Text>
            </View>
          </View>
        </View>

        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingTitle}>UPCOMING</Text>
          {upcomingOutfits.length === 0 && (
            <Text style={styles.upcomingEmpty}>
              {plansLoadError
                ? "Couldn't load your planned outfits."
                : 'Nothing planned from today on. Tap a date above to plan a look.'}
            </Text>
          )}
          {upcomingOutfits.map(([date, outfit]) => (
              <TouchableOpacity
                key={date}
                style={styles.upcomingCard}
                onPress={() => {
                  setSelectedDate(date);
                  setShowOutfitModal(true);
                }}
              >
                <View style={styles.upcomingDate}>
                  <Text style={styles.upcomingDay}>
                    {parseLocalDate(date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.upcomingDateNumber}>
                    {parseLocalDate(date).getDate()}
                  </Text>
                </View>
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingOccasion}>{outfit.occasion || 'Casual'}</Text>
                  <Text style={styles.upcomingItems}>{outfit.items.length} items</Text>
                </View>
                <View style={styles.upcomingPreview}>
                  {outfit.items.slice(0, 3).map((item, index) => (
                    <Image
                      key={index}
                      source={{ uri: item.imageUrl }}
                      style={styles.upcomingPreviewImage}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            ))}
        </View>
      </ScrollView>

      {renderOutfitModal()}
      {renderPickerModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  planWeekWebNote: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  content: { paddingBottom: 60 },
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
  },
  planWeekButton: {
    borderRadius: radius.full,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    // The action colour is rust; ink pills read as chrome, not as the CTA.
    backgroundColor: colors.rust,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  planWeekButtonOutline: {
    backgroundColor: 'transparent',
    borderColor: colors.hair,
  },
  planWeekTextOutline: {
    color: colors.ink,
  },
  planWeekSubOutline: {
    color: colors.inkMuted,
    opacity: 1,
  },
  planWeekWebNoteText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
  },
  loadErrorRow: {
    borderRadius: radius.md,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.sand,
  },
  loadErrorText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.ink,
  },
  upcomingEmpty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  planWeekButtonBusy: {
    opacity: 0.6,
  },
  planWeekText: {
    color: colors.bone,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  planWeekSub: {
    fontFamily: fonts.sans,
    color: colors.bone,
    opacity: 0.7,
    fontSize: 12,
    marginTop: 4,
  },
  occasionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  occasionChip: {
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.paper,
  },
  occasionChipActive: {
    backgroundColor: colors.ink,
  },
  occasionChipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.ink,
  },
  occasionChipTextActive: {
    color: colors.bone,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Rounded like a card so the selected border follows the tile, not a
  // square box around a rounded image.
  pickerItem: {
    borderRadius: radius.md,
    overflow: 'hidden',
    width: 92,
    height: 92,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pickerItemSelected: {
    borderColor: colors.ink,
  },
  pickerImage: {
    borderRadius: radius.sm,
    width: '100%',
    height: '100%',
  },
  pickerCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  header: { paddingHorizontal: 20, paddingTop: 12 },
  backButton: {
    fontSize: 16,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 34,
    color: colors.ink,
    marginHorizontal: 20,
  },
  addButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  selectedDateSection: {
    borderRadius: radius.md,
    padding: 20,
    backgroundColor: colors.paper,
    margin: 20,
    alignItems: 'center',
  },
  selectedDateTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 6,
  },
  selectedDateText: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 16,
  },
  viewButton: {
    // Secondary: viewing an existing plan is not the screen's primary action.
    borderRadius: radius.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  viewButtonText: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  plannedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  planButton: {
    borderRadius: radius.full,
    backgroundColor: colors.rust,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  planButtonText: {
    color: colors.bone,
    fontFamily: fonts.sansSemiBold,
  },
  statsSection: {
    padding: 20,
  },
  statsTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    borderRadius: radius.md,
    flex: 1,
    backgroundColor: colors.paper,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.ink,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.inkFaint,
    textAlign: 'center',
  },
  upcomingSection: {
    padding: 20,
  },
  upcomingTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 14,
  },
  upcomingCard: {
    borderRadius: radius.md,
    flexDirection: 'row',
    backgroundColor: colors.paper,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  upcomingDate: {
    width: 60,
    alignItems: 'center',
    marginRight: 16,
  },
  upcomingDay: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  upcomingDateNumber: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingOccasion: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  upcomingItems: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
  },
  upcomingPreview: {
    flexDirection: 'row',
    gap: 4,
  },
  upcomingPreviewImage: {
    borderRadius: radius.sm,
    width: 40,
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bone,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  occasionBadge: {
    borderRadius: radius.full,
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    margin: 20,
    marginBottom: 0,
  },
  occasionText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
  },
  modalScroll: {
    padding: 20,
  },
  outfitItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  outfitItem: {
    width: '48%',
    alignItems: 'center',
  },
  outfitItemImage: {
    borderRadius: radius.sm,
    width: '100%',
    height: 150,
    marginBottom: 8,
  },
  outfitItemCategory: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    textTransform: 'capitalize',
  },
  notesSection: {
    borderRadius: radius.md,
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.paper,
  },
  notesLabel: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 8,
  },
  notesText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  actionButton: {
    borderRadius: radius.full,
    flex: 1,
    backgroundColor: colors.rust,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.bone,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  deleteButtonText: {
    color: colors.ink,
  },
  // Edit and Delete size to their labels so "Mark as worn" keeps the room.
  secondaryAction: {
    flex: 0,
    paddingHorizontal: 20,
  },
});

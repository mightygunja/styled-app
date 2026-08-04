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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { Calendar, DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { closetAPI, getCurrentUserId } from '../services/api';
import { outfitPlannerService, PlannedOutfit, PlannedOutfitItem } from '../services/outfitPlannerService';
import { colors, fonts } from '../theme/designSystem';
import {
  getUpcomingEvents,
  planForSchedule,
  CalendarPermissionError,
} from '../services/schedulePlanningService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const OCCASIONS = ['Casual', 'Work', 'Formal', 'Athletic'];

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

  useEffect(() => {
    loadPlannedOutfits();
    loadCloset();
  }, []);

  const loadCloset = async () => {
    try {
      const response = await closetAPI.getItems(getCurrentUserId());
      setClosetItems(response.data || []);
    } catch (error) {
      console.error('Error loading closet:', error);
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
    } catch (error) {
      console.error('Error loading planned outfits:', error);
    }
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    if (plannedOutfits[day.dateString]) {
      setShowOutfitModal(true);
    }
  };

  const handleAddOutfit = () => {
    if (!selectedDate) {
      Alert.alert('Select a Date', 'Please select a date to plan an outfit');
      return;
    }
    if (closetItems.length === 0) {
      Alert.alert(
        'Your closet is empty',
        'Add a few items to your closet first — planned outfits are built from what you own.'
      );
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

      const planned = await planForSchedule(getCurrentUserId(), events);
      if (planned.length === 0) {
        Alert.alert('Could not plan', 'We could not build outfits for those events. Please try again.');
        return;
      }

      await loadPlannedOutfits();
      Alert.alert(
        'Your week is planned',
        `${planned.length} outfit${planned.length === 1 ? '' : 's'} planned around your calendar. Tap any marked date to see the look and why it was chosen.`
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
            <TouchableOpacity onPress={() =>setShowPicker(false)}>
              <Text style={styles.closeButton}>✕</Text>
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
                        <Text style={styles.pickerCheckText}>✓</Text>
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
            } catch (error) {
              console.error('Error deleting planned outfit:', error);
            }
            setShowOutfitModal(false);
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
              Alert.alert('Success', 'Outfit marked as worn!');
            } catch (error) {
              console.error('Error marking outfit worn:', error);
            }
            setShowOutfitModal(false);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
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
              <TouchableOpacity onPress={() =>setShowOutfitModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
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
                <Text style={styles.actionButtonText}>✓ Mark as Worn</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
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

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Outfit planner</Text>
        <TouchableOpacity onPress={handleAddOutfit}>
          <Text style={styles.addButton}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        <Calendar
          current={new Date().toISOString().split('T')[0]}
          onDayPress={handleDayPress}
          markedDates={markedDates}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: colors.ink,
            selectedDayBackgroundColor: colors.ink,
            selectedDayTextColor: '#ffffff',
            todayTextColor: colors.ink,
            dayTextColor: colors.ink,
            textDisabledColor: colors.hair,
            dotColor: colors.ink,
            selectedDotColor: '#ffffff',
            arrowColor: colors.ink,
            monthTextColor: colors.ink,
            textDayFontWeight: '400',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
          }}
        />

        <TouchableOpacity
          style={[styles.planWeekButton, planningWeek && styles.planWeekButtonBusy]}
          onPress={handlePlanWeek}
          disabled={planningWeek}
          activeOpacity={0.85}
        >
          <Text style={styles.planWeekText}>
            {planningWeek ? 'Reading your calendar…' : '✦  Plan my week from my calendar'}
          </Text>
          <Text style={styles.planWeekSub}>Dresses every event in the next 7 days from your closet, against the forecast
          </Text>
        </TouchableOpacity>

        {selectedDate && (
          <View style={styles.selectedDateSection}>
            <Text style={styles.selectedDateTitle}>
              {plannedOutfits[selectedDate] ? 'Outfit Planned' : 'No Outfit Planned'}
            </Text>
            <Text style={styles.selectedDateText}>{selectedDate}</Text>
            
            {plannedOutfits[selectedDate] ? (
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() =>setShowOutfitModal(true)}
              >
                <Text style={styles.viewButtonText}>View Outfit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.planButton}
                onPress={handleAddOutfit}
              >
                <Text style={styles.planButtonText}>Plan Outfit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>This Month</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{Object.keys(plannedOutfits).length}</Text>
              <Text style={styles.statLabel}>Outfits Planned</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Outfits Worn</Text>
            </View>
          </View>
        </View>

        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingTitle}>Upcoming Outfits</Text>
          {Object.entries(plannedOutfits)
            .sort(([dateA], [dateB]) =>dateA.localeCompare(dateB))
            .slice(0, 5)
            .map(([date, outfit]) => (
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
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.upcomingDateNumber}>
                    {new Date(date).getDate()}
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
  planWeekButton: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.ink,
  },
  planWeekButtonBusy: {
    opacity: 0.6,
  },
  planWeekText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  planWeekSub: {
    color: 'rgba(255,255,255,0.7)',
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.paper,
  },
  occasionChipActive: {
    backgroundColor: colors.ink,
  },
  occasionChipText: {
    fontSize: 13,
    color: colors.ink,
  },
  occasionChipTextActive: {
    color: '#fff',
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pickerItem: {
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
    width: '100%',
    height: '100%',
  },
  pickerCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCheckText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    fontSize: 16,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.ink,
  },
  addButton: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  selectedDateSection: {
    padding: 20,
    backgroundColor: colors.paper,
    margin: 20,
    alignItems: 'center',
  },
  selectedDateTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 4,
  },
  selectedDateText: {
    fontSize: 14,
    color: colors.inkMuted,
    marginBottom: 16,
  },
  viewButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  viewButtonText: {
    color: '#fff',
    fontFamily: fonts.sansSemiBold,
  },
  planButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  planButtonText: {
    color: '#fff',
    fontFamily: fonts.sansSemiBold,
  },
  statsSection: {
    padding: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  upcomingSection: {
    padding: 20,
  },
  upcomingTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 16,
  },
  upcomingCard: {
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
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  upcomingDateNumber: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingOccasion: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 4,
  },
  upcomingItems: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  upcomingPreview: {
    flexDirection: 'row',
    gap: 4,
  },
  upcomingPreviewImage: {
    width: 40,
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
  },
  closeButton: {
    fontSize: 24,
    color: colors.inkMuted,
  },
  occasionBadge: {
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
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.ink,
  },
  deleteButtonText: {
    color: colors.ink,
  },
});

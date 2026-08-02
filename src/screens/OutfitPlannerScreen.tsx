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
        dotColor: '#000',
        selected: date === selectedDate,
        selectedColor: date === selectedDate ? '#000' : undefined,
      };
    });
    
    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = {
        selected: true,
        selectedColor: '#e5e7eb',
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

    setSelectedItemIds(plannedOutfits[selectedDate]?.items.map(i => i.id) || []);
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
    setSelectedItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
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
        .map(id => closetItems.find(i => i.id === id))
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
      onRequestClose={() => setShowPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Plan {selectedDate}</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.occasionRow}>
            {OCCASIONS.map(o => (
              <TouchableOpacity
                key={o}
                style={[styles.occasionChip, pickerOccasion === o && styles.occasionChipActive]}
                onPress={() => setPickerOccasion(pickerOccasion === o ? '' : o)}
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
                    onPress={() => toggleItem(item.id)}
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
                  : `Save outfit${selectedItemIds.length > 0 ? ` (${selectedItemIds.length})` : ''}`}
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
        onRequestClose={() => setShowOutfitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Outfit for {selectedDate}</Text>
              <TouchableOpacity onPress={() => setShowOutfitModal(false)}>
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
                onPress={() => handleMarkWorn(selectedDate)}
              >
                <Text style={styles.actionButtonText}>✓ Mark as Worn</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteOutfit(selectedDate)}
              >
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                  🗑️ Delete
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Outfit Planner</Text>
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
            textSectionTitleColor: '#000',
            selectedDayBackgroundColor: '#000',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#ef4444',
            dayTextColor: '#000',
            textDisabledColor: '#d1d5db',
            dotColor: '#000',
            selectedDotColor: '#ffffff',
            arrowColor: '#000',
            monthTextColor: '#000',
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
          <Text style={styles.planWeekSub}>
            Dresses every event in the next 7 days from your closet, against the forecast
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
                onPress={() => setShowOutfitModal(true)}
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
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
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
    backgroundColor: '#000',
  },
  planWeekButtonBusy: {
    opacity: 0.6,
  },
  planWeekText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  occasionChipActive: {
    backgroundColor: '#000',
  },
  occasionChipText: {
    fontSize: 13,
    color: '#000',
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
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pickerItemSelected: {
    borderColor: '#000',
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
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCheckText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
    color: '#000',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  selectedDateSection: {
    padding: 20,
    backgroundColor: '#f8fafc',
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedDateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  viewButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  planButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  planButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsSection: {
    padding: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  upcomingSection: {
    padding: 20,
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  upcomingCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
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
    color: '#666',
    textTransform: 'uppercase',
  },
  upcomingDateNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingOccasion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  upcomingItems: {
    fontSize: 12,
    color: '#666',
  },
  upcomingPreview: {
    flexDirection: 'row',
    gap: 4,
  },
  upcomingPreviewImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
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
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  occasionBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    margin: 20,
    marginBottom: 0,
  },
  occasionText: {
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 12,
    marginBottom: 8,
  },
  outfitItemCategory: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  notesSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
});

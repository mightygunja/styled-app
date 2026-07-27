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
import { getCurrentUserId } from '../services/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PlannedOutfit {
  id: string;
  date: string;
  items: any[];
  occasion?: string;
  notes?: string;
}

export default function OutfitPlannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedDate, setSelectedDate] = useState('');
  const [plannedOutfits, setPlannedOutfits] = useState<Record<string, PlannedOutfit>>({});
  const [markedDates, setMarkedDates] = useState<any>({});
  const [showOutfitModal, setShowOutfitModal] = useState(false);

  useEffect(() => {
    loadPlannedOutfits();
  }, []);

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
    // TODO: Load from Firestore
    // For now, using mock data
    const mockOutfits: Record<string, PlannedOutfit> = {
      '2024-11-27': {
        id: '1',
        date: '2024-11-27',
        items: [
          { id: '1', imageUrl: 'https://via.placeholder.com/100', category: 'tops' },
          { id: '2', imageUrl: 'https://via.placeholder.com/100', category: 'bottoms' },
        ],
        occasion: 'Work',
      },
      '2024-11-29': {
        id: '2',
        date: '2024-11-29',
        items: [
          { id: '3', imageUrl: 'https://via.placeholder.com/100', category: 'dresses' },
        ],
        occasion: 'Going Out',
      },
    };
    setPlannedOutfits(mockOutfits);
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
    
    Alert.alert(
      'Add Outfit',
      'Choose how to add an outfit for ' + selectedDate,
      [
        {
          text: 'Create New',
          onPress: () => {
            // Navigate to outfit builder
            Alert.alert('Coming Soon', 'This will open the outfit builder');
          },
        },
        {
          text: 'Use Existing Look',
          onPress: () => {
            Alert.alert('Coming Soon', 'This will show your saved looks');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDeleteOutfit = (date: string) => {
    Alert.alert(
      'Delete Outfit',
      'Are you sure you want to remove this planned outfit?',
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = { ...plannedOutfits };
            delete updated[date];
            setPlannedOutfits(updated);
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
          onPress: () => {
            // TODO: Update wear count in Firestore
            Alert.alert('Success', 'Outfit marked as worn!');
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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

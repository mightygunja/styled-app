import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar } from 'react-native-calendars';
import { Stylist, StylistReview, TimeSlot, SessionType } from '../types';
import { RootStackParamList } from '../navigation/types';
import { stylistAPI } from '../services/stylistAPI';
import SuccessAnimation from '../components/SuccessAnimation';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type StylistDetailRouteProp = RouteProp<RootStackParamList, 'StylistDetail'>;

const SESSION_TYPES = [
  { id: 'closet-audit', label: 'Closet Audit', duration: 60, icon: '👗' },
  { id: 'shopping-assistance', label: 'Shopping Help', duration: 90, icon: '🛍️' },
  { id: 'event-styling', label: 'Event Styling', duration: 120, icon: '✨' },
  { id: 'wardrobe-planning', label: 'Wardrobe Plan', duration: 90, icon: '📋' },
];

export default function StylistDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<StylistDetailRouteProp>();
  const { stylistId } = route.params;
  
  const [stylist, setStylist] = useState<Stylist | null>(null);
  const [reviews, setReviews] = useState<StylistReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>('closet-audit');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadStylistData();
  }, [stylistId]);

  const loadStylistData = async () => {
    try {
      setLoading(true);
      const [stylistData, reviewsData] = await Promise.all([
        stylistAPI.getStylist(stylistId),
        stylistAPI.getStylistReviews(stylistId),
      ]);
      setStylist(stylistData);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading stylist:', error);
      showToast('Failed to load stylist details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    
    try {
      const slots = await stylistAPI.getAvailableSlots(stylistId, date);
      setTimeSlots(slots);
    } catch (error) {
      console.error('Error loading time slots:', error);
    }
  };

  const handleBookSession = async () => {
    if (!selectedDate || !selectedTime) {
      showToast('Please select a date and time', 'error');
      return;
    }

    try {
      setBookingLoading(true);
      const sessionType = SESSION_TYPES.find(s => s.id === selectedSessionType);
      const duration = sessionType?.duration || 60;
      
      await stylistAPI.bookSession(
        stylistId,
        selectedSessionType,
        selectedDate,
        selectedTime,
        duration
      );
      
      setShowBookingModal(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error booking session:', error);
      showToast('Failed to book session', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading || !stylist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </SafeAreaView>
    );
  }

  const sessionType = SESSION_TYPES.find(s => s.id === selectedSessionType);
  const sessionPrice = stylist.hourlyRate * ((sessionType?.duration || 60) / 60);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Cover Image */}
        {stylist.coverImageUrl && (
          <Image source={{ uri: stylist.coverImageUrl }} style={styles.coverImage} />
        )}

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image source={{ uri: stylist.profileImageUrl }} style={styles.profileImage} />
          
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{stylist.name}</Text>
              {stylist.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}
            </View>
            
            <View style={styles.statsRow}>
              <Text style={styles.rating}>⭐ {stylist.rating.toFixed(1)}</Text>
              <Text style={styles.divider}>•</Text>
              <Text style={styles.reviews}>{stylist.reviewCount} reviews</Text>
              <Text style={styles.divider}>•</Text>
              <Text style={styles.experience}>{stylist.yearsExperience} years</Text>
            </View>
            
            <Text style={styles.location}>📍 {stylist.location}</Text>
            {stylist.responseTime && (
              <Text style={styles.responseTime}>⚡ Responds {stylist.responseTime}</Text>
            )}
          </View>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio}>{stylist.bio}</Text>
        </View>

        {/* Specialties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specialties</Text>
          <View style={styles.specialtiesGrid}>
            {stylist.specialties.map((specialty, index) => (
              <View key={index} style={styles.specialtyTag}>
                <Text style={styles.specialtyText}>{specialty}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Certifications */}
        {stylist.certifications && stylist.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {stylist.certifications.map((cert, index) => (
              <View key={index} style={styles.certItem}>
                <Text style={styles.certIcon}>🏆</Text>
                <Text style={styles.certText}>{cert}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Portfolio */}
        {stylist.portfolio.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {stylist.portfolio.map((item) => (
                <View key={item.id} style={styles.portfolioItem}>
                  <Image source={{ uri: item.imageUrl }} style={styles.portfolioImage} />
                  <Text style={styles.portfolioTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.portfolioDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
            {reviews.slice(0, 3).map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.userName}</Text>
                  <Text style={styles.reviewRating}>⭐ {review.rating}</Text>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.pricingCard}>
            <Text style={styles.hourlyRate}>${stylist.hourlyRate}/hour</Text>
            <Text style={styles.pricingNote}>Sessions typically range from 1-2 hours</Text>
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={styles.bookBar}>
        <View>
          <Text style={styles.bookBarLabel}>Starting at</Text>
          <Text style={styles.bookBarPrice}>${stylist.hourlyRate}/hr</Text>
        </View>
        <TouchableOpacity
          style={styles.bookBarButton}
          onPress={() => setShowBookingModal(true)}
        >
          <Text style={styles.bookBarButtonText}>Book Session</Text>
        </TouchableOpacity>
      </View>

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Book Session</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Session Type */}
            <Text style={styles.modalSectionTitle}>Session Type</Text>
            <View style={styles.sessionTypesGrid}>
              {SESSION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.sessionTypeCard,
                    selectedSessionType === type.id && styles.sessionTypeCardActive,
                  ]}
                  onPress={() => setSelectedSessionType(type.id as SessionType)}
                >
                  <Text style={styles.sessionTypeIcon}>{type.icon}</Text>
                  <Text style={styles.sessionTypeLabel}>{type.label}</Text>
                  <Text style={styles.sessionTypeDuration}>{type.duration} min</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Calendar */}
            <Text style={styles.modalSectionTitle}>Select Date</Text>
            <Calendar
              onDayPress={(day) => handleDateSelect(day.dateString)}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: '#ef4444' },
              }}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                selectedDayBackgroundColor: '#ef4444',
                todayTextColor: '#ef4444',
                arrowColor: '#ef4444',
              }}
            />

            {/* Time Slots */}
            {selectedDate && (
              <>
                <Text style={styles.modalSectionTitle}>Select Time</Text>
                {timeSlots.length === 0 && (
                  <Text style={styles.noSlotsText}>
                    This stylist isn't taking bookings on that day. Try another date.
                  </Text>
                )}
                {timeSlots.length > 0 && !timeSlots.some(s => s.available) && (
                  <Text style={styles.noSlotsText}>
                    Every slot that day is already booked. Try another date.
                  </Text>
                )}
                <View style={styles.timeSlotsGrid}>
                  {timeSlots.map((slot, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlot,
                        !slot.available && styles.timeSlotDisabled,
                        selectedTime === slot.time && styles.timeSlotActive,
                      ]}
                      onPress={() => slot.available && setSelectedTime(slot.time)}
                      disabled={!slot.available}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          !slot.available && styles.timeSlotTextDisabled,
                          selectedTime === slot.time && styles.timeSlotTextActive,
                        ]}
                      >
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Price Summary */}
            {selectedDate && selectedTime && (
              <View style={styles.priceSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Session Type</Text>
                  <Text style={styles.summaryValue}>{sessionType?.label}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duration</Text>
                  <Text style={styles.summaryValue}>{sessionType?.duration} minutes</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Date & Time</Text>
                  <Text style={styles.summaryValue}>
                    {selectedDate} at {selectedTime}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalValue}>${sessionPrice.toFixed(0)}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Book Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedDate || !selectedTime || bookingLoading) && styles.confirmButtonDisabled,
              ]}
              onPress={handleBookSession}
              disabled={!selectedDate || !selectedTime || bookingLoading}
            >
              {bookingLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Confirm Booking - ${sessionPrice.toFixed(0)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <SuccessAnimation
        visible={showSuccess}
        message="Session booked! 🎉"
        onComplete={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  backButton: {
    fontSize: 16,
    color: '#64748b',
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f1f5f9',
  },
  profileSection: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    marginTop: -60,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: '#f1f5f9',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
    marginTop: 60,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 8,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  divider: {
    marginHorizontal: 8,
    color: '#cbd5e1',
  },
  reviews: {
    fontSize: 14,
    color: '#64748b',
  },
  experience: {
    fontSize: 14,
    color: '#64748b',
  },
  location: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  responseTime: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  section: {
    padding: 20,
    paddingTop: 0,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  specialtyText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  certIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  certText: {
    fontSize: 14,
    color: '#475569',
  },
  portfolioItem: {
    width: 200,
    marginRight: 16,
  },
  portfolioImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginBottom: 8,
  },
  portfolioTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  portfolioDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  reviewCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  reviewRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  reviewComment: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  pricingCard: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  hourlyRate: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  pricingNote: {
    fontSize: 14,
    color: '#64748b',
  },
  bookBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  bookBarLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  bookBarPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  bookBarButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookBarButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
    marginTop: 20,
  },
  sessionTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sessionTypeCard: {
    width: (width - 60) / 2,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  sessionTypeCardActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  sessionTypeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  sessionTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  sessionTypeDuration: {
    fontSize: 12,
    color: '#64748b',
  },
  noSlotsText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
    marginBottom: 12,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeSlotActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  timeSlotDisabled: {
    opacity: 0.4,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  timeSlotTextActive: {
    color: '#ffffff',
  },
  timeSlotTextDisabled: {
    color: '#94a3b8',
  },
  priceSummary: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    marginTop: 8,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

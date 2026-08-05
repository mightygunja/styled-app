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
import { colors, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type StylistDetailRouteProp = RouteProp<RootStackParamList, 'StylistDetail'>;

const SESSION_TYPES = [
  { id: 'closet-audit', label: 'Closet audit', duration: 60 },
  { id: 'shopping-assistance', label: 'Personal shopping', duration: 90 },
  { id: 'event-styling', label: 'Event styling', duration: 120 },
  { id: 'wardrobe-planning', label: 'Wardrobe planning', duration: 90 },
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
          <ActivityIndicator size="large" color={colors.ink} />
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
              {stylist.isVerified && <Text style={styles.verifiedText}>VERIFIED</Text>}
            </View>
            
            <View style={styles.statsRow}>
              <Text style={styles.rating}>{stylist.reviewCount > 0 ? stylist.rating.toFixed(1) : 'New'}</Text>
              <Text style={styles.divider}>•</Text>
              <Text style={styles.reviews}>{stylist.reviewCount} reviews</Text>
              <Text style={styles.divider}>•</Text>
              <Text style={styles.experience}>{stylist.yearsExperience} years</Text>
            </View>
            
            <Text style={styles.location}>{stylist.location}</Text>
            {stylist.responseTime && (
              <Text style={styles.responseTime}>Responds {stylist.responseTime}</Text>
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
                <Text style={styles.certIcon}>—</Text>
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
                  <Text style={styles.reviewRating}>{review.rating}/5</Text>
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
                  <Text
                    style={[
                      styles.sessionTypeLabel,
                      selectedSessionType === type.id && styles.sessionTypeLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                  <Text
                    style={[
                      styles.sessionTypeDuration,
                      selectedSessionType === type.id && styles.sessionTypeDurationActive,
                    ]}
                  >
                    {type.duration} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Calendar */}
            <Text style={styles.modalSectionTitle}>Select Date</Text>
            <Calendar
              onDayPress={(day) => handleDateSelect(day.dateString)}
              markedDates={{
                [selectedDate]: { selected: true, selectedColor: colors.ink },
              }}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                selectedDayBackgroundColor: colors.ink,
                todayTextColor: colors.ink,
                arrowColor: colors.ink,
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
                <ActivityIndicator color={colors.white} />
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
        message="Session booked"
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
  container: { flex: 1, backgroundColor: colors.bone },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 12 },
  backButton: { display: 'none' },

  coverImage: { width: '100%', height: 180, backgroundColor: colors.paper },

  profileSection: { flexDirection: 'row', alignItems: 'flex-start', padding: 24 },
  // Portraits stay circular; the square corners are for panels and controls.
  profileImage: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.paper },
  profileInfo: { flex: 1, marginLeft: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: fonts.serif, fontSize: 28, color: colors.ink, flexShrink: 1 },
  verifiedBadge: { display: 'none' },
  verifiedText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: colors.camel,
  },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rating: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  divider: { fontSize: 12, color: colors.inkFaint },
  reviews: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  experience: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  location: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted, marginTop: 6 },
  responseTime: { fontFamily: fonts.sans, fontSize: 12, color: colors.tobacco, marginTop: 4 },

  section: { paddingHorizontal: 24, marginBottom: 32 },
  sectionTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 12,
  },
  bio: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 23, color: colors.inkMuted },

  specialtiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialtyTag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  specialtyText: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink },

  certItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  certIcon: { fontFamily: fonts.sans, fontSize: 13, color: colors.camel },
  certText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, flex: 1 },

  portfolioItem: { width: 200, marginRight: 12 },
  portfolioImage: { width: 200, height: 240, backgroundColor: colors.paper },
  portfolioTitle: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink, marginTop: 8 },
  portfolioDesc: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted, marginTop: 3 },

  reviewCard: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  reviewerName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  reviewRating: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.camel },
  reviewComment: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.inkMuted, marginTop: 8 },
  reviewDate: { fontFamily: fonts.sans, fontSize: 11, color: colors.inkFaint, marginTop: 8 },

  pricingCard: { marginHorizontal: 24, backgroundColor: colors.paper, padding: 20, marginBottom: 32 },
  hourlyRate: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink },
  pricingNote: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted, marginTop: 6 },

  bookBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    backgroundColor: colors.bone,
  },
  bookBarLabel: { fontFamily: fonts.sans, fontSize: 11, color: colors.inkFaint },
  bookBarPrice: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  bookBarButton: { backgroundColor: colors.ink, paddingHorizontal: 28, paddingVertical: 15 },
  bookBarButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    letterSpacing: 0.4,
    color: colors.bone,
  },

  modalContainer: { flex: 1, backgroundColor: colors.bone },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalClose: { fontSize: 20, color: colors.inkMuted },
  modalTitle: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  modalContent: { paddingHorizontal: 24 },
  modalSectionTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginTop: 24,
    marginBottom: 12,
  },

  sessionTypesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sessionTypeCard: {
    width: '47.5%',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
  },
  sessionTypeCardActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  sessionTypeIcon: { display: 'none' },
  sessionTypeLabel: { fontFamily: fonts.serif, fontSize: 16, color: colors.ink },
  // Selected cards fill with ink, so the text has to invert or it disappears.
  sessionTypeLabelActive: { color: colors.bone },
  sessionTypeDuration: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted, marginTop: 4 },
  sessionTypeDurationActive: { color: 'rgba(253, 251, 250, 0.7)' },

  noSlotsText: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted, lineHeight: 19, marginBottom: 12 },

  timeSlotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
  },
  timeSlotActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  timeSlotDisabled: { backgroundColor: colors.paper, borderColor: colors.hair, opacity: 0.45 },
  timeSlotText: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink, lineHeight: 17 },
  timeSlotTextActive: { color: colors.bone },
  timeSlotTextDisabled: { color: colors.inkFaint },

  priceSummary: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  summaryValue: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  summaryTotalLabel: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  summaryTotalValue: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },

  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  confirmButton: { backgroundColor: colors.ink, paddingVertical: 16, alignItems: 'center' },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmButtonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    letterSpacing: 0.4,
    color: colors.bone,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { stylistAPI } from '../services/stylistAPI';
import { getCurrentUserId } from '../services/api';
import { stylistBookingsService, reviewsService } from '../services/firestore';
import { StylingSession } from '../types';
import BackButton from '../components/BackButton';
import { formatSessionDay, formatSessionTime } from '../utils/sessionDate';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MySessionsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [sessions, setSessions] = useState<StylingSession[]>([]);
  const [loading, setLoading] = useState(true);
  // A failed load must not read as "No sessions yet" - someone with bookings
  // would be told they have none and pushed to book again.
  const [loadError, setLoadError] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSessions();
  }, []);

  const handleCancel = async (sessionId: string) => {
    try {
      await stylistBookingsService.setStatus(sessionId, 'cancelled');
      await loadSessions();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert("Couldn't cancel", 'The request was not cancelled. Check your connection and try again.');
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const data = await stylistAPI.getUserSessions(getCurrentUserId());
      setSessions(data);
      // Completed sessions the user already reviewed show "Reviewed" instead
      // of a Review button. A failed check just leaves the button in place.
      const uid = getCurrentUserId();
      const checks = await Promise.all(
        data
          .filter(s => s.status === 'completed')
          .map(s =>
            reviewsService
              .hasReviewedSession(s.id, uid)
              .then(done => (done ? s.id : null))
              .catch(() => null)
          )
      );
      setReviewedIds(new Set(checks.filter((id): id is string => Boolean(id))));
    } catch (error) {
      console.error('Error loading sessions:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = (session: StylingSession) => {
    if (session.stylist) {
      navigation.navigate('VideoCall', {
        sessionId: session.id,
        stylistName: session.stylist.name,
      });
    }
  };

  const handleViewNotes = (sessionId: string) => {
    navigation.navigate('SessionNotes', { sessionId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.camel;
      case 'pending': return colors.camel;
      case 'completed': return colors.ink;
      case 'cancelled': return colors.ink;
      default: return colors.inkMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const header = (
    <View style={styles.header}>
      <BackButton style={styles.backButton} />
      <Text style={styles.title}>Your sessions</Text>
      <View style={{ width: 50 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {header}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {header}

      <ScrollView style={styles.content}>
        {loadError && (
          <TouchableOpacity
            style={styles.errorBanner}
            accessibilityRole="button"
            accessibilityLabel="Retry loading your sessions"
            onPress={loadSessions}
          >
            <Text style={styles.errorBannerText}>Couldn't load your sessions. Tap to retry.</Text>
          </TouchableOpacity>
        )}
        {loadError && sessions.length === 0 ? null : sessions.length === 0 ? (
          <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No sessions yet</Text>
            <Text style={styles.emptySubtext}>Book a stylist to get started</Text>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() =>navigation.navigate('StylistMarketplace')}
            >
              <Text style={styles.bookButtonText}>Browse Stylists</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {sessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                {/* Stylist Info */}
                <View style={styles.sessionHeader}>
                  {session.stylist && (
                    <>
                      {session.stylist.profileImageUrl ? (
                        <Image
                          source={{ uri: session.stylist.profileImageUrl }}
                          style={styles.stylistImage}
                        />
                      ) : (
                        <View style={[styles.stylistImage, styles.stylistImagePlaceholder]}>
                          <Text style={styles.stylistInitial}>
                            {(session.stylist.name || '').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.sessionInfo}>
                        <Text style={styles.stylistName}>{session.stylist.name}</Text>
                        <Text style={styles.sessionType}>
                          {session.sessionType.replace('-', ' ')}
                        </Text>
                      </View>
                    </>
                  )}
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(session.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(session.status)}</Text>
                  </View>
                </View>

                {/* Session Details */}
                <View style={styles.sessionDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.inkMuted} style={styles.detailIcon} />
                    <Text style={styles.detailText}>
                      {formatSessionDay(session.scheduledDate)}
                      {formatSessionTime(session.scheduledDate)
                        ? ` at ${formatSessionTime(session.scheduledDate)}`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color={colors.inkMuted} style={styles.detailIcon} />
                    <Text style={styles.detailText}>{session.duration} minutes</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={16} color={colors.inkMuted} style={styles.detailIcon} />
                    <Text style={styles.detailText}>${session.price}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.sessionActions}>
                  {/* No "Join Session" button until there is a real video
                      provider behind it. Sessions are arranged here and run
                      over whatever the stylist and client agree; offering an
                      in-app call that opens a placeholder reads as broken
                      functionality, which is a review rejection. Restore this
                      once WebRTC/Twilio is wired into VideoCallScreen. */}
                  {session.status === 'pending' && (
                    <>
                      <View style={styles.confirmedNote}>
                        <Text style={styles.confirmedNoteText}>
                          Sent to your stylist. It moves to confirmed as soon as they accept.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.notesButton}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel this booking request"
                        onPress={() => handleCancel(session.id)}
                      >
                        <Text style={styles.notesButtonText}>Cancel request</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {session.status === 'confirmed' && (
                    <View style={styles.confirmedNote}>
                      <Text style={styles.confirmedNoteText}>Your stylist will be in touch to confirm how you'll meet.
                      </Text>
                    </View>
                  )}
                  {(session.status === 'completed' || session.status === 'confirmed') && (
                    <TouchableOpacity
                      style={styles.notesButton}
                      onPress={() =>handleViewNotes(session.id)}
                    >
                      <Text style={styles.notesButtonText}>Notes</Text>
                    </TouchableOpacity>
                  )}
                  {session.status === 'completed' && (
                    <>
                      <TouchableOpacity
                        style={styles.notesButton}
                        onPress={() =>navigation.navigate('BeforeAfterPhotos', { sessionId: session.id })}
                      >
                        <Text style={styles.notesButtonText}>Photos</Text>
                      </TouchableOpacity>
                      {reviewedIds.has(session.id) ? (
                        <View style={styles.reviewedTag}>
                          <Ionicons name="checkmark" size={16} color={colors.inkMuted} />
                          <Text style={styles.reviewedText}>Reviewed</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.notesButton}
                          onPress={() =>navigation.navigate('SubmitReview', {
                            sessionId: session.id,
                            stylistId: session.stylistId,
                            stylistName: session.stylist?.name || 'Stylist',
                            sessionType: session.sessionType,
                          })}
                        >
                          <Text style={styles.notesButtonText}>Review</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  // Shared BackButton inside the existing centred row: drop its own bottom
  // margin / side padding so the row geometry is unchanged.
  backButton: {
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  errorBanner: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderLeftWidth: 2,
    borderLeftColor: colors.rust,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 20,
  },
  errorBannerText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.ink },
  stylistImagePlaceholder: {
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stylistInitial: { fontFamily: fonts.serif, fontSize: 20, color: colors.tobacco },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.ink,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.inkMuted,
    marginBottom: 24,
  },
  bookButton: {
    borderRadius: radius.full,
    backgroundColor: colors.rust,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  bookButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
  sessionsList: {
    padding: 20,
  },
  sessionCard: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stylistImage: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.paper,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  stylistName: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  sessionType: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    textTransform: 'capitalize',
  },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  sessionDetails: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 24,
  },
  detailText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmedNote: {
    borderRadius: radius.md,
    flex: 1,
    backgroundColor: colors.paper,
    padding: 14,
  },
  confirmedNoteText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  joinButton: {
    borderRadius: radius.full,
    flex: 1,
    backgroundColor: colors.rust,
    padding: 14,
    alignItems: 'center',
  },
  joinButtonText: {
    color: colors.white,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
  notesButton: {
    borderRadius: radius.full,
    flex: 1,
    backgroundColor: colors.paper,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  reviewedTag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
  },
  reviewedText: {
    color: colors.inkMuted,
    fontSize: 15,
    fontFamily: fonts.sansMedium,
  },
  notesButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
  },
});

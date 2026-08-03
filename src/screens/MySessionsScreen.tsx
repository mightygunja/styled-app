import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { stylistAPI } from '../services/stylistAPI';
import { getCurrentUserId } from '../services/api';
import { StylingSession } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MySessionsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [sessions, setSessions] = useState<StylingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await stylistAPI.getUserSessions(getCurrentUserId());
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
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
      case 'confirmed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'completed': return '#6366f1';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Sessions</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content}>
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>No sessions yet</Text>
            <Text style={styles.emptySubtext}>Book a stylist to get started</Text>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => navigation.navigate('StylistMarketplace')}
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
                      <Image
                        source={{ uri: session.stylist.profileImageUrl }}
                        style={styles.stylistImage}
                      />
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
                    <Ionicons name="calendar-outline" size={16} color="#64748b" style={styles.detailIcon} />
                    <Text style={styles.detailText}>
                      {new Date(session.scheduledDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={16} color="#64748b" style={styles.detailIcon} />
                    <Text style={styles.detailText}>{session.duration} minutes</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="cash-outline" size={16} color="#64748b" style={styles.detailIcon} />
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
                  {session.status === 'confirmed' && (
                    <View style={styles.confirmedNote}>
                      <Text style={styles.confirmedNoteText}>
                        Your stylist will be in touch to confirm how you'll meet.
                      </Text>
                    </View>
                  )}
                  {(session.status === 'completed' || session.status === 'confirmed') && (
                    <TouchableOpacity
                      style={styles.notesButton}
                      onPress={() => handleViewNotes(session.id)}
                    >
                      <Text style={styles.notesButtonText}>Notes</Text>
                    </TouchableOpacity>
                  )}
                  {session.status === 'completed' && (
                    <>
                      <TouchableOpacity
                        style={styles.notesButton}
                        onPress={() => navigation.navigate('BeforeAfterPhotos', { sessionId: session.id })}
                      >
                        <Text style={styles.notesButtonText}>Photos</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.notesButton}
                        onPress={() => navigation.navigate('SubmitReview', {
                          sessionId: session.id,
                          stylistId: session.stylistId,
                          stylistName: session.stylist?.name || 'Stylist',
                          sessionType: session.sessionType,
                        })}
                      >
                        <Text style={styles.notesButtonText}>Review</Text>
                      </TouchableOpacity>
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
    backgroundColor: '#ffffff',
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
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    fontSize: 16,
    color: '#64748b',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
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
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  bookButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionsList: {
    padding: 20,
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stylistImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  stylistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 14,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  sessionDetails: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
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
    fontSize: 14,
    color: '#0f172a',
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmedNote: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 12,
  },
  confirmedNoteText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  notesButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  notesButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
});

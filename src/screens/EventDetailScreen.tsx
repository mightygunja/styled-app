import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { groupService, GroupEvent } from '../services/groupService';
import { getCurrentUserId } from '../services/api';
import { haptics } from '../utils/haptics';

type EventDetailRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;

export default function EventDetailScreen() {
  const route = useRoute<EventDetailRouteProp>();
  const { eventId } = route.params;

  const [event, setEvent] = useState<GroupEvent | null>(null);
  const [attending, setAttending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rsvping, setRsvping] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      const [e, isGoing] = await Promise.all([
        groupService.getEventById(eventId),
        groupService.isAttending(eventId, userId),
      ]);
      setEvent(e);
      setAttending(isGoing);
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // RSVPs used to be one-way: once you were "going" the button locked forever.
  // Plans change, so attending toggles - cancelling deletes the record and
  // gives the spot back.
  const handleRsvp = async () => {
    setRsvping(true);
    haptics.impact();
    try {
      if (attending) {
        await groupService.cancelRsvp(eventId, getCurrentUserId());
        setAttending(false);
        setEvent(e => e ? { ...e, attendees: Math.max(0, e.attendees - 1) } : e);
      } else {
        await groupService.rsvpEvent(eventId, getCurrentUserId(), 'going');
        setAttending(true);
        setEvent(e => e ? { ...e, attendees: e.attendees + 1 } : e);
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
    } finally {
      setRsvping(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><BackButton /></View>
        <View style={styles.loadingBox}><ActivityIndicator size="large" color={colors.ink} /></View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><BackButton /></View>
        <View style={styles.content}>
          <Text style={styles.title}>Event not found</Text>
          <Text style={styles.description}>It may have been cancelled or removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><BackButton /></View>
      <ScrollView contentContainerStyle={styles.content}>
        {event.imageUrl && <Image source={{ uri: event.imageUrl }} style={styles.hero} resizeMode="cover" />}
        <Text style={styles.eyebrow}>{event.isVirtual ? 'VIRTUAL EVENT' : 'IN PERSON'} · {event.status.toUpperCase()}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>
          {new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {event.location ? ` · ${event.location}` : ''}
        </Text>
        <Text style={styles.meta}>{event.attendees}{event.maxAttendees ? ` / ${event.maxAttendees}` : ''} attending</Text>
        <Text style={styles.description}>{event.description}</Text>

        {attending && <Text style={styles.attendingNote}>You're going.</Text>}
        <Button
          title={rsvping ? (attending ? 'Cancelling…' : 'RSVPing…') : attending ? 'Cancel RSVP' : "I'm going"}
          onPress={handleRsvp}
          disabled={rsvping}
          variant={attending ? 'secondary' : 'primary'}
          fullWidth
          style={{ marginTop: attending ? spacing.sm : spacing.section }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.page, paddingBottom: 60 },
  hero: { width: '100%', height: 180, backgroundColor: colors.paper, marginBottom: 16 },
  eyebrow: { ...textType.eyebrow, marginBottom: 8 },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.ink },
  meta: { ...textType.meta, marginTop: 6 },
  description: { ...textType.body, color: colors.inkMuted, marginTop: 16 },
  attendingNote: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, marginTop: spacing.section },
});

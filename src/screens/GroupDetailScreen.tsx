import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { groupService, Group, GroupEvent } from '../services/groupService';
import { getCurrentUserId } from '../services/api';
import { haptics } from '../utils/haptics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type GroupDetailRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;

export default function GroupDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroupDetailRouteProp>();
  const { groupId } = route.params;

  const [group, setGroup] = useState<Group | null>(null);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      const [g, groupEvents, member] = await Promise.all([
        groupService.getGroupById(groupId),
        groupService.getGroupEvents(groupId),
        groupService.isMember(groupId, userId),
      ]);
      setGroup(g);
      setEvents(groupEvents);
      setIsMember(member);
    } catch (error) {
      console.error('Error loading group:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleJoin = async () => {
    setJoining(true);
    haptics.impact();
    try {
      await groupService.joinGroup(groupId, getCurrentUserId());
      setIsMember(true);
      setGroup(g => g ? { ...g, members: g.members + 1 } : g);
    } catch (error) {
      console.error('Error joining group:', error);
    } finally {
      setJoining(false);
    }
  };

  if (loading || !group) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><BackButton /></View>
        <View style={styles.loadingBox}><ActivityIndicator size="large" color={colors.ink} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><BackButton /></View>
      <ScrollView contentContainerStyle={styles.content}>
        {group.imageUrl && <Image source={{ uri: group.imageUrl }} style={styles.hero} resizeMode="cover" />}
        <Text style={styles.eyebrow}>{group.category.toUpperCase()} · {group.privacy.toUpperCase()}</Text>
        <Text style={styles.title}>{group.name}</Text>
        <Text style={styles.meta}>{group.members} members · {group.posts} posts</Text>
        <Text style={styles.description}>{group.description}</Text>

        {!isMember && (
          <Button title={joining ? 'Joining…' : 'Join group'} onPress={handleJoin} disabled={joining} fullWidth style={{ marginTop: spacing.section }} />
        )}

        {events.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>UPCOMING EVENTS</Text>
            <FlatList
              data={events}
              keyExtractor={e => e.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.eventRow} onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventMeta}>{new Date(item.startDate).toLocaleDateString()} · {item.attendees} going</Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}
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
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 12 },
  eventRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hair },
  eventTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  eventMeta: { ...textType.meta, marginTop: 2 },
});

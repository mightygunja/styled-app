import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { colors, fonts, type as textType, spacing, radius } from '../theme/designSystem';
import { groupService, Group, GroupEvent } from '../services/groupService';
import { getCurrentUserId } from '../services/api';
import { haptics } from '../utils/haptics';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

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
  const [leaving, setLeaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // Leaving is offered only when the group service can do it. It has no
  // leaveGroup today, so rather than a button that fails, members are shown
  // their joined state and nothing pretends to be a way out.
  const leaveGroup: undefined | ((groupId: string, userId: string) => Promise<void>) =
    typeof (groupService as any).leaveGroup === 'function'
      ? (gid: string, uid: string) => (groupService as any).leaveGroup(gid, uid)
      : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
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
      setLoadError(true);
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
      // Re-read the member count rather than guessing at it.
      const fresh = await groupService.getGroupById(groupId).catch(() => null);
      setGroup(g => fresh || (g ? { ...g, members: g.members + 1 } : g));
      showToast('You joined this group', 'success');
    } catch (error) {
      console.error('Error joining group:', error);
      // The membership row is written before the member count, so a late
      // failure can still mean the join went through - check before blaming.
      const joined = await groupService.isMember(groupId, getCurrentUserId()).catch(() => false);
      if (joined) {
        setIsMember(true);
        showToast('You joined this group', 'success');
      } else {
        showToast("Couldn't join the group. Try again.", 'error');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!leaveGroup) return;
    setLeaving(true);
    try {
      await leaveGroup(groupId, getCurrentUserId());
      setIsMember(false);
      const fresh = await groupService.getGroupById(groupId).catch(() => null);
      setGroup(g => fresh || (g ? { ...g, members: Math.max(0, g.members - 1) } : g));
      showToast('You left this group', 'success');
    } catch (error) {
      console.error('Error leaving group:', error);
      showToast("Couldn't leave the group. Try again.", 'error');
    } finally {
      setLeaving(false);
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

  if (!group) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><BackButton /></View>
        {loadError ? (
          <TouchableOpacity style={styles.content} activeOpacity={0.85} onPress={load}>
            <Text style={styles.title}>Couldn't load this group</Text>
            <Text style={styles.description}>Tap to retry.</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.content}>
            <Text style={styles.title}>Group not found</Text>
            <Text style={styles.description}>It may have been closed or removed.</Text>
          </View>
        )}
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
        {/* Only the members figure is shown. A posts count was advertised here
            too, but group posts can't be read or written anywhere in the app,
            so the number promised a feed that doesn't exist. */}
        <Text style={styles.meta}>{group.members} {group.members === 1 ? 'member' : 'members'}</Text>
        <Text style={styles.description}>{group.description}</Text>

        {!isMember ? (
          <Button title={joining ? 'Joining…' : 'Join group'} onPress={handleJoin} disabled={joining} fullWidth style={{ marginTop: spacing.section }} />
        ) : (
          <View style={styles.memberBox}>
            <Text style={styles.memberTitle}>
              {group.createdBy === getCurrentUserId() ? 'You started this group' : "You're a member"}
            </Text>
            {/* Said plainly: membership lists the group under My Groups and
                nothing more yet - there are no group posts or chat to open. */}
            <Text style={styles.memberText}>
              It's listed under My Groups. Group posts and discussion aren't available yet.
            </Text>
            {leaveGroup && group.createdBy !== getCurrentUserId() && (
              <Button
                title={leaving ? 'Leaving…' : 'Leave group'}
                variant="outline"
                onPress={handleLeave}
                disabled={leaving}
                style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
              />
            )}
          </View>
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
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
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
  memberBox: {
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: spacing.lg,
    marginTop: spacing.section,
  },
  memberTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink },
  memberText: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
  sectionLabel: { ...textType.eyebrow, marginTop: spacing.section, marginBottom: 12 },
  eventRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hair },
  eventTitle: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  eventMeta: { ...textType.meta, marginTop: 2 },
});

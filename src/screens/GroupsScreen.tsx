import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { groupService, Group, GroupEvent } from '../services/groupService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function GroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'discover' | 'mygroups' | 'events'>('discover');
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groups, userGroups, events] = await Promise.all([
        groupService.getGroups(),
        groupService.getUserGroups(getCurrentUserId()),
        groupService.getUpcomingEvents(),
      ]);

      setAllGroups(groups);
      setMyGroups(userGroups);
      setUpcomingEvents(events);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // groupService.createGroup existed but nothing called it, which meant groups
  // could only ever be seeded straight into Firestore. This form is the way in.
  const handleCreateGroup = async () => {
    const name = newName.trim();
    const description = newDescription.trim();
    const category = newCategory.trim();
    if (!name || !description || !category) {
      showToast('A name, a line about it, and a category are all needed', 'error');
      return;
    }
    setCreating(true);
    try {
      await groupService.createGroup(getCurrentUserId(), name, description, category);
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      setNewCategory('');
      showToast('Group created', 'success');
      await loadData();
    } catch (error) {
      console.error('Error creating group:', error);
      showToast('Could not create the group', 'error');
    } finally {
      setCreating(false);
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderGroup = (group: Group) => (
    <TouchableOpacity
      key={group.id}
      style={styles.groupCard}
      onPress={() =>navigation.navigate('GroupDetail', { groupId: group.id })}
    >
      {group.imageUrl && (
        <Image source={{ uri: group.imageUrl }} style={styles.groupImage} />
      )}
      
      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName}>{group.name}</Text>
          <View style={styles.privacyBadge}>
            <Text style={styles.privacyText}>
              {group.privacy === 'public' ? 'PUBLIC' : 'PRIVATE'}
            </Text>
          </View>
        </View>

        <Text style={styles.groupDescription} numberOfLines={2}>
          {group.description}
        </Text>

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{group.category}</Text>
        </View>

        {/* Members only. The posts count used to sit alongside it, but group
            posts can't be viewed or written anywhere, so the number promised
            a feed that doesn't exist. */}
        <View style={styles.groupStats}>
          <View style={styles.stat}>
            <Text style={styles.statText}>{group.members} {group.members === 1 ? 'member' : 'members'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEvent = (event: GroupEvent) => (
    <TouchableOpacity
      key={event.id}
      style={styles.eventCard}
      onPress={() =>navigation.navigate('EventDetail', { eventId: event.id })}
    >
      {event.imageUrl && (
        <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
      )}
      
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.isVirtual && (
            <View style={styles.virtualBadge}>
              <Text style={styles.virtualText}>Virtual</Text>
            </View>
          )}
        </View>

        <Text style={styles.eventDescription} numberOfLines={2}>
          {event.description}
        </Text>

        <View style={styles.eventInfo}>
          <View style={styles.eventInfoRow}>
                        <Text style={styles.eventInfoText}>{formatEventDate(event.startDate)}</Text>
          </View>
          {event.location && (
            <View style={styles.eventInfoRow}>
                            <Text style={styles.eventInfoText} numberOfLines={1}>{event.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.eventFooter}>
          <Text style={styles.attendeesText}>
            {event.attendees} going
            {event.maxAttendees && ` • ${event.maxAttendees - event.attendees} spots left`}
          </Text>
          {/* A nested Touchable swallows the tap, so without its own handler
              this button did nothing at all. The real RSVP lives on the
              event detail screen - send the tap there. */}
          <TouchableOpacity
            style={styles.rsvpButton}
            onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
          >
            <Text style={styles.rsvpButtonText}>RSVP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>

      <View style={styles.intro}>
        <Text style={styles.eyebrow}>COMMUNITY</Text>
        <Text style={styles.title}>Groups & events</Text>
        <Text style={styles.subtitle}>
          Groups built around how people dress, and the events they run — virtual and in person.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() =>setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mygroups' && styles.activeTab]}
          onPress={() =>setActiveTab('mygroups')}
        >
          <Text style={[styles.tabText, activeTab === 'mygroups' && styles.activeTabText]}>My Groups
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'events' && styles.activeTab]}
          onPress={() =>setActiveTab('events')}
        >
          <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Events
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'discover' && (
          <>
            {!showCreate ? (
              <TouchableOpacity style={styles.startGroupButton} onPress={() => setShowCreate(true)}>
                <Text style={styles.startGroupText}>Start a group</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.createForm}>
                <Text style={styles.createLabel}>NEW GROUP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  placeholderTextColor={colors.inkFaint}
                  value={newName}
                  onChangeText={setNewName}
                />
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="What it's about"
                  placeholderTextColor={colors.inkFaint}
                  value={newDescription}
                  onChangeText={setNewDescription}
                  multiline
                />
                <TextInput
                  style={styles.input}
                  placeholder="Category — e.g. Vintage, Menswear"
                  placeholderTextColor={colors.inkFaint}
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
                <View style={styles.createActions}>
                  <TouchableOpacity style={styles.createCancel} onPress={() => setShowCreate(false)}>
                    <Text style={styles.createCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.createSubmit}
                    onPress={handleCreateGroup}
                    disabled={creating}
                  >
                    <Text style={styles.createSubmitText}>{creating ? 'Creating…' : 'Create group'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {allGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No groups yet</Text>
                <Text style={styles.emptySubtext}>
                  Nobody has started one. The first group here could be yours.
                </Text>
              </View>
            ) : (
              allGroups.map(renderGroup)
            )}
          </>
        )}

        {activeTab === 'mygroups' && (
          <>
            {myGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>You haven't joined any groups</Text>
                <Text style={styles.emptySubtext}>
                  Anything you join from Discover shows up here.
                </Text>
              </View>
            ) : (
              myGroups.map(renderGroup)
            )}
          </>
        )}

        {activeTab === 'events' && (
          <>
            {upcomingEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No upcoming events</Text>
                <Text style={styles.emptySubtext}>
                  Events run by groups you can join will be listed here.
                </Text>
              </View>
            ) : (
              upcomingEvents.map(renderEvent)
            )}
          </>
        )}
      </ScrollView>

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
    backgroundColor: colors.bone,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  intro: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 34,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    color: colors.inkMuted,
    marginTop: 12,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  tabText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
  },
  activeTabText: {
    fontFamily: fonts.sansMedium,
    color: colors.ink,
  },
  // Square, hairline-bordered, no drop shadow. The 16px radius and elevation
  // belonged to a different design language than the rest of the app.
  groupCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: colors.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  groupImage: {
    borderRadius: radius.sm,
    width: '100%',
    height: 150,
    backgroundColor: colors.paper,
  },
  groupContent: {
    padding: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
  },
  privacyBadge: {
    marginLeft: 8,
  },
  privacyText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: colors.inkFaint,
  },
  groupDescription: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  categoryBadge: {
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
  },
  groupStats: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
  },
  eventCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: colors.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  eventImage: {
    borderRadius: radius.sm,
    width: '100%',
    height: 150,
    backgroundColor: colors.paper,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
  },
  // The palette carries no semantic green. Sand and tobacco are how every
  // other badge in the app marks a distinction.
  virtualBadge: {
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  virtualText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.tobacco,
  },
  eventDescription: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventInfo: {
    gap: 8,
    marginBottom: 12,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventInfoText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
  },
  attendeesText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
  },
  rsvpButton: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  rsvpButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.white,
  },
  startGroupButton: {
    borderRadius: radius.full,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.ink,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startGroupText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.ink,
  },
  createForm: {
    borderRadius: radius.md,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: 16,
  },
  createLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.tobacco,
    marginBottom: 12,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 10,
  },
  inputMultiline: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  createCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  createCancelText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
  },
  createSubmit: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  createSubmitText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.white,
  },
  emptyState: {
    borderRadius: radius.md,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: colors.paper,
    padding: 20,
  },
  emptyText: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.ink,
  },
  emptySubtext: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    color: colors.inkMuted,
    marginTop: 8,
  },
});

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
import { colors, fonts } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function GroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'discover' | 'mygroups' | 'events'>('discover');
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

        <View style={styles.groupStats}>
          <View style={styles.stat}>
                        <Text style={styles.statText}>{group.members} members</Text>
          </View>
          <View style={styles.stat}>
                        <Text style={styles.statText}>{group.posts} posts</Text>
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
          <TouchableOpacity style={styles.rsvpButton}>
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
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Groups & Events</Text>
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
            {allGroups.length === 0 ? (
              <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No groups yet</Text>
                <Text style={styles.emptySubtext}>Check back soon!</Text>
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
                <Text style={styles.emptySubtext}>Discover groups to connect with others!</Text>
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
                <Text style={styles.emptySubtext}>Check back soon for new events!</Text>
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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
  },
  tabText: {
    fontSize: 15,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  activeTabText: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  groupCard: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hair,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupImage: {
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
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  privacyBadge: {
    marginLeft: 8,
  },
  privacyText: {
    fontSize: 16,
  },
  groupDescription: {
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  categoryBadge: {
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
  statIcon: {
    fontSize: 16,
  },
  statText: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  eventCard: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hair,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: {
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
    fontSize: 18,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  virtualBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  virtualText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: '#166534',
  },
  eventDescription: {
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
  eventInfoIcon: {
    fontSize: 14,
  },
  eventInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.inkMuted,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.paper,
  },
  attendeesText: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  rsvpButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rsvpButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
});

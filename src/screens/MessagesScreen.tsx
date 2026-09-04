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
import { messagingService, Conversation } from '../services/messagingService';
import { userProfileService } from '../services/userProfileService';
import { getCurrentUserId } from '../services/api';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MessagesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const [convs, unread] = await Promise.all([
        messagingService.getConversations(getCurrentUserId()),
        messagingService.getTotalUnreadCount(getCurrentUserId()),
      ]);

      // Load participant profiles
      const convsWithProfiles = await Promise.all(
        convs.map(async (conv) => {
          const otherUserId = conv.participants.find(id =>id !== getCurrentUserId());
          if (otherUserId) {
            const profile = await userProfileService.getUserProfile(otherUserId);
            return { ...conv, participantProfiles: profile ? [profile] : [] };
          }
          return conv;
        })
      );

      setConversations(convsWithProfiles);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderConversation = (conversation: Conversation) => {
    const otherUser = conversation.participantProfiles?.[0];
    const unread = conversation.unreadCount[getCurrentUserId()] || 0;
    const lastMessage = conversation.lastMessage;

    return (
      <TouchableOpacity
        key={conversation.id}
        style={styles.conversationCard}
        onPress={() =>navigation.navigate('Chat', { conversationId: conversation.id })}
      >
        {otherUser?.profileImageUrl ? (
          <Image source={{ uri: otherUser.profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {otherUser?.displayName.charAt(0) || 'U'}
            </Text>
          </View>
        )}

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName}>{otherUser?.displayName || 'User'}</Text>
            {lastMessage && (
              <Text style={styles.time}>{formatTime(lastMessage.createdAt)}</Text>
            )}
          </View>
          
          {lastMessage && (
            <View style={styles.messagePreview}>
              <Text
                style={[styles.lastMessage, unread >0 && styles.unreadMessage]}
                numberOfLines={1}
              >
                {lastMessage.senderId === getCurrentUserId() && 'You: '}
                {lastMessage.content}
              </Text>
              {unread >0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{unread}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
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

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.ink} />
        }
      >
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>DIRECT</Text>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>
            {unreadCount > 0
              ? `${unreadCount} unread`
              : 'Conversations with stylists and people you follow.'}
          </Text>
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Open someone's profile and choose Message to start a conversation.
            </Text>
          </View>
        ) : (
          conversations.map(renderConversation)
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
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  content: {
    paddingBottom: 60,
  },
  intro: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  conversationCard: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.paper,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.tobacco,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  time: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkFaint,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastMessage: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
  },
  unreadMessage: {
    fontFamily: fonts.sansMedium,
    color: colors.ink,
  },
  unreadBadge: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.white,
  },
  emptyState: {
    borderRadius: radius.md,
    marginHorizontal: 20,
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

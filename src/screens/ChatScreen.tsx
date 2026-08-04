import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { messagingService, Message, Conversation } from '../services/messagingService';
import { userProfileService, UserProfile } from '../services/userProfileService';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';
import { colors, fonts } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ChatRouteProp>();
  const { conversationId } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadChat();
  }, [conversationId]);

  useEffect(() => {
    // Mark as read when viewing
    if (conversationId) {
      messagingService.markAsRead(conversationId, getCurrentUserId());
    }
  }, [conversationId, messages]);

  const loadChat = async () => {
    try {
      setLoading(true);
      const [convs, msgs] = await Promise.all([
        messagingService.getConversations(getCurrentUserId()),
        messagingService.getMessages(conversationId),
      ]);

      const conv = convs.find(c =>c.id === conversationId);
      if (conv) {
        setConversation(conv);
        
        const otherUserId = conv.participants.find(id =>id !== getCurrentUserId());
        if (otherUserId) {
          const profile = await userProfileService.getUserProfile(otherUserId);
          setOtherUser(profile);
        }
      }

      setMessages(msgs);
    } catch (error) {
      console.error('Error loading chat:', error);
      showToast('Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim()) return;

    try {
      setSending(true);
      const message = await messagingService.sendMessage(
        conversationId,
        getCurrentUserId(),
        'text',
        messageText
      );

      setMessages([...messages, message]);
      setMessageText('');
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      showToast('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messagingService.deleteMessage(messageId, getCurrentUserId());
      setMessages(messages.filter(m =>m.id !== messageId));
      showToast('Message deleted', 'success');
    } catch (error) {
      showToast('Failed to delete message', 'error');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwnMessage = message.senderId === getCurrentUserId();
    const showTime = index === 0 || 
      new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() >5 * 60 * 1000;

    return (
      <View key={message.id}>
        {showTime && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(message.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.messageRow, isOwnMessage && styles.ownMessageRow]}>
          <TouchableOpacity
            style={[styles.messageBubble, isOwnMessage && styles.ownMessageBubble]}
            onLongPress={() =>isOwnMessage && handleDeleteMessage(message.id)}
          >
            <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
              {message.content}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* One back affordance only. This screen previously had both a
            <BackButton /> and a second "Back" control in its own header. */}
        <TouchableOpacity
          style={styles.header}
          activeOpacity={0.85}
          onPress={() =>
            otherUser && navigation.navigate('UserProfile', { userId: otherUser.userId })
          }
        >
          {otherUser?.profileImageUrl ? (
            <Image source={{ uri: otherUser.profileImageUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerInitial}>
                {otherUser?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{otherUser?.displayName || 'User'}</Text>
            {!!otherUser?.username && (
              <Text style={styles.headerMeta}>@{otherUser.username}</Text>
            )}
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Say something to {otherUser?.displayName || 'them'}.
              </Text>
            </View>
          ) : (
            messages.map((message, index) =>renderMessage(message, index))
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor={colors.inkFaint}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              // Was a paper-plane emoji, which was this button's only content.
              // A word is unambiguous and matches how every other action in the
              // app is labelled.
              <Text style={styles.sendIcon}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.paper,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInitial: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.tobacco,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.ink,
  },
  headerMeta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: colors.inkFaint,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  messagesContent: {
    padding: 16,
  },
  timeContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timeText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkFaint,
    backgroundColor: colors.bone,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'flex-start',
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
    borderWidth: 1,
    borderColor: colors.hair,
  },
  ownMessageBubble: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  messageText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 21,
  },
  ownMessageText: {
    color: colors.white,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: 20,
    marginTop: 40,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    backgroundColor: colors.bone,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  // A square button, not a 44px circle - "Send" at the old fontSize of 20 did
  // not fit inside it.
  sendButton: {
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.hair,
  },
  sendIcon: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.white,
  },
});

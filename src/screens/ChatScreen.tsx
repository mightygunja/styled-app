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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '../components/BackButton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { messagingService, Message, Conversation } from '../services/messagingService';
import { userProfileService, UserProfile } from '../services/userProfileService';
import Toast from '../components/Toast';
import ReportModal from '../components/ReportModal';
import { ReportTarget, isNotAllowed } from '../services/moderation';
import { moderationService } from '../services/moderationService';
import { useToast } from '../hooks/useToast';
import { getCurrentUserId } from '../services/api';
import { colors, fonts, radius } from '../theme/designSystem';

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
  // What the report sheet is open for: one message, or the other member.
  const [reporting, setReporting] = useState<{ type: ReportTarget; id: string; ownerId: string; subject: string } | null>(null);
  const [sendingReport, setSendingReport] = useState(false);
  // 'error' = the load threw; 'notFound' = the id isn't one of the user's
  // conversations. Either way the composer is hidden and a retry is offered.
  const [loadState, setLoadState] = useState<'ok' | 'error' | 'notFound'>('ok');
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
      setLoadState('ok');
      const [convs, msgs] = await Promise.all([
        messagingService.getConversations(getCurrentUserId()),
        messagingService.getMessages(conversationId, getCurrentUserId()),
      ]);

      const conv = convs.find(c =>c.id === conversationId);
      if (conv) {
        setConversation(conv);
        
        const otherUserId = conv.participants.find(id =>id !== getCurrentUserId());
        if (otherUserId) {
          const profile = await userProfileService.getUserProfile(otherUserId);
          setOtherUser(profile);
        }
      } else {
        setLoadState('notFound');
      }

      setMessages(msgs);
    } catch (error) {
      console.error('Error loading chat:', error);
      setLoadState('error');
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
      // Refused: language the rules do not allow, or the other member has
      // blocked this one. Say which, and leave the text to be edited.
      showToast(isNotAllowed(error) ? error.message : 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const sendReport = async (reason: string) => {
    if (!reporting || sendingReport) return;
    setSendingReport(true);
    try {
      await moderationService.report(
        getCurrentUserId(),
        { type: reporting.type, id: reporting.id, ownerId: reporting.ownerId },
        reason
      );
      // A reported message is not shown to the reporter again.
      if (reporting.type === 'message') setMessages(current => current.filter(m => m.id !== reporting.id));
      setReporting(null);
      showToast('Reported. Thank you - we review every report.', 'success');
    } catch (error) {
      console.error('Could not send the report:', error);
      showToast("Couldn't send the report. Check your connection and try again.", 'error');
    } finally {
      setSendingReport(false);
    }
  };

  const handleBlock = () => {
    if (!otherUser) return;
    const name = otherUser.displayName || 'this member';
    Alert.alert(
      `Block ${name}?`,
      'This conversation will be hidden and they will not be able to message you. You can unblock them in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await moderationService.block(getCurrentUserId(), otherUser.userId);
              navigation.goBack();
            } catch (error) {
              console.error('Could not block:', error);
              showToast("Couldn't block. Check your connection and try again.", 'error');
            }
          },
        },
      ]
    );
  };

  // Long-press on your own bubble asks first - deletion can't be undone.
  const confirmDeleteMessage = (messageId: string) => {
    Alert.alert('Delete message?', 'This removes it for both of you.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(messageId) },
    ]);
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
            onLongPress={() =>
              isOwnMessage
                ? confirmDeleteMessage(message.id)
                : setReporting({ type: 'message', id: message.id, ownerId: message.senderId, subject: 'this message' })
            }
            accessibilityHint={isOwnMessage ? 'Long-press to delete' : 'Long-press to report'}
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

  // No empty "User" chat with a live composer when the load failed or the
  // conversation isn't one of ours.
  if (loadState !== 'ok') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <BackButton />
        </View>
        <View style={styles.errorBox}>
          <Text style={styles.emptyText}>
            {loadState === 'notFound' ? 'Conversation not found' : "Couldn't load this chat"}
          </Text>
          <Text style={styles.emptySubtext}>
            {loadState === 'notFound'
              ? 'It may have been removed, or the link is wrong.'
              : 'Check your connection and try again.'}
          </Text>
          <View style={styles.errorActions}>
            {loadState === 'error' && (
              <TouchableOpacity style={styles.errorPrimary} onPress={loadChat}>
                <Text style={styles.errorPrimaryText}>Retry</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.errorSecondary}
              onPress={() => navigation.navigate('Messages')}
            >
              <Text style={styles.errorSecondaryText}>Back to messages</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={hideToast}
        />
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
          <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
        </TouchableOpacity>

        {/* Report or block the other member without leaving the thread.
            A single message is reported by long-pressing it. */}
        {!!otherUser && (
          <View style={styles.safetyRow}>
            <TouchableOpacity
              onPress={() =>
                setReporting({ type: 'user', id: otherUser.userId, ownerId: otherUser.userId, subject: otherUser.displayName || 'this member' })
              }
              accessibilityRole="button"
            >
              <Text style={styles.safetyLink}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBlock} accessibilityRole="button">
              <Text style={styles.safetyLink}>Block</Text>
            </TouchableOpacity>
            <Text style={styles.safetyHint}>Long-press a message to report it</Text>
          </View>
        )}

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

      <ReportModal
        visible={!!reporting}
        subject={reporting?.subject || 'this'}
        busy={sendingReport}
        onChoose={sendReport}
        onClose={() => setReporting(null)}
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
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  safetyLink: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.tobacco },
  safetyHint: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkFaint, flexShrink: 1, textAlign: 'right', flex: 1 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.paper,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
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
  errorBox: {
    margin: 20,
    padding: 20,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  errorActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  errorPrimary: {
    borderRadius: radius.full,
    backgroundColor: colors.rust,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorPrimaryText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.white,
  },
  errorSecondary: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorSecondaryText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.ink,
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
    borderRadius: radius.md,
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
    borderRadius: radius.md,
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
    borderRadius: radius.md,
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
    borderRadius: radius.full,
    backgroundColor: colors.rust,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Disabled stays rust at reduced opacity - never a grey fill.
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.white,
  },
});

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

      const conv = convs.find(c => c.id === conversationId);
      if (conv) {
        setConversation(conv);
        
        const otherUserId = conv.participants.find(id => id !== getCurrentUserId());
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
      setMessages(messages.filter(m => m.id !== messageId));
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
      new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 5 * 60 * 1000;

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
            onLongPress={() => isOwnMessage && handleDeleteMessage(message.id)}
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
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerUser}
            onPress={() => otherUser && navigation.navigate('UserProfile', { userId: otherUser.userId })}
          >
            {otherUser?.profileImageUrl ? (
              <Image source={{ uri: otherUser.profileImageUrl }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerInitial}>
                  {otherUser?.displayName.charAt(0) || 'U'}
                </Text>
              </View>
            )}
            <Text style={styles.headerName}>{otherUser?.displayName || 'User'}</Text>
          </TouchableOpacity>
          
          <View style={{ width: 50 }} />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👋</Text>
              <Text style={styles.emptyText}>Start the conversation!</Text>
              <Text style={styles.emptySubtext}>
                Send a message to {otherUser?.displayName}
              </Text>
            </View>
          ) : (
            messages.map((message, index) => renderMessage(message, index))
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
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
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.sendIcon}>📤</Text>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    fontSize: 16,
    color: '#64748b',
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInitial: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesContent: {
    padding: 16,
  },
  timeContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '75%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ownMessageBubble: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  messageText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#ffffff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  sendIcon: {
    fontSize: 20,
  },
});

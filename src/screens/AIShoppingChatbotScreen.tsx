import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '../components/BackButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  aiShoppingChatbotService,
  ChatMessage,
  ChatSession,
  QuickReply,
} from '../services/aiShoppingChatbotService';
import { getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { colors, fonts, radius } from '../theme/designSystem';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AIShoppingChatbotScreen() {
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      const newSession = await aiShoppingChatbotService.startSession(getCurrentUserId());
      setSession(newSession);
      setMessages(newSession.messages);

      const replies = await aiShoppingChatbotService.getQuickReplies();
      setQuickReplies(replies);
    } catch (error) {
      console.error('Error initializing chat:', error);
      showToast('Failed to start chat', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || !session) return;

    try {
      setInputText('');
      setIsTyping(true);

      const newMessages = await aiShoppingChatbotService.sendMessage(session.id, messageText);
      setMessages(prev => [...prev, ...newMessages]);
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickReply = (reply: QuickReply) => {
    handleSendMessage(reply.text);
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';

    return (
      <View key={message.id} style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Text style={styles.assistantAvatarText}>🤖</Text>
          </View>
        )}

        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {message.content}
          </Text>

          {/* Products */}
          {message.metadata?.products && message.metadata.products.length > 0 && (
            <View style={styles.productsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {message.metadata.products.map((product, idx) => (
                  <View key={idx} style={styles.productCard}>
                    <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productPrice}>${product.price}</Text>
                    <TouchableOpacity style={styles.productButton}>
                      <Text style={styles.productButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Suggestions */}
          {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {message.metadata.suggestions.map((suggestion, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionChip}
                  onPress={() => handleSendMessage(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {isUser && (
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>👤</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tobacco} />
          <Text style={styles.loadingText}>Starting AI assistant...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>AI Shopping Assistant</Text>
          <Text style={styles.headerSubtitle}>Online • Ready to help</Text>
        </View>
        <TouchableOpacity onPress={initializeChat}>
          <Text style={styles.refreshButton}>○</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message, index) => renderMessage(message, index))}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.assistantAvatar}>
                <Text style={styles.assistantAvatarText}>🤖</Text>
              </View>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Replies */}
        {messages.length <= 1 && quickReplies.length > 0 && (
          <View style={styles.quickRepliesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.quickReplies}>
                {quickReplies.map((reply) => (
                  <TouchableOpacity
                    key={reply.id}
                    style={styles.quickReplyButton}
                    onPress={() => handleQuickReply(reply)}
                  >
                    <Text style={styles.quickReplyText}>{reply.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything about fashion..."
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>➤</Text>
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
    backgroundColor: colors.paper,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.inkMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  backButton: {
    fontSize: 16,
    color: colors.inkMuted,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.tobacco,
    marginTop: 2,
  },
  refreshButton: {
    fontSize: 20,
    color: colors.ink,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    flexDirection: 'row-reverse',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  assistantAvatarText: {
    fontSize: 16,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  userAvatarText: {
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: width * 0.7,
    borderRadius: radius.lg,
    padding: 12,
  },
  assistantBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: colors.ink,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.white,
  },
  messageTime: {
    fontSize: 11,
    color: colors.inkFaint,
    marginTop: 6,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  productsContainer: {
    marginTop: 12,
  },
  productCard: {
    width: 140,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    marginRight: 8,
    overflow: 'hidden',
  },
  productImage: {
    borderRadius: radius.sm,
    width: '100%',
    height: 140,
    backgroundColor: colors.hair,
  },
  productName: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    padding: 8,
    paddingBottom: 4,
    height: 40,
  },
  productPrice: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: colors.tobacco,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  productButton: {
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    paddingVertical: 8,
    alignItems: 'center',
  },
  productButtonText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  suggestionChip: {
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  suggestionText: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    padding: 16,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.inkFaint,
  },
  quickRepliesContainer: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    paddingVertical: 12,
  },
  quickReplies: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  quickReplyButton: {
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  quickReplyText: {
    fontSize: 14,
    fontFamily: fonts.sansMedium,
    color: colors.inkMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.hair,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.hair,
  },
  sendButtonText: {
    fontSize: 20,
    color: colors.white,
  },
});

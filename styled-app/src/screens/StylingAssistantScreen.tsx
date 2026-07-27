import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { stylingAssistantService, ChatMessage } from '../services/stylingAssistantService';
import { aiStyleService } from '../services/aiStyleService';
import { closetAPI, MOCK_USER_ID } from '../services/api';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 120) / 3;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StylingAssistantScreen() {
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [closetItems, setClosetItems] = useState<Item[]>([]);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const { toast, showToast, hideToast } = useToast();

  // Guard: Check for StyleDNA on screen focus
  useFocusEffect(
    React.useCallback(() => {
      checkStyleDNA();
    }, [])
  );

  const checkStyleDNA = async () => {
    try {
      // TODO: Replace with actual user profile service call
      // const user = await userProfileService.getCurrentUser();
      // if (!user.styleDNA) {
      //   navigation.navigate('OnboardingWelcome');
      //   return;
      // }
      
      // For now, check if user has completed onboarding
      // This is a placeholder - replace with actual user.styleDNA check
      const hasStyleDNA = false; // TODO: Get from user profile
      
      if (!hasStyleDNA) {
        // Redirect to onboarding - no paywall
        // navigation.navigate('OnboardingWelcome');
        console.log('StyleDNA missing - would redirect to onboarding');
      }
    } catch (error) {
      console.error('Error checking StyleDNA:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load closet items
      const response = await closetAPI.getItems(MOCK_USER_ID);
      const items: Item[] = response.data.map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category as any,
        color: item.color,
        brand: item.brand,
        price: 0,
      }));
      setClosetItems(items);

      // Load conversation history
      const history = await stylingAssistantService.getConversation('current-user');
      setMessages(history);

      // Load quick suggestions
      const suggestions = await stylingAssistantService.getQuickSuggestions();
      setQuickSuggestions(suggestions);

      // Send welcome message if no history
      if (history.length === 0) {
        await handleSendMessage('Hi');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load assistant', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || sending) return;

    try {
      setSending(true);
      setInputText('');

      // Get style profile
      const styleProfile = await aiStyleService.analyzeStyle(closetItems);

      // Send message
      const response = await stylingAssistantService.sendMessage(
        'current-user',
        messageText,
        closetItems,
        styleProfile
      );

      // Update messages
      const updatedMessages = await stylingAssistantService.getConversation('current-user');
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await stylingAssistantService.clearConversation('current-user');
      setMessages([]);
      await handleSendMessage('Hi');
      showToast('Chat cleared', 'success');
    } catch (error) {
      showToast('Failed to clear chat', 'error');
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';

    return (
      <View key={message.id} style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Text style={styles.assistantAvatarText}>AI</Text>
          </View>
        )}
        
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {message.content}
          </Text>

          {/* Outfit items */}
          {message.type === 'outfit' && message.items && message.items.length > 0 && (
            <View style={styles.outfitContainer}>
              {message.items.map((item, index) => (
                <View key={index} style={styles.outfitItem}>
                  <Image source={{ uri: item.imageUrl }} style={styles.outfitItemImage} />
                  <Text style={styles.outfitItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>

        {isUser && (
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>You</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading assistant...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Styling Assistant</Text>
            <Text style={styles.headerSubtitle}>AI-Powered Fashion Advice</Text>
          </View>
          <TouchableOpacity onPress={handleClearChat}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map(renderMessage)}

          {sending && (
            <View style={styles.typingIndicator}>
              <View style={styles.assistantAvatar}>
                <Text style={styles.assistantAvatarText}>AI</Text>
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

        {/* Quick Suggestions */}
        {messages.length <= 2 && quickSuggestions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsScroll}
            contentContainerStyle={styles.suggestionsContainer}
          >
            {quickSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleSendMessage(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything about fashion..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || sending}
          >
            <Text style={styles.sendButtonText}>Send</Text>
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    fontSize: 16,
    color: '#64748b',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  clearButton: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
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
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  assistantAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  userAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#ef4444',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
  },
  userMessageTime: {
    color: '#fecaca',
  },
  outfitContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  outfitItem: {
    width: ITEM_SIZE,
  },
  outfitItemImage: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginBottom: 4,
  },
  outfitItemName: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 16,
    marginLeft: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  suggestionsScroll: {
    maxHeight: 50,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  suggestionsContainer: {
    padding: 12,
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  suggestionText: {
    fontSize: 13,
    color: '#475569',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
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
  },
  sendButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

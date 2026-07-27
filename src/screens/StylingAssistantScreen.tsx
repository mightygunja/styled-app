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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { stylingAssistantService, ChatMessage } from '../services/stylingAssistantService';
import { closetAPI, getCurrentUserId } from '../services/api';
import { outfitsService, styleDnaService } from '../services/firestore';
import { getCurrentWeather, CurrentWeather } from '../services/weatherService';
import { StyleDNA } from '../models/styleDNA';
import { Item } from '../types';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 120) / 3;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const OCCASIONS = ['Casual', 'Work', 'Formal', 'Date', 'Workout', 'Party'];
const MOODS = ['Confident', 'Relaxed', 'Adventurous', 'Professional', 'Romantic', 'Energetic'];

const WEATHER_ICON: Record<string, string> = {
  sunny: '☀️', cloudy: '☁️', rainy: '🌧️', snowy: '❄️', cold: '🥶', hot: '🥵',
};

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  type: 'text',
  content: "Hi! I'm your personal stylist — I know what's in your closet. Ask me anything, or tap \"Get My Outfit\" below for a full recommendation tailored to today's weather, your occasion, and your mood.",
  timestamp: new Date().toISOString(),
};

export default function StylingAssistantScreen() {
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closetItems, setClosetItems] = useState<Item[]>([]);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [styleDNA, setStyleDNA] = useState<StyleDNA | null>(null);
  const [outfitPickerOpen, setOutfitPickerOpen] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [savedOutfitMessageIds, setSavedOutfitMessageIds] = useState<Set<string>>(new Set());
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    loadData();
    // Weather and Style DNA load independently and don't block the chat becoming usable
    getCurrentWeather().then(setWeather);
    styleDnaService.getStyleDNA(getCurrentUserId()).then(setStyleDNA).catch(() => setStyleDNA(null));
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, sending]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Closet items and chat history load in parallel - independent reads
      const [response, history, suggestions] = await Promise.all([
        closetAPI.getItems(getCurrentUserId()),
        stylingAssistantService.getConversation(getCurrentUserId()),
        stylingAssistantService.getQuickSuggestions(),
      ]);

      const items: Item[] = response.data.map((item: any) => ({
        id: item.id,
        name: item.name || 'Item',
        imageUrl: item.imageUrl,
        category: item.category as any,
        color: item.color,
        brand: item.brand,
        price: item.price || 0,
        wornCount: item.wornCount,
        lastWornDate: item.lastWornDate,
        purchaseDate: item.purchaseDate,
        createdAt: item.createdAt,
        tags: item.tags,
        seasons: item.seasons,
        style: item.style,
      }));
      setClosetItems(items);
      setQuickSuggestions(suggestions);

      if (history.length > 0) {
        const hydrated = history.map(msg =>
          msg.itemIds && msg.itemIds.length > 0 && !msg.items
            ? { ...msg, items: msg.itemIds.map(id => items.find(i => i.id === id)).filter((i): i is Item => Boolean(i)) }
            : msg
        );
        setMessages(hydrated);
      }
      // If there's no history, the local WELCOME_MESSAGE already shown stays - no AI
      // call needed just to say hello, so the screen is interactive instantly.
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load your closet', 'error');
    } finally {
      setLoading(false);
    }
  };

  const doSend = async (messageText: string, context?: { occasion?: string; mood?: string }) => {
    if (!messageText || sending) return;

    const localHistory = messages;
    const optimisticUser: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: 'user',
      type: 'text',
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticUser]);
    setSending(true);

    try {
      // Weather and Style DNA are always sent as ambient context - the AI factors them
      // into every answer, not just explicit outfit requests.
      const { assistantMessage } = await stylingAssistantService.sendMessage(
        getCurrentUserId(),
        messageText,
        closetItems,
        localHistory,
        {
          occasion: context?.occasion,
          mood: context?.mood,
          weather: weather || undefined,
          styleDNA,
        }
      );
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;
    setInputText('');
    doSend(messageText);
  };

  const handleGetOutfit = () => {
    const parts = ['What should I wear'];
    if (selectedOccasion) parts.push(`for a ${selectedOccasion.toLowerCase()} occasion`);
    if (selectedMood) parts.push(`when I'm feeling ${selectedMood.toLowerCase()}`);
    const messageText = `${parts.join(' ')}?`;
    setOutfitPickerOpen(false);
    doSend(messageText, { occasion: selectedOccasion || undefined, mood: selectedMood || undefined });
  };

  const handleClearChat = async () => {
    try {
      await stylingAssistantService.clearConversation(getCurrentUserId());
      setMessages([WELCOME_MESSAGE]);
      showToast('Chat cleared', 'success');
    } catch (error) {
      showToast('Failed to clear chat', 'error');
    }
  };

  const handleSaveOutfit = async (message: ChatMessage) => {
    if (!message.items || message.items.length === 0) return;
    try {
      await outfitsService.create(
        getCurrentUserId(),
        message.items.map(item => item.id),
        selectedOccasion || undefined,
        'AI Stylist pick'
      );
      setSavedOutfitMessageIds(prev => new Set(prev).add(message.id));
      showToast('Outfit saved!', 'success');
    } catch (error) {
      console.error('Error saving outfit:', error);
      showToast('Failed to save outfit', 'error');
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const isSaved = savedOutfitMessageIds.has(message.id);

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

          {message.type === 'outfit' && message.items && message.items.length > 0 && (
            <>
              <View style={styles.outfitContainer}>
                {message.items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => navigation.navigate('ClosetItemDetail', { closetItemId: item.id })}
                  >
                    <Image source={{ uri: item.imageUrl }} style={styles.outfitItemImage} />
                    <Text style={styles.outfitItemName} numberOfLines={1}>
                      {item.category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.saveOutfitButton, isSaved && styles.saveOutfitButtonSaved]}
                onPress={() => handleSaveOutfit(message)}
                disabled={isSaved}
              >
                <Text style={[styles.saveOutfitText, isSaved && styles.saveOutfitTextSaved]}>
                  {isSaved ? '✓ Saved to Outfits' : '+ Save This Outfit'}
                </Text>
              </TouchableOpacity>
            </>
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
          <Text style={styles.loadingText}>Loading your closet...</Text>
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
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>AI Stylist</Text>
            {weather ? (
              <Text style={styles.headerSubtitle}>
                {WEATHER_ICON[weather.condition]} {weather.temperature}°F · Knows your closet
              </Text>
            ) : (
              <Text style={styles.headerSubtitle}>Knows your closet</Text>
            )}
          </View>
          <TouchableOpacity onPress={handleClearChat}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Personalization context strip */}
        {styleDNA ? (
          <View style={styles.contextStrip}>
            <Text style={styles.contextStripText} numberOfLines={1}>
              🎯 Personalizing with your Style DNA
              {styleDNA.styleArchetypes.length > 0 ? `: ${styleDNA.styleArchetypes.slice(0, 2).join(', ')}` : ''}
              {' '}+ live weather + time of day
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.contextStripPrompt}
            onPress={() => navigation.navigate('StyleProfileBuilder')}
          >
            <Text style={styles.contextStripPromptText}>
              ✨ Build your Style Profile for even sharper picks →
            </Text>
          </TouchableOpacity>
        )}

        {/* Get My Outfit */}
        <View style={styles.outfitCard}>
          <TouchableOpacity
            style={styles.outfitCardHeader}
            onPress={() => setOutfitPickerOpen(prev => !prev)}
          >
            <Text style={styles.outfitCardTitle}>✨ Get My Outfit</Text>
            <Text style={styles.outfitCardChevron}>{outfitPickerOpen ? '︿' : '﹀'}</Text>
          </TouchableOpacity>

          {outfitPickerOpen && (
            <View style={styles.outfitCardBody}>
              <Text style={styles.pickerLabel}>Occasion</Text>
              <View style={styles.chipRow}>
                {OCCASIONS.map(occ => (
                  <TouchableOpacity
                    key={occ}
                    style={[styles.pickerChip, selectedOccasion === occ && styles.pickerChipActive]}
                    onPress={() => setSelectedOccasion(prev => (prev === occ ? null : occ))}
                  >
                    <Text style={[styles.pickerChipText, selectedOccasion === occ && styles.pickerChipTextActive]}>
                      {occ}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.pickerLabel}>Mood</Text>
              <View style={styles.chipRow}>
                {MOODS.map(mood => (
                  <TouchableOpacity
                    key={mood}
                    style={[styles.pickerChip, selectedMood === mood && styles.pickerChipActive]}
                    onPress={() => setSelectedMood(prev => (prev === mood ? null : mood))}
                  >
                    <Text style={[styles.pickerChipText, selectedMood === mood && styles.pickerChipTextActive]}>
                      {mood}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.getOutfitButton} onPress={handleGetOutfit} disabled={sending}>
                <Text style={styles.getOutfitButtonText}>
                  Get Recommendation {weather ? `(${WEATHER_ICON[weather.condition]} ${weather.temperature}°F)` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
        {messages.length <= 1 && quickSuggestions.length > 0 && (
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
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  clearButton: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  contextStrip: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
  },
  contextStripText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  contextStripPrompt: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  contextStripPromptText: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
  },
  outfitCard: {
    backgroundColor: '#fff7ed',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa',
  },
  outfitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  outfitCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9a3412',
  },
  outfitCardChevron: {
    fontSize: 14,
    color: '#9a3412',
  },
  outfitCardBody: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9a3412',
    marginBottom: 8,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  pickerChipActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  pickerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9a3412',
  },
  pickerChipTextActive: {
    color: '#ffffff',
  },
  getOutfitButton: {
    marginTop: 16,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  getOutfitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
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
    maxWidth: '78%',
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
    width: ITEM_SIZE,
  },
  saveOutfitButton: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  saveOutfitButtonSaved: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  saveOutfitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  saveOutfitTextSaved: {
    color: '#16a34a',
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

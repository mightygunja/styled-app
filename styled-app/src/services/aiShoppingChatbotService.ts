/**
 * AI Shopping Assistant Chatbot Service
 * 
 * Conversational AI for personalized shopping recommendations.
 * Provides natural language shopping assistance, product discovery,
 * and style advice through chat interface.
 */

import { Item } from '../types';

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'text' | 'product' | 'outfit' | 'image' | 'action';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: string;
  metadata?: {
    products?: Item[];
    images?: string[];
    actions?: ChatAction[];
    suggestions?: string[];
  };
}

export interface ChatAction {
  id: string;
  label: string;
  type: 'search' | 'filter' | 'view' | 'buy' | 'save';
  data?: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: {
    preferences?: {
      style?: string[];
      budget?: { min: number; max: number };
      sizes?: string[];
      colors?: string[];
      brands?: string[];
    };
    recentSearches?: string[];
    viewedItems?: string[];
    savedItems?: string[];
  };
  startTime: string;
  lastActivity: string;
  active: boolean;
}

export interface QuickReply {
  id: string;
  text: string;
  category: 'style' | 'budget' | 'occasion' | 'help';
}

export interface ShoppingIntent {
  type: 'search' | 'recommend' | 'compare' | 'style-advice' | 'budget' | 'occasion';
  confidence: number;
  entities: {
    category?: string;
    style?: string;
    color?: string;
    brand?: string;
    occasion?: string;
    budget?: number;
    size?: string;
  };
}

class AIShoppingChatbotService {
  private sessions: Map<string, ChatSession> = new Map();
  private quickReplies: QuickReply[] = [
    { id: '1', text: 'Show me casual outfits', category: 'style' },
    { id: '2', text: 'I need work clothes', category: 'occasion' },
    { id: '3', text: 'What\'s trending?', category: 'style' },
    { id: '4', text: 'Find items under $50', category: 'budget' },
    { id: '5', text: 'Help me build an outfit', category: 'help' },
    { id: '6', text: 'Show me sustainable brands', category: 'style' },
  ];

  /**
   * Start a new chat session
   */
  async startSession(userId: string): Promise<ChatSession> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const sessionId = `session-${Date.now()}`;
    const welcomeMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      type: 'text',
      content: 'Hi! I\'m your AI shopping assistant. I can help you find the perfect items, build outfits, and discover new styles. What are you looking for today?',
      timestamp: new Date().toISOString(),
      metadata: {
        suggestions: [
          'Show me casual outfits',
          'I need work clothes',
          'What\'s trending?',
          'Find items under $50',
        ],
      },
    };

    const session: ChatSession = {
      id: sessionId,
      userId,
      messages: [welcomeMessage],
      context: {
        preferences: {},
        recentSearches: [],
        viewedItems: [],
        savedItems: [],
      },
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      active: true,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get existing session
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(sessionId: string, userMessage: string): Promise<ChatMessage[]> {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate AI processing

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      type: 'text',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    session.messages.push(userMsg);

    // Analyze intent
    const intent = this.analyzeIntent(userMessage);

    // Generate AI response
    const assistantMsg = await this.generateResponse(intent, userMessage, session);
    session.messages.push(assistantMsg);

    // Update session
    session.lastActivity = new Date().toISOString();
    this.sessions.set(sessionId, session);

    return [userMsg, assistantMsg];
  }

  /**
   * Analyze user intent
   */
  private analyzeIntent(message: string): ShoppingIntent {
    const lowerMessage = message.toLowerCase();

    // Search intent
    if (lowerMessage.includes('show') || lowerMessage.includes('find') || lowerMessage.includes('looking for')) {
      return {
        type: 'search',
        confidence: 0.9,
        entities: this.extractEntities(lowerMessage),
      };
    }

    // Recommendation intent
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('what should')) {
      return {
        type: 'recommend',
        confidence: 0.85,
        entities: this.extractEntities(lowerMessage),
      };
    }

    // Comparison intent
    if (lowerMessage.includes('compare') || lowerMessage.includes('difference') || lowerMessage.includes('better')) {
      return {
        type: 'compare',
        confidence: 0.8,
        entities: this.extractEntities(lowerMessage),
      };
    }

    // Style advice intent
    if (lowerMessage.includes('style') || lowerMessage.includes('outfit') || lowerMessage.includes('match')) {
      return {
        type: 'style-advice',
        confidence: 0.85,
        entities: this.extractEntities(lowerMessage),
      };
    }

    // Budget intent
    if (lowerMessage.includes('budget') || lowerMessage.includes('under') || lowerMessage.includes('cheap')) {
      return {
        type: 'budget',
        confidence: 0.9,
        entities: this.extractEntities(lowerMessage),
      };
    }

    // Occasion intent
    if (lowerMessage.includes('work') || lowerMessage.includes('party') || lowerMessage.includes('casual')) {
      return {
        type: 'occasion',
        confidence: 0.85,
        entities: this.extractEntities(lowerMessage),
      };
    }

    // Default to search
    return {
      type: 'search',
      confidence: 0.5,
      entities: this.extractEntities(lowerMessage),
    };
  }

  /**
   * Extract entities from message
   */
  private extractEntities(message: string): ShoppingIntent['entities'] {
    const entities: ShoppingIntent['entities'] = {};

    // Categories
    if (message.includes('dress')) entities.category = 'dresses';
    else if (message.includes('top') || message.includes('shirt') || message.includes('blouse')) entities.category = 'tops';
    else if (message.includes('pant') || message.includes('jean') || message.includes('trouser')) entities.category = 'bottoms';
    else if (message.includes('shoe') || message.includes('boot') || message.includes('sneaker')) entities.category = 'shoes';
    else if (message.includes('jacket') || message.includes('coat')) entities.category = 'outerwear';

    // Styles
    if (message.includes('casual')) entities.style = 'casual';
    else if (message.includes('formal') || message.includes('professional')) entities.style = 'formal';
    else if (message.includes('trendy') || message.includes('fashion')) entities.style = 'trendy';
    else if (message.includes('classic') || message.includes('timeless')) entities.style = 'classic';

    // Colors
    const colors = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'gray', 'brown'];
    colors.forEach(color => {
      if (message.includes(color)) entities.color = color;
    });

    // Occasions
    if (message.includes('work') || message.includes('office')) entities.occasion = 'work';
    else if (message.includes('party') || message.includes('event')) entities.occasion = 'party';
    else if (message.includes('date')) entities.occasion = 'date';
    else if (message.includes('wedding')) entities.occasion = 'wedding';

    // Budget
    const budgetMatch = message.match(/\$?(\d+)/);
    if (budgetMatch) {
      entities.budget = parseInt(budgetMatch[1]);
    }

    return entities;
  }

  /**
   * Generate AI response
   */
  private async generateResponse(intent: ShoppingIntent, userMessage: string, session: ChatSession): Promise<ChatMessage> {
    const responses = this.getResponseTemplates(intent);
    const responseText = responses[Math.floor(Math.random() * responses.length)];

    // Generate product recommendations if applicable
    const products = this.shouldIncludeProducts(intent) ? this.generateMockProducts(intent) : undefined;

    // Generate suggestions
    const suggestions = this.generateSuggestions(intent);

    // Generate actions
    const actions = this.generateActions(intent);

    return {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      type: products ? 'product' : 'text',
      content: responseText,
      timestamp: new Date().toISOString(),
      metadata: {
        products,
        suggestions,
        actions,
      },
    };
  }

  /**
   * Get response templates
   */
  private getResponseTemplates(intent: ShoppingIntent): string[] {
    const templates: Record<string, string[]> = {
      search: [
        `I found some great ${intent.entities.category || 'items'} for you! Take a look at these options:`,
        `Here are some ${intent.entities.style || 'stylish'} ${intent.entities.category || 'pieces'} I think you'll love:`,
        `Perfect! I've curated these ${intent.entities.category || 'items'} based on your preferences:`,
      ],
      recommend: [
        `Based on your style, I recommend these pieces:`,
        `I think these would look great on you:`,
        `Here are my top picks for you:`,
      ],
      compare: [
        `Let me help you compare these options:`,
        `Here's what makes each of these special:`,
        `I'll break down the differences for you:`,
      ],
      'style-advice': [
        `Great question! Here's how I'd style this:`,
        `For a complete look, try pairing these together:`,
        `Let me put together an outfit for you:`,
      ],
      budget: [
        `I found these amazing pieces within your budget:`,
        `Here are some great options under $${intent.entities.budget || 50}:`,
        `These are perfect for your budget:`,
      ],
      occasion: [
        `Perfect for ${intent.entities.occasion || 'the occasion'}! Check these out:`,
        `Here are some great ${intent.entities.occasion || 'event'} options:`,
        `I've selected these pieces ideal for ${intent.entities.occasion || 'your needs'}:`,
      ],
    };

    return templates[intent.type] || templates.search;
  }

  /**
   * Check if products should be included
   */
  private shouldIncludeProducts(intent: ShoppingIntent): boolean {
    return ['search', 'recommend', 'budget', 'occasion'].includes(intent.type);
  }

  /**
   * Generate mock products
   */
  private generateMockProducts(intent: ShoppingIntent): Item[] {
    const count = 4;
    const products: Item[] = [];

    for (let i = 0; i < count; i++) {
      products.push({
        id: `product-${Date.now()}-${i}`,
        name: `${intent.entities.style || 'Stylish'} ${intent.entities.category || 'Item'} ${i + 1}`,
        imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b',
        category: (intent.entities.category as any) || 'tops',
        color: intent.entities.color || 'Blue',
        brand: 'Fashion Brand',
        price: intent.entities.budget || Math.floor(Math.random() * 100) + 30,
      });
    }

    return products;
  }

  /**
   * Generate suggestions
   */
  private generateSuggestions(intent: ShoppingIntent): string[] {
    const suggestions: Record<string, string[]> = {
      search: [
        'Show me more like this',
        'Filter by price',
        'Show different colors',
        'Find similar styles',
      ],
      recommend: [
        'Tell me more about this style',
        'Show me complete outfits',
        'What else goes with this?',
      ],
      'style-advice': [
        'How do I accessorize this?',
        'What shoes would work?',
        'Show me seasonal options',
      ],
      budget: [
        'Show me sales',
        'Find secondhand options',
        'Set a different budget',
      ],
    };

    return suggestions[intent.type] || suggestions.search;
  }

  /**
   * Generate actions
   */
  private generateActions(intent: ShoppingIntent): ChatAction[] {
    return [
      {
        id: 'action-1',
        label: 'View All',
        type: 'view',
        data: { category: intent.entities.category },
      },
      {
        id: 'action-2',
        label: 'Save Favorites',
        type: 'save',
      },
      {
        id: 'action-3',
        label: 'Refine Search',
        type: 'filter',
      },
    ];
  }

  /**
   * Get quick replies
   */
  async getQuickReplies(): Promise<QuickReply[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.quickReplies;
  }

  /**
   * Get chat history
   */
  async getChatHistory(userId: string, limit: number = 10): Promise<ChatSession[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const userSessions = Array.from(this.sessions.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, limit);

    return userSessions;
  }

  /**
   * Clear session
   */
  async clearSession(sessionId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const session = this.sessions.get(sessionId);
    if (session) {
      session.active = false;
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * Get conversation summary
   */
  async getConversationSummary(sessionId: string): Promise<{
    messageCount: number;
    productsShown: number;
    topCategories: string[];
    duration: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        messageCount: 0,
        productsShown: 0,
        topCategories: [],
        duration: 0,
      };
    }

    const messageCount = session.messages.length;
    const productsShown = session.messages.reduce((count, msg) => {
      return count + (msg.metadata?.products?.length || 0);
    }, 0);

    const categories = session.messages
      .flatMap(msg => msg.metadata?.products?.map(p => p.category) || [])
      .filter((v, i, a) => a.indexOf(v) === i);

    const duration = new Date(session.lastActivity).getTime() - new Date(session.startTime).getTime();

    return {
      messageCount,
      productsShown,
      topCategories: categories.slice(0, 3),
      duration: Math.floor(duration / 1000), // seconds
    };
  }
}

export const aiShoppingChatbotService = new AIShoppingChatbotService();

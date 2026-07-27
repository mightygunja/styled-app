/**
 * Messaging Service
 * 
 * Manages direct messages and conversations between users.
 */

import { UserProfile } from './userProfileService';

export type MessageType = 'text' | 'image' | 'outfit' | 'product' | 'look';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  metadata?: any;
  readBy: string[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantProfiles?: UserProfile[];
  lastMessage?: Message;
  unreadCount: { [userId: string]: number };
  createdAt: string;
  updatedAt: string;
}

class MessagingService {
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.participants.includes(userId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    return userConversations;
  }

  /**
   * Get or create conversation between users
   */
  async getOrCreateConversation(userId1: string, userId2: string): Promise<Conversation> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if conversation exists
    const existing = Array.from(this.conversations.values()).find(conv =>
      conv.participants.includes(userId1) && conv.participants.includes(userId2)
    );
    
    if (existing) {
      return existing;
    }
    
    // Create new conversation
    const conversation: Conversation = {
      id: `conv-${Date.now()}`,
      participants: [userId1, userId2],
      unreadCount: { [userId1]: 0, [userId2]: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    
    return conversation;
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const messages = this.messages.get(conversationId) || [];
    return messages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    type: MessageType,
    content: string,
    metadata?: any
  ): Promise<Message> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const message: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId,
      type,
      content,
      metadata,
      readBy: [senderId],
      createdAt: new Date().toISOString(),
    };
    
    const conversationMessages = this.messages.get(conversationId) || [];
    conversationMessages.push(message);
    this.messages.set(conversationId, conversationMessages);
    
    // Update conversation
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.lastMessage = message;
      conversation.updatedAt = new Date().toISOString();
      
      // Increment unread count for other participants
      conversation.participants.forEach(participantId => {
        if (participantId !== senderId) {
          conversation.unreadCount[participantId] = 
            (conversation.unreadCount[participantId] || 0) + 1;
        }
      });
      
      this.conversations.set(conversationId, conversation);
    }
    
    return message;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const conversationMessages = this.messages.get(conversationId) || [];
    
    conversationMessages.forEach(message => {
      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
      }
    });
    
    this.messages.set(conversationId, conversationMessages);
    
    // Reset unread count
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.unreadCount[userId] = 0;
      this.conversations.set(conversationId, conversation);
    }
    
    return true;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    for (const [conversationId, messages] of this.messages.entries()) {
      const message = messages.find(m => m.id === messageId);
      if (message && message.senderId === userId) {
        const filtered = messages.filter(m => m.id !== messageId);
        this.messages.set(conversationId, filtered);
        
        // Update last message if needed
        const conversation = this.conversations.get(conversationId);
        if (conversation && conversation.lastMessage?.id === messageId) {
          conversation.lastMessage = filtered[filtered.length - 1];
          this.conversations.set(conversationId, conversation);
        }
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const conversation = this.conversations.get(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return false;
    }
    
    this.conversations.delete(conversationId);
    this.messages.delete(conversationId);
    
    return true;
  }

  /**
   * Search messages
   */
  async searchMessages(conversationId: string, query: string): Promise<Message[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const messages = this.messages.get(conversationId) || [];
    const lowerQuery = query.toLowerCase();
    
    return messages.filter(message => 
      message.type === 'text' && message.content.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get total unread count for user
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let total = 0;
    
    for (const conversation of this.conversations.values()) {
      if (conversation.participants.includes(userId)) {
        total += conversation.unreadCount[userId] || 0;
      }
    }
    
    return total;
  }

  /**
   * Initialize mock data
   */
  private initializeMockData() {
    // Mock conversation 1
    const conv1: Conversation = {
      id: 'conv-1',
      participants: ['current-user', 'user-1'],
      unreadCount: { 'current-user': 2, 'user-1': 0 },
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };

    const messages1: Message[] = [
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: 'text',
        content: 'Hey! I love your style! 😍',
        readBy: ['user-1', 'current-user'],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-2',
        conversationId: 'conv-1',
        senderId: 'current-user',
        type: 'text',
        content: 'Thank you so much! 💕',
        readBy: ['current-user', 'user-1'],
        createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-3',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: 'text',
        content: 'Where did you get that jacket from your last post?',
        readBy: ['user-1'],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-4',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: 'text',
        content: 'I need one! 🧥',
        readBy: ['user-1'],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000).toISOString(),
      },
    ];

    conv1.lastMessage = messages1[messages1.length - 1];
    this.conversations.set(conv1.id, conv1);
    this.messages.set(conv1.id, messages1);

    // Mock conversation 2
    const conv2: Conversation = {
      id: 'conv-2',
      participants: ['current-user', 'user-2'],
      unreadCount: { 'current-user': 0, 'user-2': 1 },
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    };

    const messages2: Message[] = [
      {
        id: 'msg-5',
        conversationId: 'conv-2',
        senderId: 'user-2',
        type: 'text',
        content: 'Hi! Would love to collaborate on a style challenge!',
        readBy: ['user-2', 'current-user'],
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-6',
        conversationId: 'conv-2',
        senderId: 'current-user',
        type: 'text',
        content: 'That sounds amazing! What did you have in mind?',
        readBy: ['current-user'],
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      },
    ];

    conv2.lastMessage = messages2[messages2.length - 1];
    this.conversations.set(conv2.id, conv2);
    this.messages.set(conv2.id, messages2);
  }
}

export const messagingService = new MessagingService();

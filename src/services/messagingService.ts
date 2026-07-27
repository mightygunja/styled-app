/**
 * Messaging Service
 *
 * Manages direct messages and conversations between users.
 * Backed by Firestore (`conversations` + `messages` collections).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../config/firebase';
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

function toDateString(ts: any): string {
  return ts && typeof ts.toDate === 'function' ? ts.toDate().toISOString() : ts || new Date().toISOString();
}

function toConversation(id: string, data: any): Conversation {
  return {
    id,
    participants: data.participants || [],
    lastMessage: data.lastMessage
      ? { ...data.lastMessage, createdAt: toDateString(data.lastMessage.createdAt) }
      : undefined,
    unreadCount: data.unreadCount || {},
    createdAt: toDateString(data.createdAt),
    updatedAt: toDateString(data.updatedAt),
  };
}

function toMessage(id: string, data: any): Message {
  return { id, ...data, createdAt: toDateString(data.createdAt) };
}

class MessagingService {
  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => toConversation(d.id, d.data()));
  }

  /**
   * Get or create conversation between users
   */
  async getOrCreateConversation(userId1: string, userId2: string): Promise<Conversation> {
    const q = query(collection(db, 'conversations'), where('participants', 'array-contains', userId1));
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.find(d => (d.data().participants || []).includes(userId2));
    if (existing) {
      return toConversation(existing.id, existing.data());
    }

    const now = Timestamp.now();
    const data = {
      participants: [userId1, userId2],
      unreadCount: { [userId1]: 0, [userId2]: 0 },
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(collection(db, 'conversations'), data);
    return toConversation(docRef.id, data);
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => toMessage(d.id, d.data()));
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
    const now = Timestamp.now();
    const messageData: any = {
      conversationId,
      senderId,
      type,
      content,
      readBy: [senderId],
      createdAt: now,
    };
    if (metadata !== undefined) messageData.metadata = metadata;

    const docRef = await addDoc(collection(db, 'messages'), messageData);
    const message = toMessage(docRef.id, messageData);

    // Update conversation's lastMessage/updatedAt and bump unread counts for other participants
    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    if (convSnap.exists()) {
      const conversation = toConversation(convSnap.id, convSnap.data());
      const updates: any = {
        lastMessage: { ...messageData, id: docRef.id },
        updatedAt: now,
      };
      conversation.participants.forEach(participantId => {
        if (participantId !== senderId) {
          updates[`unreadCount.${participantId}`] = increment(1);
        }
      });
      await updateDoc(convRef, updates);
    }

    return message;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string): Promise<boolean> {
    const messages = await this.getMessages(conversationId);
    await Promise.all(
      messages
        .filter(m => !m.readBy.includes(userId))
        .map(m => updateDoc(doc(db, 'messages', m.id), { readBy: [...m.readBy, userId] }))
    );

    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, { [`unreadCount.${userId}`]: 0 }).catch(() => {});

    return true;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const ref = doc(db, 'messages', messageId);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().senderId !== userId) return false;

    const conversationId = snap.data().conversationId;
    await deleteDoc(ref);

    // Fix up lastMessage on the conversation if needed
    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);
    if (convSnap.exists() && convSnap.data().lastMessage?.id === messageId) {
      const remaining = await this.getMessages(conversationId);
      const newLast = remaining[remaining.length - 1];
      await updateDoc(convRef, { lastMessage: newLast ? { ...newLast } : null });
    }

    return true;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    const ref = doc(db, 'conversations', conversationId);
    const snap = await getDoc(ref);
    if (!snap.exists() || !(snap.data().participants || []).includes(userId)) return false;

    const messages = await this.getMessages(conversationId);
    await Promise.all(messages.map(m => deleteDoc(doc(db, 'messages', m.id))));
    await deleteDoc(ref);

    return true;
  }

  /**
   * Search messages
   */
  async searchMessages(conversationId: string, searchQuery: string): Promise<Message[]> {
    const messages = await this.getMessages(conversationId);
    const lowerQuery = searchQuery.toLowerCase();
    return messages.filter(m => m.type === 'text' && m.content.toLowerCase().includes(lowerQuery));
  }

  /**
   * Get total unread count for user
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    const conversations = await this.getConversations(userId);
    return conversations.reduce((total, conv) => total + (conv.unreadCount[userId] || 0), 0);
  }
}

export const messagingService = new MessagingService();

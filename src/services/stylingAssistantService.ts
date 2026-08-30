/**
 * Styling Assistant Service
 *
 * AI chatbot that provides conversational fashion advice,
 * answers styling questions, and references user's closet.
 * Backed by the chatWithStylist Cloud Function (OpenAI), with
 * conversation history persisted to Firestore.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { Item } from '../types';
import { StyleProfile } from './aiStyleService';
import { chatService } from './firestore';
import { PersonalStyleProfile } from '../models/personalStyleProfile';
import { buildProfileMatchContext } from './profileMatchContext';
import { discoveryService } from './discoveryService';
import { OccasionKey } from './dailyOutfitService';
import { trendRemixService } from './trendRemixService';

const chatWithStylistFn = httpsCallable(functions, 'chatWithStylist');

// Defense-in-depth: the model is instructed never to mention item IDs, but strip any
// literal occurrences of the IDs it actually recommended in case it slips one in
// (e.g. "the blazer (abc123)"), plus the stray punctuation that'd leave behind.
function stripItemIdsFromReply(text: string, itemIds: string[]): string {
  let cleaned = text;
  for (const id of itemIds) {
    if (!id) continue;
    cleaned = cleaned.split(id).join('');
  }
  return cleaned
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

export interface StylingContext {
  weather?: { condition: string; temperature: number };
  occasion?: string;
  mood?: string;
  styleProfile?: PersonalStyleProfile | null;
}

export type MessageRole = 'user' | 'assistant';
export type MessageType = 'text' | 'outfit' | 'items' | 'image';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  items?: Item[];
  itemIds?: string[];
  outfitId?: string;
  imageUrl?: string;
  /** The look is composed of shop products, not closet items: taps open
   *  Product Detail and the save action becomes "Shop this look". */
  fromShop?: boolean;
  timestamp: string;
}

export interface ConversationContext {
  userId: string;
  closetItems: Item[];
  styleProfile?: StyleProfile;
  recentQueries: string[];
  preferences: {
    favoriteColors?: string[];
    avoidedStyles?: string[];
    budget?: string;
  };
}

/** Does this message actually ask to be dressed? General questions ("does
 *  navy go with brown?") still deserve the AI even with an empty closet. */
function isOutfitSeeking(message: string, occasion?: string): boolean {
  if (occasion) return true; // the Get My Outfit picker was used
  const q = message.toLowerCase();
  return [
    'outfit',
    'what should i wear',
    'what do i wear',
    'what to wear',
    'dress me',
    'style me',
    'put together',
    'a look',
    'wear to',
    'wear for',
  ].some(k => q.includes(k));
}

/** Maps free text (or the picker's occasion) onto the outfit engine's keys. */
function inferOccasion(message: string, occasion?: string): OccasionKey {
  const q = `${occasion || ''} ${message}`.toLowerCase();
  if (/\b(work|office|meeting|interview|business)\b/.test(q)) return 'work';
  if (/\b(date|dinner|restaurant|drinks)\b/.test(q)) return 'date';
  if (/\b(party|club|night out|celebration|birthday)\b/.test(q)) return 'party';
  if (/\b(travel|trip|flight|airport|vacation)\b/.test(q)) return 'travel';
  if (/\b(gym|workout|run|exercise|yoga)\b/.test(q)) return 'workout';
  if (/\b(wedding|formal|gala|black tie|ceremony)\b/.test(q)) return 'formal';
  if (/\b(hike|outdoor|park|beach|picnic)\b/.test(q)) return 'outdoor';
  return 'casual';
}

const OCCASION_PHRASE: Record<OccasionKey, string> = {
  work: 'for work',
  casual: 'for an easy day',
  formal: 'for a formal occasion',
  date: 'for your date',
  workout: 'for a workout',
  party: 'for a night out',
  travel: 'for travelling',
  outdoor: 'for the outdoors',
};

class StylingAssistantService {
  private conversations: Map<string, ChatMessage[]> = new Map();
  private context: Map<string, ConversationContext> = new Map();

  /**
   * A composed shop look for a closet too thin to dress. Returns null on any
   * failure so the caller falls through to the normal AI path - a degraded
   * answer beats no answer.
   */
  private async buildStarterLookMessage(
    userId: string,
    message: string,
    context: StylingContext | undefined,
    closetCount: number
  ): Promise<ChatMessage | null> {
    try {
      const profile = await buildProfileMatchContext(userId).catch(() => undefined);
      const pools = await discoveryService.buildStarterPools(profile);

      const wanted = inferOccasion(message, context?.occasion);
      const order: OccasionKey[] = [wanted, 'casual', 'work', 'date', 'party', 'travel'];
      const usedOccasion = order.find(key => (pools[key] || []).length > 0);
      if (!usedOccasion) return null;
      const look = pools[usedOccasion][0];
      if (!look.items.length) return null;

      const closetLine =
        closetCount === 0
          ? "Your closet is empty so far"
          : `Your closet only has ${closetCount} ${closetCount === 1 ? 'piece' : 'pieces'} so far`;
      const content =
        `${closetLine}, so I put this together from the shop instead — ` +
        `a look ${OCCASION_PHRASE[usedOccasion]}, matched to your style profile. ` +
        `Tap any piece to see it, or add your own clothes and I'll style those.`;

      return {
        id: `local-${Date.now()}-a`,
        role: 'assistant',
        type: 'outfit',
        content,
        items: look.items,
        fromShop: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Starter look unavailable, falling back to AI reply', error);
      return null;
    }
  }

  /**
   * Send a message to the styling assistant.
   *
   * Speed: takes the already-known local conversation history instead of re-querying
   * Firestore, calls the AI and persists the user's message in parallel (they're
   * independent), and persists the assistant's reply in the background without
   * blocking the response - the caller gets the reply the moment OpenAI responds,
   * not after 2 more Firestore round-trips.
   */
  async sendMessage(
    userId: string,
    message: string,
    closetItems: Item[],
    localHistory: ChatMessage[],
    context?: StylingContext
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const now = new Date();
    const userMessage: ChatMessage = {
      id: `local-${Date.now()}-u`,
      role: 'user',
      type: 'text',
      content: message,
      timestamp: now.toISOString(),
    };

    // Cold start: a closet that cannot make a single top-and-bottom pair turns
    // every outfit request into a cop-out ("add some items first"). Same rule
    // and same engine as Home's Dress Me Today: compose the look from the
    // shop, ranked against the survey profile, and say so plainly. The moment
    // enough real pieces exist this branch stops being taken, and questions
    // that aren't outfit requests still go to the AI as usual.
    const coreCount = closetItems.filter(i =>
      ['tops', 'bottoms', 'dresses'].includes((i.category || '').toLowerCase())
    ).length;
    if (coreCount < 3 && isOutfitSeeking(message, context?.occasion)) {
      const starter = await this.buildStarterLookMessage(userId, message, context, closetItems.length);
      if (starter) {
        chatService
          .addMessage(userId, 'user', message, 'text')
          .catch(error => console.error('Error persisting user message:', error));
        // Persisted as text: product ids don't survive a history reload the
        // way closet ids do, and a stale product grid would be worse than
        // the sentence alone. The persisted copy also drops the "tap any
        // piece" instruction - on reload there are no pieces to tap, so the
        // saved message has to stand on its own.
        const persistedContent = starter.content.replace(
          "Tap any piece to see it, or",
          "Ask me again for a fresh one, or"
        );
        chatService
          .addMessage(userId, 'assistant', persistedContent, 'text')
          .catch(error => console.error('Error persisting assistant message:', error));
        return { userMessage, assistantMessage: starter };
      }
    }

    const historyForModel = localHistory.slice(-6).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const closetSummary = closetItems.map(item => ({
      id: item.id,
      category: item.category,
      color: item.color,
      brand: item.brand,
      style: item.style,
      seasons: item.seasons,
      wornCount: item.wornCount,
      daysSinceWorn: item.lastWornDate
        ? Math.floor((Date.now() - new Date(item.lastWornDate).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    const hour = now.getHours();
    const timeOfDay = hour < 11 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    const dayType = [0, 6].includes(now.getDay()) ? 'weekend' : 'weekday';

    const styleProfile = context?.styleProfile;
    const colorAnalysis = styleProfile?.colorAnalysis;
    const bodyAnalysis = styleProfile?.bodyAnalysis;
    const styleProfilePayload = styleProfile
      ? {
          wardrobeFocus: styleProfile.wardrobeFocus,
          styleArchetypes: styleProfile.styleArchetypes,
          avoidRules: styleProfile.avoidRules,
          preferredColors: [...styleProfile.colorProfile.primary, ...styleProfile.colorProfile.secondary],
          stretchColors: styleProfile.colorProfile.stretch,
          guidanceLevel: styleProfile.guidanceLevel,
          fitHighlight: styleProfile.fitPreferences.highlight,
          fitDownplay: styleProfile.fitPreferences.downplay,
          // AI-derived color season analysis (selfie -> seasonal palette), when the
          // user has completed it - much more precise than the hand-picked go-to
          // colors above, so the model should defer to this when both are present.
          colorSeason: colorAnalysis?.season,
          undertone: colorAnalysis?.undertone,
          seasonalPalette: colorAnalysis?.palette.map(c => c.name),
          colorsToAvoid: colorAnalysis?.colorsToAvoid.map(c => c.name),
          // AI/quiz-derived body & fit analysis - concrete per-category silhouette
          // guidance, more actionable than the flat highlight/downplay list above.
          bodyType: bodyAnalysis?.bodyType,
          bodyHighlight: bodyAnalysis?.highlight,
          bodyDownplay: bodyAnalysis?.downplay,
          recommendedSilhouettes: bodyAnalysis?.recommendedSilhouettes,
          categoryGuidance: bodyAnalysis?.categoryGuidance,
        }
      : undefined;

    // The trend desk's current report, ranked for THIS user - their closet,
    // their taste, and the weather where they are - so the stylist leads
    // with the trends most applicable to them, not a generic global list.
    // A trend that crosses one of the user's avoid rules still goes through,
    // flagged, so the stylist can propose it as an owned exception rather
    // than pretending the trend doesn't exist. Cached in-session, and never
    // allowed to block the chat.
    const trendPayload = await trendRemixService
      .loadTrendRemixes(
        closetItems,
        styleProfile
          ? {
              styleArchetypes: styleProfile.styleArchetypes,
              avoidRules: styleProfile.avoidRules,
              recommendedColors: styleProfile.colorAnalysis?.palette.map(c => c.name),
            }
          : undefined,
        context?.weather
          ? { temperature: context.weather.temperature, condition: context.weather.condition }
          : undefined
      )
      .then(remixes =>
        remixes.slice(0, 4).map(r => ({
          name: r.trend.name,
          region: r.trend.region,
          stage: r.trend.stage,
          keyGarments: r.trend.keyGarments.slice(0, 4),
          keyColors: r.trend.keyColors.slice(0, 3),
          stylingNote: r.trend.stylingNote,
          challengesAvoidRule: r.challengesAvoidRule,
        }))
      )
      .catch(() => undefined);

    // Fire the AI call and the user-message persistence at the same time - independent work
    const [aiResult] = await Promise.all([
      chatWithStylistFn({
        message,
        history: historyForModel,
        closetItems: closetSummary,
        weather: context?.weather,
        occasion: context?.occasion,
        mood: context?.mood,
        styleProfile: styleProfilePayload,
        timeOfDay,
        dayType,
        trends: trendPayload,
      }).catch(error => {
        console.error('Error calling chatWithStylist:', error);
        return null;
      }),
      chatService.addMessage(userId, 'user', message, 'text').catch(error => {
        console.error('Error persisting user message:', error);
      }),
    ]);

    let replyText = "I'm having trouble connecting right now. Please try again in a moment.";
    let itemIds: string[] = [];
    if (aiResult) {
      const data = aiResult.data as { success: boolean; reply: string; itemIds: string[] };
      replyText = data.reply;
      itemIds = data.itemIds || [];
      replyText = stripItemIdsFromReply(replyText, itemIds);
    }

    const referencedItems = itemIds
      .map(id => closetItems.find(item => item.id === id))
      .filter((item): item is Item => Boolean(item));

    const assistantMessage: ChatMessage = {
      id: `local-${Date.now()}-a`,
      role: 'assistant',
      type: referencedItems.length > 0 ? 'outfit' : 'text',
      content: replyText,
      items: referencedItems.length > 0 ? referencedItems : undefined,
      itemIds: itemIds.length > 0 ? itemIds : undefined,
      timestamp: new Date().toISOString(),
    };

    // Persist the assistant's reply in the background - don't make the user wait on it
    chatService
      .addMessage(userId, 'assistant', replyText, assistantMessage.type, itemIds)
      .catch(error => console.error('Error persisting assistant message:', error));

    return { userMessage, assistantMessage };
  }

  /**
   * Get conversation history from Firestore
   */
  async getConversation(userId: string): Promise<ChatMessage[]> {
    const docs = await chatService.getConversation(userId);
    return docs.map(doc => ({
      id: doc.id,
      role: doc.role,
      type: doc.type,
      content: doc.content,
      itemIds: doc.itemIds && doc.itemIds.length > 0 ? doc.itemIds : undefined,
      timestamp:
        doc.timestamp && typeof doc.timestamp.toDate === 'function'
          ? doc.timestamp.toDate().toISOString()
          : new Date().toISOString(),
    }));
  }

  /**
   * Clear conversation history in Firestore
   */
  async clearConversation(userId: string): Promise<void> {
    await chatService.clearConversation(userId);
    this.context.delete(userId);
  }

  /**
   * Get quick suggestions
   */
  async getQuickSuggestions(): Promise<string[]> {
    return [
      "What should I wear to work today?",
      "Suggest an outfit for a date",
      "What colors go well together?",
      "How do I style jeans?",
      "What are the current trends?",
      "What should I buy next?",
    ];
  }
}

export const stylingAssistantService = new StylingAssistantService();

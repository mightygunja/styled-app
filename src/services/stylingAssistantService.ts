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

export interface StylingTip {
  id: string;
  category: string;
  title: string;
  content: string;
  imageUrl?: string;
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
        // the sentence alone.
        chatService
          .addMessage(userId, 'assistant', starter.content, 'text')
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
   * Generate AI response based on user query
   */
  private generateResponse(
    query: string,
    closetItems: Item[],
    styleProfile?: StyleProfile
  ): ChatMessage {
    const lowerQuery = query.toLowerCase();

    // Greeting
    if (this.isGreeting(lowerQuery)) {
      return {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        type: 'text',
        content: "Hi! I'm your personal styling assistant. I can help you with outfit ideas, styling tips, color combinations, and more. What would you like to know?",
        timestamp: new Date().toISOString(),
      };
    }

    // Outfit suggestions
    if (this.isOutfitRequest(lowerQuery)) {
      return this.generateOutfitSuggestion(query, closetItems, styleProfile);
    }

    // Color advice
    if (this.isColorQuery(lowerQuery)) {
      return this.generateColorAdvice(query, styleProfile);
    }

    // Styling tips
    if (this.isStylingTipRequest(lowerQuery)) {
      return this.generateStylingTip(query);
    }

    // Item-specific questions
    if (this.isItemQuery(lowerQuery)) {
      return this.generateItemAdvice(query, closetItems);
    }

    // Occasion-based
    if (this.isOccasionQuery(lowerQuery)) {
      return this.generateOccasionAdvice(query, closetItems);
    }

    // Trend questions
    if (this.isTrendQuery(lowerQuery)) {
      return this.generateTrendAdvice(query);
    }

    // Shopping advice
    if (this.isShoppingQuery(lowerQuery)) {
      return this.generateShoppingAdvice(query, closetItems, styleProfile);
    }

    // Default response
    return {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      type: 'text',
      content: "I can help you with:\n\n• Outfit suggestions for any occasion\n• Color combination advice\n• Styling tips and tricks\n• How to wear specific items\n• Current fashion trends\n• Shopping recommendations\n\nWhat would you like to know?",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if message is a greeting
   */
  private isGreeting(query: string): boolean {
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(g => query.startsWith(g));
  }

  /**
   * Check if message is requesting an outfit
   */
  private isOutfitRequest(query: string): boolean {
    const keywords = ['outfit', 'what should i wear', 'what to wear', 'suggest', 'recommend'];
    return keywords.some(k => query.includes(k));
  }

  /**
   * Check if message is about colors
   */
  private isColorQuery(query: string): boolean {
    const keywords = ['color', 'colour', 'match', 'goes with', 'pair with'];
    return keywords.some(k => query.includes(k));
  }

  /**
   * Check if message is requesting styling tips
   */
  private isStylingTipRequest(query: string): boolean {
    const keywords = ['tip', 'how to', 'style', 'advice'];
    return keywords.some(k => query.includes(k));
  }

  /**
   * Check if message is about a specific item
   */
  private isItemQuery(query: string): boolean {
    const keywords = ['jeans', 'shirt', 'dress', 'shoes', 'jacket', 'coat', 'sweater'];
    return keywords.some(k => query.includes(k));
  }

  /**
   * Check if message is about an occasion
   */
  private isOccasionQuery(query: string): boolean {
    const keywords = ['work', 'date', 'party', 'wedding', 'interview', 'casual', 'formal'];
    return keywords.some(k => query.includes(k));
  }

  /**
   * Check if message is about trends
   */
  private isTrendQuery(query: string): boolean {
    const keywords = ['trend', 'trending', 'popular', 'fashionable', 'in style'];
    return keywords.some(k => query.includes(k));
  }

  /**
   * Check if message is about shopping
   */
  private isShoppingQuery(query: string): boolean {
    const keywords = ['buy', 'shop', 'purchase', 'need', 'missing'];
    return keywords.some(k => query.includes(k));
  }

  /**
   * Generate outfit suggestion with smart matching
   */
  private generateOutfitSuggestion(
    query: string,
    closetItems: Item[],
    styleProfile?: StyleProfile
  ): ChatMessage {
    if (closetItems.length === 0) {
      return {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        type: 'text',
        content: "I'd love to suggest an outfit, but I need to see what's in your closet first. Add some items and I'll create the perfect look for you!",
        timestamp: new Date().toISOString(),
      };
    }

    const occasion = this.extractOccasion(query);
    const weather = this.extractWeather(query);
    const formality = this.extractFormality(query, occasion);
    const colorPreference = this.extractColorPreference(query);
    
    // Get context for variety
    const ctx = this.context.get('current-user');
    const usedItemIds = new Set<string>();
    if (ctx) {
      // Track recently used items to avoid repetition
      ctx.recentQueries.forEach(q => {
        // Simple tracking - in production would be more sophisticated
      });
    }

    // Smart item selection based on occasion and formality
    const outfitItems = this.selectSmartOutfit(
      closetItems,
      occasion,
      formality,
      weather,
      colorPreference,
      usedItemIds
    );

    if (outfitItems.length === 0) {
      return {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        type: 'text',
        content: `I don't have enough items in your closet to create a complete outfit for ${occasion || 'this occasion'}. Try adding more ${formality === 'formal' ? 'dressy' : 'casual'} pieces!`,
        timestamp: new Date().toISOString(),
      };
    }

    const dominantStyle = styleProfile?.dominantStyles[0]?.category || 'casual';
    const explanation = this.generateOutfitExplanation(outfitItems, occasion, formality, weather, dominantStyle);

    return {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      type: 'outfit',
      content: explanation,
      items: outfitItems,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Smart outfit selection with color harmony and occasion matching
   */
  private selectSmartOutfit(
    items: Item[],
    occasion: string | null,
    formality: 'casual' | 'business' | 'formal',
    weather: 'hot' | 'cold' | 'mild' | null,
    colorPref: string | null,
    usedItems: Set<string>
  ): Item[] {
    // Categorize items
    const tops = items.filter(i => i.category === 'tops');
    const bottoms = items.filter(i => i.category === 'bottoms');
    const dresses = items.filter(i => i.category === 'dresses');
    const outerwear = items.filter(i => i.category === 'outerwear');
    const shoes = items.filter(i => i.category === 'shoes');
    const accessories = items.filter(i => i.category === 'accessories');

    let outfit: Item[] = [];

    // Decide between dress or top+bottom based on occasion
    const useDress = dresses.length > 0 && (formality === 'formal' || occasion === 'date' || occasion === 'party' || Math.random() > 0.7);

    if (useDress && dresses.length > 0) {
      // Select dress
      const dress = this.selectBestItem(dresses, formality, colorPref, usedItems);
      if (dress) outfit.push(dress);
    } else {
      // Select top and bottom
      const top = this.selectBestItem(tops, formality, colorPref, usedItems);
      if (top) {
        outfit.push(top);
        // Select bottom that matches the top
        const bottom = this.selectMatchingBottom(bottoms, top, formality, usedItems);
        if (bottom) outfit.push(bottom);
      }
    }

    // Add outerwear for cold weather or formal occasions
    if ((weather === 'cold' || formality === 'formal' || formality === 'business') && outerwear.length > 0) {
      const jacket = this.selectBestItem(outerwear, formality, null, usedItems);
      if (jacket) outfit.push(jacket);
    }

    // Add shoes
    if (shoes.length > 0) {
      const shoe = this.selectBestItem(shoes, formality, null, usedItems);
      if (shoe) outfit.push(shoe);
    }

    // Add accessories for formal occasions
    if ((formality === 'formal' || occasion === 'date') && accessories.length > 0 && Math.random() > 0.5) {
      const accessory = this.selectBestItem(accessories, formality, null, usedItems);
      if (accessory) outfit.push(accessory);
    }

    return outfit;
  }

  /**
   * Select best item from category based on criteria
   */
  private selectBestItem(
    items: Item[],
    formality: 'casual' | 'business' | 'formal',
    colorPref: string | null,
    usedItems: Set<string>
  ): Item | null {
    if (items.length === 0) return null;

    // Filter out recently used items for variety
    let availableItems = items.filter(i => !usedItems.has(i.id));
    if (availableItems.length === 0) availableItems = items; // Fallback if all used

    // Score items based on criteria
    const scoredItems = availableItems.map(item => {
      let score = 0;

      // Color preference
      if (colorPref && item.color?.toLowerCase().includes(colorPref.toLowerCase())) {
        score += 10;
      }

      // Formality matching (based on color and brand heuristics)
      const itemColor = item.color?.toLowerCase() || '';
      if (formality === 'formal') {
        if (['black', 'navy', 'white', 'grey', 'gray'].some(c => itemColor.includes(c))) score += 5;
        if (item.brand) score += 3; // Branded items often more formal
      } else if (formality === 'casual') {
        if (['blue', 'green', 'red', 'yellow', 'pink'].some(c => itemColor.includes(c))) score += 3;
      }

      // Add randomness for variety
      score += Math.random() * 5;

      return { item, score };
    });

    // Sort by score and pick top item
    scoredItems.sort((a, b) => b.score - a.score);
    return scoredItems[0].item;
  }

  /**
   * Select bottom that matches the top
   */
  private selectMatchingBottom(
    bottoms: Item[],
    top: Item,
    formality: 'casual' | 'business' | 'formal',
    usedItems: Set<string>
  ): Item | null {
    if (bottoms.length === 0) return null;

    const topColor = top.color?.toLowerCase() || '';
    let availableBottoms = bottoms.filter(b => !usedItems.has(b.id));
    if (availableBottoms.length === 0) availableBottoms = bottoms;

    // Color harmony rules
    const colorHarmony: Record<string, string[]> = {
      black: ['white', 'gray', 'grey', 'blue', 'red', 'beige', 'tan'],
      white: ['black', 'blue', 'navy', 'gray', 'grey', 'beige', 'brown'],
      blue: ['white', 'beige', 'tan', 'gray', 'grey', 'black', 'brown'],
      navy: ['white', 'beige', 'tan', 'gray', 'grey', 'brown'],
      red: ['black', 'white', 'navy', 'beige', 'gray', 'grey'],
      green: ['beige', 'brown', 'tan', 'white', 'black'],
      gray: ['white', 'black', 'blue', 'navy', 'pink', 'red'],
      grey: ['white', 'black', 'blue', 'navy', 'pink', 'red'],
      beige: ['white', 'brown', 'navy', 'blue', 'black'],
      brown: ['beige', 'white', 'tan', 'blue', 'navy'],
    };

    // Find matching colors
    const matchingColors = Object.keys(colorHarmony).find(c => topColor.includes(c));
    const harmonious = matchingColors ? colorHarmony[matchingColors] : [];

    // Score bottoms
    const scoredBottoms = availableBottoms.map(bottom => {
      let score = 0;
      const bottomColor = bottom.color?.toLowerCase() || '';

      // Color harmony
      if (harmonious.some(c => bottomColor.includes(c))) score += 10;

      // Neutrals always work
      if (['black', 'white', 'gray', 'grey', 'beige', 'navy', 'tan', 'brown'].some(c => bottomColor.includes(c))) {
        score += 5;
      }

      // Formality
      if (formality === 'formal' && ['black', 'navy', 'gray', 'grey'].some(c => bottomColor.includes(c))) {
        score += 5;
      }

      // Randomness for variety
      score += Math.random() * 3;

      return { bottom, score };
    });

    scoredBottoms.sort((a, b) => b.score - a.score);
    return scoredBottoms[0].bottom;
  }

  /**
   * Generate detailed outfit explanation
   */
  private generateOutfitExplanation(
    items: Item[],
    occasion: string | null,
    formality: string,
    weather: string | null,
    style: string
  ): string {
    const occasionText = occasion ? `for ${occasion}` : 'for you';
    const itemList = items.map(i => `${i.category}: ${i.color || 'neutral'} ${i.brand ? `by ${i.brand}` : ''}`).join('\n');
    
    const reasons = [];
    
    if (formality === 'formal') {
      reasons.push('The colors are sophisticated and polished');
      reasons.push('This combination conveys professionalism');
    } else if (formality === 'business') {
      reasons.push('It strikes the perfect balance between professional and approachable');
      reasons.push('The pieces are versatile for a business setting');
    } else {
      reasons.push('It\'s comfortable yet stylish');
      reasons.push('The pieces work well together for everyday wear');
    }

    if (weather === 'cold') {
      reasons.push('Layering keeps you warm without sacrificing style');
    } else if (weather === 'hot') {
      reasons.push('Light fabrics keep you cool and comfortable');
    }

    reasons.push('The colors complement each other beautifully');
    reasons.push(`It matches your ${style} aesthetic`);

    return `Here's a ${formality} ${style} outfit ${occasionText}:\n\n${itemList}\n\nWhy this works:\n${reasons.map(r => `• ${r}`).join('\n')}`;
  }

  /**
   * Extract weather from query
   */
  private extractWeather(query: string): 'hot' | 'cold' | 'mild' | null {
    const q = query.toLowerCase();
    if (q.includes('hot') || q.includes('summer') || q.includes('warm')) return 'hot';
    if (q.includes('cold') || q.includes('winter') || q.includes('chilly')) return 'cold';
    if (q.includes('spring') || q.includes('fall') || q.includes('autumn')) return 'mild';
    return null;
  }

  /**
   * Extract formality level
   */
  private extractFormality(query: string, occasion: string | null): 'casual' | 'business' | 'formal' {
    const q = query.toLowerCase();
    if (q.includes('formal') || q.includes('fancy') || occasion === 'wedding' || occasion === 'interview') return 'formal';
    if (q.includes('business') || q.includes('professional') || q.includes('office') || occasion === 'work') return 'business';
    return 'casual';
  }

  /**
   * Extract color preference from query
   */
  private extractColorPreference(query: string): string | null {
    const colors = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 'brown', 'gray', 'grey', 'beige', 'navy', 'orange'];
    const q = query.toLowerCase();
    for (const color of colors) {
      if (q.includes(color)) return color;
    }
    return null;
  }

  /**
   * Extract occasion from query with better matching
   */
  private extractOccasion(query: string): string | null {
    const q = query.toLowerCase();
    
    // Map various phrasings to occasions
    if (q.includes('work') || q.includes('office') || q.includes('job') || q.includes('meeting')) return 'work';
    if (q.includes('date') || q.includes('romantic') || q.includes('dinner out')) return 'date';
    if (q.includes('party') || q.includes('celebration') || q.includes('birthday')) return 'party';
    if (q.includes('wedding') || q.includes('ceremony')) return 'wedding';
    if (q.includes('interview') || q.includes('job interview')) return 'interview';
    if (q.includes('gym') || q.includes('workout') || q.includes('exercise')) return 'gym';
    if (q.includes('brunch') || q.includes('lunch') || q.includes('coffee')) return 'casual';
    if (q.includes('night out') || q.includes('club') || q.includes('bar')) return 'party';
    if (q.includes('beach') || q.includes('vacation') || q.includes('travel')) return 'casual';
    if (q.includes('formal') || q.includes('gala') || q.includes('fancy')) return 'formal event';
    
    return null;
  }

  /**
   * Generate color advice
   */
  private generateColorAdvice(query: string, styleProfile?: StyleProfile): ChatMessage {
    const dominantColor = styleProfile?.colorPalette.dominantColors[0]?.name || 'neutral';
    
    return {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      type: 'text',
      content: `Great question about colors! Based on your wardrobe, ${dominantColor} is your go-to color.\n\nHere are some color pairing tips:\n\n• Neutrals (black, white, gray, beige) go with everything\n• Complementary colors create bold looks\n• Monochromatic outfits are sophisticated\n• Earth tones work well together\n\nWhat specific color combination are you thinking about?`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate styling tip
   */
  private generateStylingTip(query: string): ChatMessage {
    const tips = [
      "The rule of thirds: Balance your outfit by keeping proportions in mind. If you're wearing loose pants, pair them with a fitted top.",
      "Layer smartly: Start with a base layer, add a middle layer for warmth, and finish with an outer layer for style.",
      "Accessorize wisely: One statement piece is better than multiple competing accessories.",
      "Fit is everything: Well-fitted clothes always look better than designer pieces that don't fit properly.",
      "Color blocking: Pair solid colors together for a modern, clean look.",
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];

    return {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      type: 'text',
      content: `Here's a styling tip for you:\n\n${randomTip}\n\nWould you like more specific advice?`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate item-specific advice
   */
  private generateItemAdvice(query: string, closetItems: Item[]): ChatMessage {
    return {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      type: 'text',
      content: "I can help you style that! Here are some ideas:\n\n• Pair it with contrasting pieces for balance\n• Consider the occasion and dress code\n• Add accessories to elevate the look\n• Layer for depth and interest\n\nWant me to suggest a complete outfit using this item?",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate occasion-specific advice
   */
  private generateOccasionAdvice(query: string, closetItems: Item[]): ChatMessage {
    const occasion = this.extractOccasion(query) || 'this occasion';
    
    return {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      type: 'text',
      content: `For ${occasion}, I recommend:\n\n• Choose appropriate formality level\n• Consider comfort and practicality\n• Stick to classic, timeless pieces\n• Add one statement element\n\nWould you like me to create a specific outfit from your closet?`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate trend advice
   */
  private generateTrendAdvice(query: string): ChatMessage {
    return {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      type: 'text',
      content: "Current fashion trends include:\n\n• Oversized silhouettes\n• Sustainable and vintage pieces\n• Bold color blocking\n• Minimalist aesthetics\n• Athleisure wear\n\nRemember, the best trend is the one that fits your personal style! Want help incorporating trends into your wardrobe?",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate shopping advice
   */
  private generateShoppingAdvice(
    query: string,
    closetItems: Item[],
    styleProfile?: StyleProfile
  ): ChatMessage {
    const gaps = styleProfile?.wardrobeStats.wardrobeGaps || [];
    
    if (gaps.length > 0) {
      return {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        type: 'text',
        content: `Based on your wardrobe analysis, you're missing:\n\n${gaps.map(g => `• ${g.charAt(0).toUpperCase() + g.slice(1)}`).join('\n')}\n\nThese pieces would complete your wardrobe and give you more outfit options. Want specific recommendations?`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      type: 'text',
      content: "When shopping, consider:\n\n• Quality over quantity\n• Versatile pieces that mix and match\n• Classic items that won't go out of style\n• Pieces that fill wardrobe gaps\n• Your budget and cost-per-wear\n\nWhat type of item are you looking for?",
      timestamp: new Date().toISOString(),
    };
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

  /**
   * Get styling tips
   */
  async getStylingTips(): Promise<StylingTip[]> {
    return [
      {
        id: 'tip-1',
        category: 'Basics',
        title: 'The Power of Fit',
        content: 'Well-fitted clothes always look better than designer pieces that don\'t fit properly. Invest in tailoring for key pieces.',
        imageUrl: 'https://picsum.photos/seed/tip1/400',
      },
      {
        id: 'tip-2',
        category: 'Color',
        title: 'Color Wheel Basics',
        content: 'Complementary colors (opposite on the color wheel) create bold looks, while analogous colors (next to each other) create harmony.',
        imageUrl: 'https://picsum.photos/seed/tip2/400',
      },
      {
        id: 'tip-3',
        category: 'Styling',
        title: 'Layering 101',
        content: 'Start with a base layer, add a middle layer for warmth, and finish with an outer layer for style. Keep proportions balanced.',
        imageUrl: 'https://picsum.photos/seed/tip3/400',
      },
    ];
  }
}

export const stylingAssistantService = new StylingAssistantService();

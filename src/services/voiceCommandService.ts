/**
 * Voice Command Service
 * 
 * Provides voice-activated navigation and hands-free browsing.
 * Supports natural language commands for searching, filtering,
 * and navigating the app.
 */

export type VoiceCommandType = 
  | 'search' 
  | 'navigate' 
  | 'filter' 
  | 'action' 
  | 'query' 
  | 'help';

export interface VoiceCommand {
  id: string;
  type: VoiceCommandType;
  transcript: string;
  confidence: number;
  intent: {
    action: string;
    entities: Record<string, any>;
  };
  timestamp: string;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: string[];
}

export interface VoiceCommandResult {
  command: VoiceCommand;
  success: boolean;
  response: string;
  action?: {
    type: string;
    data: any;
  };
}

export interface VoiceCommandHistory {
  commands: VoiceCommand[];
  totalCommands: number;
  successRate: number;
  topCommands: { command: string; count: number }[];
}

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  wakeWord: string;
  continuousListening: boolean;
  feedbackSound: boolean;
  voiceResponse: boolean;
}

class VoiceCommandService {
  private isListening: boolean = false;
  private commandHistory: VoiceCommand[] = [];
  private settings: VoiceSettings = {
    enabled: true,
    language: 'en-US',
    wakeWord: 'Hey 33 Trends',
    continuousListening: false,
    feedbackSound: true,
    voiceResponse: true,
  };

  // Supported commands
  private commandPatterns = {
    search: [
      /show me (.*)/i,
      /find (.*)/i,
      /search for (.*)/i,
      /look for (.*)/i,
    ],
    navigate: [
      /go to (.*)/i,
      /open (.*)/i,
      /navigate to (.*)/i,
      /show (.*) screen/i,
    ],
    filter: [
      /filter by (.*)/i,
      /show only (.*)/i,
      /sort by (.*)/i,
    ],
    action: [
      /add to (.*)/i,
      /save (.*)/i,
      /delete (.*)/i,
      /remove (.*)/i,
      /like (.*)/i,
      /favorite (.*)/i,
    ],
    query: [
      /what (.*)/i,
      /how (.*)/i,
      /when (.*)/i,
      /where (.*)/i,
    ],
    help: [
      /help/i,
      /what can you do/i,
      /commands/i,
    ],
  };

  /**
   * Start listening for voice commands
   */
  async startListening(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    this.isListening = true;
  }

  /**
   * Stop listening
   */
  async stopListening(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    this.isListening = false;
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Process voice input (simulated)
   */
  async processVoiceInput(transcript: string): Promise<VoiceCommandResult> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const command = this.parseCommand(transcript);
    this.commandHistory.push(command);

    const result = await this.executeCommand(command);
    return result;
  }

  /**
   * Parse voice transcript into command
   */
  private parseCommand(transcript: string): VoiceCommand {
    const lowerTranscript = transcript.toLowerCase();
    let type: VoiceCommandType = 'query';
    let action = 'unknown';
    let entities: Record<string, any> = {};

    // Match against patterns
    for (const [commandType, patterns] of Object.entries(this.commandPatterns)) {
      for (const pattern of patterns) {
        const match = lowerTranscript.match(pattern);
        if (match) {
          type = commandType as VoiceCommandType;
          action = this.extractAction(commandType, match);
          entities = this.extractEntities(match);
          break;
        }
      }
      if (type !== 'query') break;
    }

    return {
      id: `cmd-${Date.now()}`,
      type,
      transcript,
      confidence: 0.85 + Math.random() * 0.15,
      intent: {
        action,
        entities,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract action from match
   */
  private extractAction(type: string, match: RegExpMatchArray): string {
    if (match[1]) {
      return match[1].trim();
    }
    return type;
  }

  /**
   * Extract entities from match
   */
  private extractEntities(match: RegExpMatchArray): Record<string, any> {
    const entities: Record<string, any> = {};

    if (match[1]) {
      const text = match[1].toLowerCase();

      // Extract category
      if (text.includes('dress')) entities.category = 'dresses';
      else if (text.includes('top') || text.includes('shirt')) entities.category = 'tops';
      else if (text.includes('pant') || text.includes('jean')) entities.category = 'bottoms';
      else if (text.includes('shoe')) entities.category = 'shoes';
      else if (text.includes('jacket') || text.includes('coat')) entities.category = 'outerwear';

      // Extract color
      const colors = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'pink', 'purple'];
      colors.forEach(color => {
        if (text.includes(color)) entities.color = color;
      });

      // Extract style
      if (text.includes('casual')) entities.style = 'casual';
      else if (text.includes('formal')) entities.style = 'formal';
      else if (text.includes('work')) entities.style = 'work';

      // Extract price
      const priceMatch = text.match(/under (\d+)/);
      if (priceMatch) {
        entities.maxPrice = parseInt(priceMatch[1]);
      }

      // Store raw query
      entities.query = match[1].trim();
    }

    return entities;
  }

  /**
   * Execute parsed command
   */
  private async executeCommand(command: VoiceCommand): Promise<VoiceCommandResult> {
    await new Promise(resolve => setTimeout(resolve, 300));

    let success = true;
    let response = '';
    let action: VoiceCommandResult['action'];

    switch (command.type) {
      case 'search':
        response = `Searching for ${command.intent.entities.query || 'items'}...`;
        action = {
          type: 'navigate',
          data: {
            screen: 'SmartSearch',
            params: { query: command.intent.entities.query },
          },
        };
        break;

      case 'navigate':
        const destination = this.mapDestination(command.intent.action);
        response = `Opening ${destination}...`;
        action = {
          type: 'navigate',
          data: { screen: destination },
        };
        break;

      case 'filter':
        response = `Filtering by ${command.intent.action}...`;
        action = {
          type: 'filter',
          data: { filter: command.intent.entities },
        };
        break;

      case 'action':
        response = this.getActionResponse(command.intent.action);
        action = {
          type: 'action',
          data: { action: command.intent.action },
        };
        break;

      case 'query':
        response = this.getQueryResponse(command.transcript);
        break;

      case 'help':
        response = this.getHelpResponse();
        break;

      default:
        response = "I didn't understand that command. Try saying 'help' for available commands.";
        success = false;
    }

    return {
      command,
      success,
      response,
      action,
    };
  }

  /**
   * Map destination names to screen names
   */
  private mapDestination(destination: string): string {
    const mapping: Record<string, string> = {
      'closet': 'Closet',
      'wardrobe': 'Closet',
      'outfits': 'Outfits',
      'outfit builder': 'OutfitBuilder',
      'social': 'SocialFeed',
      'feed': 'SocialFeed',
      'explore': 'Explore',
      'profile': 'Profile',
      'settings': 'Settings',
      'favorites': 'Favorites',
      'search': 'SmartSearch',
      'trends': 'TrendInsights',
      'sustainability': 'Sustainability',
      'carbon calculator': 'CarbonCalculator',
      'marketplace': 'SecondhandMarketplace',
      'ar try on': 'ARTryOn',
      'try on': 'ARTryOn',
    };

    const lowerDest = destination.toLowerCase();
    return mapping[lowerDest] || 'Closet';
  }

  /**
   * Get action response
   */
  private getActionResponse(action: string): string {
    if (action.includes('favorite') || action.includes('like')) {
      return 'Added to favorites';
    } else if (action.includes('save')) {
      return 'Saved successfully';
    } else if (action.includes('delete') || action.includes('remove')) {
      return 'Removed successfully';
    }
    return 'Action completed';
  }

  /**
   * Get query response
   */
  private getQueryResponse(query: string): string {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('what') && lowerQuery.includes('wear')) {
      return 'Let me suggest some outfits for you. Opening outfit recommendations...';
    } else if (lowerQuery.includes('trending')) {
      return 'Here are the latest fashion trends...';
    } else if (lowerQuery.includes('sustainable')) {
      return 'Opening sustainability insights...';
    }

    return 'Let me help you with that. Opening search...';
  }

  /**
   * Get help response
   */
  private getHelpResponse(): string {
    return `Here are some things you can say:
• "Show me casual dresses"
• "Find black jeans under 50"
• "Go to my closet"
• "What should I wear today?"
• "Filter by price"
• "Add to favorites"`;
  }

  /**
   * Get command suggestions
   */
  async getCommandSuggestions(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return [
      'Show me work outfits',
      'Find casual tops',
      'Go to my closet',
      'What should I wear today?',
      'Show trending items',
      'Filter by price',
      'Open sustainability',
      'Search for blue dresses',
      'Add to favorites',
      'Show me AR try-on',
    ];
  }

  /**
   * Get command history
   */
  async getCommandHistory(limit: number = 20): Promise<VoiceCommandHistory> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const recentCommands = this.commandHistory.slice(-limit);
    const successCount = recentCommands.filter(cmd => cmd.confidence > 0.7).length;
    const successRate = recentCommands.length > 0 ? (successCount / recentCommands.length) * 100 : 0;

    // Count command frequencies
    const commandCounts = new Map<string, number>();
    recentCommands.forEach(cmd => {
      const key = cmd.intent.action;
      commandCounts.set(key, (commandCounts.get(key) || 0) + 1);
    });

    const topCommands = Array.from(commandCounts.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      commands: recentCommands,
      totalCommands: this.commandHistory.length,
      successRate,
      topCommands,
    };
  }

  /**
   * Get voice settings
   */
  async getSettings(): Promise<VoiceSettings> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { ...this.settings };
  }

  /**
   * Update voice settings
   */
  async updateSettings(updates: Partial<VoiceSettings>): Promise<VoiceSettings> {
    await new Promise(resolve => setTimeout(resolve, 200));
    this.settings = { ...this.settings, ...updates };
    return { ...this.settings };
  }

  /**
   * Test voice recognition
   */
  async testVoiceRecognition(): Promise<VoiceRecognitionResult> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const testPhrases = [
      'Show me casual dresses',
      'Find black jeans',
      'Go to my closet',
      'What should I wear today?',
    ];

    const transcript = testPhrases[Math.floor(Math.random() * testPhrases.length)];

    return {
      transcript,
      confidence: 0.85 + Math.random() * 0.15,
      isFinal: true,
      alternatives: testPhrases.filter(p => p !== transcript).slice(0, 2),
    };
  }

  /**
   * Clear command history
   */
  async clearHistory(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    this.commandHistory = [];
  }
}

export const voiceCommandService = new VoiceCommandService();

/**
 * Siri Shortcuts Service
 * 
 * Manages Siri shortcuts and voice commands for the Styled app.
 */

export type ShortcutCategory = 'wardrobe' | 'outfits' | 'planning' | 'quick-actions';
export type ShortcutTrigger = 'voice' | 'widget' | 'automation';

export interface SiriShortcut {
  id: string;
  title: string;
  phrase: string;
  description: string;
  category: ShortcutCategory;
  icon: string;
  enabled: boolean;
  usageCount: number;
  lastUsed?: string;
  suggestedPhrases: string[];
}

export interface ShortcutSettings {
  userId: string;
  enabled: boolean;
  allowSuggestions: boolean;
  voiceConfirmation: boolean;
  hapticFeedback: boolean;
}

export interface ShortcutExecution {
  id: string;
  shortcutId: string;
  trigger: ShortcutTrigger;
  timestamp: string;
  success: boolean;
  duration: number; // ms
  error?: string;
}

export interface ShortcutAnalytics {
  totalExecutions: number;
  successRate: number;
  mostUsedShortcut: string;
  averageDuration: number; // ms
  lastExecution?: string;
}

export interface VoiceCommand {
  id: string;
  command: string;
  action: string;
  parameters?: Record<string, any>;
  confidence: number; // 0-1
}

class SiriShortcutsService {
  /**
   * Get shortcut settings
   */
  async getShortcutSettings(userId: string): Promise<ShortcutSettings> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      userId,
      enabled: true,
      allowSuggestions: true,
      voiceConfirmation: false,
      hapticFeedback: true,
    };
  }

  /**
   * Update shortcut settings
   */
  async updateShortcutSettings(
    userId: string,
    updates: Partial<ShortcutSettings>
  ): Promise<ShortcutSettings> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const current = await this.getShortcutSettings(userId);
    return { ...current, ...updates };
  }

  /**
   * Get available shortcuts
   */
  async getAvailableShortcuts(): Promise<SiriShortcut[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
      {
        id: 'shortcut-1',
        title: 'Show Today\'s Outfit',
        phrase: 'What should I wear today?',
        description: 'Get outfit suggestion for today',
        category: 'outfits',
        icon: '👗',
        enabled: true,
        usageCount: 47,
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        suggestedPhrases: [
          'What should I wear today?',
          'Show my outfit',
          'Today\'s outfit',
        ],
      },
      {
        id: 'shortcut-2',
        title: 'Add to Wardrobe',
        phrase: 'Add item to wardrobe',
        description: 'Quick add new clothing item',
        category: 'wardrobe',
        icon: '➕',
        enabled: true,
        usageCount: 23,
        lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        suggestedPhrases: [
          'Add item to wardrobe',
          'Add new item',
          'Add clothing',
        ],
      },
      {
        id: 'shortcut-3',
        title: 'Plan Tomorrow\'s Outfit',
        phrase: 'Plan outfit for tomorrow',
        description: 'Schedule tomorrow\'s outfit',
        category: 'planning',
        icon: '📅',
        enabled: true,
        usageCount: 31,
        lastUsed: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        suggestedPhrases: [
          'Plan outfit for tomorrow',
          'What to wear tomorrow',
          'Schedule tomorrow\'s outfit',
        ],
      },
      {
        id: 'shortcut-4',
        title: 'View Wardrobe',
        phrase: 'Show my wardrobe',
        description: 'Open wardrobe view',
        category: 'wardrobe',
        icon: '👔',
        enabled: true,
        usageCount: 18,
        lastUsed: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        suggestedPhrases: [
          'Show my wardrobe',
          'Open wardrobe',
          'View my clothes',
        ],
      },
      {
        id: 'shortcut-5',
        title: 'Get Outfit Suggestions',
        phrase: 'Suggest outfits',
        description: 'Get AI outfit recommendations',
        category: 'outfits',
        icon: '💡',
        enabled: true,
        usageCount: 42,
        lastUsed: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        suggestedPhrases: [
          'Suggest outfits',
          'Give me outfit ideas',
          'Show outfit suggestions',
        ],
      },
      {
        id: 'shortcut-6',
        title: 'Log Outfit Wear',
        phrase: 'Log today\'s outfit',
        description: 'Record outfit worn today',
        category: 'quick-actions',
        icon: '📝',
        enabled: false,
        usageCount: 12,
        lastUsed: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        suggestedPhrases: [
          'Log today\'s outfit',
          'Record outfit',
          'I wore this outfit',
        ],
      },
      {
        id: 'shortcut-7',
        title: 'Weather-Based Outfit',
        phrase: 'Outfit for the weather',
        description: 'Get weather-appropriate outfit',
        category: 'outfits',
        icon: '⛅',
        enabled: true,
        usageCount: 38,
        lastUsed: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        suggestedPhrases: [
          'Outfit for the weather',
          'What to wear in this weather',
          'Weather outfit',
        ],
      },
      {
        id: 'shortcut-8',
        title: 'Quick Outfit Builder',
        phrase: 'Build an outfit',
        description: 'Create new outfit quickly',
        category: 'outfits',
        icon: '🎨',
        enabled: false,
        usageCount: 15,
        suggestedPhrases: [
          'Build an outfit',
          'Create outfit',
          'Make new outfit',
        ],
      },
    ];
  }

  /**
   * Get enabled shortcuts
   */
  async getEnabledShortcuts(): Promise<SiriShortcut[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const all = await this.getAvailableShortcuts();
    return all.filter(s => s.enabled);
  }

  /**
   * Enable shortcut
   */
  async enableShortcut(shortcutId: string): Promise<SiriShortcut> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const shortcuts = await this.getAvailableShortcuts();
    const shortcut = shortcuts.find(s => s.id === shortcutId);
    
    if (!shortcut) {
      throw new Error('Shortcut not found');
    }

    return { ...shortcut, enabled: true };
  }

  /**
   * Disable shortcut
   */
  async disableShortcut(shortcutId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  /**
   * Add shortcut to Siri
   */
  async addToSiri(shortcutId: string, customPhrase?: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
    // Mock adding to Siri
  }

  /**
   * Execute shortcut
   */
  async executeShortcut(
    shortcutId: string,
    trigger: ShortcutTrigger = 'voice'
  ): Promise<ShortcutExecution> {
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      id: `exec-${Date.now()}`,
      shortcutId,
      trigger,
      timestamp: new Date().toISOString(),
      success: true,
      duration: 234,
    };
  }

  /**
   * Process voice command
   */
  async processVoiceCommand(command: string): Promise<VoiceCommand> {
    await new Promise(resolve => setTimeout(resolve, 600));

    // Simple command matching
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('outfit') && lowerCommand.includes('today')) {
      return {
        id: `cmd-${Date.now()}`,
        command,
        action: 'show-todays-outfit',
        confidence: 0.95,
      };
    }
    
    if (lowerCommand.includes('add') && lowerCommand.includes('wardrobe')) {
      return {
        id: `cmd-${Date.now()}`,
        command,
        action: 'add-to-wardrobe',
        confidence: 0.92,
      };
    }
    
    if (lowerCommand.includes('suggest') || lowerCommand.includes('recommendation')) {
      return {
        id: `cmd-${Date.now()}`,
        command,
        action: 'get-suggestions',
        confidence: 0.88,
      };
    }

    return {
      id: `cmd-${Date.now()}`,
      command,
      action: 'unknown',
      confidence: 0.45,
    };
  }

  /**
   * Get shortcut analytics
   */
  async getShortcutAnalytics(userId: string): Promise<ShortcutAnalytics> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      totalExecutions: 226,
      successRate: 96.5,
      mostUsedShortcut: 'Show Today\'s Outfit',
      averageDuration: 287,
      lastExecution: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Get shortcut history
   */
  async getShortcutHistory(userId: string): Promise<ShortcutExecution[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
      {
        id: 'exec-1',
        shortcutId: 'shortcut-1',
        trigger: 'voice',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        success: true,
        duration: 234,
      },
      {
        id: 'exec-2',
        shortcutId: 'shortcut-5',
        trigger: 'voice',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        success: true,
        duration: 312,
      },
      {
        id: 'exec-3',
        shortcutId: 'shortcut-7',
        trigger: 'widget',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        success: true,
        duration: 189,
      },
      {
        id: 'exec-4',
        shortcutId: 'shortcut-3',
        trigger: 'voice',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        success: true,
        duration: 456,
      },
    ];
  }

  /**
   * Get suggested shortcuts
   */
  async getSuggestedShortcuts(userId: string): Promise<SiriShortcut[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const all = await this.getAvailableShortcuts();
    // Return top 3 most used shortcuts
    return all
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 3);
  }

  /**
   * Test shortcut
   */
  async testShortcut(shortcutId: string): Promise<{
    success: boolean;
    duration: number;
    error?: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      duration: 234,
    };
  }

  /**
   * Get shortcut by phrase
   */
  async getShortcutByPhrase(phrase: string): Promise<SiriShortcut | null> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const shortcuts = await this.getAvailableShortcuts();
    return shortcuts.find(s => 
      s.phrase.toLowerCase() === phrase.toLowerCase() ||
      s.suggestedPhrases.some(p => p.toLowerCase() === phrase.toLowerCase())
    ) || null;
  }

  /**
   * Check Siri availability
   */
  async isSiriAvailable(): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return true; // iOS 12+ with Siri enabled
  }

  /**
   * Get voice recognition languages
   */
  async getSupportedLanguages(): Promise<{
    code: string;
    name: string;
    supported: boolean;
  }[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return [
      { code: 'en-US', name: 'English (US)', supported: true },
      { code: 'en-GB', name: 'English (UK)', supported: true },
      { code: 'es-ES', name: 'Spanish', supported: true },
      { code: 'fr-FR', name: 'French', supported: true },
      { code: 'de-DE', name: 'German', supported: true },
      { code: 'it-IT', name: 'Italian', supported: true },
      { code: 'ja-JP', name: 'Japanese', supported: true },
      { code: 'ko-KR', name: 'Korean', supported: true },
      { code: 'zh-CN', name: 'Chinese', supported: true },
    ];
  }

  /**
   * Donate shortcut to Siri
   */
  async donateShortcut(shortcutId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Mock donation for Siri suggestions
  }
}

export const siriShortcutsService = new SiriShortcutsService();

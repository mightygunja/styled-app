/**
 * Accessibility Service
 * 
 * Manages accessibility features including screen reader support,
 * visual adjustments, and WCAG compliance.
 */

export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';
export type ContrastMode = 'normal' | 'high' | 'higher';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type MotionPreference = 'normal' | 'reduced';

export interface AccessibilitySettings {
  userId: string;
  screenReader: {
    enabled: boolean;
    announceChanges: boolean;
    speakHints: boolean;
  };
  visual: {
    fontSize: FontSize;
    contrastMode: ContrastMode;
    colorBlindMode: ColorBlindMode;
    boldText: boolean;
    underlineLinks: boolean;
  };
  motion: {
    reduceMotion: boolean;
    disableAnimations: boolean;
    disableParallax: boolean;
  };
  interaction: {
    largerTouchTargets: boolean;
    hapticFeedback: boolean;
    longPressDelay: number; // milliseconds
    doubleClickSpeed: number; // milliseconds
  };
  audio: {
    soundEffects: boolean;
    voiceGuidance: boolean;
    audioDescriptions: boolean;
  };
}

export interface FontSizeInfo {
  size: FontSize;
  name: string;
  scale: number;
  description: string;
}

export interface ContrastInfo {
  mode: ContrastMode;
  name: string;
  ratio: string;
  description: string;
}

export interface ColorBlindInfo {
  mode: ColorBlindMode;
  name: string;
  description: string;
  prevalence: string;
}

export interface AccessibilityAudit {
  score: number;
  issues: {
    severity: 'critical' | 'serious' | 'moderate' | 'minor';
    type: string;
    description: string;
    location: string;
    recommendation: string;
  }[];
  passedChecks: number;
  totalChecks: number;
  wcagLevel: 'A' | 'AA' | 'AAA' | 'Fail';
}

class AccessibilityService {
  /**
   * Get accessibility settings
   */
  async getAccessibilitySettings(userId: string): Promise<AccessibilitySettings> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      userId,
      screenReader: {
        enabled: false,
        announceChanges: true,
        speakHints: true,
      },
      visual: {
        fontSize: 'medium',
        contrastMode: 'normal',
        colorBlindMode: 'none',
        boldText: false,
        underlineLinks: false,
      },
      motion: {
        reduceMotion: false,
        disableAnimations: false,
        disableParallax: false,
      },
      interaction: {
        largerTouchTargets: false,
        hapticFeedback: true,
        longPressDelay: 500,
        doubleClickSpeed: 300,
      },
      audio: {
        soundEffects: true,
        voiceGuidance: false,
        audioDescriptions: false,
      },
    };
  }

  /**
   * Update accessibility settings
   */
  async updateAccessibilitySettings(
    userId: string,
    updates: Partial<AccessibilitySettings>
  ): Promise<AccessibilitySettings> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const current = await this.getAccessibilitySettings(userId);
    return { ...current, ...updates };
  }

  /**
   * Get font size options
   */
  async getFontSizeOptions(): Promise<FontSizeInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return [
      {
        size: 'small',
        name: 'Small',
        scale: 0.875,
        description: 'Compact text for more content',
      },
      {
        size: 'medium',
        name: 'Medium',
        scale: 1.0,
        description: 'Default text size',
      },
      {
        size: 'large',
        name: 'Large',
        scale: 1.25,
        description: 'Larger text for better readability',
      },
      {
        size: 'extra-large',
        name: 'Extra Large',
        scale: 1.5,
        description: 'Maximum text size',
      },
    ];
  }

  /**
   * Get contrast mode options
   */
  async getContrastModes(): Promise<ContrastInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return [
      {
        mode: 'normal',
        name: 'Normal',
        ratio: '4.5:1',
        description: 'Standard contrast',
      },
      {
        mode: 'high',
        name: 'High Contrast',
        ratio: '7:1',
        description: 'Enhanced contrast for better visibility',
      },
      {
        mode: 'higher',
        name: 'Higher Contrast',
        ratio: '10:1',
        description: 'Maximum contrast for low vision',
      },
    ];
  }

  /**
   * Get color blind mode options
   */
  async getColorBlindModes(): Promise<ColorBlindInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return [
      {
        mode: 'none',
        name: 'None',
        description: 'Standard colors',
        prevalence: 'N/A',
      },
      {
        mode: 'protanopia',
        name: 'Protanopia',
        description: 'Red-blind (no red cones)',
        prevalence: '1% of males',
      },
      {
        mode: 'deuteranopia',
        name: 'Deuteranopia',
        description: 'Green-blind (no green cones)',
        prevalence: '1% of males',
      },
      {
        mode: 'tritanopia',
        name: 'Tritanopia',
        description: 'Blue-blind (no blue cones)',
        prevalence: '0.001% of population',
      },
    ];
  }

  /**
   * Apply font size
   */
  async applyFontSize(fontSize: FontSize): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const scales: Record<FontSize, number> = {
      small: 0.875,
      medium: 1.0,
      large: 1.25,
      'extra-large': 1.5,
    };

    return scales[fontSize];
  }

  /**
   * Apply contrast mode
   */
  async applyContrastMode(mode: ContrastMode): Promise<{
    backgroundColor: string;
    textColor: string;
    borderColor: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const themes: Record<ContrastMode, any> = {
      normal: {
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        borderColor: '#e2e8f0',
      },
      high: {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        borderColor: '#000000',
      },
      higher: {
        backgroundColor: '#000000',
        textColor: '#ffffff',
        borderColor: '#ffffff',
      },
    };

    return themes[mode];
  }

  /**
   * Apply color blind mode
   */
  async applyColorBlindMode(mode: ColorBlindMode): Promise<Record<string, string>> {
    await new Promise(resolve => setTimeout(resolve, 300));

    if (mode === 'none') {
      return {
        primary: '#8b5cf6',
        secondary: '#ec4899',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      };
    }

    // Adjusted colors for color blindness
    const colorMaps: Record<ColorBlindMode, Record<string, string>> = {
      none: {},
      protanopia: {
        primary: '#6366f1', // Blue instead of purple
        secondary: '#ec4899', // Keep pink
        success: '#06b6d4', // Cyan instead of green
        warning: '#f59e0b', // Keep orange
        error: '#3b82f6', // Blue instead of red
      },
      deuteranopia: {
        primary: '#6366f1',
        secondary: '#ec4899',
        success: '#06b6d4',
        warning: '#f59e0b',
        error: '#3b82f6',
      },
      tritanopia: {
        primary: '#ec4899', // Pink instead of purple
        secondary: '#06b6d4', // Cyan
        success: '#10b981', // Keep green
        warning: '#ef4444', // Red instead of orange
        error: '#dc2626', // Dark red
      },
    };

    return colorMaps[mode];
  }

  /**
   * Enable screen reader
   */
  async enableScreenReader(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    // In real app: enable AccessibilityInfo and VoiceOver/TalkBack
  }

  /**
   * Disable screen reader
   */
  async disableScreenReader(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    // In real app: disable AccessibilityInfo
  }

  /**
   * Check if screen reader is active
   */
  async isScreenReaderActive(): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    // In real app: use AccessibilityInfo.isScreenReaderEnabled()
    return false;
  }

  /**
   * Announce to screen reader
   */
  async announce(message: string, priority?: 'polite' | 'assertive'): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    // In real app: use AccessibilityInfo.announceForAccessibility()
    console.log(`[Screen Reader] ${message}`);
  }

  /**
   * Run accessibility audit
   */
  async runAccessibilityAudit(): Promise<AccessibilityAudit> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      score: 87,
      issues: [
        {
          severity: 'serious',
          type: 'Missing Alt Text',
          description: '3 images missing alternative text',
          location: 'Wardrobe Screen',
          recommendation: 'Add descriptive alt text to all images',
        },
        {
          severity: 'moderate',
          type: 'Low Contrast',
          description: 'Text contrast ratio below 4.5:1',
          location: 'Outfit Card - Secondary Text',
          recommendation: 'Increase text color contrast',
        },
        {
          severity: 'minor',
          type: 'Touch Target Size',
          description: 'Button smaller than 44x44 points',
          location: 'Filter Chips',
          recommendation: 'Increase button size to meet minimum',
        },
      ],
      passedChecks: 42,
      totalChecks: 48,
      wcagLevel: 'AA',
    };
  }

  /**
   * Get accessibility tips
   */
  async getAccessibilityTips(): Promise<{
    category: string;
    tips: string[];
  }[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return [
      {
        category: 'Screen Reader',
        tips: [
          'Enable VoiceOver (iOS) or TalkBack (Android) in system settings',
          'Use headphones for better audio feedback',
          'Swipe right to move to next element',
          'Double-tap to activate buttons',
        ],
      },
      {
        category: 'Visual',
        tips: [
          'Increase font size for better readability',
          'Enable high contrast mode in low light',
          'Use color blind modes if you have color vision deficiency',
          'Enable bold text for clearer typography',
        ],
      },
      {
        category: 'Motion',
        tips: [
          'Reduce motion if animations cause discomfort',
          'Disable parallax effects to reduce motion sickness',
          'Turn off auto-playing videos',
        ],
      },
      {
        category: 'Interaction',
        tips: [
          'Enable larger touch targets for easier tapping',
          'Adjust long press delay to your preference',
          'Enable haptic feedback for tactile confirmation',
        ],
      },
    ];
  }

  /**
   * Export accessibility report
   */
  async exportAccessibilityReport(userId: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const settings = await this.getAccessibilitySettings(userId);
    const audit = await this.runAccessibilityAudit();

    return JSON.stringify({
      settings,
      audit,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Get recommended settings
   */
  async getRecommendedSettings(
    userProfile: {
      hasLowVision?: boolean;
      isColorBlind?: boolean;
      hasMotionSensitivity?: boolean;
      usesScreenReader?: boolean;
    }
  ): Promise<Partial<AccessibilitySettings>> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const recommendations: Partial<AccessibilitySettings> = {
      visual: {
        fontSize: 'medium',
        contrastMode: 'normal',
        colorBlindMode: 'none',
        boldText: false,
        underlineLinks: false,
      },
      motion: {
        reduceMotion: false,
        disableAnimations: false,
        disableParallax: false,
      },
    };

    if (userProfile.hasLowVision) {
      recommendations.visual = {
        ...recommendations.visual!,
        fontSize: 'large',
        contrastMode: 'high',
        boldText: true,
      };
    }

    if (userProfile.isColorBlind) {
      recommendations.visual = {
        ...recommendations.visual!,
        colorBlindMode: 'protanopia',
        underlineLinks: true,
      };
    }

    if (userProfile.hasMotionSensitivity) {
      recommendations.motion = {
        reduceMotion: true,
        disableAnimations: true,
        disableParallax: true,
      };
    }

    if (userProfile.usesScreenReader) {
      recommendations.screenReader = {
        enabled: true,
        announceChanges: true,
        speakHints: true,
      };
      recommendations.interaction = {
        largerTouchTargets: true,
        hapticFeedback: true,
        longPressDelay: 700,
        doubleClickSpeed: 400,
      };
    }

    return recommendations;
  }

  /**
   * Test accessibility feature
   */
  async testAccessibilityFeature(
    feature: 'screenReader' | 'contrast' | 'fontSize' | 'colorBlind'
  ): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
}

export const accessibilityService = new AccessibilityService();

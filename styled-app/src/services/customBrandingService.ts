/**
 * Custom Branding Service
 * 
 * Manages custom branding for stylists and businesses including
 * logo, colors, fonts, and brand identity customization.
 */

import { SubscriptionTier } from './subscriptionService';

export type BrandingElement = 'logo' | 'colors' | 'fonts' | 'imagery' | 'messaging';

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  error: string;
  success: string;
  warning: string;
}

export interface BrandFonts {
  heading: string;
  body: string;
  accent: string;
}

export interface BrandLogo {
  url: string;
  width: number;
  height: number;
  format: 'png' | 'svg' | 'jpg';
}

export interface BrandImagery {
  heroImage?: string;
  backgroundPattern?: string;
  iconStyle: 'outlined' | 'filled' | 'rounded' | 'sharp';
  imageFilter?: 'none' | 'grayscale' | 'sepia' | 'vintage';
}

export interface BrandMessaging {
  tagline: string;
  description: string;
  tone: 'professional' | 'casual' | 'luxury' | 'friendly' | 'bold';
  voice: string[];
}

export interface CustomBranding {
  id: string;
  userId: string;
  businessName: string;
  logo?: BrandLogo;
  colors: BrandColors;
  fonts: BrandFonts;
  imagery: BrandImagery;
  messaging: BrandMessaging;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandingTemplate {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'classic' | 'minimal' | 'bold' | 'luxury';
  previewUrl: string;
  colors: BrandColors;
  fonts: BrandFonts;
  imagery: BrandImagery;
  isPremium: boolean;
}

export interface BrandingFeatures {
  tier: SubscriptionTier;
  features: {
    customLogo: boolean;
    customColors: boolean;
    customFonts: boolean;
    customImagery: boolean;
    customMessaging: boolean;
    brandTemplates: boolean;
    templateCount: number;
    exportBrandKit: boolean;
    brandGuidelines: boolean;
    multipleProfiles: boolean;
    profileCount: number;
  };
}

export interface BrandKit {
  branding: CustomBranding;
  assets: {
    logoVariants: string[];
    colorPalette: string[];
    fontFiles: string[];
    imageAssets: string[];
  };
  guidelines: {
    logoUsage: string;
    colorUsage: string;
    typography: string;
    imagery: string;
  };
}

class CustomBrandingService {
  /**
   * Get user's custom branding
   */
  async getUserBranding(userId: string): Promise<CustomBranding | null> {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock branding
    return {
      id: 'brand-1',
      userId,
      businessName: 'Style Studio',
      logo: {
        url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9',
        width: 200,
        height: 200,
        format: 'png',
      },
      colors: {
        primary: '#8b5cf6',
        secondary: '#ec4899',
        accent: '#f59e0b',
        background: '#ffffff',
        text: '#0f172a',
        error: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
      },
      fonts: {
        heading: 'Playfair Display',
        body: 'Inter',
        accent: 'Montserrat',
      },
      imagery: {
        heroImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d',
        iconStyle: 'rounded',
        imageFilter: 'none',
      },
      messaging: {
        tagline: 'Elevate Your Style',
        description: 'Personal styling services for the modern professional',
        tone: 'professional',
        voice: ['Confident', 'Approachable', 'Expert'],
      },
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create custom branding
   */
  async createBranding(
    userId: string,
    branding: Partial<CustomBranding>
  ): Promise<CustomBranding> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const defaultColors: BrandColors = {
      primary: '#8b5cf6',
      secondary: '#ec4899',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#0f172a',
      error: '#ef4444',
      success: '#10b981',
      warning: '#f59e0b',
    };

    const defaultFonts: BrandFonts = {
      heading: 'Playfair Display',
      body: 'Inter',
      accent: 'Montserrat',
    };

    const defaultImagery: BrandImagery = {
      iconStyle: 'rounded',
      imageFilter: 'none',
    };

    const defaultMessaging: BrandMessaging = {
      tagline: 'Your Style, Your Way',
      description: 'Professional styling services',
      tone: 'professional',
      voice: ['Professional', 'Friendly'],
    };

    return {
      id: `brand-${Date.now()}`,
      userId,
      businessName: branding.businessName || 'My Style Business',
      logo: branding.logo,
      colors: branding.colors || defaultColors,
      fonts: branding.fonts || defaultFonts,
      imagery: branding.imagery || defaultImagery,
      messaging: branding.messaging || defaultMessaging,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update custom branding
   */
  async updateBranding(
    brandingId: string,
    updates: Partial<CustomBranding>
  ): Promise<CustomBranding> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const current = await this.getUserBranding('mock-user');
    if (!current) {
      throw new Error('Branding not found');
    }

    return {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get branding templates
   */
  async getBrandingTemplates(tier: SubscriptionTier): Promise<BrandingTemplate[]> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const allTemplates: BrandingTemplate[] = [
      {
        id: 'template-1',
        name: 'Modern Minimalist',
        description: 'Clean lines and contemporary aesthetics',
        category: 'minimal',
        previewUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6',
        colors: {
          primary: '#0f172a',
          secondary: '#64748b',
          accent: '#f59e0b',
          background: '#ffffff',
          text: '#0f172a',
          error: '#ef4444',
          success: '#10b981',
          warning: '#f59e0b',
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter',
          accent: 'Inter',
        },
        imagery: {
          iconStyle: 'outlined',
          imageFilter: 'none',
        },
        isPremium: false,
      },
      {
        id: 'template-2',
        name: 'Luxury Elegance',
        description: 'Sophisticated and refined branding',
        category: 'luxury',
        previewUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d',
        colors: {
          primary: '#1e293b',
          secondary: '#d4af37',
          accent: '#c9a961',
          background: '#fafafa',
          text: '#1e293b',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
        },
        fonts: {
          heading: 'Playfair Display',
          body: 'Lora',
          accent: 'Cormorant',
        },
        imagery: {
          iconStyle: 'filled',
          imageFilter: 'none',
        },
        isPremium: true,
      },
      {
        id: 'template-3',
        name: 'Bold & Vibrant',
        description: 'Eye-catching and energetic design',
        category: 'bold',
        previewUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea3c8565',
        colors: {
          primary: '#ec4899',
          secondary: '#8b5cf6',
          accent: '#f59e0b',
          background: '#ffffff',
          text: '#0f172a',
          error: '#ef4444',
          success: '#10b981',
          warning: '#f59e0b',
        },
        fonts: {
          heading: 'Montserrat',
          body: 'Open Sans',
          accent: 'Poppins',
        },
        imagery: {
          iconStyle: 'rounded',
          imageFilter: 'none',
        },
        isPremium: true,
      },
      {
        id: 'template-4',
        name: 'Classic Professional',
        description: 'Timeless and trustworthy aesthetic',
        category: 'classic',
        previewUrl: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf',
        colors: {
          primary: '#1e40af',
          secondary: '#475569',
          accent: '#0ea5e9',
          background: '#ffffff',
          text: '#1e293b',
          error: '#dc2626',
          success: '#059669',
          warning: '#d97706',
        },
        fonts: {
          heading: 'Merriweather',
          body: 'Source Sans Pro',
          accent: 'Roboto',
        },
        imagery: {
          iconStyle: 'sharp',
          imageFilter: 'none',
        },
        isPremium: false,
      },
    ];

    // Filter by tier
    if (tier === 'free') {
      return allTemplates.filter(t => !t.isPremium).slice(0, 2);
    }

    return allTemplates;
  }

  /**
   * Apply template to branding
   */
  async applyTemplate(
    userId: string,
    templateId: string
  ): Promise<CustomBranding> {
    await new Promise(resolve => setTimeout(resolve, 700));

    const templates = await this.getBrandingTemplates('pro');
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    const current = await this.getUserBranding(userId);
    
    return {
      id: current?.id || `brand-${Date.now()}`,
      userId,
      businessName: current?.businessName || 'My Style Business',
      logo: current?.logo,
      colors: template.colors,
      fonts: template.fonts,
      imagery: template.imagery,
      messaging: current?.messaging || {
        tagline: 'Your Style, Your Way',
        description: 'Professional styling services',
        tone: 'professional',
        voice: ['Professional', 'Friendly'],
      },
      isActive: true,
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get branding features by tier
   */
  async getBrandingFeatures(tier: SubscriptionTier): Promise<BrandingFeatures> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const features: Record<SubscriptionTier, BrandingFeatures> = {
      free: {
        tier: 'free',
        features: {
          customLogo: false,
          customColors: false,
          customFonts: false,
          customImagery: false,
          customMessaging: false,
          brandTemplates: true,
          templateCount: 2,
          exportBrandKit: false,
          brandGuidelines: false,
          multipleProfiles: false,
          profileCount: 1,
        },
      },
      premium: {
        tier: 'premium',
        features: {
          customLogo: true,
          customColors: true,
          customFonts: true,
          customImagery: true,
          customMessaging: true,
          brandTemplates: true,
          templateCount: 4,
          exportBrandKit: true,
          brandGuidelines: false,
          multipleProfiles: false,
          profileCount: 1,
        },
      },
      pro: {
        tier: 'pro',
        features: {
          customLogo: true,
          customColors: true,
          customFonts: true,
          customImagery: true,
          customMessaging: true,
          brandTemplates: true,
          templateCount: -1, // unlimited
          exportBrandKit: true,
          brandGuidelines: true,
          multipleProfiles: true,
          profileCount: 5,
        },
      },
    };

    return features[tier];
  }

  /**
   * Export brand kit
   */
  async exportBrandKit(userId: string): Promise<BrandKit> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const branding = await this.getUserBranding(userId);
    if (!branding) {
      throw new Error('No branding found');
    }

    return {
      branding,
      assets: {
        logoVariants: [
          'https://example.com/logo-primary.png',
          'https://example.com/logo-white.png',
          'https://example.com/logo-black.png',
        ],
        colorPalette: Object.values(branding.colors),
        fontFiles: [
          'https://example.com/fonts/heading.woff2',
          'https://example.com/fonts/body.woff2',
        ],
        imageAssets: [
          branding.imagery.heroImage || '',
          branding.imagery.backgroundPattern || '',
        ].filter(Boolean),
      },
      guidelines: {
        logoUsage: 'Use the primary logo on light backgrounds. Maintain minimum clear space of 20px around the logo.',
        colorUsage: 'Primary color for main CTAs and headers. Secondary for supporting elements. Accent for highlights.',
        typography: `Heading: ${branding.fonts.heading}. Body: ${branding.fonts.body}. Use heading font for titles and body font for content.`,
        imagery: 'Use high-quality images that align with the brand tone. Apply consistent filters across all imagery.',
      },
    };
  }

  /**
   * Upload logo
   */
  async uploadLogo(userId: string, logoFile: File): Promise<BrandLogo> {
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock upload
    return {
      url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9',
      width: 200,
      height: 200,
      format: 'png',
    };
  }

  /**
   * Update colors
   */
  async updateColors(
    brandingId: string,
    colors: Partial<BrandColors>
  ): Promise<CustomBranding> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const current = await this.getUserBranding('mock-user');
    if (!current) {
      throw new Error('Branding not found');
    }

    return {
      ...current,
      colors: {
        ...current.colors,
        ...colors,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update fonts
   */
  async updateFonts(
    brandingId: string,
    fonts: Partial<BrandFonts>
  ): Promise<CustomBranding> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const current = await this.getUserBranding('mock-user');
    if (!current) {
      throw new Error('Branding not found');
    }

    return {
      ...current,
      fonts: {
        ...current.fonts,
        ...fonts,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get available fonts
   */
  async getAvailableFonts(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return [
      'Inter',
      'Roboto',
      'Open Sans',
      'Lato',
      'Montserrat',
      'Playfair Display',
      'Merriweather',
      'Lora',
      'Poppins',
      'Source Sans Pro',
      'Raleway',
      'Cormorant',
    ];
  }

  /**
   * Preview branding
   */
  async previewBranding(branding: CustomBranding): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 600));

    // Mock preview URL
    return 'https://example.com/preview/' + branding.id;
  }

  /**
   * Activate branding
   */
  async activateBranding(brandingId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Mock activate
  }

  /**
   * Deactivate branding
   */
  async deactivateBranding(brandingId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Mock deactivate
  }
}

export const customBrandingService = new CustomBrandingService();

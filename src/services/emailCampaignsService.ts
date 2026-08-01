/**
 * Email Campaigns Service
 * 
 * Manages email marketing campaigns and newsletters.
 * Handles campaign creation, scheduling, and analytics.
 */

export type CampaignType = 'newsletter' | 'promotional' | 'transactional' | 'announcement';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed';
export type EmailFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'never';

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  type: CampaignType;
  status: CampaignStatus;
  scheduledFor?: string;
  sentAt?: string;
  recipients: number;
  opened: number;
  clicked: number;
  openRate: number; // percentage
  clickRate: number; // percentage
  template?: string;
  content?: string;
}

export interface EmailSettings {
  userId: string;
  emailAddress: string;
  verified: boolean;
  subscribed: boolean;
  frequency: EmailFrequency;
  categories: {
    newsletter: boolean;
    promotional: boolean;
    transactional: boolean;
    announcement: boolean;
  };
  preferences: {
    htmlEmails: boolean;
    personalizedContent: boolean;
    productRecommendations: boolean;
    styleInsights: boolean;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  thumbnail: string;
  previewUrl?: string;
}

export interface CampaignAnalytics {
  totalCampaigns: number;
  totalSent: number;
  totalRecipients: number;
  avgOpenRate: number; // percentage
  avgClickRate: number; // percentage
  bestPerformingCampaign: string;
  lastCampaign?: string;
}

export interface Subscriber {
  id: string;
  email: string;
  name: string;
  subscribed: boolean;
  subscribedAt: string;
  lastEmailSent?: string;
  totalEmailsReceived: number;
  totalOpened: number;
  totalClicked: number;
}

class EmailCampaignsService {
  /**
   * Get email settings
   */
  async getEmailSettings(userId: string): Promise<EmailSettings> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      userId,
      emailAddress: 'user@example.com',
      verified: true,
      subscribed: true,
      frequency: 'weekly',
      categories: {
        newsletter: true,
        promotional: true,
        transactional: true,
        announcement: true,
      },
      preferences: {
        htmlEmails: true,
        personalizedContent: true,
        productRecommendations: true,
        styleInsights: true,
      },
    };
  }

  /**
   * Update email settings
   */
  async updateEmailSettings(
    userId: string,
    updates: Partial<EmailSettings>
  ): Promise<EmailSettings> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const current = await this.getEmailSettings(userId);
    return { ...current, ...updates };
  }

  /**
   * Get email campaigns
   */
  async getEmailCampaigns(): Promise<EmailCampaign[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
      {
        id: 'campaign-1',
        name: 'Weekly Style Digest',
        subject: 'Your Weekly Fashion Roundup 👗',
        previewText: 'Top outfits, trends, and style tips this week',
        type: 'newsletter',
        status: 'sent',
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        recipients: 12450,
        opened: 8967,
        clicked: 3421,
        openRate: 72.0,
        clickRate: 27.5,
        template: 'newsletter-weekly',
      },
      {
        id: 'campaign-2',
        name: 'Summer Sale 2025',
        subject: '☀️ Summer Sale: Up to 50% Off!',
        previewText: 'Refresh your wardrobe with summer essentials',
        type: 'promotional',
        status: 'sent',
        sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        recipients: 15230,
        opened: 10661,
        clicked: 5339,
        openRate: 70.0,
        clickRate: 35.0,
        template: 'promo-sale',
      },
      {
        id: 'campaign-3',
        name: 'New Feature: Smart Mirror',
        subject: '🪞 Try Our New Virtual Try-On!',
        previewText: 'See how outfits look before you wear them',
        type: 'announcement',
        status: 'sent',
        sentAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        recipients: 18750,
        opened: 13125,
        clicked: 6563,
        openRate: 70.0,
        clickRate: 35.0,
        template: 'announcement-feature',
      },
      {
        id: 'campaign-4',
        name: 'Monthly Style Report',
        subject: '📊 Your Style Analytics for November',
        previewText: 'See your wardrobe insights and trends',
        type: 'newsletter',
        status: 'scheduled',
        scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        recipients: 12450,
        opened: 0,
        clicked: 0,
        openRate: 0,
        clickRate: 0,
        template: 'newsletter-monthly',
      },
      {
        id: 'campaign-5',
        name: 'Black Friday Preview',
        subject: '🛍️ Early Access: Black Friday Deals',
        previewText: 'Get first dibs on our biggest sale of the year',
        type: 'promotional',
        status: 'draft',
        recipients: 0,
        opened: 0,
        clicked: 0,
        openRate: 0,
        clickRate: 0,
      },
    ];
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId: string): Promise<EmailCampaign | null> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const campaigns = await this.getEmailCampaigns();
    return campaigns.find(c => c.id === campaignId) || null;
  }

  /**
   * Get email templates
   */
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return [
      {
        id: 'template-1',
        name: 'Weekly Newsletter',
        description: 'Weekly style digest and outfit highlights',
        type: 'newsletter',
        thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
      },
      {
        id: 'template-2',
        name: 'Monthly Report',
        description: 'Monthly analytics and style insights',
        type: 'newsletter',
        thumbnail: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400',
      },
      {
        id: 'template-3',
        name: 'Sale Promotion',
        description: 'Promotional email for sales and offers',
        type: 'promotional',
        thumbnail: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
      },
      {
        id: 'template-4',
        name: 'New Feature',
        description: 'Announce new features and updates',
        type: 'announcement',
        thumbnail: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
      },
      {
        id: 'template-5',
        name: 'Order Confirmation',
        description: 'Transactional email for orders',
        type: 'transactional',
        thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
      },
    ];
  }

  /**
   * Create campaign
   */
  async createCampaign(
    campaign: Omit<EmailCampaign, 'id' | 'opened' | 'clicked' | 'openRate' | 'clickRate'>
  ): Promise<EmailCampaign> {
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      id: `campaign-${Date.now()}`,
      ...campaign,
      opened: 0,
      clicked: 0,
      openRate: 0,
      clickRate: 0,
    };
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    updates: Partial<EmailCampaign>
  ): Promise<EmailCampaign> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const campaign = await this.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return { ...campaign, ...updates };
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  /**
   * Send campaign
   */
  async sendCampaign(campaignId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  /**
   * Schedule campaign
   */
  async scheduleCampaign(campaignId: string, scheduledFor: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(): Promise<CampaignAnalytics> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return {
      totalCampaigns: 24,
      totalSent: 18,
      totalRecipients: 287450,
      avgOpenRate: 70.7,
      avgClickRate: 32.5,
      bestPerformingCampaign: 'Summer Sale 2025',
      lastCampaign: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Get subscribers
   */
  async getSubscribers(): Promise<Subscriber[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
      {
        id: 'sub-1',
        email: 'sarah@example.com',
        name: 'Sarah Johnson',
        subscribed: true,
        subscribedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        lastEmailSent: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        totalEmailsReceived: 24,
        totalOpened: 18,
        totalClicked: 12,
      },
      {
        id: 'sub-2',
        email: 'mike@example.com',
        name: 'Mike Chen',
        subscribed: true,
        subscribedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        lastEmailSent: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        totalEmailsReceived: 12,
        totalOpened: 10,
        totalClicked: 7,
      },
      {
        id: 'sub-3',
        email: 'emma@example.com',
        name: 'Emma Davis',
        subscribed: false,
        subscribedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        totalEmailsReceived: 8,
        totalOpened: 3,
        totalClicked: 1,
      },
    ];
  }

  /**
   * Subscribe to emails
   */
  async subscribe(userId: string, email: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
  }

  /**
   * Unsubscribe from emails
   */
  async unsubscribe(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string, code: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return true;
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 600));
  }

  /**
   * Test email
   */
  async sendTestEmail(userId: string, campaignId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Get email preview
   */
  async getEmailPreview(campaignId: string): Promise<{
    html: string;
    text: string;
  }> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      html: '<h1>Email Preview</h1><p>This is a preview of your email campaign.</p>',
      text: 'Email Preview\n\nThis is a preview of your email campaign.',
    };
  }

  /**
   * Export subscribers
   */
  async exportSubscribers(): Promise<Blob> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return new Blob(['email,name,subscribed\n'], { type: 'text/csv' });
  }

  /**
   * Import subscribers
   */
  async importSubscribers(file: File): Promise<{
    imported: number;
    failed: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      imported: 150,
      failed: 5,
    };
  }

  /**
   * Get email frequency options
   */
  async getFrequencyOptions(): Promise<{
    value: EmailFrequency;
    label: string;
    description: string;
  }[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    return [
      {
        value: 'daily',
        label: 'Daily',
        description: 'Receive emails every day',
      },
      {
        value: 'weekly',
        label: 'Weekly',
        description: 'Receive emails once a week',
      },
      {
        value: 'biweekly',
        label: 'Bi-weekly',
        description: 'Receive emails every two weeks',
      },
      {
        value: 'monthly',
        label: 'Monthly',
        description: 'Receive emails once a month',
      },
      {
        value: 'never',
        label: 'Never',
        description: 'Unsubscribe from all emails',
      },
    ];
  }
}

export const emailCampaignsService = new EmailCampaignsService();

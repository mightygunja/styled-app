// Navigation type definitions
import { NavigatorScreenParams } from '@react-navigation/native';
import { Occasion, ItemCategory } from '../types';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  LookDetail: { lookId: string };
  PaletteDetail: { paletteId: string };
  AddClosetItem: undefined;
  ItemDetail: { itemId: string };
  ClosetItemDetail: { closetItemId: string };
  SimilarItems: {
    sourceItemId: string;
    /** `reasons` names the facets that matched, strongest first. */
    similarItems: Array<{ item: any; similarity: number; reasons?: string[] }>;
  };
  FilterModal: { occasion?: Occasion };
  StylistList: undefined;
  StylistMarketplace: undefined;
  StylistDetail: { stylistId: string };
  BookingFlow: { stylistId: string };
  VideoCall: { sessionId: string; stylistName: string };
  SessionNotes: { sessionId: string };
  MySessions: undefined;
  BeforeAfterPhotos: { sessionId: string };
  SubmitReview: { sessionId: string; stylistId: string; stylistName: string; sessionType: string };
  PaymentMethods: undefined;
  StylistDashboard: undefined;
  UserProfile: { userId: string };
  EditProfile: undefined;
  Followers: { userId: string };
  Following: { userId: string };
  SocialFeed: undefined;
  /** With challengeId, the published post is also submitted as that challenge's entry. */
  CreatePost: { challengeId?: string } | undefined;
  PostDetail: { postId: string };
  Explore: undefined;
  Notifications: undefined;
  Messages: undefined;
  Chat: { conversationId: string };
  Challenges: undefined;
  ChallengeDetail: { challengeId: string };
  Groups: undefined;
  GroupDetail: { groupId: string };
  EventDetail: { eventId: string };
  StyleAnalysis: undefined;
  SmartRecommendations: undefined;
  StylingAssistant: undefined;
  SmartSearch: undefined;
  TrendInsights: undefined;
  ClosetOrganization: undefined;
  Sustainability: undefined;
  CarbonCalculator: undefined;
  Subscription: undefined;
  Settings: undefined;
  Onboarding: undefined;
  ProfileSurvey: undefined;
  Favorites: undefined;
  SavedOutfits: undefined;
  OutfitBuilder: { sourceItemId?: string };
  OutfitPlanner: undefined;
  PackingList: undefined;
  Resale: undefined;
  TryOn: undefined;
  ReceiptImport: undefined;
  ClosetSharing: undefined;
  Edits: undefined;
  EditDetail: { editId: string };
  EditReview: undefined;
  StylistAvailability: undefined;
  StylistApplication: undefined;
  StylistApplicationsAdmin: undefined;
  Admin: undefined;
  AffiliateAnalytics: undefined;
  TrendDeskAdmin: undefined;
  SmartOutfitBuilder: { sourceItemId?: string } | undefined;
  ClosetAnalytics: undefined;
  Recommendations: undefined;
  StyleProfileBuilder: undefined;
  ColorAnalysis: undefined;
  BodyAnalysis: undefined;
  InStoreCheck: undefined;
  Account: undefined;
  Shop:
    | {
        category?: ItemCategory;
        matchedOnly?: boolean;
        secondhandOnly?: boolean;
        /** Arriving from a trend surface: results filter/rank to this trend. */
        trendId?: string;
        trendName?: string;
        /** The vetted "worth adding" phrase, shown so the user knows what they came for. */
        trendGap?: string;
      }
    | undefined;
  /** `surface` attributes the eventual outbound click to where the product was
   *  found, which is the only way to tell which surface actually earns. */
  ProductDetail: {
    productId: string;
    surface?: 'shop' | 'explore' | 'similar' | 'chat' | 'wishlist';
    reason?: string;
  };
  Wishlist: undefined;
  Intro: undefined;
  Login: undefined;
  Signup: undefined;
  About: undefined;
  Privacy: undefined;
  Terms: undefined;
  GuideCapsule: undefined;
  GuideNothingToWear: undefined;
  GuideCostPerWear: undefined;
  GuideColorSeasons: undefined;
  GuideBodyTypes: undefined;
  GuideWardrobeGaps: undefined;
  GuideWeddingGuest: undefined;
  GuideClosetOrganization: undefined;
  GuideWorkWardrobe: undefined;
  GuideSustainable: undefined;
  GuideWhatsInStyle: undefined;
  GuideWearTrends: undefined;
  GuideTrendBudget: undefined;
  GuideCityStyle: undefined;
  GuideFabric: undefined;

  // ==================== NOT REGISTERED IN AppNavigator ====================
  // Route types kept only so the corresponding screen files (restored from
  // git history, intentionally not wired into navigation) still type-check.
  // None of these are reachable in the running app.
  ShoppingAssistant: undefined;
  ARTryOn: undefined;
  SecondhandMarketplace: undefined;
  AIShoppingChatbot: undefined;
  VoiceCommand: undefined;
  SmartMirror: undefined;
  MLTrendPrediction: undefined;
  PremiumStylist: undefined;
  ExclusiveContent: undefined;
  AdvancedAnalytics: undefined;
  PriorityBooking: undefined;
  AdFreeExperience: undefined;
  CustomBranding: undefined;
  WhiteLabel: undefined;
  LanguageSettings: undefined;
  AccessibilitySettings: undefined;
  OfflineMode: undefined;
  AppleWatch: undefined;
  Widgets: undefined;
  SiriShortcuts: undefined;
  PushNotifications: undefined;
  EmailCampaigns: undefined;
  QuickAccess: undefined;
  FeedPreferences: undefined;
  ColorPalette: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Closet: undefined;
  StyleProfile: undefined;
  StylistChat: undefined;
  More: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

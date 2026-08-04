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
    similarItems: Array<{ item: any; similarity: number }>;
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
  CreatePost: undefined;
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
  Favorites: undefined;
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
  SmartOutfitBuilder: undefined;
  ClosetAnalytics: undefined;
  Recommendations: undefined;
  StyleProfileBuilder: undefined;
  ColorAnalysis: undefined;
  BodyAnalysis: undefined;
  InStoreCheck: undefined;
  Account: undefined;
  Shop: { category?: ItemCategory; matchedOnly?: boolean; secondhandOnly?: boolean } | undefined;
  ProductDetail: { productId: string };
  Wishlist: undefined;
  Login: undefined;
  Signup: undefined;

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

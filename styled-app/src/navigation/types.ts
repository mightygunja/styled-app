// Navigation type definitions
import { NavigatorScreenParams } from '@react-navigation/native';
import { Occasion } from '../types';

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
  FeedPreferences: undefined;
  SmartSearch: undefined;
  TrendInsights: undefined;
  ShoppingAssistant: undefined;
  ColorPalette: undefined;
  ClosetOrganization: undefined;
  ARTryOn: undefined;
  Sustainability: undefined;
  CarbonCalculator: undefined;
  SecondhandMarketplace: undefined;
  AIShoppingChatbot: undefined;
  VoiceCommand: undefined;
  SmartMirror: undefined;
  MLTrendPrediction: undefined;
  Subscription: undefined;
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
  Profile: undefined;
  Settings: undefined;
  Onboarding: undefined;
  Favorites: undefined;
  OutfitBuilder: { sourceItemId?: string };
  OutfitPlanner: undefined;
  SmartOutfitBuilder: undefined;
  ClosetAnalytics: undefined;
  Recommendations: undefined;
  StyleProfileBuilder: undefined;
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Closet: undefined;
  Shopping: undefined;
  StylingAssistant: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

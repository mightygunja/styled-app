import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from './types';

// Placeholder screens - will be implemented later
import HomeScreen from '../screens/HomeScreen';
import WorkScreen from '../screens/WorkScreen';
import GoingOutScreen from '../screens/GoingOutScreen';
import ClosetScreen from '../screens/ClosetScreen';
import MoreScreen from '../screens/MoreScreen';
import LookDetailScreen from '../screens/LookDetailScreen';
import PaletteDetailScreen from '../screens/PaletteDetailScreen';
import AddClosetItemScreen from '../screens/AddClosetItemScreen';
import ClosetItemDetailScreen from '../screens/ClosetItemDetailScreen';
import SimilarItemsScreen from '../screens/SimilarItemsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import OutfitBuilderScreen from '../screens/OutfitBuilderScreen';
import OutfitPlannerScreen from '../screens/OutfitPlannerScreen';
import SmartOutfitBuilderScreen from '../screens/SmartOutfitBuilderScreen';
import ClosetAnalyticsScreen from '../screens/ClosetAnalyticsScreen';
import StylistMarketplaceScreen from '../screens/StylistMarketplaceScreen';
import StylistDetailScreen from '../screens/StylistDetailScreen';
import VideoCallScreen from '../screens/VideoCallScreen';
import SessionNotesScreen from '../screens/SessionNotesScreen';
import MySessionsScreen from '../screens/MySessionsScreen';
import BeforeAfterPhotosScreen from '../screens/BeforeAfterPhotosScreen';
import SubmitReviewScreen from '../screens/SubmitReviewScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import StylistDashboardScreen from '../screens/StylistDashboardScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import FollowersScreen from '../screens/FollowersScreen';
import FollowingScreen from '../screens/FollowingScreen';
import SocialFeedScreen from '../screens/SocialFeedScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import GroupsScreen from '../screens/GroupsScreen';
import StyleAnalysisScreen from '../screens/StyleAnalysisScreen';
import SmartRecommendationsScreen from '../screens/SmartRecommendationsScreen';
import StylingAssistantScreen from '../screens/StylingAssistantScreen';
import FeedPreferencesScreen from '../screens/FeedPreferencesScreen';
import SmartSearchScreen from '../screens/SmartSearchScreen';
import TrendInsightsScreen from '../screens/TrendInsightsScreen';
import ShoppingAssistantScreen from '../screens/ShoppingAssistantScreen';
import ClosetOrganizationScreen from '../screens/ClosetOrganizationScreen';
import ARTryOnScreen from '../screens/ARTryOnScreen';
import SustainabilityScreen from '../screens/SustainabilityScreen';
import CarbonCalculatorScreen from '../screens/CarbonCalculatorScreen';
import SecondhandMarketplaceScreen from '../screens/SecondhandMarketplaceScreen';
import AIShoppingChatbotScreen from '../screens/AIShoppingChatbotScreen';
import VoiceCommandScreen from '../screens/VoiceCommandScreen';
import SmartMirrorScreen from '../screens/SmartMirrorScreen';
import MLTrendPredictionScreen from '../screens/MLTrendPredictionScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import PremiumStylistScreen from '../screens/PremiumStylistScreen';
import ExclusiveContentScreen from '../screens/ExclusiveContentScreen';
import AdvancedAnalyticsScreen from '../screens/AdvancedAnalyticsScreen';
import PriorityBookingScreen from '../screens/PriorityBookingScreen';
import AdFreeExperienceScreen from '../screens/AdFreeExperienceScreen';
import CustomBrandingScreen from '../screens/CustomBrandingScreen';
import WhiteLabelScreen from '../screens/WhiteLabelScreen';
import LanguageSettingsScreen from '../screens/LanguageSettingsScreen';
import AccessibilitySettingsScreen from '../screens/AccessibilitySettingsScreen';
import OfflineModeScreen from '../screens/OfflineModeScreen';
import AppleWatchScreen from '../screens/AppleWatchScreen';
import WidgetScreen from '../screens/WidgetScreen';
import SiriShortcutsScreen from '../screens/SiriShortcutsScreen';
import PushNotificationsScreen from '../screens/PushNotificationsScreen';
import EmailCampaignsScreen from '../screens/EmailCampaignsScreen';
import QuickAccessScreen from '../screens/QuickAccessScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import ColorPaletteScreen from '../screens/ColorPaletteScreen';
import StyleProfileBuilderScreen from '../screens/StyleProfileBuilderScreen';
import StyleDNAScreen from '../screens/StyleDNAScreen';
import AccountScreen from '../screens/AccountScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme/designSystem';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const screenOptions = {
    headerShown: false,
    tabBarActiveTintColor: colors.ink,
    tabBarInactiveTintColor: colors.tobacco,
    tabBarStyle: {
      borderTopWidth: 1,
      borderTopColor: colors.hair,
      paddingTop: 8,
      paddingBottom: 20,
      height: 85,
      backgroundColor: colors.bone,
    },
    tabBarLabelStyle: {
      fontSize: 10,
      fontFamily: fonts.sansMedium,
      letterSpacing: 0.6,
      marginTop: 4,
    },
    tabBarIconStyle: {
      marginTop: 4,
    },
  };

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, color, fontWeight: focused ? '400' : '300' }}>⌂</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Closet"
        component={ClosetScreen}
        options={{
          tabBarLabel: 'Closet',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, color, fontWeight: focused ? '400' : '300' }}>⊞</Text>
          ),
        }}
      />
      <Tab.Screen
        name="StyleDNA"
        component={StyleDNAScreen}
        options={{
          tabBarLabel: 'Style',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, color, fontWeight: focused ? '400' : '300' }}>✦</Text>
          ),
        }}
      />
      <Tab.Screen
        name="StylistChat"
        component={StylingAssistantScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, color, fontWeight: focused ? '400' : '300' }}>◐</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 22, color, fontWeight: focused ? '400' : '300' }}>◉</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// TESTFLIGHT DEMO BUILD: bypasses the login gate so every install lands straight in
// the seeded mock-user-123 account. Also see DEV_FORCE_USER_ID in firebaseApi.ts and
// devSkipAuthChecks() in firestore.rules - all three must move together. Revert all
// three (and redeploy firestore.rules) before any build meant for real users.
const DEV_SKIP_AUTH = true;

export default function AppNavigator() {
  const { user, loading, isNewUser } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bone }}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 300,
        }}
      >
        {user && isNewUser ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : user || DEV_SKIP_AUTH ? (
          // Authenticated screens
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="LookDetail" component={LookDetailScreen} />
        <Stack.Screen name="PaletteDetail" component={PaletteDetailScreen} />
        <Stack.Screen 
          name="AddClosetItem" 
          component={AddClosetItemScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen 
          name="ClosetItemDetail" 
          component={ClosetItemDetailScreen}
        />
        <Stack.Screen 
          name="SimilarItems" 
          component={SimilarItemsScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen 
          name="Favorites" 
          component={FavoritesScreen}
        />
        <Stack.Screen 
          name="OutfitBuilder" 
          component={OutfitBuilderScreen}
        />
        <Stack.Screen 
          name="OutfitPlanner" 
          component={OutfitPlannerScreen}
        />
        <Stack.Screen 
          name="SmartOutfitBuilder" 
          component={SmartOutfitBuilderScreen}
        />
        <Stack.Screen 
          name="ClosetAnalytics" 
          component={ClosetAnalyticsScreen}
        />
        <Stack.Screen 
          name="StylistMarketplace" 
          component={StylistMarketplaceScreen}
        />
        <Stack.Screen 
          name="StylistDetail" 
          component={StylistDetailScreen}
        />
        <Stack.Screen 
          name="VideoCall" 
          component={VideoCallScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="SessionNotes" 
          component={SessionNotesScreen}
        />
        <Stack.Screen 
          name="MySessions" 
          component={MySessionsScreen}
        />
        <Stack.Screen 
          name="BeforeAfterPhotos" 
          component={BeforeAfterPhotosScreen}
        />
        <Stack.Screen 
          name="SubmitReview" 
          component={SubmitReviewScreen}
        />
        <Stack.Screen 
          name="PaymentMethods" 
          component={PaymentMethodsScreen}
        />
        <Stack.Screen 
          name="StylistDashboard" 
          component={StylistDashboardScreen}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
        />
        <Stack.Screen
          name="Followers"
          component={FollowersScreen}
        />
        <Stack.Screen
          name="Following"
          component={FollowingScreen}
        />
        <Stack.Screen
          name="SocialFeed"
          component={SocialFeedScreen}
        />
        <Stack.Screen 
          name="CreatePost" 
          component={CreatePostScreen}
        />
        <Stack.Screen 
          name="PostDetail" 
          component={PostDetailScreen}
        />
        <Stack.Screen 
          name="Explore" 
          component={ExploreScreen}
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationsScreen}
        />
        <Stack.Screen 
          name="Messages" 
          component={MessagesScreen}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
        />
        <Stack.Screen 
          name="Challenges" 
          component={ChallengesScreen}
        />
        <Stack.Screen 
          name="ChallengeDetail" 
          component={ChallengeDetailScreen}
        />
        <Stack.Screen 
          name="Groups" 
          component={GroupsScreen}
        />
        <Stack.Screen 
          name="StyleAnalysis" 
          component={StyleAnalysisScreen}
        />
        <Stack.Screen 
          name="SmartRecommendations" 
          component={SmartRecommendationsScreen}
        />
        <Stack.Screen 
          name="StylingAssistant" 
          component={StylingAssistantScreen}
        />
        <Stack.Screen 
          name="FeedPreferences" 
          component={FeedPreferencesScreen}
        />
        <Stack.Screen 
          name="SmartSearch" 
          component={SmartSearchScreen}
        />
        <Stack.Screen 
          name="TrendInsights" 
          component={TrendInsightsScreen}
        />
        <Stack.Screen 
          name="ShoppingAssistant" 
          component={ShoppingAssistantScreen}
        />
        <Stack.Screen 
          name="ColorPalette" 
          component={ColorPaletteScreen}
        />
        <Stack.Screen 
          name="ClosetOrganization" 
          component={ClosetOrganizationScreen}
        />
        <Stack.Screen 
          name="ARTryOn" 
          component={ARTryOnScreen}
        />
        <Stack.Screen 
          name="Sustainability" 
          component={SustainabilityScreen}
        />
        <Stack.Screen 
          name="CarbonCalculator" 
          component={CarbonCalculatorScreen}
        />
        <Stack.Screen 
          name="SecondhandMarketplace" 
          component={SecondhandMarketplaceScreen}
        />
        <Stack.Screen 
          name="AIShoppingChatbot" 
          component={AIShoppingChatbotScreen}
        />
        <Stack.Screen 
          name="VoiceCommand" 
          component={VoiceCommandScreen}
        />
        <Stack.Screen 
          name="SmartMirror" 
          component={SmartMirrorScreen}
        />
        <Stack.Screen 
          name="MLTrendPrediction" 
          component={MLTrendPredictionScreen}
        />
        <Stack.Screen 
          name="Subscription" 
          component={SubscriptionScreen}
        />
        <Stack.Screen 
          name="PremiumStylist" 
          component={PremiumStylistScreen}
        />
        <Stack.Screen 
          name="ExclusiveContent" 
          component={ExclusiveContentScreen}
        />
        <Stack.Screen 
          name="AdvancedAnalytics" 
          component={AdvancedAnalyticsScreen}
        />
        <Stack.Screen 
          name="PriorityBooking" 
          component={PriorityBookingScreen}
        />
        <Stack.Screen 
          name="AdFreeExperience" 
          component={AdFreeExperienceScreen}
        />
        <Stack.Screen 
          name="CustomBranding" 
          component={CustomBrandingScreen}
        />
        <Stack.Screen 
          name="WhiteLabel" 
          component={WhiteLabelScreen}
        />
        <Stack.Screen 
          name="LanguageSettings" 
          component={LanguageSettingsScreen}
        />
        <Stack.Screen 
          name="AccessibilitySettings" 
          component={AccessibilitySettingsScreen}
        />
        <Stack.Screen 
          name="OfflineMode" 
          component={OfflineModeScreen}
        />
        <Stack.Screen 
          name="AppleWatch" 
          component={AppleWatchScreen}
        />
        <Stack.Screen 
          name="Widgets" 
          component={WidgetScreen}
        />
        <Stack.Screen 
          name="SiriShortcuts" 
          component={SiriShortcutsScreen}
        />
        <Stack.Screen 
          name="PushNotifications" 
          component={PushNotificationsScreen}
        />
        <Stack.Screen 
          name="EmailCampaigns" 
          component={EmailCampaignsScreen}
        />
        <Stack.Screen 
          name="QuickAccess" 
          component={QuickAccessScreen}
        />
        <Stack.Screen 
          name="Recommendations" 
          component={RecommendationsScreen}
        />
        <Stack.Screen 
          name="StyleProfileBuilder" 
          component={StyleProfileBuilderScreen}
        />
          </>
        ) : (
          // Unauthenticated screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

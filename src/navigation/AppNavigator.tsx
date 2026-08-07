import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from './types';

import HomeScreen from '../screens/HomeScreen';
import ClosetScreen from '../screens/ClosetScreen';
import LookDetailScreen from '../screens/LookDetailScreen';
import PaletteDetailScreen from '../screens/PaletteDetailScreen';
import AddClosetItemScreen from '../screens/AddClosetItemScreen';
import ClosetItemDetailScreen from '../screens/ClosetItemDetailScreen';
import SimilarItemsScreen from '../screens/SimilarItemsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import OutfitBuilderScreen from '../screens/OutfitBuilderScreen';
import OutfitPlannerScreen from '../screens/OutfitPlannerScreen';
import PackingListScreen from '../screens/PackingListScreen';
import ResaleScreen from '../screens/ResaleScreen';
import TryOnScreen from '../screens/TryOnScreen';
import ReceiptImportScreen from '../screens/ReceiptImportScreen';
import ClosetSharingScreen from '../screens/ClosetSharingScreen';
import EditsScreen from '../screens/EditsScreen';
import EditDetailScreen from '../screens/EditDetailScreen';
import EditReviewScreen from '../screens/EditReviewScreen';
import StylistAvailabilityScreen from '../screens/StylistAvailabilityScreen';
import StylistApplicationScreen from '../screens/StylistApplicationScreen';
import StylistApplicationsAdminScreen from '../screens/StylistApplicationsAdminScreen';
import AdminScreen from '../screens/AdminScreen';
import AffiliateAnalyticsScreen from '../screens/AffiliateAnalyticsScreen';
import SmartOutfitBuilderScreen from '../screens/SmartOutfitBuilderScreen';
import ClosetAnalyticsScreen from '../screens/ClosetAnalyticsScreen';
import StylistMarketplaceScreen from '../screens/StylistMarketplaceScreen';
import StylistDetailScreen from '../screens/StylistDetailScreen';
import VideoCallScreen from '../screens/VideoCallScreen';
import SessionNotesScreen from '../screens/SessionNotesScreen';
import MySessionsScreen from '../screens/MySessionsScreen';
import BeforeAfterPhotosScreen from '../screens/BeforeAfterPhotosScreen';
import SubmitReviewScreen from '../screens/SubmitReviewScreen';
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
import GroupDetailScreen from '../screens/GroupDetailScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import StyleAnalysisScreen from '../screens/StyleAnalysisScreen';
import SmartRecommendationsScreen from '../screens/SmartRecommendationsScreen';
import StylingAssistantScreen from '../screens/StylingAssistantScreen';
import SmartSearchScreen from '../screens/SmartSearchScreen';
import TrendInsightsScreen from '../screens/TrendInsightsScreen';
import ClosetOrganizationScreen from '../screens/ClosetOrganizationScreen';
import SustainabilityScreen from '../screens/SustainabilityScreen';
import CarbonCalculatorScreen from '../screens/CarbonCalculatorScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MoreScreen from '../screens/MoreScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import StyleProfileBuilderScreen from '../screens/StyleProfileBuilderScreen';
import ColorAnalysisScreen from '../screens/ColorAnalysisScreen';
import BodyAnalysisScreen from '../screens/BodyAnalysisScreen';
import InStoreCheckScreen from '../screens/InStoreCheckScreen';
import ShopScreen from '../screens/ShopScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import WishlistScreen from '../screens/WishlistScreen';
import StyleProfileScreen from '../screens/StyleProfileScreen';
import AccountScreen from '../screens/AccountScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/designSystem';
import FloatingTabBar from './FloatingTabBar';
import { useIsDesktopWeb } from '../theme/responsive';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Desktop web content widths, per surface. Grids earn the full width;
 * column screens get a reading width so a phone-first layout never
 * stretches across a monitor. Native and mobile web are untouched.
 */
const TAB_CONTENT_WIDTH: Record<string, number> = {
  Home: 760,
  Closet: 1240,
  StyleProfile: 800,
  StylistChat: 860,
  More: 800,
};

const STACK_CONTENT_WIDTH: Record<string, number> = {
  Shop: 1240,
  Explore: 1240,
  Wishlist: 1240,
  Signup: 560,
  Onboarding: 640,
  ProfileSurvey: 640,
  SocialFeed: 720,
  PostDetail: 720,
};

const STACK_CONTENT_DEFAULT = 880;

function ContentFrame({ maxWidth, children }: { maxWidth: number; children: React.ReactNode }) {
  const isDesktop = useIsDesktopWeb();
  const frameRef = React.useRef<View>(null);

  // The screen scrolls inside the centred column, so a wheel over the side
  // gutters would hit dead space. Forward those wheel events to the first
  // scrollable descendant — the whole window then behaves like one page.
  React.useEffect(() => {
    if (!isDesktop) return;
    const node = frameRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;

    const findScroller = (): HTMLElement | null => {
      for (const el of Array.from(node.querySelectorAll<HTMLElement>('*'))) {
        const overflowY = getComputedStyle(el).overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
          return el;
        }
      }
      return null;
    };

    const onWheel = (event: WheelEvent) => {
      const scroller = findScroller();
      if (!scroller) return;
      // Inside the column the browser already handles it natively.
      if (scroller.contains(event.target as Node)) return;
      scroller.scrollTop += event.deltaY;
      event.preventDefault();
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [isDesktop]);

  if (!isDesktop) return <>{children}</>;
  return (
    <View ref={frameRef} style={{ flex: 1, backgroundColor: colors.bone, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth }}>{children}</View>
    </View>
  );
}

function MainTabs() {
  const isDesktop = useIsDesktopWeb();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // On desktop the bar is a site header, so the navigator must lay
        // content out below it rather than above it.
        tabBarPosition: isDesktop ? 'top' : 'bottom',
      }}
      screenLayout={({ route, children }) => (
        <ContentFrame maxWidth={TAB_CONTENT_WIDTH[route.name] ?? STACK_CONTENT_DEFAULT}>
          {children}
        </ContentFrame>
      )}
      tabBar={props => <FloatingTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Closet" component={ClosetScreen} options={{ tabBarLabel: 'Closet' }} />
      <Tab.Screen name="StyleProfile" component={StyleProfileScreen} options={{ tabBarLabel: 'Style' }} />
      <Tab.Screen name="StylistChat" component={StylingAssistantScreen} options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: 'More' }} />
    </Tab.Navigator>
  );
}

// Set true only for local testing to bypass the login gate. Must stay false in
// anything committed/shipped - also see DEV_FORCE_USER_ID in firebaseApi.ts and
// devSkipAuthChecks() in firestore.rules, which need to be reverted together.
const DEV_SKIP_AUTH = false;

/**
 * URL map for the web build (harmless on native, where it also powers deep
 * links via the app scheme). Paths follow the content, not the code: the
 * browser bar reads /closet/item/abc123, back and forward work, and any URL
 * cold-loads into the right screen because web output is a single page.
 *
 * Screens without an entry still navigate normally - they just get a
 * generated URL instead of a designed one.
 */
const linking = {
  prefixes: [],
  config: {
    screens: {
      MainTabs: {
        path: '',
        screens: {
          Home: '',
          Closet: 'closet',
          StyleProfile: 'style',
          StylistChat: 'stylist',
          More: 'more',
        },
      },
      Login: 'login',
      Signup: 'signup',
      Onboarding: 'welcome',
      ProfileSurvey: 'survey',
      Shop: 'shop',
      ProductDetail: 'product/:productId',
      Wishlist: 'saved',
      Explore: 'explore',
      SocialFeed: 'feed',
      CreatePost: 'feed/new',
      PostDetail: 'post/:postId',
      UserProfile: 'profile/:userId',
      Followers: 'profile/:userId/followers',
      Following: 'profile/:userId/following',
      Messages: 'messages',
      Chat: 'messages/:conversationId',
      Notifications: 'notifications',
      Challenges: 'challenges',
      ChallengeDetail: 'challenges/:challengeId',
      Groups: 'groups',
      GroupDetail: 'groups/:groupId',
      EventDetail: 'events/:eventId',
      AddClosetItem: 'closet/add',
      ClosetItemDetail: 'closet/item/:closetItemId',
      SimilarItems: 'closet/similar',
      OutfitBuilder: 'outfits/new',
      OutfitPlanner: 'planner',
      PackingList: 'packing',
      SmartSearch: 'search',
      Favorites: 'favorites',
      StyleProfileBuilder: 'style/edit',
      ColorAnalysis: 'style/colors',
      BodyAnalysis: 'style/body',
      InStoreCheck: 'check',
      TrendInsights: 'trends',
      Edits: 'edits',
      EditDetail: 'edits/:editId',
      Sustainability: 'sustainability',
      CarbonCalculator: 'carbon',
      Resale: 'resale',
      StylistMarketplace: 'stylists',
      StylistDetail: 'stylists/:stylistId',
      MySessions: 'sessions',
      Account: 'account',
      Admin: 'admin',
      AffiliateAnalytics: 'admin/affiliate',
      StylistApplicationsAdmin: 'admin/stylists',
      StylistApplication: 'apply',
    },
  },
};

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
    <NavigationContainer
      linking={linking}
      documentTitle={{
        formatter: (options, route) => {
          const label = (options?.title as string) || route?.name || '';
          return label && label !== 'MainTabs' ? `${label} · 33 Trends` : '33 Trends';
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 300,
        }}
        screenLayout={({ route, children }) => {
          // MainTabs frames its own screens (the top bar must span the full
          // window); Login owns a split-pane landing layout on desktop.
          if (route.name === 'MainTabs' || route.name === 'Login') return <>{children}</>;
          return (
            <ContentFrame maxWidth={STACK_CONTENT_WIDTH[route.name] ?? STACK_CONTENT_DEFAULT}>
              {children}
            </ContentFrame>
          );
        }}
      >
        {user && isNewUser ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : user || DEV_SKIP_AUTH ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            {/* Also reachable from inside the app, so existing accounts that
                predate the survey can take it from the Home prompt. The
                isNewUser branch above still owns the first-run flow. Named
                differently from that branch's "Onboarding" on purpose: if both
                branches used the same route name, finishing first-run would
                leave the user parked on this screen (React Navigation keeps
                the current route when its name survives the config swap)
                instead of resetting to MainTabs. */}
            <Stack.Screen
              name="ProfileSurvey"
              component={OnboardingScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="LookDetail" component={LookDetailScreen} />
            <Stack.Screen name="PaletteDetail" component={PaletteDetailScreen} />
            <Stack.Screen name="AddClosetItem" component={AddClosetItemScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="ClosetItemDetail" component={ClosetItemDetailScreen} />
            <Stack.Screen name="SimilarItems" component={SimilarItemsScreen} options={{ presentation: 'card' }} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="OutfitBuilder" component={OutfitBuilderScreen} />
            <Stack.Screen name="OutfitPlanner" component={OutfitPlannerScreen} />
            <Stack.Screen name="PackingList" component={PackingListScreen} />
            <Stack.Screen name="Resale" component={ResaleScreen} />
            <Stack.Screen name="TryOn" component={TryOnScreen} />
            <Stack.Screen name="ReceiptImport" component={ReceiptImportScreen} />
            <Stack.Screen name="ClosetSharing" component={ClosetSharingScreen} />
            <Stack.Screen name="Edits" component={EditsScreen} />
            <Stack.Screen name="EditDetail" component={EditDetailScreen} />
            <Stack.Screen name="EditReview" component={EditReviewScreen} />
            <Stack.Screen name="StylistAvailability" component={StylistAvailabilityScreen} />
            <Stack.Screen name="StylistApplication" component={StylistApplicationScreen} />
            <Stack.Screen name="StylistApplicationsAdmin" component={StylistApplicationsAdminScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="AffiliateAnalytics" component={AffiliateAnalyticsScreen} />
            <Stack.Screen name="SmartOutfitBuilder" component={SmartOutfitBuilderScreen} />
            <Stack.Screen name="ClosetAnalytics" component={ClosetAnalyticsScreen} />
            <Stack.Screen name="StylistMarketplace" component={StylistMarketplaceScreen} />
            <Stack.Screen name="StylistDetail" component={StylistDetailScreen} />
            <Stack.Screen name="VideoCall" component={VideoCallScreen} />
            <Stack.Screen name="SessionNotes" component={SessionNotesScreen} />
            <Stack.Screen name="MySessions" component={MySessionsScreen} />
            <Stack.Screen name="BeforeAfterPhotos" component={BeforeAfterPhotosScreen} />
            <Stack.Screen name="SubmitReview" component={SubmitReviewScreen} />
            <Stack.Screen name="StylistDashboard" component={StylistDashboardScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Followers" component={FollowersScreen} />
            <Stack.Screen name="Following" component={FollowingScreen} />
            <Stack.Screen name="SocialFeed" component={SocialFeedScreen} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="Explore" component={ExploreScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Messages" component={MessagesScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Challenges" component={ChallengesScreen} />
            <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
            <Stack.Screen name="Groups" component={GroupsScreen} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="StyleAnalysis" component={StyleAnalysisScreen} />
            <Stack.Screen name="SmartRecommendations" component={SmartRecommendationsScreen} />
            <Stack.Screen name="StylingAssistant" component={StylingAssistantScreen} />
            <Stack.Screen name="SmartSearch" component={SmartSearchScreen} />
            <Stack.Screen name="TrendInsights" component={TrendInsightsScreen} />
            <Stack.Screen name="ClosetOrganization" component={ClosetOrganizationScreen} />
            <Stack.Screen name="Sustainability" component={SustainabilityScreen} />
            <Stack.Screen name="CarbonCalculator" component={CarbonCalculatorScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
            <Stack.Screen name="StyleProfileBuilder" component={StyleProfileBuilderScreen} />
            <Stack.Screen name="ColorAnalysis" component={ColorAnalysisScreen} />
            <Stack.Screen name="BodyAnalysis" component={BodyAnalysisScreen} />
            <Stack.Screen name="InStoreCheck" component={InStoreCheckScreen} />
            <Stack.Screen name="Account" component={AccountScreen} />
            <Stack.Screen name="Shop" component={ShopScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="Wishlist" component={WishlistScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

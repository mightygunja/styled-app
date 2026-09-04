import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentUserName, getCurrentUserEmail } from '../utils/auth';
import { colors, fonts, radius } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Restored from git history for reference / possible future revival - not
// registered in AppNavigator. The functioning replacement is MoreScreen.tsx.
export default function LegacyMoreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    { id: '0', title: 'My Favorites', subtitle: 'View saved looks', action: () => navigation.navigate('Favorites') },
    { id: '1', title: 'Style Analysis', subtitle: 'AI-powered style insights', action: () => navigation.navigate('StyleAnalysis') },
    { id: '2', title: 'Smart Recommendations', subtitle: 'AI outfit suggestions', action: () => navigation.navigate('SmartRecommendations') },
    { id: '3', title: 'Styling Assistant', subtitle: 'Chat with AI stylist', action: () => navigation.navigate('StylingAssistant') },
    { id: '4', title: 'Smart Search', subtitle: 'AI-powered discovery', action: () => navigation.navigate('SmartSearch') },
    { id: '5', title: 'Trend Insights', subtitle: 'Fashion predictions & analysis', action: () => navigation.navigate('TrendInsights') },
    { id: '6', title: 'Shopping Assistant', subtitle: 'Personalized shopping guide', action: () => navigation.navigate('ShoppingAssistant') },
    { id: '7', title: 'Closet Organization', subtitle: 'AI-powered organization', action: () => navigation.navigate('ClosetOrganization') },
    { id: '8', title: 'AR Try-On', subtitle: 'Virtual fitting room', action: () => navigation.navigate('ARTryOn') },
    { id: '9', title: 'Sustainability', subtitle: 'Track environmental impact', action: () => navigation.navigate('Sustainability') },
    { id: '10', title: 'Carbon Calculator', subtitle: 'Calculate fashion footprint', action: () => navigation.navigate('CarbonCalculator') },
    { id: '11', title: 'Secondhand Marketplace', subtitle: 'Shop pre-owned fashion', action: () => navigation.navigate('SecondhandMarketplace') },
    { id: '12', title: 'AI Shopping Chatbot', subtitle: 'Chat with AI assistant', action: () => navigation.navigate('AIShoppingChatbot') },
    { id: '13', title: 'Voice Commands', subtitle: 'Hands-free browsing', action: () => navigation.navigate('VoiceCommand') },
    { id: '14', title: 'Smart Mirror', subtitle: 'Virtual try-on mirror', action: () => navigation.navigate('SmartMirror') },
    { id: '15', title: 'ML Trend Predictions', subtitle: 'AI-powered trend forecasts', action: () => navigation.navigate('MLTrendPrediction') },
    { id: '16', title: 'Subscription', subtitle: 'Manage your plan', action: () => navigation.navigate('Subscription') },
    { id: '17', title: 'Premium Stylists', subtitle: 'Book exclusive stylists', action: () => navigation.navigate('PremiumStylist') },
    { id: '18', title: 'Exclusive Content', subtitle: 'Members-only looks & reports', action: () => navigation.navigate('ExclusiveContent') },
    { id: '19', title: 'Advanced Analytics', subtitle: 'Detailed wardrobe insights', action: () => navigation.navigate('AdvancedAnalytics') },
    { id: '20', title: 'Priority Booking', subtitle: 'Early access to slots', action: () => navigation.navigate('PriorityBooking') },
    { id: '21', title: 'Ad-Free Experience', subtitle: 'Remove all ads', action: () => navigation.navigate('AdFreeExperience') },
    { id: '22', title: 'Custom Branding', subtitle: 'Personalize your brand', action: () => navigation.navigate('CustomBranding') },
    { id: '23', title: 'White-Label', subtitle: 'Enterprise solutions', action: () => navigation.navigate('WhiteLabel') },
    { id: '24', title: 'Language & Region', subtitle: 'Multi-language support', action: () => navigation.navigate('LanguageSettings') },
    { id: '25', title: 'Accessibility', subtitle: 'Inclusive design features', action: () => navigation.navigate('AccessibilitySettings') },
    { id: '26', title: 'Offline Mode', subtitle: 'Access without internet', action: () => navigation.navigate('OfflineMode') },
    { id: '27', title: 'Apple Watch', subtitle: 'Companion watch app', action: () => navigation.navigate('AppleWatch') },
    { id: '28', title: 'Widgets', subtitle: 'Home screen widgets', action: () => navigation.navigate('Widgets') },
    { id: '29', title: 'Siri Shortcuts', subtitle: 'Voice commands', action: () => navigation.navigate('SiriShortcuts') },
    { id: '30', title: 'Push Notifications', subtitle: 'Manage notifications', action: () => navigation.navigate('PushNotifications') },
    { id: '31', title: 'Email Campaigns', subtitle: 'Email preferences', action: () => navigation.navigate('EmailCampaigns') },
    { id: '32', title: 'Quick Access', subtitle: 'Customize home screen', action: () => navigation.navigate('QuickAccess') },
    { id: '33', title: 'For You', subtitle: 'Personalized recommendations', action: () => navigation.navigate('Recommendations') },
    { id: '34', title: 'Feed Preferences', subtitle: 'Customize your feed', action: () => navigation.navigate('FeedPreferences') },
    { id: '35', title: 'Social Feed', subtitle: 'See what others are wearing', action: () => navigation.navigate('SocialFeed') },
    { id: '36', title: 'Explore', subtitle: 'Discover trending styles', action: () => navigation.navigate('Explore') },
    { id: '37', title: 'Challenges', subtitle: 'Join style challenges', action: () => navigation.navigate('Challenges') },
    { id: '38', title: 'Groups & Events', subtitle: 'Connect with community', action: () => navigation.navigate('Groups') },
    { id: '39', title: 'Notifications', subtitle: 'View your activity', action: () => navigation.navigate('Notifications') },
    { id: '40', title: 'Messages', subtitle: 'Chat with others', action: () => navigation.navigate('Messages') },
    { id: '41', title: 'My Profile', subtitle: 'View your profile', action: () => navigation.navigate('UserProfile', { userId: 'current-user' }) },
    { id: '42', title: 'Outfit Planner', subtitle: 'Schedule your outfits', action: () => navigation.navigate('OutfitPlanner') },
    { id: '43', title: 'My Sessions', subtitle: 'View styling sessions', action: () => navigation.navigate('MySessions') },
    { id: '44', title: 'Book a Stylist', subtitle: 'Get personalized styling', action: () => navigation.navigate('StylistMarketplace') },
    { id: '45', title: 'Payment Methods', subtitle: 'Manage cards & transactions', action: () => navigation.navigate('PaymentMethods') },
    { id: '46', title: 'Stylist Dashboard', subtitle: 'For stylists only', action: () => navigation.navigate('StylistDashboard') },
    { id: '47', title: 'Profile', subtitle: 'Manage your account', action: () => {} },
    { id: '48', title: 'Settings', subtitle: 'App preferences', action: () => {} },
    { id: '49', title: 'Help & Support', subtitle: 'Get assistance', action: () => {} },
    { id: '50', title: 'Sign Out', subtitle: 'Log out of your account', action: handleSignOut },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>More</Text>
        
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.action}>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 24,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.paper,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: colors.inkMuted,
  },
  chevron: {
    fontSize: 24,
    color: colors.hair,
    marginLeft: 12,
  },
});

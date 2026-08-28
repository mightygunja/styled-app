import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, type as textType } from '../theme/designSystem';
import { useAuth } from '../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MoreItem {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: keyof RootStackParamList;
}

interface MoreSection {
  label: string;
  items: MoreItem[];
}

const SECTIONS: MoreSection[] = [
  {
    label: 'WARDROBE',
    items: [
      { label: 'Outfit planner', subtitle: 'PLAN LOOKS BY DATE', icon: 'calendar-outline', route: 'OutfitPlanner' },
      { label: 'Trip packing', subtitle: 'PACK FROM YOUR CLOSET', icon: 'airplane-outline', route: 'PackingList' },
      { label: 'Virtual try-on', subtitle: 'SEE A LOOK ON YOURSELF', icon: 'body-outline', route: 'TryOn' },
      { label: 'Import a receipt', subtitle: 'ADD A WHOLE HAUL AT ONCE', icon: 'receipt-outline', route: 'ReceiptImport' },
      { label: 'Closet sharing', subtitle: 'SHARE WITH PEOPLE YOU TRUST', icon: 'people-circle-outline', route: 'ClosetSharing' },
      { label: 'Smart search', subtitle: 'FIND ITEMS IN YOUR CLOSET', icon: 'search-outline', route: 'SmartSearch' },
      { label: 'Favorites', subtitle: 'SAVED LOOKS', icon: 'heart-outline', route: 'Favorites' },
    ],
  },
  {
    label: 'STYLE',
    items: [
      { label: 'Edits', subtitle: 'A STYLIST ON YOUR OWN CLOSET', icon: 'sparkles-outline', route: 'Edits' },
      { label: 'The Trend Report', subtitle: "WHAT'S MOVING, RANKED FOR YOU", icon: 'trending-up-outline', route: 'TrendInsights' },
    ],
  },
  {
    label: 'COMMUNITY',
    items: [
      { label: 'Explore', subtitle: 'DISCOVER STYLES & PEOPLE', icon: 'compass-outline', route: 'Explore' },
      { label: 'Groups & events', subtitle: 'JOIN THE CONVERSATION', icon: 'people-outline', route: 'Groups' },
      { label: 'Challenges', subtitle: 'STYLE CONTESTS', icon: 'trophy-outline', route: 'Challenges' },
      { label: 'Messages', subtitle: 'YOUR CONVERSATIONS', icon: 'chatbubble-outline', route: 'Messages' },
      { label: 'Notifications', subtitle: 'ACTIVITY ON YOUR POSTS', icon: 'notifications-outline', route: 'Notifications' },
    ],
  },
  {
    label: 'SUSTAINABILITY',
    items: [
      { label: 'Sustainability score', subtitle: 'YOUR WARDROBE IMPACT', icon: 'leaf-outline', route: 'Sustainability' },
      { label: 'Carbon calculator', subtitle: 'ESTIMATED CO2 FOOTPRINT', icon: 'earth-outline', route: 'CarbonCalculator' },
      { label: 'Resale', subtitle: "SELL WHAT YOU DON'T WEAR", icon: 'pricetag-outline', route: 'Resale' },
    ],
  },
];

export default function MoreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>MORE</Text>
        <Text style={styles.title}>Everything else</Text>

        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate('Account')}
          activeOpacity={0.85}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>
              {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.profileName}>{user?.displayName || 'Your profile'}</Text>
            {/* No SUBSCRIPTION here - there are no paid tiers, and the
                Subscription screen is no longer registered. */}
            <Text style={styles.profileSubtitle}>ACCOUNT · STYLISTS · SETTINGS</Text>
          </View>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>

        {SECTIONS.map(section => (
          <View key={section.label}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.row, i === section.items.length - 1 && styles.rowLast]}
                  onPress={() => navigation.navigate(item.route as any)}
                >
                  <Ionicons name={item.icon} size={18} color={colors.ink} style={styles.rowIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.rowArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  content: { padding: 20, paddingBottom: 60 },
  eyebrow: { ...textType.eyebrow, marginBottom: 8 },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, marginBottom: 8 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.card,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.serif,
    fontSize: 19,
    color: colors.tobacco,
  },
  profileName: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.ink,
  },
  profileSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.inkFaint,
    marginTop: 2,
  },
  sectionLabel: { ...textType.eyebrow, marginTop: 28, marginBottom: 12 },
  card: { borderTopWidth: 1, borderTopColor: colors.hair },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.hair,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { marginRight: 14, width: 20 },
  rowLabel: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  rowSubtitle: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1, color: colors.inkFaint, marginTop: 2 },
  rowArrow: { fontSize: 20, color: colors.inkFaint },
});

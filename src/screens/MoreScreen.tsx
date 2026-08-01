import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colors, fonts, type as textType } from '../theme/designSystem';

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
      { label: 'Smart search', subtitle: 'FIND ITEMS IN YOUR CLOSET', icon: 'search-outline', route: 'SmartSearch' },
      { label: 'Favorites', subtitle: 'SAVED LOOKS', icon: 'heart-outline', route: 'Favorites' },
    ],
  },
  {
    label: 'STYLE',
    items: [
      { label: 'Trend insights', subtitle: "WHAT'S TRENDING NOW", icon: 'trending-up-outline', route: 'TrendInsights' },
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
    ],
  },
];

export default function MoreScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>MORE</Text>
        <Text style={styles.title}>Everything else</Text>

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

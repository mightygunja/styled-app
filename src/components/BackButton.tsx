import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '../theme/designSystem';

interface BackButtonProps {
  style?: any;
  textStyle?: any;
  onPress?: () => void;
}

export default function BackButton({ style, textStyle, onPress }: BackButtonProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    // A screen opened by URL or refreshed on web is the only route in the
    // stack: goBack() has nothing to pop and used to do nothing at all,
    // stranding the user on ~70 screens with no tab bar. Home is the way out.
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const routeNames: string[] = (navigation.getState() as any)?.routeNames || [];
    (navigation as any).navigate(routeNames.includes('MainTabs') ? 'MainTabs' : 'Intro');
  };

  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={handlePress}
    >
      <Text style={[styles.backButtonText, textStyle]}>← Back</Text>
    </TouchableOpacity>
  );
}

// Geometry is deliberately unchanged - this component appears on 73 screens,
// most of them as a bare <BackButton /> directly under SafeAreaView with no
// wrapper padding. Only the paint changes: the grey pill and rounded corner
// are gone, and the label uses a real font family rather than fontWeight,
// which React Native cannot apply to a custom font.
const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  backButtonText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.inkMuted,
  },
});

import React, { ReactNode } from 'react';
import { Platform, StyleProp, TouchableOpacity as RNTouchableOpacity, ViewStyle } from 'react-native';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { haptics } from '../utils/haptics';

// The gesture-handler Touchable silently swallows presses on web (observed on
// every Chip inside Shop's horizontal ScrollViews: clicks never reached
// onPress). React Native's own Touchable is reliable on web; gesture-handler
// stays on native, where it composes with swipe gestures.
const TouchableOpacity = (Platform.OS === 'web'
  ? RNTouchableOpacity
  : GHTouchableOpacity) as typeof GHTouchableOpacity;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'tap' | 'select' | 'impact' | 'none';
}

// Spring-based press feedback (scale down on touch, spring back on release) -
// mirrors the button-press feel SwiftUI gets for free, which RN's default
// TouchableOpacity (opacity-only, no scale) doesn't have.
export default function PressableScale({
  children,
  onPress,
  disabled,
  style,
  scaleTo = 0.96,
  haptic = 'tap',
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(scaleTo, { damping: 16, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
  };

  const handlePress = () => {
    if (haptic === 'tap') haptics.tap();
    else if (haptic === 'select') haptics.select();
    else if (haptic === 'impact') haptics.impact();
    onPress?.();
  };

  return (
    <AnimatedTouchable
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={1}
    >
      {children}
    </AnimatedTouchable>
  );
}

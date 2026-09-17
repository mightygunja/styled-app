import React, { ReactNode, useEffect, useRef } from 'react';
import { Platform, StyleProp, TouchableOpacity as RNTouchableOpacity, ViewStyle } from 'react-native';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
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
  /**
   * Change this number to make the control "breathe" once - a small
   * scale-up and settle that draws the eye. Button uses it the moment a
   * disabled action becomes available.
   */
  pulse?: number;
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
  pulse,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const firstPulse = useRef(true);

  useEffect(() => {
    // Skip the mount: only a CHANGE of pulse is an event.
    if (firstPulse.current) {
      firstPulse.current = false;
      return;
    }
    if (pulse === undefined) return;
    scale.value = withSequence(
      withSpring(1.04, { damping: 10, stiffness: 260 }),
      withSpring(1, { damping: 12, stiffness: 220 })
    );
  }, [pulse, scale]);

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

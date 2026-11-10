import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated, StyleProp, TouchableOpacity, ViewStyle } from 'react-native';
import { haptics } from '../utils/haptics';

/**
 * Web build of PressableScale (see PressableScale.tsx for the native one).
 *
 * Same props and the same press feel - scale down on touch, spring back on
 * release, a one-off "breathe" when `pulse` changes - built on React Native's
 * own Animated instead of Reanimated. Every Button and Chip renders through
 * this, so the native version pulled Reanimated, its worklets runtime and
 * gesture-handler (about 900 KB, a quarter of the web startup bundle) into
 * the first download for a 4% scale animation. Native is unchanged.
 */
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'tap' | 'select' | 'impact' | 'none';
  /** Change this number to make the control "breathe" once. */
  pulse?: number;
}

export default function PressableScale({
  children,
  onPress,
  disabled,
  style,
  scaleTo = 0.96,
  haptic = 'tap',
  pulse,
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const firstPulse = useRef(true);

  const springTo = (toValue: number, damping: number, stiffness: number) =>
    Animated.spring(scale, { toValue, damping, stiffness, mass: 1, useNativeDriver: false });

  useEffect(() => {
    // Skip the mount: only a CHANGE of pulse is an event.
    if (firstPulse.current) {
      firstPulse.current = false;
      return;
    }
    if (pulse === undefined) return;
    Animated.sequence([springTo(1.04, 10, 260), springTo(1, 12, 220)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse]);

  const handlePress = () => {
    if (haptic === 'tap') haptics.tap();
    else if (haptic === 'select') haptics.select();
    else if (haptic === 'impact') haptics.impact();
    onPress?.();
  };

  return (
    <AnimatedTouchable
      style={[style, { transform: [{ scale }] }]}
      onPressIn={() => springTo(scaleTo, 16, 300).start()}
      onPressOut={() => springTo(1, 12, 220).start()}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={1}
    >
      {children}
    </AnimatedTouchable>
  );
}

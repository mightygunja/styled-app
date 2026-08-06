/**
 * A single line of copy that cross-fades between propositions.
 *
 * Deliberately slow. The point is that someone reading the login screen sees
 * a second reason to be here, not that the text is busy.
 */

import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

interface Props {
  lines: string[];
  style?: StyleProp<TextStyle>;
  /** Milliseconds each line is held at full opacity. */
  hold?: number;
}

export default function RotatingLine({ lines, style, hold = 3800 }: Props) {
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(0);
  const lift = useSharedValue(8);

  useEffect(() => {
    if (lines.length === 0) return;

    const advance = () => setIndex(current => (current + 1) % lines.length);

    // withSequence, not two assignments. Assigning opacity.value twice would
    // simply cancel the fade-in and start the fade-out immediately.
    opacity.value = withSequence(
      withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
      withDelay(
        hold,
        // Hand the index change back to JS only once this line has gone, so
        // the next one mounts into an already-transparent view.
        withTiming(0, { duration: 500 }, finished => {
          if (finished) runOnJS(advance)();
        })
      )
    );

    // Snap back below the line first. Without the reset, every line after the
    // first would enter from above - where the previous one exited - and the
    // motion would read as a bounce rather than a departure board.
    lift.value = withSequence(
      withTiming(8, { duration: 0 }),
      withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) }),
      withDelay(hold, withTiming(-8, { duration: 500 }))
    );
  }, [index, lines, hold, opacity, lift]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }],
  }));

  if (lines.length === 0) return null;

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[styles.text, style]}>{lines[index]}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: { textAlign: 'left' },
});

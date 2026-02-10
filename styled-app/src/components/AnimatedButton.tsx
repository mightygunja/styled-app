import React, { useRef } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Animated,
  StyleSheet,
} from 'react-native';
import { scale } from '../utils/animations';

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  scaleValue?: number;
}

export default function AnimatedButton({
  children,
  onPress,
  style,
  scaleValue = 0.95,
  ...props
}: AnimatedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    scale(scaleAnim, scaleValue, 100).start();
  };

  const handlePressOut = () => {
    scale(scaleAnim, 1, 100).start();
  };

  const handlePress = (event: any) => {
    if (onPress) {
      onPress(event);
    }
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={0.8}
      {...props}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { scale } from '../utils/animations';
import { colors, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');

interface SuccessAnimationProps {
  visible: boolean;
  message?: string;
  onComplete?: () => void;
  duration?: number;
}

export default function SuccessAnimation({
  visible,
  message = 'Success!',
  onComplete,
  duration = 2000,
}: SuccessAnimationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Sequence of animations
      Animated.sequence([
        // 1. Scale up circle
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // 2. Pop in checkmark
        Animated.spring(checkmarkScale, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }),
        // 3. Hold for a moment
        Animated.delay(duration - 600),
        // 4. Fade out
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Reset values
        scaleAnim.setValue(0);
        fadeAnim.setValue(0);
        checkmarkScale.setValue(0);
        
        if (onComplete) {
          onComplete();
        }
      });
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.circle,
          {
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.checkmarkContainer,
            {
              transform: [{ scale: checkmarkScale }],
            },
          ]}
        >
          <Text style={styles.checkmark}>✓</Text>
        </Animated.View>
      </Animated.View>
      
      <Animated.Text
        style={[
          styles.message,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {message}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28, 28, 28, 0.55)',
    zIndex: 10000,
  },
  // The circle stays round - it reads as a mark of completion rather than a
  // container, which is the one place a radius is right in this system.
  circle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontFamily: fonts.sans,
    fontSize: 52,
    color: colors.bone,
  },
  message: {
    marginTop: 24,
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.bone,
    textAlign: 'center',
  },
});

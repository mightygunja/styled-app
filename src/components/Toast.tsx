import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { slideInFromBottom, slideOutToBottom } from '../utils/animations';
import { colors, fonts } from '../theme/designSystem';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  duration?: number;
  onHide?: () => void;
}

export default function Toast({
  message,
  type = 'success',
  visible,
  duration = 3000,
  onHide,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        slideInFromBottom(translateY, 300),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      slideOutToBottom(translateY, 100, 300),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  if (!visible) {
    return null;
  }

  // The palette carries no semantic red/green/blue. Ink is the affirmative
  // ground and tobacco the cautionary one - the same two the rest of the app
  // uses. The leading glyph is what distinguishes the three cases.
  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return colors.tobacco;
      default:
        return colors.ink;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      default:
        return '✓';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getIcon()}</Text>
      </View>
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  iconContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.white,
  },
  message: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.white,
  },
});

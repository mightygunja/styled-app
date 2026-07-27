import { Animated, Easing } from 'react-native';

/**
 * Professional animation utilities for the Styled app
 */

export const AnimationConfig = {
  // Timing
  fast: 200,
  normal: 300,
  slow: 500,
  
  // Easing functions
  easeOut: Easing.out(Easing.cubic),
  easeIn: Easing.in(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
  spring: Easing.elastic(1),
};

/**
 * Fade in animation
 */
export const fadeIn = (
  animatedValue: Animated.Value,
  duration: number = AnimationConfig.normal,
  toValue: number = 1
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: AnimationConfig.easeOut,
    useNativeDriver: true,
  });
};

/**
 * Fade out animation
 */
export const fadeOut = (
  animatedValue: Animated.Value,
  duration: number = AnimationConfig.normal,
  toValue: number = 0
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: AnimationConfig.easeIn,
    useNativeDriver: true,
  });
};

/**
 * Slide in from bottom animation
 */
export const slideInFromBottom = (
  animatedValue: Animated.Value,
  duration: number = AnimationConfig.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: AnimationConfig.easeOut,
    useNativeDriver: true,
  });
};

/**
 * Slide out to bottom animation
 */
export const slideOutToBottom = (
  animatedValue: Animated.Value,
  distance: number = 300,
  duration: number = AnimationConfig.normal
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: distance,
    duration,
    easing: AnimationConfig.easeIn,
    useNativeDriver: true,
  });
};

/**
 * Scale animation (for buttons, cards)
 */
export const scale = (
  animatedValue: Animated.Value,
  toValue: number = 1,
  duration: number = AnimationConfig.fast
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    toValue,
    friction: 5,
    tension: 100,
    useNativeDriver: true,
  });
};

/**
 * Stagger animation for lists
 */
export const stagger = (
  animations: Animated.CompositeAnimation[],
  delay: number = 50
): Animated.CompositeAnimation => {
  return Animated.stagger(delay, animations);
};

/**
 * Parallel animations
 */
export const parallel = (
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.parallel(animations);
};

/**
 * Sequence animations
 */
export const sequence = (
  animations: Animated.CompositeAnimation[]
): Animated.CompositeAnimation => {
  return Animated.sequence(animations);
};

/**
 * Modal fade in with background
 */
export const modalFadeIn = (
  backgroundOpacity: Animated.Value,
  contentOpacity: Animated.Value,
  contentTranslateY: Animated.Value,
  duration: number = AnimationConfig.normal
): Animated.CompositeAnimation => {
  return parallel([
    fadeIn(backgroundOpacity, duration, 0.5),
    fadeIn(contentOpacity, duration),
    slideInFromBottom(contentTranslateY, duration),
  ]);
};

/**
 * Modal fade out with background
 */
export const modalFadeOut = (
  backgroundOpacity: Animated.Value,
  contentOpacity: Animated.Value,
  contentTranslateY: Animated.Value,
  duration: number = AnimationConfig.normal
): Animated.CompositeAnimation => {
  return parallel([
    fadeOut(backgroundOpacity, duration),
    fadeOut(contentOpacity, duration),
    slideOutToBottom(contentTranslateY, 300, duration),
  ]);
};

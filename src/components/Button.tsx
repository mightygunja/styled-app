import React, { useEffect, useRef, useState } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, fonts, radius } from '../theme/designSystem';
import PressableScale from './PressableScale';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  // The moment a disabled action becomes available it pulses once. A tester
  // on build 13 picked an option in the style survey and still read Continue
  // as unavailable: the only change was opacity 0.55 -> 1 on the same pill,
  // which is easy to miss. The pulse is the event; the shadow below is the
  // standing difference.
  const wasDisabled = useRef(disabled);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (wasDisabled.current && !disabled) setPulse(p => p + 1);
    wasDisabled.current = disabled;
  }, [disabled]);

  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[`${size}Button`],
    fullWidth && styles.fullWidth,
    variant === 'primary' && !disabled && styles.primaryEnabled,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <PressableScale
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      haptic={variant === 'primary' ? 'impact' : 'tap'}
      scaleTo={0.97}
      pulse={pulse}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.bone : colors.ink} />
      ) : (
        <Text style={textStyles}>{title.toUpperCase()}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    // The same capsule as the floating tab bar — every button in the app
    // reads as the one rounded, tappable shape.
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  // Variants
  primary: {
    // Brand rust, not ink: near-black at reduced opacity read as a grey,
    // inactive control. The action colour stays unmistakably "on".
    backgroundColor: colors.rust,
  },
  secondary: {
    backgroundColor: colors.camel,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.hair,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  // An available primary action is lifted off the page; a disabled one lies
  // flat. Together with the opacity step this makes the two states read as
  // different objects, not two tints of one.
  primaryEnabled: {
    shadowColor: colors.rust,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  disabled: {
    // Kept brown-family rather than washed to grey, so a not-yet-enabled
    // Continue still reads as the button you're working toward - but far
    // enough from full strength that enabling it is unmistakable.
    opacity: 0.4,
  },
  // Sizes
  smallButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  mediumButton: {
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  largeButton: {
    paddingVertical: 17,
    paddingHorizontal: 32,
  },
  // Text styles
  text: {
    // No fontWeight alongside a custom family - React Native cannot select a
    // real weight from it and synthesises or falls back to the system font.
    // The weight lives in the family name.
    fontFamily: fonts.sansSemiBold,
    letterSpacing: 1.8,
  },
  primaryText: {
    color: colors.bone,
  },
  secondaryText: {
    color: colors.ink,
  },
  outlineText: {
    color: colors.ink,
  },
  ghostText: {
    color: colors.ink,
  },
  disabledText: {
    // The pill already carries the dimming; dimming the label again made
    // disabled text close to unreadable.
    opacity: 0.85,
  },
  smallText: {
    fontSize: 9,
  },
  mediumText: {
    fontSize: 10,
  },
  largeText: {
    fontSize: 11,
  },
});

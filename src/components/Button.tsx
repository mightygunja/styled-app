import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, fonts } from '../theme/designSystem';

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
  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[`${size}Button`],
    fullWidth && styles.fullWidth,
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
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.bone : colors.ink} />
      ) : (
        <Text style={textStyles}>{title.toUpperCase()}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 0,
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
    backgroundColor: colors.ink,
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
  disabled: {
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
    fontFamily: fonts.sansSemiBold,
    fontWeight: '600',
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
    opacity: 0.6,
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

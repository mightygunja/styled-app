import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors, fonts } from '../theme/designSystem';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export default function Input({
  label,
  error,
  containerStyle,
  style,
  ...props
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  // The palette has no red, so the error state is carried by a full-strength
  // ink border against the hairline of the resting state, plus tobacco text.
  // Mapping the old #ef4444 straight to hair made this identical to `input`
  // and the error invisible.
  inputError: {
    borderColor: colors.ink,
  },
  errorText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.tobacco,
    marginTop: 6,
  },
});

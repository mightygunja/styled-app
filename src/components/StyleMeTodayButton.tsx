/**
 * Style Me Today Button
 * 
 * 1-tap outfit generation for maximum friction reduction.
 * 
 * Goal: Make getting dressed effortless.
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, fonts } from '../theme/designSystem';

interface StyleMeTodayButtonProps {
  onPress: () => Promise<void>;
  loading?: boolean;
}

export default function StyleMeTodayButton({ onPress, loading = false }: StyleMeTodayButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePress = async () => {
    setIsGenerating(true);
    try {
      await onPress();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      disabled={loading || isGenerating}
      activeOpacity={0.8}
    >
      {(loading || isGenerating) ? (
        <ActivityIndicator color="#F1ECE7" />
      ) : (
        <>
          <Text style={styles.icon}>✨</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Style Me Today</Text>
            <Text style={styles.subtitle}>1-tap outfit for right now</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginVertical: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 32,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.sand,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.hair,
  },
});

/**
 * Monthly Insight Card Component
 * 
 * Plus tier feature: Shows personalized style insight based on usage.
 * Premium tease: Offers stylist review.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, radius } from '../theme/designSystem';

interface MonthlyInsightCardProps {
  insight: string;
  tier: 'free' | 'plus' | 'premium';
  onStylistReview?: () => void;
}

export default function MonthlyInsightCard({
  insight,
  tier,
  onStylistReview,
}: MonthlyInsightCardProps) {
  const showPremiumTease = tier === 'plus';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>Monthly Insight</Text>
        <Text style={styles.date}>{getCurrentMonth()}</Text>
      </View>

      <Text style={styles.insight}>{insight}</Text>

      {showPremiumTease && onStylistReview && (
        <TouchableOpacity
          style={styles.premiumTease}
          onPress={onStylistReview}
        >
          <Text style={styles.teaseIcon}>👗</Text>
          <Text style={styles.teaseText}>
            Want a stylist to review this with you?
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.footer}>
        Based on your outfits this month
      </Text>
    </View>
  );
}

function getCurrentMonth(): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[new Date().getMonth()];
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 20,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  date: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  insight: {
    fontSize: 20,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    lineHeight: 28,
    marginBottom: 16,
  },
  premiumTease: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  teaseIcon: {
    fontSize: 24,
  },
  teaseText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  footer: {
    fontSize: 13,
    color: colors.inkMuted,
    fontStyle: 'italic',
  },
});

/**
 * Monthly Insight Card Component
 * 
 * Plus tier feature: Shows personalized style insight based on usage.
 * Premium tease: Offers stylist review.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#2B1F1A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B1F1A',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  date: {
    fontSize: 12,
    color: '#5E5A55',
  },
  insight: {
    fontSize: 20,
    fontWeight: '600',
    color: '#161616',
    lineHeight: 28,
    marginBottom: 16,
  },
  premiumTease: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F3',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  teaseIcon: {
    fontSize: 24,
  },
  teaseText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2B1F1A',
  },
  footer: {
    fontSize: 13,
    color: '#5E5A55',
    fontStyle: 'italic',
  },
});

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import BackButton from '../components/BackButton';
import { colors, fonts, type as textType, spacing } from '../theme/designSystem';
import { trendInsightsService, TrendingTag } from '../services/trendInsightsService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TrendInsightsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const trending = await trendInsightsService.getTrendingHashtags(15);
      setTags(trending);
    } catch (error) {
      console.error('Error loading trends:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const maxCount = Math.max(1, ...tags.map(t => t.postCount));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><BackButton /></View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>TREND INSIGHTS</Text>
        <Text style={styles.title}>What's trending right now</Text>
        <Text style={styles.subtitle}>Based on hashtags across recent community posts.</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.ink} style={{ marginTop: 40 }} />
        ) : tags.length === 0 ? (
          <Text style={styles.emptyText}>Not enough recent posts yet to spot a trend.</Text>
        ) : (
          <View style={styles.list}>
            {tags.map((tag, i) => (
              <TouchableOpacity
                key={tag.hashtag}
                style={styles.row}
                onPress={() => navigation.navigate('Explore')}
              >
                <Text style={styles.rank}>{String(i + 1).padStart(2, '0')}</Text>
                <View style={styles.rowContent}>
                  <Text style={styles.hashtag}>#{tag.hashtag}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(tag.postCount / maxCount) * 100}%` }]} />
                  </View>
                </View>
                <Text style={styles.count}>{tag.postCount}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bone },
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  content: { padding: spacing.page, paddingBottom: 60 },
  eyebrow: { ...textType.eyebrow, marginBottom: 8 },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.ink },
  subtitle: { ...textType.body, color: colors.inkMuted, marginTop: 8 },
  emptyText: { ...textType.body, color: colors.inkMuted, marginTop: 40, textAlign: 'center' },
  list: { marginTop: spacing.section },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hair },
  rank: { fontFamily: fonts.serifItalic, fontSize: 16, color: colors.camel, width: 32 },
  rowContent: { flex: 1, marginRight: 12 },
  hashtag: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink, marginBottom: 6 },
  barTrack: { height: 3, backgroundColor: colors.hair },
  barFill: { height: 3, backgroundColor: colors.camel },
  count: { ...textType.meta, width: 32, textAlign: 'right' },
});

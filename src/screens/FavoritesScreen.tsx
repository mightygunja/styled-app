import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { lookAPI, getCurrentUserId } from '../services/api';
import { Look } from '../types';
import LookCard from '../components/LookCard';
import BackButton from '../components/BackButton';
import Button from '../components/Button';
import { fadeIn } from '../utils/animations';
import { colors, fonts, spacing, type as textType } from '../theme/designSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FavoritesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // A failed fetch is not "No Favorites Yet" - it gets its own retry state.
  const [loadError, setLoadError] = useState(false);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchFavorites = async () => {
    try {
      console.log('Fetching favorite looks...');
      const response = await lookAPI.getFavorites(getCurrentUserId());
      console.log('Favorites response:', response);
      setLooks(response.data || []);
      setLoadError(false);
      
      // Animate in
      if (!refreshing) {
        fadeIn(fadeAnim, 300).start();
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleUnfavorite = async (lookId: string) => {
    try {
      await lookAPI.toggleFavorite(lookId, getCurrentUserId());
      // Remove from local state
      setLooks(prev =>prev.filter(look =>look.id !== lookId));
    } catch (error) {
      console.error('Error unfavoriting:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <BackButton />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <BackButton />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>LOOKBOOK</Text>
        <Text style={styles.title}>My favorites</Text>
        <Text style={styles.subtitle}>
          {looks.length} {looks.length === 1 ? 'look' : 'looks'} saved
        </Text>
      </View>

      {loadError && looks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Couldn't load your favorites</Text>
          <Text style={styles.emptyText}>Check your connection and try again.</Text>
          <Button
            title="Tap to retry"
            variant="primary"
            onPress={() => {
              setLoading(true);
              fetchFavorites();
            }}
          />
        </View>
      ) : looks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyText}>Tap the heart icon on any look to save it here.</Text>
          <Button
            title="Browse looks"
            variant="primary"
            onPress={() => navigation.navigate('Recommendations')}
          />
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={looks}
          keyExtractor={(item) =>item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <LookCard
                look={item}
                onPress={() =>navigation.navigate('LookDetail', { lookId: item.id })}
                onFavorite={() =>handleUnfavorite(item.id)}
                isFavorited={true}
                compact
              />
            </View>
          )}
        />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Same header block as Saved looks, the sibling row in the menu.
  container: {
    flex: 1,
    backgroundColor: colors.bone,
  },
  headerBar: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...textType.body,
    marginTop: 12,
    color: colors.inkMuted,
  },
  header: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.page,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  eyebrow: {
    ...textType.eyebrow,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    color: colors.ink,
  },
  subtitle: {
    ...textType.body,
    color: colors.inkMuted,
    marginTop: 8,
  },
  grid: {
    padding: 16,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '50%',
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    ...textType.body,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
});

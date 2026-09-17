import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
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
import { fadeIn } from '../utils/animations';
import { colors, fonts, radius } from '../theme/designSystem';

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
        <BackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>My Favorites</Text>
        <Text style={styles.subtitle}>
          {looks.length} {looks.length === 1 ? 'look' : 'looks'} saved
        </Text>
      </View>

      {loadError && looks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Couldn't load your favorites</Text>
          <Text style={styles.emptyText}>Check your connection and try again.</Text>
          <TouchableOpacity
            style={styles.browseButton}
            accessibilityRole="button"
            onPress={() => {
              setLoading(true);
              fetchFavorites();
            }}
          >
            <Text style={styles.browseButtonText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : looks.length === 0 ? (
        <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyText}>Tap the heart icon on any look to save it here
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() =>navigation.navigate('Recommendations')}
          >
            <Text style={styles.browseButtonText}>Browse Looks</Text>
          </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.inkMuted,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  headerTop: {
    marginBottom: 12,
  },
  backButton: {
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.paper,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.inkMuted,
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: fonts.sansSemiBold,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    borderRadius: radius.full,
    backgroundColor: colors.rust,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  browseButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Look } from '../types';
import { lookAPI, getCurrentUserId } from '../services/api';
import LookCard from '../components/LookCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function WorkScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const fetchLooks = async () => {
    try {
      console.log('Fetching work looks...');
      const response = await lookAPI.getAll({ occasions: ['work'], limit: 20 });
      console.log('Work looks response:', response);
      console.log('Work looks data:', response.data);
      setLooks(response.data);
    } catch (error) {
      console.error('Error fetching work looks:', error);
      alert('Failed to fetch work looks. Check console.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLooks();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLooks();
  };

  const handleFavorite = async (lookId: string) => {
    try {
      const response = await lookAPI.toggleFavorite(lookId, getCurrentUserId());
      
      if (response.isFavorited) {
        setFavorites(prev => new Set(prev).add(lookId));
      } else {
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(lookId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading work looks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.title}>Work Looks</Text>
        <Text style={styles.subtitle}>
          Professional outfits for the office and meetings
        </Text>

        {looks.length === 0 ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              No looks available yet. Check back soon!
            </Text>
          </View>
        ) : (
          <View style={styles.looksContainer}>
            {looks.map((look) => (
              <LookCard
                key={look.id}
                look={look}
                onPress={() => navigation.navigate('LookDetail', { lookId: look.id })}
                onFavorite={() => handleFavorite(look.id)}
                isFavorited={favorites.has(look.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  looksContainer: {
    alignItems: 'center',
  },
  placeholder: {
    backgroundColor: '#f1f5f9',
    padding: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  placeholderText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

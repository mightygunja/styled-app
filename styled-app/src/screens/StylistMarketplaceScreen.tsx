import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Stylist } from '../types';
import { RootStackParamList } from '../navigation/types';
import { stylistAPI } from '../services/stylistAPI';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function StylistMarketplaceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'top-rated' | 'affordable'>('all');

  useEffect(() => {
    loadStylists();
  }, []);

  const loadStylists = async () => {
    try {
      setLoading(true);
      const data = await stylistAPI.getStylists();
      setStylists(data);
    } catch (error) {
      console.error('Error loading stylists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      loadStylists();
      return;
    }
    
    try {
      const results = await stylistAPI.searchStylists(query);
      setStylists(results);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const applyFilter = async (filter: 'all' | 'top-rated' | 'affordable') => {
    setSelectedFilter(filter);
    
    try {
      if (filter === 'all') {
        loadStylists();
      } else if (filter === 'top-rated') {
        const filtered = await stylistAPI.filterStylists({ minRating: 4.8 });
        setStylists(filtered);
      } else if (filter === 'affordable') {
        const filtered = await stylistAPI.filterStylists({ maxRate: 125 });
        setStylists(filtered);
      }
    } catch (error) {
      console.error('Error filtering:', error);
    }
  };

  const renderStylistCard = (stylist: Stylist) => (
    <TouchableOpacity
      key={stylist.id}
      style={styles.stylistCard}
      onPress={() => navigation.navigate('StylistDetail', { stylistId: stylist.id })}
    >
      {/* Cover Image */}
      {stylist.coverImageUrl && (
        <Image source={{ uri: stylist.coverImageUrl }} style={styles.coverImage} />
      )}
      
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <Image source={{ uri: stylist.profileImageUrl }} style={styles.profileImage} />
        
        <View style={styles.stylistInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.stylistName}>{stylist.name}</Text>
            {stylist.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>⭐ {stylist.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({stylist.reviewCount} reviews)</Text>
          </View>
          
          <Text style={styles.location}>📍 {stylist.location}</Text>
        </View>
      </View>

      {/* Bio */}
      <Text style={styles.bio} numberOfLines={2}>
        {stylist.bio}
      </Text>

      {/* Specialties */}
      <View style={styles.specialtiesContainer}>
        {stylist.specialties.slice(0, 3).map((specialty, index) => (
          <View key={index} style={styles.specialtyTag}>
            <Text style={styles.specialtyText}>{specialty}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.rateLabel}>Starting at</Text>
          <Text style={styles.rate}>${stylist.hourlyRate}/hr</Text>
        </View>
        <View style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Book Session</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Finding stylists...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Find Your Stylist</Text>
          <Text style={styles.subtitle}>
            Connect with professional stylists for personalized sessions
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or specialty..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.searchIcon}>🔍</Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
              onPress={() => applyFilter('all')}
            >
              <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
                All Stylists
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'top-rated' && styles.filterButtonActive]}
              onPress={() => applyFilter('top-rated')}
            >
              <Text style={[styles.filterText, selectedFilter === 'top-rated' && styles.filterTextActive]}>
                ⭐ Top Rated
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'affordable' && styles.filterButtonActive]}
              onPress={() => applyFilter('affordable')}
            >
              <Text style={[styles.filterText, selectedFilter === 'affordable' && styles.filterTextActive]}>
                💰 Affordable
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Results Count */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsText}>
            {stylists.length} {stylists.length === 1 ? 'stylist' : 'stylists'} available
          </Text>
        </View>

        {/* Stylist Cards */}
        <View style={styles.cardsContainer}>
          {stylists.map(renderStylistCard)}
        </View>

        {/* Empty State */}
        {stylists.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No stylists found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    position: 'absolute',
    right: 36,
    fontSize: 20,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  cardsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stylistCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f1f5f9',
  },
  profileSection: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    marginTop: -40,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: '#f1f5f9',
  },
  stylistInfo: {
    flex: 1,
    marginLeft: 12,
    marginTop: 40,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stylistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 6,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#64748b',
  },
  location: {
    fontSize: 12,
    color: '#64748b',
  },
  bio: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  specialtyText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  rateLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  rate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  bookButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
  },
});

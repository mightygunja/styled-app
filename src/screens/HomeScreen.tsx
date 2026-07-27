import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  SafeAreaView,
  Modal,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Look } from '../types';
import { lookAPI, closetAPI, paletteAPI, getCurrentUserId } from '../services/api';
import Toast from '../components/Toast';
import { fadeIn } from '../utils/animations';
import { useToast } from '../hooks/useToast';
import { quickAccessService, QuickAccessItem } from '../services/quickAccessService';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const FALLBACK_IMAGES = {
  outfits: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
  closet: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80',
  colors: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
};

interface TrendingModule {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  type: 'outfits' | 'closet' | 'colors';
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [quickAccessItems, setQuickAccessItems] = useState<QuickAccessItem[]>([]);
  const [trendingModules, setTrendingModules] = useState<TrendingModule[]>([]);
  const { toast, showToast, hideToast } = useToast();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchTrendingData = async () => {
    try {
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentSeason = getCurrentSeason();

      // 1. "Trending This Month" - a real look from the seeded looks collection
      let outfitsImage = FALLBACK_IMAGES.outfits;
      let outfitsSubtitle = `${currentMonth}'s most popular ${currentSeason.toLowerCase()} looks`;
      try {
        const looksResponse = await lookAPI.getAll({ occasion: 'work', limit: 1 });
        const topLook: Look | undefined = looksResponse.data?.[0];
        if (topLook?.imageUrl) {
          outfitsImage = topLook.imageUrl;
          outfitsSubtitle = topLook.title || outfitsSubtitle;
        }
      } catch (err) {
        console.log('Could not load trending look, using fallback', err);
      }

      // 2. "Your Best Looks" - the user's own most-worn/most-recent closet item
      let closetImage = FALLBACK_IMAGES.closet;
      let closetSubtitle = 'Personalized picks from your closet';
      try {
        const closetResponse = await closetAPI.getItems(getCurrentUserId());
        const items = closetResponse.data || [];
        if (items.length > 0) {
          const bestItem = [...items].sort((a: any, b: any) => (b.wornCount || 0) - (a.wornCount || 0))[0];
          closetImage = bestItem.imageUrl || closetImage;
          closetSubtitle = `${items.length} item${items.length === 1 ? '' : 's'} in your closet`;
        } else {
          closetSubtitle = 'Add items to see your best looks';
        }
      } catch (err) {
        console.log('Could not load closet items, using fallback', err);
      }

      // 3. "Colors & Patterns" - the currently active trend palette
      let colorsImage = FALLBACK_IMAGES.colors;
      let colorsSubtitle = `${currentMonth}'s trending palette`;
      try {
        const paletteResponse = await paletteAPI.getActive();
        const activePalette = paletteResponse.data?.[0];
        if (activePalette) {
          colorsImage = activePalette.imageUrl || colorsImage;
          colorsSubtitle = activePalette.name
            ? `Featuring "${activePalette.name}"`
            : colorsSubtitle;
        }
      } catch (err) {
        console.log('Could not load active palette, using fallback', err);
      }

      const modules: TrendingModule[] = [
        {
          id: '1',
          title: 'Trending This Month',
          subtitle: outfitsSubtitle,
          imageUrl: outfitsImage,
          type: 'outfits',
        },
        {
          id: '2',
          title: 'Your Best Looks',
          subtitle: closetSubtitle,
          imageUrl: closetImage,
          type: 'closet',
        },
        {
          id: '3',
          title: 'Colors & Patterns',
          subtitle: colorsSubtitle,
          imageUrl: colorsImage,
          type: 'colors',
        },
      ];

      setTrendingModules(modules);

      // Animate in after loading
      if (!refreshing) {
        fadeIn(fadeAnim, 300).start();
      }
    } catch (error) {
      console.error('Error fetching trending data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  };

  const fetchQuickAccess = async () => {
    try {
      const items = await quickAccessService.getQuickAccessItems();
      setQuickAccessItems(items);
    } catch (error) {
      console.error('Error fetching quick access:', error);
    }
  };

  useEffect(() => {
    fetchTrendingData();
    fetchQuickAccess();
  }, []);

  // Refresh quick access when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchQuickAccess();
    });
    return unsubscribe;
  }, [navigation]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrendingData();
  };

  const handleModulePress = (module: TrendingModule) => {
    if (module.type === 'outfits') {
      navigation.navigate('Recommendations' as any);
    } else if (module.type === 'closet') {
      navigation.navigate('Closet' as any);
    } else if (module.type === 'colors') {
      navigation.navigate('ColorPalette' as any);
    }
  };

  const handleMenuItemPress = (route: string) => {
    setMenuVisible(false);
    navigation.navigate(route as any);
  };

  const handleSignOut = async () => {
    setMenuVisible(false);
    try {
      await signOut();
      // Navigation back to Login happens automatically via AppNavigator's auth state watch
    } catch (error) {
      console.error('Error signing out:', error);
      showToast('Failed to sign out', 'error');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Hamburger Menu */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <View style={styles.hamburger}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Styled</Text>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('SocialFeed')}
        >
          <Text style={styles.socialIcon}>◎</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={handleRefresh} />
        }
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Discover</Text>
          <Text style={styles.heroSubtitle}>Curated for you</Text>
        </View>

        {/* Style Profile Quick Access */}
        <TouchableOpacity
          style={styles.styleProfileButton}
          onPress={() => navigation.navigate('StyleProfileBuilder')}
          activeOpacity={0.8}
        >
          <View style={styles.styleProfileIcon}>
            <Text style={styles.styleProfileIconText}>✨</Text>
          </View>
          <View style={styles.styleProfileContent}>
            <Text style={styles.styleProfileTitle}>Your Style Profile</Text>
            <Text style={styles.styleProfileSubtitle}>Build or update your preferences</Text>
          </View>
          <Text style={styles.styleProfileArrow}>→</Text>
        </TouchableOpacity>

        {/* Three Trending Modules */}
        <Animated.View style={{ opacity: fadeAnim }}>
          {trendingModules.map((module, index) => {
            const overlayColors: Record<TrendingModule['type'], string> = {
              outfits: '#2B1F1A',
              closet: '#7B665A',
              colors: '#0F2419',
            };

            return (
              <TouchableOpacity
                key={module.id}
                style={[styles.module, index === trendingModules.length - 1 && styles.moduleLastChild]}
                onPress={() => handleModulePress(module)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: module.imageUrl }}
                  style={styles.moduleImage}
                  resizeMode="cover"
                />
                <View style={[styles.moduleOverlay, { backgroundColor: overlayColors[module.type] }]}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={menuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <View>
                <Text style={styles.menuHeaderTitle}>Menu</Text>
                {user && (
                  <Text style={styles.menuHeaderSubtitle} numberOfLines={1}>
                    {user.displayName || user.email}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Text style={styles.menuClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.menuItems}>
              {quickAccessItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress(item.route)}
                >
                  <Text style={styles.menuItemIcon}>{item.icon}</Text>
                  <Text style={styles.menuItemText}>{item.title}</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuItemPress('QuickAccess')}
              >
                <Text style={styles.menuItemIcon}>◎</Text>
                <Text style={styles.menuItemText}>Manage Menu</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
                <Text style={styles.menuItemIcon}>⏻</Text>
                <Text style={[styles.menuItemText, styles.signOutText]}>Sign Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F1ED',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DED7CF',
    backgroundColor: '#F4F1ED',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburger: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 24,
    height: 2,
    backgroundColor: '#161616',
    borderRadius: 2,
  },
  socialIcon: {
    fontSize: 22,
    color: '#161616',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#161616',
    letterSpacing: 0.5,
  },
  content: {
    paddingBottom: 40,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#161616',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 17,
    color: '#5E5A55',
    fontWeight: '400',
  },
  module: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#EEE9E3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  moduleLastChild: {
    marginBottom: 0,
  },
  moduleImage: {
    width: '100%',
    height: 240,
  },
  moduleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  moduleTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F1ECE7',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  moduleSubtitle: {
    fontSize: 15,
    color: '#F1ECE7',
    opacity: 0.90,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17,
    color: '#5E5A55',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#EEE9E3',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DED7CF',
  },
  menuHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#161616',
  },
  menuHeaderSubtitle: {
    fontSize: 13,
    color: '#7B665A',
    marginTop: 2,
    maxWidth: 220,
  },
  signOutText: {
    color: '#C62828',
  },
  menuClose: {
    fontSize: 28,
    color: '#2B1F1A',
    fontWeight: '300',
  },
  menuItems: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    color: '#2B1F1A',
    textAlign: 'center',
  },
  menuItemText: {
    fontSize: 17,
    color: '#161616',
    fontWeight: '400',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#DED7CF',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  styleProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2B1F1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  styleProfileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F4F1ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  styleProfileIconText: {
    fontSize: 24,
  },
  styleProfileContent: {
    flex: 1,
  },
  styleProfileTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#161616',
    marginBottom: 2,
  },
  styleProfileSubtitle: {
    fontSize: 14,
    color: '#5E5A55',
  },
  styleProfileArrow: {
    fontSize: 20,
    color: '#2B1F1A',
    fontWeight: '600',
  },
});

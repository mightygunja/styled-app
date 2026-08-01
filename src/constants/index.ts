// App-wide constants

export const APP_NAME = 'Styled';

export const OCCASIONS = {
  HOME: 'home',
  WORK: 'work',
  GOING_OUT: 'going-out',
} as const;

export const OCCASION_LABELS = {
  home: 'Home',
  work: 'Work',
  'going-out': 'Going Out',
};

export const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Digital closet (up to 30 items)',
      '3 outfit suggestions/week',
      'Basic gap detection',
      'Style profile quiz',
    ],
    looksPerWeek: 3,
  },
  PLUS: {
    id: 'premium',
    name: 'Plus',
    price: 9,
    features: [
      'Unlimited closet, unlimited outfits',
      'Full style profile + trend translation',
      'Closet Health Score',
      'Body & fit intelligence',
      'Travel packing lists',
    ],
    looksPerWeek: -1, // unlimited
    closetItemLimit: -1,
  },
  PREMIUM: {
    id: 'pro',
    name: 'Premium',
    price: 28,
    features: [
      'Everything in Plus',
      'Quarterly human stylist review',
      'Capsule planning',
      'Priority trend drops',
      'Event styling sessions',
    ],
    looksPerWeek: -1,
    closetItemLimit: -1,
  },
} as const;

export const ITEM_CATEGORIES = [
  'tops',
  'bottoms',
  'dresses',
  'outerwear',
  'shoes',
  'accessories',
  'bags',
] as const;

export const CATEGORY_LABELS = {
  tops: 'Tops',
  bottoms: 'Bottoms',
  dresses: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessories: 'Accessories',
  bags: 'Bags',
};

export const LIFESTYLE_FILTERS = [
  'modest',
  'nursing-friendly',
  'sensory-friendly',
  'sustainable',
  'vegan',
] as const;

export const LIFESTYLE_FILTER_LABELS = {
  modest: 'Modest Wear',
  'nursing-friendly': 'Nursing Friendly',
  'sensory-friendly': 'Sensory Friendly',
  sustainable: 'Sustainable',
  vegan: 'Vegan Materials',
};

export const BODY_TYPES = ['petite', 'regular', 'tall', 'plus'] as const;

export const BODY_TYPE_LABELS = {
  petite: 'Petite',
  regular: 'Regular',
  tall: 'Tall',
  plus: 'Plus Size',
};

export const PRICE_BANDS = {
  BUDGET: { min: 0, max: 50, label: '$' },
  MODERATE: { min: 50, max: 150, label: '$$' },
  LUXURY: { min: 150, max: 1000, label: '$$$' },
  MIXED: { min: 0, max: 1000, label: 'Mixed' },
};

export const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const;

export const SEASON_LABELS = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};

// API Configuration (will be moved to env variables)
// For Expo Go on physical device, use your computer's local IP
// Find your IP: Windows (ipconfig), Mac/Linux (ifconfig)
// Example: 'http://192.168.1.100:3000/api'
const getBaseUrl = () => {
  // Use environment variable if set, otherwise default to localhost
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return 'http://localhost:3000/api';
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  TIMEOUT: 10000,
};

// Color palette for trend matching
export const TREND_COLORS = {
  'quiet-saffron': ['#F4A460', '#FFD700', '#FFA500'],
  'charcoal-denim': ['#36454F', '#4682B4', '#708090'],
  'silver-accents': ['#C0C0C0', '#E8E8E8', '#A9A9A9'],
  'forest-green': ['#228B22', '#2E8B57', '#3CB371'],
  'burgundy-blush': ['#800020', '#DC143C', '#FFB6C1'],
};

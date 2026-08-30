// Core domain types for the 33 Trends app

export type Occasion = 'home' | 'work' | 'going-out';

export interface TrendPalette {
  id: string;
  name: string;
  description: string;
  colors: string[];
  occasion: Occasion;
  weekStartDate: string;
  imageUrl?: string;
}

export interface Item {
  id: string;
  name: string;
  imageUrl: string;
  price?: number;
  originalPrice?: number;
  retailer?: string;
  affiliateLink?: string;
  category: ItemCategory;
  color?: string;
  sizeRange?: string[];
  brand?: string;
  inStock?: boolean;
  // Real wardrobe-tracking fields, carried over from ClosetItem when available
  wornCount?: number;
  lastWornDate?: string;
  purchaseDate?: string;
  createdAt?: string;
  tags?: string[];
  seasons?: string[];
  style?: string;
  occasion?: string;
  // Garment attributes that classifyGarmentImage already extracts and stores.
  // They were being dropped on the way into recommendations, which left the
  // engine guessing formality from keyword regexes over free-text tags.
  subcategory?: string;
  pattern?: string;
  fabricTexture?: string;
  fitType?: string;
}

export type ItemCategory = 
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'outerwear'
  | 'shoes'
  | 'accessories'
  | 'bags';

export interface Look {
  id: string;
  title: string;
  description?: string;
  occasion: Occasion;
  occasions?: string[];
  paletteId: string;
  palette?: TrendPalette;
  heroItem?: Item;
  alternateItems?: Item[];
  budgetDupes?: Item[];
  items?: Item[];
  tags: string[];
  createdAt: string;
  imageUrl: string;
  isFavorite?: boolean;
  isSponsored?: boolean;
  season?: Season | Season[];
}

export interface ClosetItem {
  id: string;
  userId: string;
  imageUrl: string;
  category: ItemCategory;
  subcategory?: string;
  color: string;
  brand?: string;
  season: Season[];
  occasion?: string;
  tags: string[];
  wornCount: number;
  lastWornDate?: string;
  purchaseDate?: string;
  notes?: string;
  isFavorite?: boolean;
  price?: number;
}

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface User {
  id: string;
  email: string;
  name: string;
  profileImageUrl?: string;
  subscriptionTier: SubscriptionTier;
  preferences: UserPreferences;
  createdAt: string;
}

export type SubscriptionTier = 'free' | 'premium' | 'pro';

export interface UserPreferences {
  occasions: Occasion[];
  favoriteColors: string[];
  budgetRange: PriceBand;
  bodyType?: BodyType;
  sizePreferences: SizePreferences;
  lifestyleFilters: LifestyleFilter[];
  stylePreferences: string[];
}

export type PriceBand = 'budget' | 'moderate' | 'luxury' | 'mixed';

export type BodyType = 'petite' | 'regular' | 'tall' | 'plus';

export interface SizePreferences {
  tops?: string;
  bottoms?: string;
  dresses?: string;
  shoes?: string;
}

export type LifestyleFilter = 
  | 'modest'
  | 'nursing-friendly'
  | 'sensory-friendly'
  | 'sustainable'
  | 'vegan';

export interface Stylist {
  id: string;
  name: string;
  bio: string;
  profileImageUrl: string;
  coverImageUrl?: string;
  specialties: string[];
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  availability: string[];
  yearsExperience: number;
  certifications?: string[];
  portfolio: PortfolioItem[];
  sessionTypes: SessionType[];
  languages?: string[];
  location?: string;
  isVerified: boolean;
  responseTime?: string;
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  description?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
}

export type SessionType = 'closet-audit' | 'shopping-assistance' | 'event-styling' | 'wardrobe-planning';

export interface StylingSession {
  id: string;
  userId: string;
  stylistId: string;
  stylist?: Stylist;
  sessionType: SessionType;
  scheduledDate: string;
  duration: number;
  status: SessionStatus;
  intakeResponses?: Record<string, any>;
  deliverables?: string[];
  notes?: string;
  price: number;
  meetingLink?: string;
  createdAt: string;
}

export type SessionStatus = 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';

export interface StylistReview {
  id: string;
  stylistId: string;
  userId: string;
  userName: string;
  userImageUrl?: string;
  rating: number;
  comment: string;
  sessionType: SessionType;
  createdAt: string;
  helpful: number;
  /** The reviewer's explicit yes/no answer; older reviews predate the field. */
  wouldRecommend?: boolean;
}

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

export interface FilterOptions {
  occasions?: Occasion[];
  priceMin?: number;
  priceMax?: number;
  priceRange?: [number, number];
  colors?: string[];
  sizes?: string[];
  lifestyleFilters?: string[];
  bodyTypes?: string[];
  retailers?: string[];
}

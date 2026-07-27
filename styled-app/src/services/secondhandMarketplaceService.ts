/**
 * Secondhand Marketplace Integration Service
 * 
 * Integrates with popular secondhand marketplaces like Poshmark, ThredUp, Depop, etc.
 * Provides search, recommendations, and sustainability insights for pre-owned fashion.
 */

import { Item } from '../types';

export type MarketplacePlatform = 'poshmark' | 'thredup' | 'depop' | 'vestiaire' | 'therealreal' | 'vinted';

export interface MarketplaceItem {
  id: string;
  platform: MarketplacePlatform;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  brand: string;
  size: string;
  condition: 'new-with-tags' | 'like-new' | 'excellent' | 'good' | 'fair';
  category: string;
  color: string;
  imageUrl: string;
  images: string[];
  seller: {
    id: string;
    name: string;
    rating: number;
    totalSales: number;
  };
  shipping: {
    cost: number;
    estimatedDays: number;
    free: boolean;
  };
  sustainability: {
    co2Saved: number;
    waterSaved: number;
    wasteReduced: number;
  };
  url: string;
  postedDate: string;
  views: number;
  likes: number;
}

export interface MarketplaceSearch {
  query: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  condition?: string[];
  platforms?: MarketplacePlatform[];
  sortBy?: 'price-low' | 'price-high' | 'newest' | 'popular';
}

export interface SearchResults {
  items: MarketplaceItem[];
  totalResults: number;
  platforms: {
    platform: MarketplacePlatform;
    count: number;
  }[];
  filters: {
    brands: string[];
    sizes: string[];
    priceRange: { min: number; max: number };
  };
}

export interface SimilarItemRecommendation {
  originalItem: Item;
  secondhandMatches: MarketplaceItem[];
  potentialSavings: {
    money: number;
    co2: number;
    water: number;
  };
  matchScore: number; // 0-100
}

export interface PlatformInfo {
  platform: MarketplacePlatform;
  name: string;
  description: string;
  specialties: string[];
  priceRange: string;
  shippingInfo: string;
  returnPolicy: string;
  url: string;
  logo: string;
  rating: number;
  userCount: string;
}

export interface SellingRecommendation {
  item: Item;
  estimatedValue: number;
  bestPlatforms: {
    platform: MarketplacePlatform;
    estimatedPrice: number;
    sellingTime: string;
    fees: number;
    netProfit: number;
  }[];
  tips: string[];
  photos: {
    required: number;
    tips: string[];
  };
}

export interface MarketplaceTrends {
  trending: {
    category: string;
    growth: number;
    avgPrice: number;
    topBrands: string[];
  }[];
  seasonalDeals: {
    category: string;
    discount: number;
    description: string;
  }[];
  popularSearches: string[];
}

class SecondhandMarketplaceService {
  private platforms: PlatformInfo[] = [
    {
      platform: 'poshmark',
      name: 'Poshmark',
      description: 'Social marketplace for fashion',
      specialties: ['Designer brands', 'Trendy fashion', 'Accessories'],
      priceRange: '$10-$500',
      shippingInfo: 'Flat rate $7.97',
      returnPolicy: '3 days',
      url: 'https://poshmark.com',
      logo: '👗',
      rating: 4.5,
      userCount: '80M+',
    },
    {
      platform: 'thredup',
      name: 'ThredUp',
      description: 'Online consignment and thrift store',
      specialties: ['Everyday fashion', 'Kids clothes', 'Plus size'],
      priceRange: '$5-$200',
      shippingInfo: 'Free over $79',
      returnPolicy: '14 days',
      url: 'https://thredup.com',
      logo: '♻️',
      rating: 4.3,
      userCount: '1M+',
    },
    {
      platform: 'depop',
      name: 'Depop',
      description: 'Peer-to-peer marketplace for unique fashion',
      specialties: ['Vintage', 'Streetwear', 'Y2K fashion'],
      priceRange: '$10-$300',
      shippingInfo: 'Varies by seller',
      returnPolicy: 'Seller dependent',
      url: 'https://depop.com',
      logo: '🛍️',
      rating: 4.4,
      userCount: '30M+',
    },
    {
      platform: 'vestiaire',
      name: 'Vestiaire Collective',
      description: 'Luxury pre-owned fashion',
      specialties: ['Designer bags', 'Luxury brands', 'Authenticated items'],
      priceRange: '$100-$5000',
      shippingInfo: 'Varies by location',
      returnPolicy: '14 days',
      url: 'https://vestiairecollective.com',
      logo: '💎',
      rating: 4.6,
      userCount: '10M+',
    },
    {
      platform: 'therealreal',
      name: 'The RealReal',
      description: 'Authenticated luxury consignment',
      specialties: ['High-end designer', 'Fine jewelry', 'Watches'],
      priceRange: '$50-$10000',
      shippingInfo: 'Free over $150',
      returnPolicy: '14 days',
      url: 'https://therealreal.com',
      logo: '👑',
      rating: 4.5,
      userCount: '25M+',
    },
    {
      platform: 'vinted',
      name: 'Vinted',
      description: 'Buy and sell secondhand clothes',
      specialties: ['Casual wear', 'Fast fashion', 'Budget friendly'],
      priceRange: '$5-$100',
      shippingInfo: 'Buyer pays',
      returnPolicy: '2 days',
      url: 'https://vinted.com',
      logo: '👕',
      rating: 4.2,
      userCount: '45M+',
    },
  ];

  /**
   * Search across marketplaces
   */
  async searchMarketplaces(search: MarketplaceSearch): Promise<SearchResults> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock results
    const items = this.generateMockItems(search);

    // Platform distribution
    const platformCounts = new Map<MarketplacePlatform, number>();
    items.forEach(item => {
      platformCounts.set(item.platform, (platformCounts.get(item.platform) || 0) + 1);
    });

    const platforms = Array.from(platformCounts.entries()).map(([platform, count]) => ({
      platform,
      count,
    }));

    // Extract filters
    const brands = [...new Set(items.map(item => item.brand))];
    const sizes = [...new Set(items.map(item => item.size))];
    const prices = items.map(item => item.price);

    return {
      items,
      totalResults: items.length,
      platforms,
      filters: {
        brands,
        sizes,
        priceRange: {
          min: Math.min(...prices),
          max: Math.max(...prices),
        },
      },
    };
  }

  /**
   * Generate mock marketplace items
   */
  private generateMockItems(search: MarketplaceSearch): MarketplaceItem[] {
    const count = 20;
    const items: MarketplaceItem[] = [];

    const platformOptions: MarketplacePlatform[] = search.platforms || [
      'poshmark', 'thredup', 'depop', 'vestiaire', 'therealreal', 'vinted'
    ];

    const brands = ['Zara', 'H&M', 'Nike', 'Adidas', 'Levi\'s', 'Gap', 'Uniqlo', 'Mango'];
    const conditions: MarketplaceItem['condition'][] = ['new-with-tags', 'like-new', 'excellent', 'good'];
    const sizes = ['XS', 'S', 'M', 'L', 'XL'];

    for (let i = 0; i < count; i++) {
      const platform = platformOptions[Math.floor(Math.random() * platformOptions.length)];
      const brand = search.brand || brands[Math.floor(Math.random() * brands.length)];
      const price = Math.floor(Math.random() * 80) + 20;
      const originalPrice = price * (1 + Math.random() * 0.5 + 0.5);

      items.push({
        id: `item-${i}`,
        platform,
        title: `${brand} ${search.query || 'Item'}`,
        description: 'Pre-owned item in great condition',
        price,
        originalPrice,
        discount: Math.round(((originalPrice - price) / originalPrice) * 100),
        brand,
        size: sizes[Math.floor(Math.random() * sizes.length)],
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        category: search.category || 'tops',
        color: 'Blue',
        imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b',
        images: [
          'https://images.unsplash.com/photo-1523381210434-271e8be1f52b',
          'https://images.unsplash.com/photo-1523381294911-8d3cead13475',
        ],
        seller: {
          id: `seller-${i}`,
          name: `Seller ${i + 1}`,
          rating: 4 + Math.random(),
          totalSales: Math.floor(Math.random() * 500) + 50,
        },
        shipping: {
          cost: Math.random() > 0.3 ? 0 : Math.floor(Math.random() * 10) + 5,
          estimatedDays: Math.floor(Math.random() * 5) + 3,
          free: Math.random() > 0.3,
        },
        sustainability: {
          co2Saved: Math.random() * 15 + 5,
          waterSaved: Math.random() * 2000 + 500,
          wasteReduced: Math.random() * 0.5 + 0.2,
        },
        url: `https://${platform}.com/item/${i}`,
        postedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        views: Math.floor(Math.random() * 1000) + 50,
        likes: Math.floor(Math.random() * 100) + 10,
      });
    }

    return items;
  }

  /**
   * Find similar secondhand items
   */
  async findSimilarItems(item: Item): Promise<SimilarItemRecommendation> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const search: MarketplaceSearch = {
      query: item.name,
      category: item.category,
      brand: item.brand,
    };

    const results = await this.searchMarketplaces(search);
    const matches = results.items.slice(0, 10);

    const avgPrice = matches.reduce((sum, m) => sum + m.price, 0) / matches.length;
    const avgOriginalPrice = item.price || 100;
    const moneySavings = avgOriginalPrice - avgPrice;

    const totalCO2Saved = matches.reduce((sum, m) => sum + m.sustainability.co2Saved, 0);
    const totalWaterSaved = matches.reduce((sum, m) => sum + m.sustainability.waterSaved, 0);

    return {
      originalItem: item,
      secondhandMatches: matches,
      potentialSavings: {
        money: moneySavings,
        co2: totalCO2Saved / matches.length,
        water: totalWaterSaved / matches.length,
      },
      matchScore: 85 + Math.random() * 15,
    };
  }

  /**
   * Get platform information
   */
  async getPlatformInfo(platform: MarketplacePlatform): Promise<PlatformInfo> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.platforms.find(p => p.platform === platform)!;
  }

  /**
   * Get all platforms
   */
  async getAllPlatforms(): Promise<PlatformInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.platforms;
  }

  /**
   * Get selling recommendations
   */
  async getSellingRecommendations(item: Item): Promise<SellingRecommendation> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const baseValue = item.price || 50;
    const estimatedValue = baseValue * 0.6; // 60% of original

    const bestPlatforms = [
      {
        platform: 'poshmark' as MarketplacePlatform,
        estimatedPrice: estimatedValue * 1.1,
        sellingTime: '7-14 days',
        fees: estimatedValue * 0.2,
        netProfit: estimatedValue * 0.88,
      },
      {
        platform: 'depop' as MarketplacePlatform,
        estimatedPrice: estimatedValue,
        sellingTime: '5-10 days',
        fees: estimatedValue * 0.1,
        netProfit: estimatedValue * 0.9,
      },
      {
        platform: 'thredup' as MarketplacePlatform,
        estimatedPrice: estimatedValue * 0.8,
        sellingTime: '30-60 days',
        fees: estimatedValue * 0.4,
        netProfit: estimatedValue * 0.48,
      },
    ];

    return {
      item,
      estimatedValue,
      bestPlatforms,
      tips: [
        'Take clear, well-lit photos from multiple angles',
        'Describe condition honestly and in detail',
        'Include measurements for accurate sizing',
        'Price competitively by checking similar listings',
        'Respond quickly to buyer questions',
      ],
      photos: {
        required: 4,
        tips: [
          'Front view on hanger or flat lay',
          'Back view showing details',
          'Close-up of any flaws or wear',
          'Tag/label showing brand and size',
        ],
      },
    };
  }

  /**
   * Get marketplace trends
   */
  async getMarketplaceTrends(): Promise<MarketplaceTrends> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      trending: [
        {
          category: 'Y2K Fashion',
          growth: 145,
          avgPrice: 35,
          topBrands: ['Juicy Couture', 'Von Dutch', 'Ed Hardy'],
        },
        {
          category: 'Vintage Denim',
          growth: 89,
          avgPrice: 45,
          topBrands: ['Levi\'s', 'Wrangler', 'Lee'],
        },
        {
          category: 'Sustainable Basics',
          growth: 67,
          avgPrice: 25,
          topBrands: ['Everlane', 'Patagonia', 'Reformation'],
        },
      ],
      seasonalDeals: [
        {
          category: 'Winter Coats',
          discount: 40,
          description: 'End of season clearance',
        },
        {
          category: 'Summer Dresses',
          discount: 30,
          description: 'Spring preview sale',
        },
      ],
      popularSearches: [
        'vintage jeans',
        'designer bags',
        'band tees',
        'leather jacket',
        'maxi dress',
      ],
    };
  }

  /**
   * Calculate total savings from secondhand shopping
   */
  async calculateSavings(purchases: MarketplaceItem[]): Promise<{
    totalMoneySaved: number;
    totalCO2Saved: number;
    totalWaterSaved: number;
    totalWasteReduced: number;
    equivalents: {
      trees: number;
      showers: number;
      landfillBags: number;
    };
  }> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const totalMoneySaved = purchases.reduce((sum, p) => {
      return sum + ((p.originalPrice || p.price * 2) - p.price);
    }, 0);

    const totalCO2Saved = purchases.reduce((sum, p) => sum + p.sustainability.co2Saved, 0);
    const totalWaterSaved = purchases.reduce((sum, p) => sum + p.sustainability.waterSaved, 0);
    const totalWasteReduced = purchases.reduce((sum, p) => sum + p.sustainability.wasteReduced, 0);

    return {
      totalMoneySaved,
      totalCO2Saved,
      totalWaterSaved,
      totalWasteReduced,
      equivalents: {
        trees: Math.ceil(totalCO2Saved / 20),
        showers: Math.ceil(totalWaterSaved / 50),
        landfillBags: Math.ceil(totalWasteReduced / 0.5),
      },
    };
  }
}

export const secondhandMarketplaceService = new SecondhandMarketplaceService();

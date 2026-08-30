/**
 * Smart Search & Discovery Service
 * 
 * AI-powered search with natural language queries, visual search,
 * filters, and personalized discovery.
 */

import { Item, Look } from '../types';
import { Post } from './socialFeedService';
import { UserProfile, userProfileService } from './userProfileService';
import { closetAPI, getCurrentUserId } from './api';
import { GUIDES } from '../screens/GuideScreens';

export type SearchCategory = 'all' | 'items' | 'looks' | 'posts' | 'users' | 'styles';
export type SortBy = 'relevance' | 'recent' | 'popular' | 'price_low' | 'price_high';

export interface SearchQuery {
  query: string;
  category: SearchCategory;
  filters?: SearchFilters;
  sortBy?: SortBy;
}

export interface SearchFilters {
  colors?: string[];
  categories?: string[];
  brands?: string[];
  priceRange?: { min: number; max: number };
  styles?: string[];
  occasions?: string[];
  seasons?: string[];
}

export interface SearchResult {
  id: string;
  type: 'item' | 'look' | 'post' | 'user' | 'style';
  title: string;
  subtitle?: string;
  imageUrl: string;
  relevanceScore: number;
  data: Item | Look | Post | UserProfile | StyleGuide;
  matchedTerms: string[];
}

export interface StyleGuide {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  tips: string[];
  relatedItems: string[];
}

export interface SearchSuggestion {
  query: string;
  category: SearchCategory;
}

export interface DiscoverySection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'trending' | 'recommended' | 'new' | 'popular' | 'curated';
  items: SearchResult[];
}

class SmartSearchService {
  private searchHistory: Map<string, SearchQuery[]> = new Map();

  // Static example queries showing what the search understands. These are not
  // "popular searches" - there is no usage data behind them, so they carry no
  // popularity numbers and are never framed as trending.
  private exampleSearches: SearchSuggestion[] = [
    { query: 'black jeans', category: 'items' },
    { query: 'white sneakers', category: 'items' },
    { query: 'navy blazer', category: 'items' },
    { query: 'summer dress', category: 'items' },
    { query: 'minimalist style', category: 'styles' },
    { query: 'streetwear', category: 'styles' },
    { query: 'work wardrobe', category: 'styles' },
    { query: 'vintage style', category: 'styles' },
  ];

  /**
   * Perform smart search
   */
  async search(userId: string, searchQuery: SearchQuery): Promise<SearchResult[]> {
    // Save to history
    this.addToHistory(userId, searchQuery);

    // Parse natural language query
    const parsedQuery = this.parseNaturalLanguage(searchQuery.query);

    // Get real searchable content (closet items + style guides), plus real users if relevant
    const includeUsers = searchQuery.category === 'all' || searchQuery.category === 'users';
    const [content, userResults] = await Promise.all([
      this.getAllSearchableContent(),
      includeUsers && searchQuery.query.trim()
        ? userProfileService.searchUsers(searchQuery.query).then(users =>
            users.map(
              (user): SearchResult => ({
                id: user.userId,
                type: 'user',
                title: user.displayName,
                subtitle: `@${user.username}`,
                imageUrl: user.profileImageUrl || '',
                relevanceScore: 0,
                data: user,
                matchedTerms: [],
              })
            )
          )
        : Promise.resolve([]),
    ]);
    const allResults = [...content, ...userResults];

    // Filter by category
    let filteredResults = searchQuery.category === 'all' 
      ? allResults 
      : allResults.filter(r => {
          if (searchQuery.category === 'styles') return r.type === 'style';
          if (searchQuery.category === 'items') return r.type === 'item';
          if (searchQuery.category === 'looks') return r.type === 'look';
          if (searchQuery.category === 'posts') return r.type === 'post';
          if (searchQuery.category === 'users') return r.type === 'user';
          return false;
        });

    // Apply filters
    if (searchQuery.filters) {
      filteredResults = this.applyFilters(filteredResults, searchQuery.filters);
    }

    // Calculate relevance scores
    const scoredResults = filteredResults.map(result => ({
      ...result,
      relevanceScore: this.calculateRelevanceScore(result, parsedQuery, searchQuery.query),
      matchedTerms: this.getMatchedTerms(result, parsedQuery),
    }));

    // Sort results
    const sortedResults = this.sortResults(scoredResults, searchQuery.sortBy || 'relevance');

    return sortedResults.slice(0, 50); // Limit to 50 results
  }

  /**
   * Parse natural language query
   */
  private parseNaturalLanguage(query: string): {
    keywords: string[];
    colors: string[];
    categories: string[];
    styles: string[];
    occasions: string[];
  } {
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(' ');

    // Extract colors
    const colorKeywords = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'gray', 'brown', 'beige', 'navy'];
    const colors = words.filter(w => colorKeywords.includes(w));

    // Extract categories
    const categoryKeywords = ['top', 'shirt', 'dress', 'pants', 'jeans', 'shoes', 'jacket', 'coat', 'sweater', 'skirt'];
    const categories = words.filter(w => categoryKeywords.some(k => w.includes(k)));

    // Extract styles
    const styleKeywords = ['casual', 'formal', 'minimalist', 'bohemian', 'vintage', 'streetwear', 'athleisure'];
    const styles = words.filter(w => styleKeywords.some(k => w.includes(k)));

    // Extract occasions
    const occasionKeywords = ['work', 'date', 'party', 'wedding', 'gym', 'casual', 'formal'];
    const occasions = words.filter(w => occasionKeywords.includes(w));

    return {
      keywords: words,
      colors,
      categories,
      styles,
      occasions,
    };
  }

  /**
   * Get all searchable content: the user's real closet items, plus static style guides
   */
  private async getAllSearchableContent(): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const response = await closetAPI.getItems(getCurrentUserId());
      const closetItems: Item[] = (response.data || []).map((item: any) => ({
        id: item.id,
        name: [item.color, item.brand, item.category].filter(Boolean).join(' ') || 'Item',
        imageUrl: item.imageUrl,
        category: item.category,
        color: item.color,
        brand: item.brand,
        price: item.price || 0,
        wornCount: item.wornCount,
        tags: item.tags,
        seasons: item.seasons,
      }));

      closetItems.forEach(item => {
        results.push({
          id: item.id,
          type: 'item',
          title: item.name,
          subtitle: item.brand ? `${item.brand}${item.price ? ` • $${item.price}` : ''}` : item.category,
          imageUrl: item.imageUrl,
          relevanceScore: 0,
          data: item,
          matchedTerms: [],
        });
      });
    } catch (error) {
      console.error('Error loading closet items for search:', error);
    }

    // Real style guides - the app's fifteen editorial guides, searchable by
    // title and description. The result id IS the guide's navigation route,
    // so tapping a style result opens the actual guide. (This replaced two
    // hardcoded mock guides that had nowhere to navigate to.)
    GUIDES.forEach(guide => {
      results.push({
        id: guide.route,
        type: 'style',
        title: guide.title,
        subtitle: guide.description,
        imageUrl: '',
        relevanceScore: 0,
        data: {
          id: guide.route,
          title: guide.title,
          description: guide.description,
          imageUrl: '',
          category: guide.label,
          tips: [],
          relatedItems: [],
        },
        matchedTerms: [],
      });
    });

    return results;
  }

  /**
   * Apply filters to results
   */
  private applyFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
    let filtered = results;

    if (filters.colors && filters.colors.length > 0) {
      filtered = filtered.filter(r => {
        if (r.type === 'item') {
          const item = r.data as Item;
          return filters.colors!.some(c => item.color?.toLowerCase().includes(c.toLowerCase()));
        }
        return true;
      });
    }

    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(r => {
        if (r.type === 'item') {
          const item = r.data as Item;
          return filters.categories!.includes(item.category);
        }
        return true;
      });
    }

    if (filters.brands && filters.brands.length > 0) {
      filtered = filtered.filter(r => {
        if (r.type === 'item') {
          const item = r.data as Item;
          return item.brand && filters.brands!.includes(item.brand);
        }
        return true;
      });
    }

    if (filters.priceRange) {
      filtered = filtered.filter(r => {
        if (r.type === 'item') {
          const item = r.data as Item;
          return item.price && 
                 item.price >= filters.priceRange!.min && 
                 item.price <= filters.priceRange!.max;
        }
        return true;
      });
    }

    return filtered;
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(
    result: SearchResult,
    parsedQuery: ReturnType<typeof this.parseNaturalLanguage>,
    originalQuery: string
  ): number {
    let score = 0;
    const lowerTitle = result.title.toLowerCase();
    const lowerSubtitle = result.subtitle?.toLowerCase() || '';
    const lowerQuery = originalQuery.toLowerCase();

    // Exact match
    if (lowerTitle.includes(lowerQuery)) {
      score += 100;
    }

    // Keyword matches
    parsedQuery.keywords.forEach(keyword => {
      if (lowerTitle.includes(keyword)) score += 20;
      if (lowerSubtitle.includes(keyword)) score += 10;
    });

    // Color matches
    if (result.type === 'item') {
      const item = result.data as Item;
      parsedQuery.colors.forEach(color => {
        if (item.color?.toLowerCase().includes(color)) score += 30;
      });
    }

    // Category matches
    if (result.type === 'item') {
      const item = result.data as Item;
      parsedQuery.categories.forEach(cat => {
        if (item.category.toLowerCase().includes(cat)) score += 25;
      });
    }

    // Style matches
    if (result.type === 'style') {
      const guide = result.data as StyleGuide;
      parsedQuery.styles.forEach(style => {
        if (guide.category.toLowerCase().includes(style)) score += 40;
      });
    }

    return score;
  }

  /**
   * Get matched terms
   */
  private getMatchedTerms(
    result: SearchResult,
    parsedQuery: ReturnType<typeof this.parseNaturalLanguage>
  ): string[] {
    const matched: string[] = [];
    const lowerTitle = result.title.toLowerCase();

    parsedQuery.keywords.forEach(keyword => {
      if (lowerTitle.includes(keyword)) {
        matched.push(keyword);
      }
    });

    return matched;
  }

  /**
   * Sort results
   */
  private sortResults(results: SearchResult[], sortBy: SortBy): SearchResult[] {
    const sorted = [...results];

    switch (sortBy) {
      case 'relevance':
        sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
      case 'recent':
        // closetAPI.getItems returns items newest-first (createdAt desc) and
        // getAllSearchableContent preserves that order, so "recently added"
        // is the insertion order - nothing to re-sort.
        break;
      case 'popular':
        // "Most worn" - the only real popularity signal the app has is the
        // user's own wear counts. Non-item results sink to the end.
        sorted.sort((a, b) => {
          const wornA = a.type === 'item' ? (a.data as Item).wornCount || 0 : -1;
          const wornB = b.type === 'item' ? (b.data as Item).wornCount || 0 : -1;
          return wornB - wornA;
        });
        break;
      case 'price_low':
        sorted.sort((a, b) => {
          const priceA = a.type === 'item' ? (a.data as Item).price || 0 : 0;
          const priceB = b.type === 'item' ? (b.data as Item).price || 0 : 0;
          return priceA - priceB;
        });
        break;
      case 'price_high':
        sorted.sort((a, b) => {
          const priceA = a.type === 'item' ? (a.data as Item).price || 0 : 0;
          const priceB = b.type === 'item' ? (b.data as Item).price || 0 : 0;
          return priceB - priceA;
        });
        break;
    }

    return sorted;
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    if (!query.trim()) {
      return this.exampleSearches.slice(0, 5);
    }

    const lowerQuery = query.toLowerCase();

    // Filter suggestions that match query
    const filtered = this.exampleSearches.filter(s =>
      s.query.toLowerCase().includes(lowerQuery)
    );

    return filtered.slice(0, 5);
  }

  /**
   * Get discovery sections
   */
  async getDiscoverySections(userId: string): Promise<DiscoverySection[]> {
    const allResults = await this.getAllSearchableContent();
    const items = allResults.filter(r => r.type === 'item');

    // "Trending" proxy: most-worn real items (real signal, no external trend feed exists)
    const trending = [...items].sort(
      (a, b) => ((b.data as Item).wornCount || 0) - ((a.data as Item).wornCount || 0)
    );

    // "New" = most recently added items are already returned first by closetAPI.getItems
    // (ordered by createdAt desc), so the natural array order works here.
    const newest = items;

    // "Recommended" = least-worn real items, to nudge rediscovery of underused pieces
    const recommended = [...items].sort(
      (a, b) => ((a.data as Item).wornCount || 0) - ((b.data as Item).wornCount || 0)
    );

    return [
      {
        id: 'trending',
        title: 'Most Worn',
        subtitle: 'Your go-to pieces',
        type: 'trending',
        items: trending.slice(0, 5),
      },
      {
        id: 'recommended',
        title: 'Rediscover',
        subtitle: 'Items you haven\'t worn in a while',
        type: 'recommended',
        items: recommended.slice(0, 5),
      },
      {
        id: 'new',
        title: 'Newest Additions',
        subtitle: 'Recently added to your closet',
        type: 'new',
        items: newest.slice(0, 5),
      },
    ];
  }

  /**
   * Get search history
   */
  async getSearchHistory(userId: string): Promise<SearchQuery[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.searchHistory.get(userId) || [];
  }

  /**
   * Clear search history
   */
  async clearSearchHistory(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    this.searchHistory.delete(userId);
  }

  /**
   * Add to search history
   */
  private addToHistory(userId: string, query: SearchQuery): void {
    const history = this.searchHistory.get(userId) || [];
    history.unshift(query);
    
    // Keep only last 20 searches
    if (history.length > 20) {
      history.pop();
    }
    
    this.searchHistory.set(userId, history);
  }
}

export const smartSearchService = new SmartSearchService();

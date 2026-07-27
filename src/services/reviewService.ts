/**
 * Review Service
 * 
 * Manages stylist reviews and ratings.
 * Allows users to rate and review their styling sessions.
 */

import { StylistReview, SessionType } from '../types';

export interface ReviewSubmission {
  stylistId: string;
  sessionId: string;
  sessionType: SessionType;
  rating: number;
  comment: string;
  tags?: string[];
  wouldRecommend: boolean;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
  topTags: { tag: string; count: number }[];
  recommendationRate: number;
}

class ReviewService {
  private reviews: Map<string, StylistReview[]> = new Map();

  /**
   * Submit a review for a stylist
   */
  async submitReview(submission: ReviewSubmission): Promise<StylistReview> {
    // Validate rating
    if (submission.rating < 1 || submission.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // In production, would save to backend
    await new Promise(resolve => setTimeout(resolve, 500));

    const review: StylistReview = {
      id: `review-${Date.now()}`,
      stylistId: submission.stylistId,
      userId: 'current-user',
      userName: 'You',
      rating: submission.rating,
      comment: submission.comment,
      sessionType: submission.sessionType,
      createdAt: new Date().toISOString(),
      helpful: 0,
    };

    const stylistReviews = this.reviews.get(submission.stylistId) || [];
    stylistReviews.push(review);
    this.reviews.set(submission.stylistId, stylistReviews);

    return review;
  }

  /**
   * Get reviews for a stylist
   */
  async getStylistReviews(stylistId: string, limit?: number): Promise<StylistReview[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const reviews = this.reviews.get(stylistId) || [];
    
    // Sort by date (newest first)
    const sorted = reviews.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get review statistics for a stylist
   */
  async getReviewStats(stylistId: string): Promise<ReviewStats> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const reviews = await this.getStylistReviews(stylistId);
    
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {},
        topTags: [],
        recommendationRate: 0,
      };
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Calculate rating distribution
    const ratingDistribution: { [key: number]: number } = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    };
    reviews.forEach(r => {
      ratingDistribution[r.rating]++;
    });

    return {
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution,
      topTags: [],
      recommendationRate: 0.95, // Mock
    };
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string): Promise<boolean> {
    for (const reviews of this.reviews.values()) {
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        review.helpful++;
        await new Promise(resolve => setTimeout(resolve, 200));
        return true;
      }
    }
    return false;
  }

  /**
   * Report a review
   */
  async reportReview(reviewId: string, reason: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In production, would flag review for moderation
    console.log(`Review ${reviewId} reported: ${reason}`);
    return true;
  }

  /**
   * Update a review
   */
  async updateReview(reviewId: string, rating: number, comment: string): Promise<StylistReview | null> {
    for (const reviews of this.reviews.values()) {
      const review = reviews.find(r => r.id === reviewId);
      if (review && review.userId === 'current-user') {
        review.rating = rating;
        review.comment = comment;
        
        await new Promise(resolve => setTimeout(resolve, 300));
        return review;
      }
    }
    return null;
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string): Promise<boolean> {
    for (const [stylistId, reviews] of this.reviews.entries()) {
      const index = reviews.findIndex(r => r.id === reviewId && r.userId === 'current-user');
      if (index !== -1) {
        reviews.splice(index, 1);
        this.reviews.set(stylistId, reviews);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
      }
    }
    return false;
  }

  /**
   * Get user's review for a stylist
   */
  async getUserReview(stylistId: string, userId: string = 'current-user'): Promise<StylistReview | null> {
    const reviews = await this.getStylistReviews(stylistId);
    return reviews.find(r => r.userId === userId) || null;
  }

  /**
   * Check if user has reviewed a session
   */
  async hasReviewedSession(sessionId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In production, would check backend
    // For now, return false to allow testing
    return false;
  }

  /**
   * Get reviews by rating
   */
  async getReviewsByRating(stylistId: string, rating: number): Promise<StylistReview[]> {
    const reviews = await this.getStylistReviews(stylistId);
    return reviews.filter(r => r.rating === rating);
  }

  /**
   * Get recent reviews across all stylists
   */
  async getRecentReviews(limit: number = 10): Promise<StylistReview[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const allReviews: StylistReview[] = [];
    for (const reviews of this.reviews.values()) {
      allReviews.push(...reviews);
    }
    
    return allReviews
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Create mock reviews for testing
   */
  async createMockReviews(stylistId: string): Promise<void> {
    const mockReviews: Omit<StylistReview, 'id'>[] = [
      {
        stylistId,
        userId: 'user-1',
        userName: 'Sarah M.',
        rating: 5,
        comment: 'Absolutely amazing experience! Emma transformed my entire wardrobe and gave me so much confidence. Highly recommend!',
        sessionType: 'closet-audit',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        helpful: 12,
      },
      {
        stylistId,
        userId: 'user-2',
        userName: 'Michael K.',
        rating: 5,
        comment: 'Professional, knowledgeable, and so easy to work with. Worth every penny!',
        sessionType: 'wardrobe-planning',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        helpful: 8,
      },
      {
        stylistId,
        userId: 'user-3',
        userName: 'Jessica L.',
        rating: 4,
        comment: 'Great session! Very helpful recommendations. Would have liked a bit more time for questions.',
        sessionType: 'shopping-assistance',
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        helpful: 5,
      },
      {
        stylistId,
        userId: 'user-4',
        userName: 'David R.',
        rating: 5,
        comment: 'Emma helped me find my personal style. The before/after difference is incredible!',
        sessionType: 'closet-audit',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        helpful: 15,
      },
    ];

    for (const reviewData of mockReviews) {
      const review: StylistReview = {
        id: `review-${Date.now()}-${Math.random()}`,
        ...reviewData,
      };
      
      const stylistReviews = this.reviews.get(stylistId) || [];
      stylistReviews.push(review);
      this.reviews.set(stylistId, stylistReviews);
    }
  }
}

export const reviewService = new ReviewService();

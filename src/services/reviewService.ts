/**
 * Review Service
 *
 * Manages stylist reviews and ratings. Backed by the same real Firestore
 * `reviews` collection as stylistAPI.getStylistReviews, so a review submitted
 * here immediately shows up on the stylist's profile - these used to be two
 * disconnected mock stores.
 */

import { StylistReview, SessionType } from '../types';
import { reviewsService } from './firestore';
import { getCurrentUserId, getCurrentUserName } from './firebaseApi';

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
  /**
   * Submit a review for a stylist, under the real signed-in user
   */
  async submitReview(submission: ReviewSubmission): Promise<StylistReview> {
    if (submission.rating < 1 || submission.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    return reviewsService.submit(
      getCurrentUserId(),
      getCurrentUserName(),
      submission.stylistId,
      submission.sessionId,
      submission.sessionType,
      submission.rating,
      submission.comment
    );
  }

  /**
   * Get reviews for a stylist
   */
  async getStylistReviews(stylistId: string, limit?: number): Promise<StylistReview[]> {
    const reviews = await reviewsService.getForStylist(stylistId);
    return limit ? reviews.slice(0, limit) : reviews;
  }

  /**
   * Get review statistics for a stylist, computed from real reviews
   */
  async getReviewStats(stylistId: string): Promise<ReviewStats> {
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

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
    });

    const recommendationRate = reviews.filter(r => r.rating >= 4).length / reviews.length;

    return {
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution,
      topTags: [],
      recommendationRate,
    };
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string): Promise<boolean> {
    await reviewsService.markHelpful(reviewId);
    return true;
  }

  /**
   * Report a review
   */
  async reportReview(reviewId: string, reason: string): Promise<boolean> {
    console.log(`Review ${reviewId} reported: ${reason}`);
    // Moderation queue is a future addition - not yet backed by a real store.
    return true;
  }

  /**
   * Update a review (only the author should call this - Firestore rules enforce it)
   */
  async updateReview(reviewId: string, rating: number, comment: string): Promise<void> {
    await reviewsService.update(reviewId, rating, comment);
  }

  /**
   * Delete a review (only the author should call this - Firestore rules enforce it)
   */
  async deleteReview(reviewId: string): Promise<boolean> {
    await reviewsService.delete(reviewId);
    return true;
  }

  /**
   * Get the signed-in user's review for a stylist, if they left one
   */
  async getUserReview(stylistId: string): Promise<StylistReview | null> {
    return reviewsService.getForUser(stylistId, getCurrentUserId());
  }

  /**
   * Check if the signed-in user has already reviewed a given session
   */
  async hasReviewedSession(stylistId: string, sessionId: string): Promise<boolean> {
    const reviews = await this.getStylistReviews(stylistId);
    return reviews.some(r => (r as any).sessionId === sessionId && r.userId === getCurrentUserId());
  }

  /**
   * Get reviews by rating
   */
  async getReviewsByRating(stylistId: string, rating: number): Promise<StylistReview[]> {
    const reviews = await this.getStylistReviews(stylistId);
    return reviews.filter(r => r.rating === rating);
  }
}

export const reviewService = new ReviewService();

/**
 * Before/After Photo Service
 * 
 * Manages transformation photos for styling sessions.
 * Tracks before and after photos to showcase results.
 */

export interface BeforeAfterPhoto {
  id: string;
  sessionId: string;
  type: 'before' | 'after';
  imageUrl: string;
  caption?: string;
  takenAt: string;
  category: PhotoCategory;
  isPublic: boolean;
  uploadedBy: 'user' | 'stylist';
}

export type PhotoCategory = 'full-outfit' | 'closet' | 'detail' | 'accessory' | 'comparison';

export interface PhotoPair {
  id: string;
  sessionId: string;
  beforePhoto: BeforeAfterPhoto;
  afterPhoto: BeforeAfterPhoto;
  caption?: string;
  createdAt: string;
}

export interface TransformationGallery {
  sessionId: string;
  stylistId: string;
  pairs: PhotoPair[];
  totalPhotos: number;
}

class BeforeAfterService {
  private photos: Map<string, BeforeAfterPhoto[]> = new Map();
  private pairs: Map<string, PhotoPair[]> = new Map();

  /**
   * Upload a before or after photo
   */
  async uploadPhoto(
    sessionId: string,
    type: 'before' | 'after',
    imageUri: string,
    category: PhotoCategory,
    caption?: string,
    isPublic: boolean = true
  ): Promise<BeforeAfterPhoto> {
    // In production, would upload to cloud storage (S3, Firebase Storage, etc.)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const photo: BeforeAfterPhoto = {
      id: `photo-${Date.now()}`,
      sessionId,
      type,
      imageUrl: imageUri, // In production, this would be the cloud URL
      caption,
      takenAt: new Date().toISOString(),
      category,
      isPublic,
      uploadedBy: 'user',
    };

    const sessionPhotos = this.photos.get(sessionId) || [];
    sessionPhotos.push(photo);
    this.photos.set(sessionId, sessionPhotos);

    return photo;
  }

  /**
   * Get all photos for a session
   */
  async getSessionPhotos(sessionId: string): Promise<BeforeAfterPhoto[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.photos.get(sessionId) || [];
  }

  /**
   * Get before photos for a session
   */
  async getBeforePhotos(sessionId: string): Promise<BeforeAfterPhoto[]> {
    const photos = await this.getSessionPhotos(sessionId);
    return photos.filter(p => p.type === 'before');
  }

  /**
   * Get after photos for a session
   */
  async getAfterPhotos(sessionId: string): Promise<BeforeAfterPhoto[]> {
    const photos = await this.getSessionPhotos(sessionId);
    return photos.filter(p => p.type === 'after');
  }

  /**
   * Create a before/after pair
   */
  async createPhotoPair(
    sessionId: string,
    beforePhotoId: string,
    afterPhotoId: string,
    caption?: string
  ): Promise<PhotoPair> {
    const photos = await this.getSessionPhotos(sessionId);
    const beforePhoto = photos.find(p => p.id === beforePhotoId);
    const afterPhoto = photos.find(p => p.id === afterPhotoId);

    if (!beforePhoto || !afterPhoto) {
      throw new Error('Photos not found');
    }

    const pair: PhotoPair = {
      id: `pair-${Date.now()}`,
      sessionId,
      beforePhoto,
      afterPhoto,
      caption,
      createdAt: new Date().toISOString(),
    };

    const sessionPairs = this.pairs.get(sessionId) || [];
    sessionPairs.push(pair);
    this.pairs.set(sessionId, sessionPairs);

    return pair;
  }

  /**
   * Get photo pairs for a session
   */
  async getPhotoPairs(sessionId: string): Promise<PhotoPair[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.pairs.get(sessionId) || [];
  }

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: string): Promise<boolean> {
    for (const [sessionId, photos] of this.photos.entries()) {
      const index = photos.findIndex(p => p.id === photoId);
      if (index !== -1) {
        photos.splice(index, 1);
        this.photos.set(sessionId, photos);
        
        // In production, would also delete from cloud storage
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
      }
    }
    return false;
  }

  /**
   * Update photo privacy
   */
  async updatePhotoPrivacy(photoId: string, isPublic: boolean): Promise<boolean> {
    for (const photos of this.photos.values()) {
      const photo = photos.find(p => p.id === photoId);
      if (photo) {
        photo.isPublic = isPublic;
        await new Promise(resolve => setTimeout(resolve, 200));
        return true;
      }
    }
    return false;
  }

  /**
   * Get transformation gallery for a stylist
   */
  async getStylistGallery(stylistId: string): Promise<PhotoPair[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In production, would query backend for stylist's public transformations
    const allPairs: PhotoPair[] = [];
    for (const pairs of this.pairs.values()) {
      allPairs.push(...pairs.filter(p => p.beforePhoto.isPublic && p.afterPhoto.isPublic));
    }
    
    return allPairs;
  }

  /**
   * Create mock transformation data
   */
  async createMockTransformation(sessionId: string): Promise<void> {
    // Mock before photo
    const beforePhoto = await this.uploadPhoto(
      sessionId,
      'before',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400',
      'full-outfit',
      'Before styling session',
      true
    );

    // Mock after photo
    const afterPhoto = await this.uploadPhoto(
      sessionId,
      'after',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
      'full-outfit',
      'After styling session - new look!',
      true
    );

    // Create pair
    await this.createPhotoPair(
      sessionId,
      beforePhoto.id,
      afterPhoto.id,
      'Complete style transformation'
    );

    // Additional before photo (closet)
    await this.uploadPhoto(
      sessionId,
      'before',
      'https://images.unsplash.com/photo-1558769132-cb1aea1c8e5d?w=400',
      'closet',
      'Closet before organization',
      true
    );

    // Additional after photo (closet)
    await this.uploadPhoto(
      sessionId,
      'after',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
      'closet',
      'Organized and curated closet',
      true
    );
  }

  /**
   * Share transformation
   */
  async shareTransformation(pairId: string, platform: 'instagram' | 'facebook' | 'twitter'): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // In production, would generate shareable link or integrate with social APIs
    return `https://styled.app/transformation/${pairId}`;
  }

  /**
   * Export transformation as image
   */
  async exportComparison(pairId: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In production, would generate side-by-side comparison image
    return `https://styled.app/exports/${pairId}.jpg`;
  }
}

export const beforeAfterService = new BeforeAfterService();

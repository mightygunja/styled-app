import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { classifyGarmentImage, generateGarmentTags, suggestSeasons } from '../services/aiClassificationService';
import { uploadImage, uploadFromBase64, deleteImage } from '../services/cloudStorageService';
import { generateImageEmbedding, findSimilarItems } from '../services/embeddingService';

const prisma = new PrismaClient();

// GET /api/closet/items - Get all closet items for a user
export const getClosetItems = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const { category, color, season } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // Build filter
    const where: any = { userId: userId as string };
    
    if (category) {
      where.category = category as string;
    }
    
    if (color) {
      where.color = { contains: color as string, mode: 'insensitive' };
    }
    
    if (season) {
      where.seasons = { has: season as string };
    }

    const items = await prisma.closetItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    console.error('Error fetching closet items:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch closet items' });
  }
};

// GET /api/closet/items/:id - Get single closet item
export const getClosetItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await prisma.closetItem.findUnique({
      where: { id },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching closet item:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch item' });
  }
};

// POST /api/closet/items - Create new closet item
export const createClosetItem = async (req: Request, res: Response) => {
  console.log('=== CREATE CLOSET ITEM REQUEST RECEIVED ===');
  console.log('Request body keys:', Object.keys(req.body));
  
  try {
    const {
      userId,
      imageUrl,
      thumbnailUrl,
      category,
      subcategory,
      color,
      secondaryColors,
      pattern,
      neckline,
      sleeveLength,
      fitType,
      fabricTexture,
      style,
      brand,
      seasons,
      tags,
      isFavorite,
      purchaseDate,
      notes,
      embedding,
      aiConfidence,
      useAI = true, // Enable AI classification by default
    } = req.body;

    console.log('useAI:', useAI, 'category:', category, 'color:', color);

    // Validate required fields
    if (!userId || !imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'userId and imageUrl are required',
      });
    }

    // Handle image upload
    let cloudImageUrl = imageUrl;
    let cloudThumbnailUrl = thumbnailUrl;

    // Check if already a Cloudinary URL
    if (imageUrl.includes('res.cloudinary.com')) {
      console.log('Image already on Cloudinary:', imageUrl);
      cloudImageUrl = imageUrl;
      // Generate thumbnail URL from existing Cloudinary URL
      const urlParts = imageUrl.split('/upload/');
      if (urlParts.length > 1) {
        const pathAfterUpload = urlParts[1];
        cloudThumbnailUrl = `${urlParts[0]}/upload/c_fill,h_400,w_300/q_auto:low/${pathAfterUpload}`;
      }
    } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      console.log('Uploading image to cloud storage...');
      try {
        const uploadResult = await uploadFromBase64(imageUrl, 'closet-items');
        cloudImageUrl = uploadResult.url;
        cloudThumbnailUrl = uploadResult.thumbnailUrl;
        console.log('Image uploaded to cloud:', cloudImageUrl);
      } catch (uploadError) {
        console.error('Failed to upload image:', uploadError);
        return res.status(500).json({
          success: false,
          error: 'Failed to upload image to cloud storage',
        });
      }
    }

    let finalData: any = {
      userId,
      imageUrl: cloudImageUrl,
      thumbnailUrl: cloudThumbnailUrl,
      category: category || 'tops',
      color: color || 'unknown',
      brand,
      notes,
      isFavorite: isFavorite || false,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
    };

    // Try AI classification if enabled
    if (useAI) {
      console.log('Running AI classification on image:', cloudImageUrl);
      
      try {
        const classification = await classifyGarmentImage(cloudImageUrl);
        const aiTags = await generateGarmentTags(classification);
        const aiSeasons = await suggestSeasons(classification);

        // Use AI results, but allow manual overrides
        finalData = {
          ...finalData,
          category: category || classification.category,
          subcategory: subcategory || classification.subcategory,
          color: color || classification.color,
          secondaryColors: secondaryColors || classification.secondaryColors || [],
          pattern: pattern || classification.pattern,
          neckline: neckline || classification.neckline,
          sleeveLength: sleeveLength || classification.sleeveLength,
          fitType: fitType || classification.fitType,
          fabricTexture: fabricTexture || classification.fabricTexture,
          style: style || classification.style,
          seasons: seasons || aiSeasons,
          tags: tags || aiTags,
          aiConfidence: classification.confidence,
        };

        console.log('AI Classification complete:', classification);
      } catch (aiError) {
        console.error('AI classification failed (network blocked?), using manual data:', aiError);
        // Continue with manual data if AI fails - set basic defaults
        finalData = {
          ...finalData,
          subcategory,
          secondaryColors: secondaryColors || [],
          pattern: pattern || 'solid',
          neckline,
          sleeveLength,
          fitType,
          fabricTexture,
          style: style || 'casual',
          seasons: seasons || [],
          tags: tags || [category, color].filter(Boolean),
          aiConfidence: 0,
        };
      }
    } else {
      // Use manual data
      finalData = {
        ...finalData,
        subcategory,
        secondaryColors: secondaryColors || [],
        pattern,
        neckline,
        sleeveLength,
        fitType,
        fabricTexture,
        style,
        seasons: seasons || [],
        tags: tags || [],
        aiConfidence,
      };
    }

    // Generate CLIP embedding for visual similarity search
    try {
      console.log('Generating CLIP embedding...');
      const embedding = await generateImageEmbedding(cloudImageUrl);
      finalData.embedding = embedding;
      console.log('CLIP embedding generated successfully');
    } catch (embeddingError) {
      console.error('Failed to generate embedding:', embeddingError);
      // Continue without embedding - can be generated later
    }

    const item = await prisma.closetItem.create({
      data: finalData,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating closet item:', error);
    res.status(500).json({ success: false, error: 'Failed to create item' });
  }
};

// PUT /api/closet/items/:id - Update closet item
export const updateClosetItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Handle date fields
    if (updateData.purchaseDate) {
      updateData.purchaseDate = new Date(updateData.purchaseDate);
    }
    if (updateData.lastWornDate) {
      updateData.lastWornDate = new Date(updateData.lastWornDate);
    }

    const item = await prisma.closetItem.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error updating closet item:', error);
    res.status(500).json({ success: false, error: 'Failed to update item' });
  }
};

// DELETE /api/closet/items/:id - Delete closet item
export const deleteClosetItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.closetItem.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting closet item:', error);
    res.status(500).json({ success: false, error: 'Failed to delete item' });
  }
};

// POST /api/closet/items/:id/worn - Mark item as worn
export const markItemWorn = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await prisma.closetItem.update({
      where: { id },
      data: {
        wornCount: { increment: 1 },
        lastWornDate: new Date(),
      },
    });

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error marking item as worn:', error);
    res.status(500).json({ success: false, error: 'Failed to update item' });
  }
};

// GET /api/closet/stats - Get closet statistics
export const getClosetStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const totalItems = await prisma.closetItem.count({
      where: { userId: userId as string },
    });

    const itemsByCategory = await prisma.closetItem.groupBy({
      by: ['category'],
      where: { userId: userId as string },
      _count: true,
    });

    const favoriteItems = await prisma.closetItem.count({
      where: { userId: userId as string, isFavorite: true },
    });

    const mostWornItems = await prisma.closetItem.findMany({
      where: { userId: userId as string },
      orderBy: { wornCount: 'desc' },
      take: 5,
    });

    res.json({
      success: true,
      data: {
        totalItems,
        itemsByCategory,
        favoriteItems,
        mostWornItems,
      },
    });
  } catch (error) {
    console.error('Error fetching closet stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};

// GET /api/closet/items/:id/similar - Find similar items using CLIP embeddings
export const findSimilarClosetItems = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 10, minSimilarity = 0.7 } = req.query;

    // Get the target item
    const targetItem = await prisma.closetItem.findUnique({
      where: { id },
    });

    if (!targetItem) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    if (!targetItem.embedding || (targetItem.embedding as any).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Item does not have an embedding. Please regenerate embeddings.',
      });
    }

    // Get all other items from the same user
    const allItems = await prisma.closetItem.findMany({
      where: {
        userId: targetItem.userId,
        id: { not: id }, // Exclude the target item
      },
    });

    // Find similar items
    const similarItems = findSimilarItems(
      targetItem.embedding as number[],
      allItems.map(item => ({
        ...item,
        embedding: item.embedding as number[] | null,
      })),
      parseInt(limit as string),
      parseFloat(minSimilarity as string)
    );

    res.json({
      success: true,
      data: similarItems,
      count: similarItems.length,
    });
  } catch (error) {
    console.error('Error finding similar items:', error);
    res.status(500).json({ success: false, error: 'Failed to find similar items' });
  }
};

// GET /api/closet/shop-my-closet/:lookId - Find closet items similar to a look
export const shopMyCloset = async (req: Request, res: Response) => {
  try {
    const { lookId } = req.params;
    const { userId } = req.query;
    const { limit = 10, minSimilarity = 0.6 } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // Get the look
    const look = await prisma.look.findUnique({
      where: { id: lookId },
    });

    if (!look) {
      return res.status(404).json({ success: false, error: 'Look not found' });
    }

    // Generate embedding for look if it doesn't exist
    let lookEmbedding = look.embedding as number[] | null;
    if (!lookEmbedding || lookEmbedding.length === 0) {
      console.log('Generating embedding for look:', look.id);
      try {
        lookEmbedding = await generateImageEmbedding(look.imageUrl);
        // Update look with embedding
        await prisma.look.update({
          where: { id: lookId },
          data: { embedding: lookEmbedding },
        });
      } catch (error) {
        console.error('Failed to generate look embedding:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to generate look embedding',
        });
      }
    }

    // Get all user's closet items
    const closetItems = await prisma.closetItem.findMany({
      where: { userId: userId as string },
    });

    // Find similar items
    const similarItems = findSimilarItems(
      lookEmbedding,
      closetItems.map(item => ({
        ...item,
        embedding: item.embedding as number[] | null,
      })),
      parseInt(limit as string),
      parseFloat(minSimilarity as string)
    );

    res.json({
      success: true,
      data: similarItems,
      count: similarItems.length,
      look: {
        id: look.id,
        title: look.title,
        imageUrl: look.imageUrl,
      },
    });
  } catch (error) {
    console.error('Error in shop my closet:', error);
    res.status(500).json({ success: false, error: 'Failed to find similar items' });
  }
};

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/looks - Get looks with filters
export const getAllLooks = async (req: Request, res: Response) => {
  try {
    const { 
      occasion, 
      paletteId, 
      limit = '20', 
      offset = '0',
      priceMin,
      priceMax,
      color,
    } = req.query;

    const looks = await prisma.look.findMany({
      where: {
        ...(occasion && { occasion: occasion as string }),
        ...(paletteId && { paletteId: paletteId as string }),
      },
      include: {
        palette: true,
        items: {
          include: {
            item: true,
          },
        },
        _count: {
          select: { favoritedBy: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.look.count({
      where: {
        ...(occasion && { occasion: occasion as string }),
        ...(paletteId && { paletteId: paletteId as string }),
      },
    });

    res.json({
      success: true,
      data: looks,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching looks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch looks',
    });
  }
};

// GET /api/looks/:id - Get specific look with items
export const getLookById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Look ID is required',
      });
    }

    const look = await prisma.look.findUnique({
      where: { id },
      include: {
        palette: true,
        items: {
          include: {
            item: true,
          },
        },
        _count: {
          select: { favoritedBy: true },
        },
      },
    });

    if (!look) {
      return res.status(404).json({
        success: false,
        error: 'Look not found',
      });
    }

    res.json({
      success: true,
      data: look,
    });
  } catch (error) {
    console.error('Error fetching look:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch look',
    });
  }
};

// POST /api/looks - Create new look
export const createLook = async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      description, 
      occasion, 
      paletteId, 
      imageUrl, 
      tags, 
      isSponsored,
      items, // Array of { itemId, itemType }
    } = req.body;

    // Validation
    if (!title || !occasion || !paletteId || !imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, occasion, paletteId, imageUrl',
      });
    }

    const look = await prisma.look.create({
      data: {
        title,
        description,
        occasion,
        paletteId,
        imageUrl,
        tags: tags || [],
        isSponsored: isSponsored || false,
        items: {
          create: items?.map((item: any) => ({
            itemId: item.itemId,
            itemType: item.itemType,
          })) || [],
        },
      },
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: look,
      message: 'Look created successfully',
    });
  } catch (error) {
    console.error('Error creating look:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create look',
    });
  }
};

// POST /api/looks/:id/favorite - Toggle favorite
export const toggleFavorite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId; // TODO: Get from auth middleware

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Look ID is required',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Ensure user exists (create if doesn't exist for mock user)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@example.com`,
        password: 'mock-password-hash',
        name: 'Mock User',
      },
    });

    // Check if already favorited
    const existing = await prisma.favoriteLook.findUnique({
      where: {
        userId_lookId: {
          userId,
          lookId: id,
        },
      },
    });

    if (existing) {
      // Remove favorite
      await prisma.favoriteLook.delete({
        where: {
          id: existing.id,
        },
      });

      res.json({
        success: true,
        isFavorited: false,
        message: 'Removed from favorites',
      });
    } else {
      // Add favorite
      await prisma.favoriteLook.create({
        data: {
          userId,
          lookId: id,
        },
      });

      res.json({
        success: true,
        isFavorited: true,
        message: 'Added to favorites',
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite',
    });
  }
};

// GET /api/looks/favorites - Get user's favorite looks
export const getFavorites = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string; // TODO: Get from auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const favorites = await prisma.favoriteLook.findMany({
      where: { userId },
      include: {
        look: {
          include: {
            palette: true,
            items: {
              include: {
                item: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: favorites.map((fav) => fav.look),
      count: favorites.length,
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch favorites',
    });
  }
};

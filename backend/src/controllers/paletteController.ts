import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/palettes - Get all active palettes
export const getAllPalettes = async (req: Request, res: Response) => {
  try {
    const { occasion, isActive = 'true' } = req.query;

    const palettes = await prisma.trendPalette.findMany({
      where: {
        ...(occasion && { occasion: occasion as string }),
        isActive: isActive === 'true',
      },
      orderBy: {
        weekStartDate: 'desc',
      },
      include: {
        _count: {
          select: { looks: true },
        },
      },
    });

    res.json({
      success: true,
      data: palettes,
      count: palettes.length,
    });
  } catch (error) {
    console.error('Error fetching palettes:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch palettes' 
    });
  }
};

// GET /api/palettes/:id - Get specific palette with looks
export const getPaletteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Palette ID is required',
      });
    }

    const palette = await prisma.trendPalette.findUnique({
      where: { id },
      include: {
        looks: {
          include: {
            items: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });

    if (!palette) {
      return res.status(404).json({
        success: false,
        error: 'Palette not found',
      });
    }

    res.json({
      success: true,
      data: palette,
    });
  } catch (error) {
    console.error('Error fetching palette:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch palette',
    });
  }
};

// POST /api/palettes - Create new palette (admin only)
export const createPalette = async (req: Request, res: Response) => {
  try {
    const { name, description, colors, occasion, weekStartDate, imageUrl } = req.body;

    // Validation
    if (!name || !description || !colors || !occasion || !weekStartDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, colors, occasion, weekStartDate',
      });
    }

    const palette = await prisma.trendPalette.create({
      data: {
        name,
        description,
        colors,
        occasion,
        weekStartDate: new Date(weekStartDate),
        imageUrl,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: palette,
      message: 'Palette created successfully',
    });
  } catch (error) {
    console.error('Error creating palette:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create palette',
    });
  }
};

// PUT /api/palettes/:id - Update palette
export const updatePalette = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, colors, occasion, weekStartDate, imageUrl, isActive } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Palette ID is required',
      });
    }

    const palette = await prisma.trendPalette.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(colors && { colors }),
        ...(occasion && { occasion }),
        ...(weekStartDate && { weekStartDate: new Date(weekStartDate) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: palette,
      message: 'Palette updated successfully',
    });
  } catch (error) {
    console.error('Error updating palette:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update palette',
    });
  }
};

// DELETE /api/palettes/:id - Delete palette
export const deletePalette = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Palette ID is required',
      });
    }

    await prisma.trendPalette.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Palette deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting palette:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete palette',
    });
  }
};

// GET /api/palettes/current - Get current week's palettes
export const getCurrentPalettes = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    const palettes = await prisma.trendPalette.findMany({
      where: {
        weekStartDate: {
          lte: new Date(),
        },
        isActive: true,
      },
      orderBy: {
        weekStartDate: 'desc',
      },
      take: 3, // One for each occasion
      include: {
        _count: {
          select: { looks: true },
        },
      },
    });

    res.json({
      success: true,
      data: palettes,
      count: palettes.length,
    });
  } catch (error) {
    console.error('Error fetching current palettes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current palettes',
    });
  }
};

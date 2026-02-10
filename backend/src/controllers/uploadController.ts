import { Request, Response } from 'express';
import { uploadFromBase64 } from '../services/cloudStorageService';

export const uploadImage = async (req: Request, res: Response) => {
  try {
    const { image, folder } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required',
      });
    }

    // Upload to Cloudinary
    const result = await uploadFromBase64(image, folder || 'closet-items');

    res.json({
      success: true,
      data: {
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        publicId: result.publicId,
      },
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
    });
  }
};

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  thumbnailUrl: string;
}

/**
 * Upload image to Cloudinary from a URL or base64 string
 */
export async function uploadImage(imageSource: string, folder: string = 'closet-items'): Promise<UploadResult> {
  try {
    console.log('Uploading image to Cloudinary...');
    
    const uploadResult = await cloudinary.uploader.upload(imageSource, {
      folder: folder,
      resource_type: 'image',
      timeout: 120000, // 2 minute timeout
      chunk_size: 6000000, // 6MB chunks
      transformation: [
        { width: 1000, height: 1333, crop: 'limit' }, // Max dimensions
        { quality: 'auto:good' }, // Auto quality optimization
      ],
    });

    // Generate thumbnail URL
    const thumbnailUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [
        { width: 300, height: 400, crop: 'fill' },
        { quality: 'auto:low' },
      ],
    });

    console.log('Image uploaded successfully:', uploadResult.secure_url);

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      thumbnailUrl,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload image to cloud storage');
  }
}

/**
 * Upload image from a remote URL (e.g., from mobile device)
 */
export async function uploadFromUrl(imageUrl: string, folder: string = 'closet-items'): Promise<UploadResult> {
  return uploadImage(imageUrl, folder);
}

/**
 * Upload image from base64 data
 */
export async function uploadFromBase64(base64Data: string, folder: string = 'closet-items'): Promise<UploadResult> {
  // Ensure data URI format
  if (!base64Data.startsWith('data:')) {
    base64Data = `data:image/jpeg;base64,${base64Data}`;
  }
  
  return uploadImage(base64Data, folder);
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log('Image deleted from Cloudinary:', publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw new Error('Failed to delete image from cloud storage');
  }
}

/**
 * Upload image from local file path (for server-side files)
 */
export async function uploadFromFile(filePath: string, folder: string = 'closet-items'): Promise<UploadResult> {
  return uploadImage(filePath, folder);
}

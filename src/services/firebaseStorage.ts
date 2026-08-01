import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Upload image to Firebase Storage (React Native compatible)
 * @param base64Image - Base64 encoded image string (with or without data URL prefix)
 * @param userId - User ID for organizing storage
 * @param folder - Storage folder to upload into (defaults to 'closet' for backward compatibility)
 * @returns Download URL of uploaded image
 */
export async function uploadImageToFirebase(
  base64Image: string,
  userId: string,
  folder: string = 'closet'
): Promise<string> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const filename = `${timestamp}_${randomId}.jpg`;

    // Create storage reference
    const storageRef = ref(storage, `${folder}/${userId}/${filename}`);
    
    // Convert base64 to blob for React Native
    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    // Fetch the base64 data as a blob
    const response = await fetch(`data:image/jpeg;base64,${base64Data}`);
    const blob = await response.blob();
    
    // Upload blob
    await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
    });
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('Image uploaded to Firebase Storage:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading to Firebase Storage:', error);
    throw new Error('Failed to upload image');
  }
}

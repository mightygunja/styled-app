import { pipeline, AutoProcessor, CLIPVisionModelWithProjection, RawImage } from '@xenova/transformers';

// Singleton pattern for model loading
let clipModel: any = null;
let processor: any = null;

/**
 * Initialize CLIP model for generating image embeddings
 */
async function initializeModel() {
  if (!clipModel || !processor) {
    console.log('Loading CLIP model...');
    
    // Use CLIP ViT-B/32 model - good balance of speed and accuracy
    clipModel = await CLIPVisionModelWithProjection.from_pretrained(
      'Xenova/clip-vit-base-patch32'
    );
    
    processor = await AutoProcessor.from_pretrained(
      'Xenova/clip-vit-base-patch32'
    );
    
    console.log('CLIP model loaded successfully');
  }
  
  return { clipModel, processor };
}

/**
 * Generate CLIP embedding for an image URL
 * Returns a 512-dimensional vector
 */
export async function generateImageEmbedding(imageUrl: string): Promise<number[]> {
  try {
    console.log('Generating CLIP embedding for:', imageUrl);
    
    // Initialize model if not already loaded
    const { clipModel, processor } = await initializeModel();
    
    // Load and process image
    const image = await RawImage.fromURL(imageUrl);
    const inputs = await processor(image);
    
    // Generate embedding
    const { image_embeds } = await clipModel(inputs);
    
    // Convert to regular array
    const embedding = Array.from(image_embeds.data) as number[];
    
    console.log(`Generated embedding with ${embedding.length} dimensions`);
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate image embedding');
  }
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimensions');
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    const val1 = embedding1[i];
    const val2 = embedding2[i];
    if (val1 !== undefined && val2 !== undefined) {
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    }
  }
  
  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  
  if (magnitude === 0) {
    return 0;
  }
  
  return dotProduct / magnitude;
}

/**
 * Find items similar to a given embedding
 * Returns items sorted by similarity score (highest first)
 */
export function findSimilarItems(
  targetEmbedding: number[],
  items: Array<{ id: string; embedding: number[] | null; [key: string]: any }>,
  limit: number = 10,
  minSimilarity: number = 0.7
): Array<{ item: any; similarity: number }> {
  const results: Array<{ item: any; similarity: number }> = [];
  
  for (const item of items) {
    if (!item.embedding || item.embedding.length === 0) {
      continue; // Skip items without embeddings
    }
    
    const similarity = cosineSimilarity(targetEmbedding, item.embedding);
    
    if (similarity >= minSimilarity) {
      results.push({ item, similarity });
    }
  }
  
  // Sort by similarity (highest first)
  results.sort((a, b) => b.similarity - a.similarity);
  
  // Return top N results
  return results.slice(0, limit);
}

/**
 * Batch generate embeddings for multiple images
 * Useful for initial population or bulk updates
 */
export async function batchGenerateEmbeddings(
  imageUrls: string[]
): Promise<Array<{ url: string; embedding: number[] | null }>> {
  const results: Array<{ url: string; embedding: number[] | null }> = [];
  
  for (const url of imageUrls) {
    try {
      const embedding = await generateImageEmbedding(url);
      results.push({ url, embedding });
    } catch (error) {
      console.error(`Failed to generate embedding for ${url}:`, error);
      results.push({ url, embedding: null });
    }
  }
  
  return results;
}

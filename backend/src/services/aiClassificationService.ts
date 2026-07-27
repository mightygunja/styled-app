import OpenAI from 'openai';

// Disable SSL verification globally for OpenAI requests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
  timeout: 120000,
  maxRetries: 3,
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
});

export interface GarmentClassification {
  category: string;
  subcategory?: string;
  color: string;
  secondaryColors?: string[];
  pattern?: string;
  neckline?: string;
  sleeveLength?: string;
  fitType?: string;
  fabricTexture?: string;
  style?: string;
  confidence: number;
}

export async function classifyGarmentImage(imageUrl: string): Promise<GarmentClassification> {
  try {
    // Check if it's a local file path or URL
    let imageContent: any;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // It's a URL - use directly
      imageContent = {
        type: 'image_url',
        image_url: { url: imageUrl },
      };
    } else if (imageUrl.startsWith('data:image')) {
      // It's already base64
      imageContent = {
        type: 'image_url',
        image_url: { url: imageUrl },
      };
    } else {
      // For now, skip AI for local files (will implement cloud upload later)
      console.log('Skipping AI for local file - need cloud storage integration');
      throw new Error('Local file paths not supported - need cloud storage');
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a fashion expert AI that analyzes clothing images and extracts detailed attributes. 
          Respond ONLY with valid JSON in this exact format:
          {
            "category": "tops|bottoms|dresses|outerwear|shoes|accessories",
            "subcategory": "specific type like 'blouse', 'jeans', 'sneakers', etc.",
            "color": "primary color name",
            "secondaryColors": ["array of other prominent colors"],
            "pattern": "solid|striped|floral|plaid|polka-dot|geometric|animal-print|abstract|other",
            "neckline": "crew|v-neck|scoop|boat|off-shoulder|turtleneck|halter|square|sweetheart|other",
            "sleeveLength": "sleeveless|short|3/4|long|cap|other",
            "fitType": "fitted|relaxed|oversized|slim|regular|loose|other",
            "fabricTexture": "cotton|silk|denim|leather|knit|wool|linen|synthetic|other",
            "style": "casual|formal|sporty|bohemian|minimalist|vintage|streetwear|preppy|other",
            "confidence": 0.0-1.0
          }`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this clothing item and provide detailed classification.',
            },
            imageContent,
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Strip markdown code fences if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      // Remove ```json and ``` markers
      jsonContent = jsonContent.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    }

    // Parse JSON response
    const classification = JSON.parse(jsonContent) as GarmentClassification;
    
    console.log('AI Classification:', classification);
    return classification;
  } catch (error) {
    console.error('Error classifying garment:', error);
    
    // Return fallback classification
    return {
      category: 'tops',
      color: 'unknown',
      confidence: 0,
    };
  }
}

export async function generateGarmentTags(classification: GarmentClassification): Promise<string[]> {
  const tags: string[] = [];

  // Add category-based tags
  if (classification.subcategory) {
    tags.push(classification.subcategory);
  }

  // Add color tags
  tags.push(classification.color);
  if (classification.secondaryColors && classification.secondaryColors.length > 0) {
    tags.push(...classification.secondaryColors);
  }

  // Add pattern tag
  if (classification.pattern && classification.pattern !== 'solid') {
    tags.push(classification.pattern);
  }

  // Add style tag
  if (classification.style) {
    tags.push(classification.style);
  }

  // Add fit tag
  if (classification.fitType) {
    tags.push(classification.fitType);
  }

  // Add fabric tag
  if (classification.fabricTexture) {
    tags.push(classification.fabricTexture);
  }

  return tags;
}

export async function suggestSeasons(classification: GarmentClassification): Promise<string[]> {
  const seasons: string[] = [];

  // Fabric-based season suggestions
  const fabricSeasonMap: Record<string, string[]> = {
    wool: ['fall', 'winter'],
    knit: ['fall', 'winter'],
    denim: ['spring', 'fall'],
    linen: ['spring', 'summer'],
    cotton: ['spring', 'summer', 'fall'],
    silk: ['spring', 'summer'],
    leather: ['fall', 'winter'],
  };

  if (classification.fabricTexture && fabricSeasonMap[classification.fabricTexture]) {
    const fabricSeasons = fabricSeasonMap[classification.fabricTexture];
    if (fabricSeasons) {
      seasons.push(...fabricSeasons);
    }
  }

  // Sleeve-based season suggestions
  if (classification.sleeveLength === 'sleeveless' || classification.sleeveLength === 'short') {
    seasons.push('spring', 'summer');
  } else if (classification.sleeveLength === 'long') {
    seasons.push('fall', 'winter');
  }

  // Category-based season suggestions
  if (classification.category === 'outerwear') {
    seasons.push('fall', 'winter');
  }

  // Remove duplicates and return
  return [...new Set(seasons)];
}

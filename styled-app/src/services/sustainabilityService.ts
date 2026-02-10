/**
 * Sustainability Scoring Service
 * 
 * Tracks environmental impact, sustainability ratings, and carbon footprint
 * for fashion items and wardrobes.
 */

import { Item } from '../types';

export type SustainabilityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
export type ImpactCategory = 'carbon' | 'water' | 'waste' | 'labor' | 'materials';

export interface SustainabilityScore {
  itemId: string;
  overallScore: number; // 0-100
  grade: SustainabilityGrade;
  categories: {
    category: ImpactCategory;
    score: number;
    impact: 'low' | 'medium' | 'high';
    details: string;
  }[];
  certifications: string[];
  improvements: string[];
}

export interface CarbonFootprint {
  totalKgCO2: number;
  breakdown: {
    production: number;
    transportation: number;
    packaging: number;
    endOfLife: number;
  };
  comparison: {
    averageItem: number;
    percentageDifference: number;
  };
  offsetOptions: {
    trees: number;
    cost: number;
  };
}

export interface BrandSustainability {
  brandName: string;
  overallRating: number; // 0-100
  grade: SustainabilityGrade;
  certifications: string[];
  practices: {
    category: string;
    rating: number;
    description: string;
  }[];
  transparencyScore: number;
  ethicalLabor: boolean;
  sustainableMaterials: number; // percentage
}

export interface WardrobeSustainability {
  totalItems: number;
  averageScore: number;
  grade: SustainabilityGrade;
  totalCarbonFootprint: number;
  sustainableItems: number;
  sustainablePercentage: number;
  recommendations: string[];
  topBrands: { brand: string; score: number }[];
  improvements: {
    action: string;
    impact: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
}

export interface MaterialImpact {
  material: string;
  sustainabilityScore: number;
  carbonFootprint: number;
  waterUsage: number;
  biodegradable: boolean;
  recycled: boolean;
  alternatives: {
    material: string;
    score: number;
    benefit: string;
  }[];
}

export interface SecondhandRecommendation {
  itemType: string;
  platforms: {
    name: string;
    url: string;
    avgPrice: number;
    availability: 'high' | 'medium' | 'low';
  }[];
  potentialSavings: {
    money: number;
    carbon: number;
  };
}

class SustainabilityService {
  /**
   * Calculate sustainability score for an item
   */
  async calculateItemScore(item: Item): Promise<SustainabilityScore> {
    await new Promise(resolve => setTimeout(resolve, 600));

    // Mock scoring based on item properties
    const categories = this.analyzeSustainabilityCategories(item);
    const overallScore = categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length;
    const grade = this.getGrade(overallScore);

    return {
      itemId: item.id,
      overallScore,
      grade,
      categories,
      certifications: this.getCertifications(item),
      improvements: this.getImprovements(overallScore),
    };
  }

  /**
   * Analyze sustainability categories
   */
  private analyzeSustainabilityCategories(item: Item): SustainabilityScore['categories'] {
    return [
      {
        category: 'carbon',
        score: Math.floor(Math.random() * 40) + 60,
        impact: 'medium' as const,
        details: 'Carbon emissions from production and transport',
      },
      {
        category: 'water',
        score: Math.floor(Math.random() * 30) + 50,
        impact: item.category === 'tops' ? 'high' as const : 'medium' as const,
        details: 'Water usage in manufacturing process',
      },
      {
        category: 'waste',
        score: Math.floor(Math.random() * 35) + 55,
        impact: 'low' as const,
        details: 'Waste generated during production',
      },
      {
        category: 'labor',
        score: Math.floor(Math.random() * 30) + 65,
        impact: 'low' as const,
        details: 'Fair labor practices and working conditions',
      },
      {
        category: 'materials',
        score: Math.floor(Math.random() * 40) + 50,
        impact: 'medium' as const,
        details: 'Sustainability of raw materials used',
      },
    ];
  }

  /**
   * Get sustainability grade
   */
  private getGrade(score: number): SustainabilityGrade {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Get certifications
   */
  private getCertifications(item: Item): string[] {
    const allCertifications = [
      'GOTS Certified',
      'Fair Trade',
      'OEKO-TEX',
      'B Corp',
      'Bluesign',
      'Cradle to Cradle',
    ];

    // Randomly assign 0-3 certifications
    const count = Math.floor(Math.random() * 4);
    return allCertifications.slice(0, count);
  }

  /**
   * Get improvement suggestions
   */
  private getImprovements(score: number): string[] {
    const improvements = [
      'Choose items made from organic or recycled materials',
      'Look for brands with transparent supply chains',
      'Consider secondhand or vintage options',
      'Support brands with fair labor certifications',
      'Opt for timeless pieces that last longer',
    ];

    if (score >= 80) {
      return ['Great choice! This item has minimal environmental impact'];
    } else if (score >= 60) {
      return improvements.slice(0, 2);
    } else {
      return improvements.slice(0, 4);
    }
  }

  /**
   * Calculate carbon footprint
   */
  async calculateCarbonFootprint(item: Item): Promise<CarbonFootprint> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const production = Math.random() * 15 + 5;
    const transportation = Math.random() * 8 + 2;
    const packaging = Math.random() * 3 + 1;
    const endOfLife = Math.random() * 4 + 1;
    const totalKgCO2 = production + transportation + packaging + endOfLife;

    const averageItem = 25;
    const percentageDifference = ((totalKgCO2 - averageItem) / averageItem) * 100;

    return {
      totalKgCO2,
      breakdown: {
        production,
        transportation,
        packaging,
        endOfLife,
      },
      comparison: {
        averageItem,
        percentageDifference,
      },
      offsetOptions: {
        trees: Math.ceil(totalKgCO2 / 20),
        cost: Math.ceil(totalKgCO2 * 0.5),
      },
    };
  }

  /**
   * Get brand sustainability rating
   */
  async getBrandRating(brandName: string): Promise<BrandSustainability> {
    await new Promise(resolve => setTimeout(resolve, 700));

    const overallRating = Math.floor(Math.random() * 40) + 60;

    return {
      brandName,
      overallRating,
      grade: this.getGrade(overallRating),
      certifications: this.getCertifications({} as Item).slice(0, 2),
      practices: [
        {
          category: 'Materials',
          rating: Math.floor(Math.random() * 30) + 70,
          description: 'Uses sustainable and recycled materials',
        },
        {
          category: 'Manufacturing',
          rating: Math.floor(Math.random() * 30) + 60,
          description: 'Ethical manufacturing practices',
        },
        {
          category: 'Transparency',
          rating: Math.floor(Math.random() * 30) + 65,
          description: 'Supply chain transparency',
        },
        {
          category: 'Circularity',
          rating: Math.floor(Math.random() * 30) + 55,
          description: 'Take-back and recycling programs',
        },
      ],
      transparencyScore: Math.floor(Math.random() * 30) + 65,
      ethicalLabor: Math.random() > 0.3,
      sustainableMaterials: Math.floor(Math.random() * 40) + 50,
    };
  }

  /**
   * Analyze wardrobe sustainability
   */
  async analyzeWardrobe(items: Item[]): Promise<WardrobeSustainability> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const scores = await Promise.all(
      items.slice(0, 10).map(item => this.calculateItemScore(item))
    );

    const averageScore = scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length;
    const sustainableItems = scores.filter(s => s.overallScore >= 70).length;
    const sustainablePercentage = (sustainableItems / items.length) * 100;

    // Calculate total carbon footprint
    const carbonFootprints = await Promise.all(
      items.slice(0, 10).map(item => this.calculateCarbonFootprint(item))
    );
    const totalCarbonFootprint = carbonFootprints.reduce((sum, cf) => sum + cf.totalKgCO2, 0);

    return {
      totalItems: items.length,
      averageScore,
      grade: this.getGrade(averageScore),
      totalCarbonFootprint,
      sustainableItems,
      sustainablePercentage,
      recommendations: this.getWardrobeRecommendations(averageScore, sustainablePercentage),
      topBrands: this.getTopSustainableBrands(items),
      improvements: [
        {
          action: 'Replace fast fashion items with sustainable alternatives',
          impact: 25,
          difficulty: 'medium',
        },
        {
          action: 'Buy secondhand for your next purchase',
          impact: 40,
          difficulty: 'easy',
        },
        {
          action: 'Donate or recycle items you no longer wear',
          impact: 15,
          difficulty: 'easy',
        },
        {
          action: 'Choose quality over quantity',
          impact: 35,
          difficulty: 'medium',
        },
      ],
    };
  }

  /**
   * Get wardrobe recommendations
   */
  private getWardrobeRecommendations(averageScore: number, sustainablePercentage: number): string[] {
    const recommendations: string[] = [];

    if (averageScore < 60) {
      recommendations.push('Your wardrobe has room for improvement. Focus on sustainable brands.');
    } else if (averageScore < 75) {
      recommendations.push('Good progress! Consider replacing low-scoring items gradually.');
    } else {
      recommendations.push('Excellent! Your wardrobe is highly sustainable.');
    }

    if (sustainablePercentage < 30) {
      recommendations.push('Less than 30% of your items are sustainable. Aim for 50%+.');
    } else if (sustainablePercentage < 60) {
      recommendations.push('You\'re halfway there! Keep choosing sustainable options.');
    } else {
      recommendations.push('Over 60% sustainable - you\'re a sustainability champion!');
    }

    recommendations.push('Shop secondhand to reduce environmental impact by 80%');
    recommendations.push('Look for GOTS, Fair Trade, and B Corp certifications');

    return recommendations;
  }

  /**
   * Get top sustainable brands
   */
  private getTopSustainableBrands(items: Item[]): { brand: string; score: number }[] {
    const brands = new Set(items.map(item => item.brand).filter(Boolean));
    
    return Array.from(brands).slice(0, 5).map(brand => ({
      brand: brand!,
      score: Math.floor(Math.random() * 30) + 70,
    })).sort((a, b) => b.score - a.score);
  }

  /**
   * Get material impact
   */
  async getMaterialImpact(material: string): Promise<MaterialImpact> {
    await new Promise(resolve => setTimeout(resolve, 400));

    const impacts: Record<string, Partial<MaterialImpact>> = {
      cotton: {
        sustainabilityScore: 60,
        carbonFootprint: 15,
        waterUsage: 10000,
        biodegradable: true,
        recycled: false,
      },
      polyester: {
        sustainabilityScore: 40,
        carbonFootprint: 25,
        waterUsage: 2000,
        biodegradable: false,
        recycled: false,
      },
      'organic cotton': {
        sustainabilityScore: 85,
        carbonFootprint: 8,
        waterUsage: 5000,
        biodegradable: true,
        recycled: false,
      },
      'recycled polyester': {
        sustainabilityScore: 75,
        carbonFootprint: 12,
        waterUsage: 1500,
        biodegradable: false,
        recycled: true,
      },
    };

    const impact = impacts[material.toLowerCase()] || impacts.cotton;

    return {
      material,
      sustainabilityScore: impact.sustainabilityScore || 50,
      carbonFootprint: impact.carbonFootprint || 20,
      waterUsage: impact.waterUsage || 5000,
      biodegradable: impact.biodegradable || false,
      recycled: impact.recycled || false,
      alternatives: [
        {
          material: 'Organic Cotton',
          score: 85,
          benefit: '60% less water usage',
        },
        {
          material: 'Recycled Polyester',
          score: 75,
          benefit: '50% less carbon emissions',
        },
        {
          material: 'Tencel',
          score: 90,
          benefit: 'Made from sustainable wood pulp',
        },
      ],
    };
  }

  /**
   * Get secondhand recommendations
   */
  async getSecondhandRecommendations(itemType: string): Promise<SecondhandRecommendation> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      itemType,
      platforms: [
        {
          name: 'ThredUp',
          url: 'https://thredup.com',
          avgPrice: 25,
          availability: 'high',
        },
        {
          name: 'Poshmark',
          url: 'https://poshmark.com',
          avgPrice: 30,
          availability: 'high',
        },
        {
          name: 'Depop',
          url: 'https://depop.com',
          avgPrice: 20,
          availability: 'medium',
        },
        {
          name: 'Vestiaire Collective',
          url: 'https://vestiairecollective.com',
          avgPrice: 50,
          availability: 'medium',
        },
      ],
      potentialSavings: {
        money: Math.floor(Math.random() * 50) + 30,
        carbon: Math.floor(Math.random() * 15) + 10,
      },
    };
  }

  /**
   * Calculate offset cost
   */
  async calculateOffsetCost(carbonKg: number): Promise<{
    cost: number;
    trees: number;
    projects: {
      name: string;
      type: string;
      cost: number;
      impact: string;
    }[];
  }> {
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      cost: Math.ceil(carbonKg * 0.5),
      trees: Math.ceil(carbonKg / 20),
      projects: [
        {
          name: 'Reforestation Project',
          type: 'Forest Conservation',
          cost: Math.ceil(carbonKg * 0.4),
          impact: 'Plants trees in deforested areas',
        },
        {
          name: 'Renewable Energy',
          type: 'Clean Energy',
          cost: Math.ceil(carbonKg * 0.6),
          impact: 'Supports wind and solar projects',
        },
        {
          name: 'Ocean Cleanup',
          type: 'Marine Conservation',
          cost: Math.ceil(carbonKg * 0.5),
          impact: 'Removes plastic from oceans',
        },
      ],
    };
  }
}

export const sustainabilityService = new SustainabilityService();

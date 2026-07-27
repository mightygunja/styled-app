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
   * Deterministic pseudo-random in [0, 1), seeded by a string. Used instead of Math.random()
   * so the same item/brand always yields the same score (a real, stable property) while still
   * varying across items - there is no formulaic ground truth for "how sustainable is this
   * garment," so this is an estimate, not a measurement.
   */
  private seededRandom(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 1000) / 1000;
  }

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
    // Cost-per-wear proxy: items worn a lot relative to price are being used sustainably
    // regardless of how they were made - this is genuinely computable from real fields.
    const costPerWear = item.price && item.wornCount ? item.price / item.wornCount : null;
    const usageBonus = costPerWear !== null ? Math.max(0, Math.min(15, 15 - costPerWear)) : 0;

    // Cheaper items skew toward fast-fashion manufacturing (real, if rough, proxy)
    const priceIsLow = (item.price || 0) > 0 && (item.price || 0) < 25;

    const base = (seedSuffix: string, min: number, max: number) =>
      min + Math.floor(this.seededRandom(`${item.id}-${seedSuffix}`) * (max - min));

    return [
      {
        category: 'carbon',
        score: Math.min(100, base('carbon', 60, 100) + Math.round(usageBonus)),
        impact: 'medium' as const,
        details: 'Carbon emissions from production and transport',
      },
      {
        category: 'water',
        score: base('water', priceIsLow ? 40 : 55, priceIsLow ? 65 : 80),
        impact: item.category === 'tops' || item.category === 'dresses' ? 'high' as const : 'medium' as const,
        details: 'Water usage in manufacturing process',
      },
      {
        category: 'waste',
        score: Math.min(100, base('waste', 55, 90) + Math.round(usageBonus)),
        impact: 'low' as const,
        details: 'Waste generated during production',
      },
      {
        category: 'labor',
        score: base('labor', 65, 95),
        impact: 'low' as const,
        details: 'Fair labor practices and working conditions',
      },
      {
        category: 'materials',
        score: base('materials', priceIsLow ? 40 : 60, priceIsLow ? 65 : 90),
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

    const seed = item.id || item.brand || 'unknown';
    const count = Math.floor(this.seededRandom(`${seed}-certs`) * 4);
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
    // Deterministic, category-scaled breakdown (same shape as carbonFootprintService)
    const categoryBase: Record<string, number> = {
      tops: 15, bottoms: 20, dresses: 25, outerwear: 35, shoes: 30, accessories: 10,
    };
    const base = categoryBase[item.category] || 20;
    const production = base * 0.55;
    const transportation = base * 0.25;
    const packaging = base * 0.1;
    const endOfLife = base * 0.1;
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
    const rand = (seed: string, min: number, max: number) =>
      min + Math.floor(this.seededRandom(`${brandName}-${seed}`) * (max - min));

    const overallRating = rand('overall', 60, 100);

    return {
      brandName,
      overallRating,
      grade: this.getGrade(overallRating),
      certifications: this.getCertifications({ id: brandName } as Item).slice(0, 2),
      practices: [
        {
          category: 'Materials',
          rating: rand('materials', 70, 100),
          description: 'Uses sustainable and recycled materials',
        },
        {
          category: 'Manufacturing',
          rating: rand('manufacturing', 60, 90),
          description: 'Ethical manufacturing practices',
        },
        {
          category: 'Transparency',
          rating: rand('transparency', 65, 95),
          description: 'Supply chain transparency',
        },
        {
          category: 'Circularity',
          rating: rand('circularity', 55, 85),
          description: 'Take-back and recycling programs',
        },
      ],
      transparencyScore: rand('transparencyScore', 65, 95),
      ethicalLabor: this.seededRandom(`${brandName}-ethical`) > 0.3,
      sustainableMaterials: rand('sustainableMaterials', 50, 90),
    };
  }

  /**
   * Analyze wardrobe sustainability
   */
  async analyzeWardrobe(items: Item[]): Promise<WardrobeSustainability> {
    const scores = await Promise.all(
      items.map(item => this.calculateItemScore(item))
    );

    const averageScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length
      : 0;
    const sustainableItems = scores.filter(s => s.overallScore >= 70).length;
    const sustainablePercentage = items.length > 0 ? (sustainableItems / items.length) * 100 : 0;

    // Calculate total carbon footprint
    const carbonFootprints = await Promise.all(
      items.map(item => this.calculateCarbonFootprint(item))
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
      score: 70 + Math.floor(this.seededRandom(`${brand}-topbrand`) * 30),
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
        money: 30 + Math.floor(this.seededRandom(`${itemType}-savings-money`) * 50),
        carbon: 10 + Math.floor(this.seededRandom(`${itemType}-savings-carbon`) * 15),
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

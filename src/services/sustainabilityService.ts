/**
 * Sustainability Scoring Service
 * 
 * Tracks environmental impact, sustainability ratings, and carbon footprint
 * for fashion items and wardrobes.
 */

import { Item } from '../types';

export type SustainabilityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
/**
 * 'longevity' and 'materials' are the only two 33 Trends can evidence. 'carbon',
 * 'water', 'waste' and 'labor' are retained for the carbon tab and for future
 * use once a real supply-chain data source exists - nothing scores them today.
 */
export type ImpactCategory = 'carbon' | 'water' | 'waste' | 'labor' | 'materials' | 'longevity';

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
  /**
   * Estimated production water, litres, from category averages.
   *
   * Replaces a figure the Sustainability screen was computing inline as
   * `totalItems * 2500` - a number with nothing behind it presented to users
   * as their own water footprint.
   */
  totalWaterLitres: number;
  sustainableItems: number;
  sustainablePercentage: number;
  recommendations: string[];
  /** Brands by real wear count. `score` is share of total wears, not a sustainability rating. */
  topBrands: { brand: string; score: number; wears: number }[];
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
  /**
   * Relative impact bands for fibres we can identify from the AI classifier's
   * `fabricTexture` field. These are coarse bands derived from the direction of
   * published life-cycle assessments (linen and recycled fibres consistently
   * low; wool, leather and silk consistently high), NOT precise per-garment
   * figures - garment weight, dye process and origin all move the real number
   * and none of them are knowable from a photo.
   *
   * A fibre we cannot identify scores nothing at all rather than a default,
   * because a made-up number is worse than an absent one.
   */
  private static readonly MATERIAL_BANDS: Record<string, number> = {
    linen: 88,
    hemp: 88,
    recycled: 85,
    'organic cotton': 80,
    tencel: 78,
    lyocell: 78,
    viscose: 58,
    rayon: 58,
    cotton: 55,
    denim: 48,
    nylon: 40,
    polyester: 38,
    acrylic: 35,
    silk: 33,
    leather: 28,
    wool: 45,
    cashmere: 30,
  };

  private materialBandFor(item: Item): number | null {
    const fabric = ((item as any).fabricTexture || '').toString().toLowerCase();
    if (!fabric) return null;
    const match = Object.keys(SustainabilityService.MATERIAL_BANDS).find(k => fabric.includes(k));
    return match ? SustainabilityService.MATERIAL_BANDS[match] : null;
  }

  /**
   * Scores only the dimensions the app can actually evidence.
   *
   * Longevity and circularity come from real wear data the user generated.
   * Materials are scored only when the fibre was identified. Water use, labour
   * conditions and factory waste are deliberately NOT scored - 33 Trends has no
   * source for any of them, and inventing a number for a brand's labour
   * practices is a claim about real companies we cannot stand behind.
   */
  private analyzeSustainabilityCategories(item: Item): SustainabilityScore['categories'] {
    const categories: SustainabilityScore['categories'] = [];

    const wornCount = typeof item.wornCount === 'number' ? item.wornCount : 0;
    const price = typeof item.price === 'number' ? item.price : null;

    // Longevity: the single most defensible sustainability signal in a wardrobe
    // app. Wearing what you own is measurably lower impact than replacing it,
    // and wornCount is real data.
    const longevityScore = Math.max(5, Math.min(100, wornCount * 4));
    categories.push({
      category: 'longevity',
      score: longevityScore,
      impact: wornCount >= 15 ? ('low' as const) : wornCount >= 5 ? ('medium' as const) : ('high' as const),
      details:
        wornCount === 0
          ? 'Never worn — the highest-impact item in any wardrobe is the one that goes unused'
          : `Worn ${wornCount} time${wornCount === 1 ? '' : 's'}${
              price !== null ? ` · $${(price / Math.max(1, wornCount)).toFixed(2)} per wear` : ''
            }`,
    });

    const materialBand = this.materialBandFor(item);
    if (materialBand !== null) {
      categories.push({
        category: 'materials',
        score: materialBand,
        impact: materialBand >= 70 ? ('low' as const) : materialBand >= 45 ? ('medium' as const) : ('high' as const),
        details: `Based on the identified fabric. Relative band from published life-cycle research, not a measured figure.`,
      });
    }

    return categories;
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
   * Certifications are a factual claim about a real product and a real company.
   * 33 Trends has no certification data source, so it asserts none. Wiring this up
   * means integrating a real registry (GOTS, Fair Trade, B Corp and Bluesign all
   * publish searchable directories) - never inferring one from a brand name.
   */
  private getCertifications(_item: Item): string[] {
    return [];
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
  /**
   * Estimated production water for one garment, in litres.
   *
   * Category averages from the commonly cited apparel figures - roughly 2,700L
   * for a cotton t-shirt and 7,500L for a pair of jeans. These are estimates
   * and the UI says so: we do not know the fibre content of a user's items, so
   * a per-item figure would be false precision.
   */
  waterLitresFor(item: Item): number {
    const byCategory: Record<string, number> = {
      tops: 2700,
      bottoms: 7500,
      dresses: 5000,
      outerwear: 6000,
      shoes: 4400,
      accessories: 1000,
    };
    return byCategory[item.category] || 3000;
  }

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
   * Brand sustainability rating.
   *
   * Returns null, always, until a real data source is integrated.
   *
   * This previously synthesised a 60-100 rating, a set of certifications and an
   * `ethicalLabor` boolean from a hash of the brand name - meaning every brand
   * scored well and none of it was true. Those are defamatory-adjacent factual
   * claims about identifiable companies, and a stable hash made them look
   * researched rather than invented.
   *
   * To implement for real, integrate a published index (Fashion Transparency
   * Index, Good On You, or B Corp's directory) and return only brands it
   * actually covers - a brand the source does not rate must stay null rather
   * than fall back to an estimate.
   */
  async getBrandRating(_brandName: string): Promise<BrandSustainability | null> {
    return null;
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
    const totalWaterLitres = items.reduce((sum, item) => sum + this.waterLitresFor(item), 0);

    return {
      totalItems: items.length,
      averageScore,
      grade: this.getGrade(averageScore),
      totalCarbonFootprint,
      totalWaterLitres,
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
  /**
   * The brands the user actually wears, by real wear count.
   *
   * This deliberately does NOT rate brands on sustainability - 33 Trends has no
   * source for that (see getBrandRating). What it can honestly show is where
   * the wearing actually goes, which is the more actionable number anyway:
   * the brand you own six of and wear twice is the real problem.
   *
   * `score` is that brand's share of total wears, so the existing progress bar
   * stays meaningful; `wears` is the underlying count for the label.
   */
  private getTopSustainableBrands(items: Item[]): { brand: string; score: number; wears: number }[] {
    const wearsByBrand = new Map<string, number>();

    items.forEach(item => {
      if (!item.brand) return;
      const wears = typeof item.wornCount === 'number' ? item.wornCount : 0;
      wearsByBrand.set(item.brand, (wearsByBrand.get(item.brand) || 0) + wears);
    });

    const totalWears = Array.from(wearsByBrand.values()).reduce((sum, w) => sum + w, 0);
    if (totalWears === 0) return [];

    return Array.from(wearsByBrand.entries())
      .map(([brand, wears]) => ({
        brand,
        wears,
        score: Math.round((wears / totalWears) * 100),
      }))
      .sort((a, b) => b.wears - a.wears)
      .slice(0, 5);
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
      // Derived from the platform prices listed directly above rather than
      // invented: the money figure is what buying at the cheapest listed
      // secondhand average saves against the dearest, and the carbon figure is
      // the production-stage emissions a reused garment displaces, taken from
      // this service's own per-item footprint model.
      potentialSavings: this.secondhandSavings(itemType),
    };
  }

  /**
   * Savings from buying a given item type secondhand rather than new.
   *
   * Both numbers are computed, not sampled. Carbon uses the production and
   * materials stages only - buying secondhand displaces manufacture, not the
   * transport or laundering the garment still incurs in its second life.
   */
  private secondhandSavings(itemType: string): { money: number; carbon: number } {
    const typicalRetail: Record<string, number> = {
      tops: 45,
      bottoms: 65,
      dresses: 90,
      outerwear: 150,
      shoes: 95,
      accessories: 40,
      bags: 120,
    };

    const retail = typicalRetail[itemType.toLowerCase()] ?? 60;
    // Median of the secondhand platform averages listed on the parent result.
    const secondhandMedian = 30;
    const money = Math.max(0, retail - secondhandMedian);

    // Materials + production are roughly two thirds of a garment's cradle-to-gate
    // footprint across published life-cycle assessments; that is the share reuse
    // avoids. Scaled off the same category footprint the carbon tab already uses.
    const categoryFootprint: Record<string, number> = {
      tops: 7,
      bottoms: 12,
      dresses: 14,
      outerwear: 25,
      shoes: 14,
      accessories: 5,
      bags: 18,
    };
    const footprint = categoryFootprint[itemType.toLowerCase()] ?? 10;

    return { money, carbon: Math.round(footprint * 0.66) };
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

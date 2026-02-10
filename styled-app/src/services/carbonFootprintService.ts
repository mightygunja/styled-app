/**
 * Carbon Footprint Calculator Service
 * 
 * Calculates detailed carbon emissions for fashion items and wardrobes.
 * Provides insights, comparisons, and reduction strategies.
 */

import { Item } from '../types';

export type EmissionStage = 'materials' | 'production' | 'transportation' | 'use' | 'endOfLife';
export type MaterialType = 'cotton' | 'polyester' | 'wool' | 'leather' | 'silk' | 'linen' | 'recycled' | 'organic';

export interface DetailedFootprint {
  itemId: string;
  item: Item;
  totalKgCO2: number;
  breakdown: {
    stage: EmissionStage;
    kgCO2: number;
    percentage: number;
    description: string;
  }[];
  materialImpact: {
    material: MaterialType;
    kgCO2: number;
    percentage: number;
  }[];
  comparisonToAverage: {
    averageKgCO2: number;
    difference: number;
    percentageDifference: number;
    rating: 'excellent' | 'good' | 'average' | 'poor' | 'very-poor';
  };
  equivalents: {
    type: string;
    value: number;
    unit: string;
    icon: string;
  }[];
  reductionTips: string[];
}

export interface WardrobeFootprint {
  totalKgCO2: number;
  itemCount: number;
  averagePerItem: number;
  breakdown: {
    category: string;
    kgCO2: number;
    percentage: number;
    itemCount: number;
  }[];
  timeline: {
    month: string;
    kgCO2: number;
  }[];
  topEmitters: {
    item: Item;
    kgCO2: number;
  }[];
  lowestEmitters: {
    item: Item;
    kgCO2: number;
  }[];
  projections: {
    period: string;
    kgCO2: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }[];
}

export interface ReductionStrategy {
  id: string;
  title: string;
  description: string;
  potentialReduction: number; // kg CO2
  percentageReduction: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  steps: string[];
  impact: 'low' | 'medium' | 'high';
}

export interface OffsetProject {
  id: string;
  name: string;
  type: 'reforestation' | 'renewable-energy' | 'ocean-cleanup' | 'carbon-capture';
  description: string;
  location: string;
  costPerKg: number;
  minOffset: number;
  certification: string;
  impact: string;
  imageUrl: string;
}

export interface OffsetCalculation {
  kgCO2ToOffset: number;
  totalCost: number;
  projects: {
    project: OffsetProject;
    allocation: number; // kg CO2
    cost: number;
  }[];
  equivalents: {
    trees: number;
    solarPanels: number;
    windTurbines: number;
  };
}

export interface ComparisonData {
  userFootprint: number;
  averageUser: number;
  sustainableTarget: number;
  percentile: number; // 0-100, where user ranks
  message: string;
  recommendations: string[];
}

class CarbonFootprintService {
  private materialEmissions: Record<MaterialType, number> = {
    cotton: 5.5,
    polyester: 7.0,
    wool: 10.0,
    leather: 17.0,
    silk: 8.0,
    linen: 2.5,
    recycled: 2.0,
    organic: 3.0,
  };

  private categoryAverages: Record<string, number> = {
    tops: 15,
    bottoms: 20,
    dresses: 25,
    outerwear: 35,
    shoes: 30,
    accessories: 10,
  };

  /**
   * Calculate detailed carbon footprint for an item
   */
  async calculateItemFootprint(item: Item): Promise<DetailedFootprint> {
    await new Promise(resolve => setTimeout(resolve, 800));

    // Calculate emissions by stage
    const materials = this.calculateMaterialsEmissions(item);
    const production = this.calculateProductionEmissions(item);
    const transportation = this.calculateTransportationEmissions(item);
    const use = this.calculateUseEmissions(item);
    const endOfLife = this.calculateEndOfLifeEmissions(item);

    const totalKgCO2 = materials + production + transportation + use + endOfLife;

    const breakdown = [
      {
        stage: 'materials' as EmissionStage,
        kgCO2: materials,
        percentage: (materials / totalKgCO2) * 100,
        description: 'Raw material extraction and processing',
      },
      {
        stage: 'production' as EmissionStage,
        kgCO2: production,
        percentage: (production / totalKgCO2) * 100,
        description: 'Manufacturing and assembly',
      },
      {
        stage: 'transportation' as EmissionStage,
        kgCO2: transportation,
        percentage: (transportation / totalKgCO2) * 100,
        description: 'Shipping and distribution',
      },
      {
        stage: 'use' as EmissionStage,
        kgCO2: use,
        percentage: (use / totalKgCO2) * 100,
        description: 'Washing, drying, and care',
      },
      {
        stage: 'endOfLife' as EmissionStage,
        kgCO2: endOfLife,
        percentage: (endOfLife / totalKgCO2) * 100,
        description: 'Disposal or recycling',
      },
    ];

    // Material impact
    const materialImpact = this.getMaterialImpact(item);

    // Comparison
    const averageKgCO2 = this.categoryAverages[item.category] || 20;
    const difference = totalKgCO2 - averageKgCO2;
    const percentageDifference = (difference / averageKgCO2) * 100;

    let rating: 'excellent' | 'good' | 'average' | 'poor' | 'very-poor';
    if (percentageDifference < -30) rating = 'excellent';
    else if (percentageDifference < -10) rating = 'good';
    else if (percentageDifference < 10) rating = 'average';
    else if (percentageDifference < 30) rating = 'poor';
    else rating = 'very-poor';

    return {
      itemId: item.id,
      item,
      totalKgCO2,
      breakdown,
      materialImpact,
      comparisonToAverage: {
        averageKgCO2,
        difference,
        percentageDifference,
        rating,
      },
      equivalents: this.calculateEquivalents(totalKgCO2),
      reductionTips: this.getReductionTips(item, rating),
    };
  }

  /**
   * Calculate materials emissions
   */
  private calculateMaterialsEmissions(item: Item): number {
    // Mock calculation based on category
    const baseEmission = this.categoryAverages[item.category] || 20;
    return baseEmission * 0.4 + Math.random() * 3;
  }

  /**
   * Calculate production emissions
   */
  private calculateProductionEmissions(item: Item): number {
    const baseEmission = this.categoryAverages[item.category] || 20;
    return baseEmission * 0.3 + Math.random() * 2;
  }

  /**
   * Calculate transportation emissions
   */
  private calculateTransportationEmissions(item: Item): number {
    const baseEmission = this.categoryAverages[item.category] || 20;
    return baseEmission * 0.15 + Math.random() * 1.5;
  }

  /**
   * Calculate use phase emissions
   */
  private calculateUseEmissions(item: Item): number {
    const baseEmission = this.categoryAverages[item.category] || 20;
    return baseEmission * 0.1 + Math.random() * 1;
  }

  /**
   * Calculate end-of-life emissions
   */
  private calculateEndOfLifeEmissions(item: Item): number {
    const baseEmission = this.categoryAverages[item.category] || 20;
    return baseEmission * 0.05 + Math.random() * 0.5;
  }

  /**
   * Get material impact breakdown
   */
  private getMaterialImpact(item: Item): DetailedFootprint['materialImpact'] {
    // Mock material composition
    const materials: MaterialType[] = ['cotton', 'polyester', 'organic'];
    const totalEmission = materials.reduce((sum, mat) => sum + this.materialEmissions[mat], 0);

    return materials.map(material => ({
      material,
      kgCO2: this.materialEmissions[material],
      percentage: (this.materialEmissions[material] / totalEmission) * 100,
    }));
  }

  /**
   * Calculate equivalents
   */
  private calculateEquivalents(kgCO2: number): DetailedFootprint['equivalents'] {
    return [
      {
        type: 'Driving',
        value: Math.round(kgCO2 * 4.5),
        unit: 'km',
        icon: '🚗',
      },
      {
        type: 'Trees needed',
        value: Math.ceil(kgCO2 / 20),
        unit: 'trees',
        icon: '🌳',
      },
      {
        type: 'Smartphone charges',
        value: Math.round(kgCO2 * 250),
        unit: 'charges',
        icon: '📱',
      },
      {
        type: 'LED bulb hours',
        value: Math.round(kgCO2 * 1000),
        unit: 'hours',
        icon: '💡',
      },
    ];
  }

  /**
   * Get reduction tips
   */
  private getReductionTips(item: Item, rating: string): string[] {
    const tips: string[] = [];

    if (rating === 'poor' || rating === 'very-poor') {
      tips.push('Consider buying secondhand instead of new');
      tips.push('Look for items made from recycled or organic materials');
      tips.push('Choose local brands to reduce transportation emissions');
      tips.push('Wash in cold water and air dry to reduce use-phase emissions');
    } else if (rating === 'average') {
      tips.push('Good choice! Wash in cold water to further reduce impact');
      tips.push('Consider repairing instead of replacing when worn');
    } else {
      tips.push('Excellent choice! This item has low environmental impact');
      tips.push('Share your sustainable choices to inspire others');
    }

    return tips.slice(0, 3);
  }

  /**
   * Calculate wardrobe footprint
   */
  async calculateWardrobeFootprint(items: Item[]): Promise<WardrobeFootprint> {
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Calculate individual footprints
    const footprints = await Promise.all(
      items.slice(0, 20).map(item => this.calculateItemFootprint(item))
    );

    const totalKgCO2 = footprints.reduce((sum, fp) => sum + fp.totalKgCO2, 0);
    const averagePerItem = totalKgCO2 / items.length;

    // Category breakdown
    const categoryMap = new Map<string, { kgCO2: number; count: number }>();
    footprints.forEach(fp => {
      const category = fp.item.category;
      const existing = categoryMap.get(category) || { kgCO2: 0, count: 0 };
      categoryMap.set(category, {
        kgCO2: existing.kgCO2 + fp.totalKgCO2,
        count: existing.count + 1,
      });
    });

    const breakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      kgCO2: data.kgCO2,
      percentage: (data.kgCO2 / totalKgCO2) * 100,
      itemCount: data.count,
    })).sort((a, b) => b.kgCO2 - a.kgCO2);

    // Timeline (last 6 months)
    const timeline = this.generateTimeline();

    // Top and lowest emitters
    const sorted = footprints.sort((a, b) => b.totalKgCO2 - a.totalKgCO2);
    const topEmitters = sorted.slice(0, 5).map(fp => ({
      item: fp.item,
      kgCO2: fp.totalKgCO2,
    }));
    const lowestEmitters = sorted.slice(-5).reverse().map(fp => ({
      item: fp.item,
      kgCO2: fp.totalKgCO2,
    }));

    // Projections
    const projections = [
      {
        period: 'Next Month',
        kgCO2: totalKgCO2 * 0.05,
        trend: 'stable' as const,
      },
      {
        period: 'Next 3 Months',
        kgCO2: totalKgCO2 * 0.15,
        trend: 'decreasing' as const,
      },
      {
        period: 'Next Year',
        kgCO2: totalKgCO2 * 0.6,
        trend: 'decreasing' as const,
      },
    ];

    return {
      totalKgCO2,
      itemCount: items.length,
      averagePerItem,
      breakdown,
      timeline,
      topEmitters,
      lowestEmitters,
      projections,
    };
  }

  /**
   * Generate timeline data
   */
  private generateTimeline(): WardrobeFootprint['timeline'] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      kgCO2: Math.random() * 50 + 20,
    }));
  }

  /**
   * Get reduction strategies
   */
  async getReductionStrategies(currentFootprint: number): Promise<ReductionStrategy[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
      {
        id: '1',
        title: 'Buy Secondhand First',
        description: 'Purchase pre-owned items instead of new ones',
        potentialReduction: currentFootprint * 0.8,
        percentageReduction: 80,
        difficulty: 'easy',
        timeframe: 'Immediate',
        steps: [
          'Browse ThredUp, Poshmark, or Depop',
          'Check local thrift stores',
          'Join clothing swap groups',
        ],
        impact: 'high',
      },
      {
        id: '2',
        title: 'Choose Sustainable Materials',
        description: 'Opt for organic, recycled, or low-impact fabrics',
        potentialReduction: currentFootprint * 0.4,
        percentageReduction: 40,
        difficulty: 'medium',
        timeframe: '1-3 months',
        steps: [
          'Look for GOTS certified organic cotton',
          'Choose recycled polyester over virgin',
          'Consider Tencel, hemp, or linen',
        ],
        impact: 'high',
      },
      {
        id: '3',
        title: 'Reduce Washing Frequency',
        description: 'Wash clothes only when necessary',
        potentialReduction: currentFootprint * 0.15,
        percentageReduction: 15,
        difficulty: 'easy',
        timeframe: 'Immediate',
        steps: [
          'Spot clean minor stains',
          'Air out clothes between wears',
          'Use cold water when washing',
        ],
        impact: 'medium',
      },
      {
        id: '4',
        title: 'Repair and Upcycle',
        description: 'Extend the life of your existing clothes',
        potentialReduction: currentFootprint * 0.25,
        percentageReduction: 25,
        difficulty: 'medium',
        timeframe: '1-6 months',
        steps: [
          'Learn basic sewing skills',
          'Find a local tailor',
          'Get creative with alterations',
        ],
        impact: 'medium',
      },
      {
        id: '5',
        title: 'Support Local Brands',
        description: 'Reduce transportation emissions',
        potentialReduction: currentFootprint * 0.2,
        percentageReduction: 20,
        difficulty: 'medium',
        timeframe: '1-3 months',
        steps: [
          'Research local sustainable brands',
          'Visit local markets and boutiques',
          'Check brand manufacturing locations',
        ],
        impact: 'medium',
      },
    ];
  }

  /**
   * Get offset projects
   */
  async getOffsetProjects(): Promise<OffsetProject[]> {
    await new Promise(resolve => setTimeout(resolve, 400));

    return [
      {
        id: '1',
        name: 'Amazon Rainforest Reforestation',
        type: 'reforestation',
        description: 'Plant native trees in deforested areas of the Amazon',
        location: 'Brazil',
        costPerKg: 0.40,
        minOffset: 10,
        certification: 'Gold Standard',
        impact: 'Restores biodiversity and captures CO₂',
        imageUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5',
      },
      {
        id: '2',
        name: 'Wind Energy Development',
        type: 'renewable-energy',
        description: 'Support wind farm construction in developing regions',
        location: 'India',
        costPerKg: 0.60,
        minOffset: 20,
        certification: 'Verified Carbon Standard',
        impact: 'Replaces fossil fuel energy with clean power',
        imageUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7',
      },
      {
        id: '3',
        name: 'Ocean Plastic Removal',
        type: 'ocean-cleanup',
        description: 'Remove plastic waste from oceans and coastlines',
        location: 'Global',
        costPerKg: 0.50,
        minOffset: 15,
        certification: 'Ocean Cleanup Certified',
        impact: 'Protects marine life and prevents microplastics',
        imageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19',
      },
      {
        id: '4',
        name: 'Direct Air Capture',
        type: 'carbon-capture',
        description: 'Remove CO₂ directly from the atmosphere',
        location: 'Iceland',
        costPerKg: 0.80,
        minOffset: 25,
        certification: 'Climeworks Certified',
        impact: 'Permanent carbon removal and storage',
        imageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e',
      },
    ];
  }

  /**
   * Calculate offset cost
   */
  async calculateOffset(kgCO2: number, projectIds: string[]): Promise<OffsetCalculation> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const projects = await this.getOffsetProjects();
    const selectedProjects = projects.filter(p => projectIds.includes(p.id));

    // Distribute CO2 evenly across selected projects
    const allocationPerProject = kgCO2 / selectedProjects.length;

    const projectAllocations = selectedProjects.map(project => ({
      project,
      allocation: allocationPerProject,
      cost: allocationPerProject * project.costPerKg,
    }));

    const totalCost = projectAllocations.reduce((sum, pa) => sum + pa.cost, 0);

    return {
      kgCO2ToOffset: kgCO2,
      totalCost,
      projects: projectAllocations,
      equivalents: {
        trees: Math.ceil(kgCO2 / 20),
        solarPanels: Math.ceil(kgCO2 / 500),
        windTurbines: Math.ceil(kgCO2 / 5000),
      },
    };
  }

  /**
   * Compare user to average
   */
  async compareToAverage(userFootprint: number): Promise<ComparisonData> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const averageUser = 500; // kg CO2 per year
    const sustainableTarget = 200; // kg CO2 per year

    const percentile = Math.min(100, Math.max(0, 
      100 - ((userFootprint - sustainableTarget) / (averageUser - sustainableTarget)) * 100
    ));

    let message: string;
    let recommendations: string[];

    if (userFootprint < sustainableTarget) {
      message = 'Excellent! Your footprint is below the sustainable target.';
      recommendations = [
        'Keep up the great work!',
        'Share your sustainable practices with others',
        'Consider offsetting your remaining emissions',
      ];
    } else if (userFootprint < averageUser) {
      message = 'Good! Your footprint is below average.';
      recommendations = [
        'Try buying more secondhand items',
        'Choose sustainable materials when possible',
        'Reduce washing frequency',
      ];
    } else {
      message = 'Your footprint is above average. There\'s room for improvement.';
      recommendations = [
        'Start by buying secondhand',
        'Focus on quality over quantity',
        'Learn about sustainable materials',
        'Consider offsetting your emissions',
      ];
    }

    return {
      userFootprint,
      averageUser,
      sustainableTarget,
      percentile,
      message,
      recommendations,
    };
  }
}

export const carbonFootprintService = new CarbonFootprintService();

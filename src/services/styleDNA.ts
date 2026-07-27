/**
 * Style DNA — maps the real wardrobe analysis (aiStyleService.StyleProfile) to the
 * archetype naming and voice from the Styled Business Strategy v2.0 "Style DNA™" feature.
 */

import { StyleProfile, StyleCategory } from './aiStyleService';

export interface StyleDNAResult {
  archetype: string;
  tagline: string;
  description: string;
  inYourDNA: string[];
  rarelyYou: string[];
}

const ARCHETYPES: Record<StyleCategory, StyleDNAResult> = {
  classic: {
    archetype: 'Quiet Luxe',
    tagline: 'You dress for texture, not attention.',
    description:
      'A closet of warm neutrals, structured shoulders, and one softening detail per look — built from quiet, considered choices.',
    inYourDNA: ['Structured shoulders', 'Wide-leg trouser', 'Warm neutrals', 'Natural fabrics'],
    rarelyYou: ['Cropped silhouettes', 'High saturation', 'Logo-forward pieces'],
  },
  minimalist: {
    archetype: 'Minimal Edge',
    tagline: 'You let the cut speak, not the color.',
    description:
      'Clean lines, a tight neutral palette, and pieces chosen for how they move, not how loud they read.',
    inYourDNA: ['Clean tailoring', 'Monochrome palettes', 'Considered proportion'],
    rarelyYou: ['Busy prints', 'Layered accessories', 'Bright color blocking'],
  },
  bohemian: {
    archetype: 'Boho Ease',
    tagline: 'You dress like the day is already going well.',
    description:
      'Flowing silhouettes, textured layers, and pattern used with a light hand — comfort that still reads intentional.',
    inYourDNA: ['Flowing silhouettes', 'Natural texture', 'Warm earth tones'],
    rarelyYou: ['Sharp tailoring', 'Structured shoulders', 'Cool monochrome'],
  },
  streetwear: {
    archetype: 'Bold Street',
    tagline: 'You dress for movement and presence.',
    description:
      'Oversized proportions, statement footwear, and a willingness to mix high and low — confident, not careful.',
    inYourDNA: ['Oversized proportion', 'Statement sneakers', 'Graphic layering'],
    rarelyYou: ['Delicate fabrics', 'Muted neutrals only', 'Formal tailoring'],
  },
  vintage: {
    archetype: 'Vintage Romance',
    tagline: 'You dress like every piece has a story.',
    description:
      'Retro silhouettes, rich texture, and details that feel collected over time rather than bought all at once.',
    inYourDNA: ['Retro silhouettes', 'Rich texture', 'Collected details'],
    rarelyYou: ['Minimal styling', 'Athletic fabrics', 'Ultra-modern cuts'],
  },
  athleisure: {
    archetype: 'Elevated Casual',
    tagline: 'You dress for a day that could go anywhere.',
    description:
      'Soft structure, easy layering, and performance fabrics styled to look considered rather than accidental.',
    inYourDNA: ['Easy layering', 'Soft structure', 'Performance fabrics'],
    rarelyYou: ['Formal tailoring', 'Delicate embellishment', 'High heels'],
  },
  formal: {
    archetype: 'Refined Formal',
    tagline: 'You dress for the room, precisely.',
    description:
      'Sharp tailoring, considered proportion, and fabrics that hold their structure through a long day.',
    inYourDNA: ['Sharp tailoring', 'Structured silhouettes', 'Rich fabrics'],
    rarelyYou: ['Casual knits', 'Distressed denim', 'Oversized fits'],
  },
  casual: {
    archetype: 'Elevated Casual',
    tagline: 'You dress for comfort that still looks put-together.',
    description:
      'Easy separates and soft neutrals, styled with just enough structure to read intentional.',
    inYourDNA: ['Soft separates', 'Everyday neutrals', 'Relaxed fit'],
    rarelyYou: ['Formal tailoring', 'High-shine fabrics', 'Statement color'],
  },
};

export function getStyleDNA(profile: StyleProfile): StyleDNAResult {
  const dominant = profile.dominantStyles[0]?.category || 'casual';
  return ARCHETYPES[dominant] || ARCHETYPES.casual;
}

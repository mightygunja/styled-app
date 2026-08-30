/**
 * Style Voice — maps the real wardrobe analysis (aiStyleService.StyleProfile) to the
 * archetype naming and voice from the 33 Trends Business Strategy v2.0 style-profile feature.
 */

import { StyleProfile, StyleCategory } from './aiStyleService';

export interface StyleVoiceResult {
  archetype: string;
  tagline: string;
  description: string;
  inYourStyle: string[];
  rarelyYou: string[];
}

const ARCHETYPES: Record<StyleCategory, StyleVoiceResult> = {
  classic: {
    archetype: 'Quiet Luxe',
    tagline: 'You dress for texture, not attention.',
    description:
      'A closet of warm neutrals, structured shoulders, and one softening detail per look — built from quiet, considered choices.',
    inYourStyle: ['Structured shoulders', 'Wide-leg trouser', 'Warm neutrals', 'Natural fabrics'],
    rarelyYou: ['Cropped silhouettes', 'High saturation', 'Logo-forward pieces'],
  },
  minimalist: {
    archetype: 'Minimal Edge',
    tagline: 'You let the cut speak, not the color.',
    description:
      'Clean lines, a tight neutral palette, and pieces chosen for how they move, not how loud they read.',
    inYourStyle: ['Clean tailoring', 'Monochrome palettes', 'Considered proportion'],
    rarelyYou: ['Busy prints', 'Layered accessories', 'Bright color blocking'],
  },
  bohemian: {
    archetype: 'Boho Ease',
    tagline: 'You dress like the day is already going well.',
    description:
      'Flowing silhouettes, textured layers, and pattern used with a light hand — comfort that still reads intentional.',
    inYourStyle: ['Flowing silhouettes', 'Natural texture', 'Warm earth tones'],
    rarelyYou: ['Sharp tailoring', 'Structured shoulders', 'Cool monochrome'],
  },
  streetwear: {
    archetype: 'Bold Street',
    tagline: 'You dress for movement and presence.',
    description:
      'Oversized proportions, statement footwear, and a willingness to mix high and low — confident, not careful.',
    inYourStyle: ['Oversized proportion', 'Statement sneakers', 'Graphic layering'],
    rarelyYou: ['Delicate fabrics', 'Muted neutrals only', 'Formal tailoring'],
  },
  vintage: {
    archetype: 'Vintage Romance',
    tagline: 'You dress like every piece has a story.',
    description:
      'Retro silhouettes, rich texture, and details that feel collected over time rather than bought all at once.',
    inYourStyle: ['Retro silhouettes', 'Rich texture', 'Collected details'],
    rarelyYou: ['Minimal styling', 'Athletic fabrics', 'Ultra-modern cuts'],
  },
  athleisure: {
    archetype: 'Soft Utility',
    tagline: 'You dress for a day that could go anywhere.',
    description:
      'Soft structure, easy layering, and performance fabrics styled to look considered rather than accidental.',
    inYourStyle: ['Easy layering', 'Soft structure', 'Performance fabrics'],
    rarelyYou: ['Formal tailoring', 'Delicate embellishment', 'High heels'],
  },
  formal: {
    archetype: 'Refined Formal',
    tagline: 'You dress for the room, precisely.',
    description:
      'Sharp tailoring, considered proportion, and fabrics that hold their structure through a long day.',
    inYourStyle: ['Sharp tailoring', 'Structured silhouettes', 'Rich fabrics'],
    rarelyYou: ['Casual knits', 'Distressed denim', 'Oversized fits'],
  },
  casual: {
    archetype: 'Considered Casual',
    tagline: 'You dress for comfort that still looks put-together.',
    description:
      'Easy separates and soft neutrals, styled with just enough structure to read intentional.',
    inYourStyle: ['Soft separates', 'Everyday neutrals', 'Relaxed fit'],
    rarelyYou: ['Formal tailoring', 'High-shine fabrics', 'Statement color'],
  },
};

export function getStyleVoice(profile: StyleProfile): StyleVoiceResult {
  const dominant = profile.dominantStyles[0]?.category || 'casual';
  return ARCHETYPES[dominant] || ARCHETYPES.casual;
}

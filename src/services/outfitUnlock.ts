/**
 * Outfit Unlock
 *
 * Answers the one question a shopper actually has and no competitor answers:
 * if I buy this, what does it give me that I don't already have?
 *
 * Not "this is your colour" - that is a property of the garment. This is a
 * property of the garment *against the wardrobe they already own*: how many
 * things it pairs with, and how many genuinely new outfits it creates.
 *
 * Entirely deterministic. Every number here is countable from the user's real
 * closet, which is what makes it safe to put in front of someone as a reason
 * to spend money.
 */

import { Item } from '../types';

export type GarmentRole = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory';

export interface OutfitUnlock {
  role: GarmentRole;
  /** Owned items this genuinely works with. */
  pairsWith: number;
  /** Distinct new outfits it creates that the user cannot make today. */
  newOutfits: number;
  /** A few of the strongest pairings, for naming specifics in the UI. */
  bestPairings: Array<{ id: string; label: string }>;
}

const NEUTRALS = [
  'black', 'white', 'grey', 'gray', 'navy', 'beige', 'cream', 'tan',
  'khaki', 'ivory', 'charcoal', 'stone', 'camel', 'denim',
];

/**
 * Colour families for harmony checks. Deliberately coarse - the goal is to
 * avoid claiming a pairing works when it clashes, not to replicate colour
 * theory. Over-precision here would produce confident nonsense.
 */
const FAMILIES: Record<string, string[]> = {
  warm: ['red', 'orange', 'rust', 'terracotta', 'coral', 'burgundy', 'maroon', 'brown', 'gold', 'mustard'],
  cool: ['blue', 'teal', 'turquoise', 'aqua', 'indigo', 'cobalt'],
  green: ['green', 'olive', 'sage', 'emerald', 'forest'],
  purple: ['purple', 'lilac', 'lavender', 'plum', 'violet'],
  pink: ['pink', 'blush', 'rose', 'fuchsia', 'magenta'],
  yellow: ['yellow', 'lemon', 'butter'],
};

function familyOf(color: string): string | null {
  const c = (color || '').toLowerCase();
  if (!c) return null;
  for (const [family, members] of Object.entries(FAMILIES)) {
    if (members.some(m => c.includes(m))) return family;
  }
  return null;
}

function isNeutral(color: string): boolean {
  const c = (color || '').toLowerCase();
  return NEUTRALS.some(n => c.includes(n));
}

/**
 * Whether two colours can sit in the same outfit.
 *
 * A neutral on either side is always fine - that is what makes neutrals
 * useful, and it is why a black trouser scores high pairing counts. Beyond
 * that, same-family works and cross-family does not. Unknown colours are
 * treated as compatible rather than incompatible: refusing to count a pairing
 * because the data is missing would understate the wardrobe.
 */
export function colorsWork(a: string, b: string): boolean {
  if (!a || !b) return true;
  if (isNeutral(a) || isNeutral(b)) return true;

  const fa = familyOf(a);
  const fb = familyOf(b);
  if (!fa || !fb) return true;
  return fa === fb;
}

export function roleForCategory(category: string): GarmentRole {
  switch ((category || '').toLowerCase()) {
    case 'bottoms':
      return 'bottom';
    case 'dresses':
      return 'dress';
    case 'outerwear':
      return 'outerwear';
    case 'shoes':
      return 'shoes';
    case 'accessories':
    case 'bags':
      return 'accessory';
    default:
      return 'top';
  }
}

function labelFor(item: Item): string {
  return [item.color, (item as any).subcategory || item.category].filter(Boolean).join(' ');
}

/**
 * How much a candidate garment would open up the wardrobe it is joining.
 *
 * `newOutfits` counts only outfits that do not exist today: a new top creates
 * one outfit per bottom it works with, because each of those pairings is a
 * combination the user currently cannot wear. Shoes, outerwear and accessories
 * are counted as pairings but deliberately NOT as outfit multipliers - a third
 * pair of boots does not triple someone's outfits, and claiming it does is the
 * kind of number that destroys trust the first time a user thinks about it.
 */
export function computeOutfitUnlock(
  candidate: { category: string; color?: string },
  closetItems: Item[]
): OutfitUnlock {
  const role = roleForCategory(candidate.category);
  const color = candidate.color || '';

  const compatible = (items: Item[]) =>
    items.filter(i => colorsWork(color, i.color || ''));

  const byRole = (target: GarmentRole) =>
    closetItems.filter(i => roleForCategory(i.category) === target);

  const tops = compatible(byRole('top'));
  const bottoms = compatible(byRole('bottom'));

  let pairsWith = 0;
  let newOutfits = 0;
  let pairingPool: Item[] = [];

  switch (role) {
    case 'top':
      pairingPool = bottoms;
      newOutfits = bottoms.length;
      pairsWith = bottoms.length + compatible(byRole('outerwear')).length + compatible(byRole('shoes')).length;
      break;

    case 'bottom':
      pairingPool = tops;
      newOutfits = tops.length;
      pairsWith = tops.length + compatible(byRole('outerwear')).length + compatible(byRole('shoes')).length;
      break;

    case 'dress':
      // A dress is a complete outfit on its own; layers vary it rather than
      // multiplying it, so it counts as one plus whatever it layers under.
      pairingPool = compatible(byRole('outerwear'));
      newOutfits = 1;
      pairsWith = pairingPool.length + compatible(byRole('shoes')).length;
      break;

    case 'outerwear':
      // Layers over existing outfits rather than creating new ones from
      // scratch, so it is credited with the outfits it can join.
      pairingPool = [...tops, ...compatible(byRole('dress'))];
      newOutfits = 0;
      pairsWith = tops.length + bottoms.length + compatible(byRole('dress')).length;
      break;

    default:
      // Shoes and accessories finish outfits without creating them.
      pairingPool = [...tops, ...compatible(byRole('dress'))];
      newOutfits = 0;
      pairsWith = tops.length + bottoms.length + compatible(byRole('dress')).length;
      break;
  }

  const bestPairings = pairingPool
    // Most-worn first: the pieces someone actually reaches for are the most
    // persuasive things to name.
    .sort((a, b) => (b.wornCount ?? 0) - (a.wornCount ?? 0))
    .slice(0, 3)
    .map(i => ({ id: i.id, label: labelFor(i) }));

  return { role, pairsWith, newOutfits, bestPairings };
}

/** One-line summary of the unlock, or null when there is nothing worth claiming. */
export function unlockHeadline(unlock: OutfitUnlock): string | null {
  if (unlock.newOutfits >= 3) {
    return `Makes ${unlock.newOutfits} new outfits from things you already own`;
  }
  if (unlock.pairsWith >= 4) {
    return `Works with ${unlock.pairsWith} pieces in your closet`;
  }
  if (unlock.newOutfits > 0) {
    return `Makes ${unlock.newOutfits} new ${unlock.newOutfits === 1 ? 'outfit' : 'outfits'} with what you own`;
  }
  return null;
}

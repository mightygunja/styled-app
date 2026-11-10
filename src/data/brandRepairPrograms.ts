/**
 * Brands that look after their own pieces.
 *
 * When a closet item's brand runs a repair, recrafting or take-back
 * programme, the item page says so and links to it - the cheapest, most
 * reliable repair route there is, and nobody has to find a tailor.
 *
 * Every entry is a page that was opened and confirmed live on the `checked`
 * date. `offer` says only what the page's own title supports; it promises no
 * price, turnaround or outcome. A brand is NOT listed unless its programme
 * page was seen - a guessed link that 404s is worse than no link. Tried and
 * left out on 2026-11-10 because no programme page could be confirmed:
 * Nudie Jeans, Dr. Martens, Birkenstock, Coach, Uniqlo, L.L.Bean.
 *
 * Pure data, no app imports, so scripts/auditGarmentLife.ts can check it.
 */

export interface BrandRepairProgram {
  /** The brand as the item page should print it. */
  brand: string;
  /** Lowercase forms a closet item's brand field may take. */
  aliases: string[];
  /** 'repair' mends the piece for you; 'takeback' takes it back to resell or recycle. */
  kind: 'repair' | 'takeback';
  /** What the programme is, in the brand's own terms. */
  offer: string;
  url: string;
  /** When the page was last opened and confirmed. */
  checked: string;
}

export const BRAND_REPAIR_PROGRAMS: BrandRepairProgram[] = [
  {
    brand: 'Patagonia',
    aliases: ['patagonia'],
    kind: 'repair',
    offer: 'Product care and repair',
    url: 'https://www.patagonia.com/repairs/',
    checked: '2026-11-10',
  },
  {
    brand: "Levi's",
    aliases: ["levi's", 'levis', 'levi strauss'],
    kind: 'repair',
    offer: 'Tailor Shop: jean repairs and tailoring',
    url: 'https://www.levi.com/US/en_US/features/tailor-shop',
    checked: '2026-11-10',
  },
  {
    brand: 'Barbour',
    aliases: ['barbour'],
    kind: 'repair',
    offer: 'Repair and re-wax',
    url: 'https://www.barbour.com/us/repair-rewax',
    checked: '2026-11-10',
  },
  {
    brand: 'Red Wing',
    aliases: ['red wing', 'red wing shoes', 'red wing heritage'],
    kind: 'repair',
    offer: 'Boot repairs',
    url: 'https://www.redwingshoes.com/contact-us/repairs.html',
    checked: '2026-11-10',
  },
  {
    brand: 'Allen Edmonds',
    aliases: ['allen edmonds'],
    kind: 'repair',
    offer: 'Recrafting for dress and casual shoes',
    url: 'https://www.allenedmonds.com/recrafting',
    checked: '2026-11-10',
  },
  {
    brand: 'Danner',
    aliases: ['danner'],
    kind: 'repair',
    offer: 'Boot recrafting',
    url: 'https://www.danner.com/recrafting',
    checked: '2026-11-10',
  },
  {
    brand: "Arc'teryx",
    aliases: ["arc'teryx", 'arcteryx'],
    kind: 'repair',
    offer: 'Product service requests, including repairs',
    url: 'https://arcteryx.com/us/en/help/product-service',
    checked: '2026-11-10',
  },
  {
    brand: 'Filson',
    aliases: ['filson'],
    kind: 'repair',
    offer: 'Repairs',
    url: 'https://www.filson.com/pages/repairs',
    checked: '2026-11-10',
  },
  {
    brand: 'Fjällräven',
    aliases: ['fjallraven', 'fjällräven'],
    kind: 'repair',
    offer: 'Care and repair',
    url: 'https://www.fjallraven.com/us/en-us/about/sustainability/care-repair/',
    checked: '2026-11-10',
  },
  {
    brand: 'The North Face',
    aliases: ['the north face', 'north face'],
    kind: 'repair',
    offer: 'Warranty, including repairs',
    url: 'https://www.thenorthface.com/en-us/help/warranty',
    checked: '2026-11-10',
  },
  {
    brand: 'Eileen Fisher',
    aliases: ['eileen fisher'],
    kind: 'takeback',
    offer: 'Renew: takes its own pieces back to be worn again',
    url: 'https://www.eileenfisherrenew.com/',
    checked: '2026-11-10',
  },
];

/** Lowercase, no trademark marks, straight apostrophes, single spaces. */
export function normalizeBrand(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9'äöåé ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The programme for a closet item's brand, or null.
 *
 * Matches the whole brand or the brand followed by a line name ("Levi's
 * Premium", "Patagonia Worn Wear") - never a fragment, so "Northern Reflections"
 * does not find The North Face and "Dannerton" does not find Danner.
 */
export function repairProgramFor(brand: string | null | undefined): BrandRepairProgram | null {
  const b = normalizeBrand(brand);
  if (!b) return null;
  return (
    BRAND_REPAIR_PROGRAMS.find(program =>
      program.aliases.some(alias => b === alias || b.startsWith(`${alias} `))
    ) ?? null
  );
}

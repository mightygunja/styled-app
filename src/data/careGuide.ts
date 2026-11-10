/**
 * What can go wrong with a garment, and the honest route to fixing it.
 *
 * Nine issues, each with a tier: something most people can do at home in a
 * few minutes, or something to hand to a tailor, cobbler or cleaner. The
 * steps are short written instructions, not promises - nothing here says a
 * repair will succeed, only what the usual fix is and when to stop and hand
 * it over.
 *
 * Pure data, no app imports. The photo check (functions: diagnoseGarmentIssue)
 * may only answer with one of these ids.
 */

export type CareIssueId =
  | 'pilling'
  | 'button'
  | 'hem'
  | 'seam'
  | 'hole'
  | 'stain'
  | 'zip'
  | 'sole'
  | 'fit';

export type CareTier = 'diy' | 'pro';
export type CarePro = 'tailor' | 'cobbler' | 'cleaner';

export interface CareIssue {
  id: CareIssueId;
  /** Chip label. */
  label: string;
  /** One line, as you would say it to a friend. */
  summary: string;
  tier: CareTier;
  /** Who to hand it to - always present, because a DIY fix can still be beyond someone. */
  pro: CarePro;
  /** The usual fix, two to four short steps. Empty for pro-only issues. */
  steps: string[];
  /** When to stop and hand it over (or, for pro issues, what to ask for). */
  handOver: string;
  /** What a logged fix is called on the item's life record. */
  done: string;
  /** True when fixing it changes the garment itself (an alteration, not a repair). */
  alteration?: boolean;
}

export const CARE_ISSUES: CareIssue[] = [
  {
    id: 'pilling',
    label: 'Pilling',
    summary: 'Little bobbles on a knit. Surface wear, not damage.',
    tier: 'diy',
    pro: 'cleaner',
    steps: [
      'Lay the piece flat on a table, fabric pulled smooth.',
      'Run a fabric shaver or a sweater comb over it lightly, in one direction. Never pull the bobbles off by hand - that drags out more fibre.',
      'Wash it inside out on a gentle cycle from now on; pilling comes from rubbing.',
    ],
    handOver: 'If the knit is fine cashmere or the fabric is thinning underneath, a dry cleaner can de-pill it more gently.',
    done: 'De-pilled',
  },
  {
    id: 'button',
    label: 'Loose or lost button',
    summary: 'A button hanging by a thread, or gone.',
    tier: 'diy',
    pro: 'tailor',
    steps: [
      'Check the inside seam or the care label - most shirts and coats carry a spare.',
      'Use doubled thread. Sew through the holes four or five times, leaving a little slack so the button stands off the cloth.',
      'Wind the thread around that slack a few times under the button, then knot on the inside.',
    ],
    handOver: 'A coat button on heavy cloth, or one that has torn the fabric with it, is worth a tailor - it needs reinforcing behind.',
    done: 'Button resewn',
  },
  {
    id: 'hem',
    label: 'Fallen hem',
    summary: 'The hem has dropped, in part or all the way round.',
    tier: 'diy',
    pro: 'tailor',
    steps: [
      'Press the hem back up along its original fold.',
      'Catch it with small slip stitches, taking only a thread or two of the outer fabric so nothing shows on the right side.',
      'In a hurry, iron-on hem tape holds it - treat that as temporary.',
    ],
    handOver: 'Lined trousers, pleated skirts and anything in silk or a very fine fabric are quicker and neater at a tailor.',
    done: 'Hem restitched',
  },
  {
    id: 'seam',
    label: 'Split seam',
    summary: 'The stitching has come undone along a seam; the fabric itself is fine.',
    tier: 'diy',
    pro: 'tailor',
    steps: [
      'Turn the piece inside out and pin the seam closed along the old stitch line.',
      'Backstitch along that line with matching thread, starting and finishing a little past the gap.',
      'Press the seam flat.',
    ],
    handOver: 'If the seam split because the piece is too tight there, restitching will not hold - ask a tailor whether there is seam allowance to let out.',
    done: 'Seam restitched',
  },
  {
    id: 'hole',
    label: 'Hole or tear',
    summary: 'A hole in the fabric itself - a snag, a moth hole, worn-through denim.',
    tier: 'pro',
    pro: 'tailor',
    steps: [],
    handOver: 'Ask a tailor about darning (knits and denim) or a patch behind the tear. Small holes in knitwear can often be rewoven almost invisibly; say where it is and how big.',
    done: 'Hole mended',
  },
  {
    id: 'stain',
    label: 'Stain',
    summary: 'A mark that washing has not shifted, or one you have just made.',
    tier: 'diy',
    pro: 'cleaner',
    steps: [
      'Blot, do not rub. Rubbing pushes it in and roughs up the fabric.',
      'Rinse from the back with cold water, then work in a little liquid detergent and leave it ten minutes.',
      'Wash as the care label says, and check it is gone before any heat - a tumble dryer or an iron sets a stain for good.',
    ],
    handOver: 'Silk, wool, leather, suede, and anything labelled dry clean only go to a cleaner. Tell them what the stain is and what you have already tried.',
    done: 'Stain treated',
  },
  {
    id: 'zip',
    label: 'Broken zip',
    summary: 'A zip that splits, sticks, or has lost its pull.',
    tier: 'pro',
    pro: 'tailor',
    steps: [],
    handOver: 'A tailor can often replace just the slider; if teeth are missing the whole zip is replaced. Either is routine work.',
    done: 'Zip replaced',
  },
  {
    id: 'sole',
    label: 'Worn sole or heel',
    summary: 'Heels worn down at an angle, soles thin, or a sole coming away.',
    tier: 'pro',
    pro: 'cobbler',
    steps: [],
    handOver: 'A cobbler replaces heel tips and half soles while you wait in most shops, and can re-glue or resole. Go before the wear reaches the upper - after that it costs more.',
    done: 'Resoled',
  },
  {
    id: 'fit',
    label: 'Does not fit right',
    summary: 'Too long, too loose, too tight - nothing wrong with it, it is just not yours yet.',
    tier: 'pro',
    pro: 'tailor',
    steps: [],
    handOver: 'Hems, sleeves and waists are the routine alterations. Taking in is easier than letting out, which depends on how much spare fabric is in the seams - wear it to the fitting with the shoes you would wear it with.',
    done: 'Altered',
    alteration: true,
  },
];

export function careIssue(id: string | null | undefined): CareIssue | null {
  return CARE_ISSUES.find(issue => issue.id === id) ?? null;
}

const PRO_NAMES: Record<CarePro, string> = { tailor: 'a tailor', cobbler: 'a cobbler', cleaner: 'a dry cleaner' };

export function proName(pro: CarePro): string {
  return PRO_NAMES[pro];
}

/** Which issues make sense for a category - nobody resoles a jumper. */
export function careIssuesFor(category: string | null | undefined): CareIssue[] {
  const c = (category || '').toLowerCase();
  if (c === 'shoes') return CARE_ISSUES.filter(i => ['sole', 'stain', 'zip', 'seam'].includes(i.id));
  if (c === 'bags') return CARE_ISSUES.filter(i => ['zip', 'seam', 'stain', 'hole'].includes(i.id));
  if (c === 'accessories') return CARE_ISSUES.filter(i => ['stain', 'hole', 'pilling', 'seam'].includes(i.id));
  return CARE_ISSUES.filter(i => i.id !== 'sole');
}

/**
 * The pieces each public guide shows under its advice - the one place on the
 * logged-out site where a product link lives, so a search engine or an
 * affiliate-network reviewer can see where our links go without an account.
 *
 * Hand-picked from the curated catalogue (mockProductCatalog ids without the
 * `p-` prefix) so every piece genuinely illustrates the guide it sits under,
 * the same way seed trends carry `pieces`. Split by department: a women's
 * rail never shows a men's row and vice versa; unisex rows may appear in
 * both. `npx tsx scripts/auditGuidePieces.ts` checks every id resolves and
 * sits in the right department.
 *
 * Keyed by the guide's route name (GUIDES in GuideScreens.tsx). Guides with
 * no entry show no rail - closet organization has nothing to sell, and an
 * empty rail is worse than none.
 */

export interface GuidePieceSet {
  /** Section heading, in the guide's own voice. */
  title: string;
  /** One line on why these, not a sales line. */
  note: string;
  women: string[];
  men: string[];
}

export const GUIDE_PIECES: Record<string, GuidePieceSet> = {
  GuideCapsule: {
    title: 'The pieces a capsule is built on',
    note: 'Plain, well-made, and each one pairs with every other piece here - the test the guide sets.',
    women: ['o014', 'b001', 't002', 't003', 's007', 'a001'],
    men: ['mo002', 'mb001', 'mt001', 'mt004', 'ms002', 'ma001'],
  },
  GuideNothingToWear: {
    title: 'The connectors most closets are missing',
    note: 'Not statement pieces - the quiet ones that let the things you already own be worn together.',
    women: ['o015', 'b001', 't020', 's022', 'a067', 'a004'],
    men: ['mo001', 'mb005', 'mt003', 'ms006', 'ma001'],
  },
  GuideCostPerWear: {
    title: 'Where a higher price actually pays back',
    note: 'The categories that get worn a hundred times, so the math in the guide works in their favour.',
    women: ['o001', 's001', 'b001', 'a001', 't029'],
    men: ['mo002', 'ms009', 'mb001', 'ma005', 'mt004'],
  },
  GuideColorSeasons: {
    title: 'One piece in a colour to test against your face',
    note: 'A knit or scarf next to the face is where a palette shows fastest - try the colour before committing a whole outfit to it.',
    women: ['t017', 't009', 't003', 'a003', 't012', 'a027'],
    men: ['mt006', 'mt004', 'mt007', 'ma008', 'mt014'],
  },
  GuideBodyTypes: {
    title: 'Pieces that set a proportion, not hide one',
    note: 'Each of these moves the line the guide talks about - the waist, the leg, the shoulder - which is all body-type dressing is.',
    women: ['b005', 'd009', 'b009', 'a058', 't024', 's019'],
    men: ['mb003', 'mb007', 'mo001', 'ma001', 'ms004'],
  },
  GuideWardrobeGaps: {
    title: 'The gaps most closets share',
    note: 'The short list from the guide: the pieces whose absence stops other pieces from being worn.',
    women: ['a067', 'o014', 't021', 's007', 'a001', 'b002'],
    men: ['ma001', 'mo002', 'mt002', 'ms002', 'ma005', 'mb007'],
  },
  GuideWeddingGuest: {
    title: 'What holds up from ceremony to hour seven',
    note: 'Dress codes from the guide, in pieces: something that photographs, shoes you can dance in, and a bag that carries the checklist.',
    women: ['d008', 'd018', 'd009', 's038', 's019', 'a035'],
    men: ['mb013', 'mo001', 'mt002', 'ma003', 'ms005'],
  },
  GuideWorkWardrobe: {
    title: 'The 3×5+2 formula, in pieces',
    note: 'Three bottoms, five tops, two layers is the guide’s formula; these are the kind of pieces it is built from.',
    women: ['o016', 'b002', 't021', 'd019', 's020', 'a066'],
    men: ['mo001', 'mb007', 'mt002', 'mt007', 'ms004', 'ma005'],
  },
  GuideSustainable: {
    title: 'Made to pass the 30-wears test',
    note: 'Natural fibres and repairable construction - the two things that decide whether a piece is still around in three years.',
    women: ['t006', 'b020', 'd024', 't049', 's011', 'a029'],
    men: ['t006', 'mb010', 'mt027', 's011', 's025'],
  },
  GuideWhatsInStyle: {
    title: 'What the stages look like on a rail',
    note: 'Pieces from trends the report currently has at rising or peak - wide legs, burgundy, suede - so the stages in the guide are not abstract.',
    women: ['b005', 'a007', 'o009', 's006', 'b021', 't016'],
    men: ['mb003', 'mo004', 'ms013', 'mo009', 'mt021'],
  },
  GuideWearTrends: {
    title: 'One trend piece, the rest your own',
    note: 'Each of these is a single trend note that reads as yours next to plain, well-worn basics - the guide’s whole method.',
    women: ['b021', 'o009', 'a007', 's008'],
    men: ['mo004', 'ms013', 'mb008', 'ma003'],
  },
  GuideTrendBudget: {
    title: 'The one-piece rule, at the low end of the price range',
    note: 'A trend colour or texture from a high-street label, so if it fades next year nothing of consequence was spent.',
    women: ['o011', 'b015', 'a027', 't017', 's006'],
    men: ['mt006', 'ma017', 'mb010', 'ms002', 'mt004'],
  },
  GuideCityStyle: {
    title: 'What local dressing looks like as pieces',
    note: 'A block-print kurta, a linen kaftan, a Scandinavian raincoat: the same weather answered three ways, which is the point of the guide.',
    women: ['t080', 'd031', 's053', 'o035', 'a059'],
    men: ['mt025', 'mb017', 'ms017', 'o035', 'ma014'],
  },
  GuideFabric: {
    title: 'One piece per fabric the guide covers',
    note: 'Cashmere, linen, silk, wool, leather, suede - the way each one moves and wears is the reason it is here.',
    women: ['t029', 't019', 't001', 'o001', 'b032', 's015'],
    men: ['mt004', 'mt027', 'mt006', 'mo008', 'ms003', 'ma008'],
  },
};

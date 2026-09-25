/**
 * Checks the hand-picked guide rails (src/data/guidePieces.ts): every id
 * resolves to a catalogue row, no men's row sits in a women's rail or vice
 * versa, and each rail has enough pieces to show. Run after editing either
 * file:  npx tsx scripts/auditGuidePieces.ts
 */
import { BALANCED_CATALOG } from '../src/data/mockProductCatalog';
import { GUIDE_PIECES } from '../src/data/guidePieces';

const byId = new Map(BALANCED_CATALOG.map(p => [p.id, p]));
let problems = 0;

for (const [route, set] of Object.entries(GUIDE_PIECES)) {
  for (const [rail, wanted] of [['women', 'men'], ['men', 'women']] as const) {
    const ids = set[rail];
    if (ids.length < 3) { console.error(`${route}/${rail}: only ${ids.length} pieces`); problems++; }
    for (const id of ids) {
      const product = byId.get(`p-${id}`);
      if (!product) { console.error(`${route}/${rail}: ${id} is not in the catalogue`); problems++; continue; }
      if (product.department === wanted) {
        console.error(`${route}/${rail}: ${id} "${product.name}" is a ${wanted}'s row`);
        problems++;
      }
    }
    if (new Set(ids).size !== ids.length) { console.error(`${route}/${rail}: duplicate ids`); problems++; }
  }
}

if (problems) { console.error(`${problems} problem(s)`); process.exit(1); }
console.log(`OK - ${Object.keys(GUIDE_PIECES).length} guides, every rail resolves in the right department.`);

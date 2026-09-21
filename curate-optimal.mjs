import fs from 'node:fs';
import { variantCatalog } from './lib/variants.mjs';
import { proveOptimal } from './lib/optimal-moves.mjs';
const all = [
    ...JSON.parse(fs.readFileSync('lib/levels.json')),
    ...JSON.parse(fs.readFileSync('lib/sliding-levels.json')),
    ...variantCatalog,
  ],
  out = {};
for (const [i, l] of all.entries()) {
  const r = proveOptimal(l, 10000, { budgetMs: 30000, maxNodes: 2000000 });
  if (r.proven)
    out[l.id] = {
      minimumMoves: r.minimumMoves,
      signature: JSON.stringify([
        l.n,
        l.initial,
        l.source,
        l.sourceId,
        l.pieces,
        l.mode,
        l.variant,
        l.groups,
        l.owners,
        l.targets,
        l.sources,
      ]),
    };
  else console.log('Unproven', l.id);
  if (i % 50 === 0) console.log('Checked', i + 1, '/', all.length);
}
fs.writeFileSync('lib/optimal-catalog.json', JSON.stringify(out));
console.log('Certified', Object.keys(out).length, '/', all.length);

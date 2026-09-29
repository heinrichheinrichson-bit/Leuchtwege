import fs from 'node:fs';
import assert from 'node:assert/strict';
import { variantCatalog, variantPuzzle } from './lib/variants.mjs';
import { variantDifficulty } from './lib/variant-difficulty.mjs';
import { variantFingerprint } from './lib/variant-fingerprint.mjs';
// Deterministic offline curation. The app still searches for fresh boards first.
const seen = new Set(variantCatalog.map(variantFingerprint)),
  seeds = [];
for (let seed = 1300000; seeds.length < 128 && seed < 4000000; seed++) {
  const l = variantPuzzle('linked', seed, 6, 'reserve', 4);
  if (variantDifficulty(l).tier !== 'Schwer') continue;
  const key = variantFingerprint(l);
  if (seen.has(key)) continue;
  seen.add(key);
  seeds.push(seed);
  if (seeds.length % 32 === 0)
    console.log(`Validated ${seeds.length}/128 reserve boards`);
}
assert.equal(seeds.length, 128);
fs.writeFileSync(
  'lib/linked-reserve.mjs',
  '// Generator v4 seeds, independently rated Hard; no catalogue duplicates.\n' +
    'export const linkedReserve = ' +
    JSON.stringify(seeds) +
    ';\n',
);

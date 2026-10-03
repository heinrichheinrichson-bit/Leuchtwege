import fs from 'node:fs';
import assert from 'node:assert/strict';
import { variantCatalogSpecs } from './lib/variant-catalog-data.mjs';
import { variantPuzzle, variantModes } from './lib/variants.mjs';
import { variantDifficulty } from './lib/variant-difficulty.mjs';
import { variantFingerprint } from './lib/variant-fingerprint.mjs';
import { linkedBankSize } from './lib/linked-bank.mjs';
const specs = variantCatalogSpecs.map((s) => ({
  ...s,
  difficulty: variantDifficulty(
    variantPuzzle(s.mode, s.seed, s.n, s.id, s.generation),
  ),
}));
assert.equal(linkedBankSize, 158);
const existing = new Set(
  specs.map((s) =>
    variantFingerprint(variantPuzzle(s.mode, s.seed, s.n, s.id, s.generation)),
  ),
);
for (let i = 0; i < 30; i++) {
  const seed = Math.round((i * (linkedBankSize - 1)) / 29),
    id = `variant-v5-linked-catalog-6-${seed}`;
  if (specs.some((s) => s.id === id)) continue;
  const l = variantPuzzle('linked', seed, 6, id, 5),
    difficulty = variantDifficulty(l),
    key = variantFingerprint(l);
  assert.equal(difficulty.tier, 'Schwer');
  assert(!existing.has(key));
  existing.add(key);
  specs.push({ mode: 'linked', n: 6, seed, id, generation: 5, difficulty });
}
const tiers = ['Leicht', 'Mittel', 'Schwer'];
specs.sort(
  (a, b) =>
    variantModes.indexOf(a.mode) - variantModes.indexOf(b.mode) ||
    tiers.indexOf(a.difficulty.tier) - tiers.indexOf(b.difficulty.tier) ||
    a.difficulty.score - b.difficulty.score ||
    a.id.localeCompare(b.id),
);
fs.writeFileSync(
  'lib/variant-catalog-data.mjs',
  '// Stable puzzle identities; linked rating/generator v5, other modes unchanged.\nexport const variantCatalogSpecs = ' +
    JSON.stringify(specs, null, 2) +
    ';\n',
);
console.log(
  'Linked catalogue:',
  Object.fromEntries(
    tiers.map((t) => [
      t,
      specs.filter((s) => s.mode === 'linked' && s.difficulty.tier === t)
        .length,
    ]),
  ),
);

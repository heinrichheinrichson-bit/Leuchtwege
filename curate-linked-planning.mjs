import fs from 'node:fs';
import assert from 'node:assert/strict';
import { variantCatalogSpecs } from './lib/variant-catalog-data.mjs';
import { variantPuzzle, variantStatus, variantModes } from './lib/variants.mjs';
import { variantDifficulty } from './lib/variant-difficulty.mjs';
import { variantFingerprint } from './lib/variant-fingerprint.mjs';
import { fresh } from './lib/session.mjs';

// Re-rate published boards; never alter their seed, generator or identity.
const specs = variantCatalogSpecs.map((s) => ({
  ...s,
  difficulty: variantDifficulty(
    variantPuzzle(s.mode, s.seed, s.n, s.id, s.generation),
  ),
}));
const fingerprints = new Set(
  specs.map((s) =>
    variantFingerprint(variantPuzzle(s.mode, s.seed, s.n, s.id, s.generation)),
  ),
);
let count = specs.filter(
  (s) => s.mode === 'linked' && s.difficulty.tier === 'Schwer',
).length;
const retained = count;
for (let seed = 800000; count < 30 && seed < 1200000; seed++) {
  const id = `variant-v4-linked-planning-6-${seed}`;
  const l = variantPuzzle('linked', seed, 6, id, 4);
  const difficulty = variantDifficulty(l);
  if (difficulty.tier !== 'Schwer') continue;
  const key = variantFingerprint(l);
  if (fingerprints.has(key)) continue;
  assert(variantStatus({ ...l, initial: l.solution }, fresh(l)).solved);
  specs.push({ mode: 'linked', seed, n: 6, id, generation: 4, difficulty });
  fingerprints.add(key);
  count++;
}
assert(count >= 30, 'Do not publish an incomplete hard category');
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
  '// Stable puzzle identities; ratings v4, generator v4.\nexport const variantCatalogSpecs = ' +
    JSON.stringify(specs, null, 2) +
    ';\n',
);
console.log(
  `Linked hard: ${retained} retained, ${count - retained} added. Published boards preserved.`,
);

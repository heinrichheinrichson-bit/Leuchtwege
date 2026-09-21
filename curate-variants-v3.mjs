import fs from 'node:fs';
import { variantCatalogSpecs } from './lib/variant-catalog-data.mjs';
import { variantPuzzle, variantModes, variantPlan } from './lib/variants.mjs';
import { variantDifficulty, variantTiers } from './lib/variant-difficulty.mjs';
import { variantFingerprint } from './lib/variant-fingerprint.mjs';
import { variantSizes } from './lib/random-variants.mjs';
import { fresh } from './lib/session.mjs';
const specs = variantCatalogSpecs.map((s) => ({
  ...s,
  difficulty: variantDifficulty(
    variantPuzzle(s.mode, s.seed, s.n, s.id, s.generation),
  ),
}));
const seen = new Set(
  specs.map((s) =>
    variantFingerprint(variantPuzzle(s.mode, s.seed, s.n, s.id, s.generation)),
  ),
);
for (const mode of variantModes)
  for (const tier of variantTiers) {
    let count = specs.filter(
      (s) => s.mode === mode && s.difficulty.tier === tier,
    ).length;
    const sizes = variantSizes[mode][tier];
    for (let seed = 300000; count < 30 && seed < 350000; seed++) {
      const n = sizes[seed % sizes.length],
        id = `variant-v3-${mode}-catalog-${n}-${seed}`,
        l = variantPuzzle(mode, seed, n, id, 3),
        difficulty = variantDifficulty(l);
      if (difficulty.tier !== tier) continue;
      const key = variantFingerprint(l);
      if (seen.has(key) || variantPlan(l, fresh(l)).length < 4) continue;
      seen.add(key);
      specs.push({ mode, n, seed, id, generation: 3, difficulty });
      count++;
    }
    if (count < 30) throw Error(`Not enough ${mode}/${tier}`);
    console.log(mode, tier, count);
  }
specs.sort(
  (a, b) =>
    variantModes.indexOf(a.mode) - variantModes.indexOf(b.mode) ||
    variantTiers.indexOf(a.difficulty.tier) -
      variantTiers.indexOf(b.difficulty.tier) ||
    a.difficulty.score - b.difficulty.score ||
    a.id.localeCompare(b.id),
);
fs.writeFileSync(
  'lib/variant-catalog-data.mjs',
  '// Permanent identities; curated with measured deduction and dead-end depth.\nexport const variantCatalogSpecs = ' +
    JSON.stringify(specs, null, 2) +
    ';\n',
);
console.log('Total', specs.length);

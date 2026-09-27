import fs from 'node:fs';
import assert from 'node:assert/strict';
import { variantCatalogSpecs } from './lib/variant-catalog-data.mjs';
import {
  variantPuzzle,
  variantModes,
  variantPlan,
  variantStatus,
} from './lib/variants.mjs';
import { variantDifficulty, variantTiers } from './lib/variant-difficulty.mjs';
import { variantFingerprint } from './lib/variant-fingerprint.mjs';
import { fresh } from './lib/session.mjs';
import { makeLevel, topologyKey, similarity } from './lib/level-design.mjs';
import { difficulty } from './lib/difficulty.mjs';
import { solutions } from './lib/game.mjs';
const old = JSON.parse(fs.readFileSync('lib/levels.json'));
const levels = old.map((l) => ({ ...l, difficulty: difficulty(l) }));
for (const tier of variantTiers) {
  let count = levels.filter((l) => l.difficulty.tier === tier).length;
  for (let seed = 700000; count < 30 && seed < 900000; seed++) {
    const n = tier === 'Schwer' ? 6 : tier === 'Mittel' ? 5 : 3;
    const l = makeLevel(n, seed);
    if (!l) continue;
    const d = difficulty(l);
    if (d.tier !== tier || d.method === 'search') continue;
    if (
      levels.some(
        (o) => topologyKey(o) === topologyKey(l) || similarity(o, l) > 0.9,
      )
    )
      continue;
    if (solutions(l.initial, n, l.source).length !== 1) continue;
    levels.push({
      ...l,
      id: `lw-${String(levels.length + 1).padStart(3, '0')}`,
      name: 'Neue Verbindungen',
      difficulty: d,
      lesson: null,
    });
    count++;
  }
  assert(count >= 30);
  console.log('turn', tier, count);
}
const rank = { Leicht: 0, Mittel: 1, Schwer: 2 };
const sorted = levels
  .map((l, i) => ({ l, i }))
  .sort(
    (a, b) =>
      rank[a.l.difficulty.tier] - rank[b.l.difficulty.tier] ||
      a.l.difficulty.score - b.l.difficulty.score ||
      a.i - b.i,
  );
const warm = [2, 21, 0].map((i) => sorted.find((x) => x.i === i));
[...warm, ...sorted.filter((x) => !warm.includes(x))].forEach(
  ({ l }, i) => (l.order = i),
);
for (let i = 0; i < old.length; i++)
  for (const k of ['initial', 'solution', 'source', 'id', 'n'])
    assert.deepEqual(levels[i][k], old[i][k]);
fs.writeFileSync('lib/levels.json', JSON.stringify(levels, null, 2) + '\n');
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
    for (let seed = 700000; count < 30 && seed < 950000; seed++) {
      const n = tier === 'Schwer' ? 6 : tier === 'Mittel' ? 4 : 3,
        id = `variant-v4-${mode}-catalog-${n}-${seed}`,
        l = variantPuzzle(mode, seed, n, id, 4),
        d = variantDifficulty(l);
      if (d.tier !== tier) continue;
      const key = variantFingerprint(l);
      if (seen.has(key) || variantPlan(l, fresh(l)).length < 4) continue;
      assert(variantStatus({ ...l, initial: l.solution }, fresh(l)).solved);
      specs.push({ mode, n, seed, id, generation: 4, difficulty: d });
      seen.add(key);
      count++;
    }
    assert(count >= 30, `${mode} ${tier}`);
    console.log(mode, tier, count);
  }
specs.sort(
  (a, b) =>
    variantModes.indexOf(a.mode) - variantModes.indexOf(b.mode) ||
    rank[a.difficulty.tier] - rank[b.difficulty.tier] ||
    a.difficulty.score - b.difficulty.score ||
    a.id.localeCompare(b.id),
);
fs.writeFileSync(
  'lib/variant-catalog-data.mjs',
  '// Stable puzzle identities; ratings v3, generator v4.\nexport const variantCatalogSpecs = ' +
    JSON.stringify(specs, null, 2) +
    ';\n',
);
console.log('Totals', levels.length, specs.length);

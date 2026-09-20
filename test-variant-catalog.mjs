import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  variantModes,
  variantCatalog,
  variantPuzzle,
  variantStatus,
  restoreVariants,
  savedVariant,
  emptyVariants,
  variantAct,
} from './lib/variants.mjs';
import {
  variantTiers,
  analyzeVariant,
  variantDifficulty,
} from './lib/variant-difficulty.mjs';
import { variantFingerprint } from './lib/variant-fingerprint.mjs';
import { generateVariant, variantSizes } from './lib/random-variants.mjs';
import { fresh } from './lib/session.mjs';
import { rotate } from './lib/game.mjs';
import { validateBackup } from './lib/backup.mjs';
const keys = new Set();
for (const l of variantCatalog) {
  const key = variantFingerprint(l);
  assert(
    !keys.has(key) || l.id === 'variant-v1-dual-catalog-3',
    'No new duplicate catalogue topology; keep published legacy pair',
  );
  keys.add(key);
  assert.deepEqual(
    l.difficulty,
    variantDifficulty(l),
    'Stored rating follows rule-specific analysis',
  );
  const rotated = { ...l, initial: l.initial.map(rotate) };
  assert.deepEqual(
    analyzeVariant(rotated),
    analyzeVariant(l),
    'Rating is independent of scrambled orientations',
  );
}
assert.equal(variantCatalog.length, 270);
for (const mode of variantModes)
  for (const tier of variantTiers) {
    const group = variantCatalog.filter(
      (l) => l.mode === mode && l.tier === tier,
    );
    assert.equal(group.length, 30);
    assert(
      group.every(
        (l, i) => !i || l.difficulty.score >= group[i - 1].difficulty.score,
      ),
      'Increasing complexity within category',
    );
  }
const old = JSON.parse(
  fs.readFileSync('test-fixtures/variant-v1.json', 'utf8'),
);
for (const l of old) {
  const current = variantCatalog.find((v) => v.id === l.id);
  assert(current);
  for (const field of [
    'initial',
    'solution',
    'groups',
    'source',
    'sources',
    'owners',
    'targets',
    'n',
    'seed',
  ])
    assert.deepEqual(
      current[field],
      l[field],
      `Published ${l.id}/${field} unchanged`,
    );
}
const mixed = emptyVariants();
for (const l of old)
  mixed.sessions[l.id] = variantAct(l, fresh(l), { type: 'turn', index: 0 });
for (const mode of variantModes) {
  const l = variantPuzzle(mode, 1986, 3);
  mixed.free[mode] = { n: l.n, seed: l.seed, session: fresh(l) };
}
assert.deepEqual(
  restoreVariants(JSON.parse(JSON.stringify(mixed))),
  mixed,
  'Old saves stay compatible',
);
const bench = [];
for (const mode of variantModes)
  for (const tier of variantTiers)
    for (const size of [0, ...variantSizes[mode][tier]]) {
      const recent = [],
        times = [];
      for (let i = 0; i < 8; i++) {
        const start = performance.now();
        const l = generateVariant({
          mode,
          tier,
          size,
          seed: (555000 + i * 12345) >>> 0,
          recent,
        });
        times.push(performance.now() - start);
        assert(l, `${mode}/${tier}/${size}`);
        assert.equal(l.tier, tier);
        assert.equal(l.difficulty.tier, tier);
        if (size) assert.equal(l.n, size);
        assert(!keys.has(l.key));
        assert(!recent.includes(l.key));
        recent.push(l.key);
        assert(!variantStatus(l, fresh(l)).solved);
        const saved = {
          seed: l.seed,
          n: l.n,
          generatorVersion: 2,
          session: variantAct(l, fresh(l), { type: 'turn', index: 0 }),
        };
        const restored = savedVariant(mode, saved);
        assert.deepEqual(restored.initial, l.initial);
        assert.deepEqual(restored.groups, l.groups);
        assert.equal(restored.tier, tier);
        mixed.free[mode] = saved;
        mixed.recent = recent.slice(-36);
        assert.deepEqual(
          restoreVariants(JSON.parse(JSON.stringify(mixed))),
          mixed,
        );
      }
      bench.push({
        mode,
        tier,
        size: size || 'Auto',
        maxMs: Math.round(Math.max(...times)),
      });
    }
const levels = JSON.parse(fs.readFileSync('lib/levels.json')),
  sliding = JSON.parse(fs.readFileSync('lib/sliding-levels.json'));
const file = {
  app: 'Leuchtwege',
  version: 1,
  createdAt: new Date().toISOString(),
  data: {
    'leuchtwege-v2': {
      version: 2,
      level: 0,
      sessions: {},
      done: [],
      sound: false,
    },
    'leuchtwege-variants-v1': mixed,
  },
};
assert.deepEqual(validateBackup(JSON.stringify(file), levels, sliding), file);
assert.throws(() =>
  generateVariant({ mode: 'linked', tier: 'Schwer', size: 3, seed: 1 }),
);
assert.equal(
  generateVariant({ mode: 'path', tier: 'Schwer', seed: 1, maxAttempts: 0 }),
  null,
);
assert.equal(
  generateVariant({ mode: 'path', tier: 'Schwer', seed: 1, budgetMs: -1 }),
  null,
);
// Same size demonstrably spans multiple difficulty categories.
for (const mode of variantModes)
  assert(
    new Set(
      variantCatalog
        .filter((l) => l.mode === mode && l.n === 5)
        .map((l) => l.tier),
    ).size === 3,
  );
console.table(bench);
console.log(
  'PASS: 270 classified puzzles (one preserved legacy topology pair), all 18 originals preserved, scramble-independent complexity, supported random size/tier combinations, no recent/catalog duplicates, bounded work and backup compatibility.',
);

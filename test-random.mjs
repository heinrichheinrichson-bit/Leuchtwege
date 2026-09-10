import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import {
  generateRandom,
  sizes,
  emptyFree,
  restoreFree,
  acceptRandom,
} from './lib/random-game.mjs';
import { topologyKey } from './lib/level-design.mjs';
import { difficulty } from './lib/difficulty.mjs';
import { solutions, evaluate } from './lib/game.mjs';
import { act, boardOf } from './lib/session.mjs';
const levels = JSON.parse(readFileSync('lib/levels.json'));
const excluded = levels.map(topologyKey);
const stats = [];
let saved = emptyFree();
for (const tier of Object.keys(sizes))
  for (const size of [0, ...sizes[tier]]) {
    const times = [];
    for (let i = 0; i < 12; i++) {
      const start = performance.now();
      const options = {
        tier,
        size,
        seed: (0x7fffffff + i * 1580030173) >>> 0,
        excluded,
        recent: saved.recent,
      };
      const l = generateRandom(options);
      times.push(Math.round(performance.now() - start));
      assert(l, `Failed ${tier}/${size}/${i}`);
      if (size) assert.equal(l.n, size);
      assert.equal(difficulty(l).tier, tier);
      assert.equal(solutions(l.initial, l.n, l.source).length, 1);
      assert(!evaluate(l.initial, l.n, l.source).solved);
      assert(!saved.recent.includes(l.key));
      assert(!excluded.includes(l.key));
      assert.deepEqual(
        generateRandom(options),
        l,
        'Seed must reproduce puzzle',
      );
      saved = acceptRandom(saved, l);
    }
    stats.push({
      tier,
      size: size || 'Auto',
      count: times.length,
      maxMs: Math.max(...times),
      meanMs: Math.round(times.reduce((a, b) => a + b) / times.length),
    });
  }
let s = act(saved.puzzle, saved.session, { type: 'turn', index: 0 });
s = act(saved.puzzle, s, { type: 'lock', index: 1 });
saved.session = s;
const roundtrip = restoreFree(JSON.parse(JSON.stringify(saved)));
assert.deepEqual(roundtrip, saved);
assert.deepEqual(
  boardOf(roundtrip.puzzle, roundtrip.session),
  boardOf(saved.puzzle, s),
);
assert.equal(act(saved.puzzle, s, { type: 'undo' }).locks[1], false);
assert.equal(act(saved.puzzle, s, { type: 'reset' }).moves, 0);
assert.equal(
  restoreFree({ ...saved, puzzle: { ...saved.puzzle, n: 999999 } }).puzzle,
  null,
);
assert.equal(
  restoreFree({ ...saved, puzzle: { ...saved.puzzle, initial: [1] } }).puzzle,
  null,
);
assert.equal(
  restoreFree({ ...saved, puzzle: { ...saved.puzzle, generatorVersion: 999 } })
    .puzzle,
  null,
);
assert.deepEqual(restoreFree(null), emptyFree());
assert.equal(
  generateRandom({ tier: 'Leicht', size: 3, seed: 0, maxAttempts: 0 }),
  null,
);
assert.equal(
  generateRandom({ tier: 'Schwer', size: 6, seed: 0, budgetMs: 0 }),
  null,
);
assert.throws(() => generateRandom({ tier: 'Schwer', size: 3, seed: 0 }));
assert.throws(() => generateRandom({ tier: 'Leicht', size: 4, seed: NaN }));
assert(saved.recent.length <= 100);
console.log(
  'PASS: 144 generated puzzles; every offered size/tier; reproducibility; unique solutions; no recent/campaign duplicates; free save/undo/reset; corrupt saves; bounded attempts.',
);
console.table(stats);
if (process.argv.includes('--report'))
  writeFileSync(
    'docs/randomizer-benchmark.json',
    JSON.stringify(
      {
        environment: 'Windows development machine; not an S22 measurement',
        stats,
      },
      null,
      2,
    ),
  );

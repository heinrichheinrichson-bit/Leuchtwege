import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  orientations,
  localReasoning,
  networkReasoning,
  analyzeReasoning,
} from './lib/reasoning.mjs';
import { difficulty } from './lib/difficulty.mjs';
import {
  applyOverride,
  topologyKey,
  similarity,
  variants,
} from './lib/level-design.mjs';
import { evaluate } from './lib/game.mjs';
import {
  recommendedOrder,
  nextPuzzle,
  continueTarget,
} from './lib/catalog.mjs';
const ls = JSON.parse(readFileSync('lib/levels.json', 'utf8')),
  old = JSON.parse(
    readFileSync('test-data/legacy-puzzle-fingerprints.json', 'utf8'),
  );
assert.equal(ls.length, 90);
for (const tier of ['Leicht', 'Mittel', 'Schwer'])
  assert.equal(ls.filter((l) => l.difficulty.tier === tier).length, 30);
for (const l of ls.slice(60)) {
  assert.equal(difficulty(l).tier, l.difficulty.tier);
  assert.notEqual(l.difficulty.method, 'search');
}
assert.equal(old.length, 30);
for (const f of old) {
  const l = ls[f.index];
  assert.equal(
    createHash('sha256')
      .update(
        JSON.stringify({
          n: l.n,
          source: l.source,
          initial: l.initial,
          solution: l.solution,
        }),
      )
      .digest('hex'),
    f.sha256,
    'Existing puzzle changed: ' + f.index,
  );
}
assert.equal(new Set(ls.map((l) => l.id)).size, 90);
assert.deepEqual(
  [...ls.map((l) => l.order)].sort((a, b) => a - b),
  Array.from({ length: 90 }, (_, i) => i),
);
const order = recommendedOrder(ls);
assert(
  order
    .slice(0, 3)
    .every(
      (i) =>
        ls[i].n === 3 && ls[i].difficulty.tier === 'Leicht' && ls[i].lesson,
    ),
);
assert.deepEqual(order.slice(0, 3), [2, 21, 0]);
assert.equal(
  nextPuzzle(
    ls,
    29,
    Array.from({ length: 30 }, (_, i) => i),
  ) >= 30,
  true,
);
const fixture = [{ order: 2 }, { order: 0 }, { order: 1 }];
assert.deepEqual(recommendedOrder(fixture), [1, 2, 0]);
assert.equal(nextPuzzle(fixture, 1, []), 2);
assert.equal(nextPuzzle(fixture, 2, []), 0);
assert.equal(nextPuzzle(fixture, 1, [2]), 0);
assert.deepEqual(continueTarget(fixture, {}, 0, []), {
  index: 1,
  resume: false,
});
for (const l of ls) {
  const ds = orientations(l),
    local = localReasoning(ds, l.n),
    global = networkReasoning(ds, l.n, l.source);
  assert(local.valid);
  assert(global.valid);
  l.solution.forEach((m, i) => {
    assert(local.domains[i].includes(m));
    assert(global.domains[i].includes(m));
  });
  const rotated = {
    ...l,
    initial: variants(l.initial, l.n)[2],
    solution: variants(l.solution, l.n)[2],
    source: (l.source % l.n) * l.n + l.n - 1 - Math.floor(l.source / l.n),
  };
  const a = difficulty(l),
    b = difficulty(rotated);
  assert.equal(a.tier, b.tier);
  assert.equal(a.score, b.score);
  assert.equal(a.method, b.method);
  if (a.method === 'local') assert(local.domains.every((x) => x.length === 1));
  if (a.method === 'lookahead')
    assert(a.contradictions > 0 && a.probeRounds > 0 && a.remaining === 0);
}
// A closed loop is legal when it connects all tiles. Do not infer "no cycles" from tree generation.
const loop = [6, 12, 3, 9];
assert(evaluate(loop, 2, 0).solved);
assert(
  networkReasoning(
    loop.map((m) => [m]),
    2,
    0,
  ).valid,
);
assert(
  !networkReasoning(
    [2, 8, 2, 8].map((m) => [m]),
    2,
    0,
  ).valid,
);
for (let i = 21; i < ls.length; i++)
  for (let j = 0; j < i; j++) {
    assert.notEqual(topologyKey(ls[i]), topologyKey(ls[j]));
    assert(similarity(ls[i], ls[j]) <= 0.9);
  }
const d = difficulty(ls[0]);
assert.equal(
  applyOverride(ls[0], d, {
    [ls[0].id]: { tier: 'Schwer', reason: 'Test override' },
  }).tier,
  'Schwer',
);
assert.equal(
  applyOverride(ls[0], d, {
    [ls[0].id]: { tier: 'Schwer', reason: 'Test override' },
  }).automaticTier,
  d.tier,
);
assert.throws(() =>
  applyOverride(ls[0], d, { [ls[0].id]: { tier: 'Schwer', reason: '' } }),
);
assert(ls.some((l) => l.n === 4 && l.difficulty.tier === 'Schwer'));
assert(ls.some((l) => l.n === 6 && l.difficulty.tier === 'Mittel'));
console.log(
  'PASS: stable 30 legacy puzzles; 90 unique IDs; progression; rotation-invariant difficulty; safe direct deductions; legal loops; similarity filter; manual overrides; size separate from difficulty.',
);

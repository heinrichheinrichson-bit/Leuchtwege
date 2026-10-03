import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { variantCatalog, variantStatus, variantAct } from './lib/variants.mjs';
import { fresh } from './lib/session.mjs';
import { generateDaily } from './lib/daily-generator.mjs';
const levels = JSON.parse(fs.readFileSync('lib/levels.json'));
const all = new Map([...levels, ...variantCatalog].map((l) => [l.id, l]));
for (const f of JSON.parse(
  fs.readFileSync('test-fixtures/pre-review-identities.json'),
)) {
  const l = all.get(f.id);
  assert(l);
  assert.equal(
    createHash('sha256')
      .update(
        JSON.stringify([
          l.id,
          l.n,
          l.initial,
          l.solution,
          l.source,
          l.sources,
          l.groups,
          l.targets,
          l.owners,
        ]),
      )
      .digest('hex'),
    f.hash,
    'Existing puzzle identity and saved board preserved',
  );
}
const l = {
  n: 3,
  mode: 'path',
  variant: 'path',
  source: 0,
  targets: [1, 2],
  initial: [2, 14, 8, 2, 2, 8, 2, 8, 1],
  groups: Array.from({ length: 9 }, (_, i) => [i]),
};
let s = fresh(l),
  status = variantStatus(l, s);
assert.equal(status.reached, 2);
assert.equal(status.open, 1);
assert(!status.solved, 'Stars alone do not close live branches');
for (let i = 0; i < 3; i++) s = variantAct(l, s, { type: 'turn', index: 4 });
status = variantStatus(l, s);
assert.equal(status.open, 0);
assert(status.solved);
assert.equal(status.lit.size, 4, 'Dark off-path branches are not required');
for (const p of variantCatalog.filter((l) => l.tier === 'Schwer')) {
  if (p.mode === 'linked') {
    assert(p.difficulty.uncertainCouplings >= 4);
    assert(p.difficulty.directUncertain >= 12);
    assert(p.difficulty.probeRounds >= 2);
  } else {
    assert(p.difficulty.deadEnds >= 2);
    assert(p.difficulty.uncertain >= 6);
    assert(p.difficulty.maxDeadEndDepth >= 2);
  }
  if (p.mode === 'path') assert(p.targets.length >= 3);
  if (p.mode === 'dual')
    assert(
      [0, 1].every(
        (owner) =>
          p.owners.filter((v) => v === owner).length >= (p.n * p.n) / 3,
      ),
    );
}
for (const mode of ['turn', 'dual', 'path', 'linked'])
  for (const slot of [0, 1, 2]) {
    const d = generateDaily('2026-09-27', mode, slot);
    assert(d);
    assert.equal(d.puzzle.difficulty.tier, d.puzzle.tier);
  }
console.log(
  'PASS: all 500 existing board identities preserved; stars/open-connections regression; stricter hard criteria; new daily schedule.',
);

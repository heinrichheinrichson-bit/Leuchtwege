import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {
  variantCatalog,
  variantTrials,
  variantPuzzle,
  variantStatus,
  variantAct,
  savedVariant,
  restoreVariants,
  emptyVariants,
} from './lib/variants.mjs';
import { variantDifficulty } from './lib/variant-difficulty.mjs';
import { linkedBankSize } from './lib/linked-bank.mjs';
import { rotationConstraints } from './lib/rotation-constraints.mjs';
import { variantFingerprint } from './lib/variant-fingerprint.mjs';
import { generateVariant } from './lib/random-variants.mjs';
import { generateDaily, restoreDaily } from './lib/daily-generator.mjs';
import { fresh } from './lib/session.mjs';
import { solutionPlan, applyHelp } from './lib/solve-help.mjs';
const hash = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
for (const f of JSON.parse(
  fs.readFileSync('test-fixtures/catalog-before-linked-v5.json'),
)) {
  const p = variantCatalog.find((l) => l.id === f.id);
  assert(p);
  assert.equal(
    hash([
      p.n,
      p.initial,
      p.solution,
      p.groups,
      p.sources,
      p.owners,
      p.targets,
    ]),
    f.hash,
  );
}
for (const f of JSON.parse(
  fs.readFileSync('test-fixtures/daily-before-linked-v5.json'),
)) {
  const d = generateDaily(f.day, f.mode, f.slot),
    p = d.puzzle;
  assert.equal(
    hash([
      p.id,
      p.n,
      p.initial,
      p.solution,
      p.groups,
      p.sources,
      p.owners,
      p.targets,
    ]),
    f.hash,
    'Historical daily identity',
  );
  assert.deepEqual(
    restoreDaily(d, f.day, f.mode, f.slot).puzzle.difficulty,
    p.difficulty,
  );
}
assert.equal(
  linkedBankSize,
  158,
  'Changing length changes seed identities; use a new generator version',
);
const keys = new Set(),
  trials = new Set(variantTrials.map(variantFingerprint));
for (let seed = 0; seed < linkedBankSize; seed++) {
  const p = variantPuzzle('linked', seed, 6, 'proof', 5),
    d = variantDifficulty(p),
    key = variantFingerprint(p);
  assert(!keys.has(key) && !trials.has(key));
  keys.add(key);
  assert.equal(d.tier, 'Schwer');
  assert(
    d.uncertainCouplings >= 4 &&
      d.directUncertain >= 12 &&
      (d.probeRounds >= 2 || d.afterLookahead >= 4),
  );
  assert.deepEqual(
    variantDifficulty({ ...p, solution: undefined }),
    d,
    'No target solution used in rating',
  );
  // Independent original solver, without the curator's network-bridge deductions.
  const c = rotationConstraints(p);
  let solutions = 0;
  function visit(ds) {
    const r = c.propagate(ds);
    if (r.contradiction) return;
    const index = r.domains.reduce(
      (best, d, i) =>
        d.length > 1 && (best < 0 || d.length < r.domains[best].length)
          ? i
          : best,
      -1,
    );
    if (index < 0) {
      if (c.solved(r.domains)) solutions++;
      return;
    }
    for (const v of r.domains[index]) {
      const next = r.domains.map((d) => [...d]);
      next[index] = [v];
      visit(next);
    }
  }
  visit(c.initial);
  assert.equal(solutions, 1);
  const s = fresh(p),
    plan = solutionPlan(p, s);
  assert(plan.length > 3);
  assert(variantStatus(p, applyHelp(p, s, plan, 'all')).solved);
  const almost = applyHelp(p, s, plan, 'almost');
  assert(!variantStatus(p, almost).solved);
  assert(
    variantStatus(p, applyHelp(p, almost, solutionPlan(p, almost), 'step'))
      .solved,
  );
  const step = variantAct(p, s, { type: 'turn', index: 0 });
  const saved = { seed, n: 6, generatorVersion: 5, session: step };
  const restored = restoreVariants({
    ...emptyVariants(),
    free: { linked: saved },
  }).free.linked;
  assert.deepEqual(restored, saved);
  assert.deepEqual(savedVariant('linked', restored).initial, p.initial);
}
const recent = [],
  catalog = new Set(variantCatalog.map(variantFingerprint));
let maxMs = 0;
for (let i = 0; i < 128; i++) {
  const options = {
    mode: 'linked',
    tier: 'Schwer',
    seed: 12345 + i * 331,
    recent,
  };
  const start = performance.now(),
    p = generateVariant(options);
  maxMs = Math.max(maxMs, performance.now() - start);
  assert(p && !catalog.has(p.key) && !recent.includes(p.key));
  recent.push(p.key);
  assert.deepEqual(
    generateVariant({ ...options, recent: recent.slice(0, -1) }),
    p,
  );
}
assert.equal(new Set(recent).size, 128);
assert.equal(
  generateVariant({ mode: 'linked', tier: 'Schwer', seed: 3, recent }),
  null,
  'No silent easy fallback',
);
assert.equal(
  generateVariant({ mode: 'linked', tier: 'Schwer', seed: 3, budgetMs: -1 }),
  null,
);
for (const day of ['2026-10-04', '2026-11-01'])
  for (const slot of [0, 1, 2]) {
    const d = generateDaily(day, 'linked', slot);
    assert.equal(d.puzzle.difficulty.version, 5);
    assert.deepEqual(
      restoreDaily(d, day, 'linked', slot).puzzle.initial,
      d.puzzle.initial,
    );
  }
console.log(
  `PASS: 158 unique hard structures; 128 distinct free boards; historical identities; v5 saves and helpers. Slowest selection ${Math.round(maxMs)}ms.`,
);

import assert from 'node:assert/strict';
import {
  variantModes,
  variantCatalog,
  variantPuzzle,
  variantStatus,
  variantAct,
  variantPlan,
  restoreVariants,
  emptyVariants,
} from './lib/variants.mjs';
import { fresh, boardOf } from './lib/session.mjs';
import { applyHelp, solutionPlan, helpSolved } from './lib/solve-help.mjs';
import {
  emptyHistory,
  updateAttempt,
  restoreHistory,
} from './lib/play-history.mjs';
import { experienceSummary } from './lib/experience.mjs';
import { streakSummary } from './lib/daily.mjs';
import { english } from './lib/translations.mjs';
import { variantNames, variantRules } from './lib/variants.mjs';

const puzzles = [
  ...variantCatalog,
  ...variantModes.flatMap((mode) =>
    [3, 4].flatMap((n) =>
      Array.from({ length: 100 }, (_, seed) => variantPuzzle(mode, seed, n)),
    ),
  ),
];
for (const l of puzzles) {
  let s = fresh(l);
  assert(!variantStatus(l, s).solved, 'Starts unsolved');
  const goal = { ...l, initial: l.solution };
  assert(
    variantStatus(goal, fresh(goal)).solved,
    'Constructed target is valid',
  );
  const reproduced = variantPuzzle(
    l.mode,
    l.seed,
    l.n,
    l.id,
    l.generatorVersion || 1,
  );
  for (const key of [
    'initial',
    'solution',
    'groups',
    'owners',
    'sources',
    'targets',
  ])
    assert.deepEqual(reproduced[key], l[key], 'Generator is deterministic');
  const plan = solutionPlan(l, s);
  assert(plan.length > 0);
  const almost = applyHelp(l, s, plan, 'almost');
  assert(!helpSolved(l, almost));
  const complete = applyHelp(l, s, plan, 'all');
  assert(helpSolved(l, complete));
  assert.deepEqual(
    variantAct(l, complete, { type: 'undo' }),
    s,
    'Whole help can be undone',
  );
  const once = applyHelp(l, s, plan, 'step');
  assert.equal(once.moves, 1);
  assert.deepEqual(variantAct(l, once, { type: 'undo' }), s);
  for (let i = 0; i < 37 && !variantStatus(l, s).solved; i++)
    s = variantAct(l, s, { type: 'turn', index: (i * 7 + 3) % (l.n * l.n) });
  for (const a of variantPlan(l, s)) s = variantAct(l, s, a);
  assert(
    variantStatus(l, s).solved,
    'Still solvable after arbitrary legal actions',
  );
  if (l.mode === 'path')
    assert(
      variantStatus(goal, fresh(goal)).lit.size < l.n * l.n,
      'Unused tiles may remain dark',
    );
  if (l.mode === 'dual') {
    const state = variantStatus(l, s);
    assert.equal(
      [...state.nets[0]].filter((i) => state.nets[1].has(i)).length,
      0,
    );
    assert.equal(state.wrong.size, 0);
    assert(
      !variantStatus({ ...l, owners: l.owners.map((v) => 1 - v) }, s).solved,
      'Correct wiring to wrong sources rejected',
    );
  }
  if (l.mode === 'linked') {
    const next = variantAct(l, fresh(l), {
      type: 'turn',
      index: l.groups[0][0],
    });
    assert.deepEqual(
      next.turns
        .map((v, i) => (v ? i : -1))
        .filter((i) => i >= 0)
        .sort((a, b) => a - b),
      [...l.groups[0]].sort((a, b) => a - b),
    );
  }
}
let saved = emptyVariants();
for (const l of variantCatalog)
  saved.sessions[l.id] = applyHelp(
    l,
    fresh(l),
    solutionPlan(l, fresh(l)),
    'almost',
  );
for (const mode of variantModes) {
  const l = variantPuzzle(mode, 2147, 4);
  saved.free[mode] = {
    seed: l.seed,
    n: l.n,
    session: variantAct(l, fresh(l), { type: 'turn', index: 0 }),
  };
  assert(english[variantNames[mode]] && english[variantRules[mode]]);
}
assert.deepEqual(restoreVariants(JSON.parse(JSON.stringify(saved))), saved);
const corrupt = structuredClone(saved),
  linked = variantCatalog.find((l) => l.mode === 'linked');
corrupt.sessions[linked.id].turns[linked.groups[0][0]]++;
assert(!restoreVariants(corrupt).sessions[linked.id], 'Broken pair rejected');
assert.deepEqual(
  restoreVariants({ version: 1, free: { dual: { seed: -1, n: 9 } } }),
  emptyVariants(),
);
for (const mode of variantModes)
  for (const origin of ['free', 'catalog']) {
    const meta = {
      puzzleId: `${mode}-${origin}`,
      name: variantNames[mode],
      mode,
      origin,
      tier: 'Leicht',
      n: 3,
    };
    let h = updateAttempt(emptyHistory(), meta, {
      id: 'a',
      now: '2026-09-19T12:00:00Z',
    });
    h = updateAttempt(h, meta, {
      id: 'a',
      now: '2026-09-19T12:01:00Z',
      solved: true,
      moves: 5,
      elapsedMs: 60000,
    });
    assert.deepEqual(restoreHistory(JSON.parse(JSON.stringify(h))), h);
    assert(experienceSummary(h.attempts).puzzleTotal > 0);
    assert(
      experienceSummary(h.attempts).achievements.find(
        (a) => a.id === `${mode}-1`,
      ).done,
    );
    assert(streakSummary(h.attempts, '2026-09-19').days.has('2026-09-19'));
    assert.equal(
      experienceSummary(h.attempts.map((a) => ({ ...a, assistance: 'test' })))
        .total,
      0,
    );
  }
console.log(
  `PASS: ${puzzles.length} deterministic variant puzzles, legal solutions after scrambling, hints/test steps/undo, paired moves, separate networks, dark unused tiles, restore, XP and streaks.`,
);

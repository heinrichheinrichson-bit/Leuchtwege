import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, act } from './lib/session.mjs';
import { freshSliding, slideAct } from './lib/sliding.mjs';
import { solutionPlan, applyHelp, helpSolved } from './lib/solve-help.mjs';
import {
  hintBudget,
  remainingHints,
  spendHint,
  rewardHint,
} from './lib/hint-budget.mjs';
const campaign = JSON.parse(readFileSync('lib/levels.json'));
const sliding = JSON.parse(readFileSync('lib/sliding-levels.json'));
for (const l of [...campaign, ...sliding]) {
  const initial = l.pieces ? freshSliding(l) : fresh(l);
  const states = [initial];
  if (l.pieces) {
    let s = initial;
    for (let i = 0; i < 45; i++)
      s = slideAct(l, s, {
        type: l.mode === 'rotate' && i % 3 === 0 ? 'turn' : 'slide',
        id: (i * 7 + 3) % 8,
      });
    states.push(s);
  } else
    states.push({
      ...initial,
      turns: initial.turns.map((_, i) => i % 4),
      locks: initial.locks.map(() => true),
    });
  for (const s of states) {
    const before = JSON.stringify(s),
      plan = solutionPlan(l, s);
    const all = applyHelp(l, s, plan, 'all');
    assert(helpSolved(l, all), l.id + ' full solve');
    assert.equal(JSON.stringify(s), before, 'Original state must be unchanged');
    if (!plan.length) continue;
    const undo = l.pieces ? slideAct : act;
    assert.deepEqual(
      undo(l, all, { type: 'undo' }),
      s,
      'One undo restores whole help',
    );
    const almost = applyHelp(l, s, plan, 'almost');
    assert(!helpSolved(l, almost));
    const last = solutionPlan(l, almost);
    assert.equal(
      last.length,
      1,
      'Almost solved has one remaining legal action',
    );
    assert(helpSolved(l, applyHelp(l, almost, last, 'step')));
    const step = applyHelp(l, s, plan, 'step');
    assert.equal(
      l.pieces ? step.slides + step.rotations : step.moves,
      (l.pieces ? s.slides + s.rotations : s.moves) + 1,
    );
  }
}
let b = hintBudget(null);
assert.equal(remainingHints(b), 3);
for (let i = 0; i < 3; i++) b = spendHint(b);
assert.equal(remainingHints(b), 0);
assert.throws(() => spendHint(b));
b = rewardHint(b, 'completed-video-1');
assert.equal(remainingHints(b), 1);
assert.deepEqual(
  rewardHint(b, 'completed-video-1'),
  b,
  'Duplicate completion does not grant again',
);
b = spendHint(b);
assert.equal(remainingHints(b), 0);
assert.deepEqual(hintBudget(JSON.parse(JSON.stringify(b))), b);
assert.equal(
  remainingHints(rewardHint(b, null)),
  0,
  'Cancelled ad grants nothing',
);
b = rewardHint(b, 'completed-video-2');
assert.equal(remainingHints(b), 1);
console.log(
  'PASS: full/near/step solves on all 66 puzzles and modified states; legal final move; one-step undo; locked cells; three free hints; one reward per completed ad; no cancellation/duplicate rewards.',
);

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, boardOf, act, restore } from './lib/session.mjs';
import { evaluate, solutions } from './lib/game.mjs';
import { difficulty } from './lib/difficulty.mjs';
const levels = JSON.parse(readFileSync('lib/levels.json', 'utf8')),
  l = levels[0];
let s = fresh(l),
  turned = act(l, s, { type: 'turn', index: 0 });
assert.equal(turned.moves, 1);
assert.deepEqual(act(l, turned, { type: 'undo' }), s);
const locked = act(l, s, { type: 'lock', index: 0 });
assert.equal(act(l, locked, { type: 'turn', index: 0 }), locked);
assert.deepEqual(act(l, locked, { type: 'undo' }), s);
assert.deepEqual(act(l, turned, { type: 'reset' }), s);
assert.equal(act(l, s, { type: 'turn', index: -1 }), s);
let cycle = s;
for (let k = 0; k < 4; k++) cycle = act(l, cycle, { type: 'turn', index: 0 });
assert.deepEqual(boardOf(l, cycle), l.initial);
const legacy = {
  level: 0,
  board: boardOf(l, turned),
  moves: 1,
  done: [1, 999, -1],
};
const migrated = restore(levels, null, legacy);
assert.deepEqual(boardOf(l, migrated.sessions[0]), legacy.board);
assert.deepEqual(migrated.done, [1]);
const saved = restore(levels, {
  version: 2,
  level: 1,
  sessions: { 0: locked, 1: fresh(levels[1]) },
  done: [0],
  sound: true,
});
assert.deepEqual(saved.sessions[0], locked);
assert.deepEqual(saved.sessions[1], fresh(levels[1]));
assert(saved.sound);
assert.deepEqual(
  restore(levels, { version: 2, sessions: { 0: { turns: ['bad'] } } }).sessions,
  {},
);
for (const l of levels) {
  assert(evaluate(l.solution, l.n, l.source).solved);
  assert(!evaluate(l.initial, l.n, l.source).solved);
  assert.equal(solutions(l.initial, l.n, l.source).length, 1);
  assert.deepEqual(difficulty(l), l.difficulty);
}
assert(levels.slice(12).some((l) => l.difficulty.unresolved > 0));
// Reject disconnected closed components, even though no ends are open.
assert.equal(evaluate([2, 8, 2, 8], 2, 0).solved, false);
console.log(
  'PASS: ' +
    levels.length +
    ' unique puzzles; difficulty metadata; undo; lock protection; reset; migration; independent saved games; invalid data; disconnected network.',
);

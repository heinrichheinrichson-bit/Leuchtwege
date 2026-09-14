import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { slidingOrder } from './lib/sliding-catalog.mjs';
import {
  adjacent,
  freshSliding,
  slidingBoard,
  slidingStatus,
  slideAct,
  tapSliding,
  swipeSliding,
  restoreSliding,
} from './lib/sliding.mjs';
const levels = JSON.parse(readFileSync('lib/sliding-levels.json'));
assert.equal(levels.length, 180);
for (const l of levels.slice(120)) {
  const ranges =
    l.mode === 'slide'
      ? [
          [4, 7],
          [10, 14],
          [17, 21],
        ]
      : [
          [2, 3],
          [4, 5],
          [6, 8],
        ];
  const [min, max] = ranges[['Leicht', 'Mittel', 'Schwer'].indexOf(l.tier)];
  assert(l.minSlides >= min && l.minSlides <= max);
}
assert.equal(new Set(levels.map((l) => l.id)).size, 180);
const legacy = levels.slice(0, 6).map(({ tier, minSlides, ...l }) => l);
assert.equal(
  createHash('sha256').update(JSON.stringify(legacy)).digest('hex'),
  '7460452d1a7be2fe7854a9d118896e6078623db73890b6ade6efef79927a5809',
  'Original six puzzles and their indices must stay identical',
);
for (const mode of ['slide', 'rotate']) {
  const order = slidingOrder(levels, mode);
  assert.equal(order.length, 90);
  assert.equal(new Set(order).size, 90);
  for (const tier of ['Leicht', 'Mittel', 'Schwer'])
    assert.equal(
      levels.filter((l) => l.mode === mode && l.tier === tier).length,
      30,
    );
  for (let i = 1; i < order.length; i++)
    if (levels[order[i - 1]].tier === levels[order[i]].tier)
      assert(levels[order[i - 1]].minSlides <= levels[order[i]].minSlides);
}
assert.equal(
  new Set(
    levels.map(
      (l) =>
        l.mode +
        ':' +
        l.initial.positions
          .map((id) => (id === null ? 0 : l.pieces[id]))
          .join(','),
    ),
  ).size,
  180,
  'No repeated initial networks',
);
for (const l of levels) {
  assert(slidingStatus(l, l.solution).solved);
  let s = freshSliding(l);
  assert(!slidingStatus(l, s).solved);
  assert.equal(slidingBoard(l, s).filter((x) => x === 0).length, 1);
  for (const a of l.witness) {
    if (slidingStatus(l, s).solved) break; // A valid alternative encountered earlier also wins.
    const before = s;
    s = slideAct(l, s, a);
    assert.notEqual(s, before, 'Witness must consist of legal actions');
    assert.equal(s.positions.filter((x) => x === null).length, 1);
    assert.deepEqual(slideAct(l, s, { type: 'undo' }), before);
    assert.deepEqual(slideAct(l, s, { type: 'reset' }), freshSliding(l));
  }
  assert(slidingStatus(l, s).solved, 'Witness must reach a legal solution');
  assert.equal(
    slideAct(l, s, { type: 'turn', id: 0 }),
    s,
    'No changes after winning',
  );
  s = freshSliding(l);
  const hole = s.positions.indexOf(null),
    pos = s.positions.findIndex((id, i) => id !== null && adjacent(i, hole, 3)),
    id = s.positions[pos];
  const first = tapSliding(l, s, null, pos);
  assert.equal(first.selected, id);
  assert.equal(first.action, null, 'First tap must not rotate');
  const second = tapSliding(l, s, id, hole);
  assert.deepEqual(second.action, { type: 'slide', id });
  const moved = slideAct(l, s, second.action);
  assert.equal(moved.positions[hole], id);
  assert.equal(moved.positions[pos], null);
  assert.deepEqual(moved.turns, s.turns, 'Sliding preserves orientation');
  const dx = ((hole % 3) - (pos % 3)) * 80,
    dy = (Math.floor(hole / 3) - Math.floor(pos / 3)) * 80;
  assert.deepEqual(
    swipeSliding(l, s, id, dx, dy, 100),
    second.action,
    'Swipe and two taps are equivalent',
  );
  assert.equal(swipeSliding(l, s, id, -dx, -dy, 100), null);
  assert.equal(
    swipeSliding(l, s, id, dx ? dx : 70, dy ? dy : 70, 100),
    null,
    'Diagonal rejected',
  );
  assert.equal(
    swipeSliding(l, s, id, 2, 2, 100),
    null,
    'Small motion is a tap',
  );
  const same = tapSliding(l, s, id, pos);
  if (l.mode === 'rotate') assert.deepEqual(same.action, { type: 'turn', id });
  else {
    assert.equal(same.action, null);
    assert.equal(slideAct(l, s, { type: 'turn', id }), s);
  }
  const far = s.positions.findIndex(
    (v, i) => v !== null && !adjacent(i, hole, 3),
  );
  assert.equal(slideAct(l, s, { type: 'slide', id: s.positions[far] }), s);
  const raw = {
    version: 1,
    current: levels.indexOf(l),
    sessions: { [l.id]: moved },
  };
  assert.deepEqual(
    restoreSliding(levels, JSON.parse(JSON.stringify(raw))),
    raw,
  );
  const corrupt = { ...moved, positions: Array(9).fill(0) };
  assert.equal(
    restoreSliding(levels, { ...raw, sessions: { [l.id]: corrupt } }).sessions[
      l.id
    ],
    undefined,
  );
}
assert(!adjacent(2, 3, 3), 'Rows must not wrap');
// Moving the source changes its board index; it remains the same light source.
const sourceFixture = {
  mode: 'slide',
  n: 3,
  pieces: [2, 8, 2, 8, 2, 8, 2, 8],
  sourceId: 0,
  initial: {
    positions: [0, null, 1, 2, 3, 4, 5, 6, 7],
    turns: Array(8).fill(0),
  },
};
const start = freshSliding(sourceFixture),
  moved = slideAct(sourceFixture, start, { type: 'slide', id: 0 });
assert.equal(moved.positions.indexOf(0), 1);
assert(slidingStatus(sourceFixture, moved).lit.has(1));
assert(slidingStatus(sourceFixture, moved).litIds.has(0));
// Connections into the empty square remain open and cannot win.
assert(slidingStatus(sourceFixture, start).open > 0);
assert(!slidingStatus(sourceFixture, start).solved);
console.log(
  'PASS: 180 reachable puzzles; 90 per mode, 30 per tier; six legacy puzzles unchanged; unique starting networks; legal solutions; undo/reset; tap/swipe equivalence; saved sessions and ordering.',
);

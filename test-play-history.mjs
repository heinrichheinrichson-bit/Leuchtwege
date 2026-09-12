import assert from 'node:assert/strict';
import {
  emptyHistory,
  updateAttempt,
  currentAttempt,
  restoreHistory,
  historySummary,
  formatTime,
} from './lib/play-history.mjs';
import { activeTimer } from './lib/active-timer.mjs';
const meta = {
  puzzleId: 'example',
  name: 'Example',
  mode: 'slide',
  origin: 'catalog',
  n: 3,
  tier: 'Leicht',
};
let data = emptyHistory(),
  i = 0;
const event = (options) => {
  data = updateAttempt(data, meta, {
    id: 'attempt-' + ++i,
    now: new Date(1700000000000 + i * 1000).toISOString(),
    ...options,
  });
  return currentAttempt(data, meta.puzzleId);
};
assert.equal(event({ moves: 0 }).partialTime, false);
assert.equal(event({ moves: 1, elapsedMs: 1250 }).elapsedMs, 1250);
event({ moves: 2, assistance: 'hint' });
event({ moves: 1 });
assert.equal(
  currentAttempt(data, meta.puzzleId).assistance,
  'hint',
  'Undo must not erase hint use',
);
event({ moves: 4, assistance: 'test' });
event({ moves: 2 });
assert.equal(currentAttempt(data, meta.puzzleId).assistance, 'test');
event({ moves: 6, solved: true });
const frozen = structuredClone(data);
event({ moves: 3, solved: false, elapsedMs: 9999 });
event({ moves: 6, solved: true });
assert.deepEqual(data, frozen, 'Undo/re-solve cannot add a completion');
assert.equal(historySummary(data).completed, 0);
assert.equal(historySummary(data).tests, 1);
event({ restart: true, moves: 0 });
event({ moves: 8, solved: true, elapsedMs: 34000 });
assert.equal(historySummary(data).independent, 1);
assert.equal(historySummary(data).unique, 1);
event({ restart: true, moves: 0 });
event({ moves: 9, solved: true, assistance: 'hint' });
assert.equal(historySummary(data).completed, 2);
assert.equal(historySummary(data).unique, 1);
assert.deepEqual(restoreHistory(JSON.parse(JSON.stringify(data))), data);
const other = { ...meta, puzzleId: 'free-x', mode: 'turn', origin: 'free' };
data = updateAttempt(data, other, {
  id: 'other',
  now: new Date().toISOString(),
  moves: 10,
});
assert.equal(currentAttempt(data, 'free-x').partialTime, true);
assert.equal(historySummary(data, 'turn').completed, 0);
data = updateAttempt(data, other, {
  id: 'unused',
  now: new Date().toISOString(),
  moves: 12,
  solved: true,
});
assert.equal(
  historySummary(data, 'turn').independent,
  0,
  'Unknown pre-update assistance must not count as independent',
);
assert.equal(historySummary(data, 'turn').partial, 1);
assert.equal(historySummary(data, 'rotate').playedMs, 0);
assert.equal(
  restoreHistory({ version: 1, attempts: [{ id: 'bad', elapsedMs: -1 }] })
    .attempts.length,
  0,
);
let now = 0;
const timer = activeTimer(() => now);
assert.equal(timer.sample(true), 0);
now = 1500;
assert.equal(timer.sample(false), 1500);
now = 100000;
assert.equal(timer.sample(false), 0);
now = 200000;
assert.equal(timer.sample(true), 0);
now = 201100;
assert.equal(timer.sample(false), 1100);
assert.equal(formatTime(3661000), '1:01:01');
assert.equal(formatTime(61000), '01:01');
const hidden = { ...data, clockVisible: false };
assert.equal(
  restoreHistory(JSON.parse(JSON.stringify(hidden))).clockVisible,
  false,
);
console.log(
  'PASS: monotonic active time, pause/resume without background time, restore, separate attempts, sticky help flags, no duplicate completion, mode filters and legacy partial timing.',
);

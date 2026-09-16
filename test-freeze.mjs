import assert from 'node:assert/strict';
import {emptyHistory,restoreHistory} from './lib/play-history.mjs';
import { advanceFreeze, validFreeze } from './lib/streak-freeze.mjs';
import { streakSummary, shiftDay } from './lib/daily.mjs';
import { milestoneSummary } from './lib/milestones.mjs';
const a = (d) => ({
  id: d,
  puzzleId: d,
  mode: 'turn',
  origin: 'catalog',
  tier: 'Leicht',
  completedDay: d,
  completedAt: d + 'T12:00:00Z',
  assistance: 'none',
  hints: 0,
});
let attempts = [a('2026-09-15')];
let s = advanceFreeze(null, attempts, '2026-09-16');
assert.equal(s.balance, 2);
assert.deepEqual(s.frozen, []);
s = advanceFreeze(s, attempts, '2026-09-17');
assert.deepEqual(s.frozen, ['2026-09-16']);
assert.equal(s.balance, 1);
assert.equal(streakSummary(attempts, '2026-09-17', s.frozen).current, 1);
assert.deepEqual(advanceFreeze(s, attempts, '2026-09-17'), s);
s = advanceFreeze(s, attempts, '2026-09-19');
assert.equal(s.balance, 0);
assert.equal(s.frozen.length, 2);
assert.equal(streakSummary(attempts, '2026-09-19', s.frozen).current, 0);
attempts.push(a('2026-09-19'));
s = advanceFreeze(s, attempts, '2026-09-19');
assert.equal(s.progress, 1);
for (let i = 1; i < 7; i++) {
  const day = shiftDay('2026-09-19', i);
  attempts.push(a(day));
  s = advanceFreeze(s, attempts, day);
}
assert.equal(s.balance, 1);
assert.equal(s.progress, 0);
assert(!s.frozen.includes('2026-09-18'));
assert(validFreeze(JSON.parse(JSON.stringify(s))));
assert.deepEqual(restoreHistory({...emptyHistory(),freeze:s}).freeze,s);
assert.deepEqual(advanceFreeze(s, attempts, '2026-09-20'), s);
assert.equal(advanceFreeze(null, [], '2026-09-16').frozen.length, 0);
assert.equal(
  advanceFreeze(advanceFreeze(null, [], '2026-09-16'), [], '2026-10-01')
    .balance,
  2,
);
const seven = [0, 1, 2, 4, 5, 6, 7].map((i) => a(shiftDay('2026-09-16', i)));
assert(
  milestoneSummary(seven, '2026-09-23', ['2026-09-19']).achievements.find(
    (a) => a.id === 'week',
  ).done,
);
assert(
  !milestoneSummary(seven, '2026-09-23').achievements.find(
    (a) => a.id === 'week',
  ).done,
);
assert.equal(streakSummary(seven, '2026-09-23', ['2026-09-19']).current, 7);
const test = [{ ...a('2026-09-16'), assistance: 'test' }];
assert.equal(advanceFreeze(null, test, '2026-09-16').progress, 0);
console.log(
  'PASS: protection consumption, no old gap repair, refill, cap, actual-day counting, restart, clock rollback and achievement continuity.',
);

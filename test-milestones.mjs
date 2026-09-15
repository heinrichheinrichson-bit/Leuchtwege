import assert from 'node:assert/strict';
import { milestoneSummary, missionDefinitions } from './lib/milestones.mjs';
import { experienceSummary } from './lib/experience.mjs';
import { dailySpec, shiftDay } from './lib/daily.mjs';
import { english } from './lib/translations.mjs';
const today = '2026-09-15';
const a = (id, more = {}) => ({
  id,
  puzzleId: id,
  mode: 'turn',
  origin: 'catalog',
  tier: 'Mittel',
  assistance: 'none',
  hints: 0,
  completedAt: today + 'T12:00:00Z',
  completedDay: today,
  ...more,
});
const attempts = [a('a'), a('b', { mode: 'slide' })];
const s = milestoneSummary(attempts, today);
assert.equal(
  s.bonuses.reduce((n, b) => n + b.points, 0),
  60,
);
assert.deepEqual(milestoneSummary(attempts.toReversed(), today), s);
assert.deepEqual(milestoneSummary([...attempts, attempts[0]], today), s);
assert.equal(
  milestoneSummary([a('a'), a('b', { puzzleId: 'a' })], today).missions[0]
    .progress,
  1,
);
assert.equal(
  milestoneSummary(
    attempts.map((a) => ({ ...a, assistance: 'test' })),
    today,
  ).bonuses.length,
  0,
);
assert.equal(
  milestoneSummary(
    attempts.map((a) => ({ ...a, partialTime: true })),
    today,
  ).bonuses.length,
  0,
);
const spec = dailySpec('2026-09-12', 'turn');
const delayed = a('late', {
  origin: 'daily',
  dailyDay: spec.day,
  puzzleId: spec.id,
});
assert.equal(milestoneSummary([delayed], today).missions[0].progress, 1);
assert.equal(milestoneSummary([delayed], '2026-09-14').bonuses.length, 0);
assert.equal(
  milestoneSummary(attempts, shiftDay(today, 1)).missions[0].progress,
  0,
);
assert.equal(milestoneSummary(attempts, shiftDay(today, 1)).bonuses.length, 3);
const days = Array.from({ length: 7 }, (_, i) =>
  a('day' + i, {
    completedDay: shiftDay(today, -i),
    completedAt: shiftDay(today, -i) + 'T12:00:00Z',
  }),
);
assert(
  milestoneSummary(days, today).achievements.find((a) => a.id === 'week').done,
);
assert(
  !milestoneSummary(days.slice(1), today).achievements.find(
    (a) => a.id === 'week',
  ).done,
);
for (const item of [
  ...missionDefinitions(today),
  ...missionDefinitions(shiftDay(today, 1)),
  ...s.achievements,
]) {
  assert(english[item.title]);
  assert(english[item.detail]);
}
const xp = experienceSummary(attempts);
assert.equal(xp.total, xp.puzzleTotal + 60);
assert.equal(
  experienceSummary(JSON.parse(JSON.stringify(attempts))).total,
  xp.total,
);
console.log(
  'PASS: mission rewards once per day, unique puzzles, mode variety, exclusions, midnight, archive completion day, streak achievements and backup reconstruction.',
);

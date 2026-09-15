import assert from 'node:assert/strict';
import { dailySpec, streakSummary } from './lib/daily.mjs';
import { experienceSummary, dailyXp, puzzleXp } from './lib/experience.mjs';
import {
  emptyHistory,
  updateAttempt,
  restoreHistory,
} from './lib/play-history.mjs';
const spec = dailySpec('2026-09-12', 'turn');
const meta = {
  puzzleId: spec.id,
  dailyDay: spec.day,
  mode: spec.mode,
  tier: spec.tier,
  name: 'Daily',
  origin: 'daily',
};
let h = updateAttempt(emptyHistory(), meta, {
  id: 'test',
  now: '2026-09-14T12:00:00Z',
  solved: true,
  assistance: 'test',
});
assert.equal(experienceSummary(h.attempts).puzzleTotal, 0);
h = updateAttempt(h, meta, {
  id: 'first',
  now: '2026-09-15T12:00:00Z',
  restart: true,
  solved: true,
  assistance: 'hint',
});
const points = dailyXp(spec.tier);
assert.equal(experienceSummary(h.attempts).puzzleTotal, points);
h = updateAttempt(h, meta, {
  id: 'repeat',
  now: '2026-09-16T12:00:00Z',
  restart: true,
  solved: true,
});
assert.equal(
  experienceSummary(h.attempts).puzzleTotal,
  points,
  'No repeat or improved-score reward',
);
assert.equal(experienceSummary([...h.attempts].reverse()).puzzleTotal, points);
assert.equal(
  experienceSummary(restoreHistory(JSON.parse(JSON.stringify(h))).attempts)
    .puzzleTotal,
  points,
);
assert(!streakSummary(h.attempts, '2026-09-16').days.has('2026-09-12'));
assert.equal(
  experienceSummary(h.attempts.map((a) => ({ ...a, partialTime: true }))).puzzleTotal,
  0,
);
assert.equal(
  experienceSummary(h.attempts.map((a) => ({ ...a, origin: 'catalog' }))).puzzleTotal,
  puzzleXp('catalog', spec.tier) + 5,
);
assert.equal(
  experienceSummary(h.attempts.map((a) => ({ ...a, puzzleId: 'wrong' }))).puzzleTotal,
  0,
);
assert.equal(dailyXp('Leicht', true), 45);
assert.equal(dailyXp('Mittel', true), 55);
assert.equal(dailyXp('Schwer', true), 70);
const records = ['turn', 'slide', 'rotate'].map((mode, i) => {
  const s = dailySpec('2026-09-13', mode);
  return {
    ...h.attempts[1],
    id: 'unique' + i,
    puzzleId: s.id,
    mode,
    dailyDay: s.day,
    assistance: 'none',
    hints: 0,
  };
});
const xp = experienceSummary(records);
assert.equal(xp.puzzleTotal, 170);
assert.equal(xp.level, 2);
assert.equal(xp.current, xp.total - 100);
assert.equal(xp.required, 150);
assert.equal(experienceSummary([]).level, 1);
for (const origin of ['catalog', 'free'])
  for (const mode of ['turn', 'slide', 'rotate'])
    for (const tier of ['Leicht', 'Mittel', 'Schwer']) {
      const m = {
        ...meta,
        origin,
        mode,
        tier,
        puzzleId: `${origin}-${mode}-${tier}`,
      };
      let data = updateAttempt(emptyHistory(), m, {
        id: 'one',
        now: '2026-09-15T12:00:00Z',
        solved: true,
      });
      const expected = puzzleXp(origin, tier, true);
      assert.equal(experienceSummary(data.attempts).puzzleTotal, expected);
      data = updateAttempt(data, m, {
        id: 'duplicate',
        now: '2026-09-15T12:00:01Z',
        solved: true,
      });
      assert.equal(
        experienceSummary(data.attempts).puzzleTotal,
        expected,
        'Repeated completion event is not a new game',
      );
      data = updateAttempt(data, m, {
        id: 'two',
        now: '2026-09-16T12:00:00Z',
        restart: true,
        solved: true,
      });
      assert.equal(experienceSummary(data.attempts).puzzleTotal, expected + 5);
      data = updateAttempt(data, m, {
        id: 'three',
        now: '2026-09-17T12:00:00Z',
        restart: true,
        solved: true,
        assistance: 'test',
      });
      assert.equal(
        experienceSummary(
          restoreHistory(JSON.parse(JSON.stringify(data))).attempts,
        ).puzzleTotal,
        expected + 5,
      );
      data = updateAttempt(
        data,
        { ...m, puzzleId: m.puzzleId + '-new' },
        {
          id: 'new',
          now: '2026-09-18T12:00:00Z',
          solved: true,
          assistance: 'hint',
        },
      );
      assert.equal(
        experienceSummary(data.attempts).puzzleTotal,
        expected + 5 + puzzleXp(origin, tier),
      );
    }
console.log(
  'PASS: first eligible daily reward, tips, tests, repeats, replay, restore, catch-up without streak repair, three modes and level thresholds.',
);

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const golden = {
  turn: '2690f6d8d4d960ac4d0974ca17516f68b3cb20a02a00e34501b9a9d9dcc01dfe',
  slide: 'd25f20012f779f817bbc4903ce25da31448c9823eae63e1601cf64f38bc69f1d',
  rotate: 'bc3f181eb1cbc20dd0cb4f260942d20eb368a052ef80bb2c648ccd791635fb46',
};
import {
  dayKey,
  validDay,
  shiftDay,
  dailySpec,
  dailyModes,
  monthDays,
  streakSummary,
  dailyCompleted,
} from './lib/daily.mjs';
import { generateDaily, restoreDaily } from './lib/daily-generator.mjs';
import { solutionPlan, applyHelp, helpSolved } from './lib/solve-help.mjs';
import {
  restoreHistory,
  emptyHistory,
  updateAttempt,
} from './lib/play-history.mjs';
assert(!validDay('2026-02-30'));
assert(validDay('2028-02-29'));
assert.equal(shiftDay('2028-02-28', 1), '2028-02-29');
assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
assert.equal(monthDays('2028-02').days.length, 29);
assert.equal(monthDays('2026-09').leading, 1);
assert.equal(dayKey(new Date(2026, 8, 12, 23, 59)), '2026-09-12');
assert.throws(() => dailySpec('bad', 'turn'));
assert.throws(() => dailySpec('2026-09-12', 'bad'));
for (let offset = 0; offset < 12; offset++)
  for (const mode of dailyModes) {
    const day = shiftDay('2026-09-12', offset),
      e = generateDaily(day, mode),
      spec = dailySpec(day, mode);
    assert.equal(e.puzzle.id, spec.id);
    assert.equal(e.puzzle.tier, spec.tier);
    if (offset === 0) {
      const p = e.puzzle;
      assert.equal(
        createHash('sha256')
          .update(
            JSON.stringify([
              p.initial,
              p.solution,
              p.pieces,
              p.source,
              p.sourceId,
            ]),
          )
          .digest('hex'),
        golden[mode],
        'Published daily schedule must stay stable',
      );
    }
    assert(!helpSolved(e.puzzle, e.session));
    const plan = solutionPlan(e.puzzle, e.session),
      solved = applyHelp(e.puzzle, e.session, plan, 'all');
    assert(helpSolved(e.puzzle, solved));
    const almost = applyHelp(e.puzzle, e.session, plan, 'almost');
    assert.equal(solutionPlan(e.puzzle, almost).length, 1);
    const restored = restoreDaily(
      JSON.parse(JSON.stringify({ ...e, session: almost })),
      day,
      mode,
    );
    assert.deepEqual(restored.session, almost);
    assert.equal(restored.puzzle.id, spec.id);
    assert.equal(restoreDaily(e, shiftDay(day, 1), mode), null);
    if (offset === 0)
      assert.deepEqual(
        generateDaily(day, mode),
        e,
        'Same date and mode must generate identical puzzles',
      );
  }
const completion = (day, extra = {}) => ({
  puzzleId: 'x',
  completedAt: day + 'T12:00:00Z',
  completedDay: day,
  assistance: 'none',
  partialTime: false,
  ...extra,
});
let attempts = [
  completion('2026-09-12'),
  completion('2026-09-13', { assistance: 'hint' }),
  completion('2026-09-13'),
  completion('2026-09-14', { assistance: 'test' }),
];
assert.equal(
  streakSummary(attempts, '2026-09-14').current,
  2,
  'Yesterday keeps the series alive today',
);
assert.equal(streakSummary(attempts, '2026-09-15').current, 0);
assert.equal(streakSummary(attempts, '2026-09-15').longest, 2);
attempts.push(
  completion('2026-09-15', {
    origin: 'daily',
    dailyDay: '2026-09-14',
    mode: 'slide',
  }),
);
assert(dailyCompleted(attempts, '2026-09-14', 'slide'));
assert(
  !streakSummary(attempts, '2026-09-15').days.has('2026-09-14'),
  'Catch-up never invents an earlier play day',
);
assert.equal(streakSummary(attempts, '2026-09-15').current, 1);
assert(
  !dailyCompleted(
    [
      completion('2026-09-12', {
        origin: 'daily',
        dailyDay: '2026-09-12',
        mode: 'turn',
        assistance: 'test',
      }),
    ],
    '2026-09-12',
    'turn',
  ),
);
assert.equal(
  streakSummary([completion('2026-09-12', { partialTime: true })], '2026-09-12')
    .current,
  0,
);
assert.equal(
  streakSummary(
    [completion('2026-12-31'), completion('2027-01-01')],
    '2027-01-01',
  ).current,
  2,
);
const e = generateDaily('2026-09-12', 'turn');
const data = updateAttempt(
  emptyHistory(),
  {
    puzzleId: e.puzzle.id,
    name: e.puzzle.name,
    mode: 'turn',
    origin: 'daily',
    dailyDay: e.day,
    n: 4,
    tier: e.puzzle.tier,
  },
  { id: 'daily-attempt', now: '2026-09-12T12:00:00Z', moves: 0, solved: true },
);
assert.deepEqual(restoreHistory(JSON.parse(JSON.stringify(data))), data);
console.log(
  'PASS: 36 solvable and restorable daily puzzles; deterministic schedule, hint actions, Gregorian calendar, local dates, streak gaps, tips, test exclusions, duplicate days and catch-up attribution.',
);

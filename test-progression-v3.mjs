import assert from 'node:assert/strict';
import fs from 'node:fs';
import { proveOptimal } from './lib/optimal-moves.mjs';
import {
  variantPuzzle,
  variantStatus,
  variantCatalog,
  variantPlan,
} from './lib/variants.mjs';
import { fresh } from './lib/session.mjs';
import { rotate } from './lib/game.mjs';
import { slidingStatus, freshSliding, slideAct } from './lib/sliding.mjs';
import { generateDaily, restoreDaily } from './lib/daily-generator.mjs';
import {
  choiceModes,
  dailyCount,
  dailyFinish,
  dailySpec,
  streakSummary,
} from './lib/daily.mjs';
import { experienceSummary } from './lib/experience.mjs';
import { milestoneSummary } from './lib/milestones.mjs';
import {
  emptyHistory,
  updateAttempt,
  restoreHistory,
} from './lib/play-history.mjs';
import { validateBackup } from './lib/backup.mjs';
import { variantDifficulty } from './lib/variant-difficulty.mjs';
const levels = JSON.parse(fs.readFileSync('lib/levels.json')),
  sliding = JSON.parse(fs.readFileSync('lib/sliding-levels.json'));
const certified = JSON.parse(fs.readFileSync('lib/optimal-catalog.json'));
for (const l of [...levels, ...sliding, ...variantCatalog]) {
  const c = certified[l.id];
  assert(c && c.minimumMoves > 0);
  assert.equal(
    c.signature,
    JSON.stringify([
      l.n,
      l.initial,
      l.source,
      l.sourceId,
      l.pieces,
      l.mode,
      l.variant,
      l.groups,
      l.owners,
      l.targets,
      l.sources,
    ]),
  );
}
// Independent exhaustive orientation oracle, including dark cells and paired tiles.
for (const mode of ['dual', 'path', 'linked'])
  for (const seed of [3, 42]) {
    const l = variantPuzzle(mode, seed, 3, 'oracle', 3);
    let best = Infinity;
    function enumerate(at, s, cost) {
      if (cost >= best) return;
      if (at === l.groups.length) {
        if (variantStatus(l, s).solved) best = cost;
        return;
      }
      for (let k = 0; k < 4; k++) {
        const next = { ...s, turns: [...s.turns] };
        for (const i of l.groups[at]) next.turns[i] = k;
        enumerate(at + 1, next, cost + k);
      }
    }
    enumerate(0, fresh(l), 0);
    const result = proveOptimal(l, 10000);
    assert(result.proven);
    assert.equal(result.minimumMoves, best, `${mode} ${seed}`);
    assert(proveOptimal(l, best).optimal);
    assert(!proveOptimal(l, best + 1).optimal);
    assert(!proveOptimal(l, best, { maxNodes: 0 }).proven);
  }
// Shallow mixed sliding oracle using actual legal actions, independent of CSP.
for (const mode of ['slide', 'rotate']) {
  const original = sliding.find((l) => l.mode === mode);
  const l = {
    ...original,
    initial: {
      positions: [...original.solution.positions],
      turns: [...original.solution.turns],
    },
  };
  const hole = l.initial.positions.indexOf(null),
    p = hole % 3 ? hole - 1 : hole + 1;
  [l.initial.positions[hole], l.initial.positions[p]] = [
    l.initial.positions[p],
    l.initial.positions[hole],
  ];
  if (mode === 'rotate') l.initial.turns[0] = (l.initial.turns[0] + 3) % 4;
  const queue = [{ s: freshSliding(l), d: 0 }],
    seen = new Set();
  let expected;
  for (let i = 0; i < queue.length; i++) {
    const { s, d } = queue[i];
    if (slidingStatus(l, s).solved) {
      expected = d;
      break;
    }
    assert(d < 5);
    for (let id = 0; id < l.pieces.length; id++)
      for (const type of ['slide', ...(mode === 'rotate' ? ['turn'] : [])]) {
        const n = slideAct(l, s, { id, type });
        if (n === s) continue;
        const key = JSON.stringify([n.positions, n.turns.map((x) => x % 4)]);
        if (!seen.has(key)) {
          seen.add(key);
          queue.push({ s: { ...n, history: [] }, d: d + 1 });
        }
      }
  }
  const r = proveOptimal(l, expected);
  assert(r.proven);
  assert.equal(r.minimumMoves, expected);
}
const attempts = [],
  data = {
    'leuchtwege-v2': {
      version: 2,
      level: 0,
      sessions: {},
      done: [],
      sound: false,
    },
  };
for (const mode of choiceModes)
  for (const slot of [0, 1, 2]) {
    const entry = generateDaily('2026-09-21', mode, slot);
    assert(entry);
    assert.deepEqual(restoreDaily(entry, entry.day, mode, slot), entry);
    data[`leuchtwege-daily-v2:${entry.day}:${mode}:${slot}`] = entry;
    if (mode === 'turn')
      attempts.push({
        id: `a${slot}`,
        puzzleId: entry.puzzle.id,
        dailyDay: entry.day,
        mode,
        origin: 'daily',
        tier: entry.puzzle.tier,
        completedAt: `2026-09-22T10:00:0${slot}Z`,
        completedDay: '2026-09-22',
        partialTime: false,
        assistance: 'none',
        hints: 0,
        elapsedMs: 1000,
      });
  }
assert.equal(dailyCount(attempts, '2026-09-21'), 3);
assert.equal(dailyFinish(attempts, '2026-09-21', 0).mode, 'turn');
assert.equal(
  milestoneSummary(attempts, '2026-09-22').achievements.find(
    (a) => a.id === 'trios-1',
  ).done,
  true,
);
assert(!streakSummary(attempts, '2026-09-22').days.has('2026-09-21'));
const duplicate = {
  ...attempts[0],
  id: 'othermode',
  mode: 'path',
  puzzleId: dailySpec('2026-09-21', 'path', 0).id,
  completedAt: '2026-09-22T12:00:00Z',
};
assert.equal(
  experienceSummary([...attempts, duplicate]).puzzleTotal,
  experienceSummary(attempts).puzzleTotal,
  'One daily reward per slot regardless of mode',
);
validateBackup(
  JSON.stringify({
    app: 'Leuchtwege',
    version: 1,
    createdAt: new Date().toISOString(),
    data,
  }),
  levels,
  sliding,
);
let h = emptyHistory();
const meta = {
  puzzleId: 'test',
  name: 'Test',
  mode: 'turn',
  origin: 'catalog',
  tier: 'Leicht',
  n: 3,
};
const event = (moves, extra = {}) => {
  h = updateAttempt(h, meta, {
    id: 'attempt',
    now: '2026-09-21T12:00:00Z',
    moves,
    ...extra,
  });
};
event(0);
event(1);
event(0);
event(1, { solved: true });
assert.equal(h.attempts[0].effortMoves, 2);
assert.deepEqual(restoreHistory(h), h);
const base = {
  ...h.attempts[0],
  moves: 1,
  effortMoves: 1,
  optimalProof: { version: 1, minimumMoves: 1 },
};
assert(
  milestoneSummary([base], '2026-09-21').achievements.find(
    (a) => a.id === 'optimal_turn-1',
  ).done,
);
for (const changed of [
  { effortMoves: 2 },
  { hints: 1 },
  { assistance: 'test' },
  { partialTime: true },
  { optimalProof: { version: 1, minimumMoves: 2 } },
])
  assert(
    !milestoneSummary(
      [{ ...base, ...changed }],
      '2026-09-21',
    ).achievements.find((a) => a.id === 'optimal_turn-1').done,
  );
const many = Array.from({ length: 200 }, (_, i) => ({
  ...base,
  id: `repeat${i}`,
  puzzleId: `p${i}`,
}));
const xp = experienceSummary(many);
assert(xp.achievementAwards.some((a) => a.id === 'clear-200'));
assert(xp.achievementAwards.some((a) => a.id === 'independent-200'));
for (const l of variantCatalog.filter((l) => l.tier === 'Schwer'))
  assert(
    l.difficulty.maxDeadEndDepth >= 3 || l.difficulty.waves >= 8,
    'Hard requires delayed contradictions or a long deduction chain',
  );
console.log(
  'PASS: 680 exact catalogue certificates, independent optimum oracles in all rule families, unknown budget safety, effort/undo exclusions, 18 daily choices with backup, same-mode trio, single-slot XP, real-day streak, 200 no-help awards and genuine delayed contradictions.',
);

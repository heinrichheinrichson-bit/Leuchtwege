import assert from 'node:assert/strict';
import {
  generateSliding,
  slidingGoals,
  restoreFreeSliding,
} from './lib/random-sliding.mjs';
import {
  freshSliding,
  slideAct,
  slidingStatus,
  adjacent,
} from './lib/sliding.mjs';
import { solutionPlan, applyHelp } from './lib/solve-help.mjs';
import { rotate } from './lib/game.mjs';

let count = 0,
  maxMs = 0;
const samples = [];
for (const mode of ['slide', 'rotate'])
  for (const tier of ['Leicht', 'Mittel', 'Schwer'])
    for (let seed = 1; seed <= 12; seed++) {
      const t = Date.now(),
        l = generateSliding({ mode, tier, seed: seed * 713 }),
        s = freshSliding(l);
      maxMs = Math.max(maxMs, Date.now() - t);
      count++;
      assert(!slidingStatus(l, s).solved);
      assert(slidingStatus(l, l.solution).solved);
      let plan = solutionPlan(l, s);
      assert(slidingStatus(l, applyHelp(l, s, plan, 'all')).solved);
      const almost = applyHelp(l, s, plan, 'almost');
      assert(!slidingStatus(l, almost).solved);
      assert.equal(solutionPlan(l, almost).length, 1);
      assert(
        slidingStatus(l, applyHelp(l, almost, solutionPlan(l, almost), 'step'))
          .solved,
      );
      assert.deepEqual(
        slideAct(l, applyHelp(l, s, plan, 'all'), { type: 'undo' }),
        s,
      );
      let moved = s;
      for (let k = 0; k < 5; k++) {
        const hole = moved.positions.indexOf(null),
          p = moved.positions.findIndex(
            (id, i) => id !== null && adjacent(i, hole, 3),
          );
        moved = slideAct(l, moved, { type: 'slide', id: moved.positions[p] });
        if (mode === 'rotate')
          moved = slideAct(l, moved, { type: 'turn', id: k });
      }
      assert(
        slidingStatus(l, applyHelp(l, moved, solutionPlan(l, moved), 'all'))
          .solved,
      );
      const raw = {
        version: 1,
        [mode]: { puzzle: l, session: moved },
        tiers: { [mode]: tier },
        recent: [l.fingerprint],
      };
      assert.deepEqual(
        restoreFreeSliding(JSON.parse(JSON.stringify(raw)))[mode],
        raw[mode],
      );
      const damaged = structuredClone(raw);
      damaged[mode].puzzle.solution.positions[0] = 99;
      assert.equal(restoreFreeSliding(damaged)[mode], null);
      if (mode === 'rotate') {
        assert(
          !slidingGoals(l).has(
            s.positions.map((id) => (id === null ? '_' : id)).join(''),
          ),
          'must require sliding',
        );
        const pieces = l.pieces.map((m, id) => {
          for (let k = 0; k < s.turns[id]; k++) m = rotate(m);
          return m;
        });
        assert.equal(
          slidingGoals({ ...l, mode: 'slide', pieces }).size,
          0,
          'must require rotation',
        );
      }
      if (seed === 1) {
        assert.deepEqual(
          generateSliding({ mode, tier, seed: 713 }),
          l,
          'deterministic',
        );
        assert.notEqual(
          generateSliding({ mode, tier, seed: 713, exclude: [l.fingerprint] })
            .fingerprint,
          l.fingerprint,
        );
        samples.push(l);
      }
    }
// Independent forward search: no valid network appears before the recorded minimum.
for (const l of samples) {
  let stepped=freshSliding(l), clicks=0;
  while(!slidingStatus(l,stepped).solved && clicks++<100) {
    const before=stepped;
    stepped=applyHelp(l,stepped,solutionPlan(l,stepped),'step');
    assert.equal(stepped.slides+stepped.rotations,before.slides+before.rotations+1);
  }
  assert(slidingStatus(l,stepped).solved,'repeated individual steps must finish');
  const goals = slidingGoals(l),
    encode = (p) => p.map((id) => (id === null ? '_' : id)).join('');
  let frontier = [encode(l.initial.positions)],
    seen = new Set(frontier),
    found = -1;
  for (let depth = 0; depth <= l.minSlides; depth++) {
    if (frontier.some((k) => goals.has(k))) {
      found = depth;
      break;
    }
    const next = [];
    for (const key of frontier)
      for (let p = 0; p < 9; p++) {
        const hole = key.indexOf('_');
        if (!adjacent(p, hole, 3)) continue;
        const chars = [...key];
        [chars[p], chars[hole]] = [chars[hole], chars[p]];
        const k = chars.join('');
        if (!seen.has(k)) {
          seen.add(k);
          next.push(k);
        }
      }
    frontier = next;
  }
  assert.equal(found, l.minSlides);
}
console.log(
  `PASS: ${count} generated sliding puzzles; both modes, all tiers, actual minimum slide distances, legal solutions, all help actions, undo and save restoration. Slowest generation ${maxMs}ms.`,
);

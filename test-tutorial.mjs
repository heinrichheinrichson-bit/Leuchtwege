import assert from 'node:assert/strict';
import {
  tutorials,
  newTutorial,
  tutorialAct,
  tutorialStatus,
  tutorialProgress,
} from './lib/tutorial.mjs';
import { tapSliding, swipeSliding } from './lib/sliding.mjs';
for (const mode of Object.keys(tutorials)) {
  const lesson = tutorials[mode];
  let state = newTutorial(mode);
  assert(!tutorialStatus(mode, state).solved);
  assert.equal(
    tutorialAct(mode, state, { type: 'turn', index: 8 }),
    state,
    'Unrequested moves cannot derail the lesson',
  );
  if (mode === 'turn') {
    assert.equal(tutorialStatus(mode, state).lit.size, 9);
    assert(tutorialStatus(mode, state).open > 0);
  }
  for (const step of lesson.steps) {
    if (step.action.type === 'slide') {
      const l = lesson.puzzle,
        s = state.session,
        pos = s.positions.indexOf(step.action.id),
        hole = s.positions.indexOf(null);
      const selected = tapSliding(l, s, null, pos).selected;
      assert.deepEqual(tapSliding(l, s, selected, hole).action, step.action);
      assert.deepEqual(
        swipeSliding(
          l,
          s,
          selected,
          ((hole % 3) - (pos % 3)) * 90,
          (Math.floor(hole / 3) - Math.floor(pos / 3)) * 90,
          100,
        ),
        step.action,
      );
    } else if (mode === 'rotate') {
      const pos = state.session.positions.indexOf(step.action.id);
      assert.equal(
        tapSliding(lesson.puzzle, state.session, null, pos).action,
        null,
      );
      assert.deepEqual(
        tapSliding(lesson.puzzle, state.session, step.action.id, pos).action,
        step.action,
      );
    }
    const next = tutorialAct(mode, state, step.action);
    assert.equal(next.step, state.step + 1);
    state = next;
  }
  assert(tutorialStatus(mode, state).solved);
  assert.equal(tutorialAct(mode, state, lesson.steps[0].action), state);
  assert.equal(newTutorial(mode).step, 0);
}
assert.deepEqual(
  tutorialProgress({ turn: true, slide: 'true', rotate: false, other: true }),
  { turn: true, slide: false, rotate: false },
);
console.log(
  'PASS: all three guided lessons, lit-but-unsolved example, gesture equivalence, wrong-action protection, restart and progress validation.',
);

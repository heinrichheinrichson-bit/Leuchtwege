import assert from 'node:assert/strict';
import {
  selectResumeGame,
  rememberResumeGame,
  resumeListKey,
  resumeSlotsKey,
  restoreHiddenResume,
} from './lib/resume-list.mjs';
const old = { id: 'old', revision: '1' },
  latest = { id: 'new', revision: '2' };
assert.equal(selectResumeGame([old, latest], {}, 'new'), latest);
assert.equal(
  selectResumeGame([old, latest], { new: '2' }, 'new'),
  null,
  'Dismissal must not reveal an older unfinished game',
);
assert.equal(
  selectResumeGame([old], {}, 'new'),
  null,
  'Finishing latest game must not revive an old game',
);
assert.equal(selectResumeGame([old, latest], {}, 'missing'), null);
assert.deepEqual(restoreHiddenResume(['invalid']), {});
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
rememberResumeGame('turn', 'old');
rememberResumeGame('turn', 'new');
rememberResumeGame('slide', 'slide-one');
assert.deepEqual(JSON.parse(storage.get(resumeSlotsKey)), {
  turn: 'new',
  slide: 'slide-one',
});
storage.set(resumeListKey, JSON.stringify({ new: '2' }));
rememberResumeGame('turn', 'new');
assert.equal(
  JSON.parse(storage.get(resumeListKey)).new,
  '2',
  'Opening without a move preserves dismissal',
);
rememberResumeGame('turn', 'new', true);
assert.equal(
  JSON.parse(storage.get(resumeListKey)).new,
  undefined,
  'Playing again explicitly restores the shortcut',
);
console.log(
  'PASS: one slot per mode, no older fallback, persistent dismissal, replay and independent modes.',
);

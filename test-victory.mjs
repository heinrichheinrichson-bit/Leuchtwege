import assert from 'node:assert/strict';
import {
  victoryTimeline,
  SETTLE_MS,
  BOARD_VIEW_MS,
} from './lib/victory-timing.mjs';
const events = [],
  tasks = new Map();
let id = 0;
const schedule = (fn, delay) => {
  tasks.set(++id, { fn, delay });
  return id;
};
const unschedule = (id) => tasks.delete(id);
const make = () =>
  victoryTimeline({
    glow: () => events.push('glow+sound'),
    reveal: () => events.push('dialog'),
    schedule,
    unschedule,
  });
let cancel = make();
assert.deepEqual(events, [], 'No immediate popup or sound');
const callbacks = [...tasks.values()];
assert.equal(callbacks[0].delay, SETTLE_MS);
assert.equal(callbacks[1].delay - callbacks[0].delay, BOARD_VIEW_MS);
callbacks[0].fn();
assert.deepEqual(events, ['glow+sound']);
callbacks[1].fn();
assert.deepEqual(events, ['glow+sound', 'dialog']);
cancel();
assert.equal(tasks.size, 0);
events.length = 0;
cancel = make();
const stale = [...tasks.values()];
cancel();
stale.forEach((t) => t.fn());
assert.deepEqual(events, [], 'Cancelled callbacks cannot reopen dialog');
cancel = make();
const half = [...tasks.values()];
half[0].fn();
cancel();
half[1].fn();
assert.deepEqual(events, ['glow+sound']);
console.log(
  'PASS: movement settles first; sound and glow together; 1.5-second unobstructed board; cancellation before/after glow blocks stale popup.',
);

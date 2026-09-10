import assert from 'node:assert/strict';
import { connectionSound } from './lib/connection-sound.mjs';
const state = (cells, solved = false) => ({ lit: new Set(cells), solved });
assert.equal(connectionSound(state([0]), state([0, 1, 2])), 'connect');
assert.equal(connectionSound(state([0, 1, 2]), state([0])), 'disconnect');
assert.equal(connectionSound(state([0, 1]), state([0, 2])), 'disconnect');
assert.equal(connectionSound(state([0, 1]), state([0, 1])), null);
assert.equal(connectionSound(state([0]), state([0, 1], true)), null);
console.log(
  'PASS: gained light, lost light, exchanged branches, unchanged light, victory priority.',
);

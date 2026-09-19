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

// Rapid re-triggers must fade rather than seek or stop at a non-zero sample.
const { createGameAudio } = await import('./lib/game-audio.mjs');
const context = {
  state: 'running',
  currentTime: 0,
  destination: {},
  sources: [],
  gains: [],
  async resume() {
    this.state = 'running';
  },
  async close() {
    this.state = 'closed';
  },
  async decodeAudioData() {
    return { duration: 0.3 };
  },
  createGain() {
    const events = [];
    const node = {
      events,
      connect() {},
      disconnect() {},
      gain: {
        setValueAtTime(value, time) {
          events.push(['set', value, time]);
        },
        linearRampToValueAtTime(value, time) {
          events.push(['ramp', value, time]);
        },
        cancelScheduledValues(time) {
          events.push(['cancel', time]);
        },
      },
    };
    this.gains.push(node);
    return node;
  },
  createBufferSource() {
    const node = {
      stops: [],
      connect() {},
      disconnect() {},
      start(time) {
        this.started = time;
      },
      stop(time) {
        this.stops.push(time);
      },
    };
    this.sources.push(node);
    return node;
  },
  createOscillator() {
    return Object.assign(this.createBufferSource(), { frequency: {} });
  },
};
let contexts = 0,
  loads = 0;
const audio = createGameAudio({
  makeContext: () => {
    contexts++;
    return context;
  },
  load: async () => {
    loads++;
    return new ArrayBuffer(4);
  },
});
await audio.play('connect');
assert.deepEqual(context.gains[0].events[0], ['set', 0, 0]);
context.currentTime = 0.06;
await audio.play('disconnect');
assert.deepEqual(context.gains[0].events.slice(-2), [
  ['set', 0.34, 0.06],
  ['ramp', 0, 0.075],
]);
assert.ok(context.sources[0].stops.at(-1) > context.currentTime);
context.currentTime = 0.065;
await audio.play('connect');
assert.equal(context.sources.length, 2, 'Burst is bounded');
context.currentTime = 0.12;
await audio.play('connect');
assert.equal(loads, 2, 'Decoded samples are reused');
assert.equal(contexts, 1, 'Context is reused');
audio.stop();
assert.equal(context.gains.at(-1).events.at(-1)[1], 0);
context.currentTime = 0.2;
await audio.play('turn');
assert.equal(contexts, 1, 'Turn tone also shares the context');
audio.dispose();
await audio.play('success');
assert.equal(context.sources.length, 4, 'Disposed engine stays silent');

let resolveLoad;
const pendingAudio = createGameAudio({
  makeContext: () => context,
  load: () =>
    new Promise((resolve) => {
      resolveLoad = resolve;
    }),
});
const pending = pendingAudio.play('connect');
pendingAudio.stop();
resolveLoad(new ArrayBuffer(4));
await pending;
assert.equal(context.sources.length, 4, 'Mute cancels a pending decoded sound');
pendingAudio.dispose();
console.log(
  'PASS: soft interruption, bounded rapid input, sample/context reuse, tick, mute during load and disposal.',
);

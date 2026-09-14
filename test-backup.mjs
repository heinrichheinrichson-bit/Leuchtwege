import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createBackup,
  validateBackup,
  importBackup,
  collectData,
  recoverBackup,
  journalKey,
  undoKey,
} from './lib/backup.mjs';
import { fresh, act } from './lib/session.mjs';
import { freshSliding } from './lib/sliding.mjs';
import { emptyFree, generateRandom, acceptRandom } from './lib/random-game.mjs';
import { restoreFreeSliding } from './lib/random-sliding.mjs';
import { emptyHistory, updateAttempt } from './lib/play-history.mjs';
import { experienceSummary } from './lib/experience.mjs';
import { streakSummary } from './lib/daily.mjs';
import { generateDaily } from './lib/daily-generator.mjs';
const levels = JSON.parse(
  fs.readFileSync(new URL('./lib/levels.json', import.meta.url)),
);
const sliding = JSON.parse(
  fs.readFileSync(new URL('./lib/sliding-levels.json', import.meta.url)),
);
class Storage {
  data = new Map();
  fail = null;
  get length() {
    return this.data.size;
  }
  key(i) {
    return [...this.data.keys()][i];
  }
  getItem(k) {
    return this.data.get(k) ?? null;
  }
  setItem(k, v) {
    if (this.fail === k) {
      this.fail = null;
      throw Error('Simulated quota');
    }
    this.data.set(k, v);
  }
  removeItem(k) {
    this.data.delete(k);
  }
}
const s = new Storage();
const put = (k, v) => s.setItem(k, JSON.stringify(v));
put('unrelated-app', { keep: true });
put('leuchtwege-v2', {
  version: 2,
  level: 0,
  sessions: { 0: act(levels[0], fresh(levels[0]), { type: 'turn', index: 0 }) },
  done: [1, 2],
  sound: true,
});
put('leuchtwege-sliding-v1', {
  version: 1,
  current: 0,
  sessions: { [sliding[0].id]: freshSliding(sliding[0]) },
});
put('leuchtwege-free-v1', emptyFree());
put('leuchtwege-sliding-free-v1', restoreFreeSliding(null));
put('leuchtwege-learn-v1', { turn: true });
put('leuchtwege-preferences-v1', { version: 1, animations: false });
put('leuchtwege-hints-v1:lw-001', { used: 2, rewards: [] });
const history = updateAttempt(
  emptyHistory(),
  {
    puzzleId: 'lw-001',
    name: 'Test',
    mode: 'turn',
    origin: 'catalog',
    tier: 'Leicht',
    n: 3,
  },
  { id: 'attempt-1', now: '2026-09-12T12:00:00Z', solved: true },
);
put('leuchtwege-history-v1', history);
const original = createBackup(s, levels, sliding);
const data = collectData(s);
const check = () => assert.deepEqual(collectData(s), data);
const imported = validateBackup(original, levels, sliding);
imported.data['leuchtwege-v2'].done = [1, 2, 3];
importBackup(s, imported, levels, sliding);
assert.deepEqual(JSON.parse(s.getItem('leuchtwege-v2')).done, [1, 2, 3]);
importBackup(
  s,
  validateBackup(s.getItem(undoKey), levels, sliding),
  levels,
  sliding,
  true,
);
check();
assert.equal(s.getItem(undoKey), null);
for (const key of [
  undoKey,
  journalKey,
  'leuchtwege-v2',
  'leuchtwege-history-v1',
]) {
  s.fail = key;
  assert.throws(() => importBackup(s, imported, levels, sliding));
  check();
}
s.setItem(journalKey, JSON.stringify(data));
s.removeItem('leuchtwege-v2');
assert.equal(recoverBackup(s), true);
check();
assert.equal(s.getItem('unrelated-app'), '{"keep":true}');
for (const mutate of [
  (f) => (f.version = 2),
  (f) => (f.data.bad = {}),
  (f) => f.data['leuchtwege-v2'].sessions[0].turns.pop(),
  (f) => (f.data['leuchtwege-history-v1'].attempts[0].moves = -1),
  (f) => (f.data['leuchtwege-hints-v1:lw-001'].used = 8),
]) {
  const f = JSON.parse(original);
  mutate(f);
  assert.throws(() => validateBackup(JSON.stringify(f), levels, sliding));
  check();
}
const puzzle = generateRandom({ tier: 'Leicht', size: 3, seed: 15 });
assert.ok(puzzle);
put('leuchtwege-free-v1', acceptRandom(emptyFree(), puzzle));
assert.ok(validateBackup(createBackup(s, levels, sliding), levels, sliding));
assert.deepEqual(
  experienceSummary(
    JSON.parse(original).data['leuchtwege-history-v1'].attempts,
  ),
  experienceSummary(history.attempts),
);
assert.deepEqual(
  streakSummary(
    JSON.parse(original).data['leuchtwege-history-v1'].attempts,
    '2026-09-14',
  ),
  streakSummary(history.attempts, '2026-09-14'),
);
console.log(
  'PASS: all save categories, XP/streak preservation, free puzzle, invalid imports, undo, quota rollback and interrupted-write recovery.',
);
for (const mode of ['turn', 'slide', 'rotate']) {
  const daily = generateDaily('2026-09-12', mode);
  put('leuchtwege-daily-v1:2026-09-12:' + mode, daily);
}
assert.ok(validateBackup(createBackup(s, levels, sliding), levels, sliding));
console.log('PASS: all three daily puzzle modes survive backup validation.');
put('leuchtwege-preferences-v1', {
  version: 1,
  animations: false,
  language: 'en',
  theme: 'light',
  haptics: false,
});
assert.ok(validateBackup(createBackup(s, levels, sliding), levels, sliding));

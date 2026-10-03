import assert from 'node:assert/strict';
import fs from 'node:fs';
import { difficulty } from './lib/difficulty.mjs';
import { variantCatalog } from './lib/variants.mjs';
import { variantDifficulty } from './lib/variant-difficulty.mjs';
import { slidingGoals } from './lib/random-sliding.mjs';
import { neighbor } from './lib/game.mjs';
const levels = JSON.parse(fs.readFileSync('lib/levels.json'));
const sliding = JSON.parse(fs.readFileSync('lib/sliding-levels.json'));
const rows = levels.map((l) => ({
  id: l.id,
  mode: 'turn',
  stored: l.difficulty.tier,
  ...difficulty(l),
}));
rows.push(
  ...variantCatalog.map((l) => ({
    id: l.id,
    mode: l.mode,
    stored: l.tier,
    ...variantDifficulty(l),
  })),
);
const neighbors = Array.from({ length: 9 }, (_, i) =>
  [0, 1, 2, 3].map((d) => neighbor(i, d, 3)).filter((j) => j >= 0),
);
function distance(l) {
  const goals = slidingGoals(l),
    start = l.initial.positions.map((id) => (id === null ? '_' : id)).join('');
  const seen = new Set([start]),
    queue = [start],
    depth = [0];
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i];
    if (goals.has(key)) return depth[i];
    const blank = key.indexOf('_');
    for (const from of neighbors[blank]) {
      const chars = [...key];
      [chars[blank], chars[from]] = [chars[from], chars[blank]];
      const next = chars.join('');
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
        depth.push(depth[i] + 1);
      }
    }
  }
  throw Error('Unreachable ' + l.id);
}
for (const [i, l] of sliding.entries()) {
  const minSlides = distance(l),
    thresholds = l.mode === 'slide' ? [7, 14] : [3, 5];
  const tier =
    minSlides <= thresholds[0]
      ? 'Leicht'
      : minSlides <= thresholds[1]
        ? 'Mittel'
        : 'Schwer';
  rows.push({
    id: l.id,
    mode: l.mode,
    stored: l.tier,
    tier,
    minSlides,
    storedMinSlides: l.minSlides,
  });
  if (i % 30 === 29) console.log('Checked sliding', i + 1);
}
if (process.argv.includes('--check'))
  assert.deepEqual(
    JSON.parse(fs.readFileSync('docs/all-mode-difficulty-audit.json')),
    rows,
  );
else
  fs.writeFileSync(
    'docs/all-mode-difficulty-audit.json',
    JSON.stringify(rows, null, 2) + '\n',
  );
const mismatches = rows.filter(
  (r) =>
    r.stored !== r.tier ||
    (r.storedMinSlides !== undefined && r.minSlides !== r.storedMinSlides),
);
assert.deepEqual(
  mismatches,
  [],
  'Catalogue ratings must agree with independent distance/reasoning checks',
);
for (const mode of ['turn', 'slide', 'rotate', 'dual', 'path', 'linked'])
  console.log(
    mode,
    Object.fromEntries(
      ['Leicht', 'Mittel', 'Schwer'].map((t) => [
        t,
        rows.filter((r) => r.mode === mode && r.tier === t).length,
      ]),
    ),
  );

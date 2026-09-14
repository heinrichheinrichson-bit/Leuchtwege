import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { makeLevel, topologyKey, similarity } from './lib/level-design.mjs';
import { difficulty } from './lib/difficulty.mjs';
import { solutions, evaluate } from './lib/game.mjs';
import { generateSliding } from './lib/random-sliding.mjs';
import { freshSliding, slideAct, slidingStatus } from './lib/sliding.mjs';
import { solutionPlan } from './lib/solve-help.mjs';
const levels = JSON.parse(readFileSync('lib/levels.json', 'utf8'));
const slides = JSON.parse(readFileSync('lib/sliding-levels.json', 'utf8'));
const original = JSON.stringify(levels),
  originalSlides = JSON.stringify(slides);
const tiers = ['Leicht', 'Mittel', 'Schwer'];
const names = [
  'Lichtgarten',
  'Stiller Morgen',
  'Sonnenpfad',
  'Kleine Strahlen',
  'Weite Bögen',
  'Lichtquelle im Wald',
  'Sanfter Strom',
  'Abendstern',
  'Goldene Wege',
  'Neuer Horizont',
];
const review = [];
for (const tier of tiers) {
  let count = levels.filter((l) => l.difficulty.tier === tier).length;
  for (
    let seed = 1400000 + tiers.indexOf(tier) * 100000;
    count < 30 && seed < 1800000;
    seed++
  ) {
    const n = (tier === 'Leicht' ? [3, 4, 4, 5] : [4, 5, 5, 6])[seed % 4];
    const l = makeLevel(n, seed);
    if (!l) continue;
    const d = difficulty(l);
    if (d.tier !== tier || d.method === 'search') continue;
    const key = topologyKey(l);
    if (
      levels.some((old) => topologyKey(old) === key || similarity(old, l) > 0.9)
    )
      continue;
    if (solutions(l.initial, n, l.source).length !== 1) continue;
    assert(evaluate(l.solution, n, l.source).solved);
    Object.assign(l, {
      id: 'lw-' + String(levels.length + 1).padStart(3, '0'),
      name: names[count - 20],
      lesson: null,
      difficulty: d,
      order: levels.length,
    });
    levels.push(l);
    review.push({
      id: l.id,
      mode: 'turn',
      tier,
      n,
      method: d.method,
      score: d.score,
    });
    count++;
    console.log(l.id, tier, d.method, d.score);
  }
  assert.equal(count, 30);
}
const recent = slides.map(
  (l) =>
    l.mode +
    ':' +
    l.initial.positions.map((id) => (id === null ? 0 : l.pieces[id])).join(','),
);
for (const mode of ['slide', 'rotate'])
  for (const tier of tiers) {
    for (
      let count = slides.filter(
        (l) => l.mode === mode && l.tier === tier,
      ).length;
      count < 30;
      count++
    ) {
      const l = generateSliding({
        mode,
        tier,
        seed:
          2300000 +
          (mode === 'rotate' ? 100000 : 0) +
          tiers.indexOf(tier) * 10000 +
          count * 13,
        exclude: recent,
      });
      assert(l);
      l.id = `${mode}-catalog-${tiers.indexOf(tier) + 1}-${String(count + 1).padStart(2, '0')}`;
      l.name = names[count - 20];
      l.witness = solutionPlan(l, freshSliding(l));
      let s = freshSliding(l);
      for (const a of l.witness) {
        if (slidingStatus(l, s).solved) break;
        const next = slideAct(l, s, a);
        assert.notEqual(next, s);
        s = next;
      }
      assert(slidingStatus(l, s).solved);
      recent.push(l.fingerprint);
      slides.push(l);
      review.push({ id: l.id, mode, tier, minSlides: l.minSlides });
      console.log(l.id, tier, l.minSlides);
    }
  }
assert.equal(JSON.stringify(levels.slice(0, 60)), original);
assert.equal(JSON.stringify(slides.slice(0, 120)), originalSlides);
assert.equal(levels.length, 90);
assert.equal(slides.length, 180);
writeFileSync('lib/levels.json', JSON.stringify(levels));
writeFileSync(
  'lib/sliding-levels.json',
  JSON.stringify(slides, null, 2) + '\n',
);
writeFileSync(
  'docs/catalog-expansion-review.json',
  JSON.stringify(review, null, 2) + '\n',
);
console.log(
  'PASS: 90 puzzles per mode, 30 per tier. All previous boards, IDs and indices unchanged.',
);

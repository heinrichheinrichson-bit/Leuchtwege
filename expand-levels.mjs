import { readFileSync, writeFileSync } from 'node:fs';
import { neighbor, rotate, evaluate, solutions } from './lib/game.mjs';
import { difficulty } from './lib/difficulty.mjs';
// Keep the original twelve puzzles and their indices stable for saved games.
const original = JSON.parse(readFileSync('lib/levels.json', 'utf8')).slice(
  0,
  12,
);
const pools = { Leicht: [], Mittel: [], Schwer: [] };
for (let seed = 100; seed < 3500; seed++) {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const n = 4 + (seed % 3),
    b = Array(n * n).fill(0),
    seen = new Set([0]);
  while (seen.size < b.length) {
    const edges = [];
    for (const i of seen)
      if (b[i].toString(2).replaceAll('0', '').length < 3)
        for (let d = 0; d < 4; d++) {
          const j = neighbor(i, d, n);
          if (j >= 0 && !seen.has(j)) edges.push([i, d, j]);
        }
    if (!edges.length) break;
    const [i, d, j] = edges[Math.floor(random() * edges.length)];
    b[i] |= 1 << d;
    b[j] |= 1 << ((d + 2) % 4);
    seen.add(j);
  }
  if (seen.size < b.length) continue;
  const l = {
    n,
    source: Math.floor((n * n) / 2),
    solution: b,
    initial: b.map((m) => {
      for (let k = Math.floor(random() * 4); k > 0; k--) m = rotate(m);
      return m;
    }),
    name: '',
  };
  if (evaluate(l.initial, n, l.source).solved) continue;
  const stats = difficulty(l);
  if (pools[stats.tier].length >= 3) continue;
  if (solutions(l.initial, n, l.source).length !== 1) continue;
  pools[stats.tier].push({ ...l, difficulty: stats });
  if (Object.values(pools).every((a) => a.length === 3)) break;
}
const extra = Object.entries(pools).flatMap(([tier, ls]) =>
  ls.map((l, i) => ({ ...l, name: tier + ' · ' + (i + 1) })),
);
const levels = [
  ...original.map((l) => ({ ...l, difficulty: difficulty(l) })),
  ...extra,
];
for (const l of levels)
  if (solutions(l.initial, l.n, l.source).length !== 1)
    throw Error('Non-unique puzzle');
writeFileSync('lib/levels.json', JSON.stringify(levels));
console.log(
  JSON.stringify({
    total: levels.length,
    pools: Object.fromEntries(
      Object.entries(pools).map(([k, v]) => [k, v.map((l) => l.difficulty)]),
    ),
  }),
);

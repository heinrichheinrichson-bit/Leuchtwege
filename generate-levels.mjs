import { rotate, neighbor, evaluate, solutions } from './lib/game.mjs';
import { writeFileSync,existsSync,readFileSync } from 'node:fs';
if(existsSync('lib/levels.json')&&JSON.parse(readFileSync('lib/levels.json','utf8')).length>12){
 throw Error('Published catalog detected. Use node curate-levels.mjs; existing puzzles must not be overwritten.');
}
import assert from 'node:assert/strict';
const levels = [];
const names = [
  'Erster Funke',
  'Um die Ecke',
  'Lichtblick',
  'Neue Wege',
  'Verzweigt',
  'Im Gleichgewicht',
  'Lichterkette',
  'Zusammenspiel',
  'Weit verzweigt',
  'Lichtgarten',
  'Sternennetz',
  'Alles verbunden',
];
for (let seed = 1; levels.length < 12 && seed < 10000; seed++) {
  let state = seed;
  const rnd = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const n = levels.length < 3 ? 3 : levels.length < 8 ? 4 : 5;
  const b = Array(n * n).fill(0),
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
    const [i, d, j] = edges[Math.floor(rnd() * edges.length)];
    b[i] |= 1 << d;
    b[j] |= 1 << ((d + 2) % 4);
    seen.add(j);
  }
  if (seen.size < b.length) continue;
  const source = Math.floor((n * n) / 2);
  if (solutions(b, n, source).length !== 1) continue;
  const initial = b.map((m) => {
    for (let k = Math.floor(rnd() * 3) + 1; k > 0; k--) m = rotate(m);
    return m;
  });
  if (evaluate(initial, n, source).solved) continue;
  levels.push({ n, source, solution: b, initial, name: names[levels.length] });
}
assert.equal(levels.length, 12);
for (const l of levels) {
  assert(evaluate(l.solution, l.n, l.source).solved);
  assert(!evaluate(l.initial, l.n, l.source).solved);
  assert.equal(solutions(l.initial, l.n, l.source).length, 1);
  for (const m of l.initial) assert.equal(rotate(rotate(rotate(rotate(m)))), m);
}
assert.equal(evaluate([1], 1, 0).solved, false);
assert.equal(evaluate([2, 8, 2, 8], 2, 0).solved, false);
writeFileSync('lib/levels.json', JSON.stringify(levels));
console.log(
  '12 levels verified: unique connected solution, unsolved start; rotation, boundary and disconnected-network checks passed.',
);

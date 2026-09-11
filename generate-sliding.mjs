import { writeFileSync, existsSync } from 'node:fs';
import { neighbor, rotate } from './lib/game.mjs';
import { slidingStatus, adjacent } from './lib/sliding.mjs';
if (existsSync('lib/sliding-levels.json'))
  throw Error('Do not replace published sliding puzzles');
const catalog = [];
for (const mode of ['slide', 'rotate'])
  for (let number = 0; number < 3; number++) {
    for (let seed = 413 + number * 1000; ; seed++) {
      let state = seed;
      const rand = (n) => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return Math.floor((state / 4294967296) * n);
      };
      const n = 3,
        hole = rand(9),
        board = Array(9).fill(0),
        seen = new Set([hole === 0 ? 1 : 0]);
      while (seen.size < 8) {
        const edges = [];
        for (const i of seen)
          for (let d = 0; d < 4; d++) {
            const j = neighbor(i, d, n);
            if (j >= 0 && j !== hole && !seen.has(j)) edges.push([i, d, j]);
          }
        const [i, d, j] = edges[rand(edges.length)];
        board[i] |= 1 << d;
        board[j] |= 1 << ((d + 2) % 4);
        seen.add(j);
      }
      const pieces = board.filter((m) => m !== 0),
        positions = board.map((m, i) =>
          m === 0 ? null : i - (i > hole ? 1 : 0),
        );
      const solution = { positions: [...positions], turns: Array(8).fill(0) };
      const l = {
        id: `${mode}-${number + 1}`,
        mode,
        n,
        name: ['Erste Schritte', 'Wechselwege', 'Lückenspiel'][number],
        pieces,
        sourceId: rand(8),
        solution,
      };
      const s = { positions: [...positions], turns: Array(8).fill(0) };
      const reverse = [];
      let previous = -1;
      for (let step = 0; step < [8, 14, 22][number]; step++) {
        const at = s.positions.indexOf(null),
          options = s.positions
            .map((id, i) => i)
            .filter((i) => i !== previous && adjacent(i, at, n));
        const from = options[rand(options.length)],
          id = s.positions[from];
        [s.positions[at], s.positions[from]] = [s.positions[from], null];
        previous = at;
        reverse.unshift({ type: 'slide', id });
      }
      if (mode === 'rotate')
        for (let id = 0; id < 8; id++) {
          const turns = rand(4);
          s.turns[id] = turns;
          for (let k = 0; k < (4 - turns) % 4; k++)
            reverse.unshift({ type: 'turn', id });
        }
      if (slidingStatus(l, s).solved) continue;
      // Ensure the combined mode really needs repositioning: rotation alone cannot solve it.
      if (mode === 'rotate' && rotationsSolve(l, s)) continue;
      l.initial = s;
      l.witness = reverse;
      l.seed = seed;
      catalog.push(l);
      break;
    }
  }
function rotationsSolve(l, s) {
  const placed = Array(9).fill(0);
  function dfs(i) {
    if (i === 9) {
      const turns = s.positions.filter((id) => id !== null).map(() => 0);
      const pieces = [...l.pieces];
      s.positions.forEach((id, pos) => {
        if (id !== null) pieces[id] = placed[pos];
      });
      return slidingStatus({ ...l, pieces }, { positions: s.positions, turns })
        .solved;
    }
    const id = s.positions[i],
      masks = new Set();
    let m = id === null ? 0 : l.pieces[id];
    for (let k = 0; k < 4; k++, m = rotate(m)) masks.add(m);
    for (const mask of masks) {
      if ([0, 1, 2, 3].some((d) => neighbor(i, d, 3) < 0 && mask & (1 << d)))
        continue;
      if (i >= 3 && Boolean(mask & 1) !== Boolean(placed[i - 3] & 4)) continue;
      if (i % 3 && Boolean(mask & 8) !== Boolean(placed[i - 1] & 2)) continue;
      placed[i] = mask;
      if (dfs(i + 1)) return true;
    }
    return false;
  }
  return dfs(0);
}
writeFileSync(
  'lib/sliding-levels.json',
  JSON.stringify(catalog, null, 2) + '\n',
);
console.log(
  'Created six reachable 3×3 puzzles. Combined puzzles require sliding.',
);

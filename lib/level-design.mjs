import { rotate, neighbor, evaluate } from './game.mjs';
export function makeLevel(n, seed) {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
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
    if (!edges.length) return null;
    const [i, d, j] = edges[Math.floor(random() * edges.length)];
    b[i] |= 1 << d;
    b[j] |= 1 << ((d + 2) % 4);
    seen.add(j);
  }
  const l = {
    n,
    source: Math.floor((n * n) / 2),
    solution: b,
    initial: b.map((m) => {
      for (let k = Math.floor(random() * 4); k > 0; k--) m = rotate(m);
      return m;
    }),
    seed,
  };
  return evaluate(l.initial, n, l.source).solved ? null : l;
}
export function variants(board, n) {
  const out = [];
  let b = board.slice();
  for (let k = 0; k < 4; k++) {
    out.push(b);
    const reflected = Array(b.length);
    b.forEach((m, i) => {
      const x = i % n,
        y = Math.floor(i / n);
      reflected[y * n + n - 1 - x] = (m & 5) | ((m & 2) << 2) | ((m & 8) >> 2);
    });
    out.push(reflected);
    const next = Array(b.length);
    b.forEach((m, i) => {
      const x = i % n,
        y = Math.floor(i / n);
      next[x * n + n - 1 - y] = rotate(m);
    });
    b = next;
  }
  return out;
}
export const topologyKey = (l) =>
  l.n +
  ':' +
  variants(l.solution, l.n)
    .map((b) => b.join(','))
    .sort()[0];
const pieceType = (m) => {
  const bits = m.toString(2).replaceAll('0', '').length;
  return bits === 2
    ? m === 5 || m === 10
      ? 'straight'
      : 'corner'
    : String(bits);
};
export function similarity(a, b) {
  if (a.n !== b.n) return 0;
  const aa = a.solution.map(pieceType);
  return Math.max(
    ...variants(b.solution, b.n).map(
      (bb) => bb.filter((m, i) => pieceType(m) === aa[i]).length / aa.length,
    ),
  );
}
export function applyOverride(l, automatic, overrides) {
  const value = overrides[l.id];
  if (!value) return automatic;
  if (
    !['Leicht', 'Mittel', 'Schwer'].includes(value.tier) ||
    typeof value.reason !== 'string' ||
    !value.reason.trim()
  )
    throw Error('Invalid difficulty override: ' + l.id);
  return {
    ...automatic,
    automaticTier: automatic.tier,
    tier: value.tier,
    overrideReason: value.reason,
  };
}

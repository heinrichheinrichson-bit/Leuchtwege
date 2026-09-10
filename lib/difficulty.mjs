import { rotate, neighbor } from './game.mjs';
// Synchronous propagation makes the wave count independent of cell traversal order.
export function difficulty(l) {
  let ds = l.initial.map((m, i) => {
    const a = [];
    for (let k = 0; k < 4; k++, m = rotate(m))
      if (
        !a.includes(m) &&
        [0, 1, 2, 3].every((d) => neighbor(i, d, l.n) >= 0 || !(m & (1 << d)))
      )
        a.push(m);
    return a;
  });
  const starts = ds.filter((a) => a.length === 1).length;
  let waves = 0;
  for (;;) {
    const next = ds.map((a, i) =>
      a.filter((m) =>
        [0, 1, 2, 3].every((d) => {
          const j = neighbor(i, d, l.n);
          return (
            j < 0 ||
            ds[j].some((v) => !!(m & (1 << d)) === !!(v & (1 << ((d + 2) % 4))))
          );
        }),
      ),
    );
    if (next.some((a) => !a.length)) throw Error('Contradictory puzzle');
    if (next.every((a, i) => a.length === ds[i].length)) break;
    ds = next;
    waves++;
  }
  const unresolved = ds.filter((a) => a.length > 1).length;
  const score = waves + unresolved * 3 + (1 - starts / ds.length) * 3;
  return {
    starts,
    waves,
    unresolved,
    score: Number(score.toFixed(2)),
    tier: unresolved ? 'Schwer' : score >= 10 ? 'Mittel' : 'Leicht',
  };
}

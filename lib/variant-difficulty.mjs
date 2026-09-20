import { rotate, neighbor } from './game.mjs';

// Explainable constraint analysis, independent of the scramble and target solution.
// Optional dark cells are explicit states for Light Path; linked tiles form ONE
// variable. Thus the same size can have very different deduction depth/ambiguity.
export function analyzeVariant(l) {
  const groupOf = Array(l.n * l.n),
    offset = [];
  l.groups.forEach((g, k) =>
    g.forEach((i, j) => {
      groupOf[i] = k;
      offset[i] = j;
    }),
  );
  const required = new Set(
    l.mode === 'path'
      ? [l.source, ...l.targets]
      : Array.from({ length: l.n * l.n }, (_, i) => i),
  );
  const candidates = l.groups.map((g) => {
    const list = [],
      seen = new Set();
    let masks = g.map((i) => l.initial[i]);
    for (let k = 0; k < 4; k++) {
      const key = masks.join(',');
      if (!seen.has(key)) {
        list.push([...masks]);
        seen.add(key);
      }
      masks = masks.map(rotate);
    }
    if (l.mode === 'path' && !g.some((i) => required.has(i)))
      list.push(g.map(() => 0));
    return list
      .filter((ms) =>
        g.every((i, j) =>
          [0, 1, 2, 3].every((d) => {
            const next = neighbor(i, d, l.n),
              on = !!(ms[j] & (1 << d));
            if (
              next < 0 ||
              (l.mode === 'dual' && l.owners[i] !== l.owners[next])
            )
              return !on;
            if (groupOf[next] === groupOf[i])
              return on === !!(ms[offset[next]] & (1 << ((d + 2) % 4)));
            return true;
          }),
        ),
      )
      .sort((a, b) => a.join(',').localeCompare(b.join(',')));
  });
  const edges = new Map();
  for (let i = 0; i < groupOf.length; i++)
    for (const d of [1, 2]) {
      const j = neighbor(i, d, l.n);
      if (j < 0 || groupOf[i] === groupOf[j]) continue;
      const a = groupOf[i],
        b = groupOf[j],
        key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (!edges.has(key)) edges.set(key, []);
      edges.get(key).push({ i, j, d, a, b });
    }
  const supports = candidates.map(() => []);
  for (const connections of edges.values()) {
    const a = connections[0].a,
      b = connections[0].b;
    const ok = (x, y) =>
      connections.every((e) => {
        const m = e.a === a ? x[offset[e.i]] : y[offset[e.i]],
          v = e.b === b ? y[offset[e.j]] : x[offset[e.j]];
        return !!(m & (1 << e.d)) === !!(v & (1 << ((e.d + 2) % 4)));
      });
    supports[a].push({
      other: b,
      allowed: candidates[a].map((x) =>
        candidates[b].map((y, j) => (ok(x, y) ? j : -1)).filter((j) => j >= 0),
      ),
    });
    supports[b].push({
      other: a,
      allowed: candidates[b].map((y) =>
        candidates[a].map((x, j) => (ok(x, y) ? j : -1)).filter((j) => j >= 0),
      ),
    });
  }
  let domains = candidates.map((cs) => cs.map((_, i) => i)),
    waves = 0;
  const revealed = domains.map((ds) => (ds.length === 1 ? 0 : null));
  for (;;) {
    let next = domains.map((ds, g) =>
      ds.filter((i) =>
        supports[g].every((s) =>
          s.allowed[i].some((j) => domains[s.other].includes(j)),
        ),
      ),
    );
    // A tile that can never reach its source can only remain dark. This avoids
    // counting irrelevant filler orientations as meaningful puzzle complexity.
    const masks = candidates.map((cs, g) =>
      l.groups[g].map((_, k) => next[g].reduce((m, i) => m | cs[i][k], 0)),
    );
    const reach = new Set([l.source]),
      queue = [l.source];
    if (l.mode === 'path') {
      for (const i of queue)
        for (let d = 0; d < 4; d++) {
          const j = neighbor(i, d, l.n);
          if (j < 0 || reach.has(j)) continue;
          if (
            masks[groupOf[i]][offset[i]] & (1 << d) &&
            masks[groupOf[j]][offset[j]] & (1 << ((d + 2) % 4))
          ) {
            reach.add(j);
            queue.push(j);
          }
        }
      next = next.map((ds, g) =>
        l.groups[g].some((i) => !reach.has(i))
          ? ds.filter((k) => candidates[g][k].every((m) => m === 0))
          : ds,
      );
    }
    if (next.some((ds) => !ds.length))
      throw Error('Contradictory variant constraints');
    if (next.every((ds, i) => ds.length === domains[i].length)) {
      domains = next;
      break;
    }
    waves++;
    next.forEach((ds, i) => {
      if (ds.length === 1 && revealed[i] === null) revealed[i] = waves;
    });
    domains = next;
  }
  const entropy = domains.reduce((n, ds) => n + Math.log2(ds.length), 0);
  const depth =
    revealed.reduce((n, v) => n + (v || 0), 0) / Math.max(1, domains.length);
  const uncertain = domains.filter((ds) => ds.length > 1).length;
  const coupling =
    l.mode === 'linked'
      ? l.groups.reduce(
          (n, g) =>
            n +
            (g.length < 2
              ? 0
              : Math.abs((g[0] % l.n) - (g[1] % l.n)) +
                Math.abs(Math.floor(g[0] / l.n) - Math.floor(g[1] / l.n)) -
                1),
          0,
        ) / l.groups.length
      : 0;
  const score = Number(
    (waves * 2 + depth * 3 + entropy * 4 + coupling * 2).toFixed(3),
  );
  return {
    version: 1,
    score,
    waves,
    uncertain,
    entropy: Number(entropy.toFixed(3)),
    depth: Number(depth.toFixed(3)),
    coupling: Number(coupling.toFixed(3)),
  };
}

export const variantTiers = ['Leicht', 'Mittel', 'Schwer'];
// Calibrated against candidate pools independently for each rule set.
export const variantThresholds = {
  dual: [2.9, 5.5],
  path: [30, 80],
  linked: [4.5, 8.5],
};
export function variantDifficulty(l) {
  const report = analyzeVariant(l),
    [easy, medium] = variantThresholds[l.mode];
  return {
    ...report,
    tier:
      report.score < easy
        ? 'Leicht'
        : report.score < medium
          ? 'Mittel'
          : 'Schwer',
  };
}

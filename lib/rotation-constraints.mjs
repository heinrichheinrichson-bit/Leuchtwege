import { rotate, neighbor, evaluate } from './game.mjs';

// Explainable constraint analysis, independent of the scramble and target solution.
// Optional dark cells are explicit states for Light Path; linked tiles form ONE
// variable. Thus the same size can have very different deduction depth/ambiguity.
export function rotationConstraints(l) {
  l = {
    ...l,
    mode: l.variant || l.mode || 'turn',
    groups: l.groups || l.initial.map((_, i) => [i]),
  };
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
      : Array.from({ length: l.n * l.n }, (_, i) => i).filter(
          (i) => l.initial[i] !== 0,
        ),
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

  const initial = candidates.map((cs) => cs.map((_, i) => i));
  function propagate(input, maxWaves = Infinity) {
    let domains = input.map((ds) => [...ds]),
      waves = 0;
    for (;;) {
      if (domains.some((ds) => !ds.length))
        return { domains, waves, contradiction: true };
      let next = domains.map((ds, g) =>
        ds.filter((i) =>
          supports[g].every((s) =>
            s.allowed[i].some((j) => domains[s.other].includes(j)),
          ),
        ),
      );
      if (next.some((ds) => !ds.length))
        return { domains: next, waves: waves + 1, contradiction: true };
      const masks = candidates.map((cs, g) =>
        l.groups[g].map((_, k) => next[g].reduce((m, i) => m | cs[i][k], 0)),
      );
      const sources = l.mode === 'dual' ? l.sources : [l.source];
      for (let owner = 0; owner < sources.length; owner++) {
        const reach = new Set([sources[owner]]),
          queue = [sources[owner]];
        for (const i of queue)
          for (let d = 0; d < 4; d++) {
            const j = neighbor(i, d, l.n);
            if (
              j < 0 ||
              reach.has(j) ||
              (l.mode === 'dual' && l.owners[j] !== owner)
            )
              continue;
            if (
              masks[groupOf[i]][offset[i]] & (1 << d) &&
              masks[groupOf[j]][offset[j]] & (1 << ((d + 2) % 4))
            ) {
              reach.add(j);
              queue.push(j);
            }
          }
        if (
          [...required].some(
            (i) =>
              (l.mode !== 'dual' || l.owners[i] === owner) && !reach.has(i),
          )
        )
          return { domains: next, waves: waves + 1, contradiction: true };
        if (l.mode === 'path')
          next = next.map((ds, g) =>
            l.groups[g].some((i) => !reach.has(i))
              ? ds.filter((k) => candidates[g][k].every((m) => m === 0))
              : ds,
          );
      }
      if (next.some((ds) => !ds.length))
        return { domains: next, waves: waves + 1, contradiction: true };
      if (next.every((ds, i) => ds.length === domains[i].length))
        return { domains: next, waves, contradiction: false };
      domains = next;
      waves++;
      if (waves >= maxWaves) return { domains, waves, contradiction: false };
    }
  }
  function board(domains) {
    const out = [...l.initial];
    l.groups.forEach((g, k) =>
      g.forEach((i, j) => {
        const m = candidates[k][domains[k][0]][j];
        if (m) out[i] = m;
      }),
    );
    return out;
  }
  function solved(domains) {
    const b = board(domains),
      a = evaluate(b, l.n, l.source);
    if (l.mode === 'dual')
      return (
        !a.open &&
        l.sources.every((s, k) => {
          const lit = evaluate(b, l.n, s).lit;
          return (
            [...lit].every((i) => l.owners[i] === k) &&
            l.owners.every((v, i) => v !== k || lit.has(i))
          );
        })
      );
    if (l.mode === 'path')
      return (
        l.targets.every((i) => a.lit.has(i)) &&
        [...a.lit].every((i) =>
          [0, 1, 2, 3].every((d) => {
            if (!(b[i] & (1 << d))) return true;
            const j = neighbor(i, d, l.n);
            return j >= 0 && !!(b[j] & (1 << ((d + 2) % 4)));
          }),
        )
      );
    return a.open === 0 && a.lit.size === l.initial.filter(Boolean).length;
  }
  const costs = candidates.map((cs, g) =>
    cs.map((ms) => {
      if (ms.every((m) => !m)) return 0;
      let masks = l.groups[g].map((i) => l.initial[i]);
      for (let k = 0; k < 4; k++, masks = masks.map(rotate))
        if (masks.every((m, j) => m === ms[j])) return k;
      throw Error('Invalid orientation');
    }),
  );
  return { l, candidates, initial, costs, propagate, solved, board };
}

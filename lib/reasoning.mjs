import { rotate, neighbor } from './game.mjs';
const clone = (ds) => ds.map((a) => a.slice());
export function orientations(l) {
  return l.initial.map((m, i) => {
    const a = [];
    for (let k = 0; k < 4; k++, m = rotate(m))
      if (
        !a.includes(m) &&
        [0, 1, 2, 3].every((d) => neighbor(i, d, l.n) >= 0 || !(m & (1 << d)))
      )
        a.push(m);
    return a;
  });
}
export function localReasoning(input, n) {
  let ds = clone(input),
    waves = 0;
  const revealed = ds.map((a) => (a.length === 1 ? 0 : null));
  for (;;) {
    if (ds.some((a) => !a.length))
      return { valid: false, domains: ds, waves, revealed };
    const next = ds.map((a, i) =>
      a.filter((m) =>
        [0, 1, 2, 3].every((d) => {
          const j = neighbor(i, d, n);
          return (
            j < 0 ||
            ds[j].some((v) => !!(m & (1 << d)) === !!(v & (1 << ((d + 2) % 4))))
          );
        }),
      ),
    );
    if (next.every((a, i) => a.length === ds[i].length))
      return { valid: true, domains: ds, waves, revealed };
    waves++;
    next.forEach((a, i) => {
      if (a.length === 1 && revealed[i] === null) revealed[i] = waves;
    });
    ds = next;
  }
}
// Every bridge in the graph of possible connections must occur in a connected solution.
// This uses the game's connectivity rule, not the generator's tree structure.
export function networkReasoning(input, n, source) {
  let ds = clone(input),
    bridgeDeductions = 0,
    cycles = 0;
  for (;;) {
    const local = localReasoning(ds, n);
    if (!local.valid) return { ...local, bridgeDeductions, cycles };
    ds = local.domains;
    const adj = ds.map(() => []),
      edges = [];
    for (let i = 0; i < ds.length; i++)
      for (const d of [1, 2]) {
        const j = neighbor(i, d, n);
        if (
          j >= 0 &&
          ds[i].some((m) => m & (1 << d)) &&
          ds[j].some((m) => m & (1 << ((d + 2) % 4)))
        ) {
          const k = edges.length;
          edges.push({ i, j, d });
          adj[i].push([j, k]);
          adj[j].push([i, k]);
        }
      }
    const tin = ds.map(() => -1),
      low = ds.map(() => -1),
      bridges = [];
    let timer = 0;
    function visit(v, parentEdge) {
      tin[v] = low[v] = timer++;
      for (const [to, e] of adj[v]) {
        if (e === parentEdge) continue;
        if (tin[to] >= 0) low[v] = Math.min(low[v], tin[to]);
        else {
          visit(to, e);
          low[v] = Math.min(low[v], low[to]);
          if (low[to] > tin[v]) bridges.push(e);
        }
      }
    }
    visit(source, -1);
    if (tin.some((v) => v < 0))
      return { valid: false, domains: ds, bridgeDeductions, cycles };
    let changed = false;
    for (const k of bridges) {
      const { i, j, d } = edges[k];
      for (const [cell, dir] of [
        [i, d],
        [j, (d + 2) % 4],
      ]) {
        const next = ds[cell].filter((m) => m & (1 << dir));
        if (next.length !== ds[cell].length) {
          bridgeDeductions++;
          changed = true;
          ds[cell] = next;
        }
      }
    }
    if (!changed) return { valid: true, domains: ds, bridgeDeductions, cycles };
    cycles++;
  }
}
export function analyzeReasoning(l, { probe = true } = {}) {
  const ds = orientations(l),
    starts = ds.filter((a) => a.length === 1).length,
    local = localReasoning(ds, l.n);
  if (!local.valid) throw Error('Inconsistent puzzle');
  const unresolved = local.domains.filter((a) => a.length > 1).length;
  const known = local.revealed.filter((v) => v !== null);
  const averageDepth =
    known.reduce((a, b) => a + b, 0) / Math.max(1, known.length);
  let network = networkReasoning(local.domains, l.n, l.source),
    probes = 0,
    contradictions = 0,
    probeRounds = 0;
  if (!network.valid) throw Error('Disconnected puzzle');
  const afterNetwork = network.domains.filter((a) => a.length > 1).length;
  let current = network.domains;
  if (probe)
    for (
      let round = 0;
      round < l.n * l.n && current.some((a) => a.length > 1);
      round++
    ) {
      let changed = false;
      const next = clone(current);
      for (let i = 0; i < current.length; i++)
        if (current[i].length > 1)
          for (const m of current[i]) {
            probes++;
            const attempt = clone(current);
            attempt[i] = [m];
            if (!networkReasoning(attempt, l.n, l.source).valid) {
              next[i] = next[i].filter((v) => v !== m);
              contradictions++;
              changed = true;
            }
          }
      if (!changed) break;
      probeRounds++;
      network = networkReasoning(next, l.n, l.source);
      if (!network.valid) throw Error('Invalid deduction');
      current = network.domains;
    }
  const remaining = current.filter((a) => a.length > 1).length;
  const method =
    unresolved === 0
      ? 'local'
      : afterNetwork === 0
        ? 'network'
        : remaining === 0
          ? 'lookahead'
          : 'search';
  const localScore =
    averageDepth * 2 +
    Math.log2(1 + local.waves) * 0.75 +
    (1 - starts / ds.length);
  const score =
    method === 'local'
      ? localScore
      : method === 'network'
        ? 10 + Math.min(4, afterNetwork + (unresolved / ds.length) * 4)
        : method === 'lookahead'
          ? 16 + probeRounds * 2 + Math.min(4, (contradictions / ds.length) * 4)
          : 24 + (remaining / ds.length) * 4;
  const tier =
    method === 'local' && score < 5.5
      ? 'Leicht'
      : method === 'local' || method === 'network'
        ? 'Mittel'
        : 'Schwer';
  return {
    version: 2,
    starts,
    waves: local.waves,
    averageDepth: Number(averageDepth.toFixed(2)),
    unresolved,
    afterNetwork,
    remaining,
    probes,
    contradictions,
    probeRounds,
    method,
    score: Number(score.toFixed(2)),
    tier,
  };
}

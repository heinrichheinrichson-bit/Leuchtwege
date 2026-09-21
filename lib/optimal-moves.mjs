import { rotationConstraints } from './rotation-constraints.mjs';
import { rotate, evaluate, neighbor } from './game.mjs';
import { slidingBoard, freshSliding } from './sliding.mjs';
// A budget expiry is UNKNOWN, never proof of optimality. All valid final networks
// count; the generator's reference solution is not assumed to be the only goal.
export function proveOptimal(
  l,
  moves,
  { maxNodes = 200000, budgetMs = 3000 } = {},
) {
  if (!Number.isSafeInteger(moves) || moves < 0)
    throw Error('Invalid move count');
  const start = performance.now();
  let nodes = 0,
    exhausted = false;
  const limit = () => {
    nodes++;
    if (nodes > maxNodes || performance.now() - start > budgetMs) {
      exhausted = true;
      return true;
    }
    return false;
  };
  if (l.pieces) {
    const s = freshSliding(l),
      b = slidingBoard(l, s),
      source = s.positions.indexOf(l.sourceId);
    const encode = (b, source) =>
      b.map((x) => x.toString(16)).join('') + source.toString(16);
    const queue = [{ b, source, cost: 0 }],
      seen = new Set([encode(b, source)]);
    let best = Infinity;
    for (let head = 0; head < queue.length; head++) {
      if (limit()) break;
      const { b, source, cost } = queue[head],
        status = evaluate(b, l.n, source);
      if (cost >= best)
        return {
          proven: true,
          minimumMoves: best,
          optimal: best === moves,
          nodes,
        };
      if (l.mode === 'rotate') {
        const c = rotationConstraints({
          n: l.n,
          initial: b,
          source,
          mode: 'turn',
        });
        function orient(input) {
          if (exhausted || limit()) return;
          const r = c.propagate(input);
          if (r.contradiction) return;
          const ds = r.domains,
            lower = ds.reduce(
              (n, v, g) => n + Math.min(...v.map((k) => c.costs[g][k])),
              cost,
            );
          if (lower >= best) return;
          let at = ds.findIndex((v) => v.length > 1);
          if (at < 0) {
            if (c.solved(ds)) best = lower;
            return;
          }
          for (const value of [...ds[at]].sort(
            (a, b) => c.costs[at][a] - c.costs[at][b],
          )) {
            const next = ds.map((v) => [...v]);
            next[at] = [value];
            orient(next);
          }
        }
        orient(c.initial);
        if (exhausted) break;
      }
      if (!status.open && status.lit.size === l.pieces.length)
        return {
          proven: true,
          minimumMoves: cost,
          optimal: cost === moves,
          nodes,
        };
      if (cost >= Math.min(moves, best)) continue;
      const hole = b.indexOf(0);
      const add = (next, src) => {
        const key = encode(next, src);
        if (!seen.has(key)) {
          seen.add(key);
          queue.push({ b: next, source: src, cost: cost + 1 });
        }
      };
      for (let d = 0; d < 4; d++) {
        const i = neighbor(hole, d, l.n);
        if (i < 0) continue;
        const next = [...b];
        [next[i], next[hole]] = [next[hole], next[i]];
        add(next, source === i ? hole : source);
      }
      // Rotations commute with slides. At each reachable arrangement solve all
      // orientations exactly; BFS supplies the shortest sliding distance.
      // Bound frontier memory as well as expanded nodes.
      if (queue.length > maxNodes * 3) {
        exhausted = true;
        break;
      }
    }
    return {
      proven: !exhausted && Number.isFinite(best) && best <= moves,
      minimumMoves:
        !exhausted && Number.isFinite(best) && best <= moves ? best : null,
      optimal: !exhausted && best === moves,
      nodes,
    };
  }
  const c = rotationConstraints(l);
  let best = Infinity;
  function search(input) {
    if (exhausted || limit()) return;
    const r = c.propagate(input);
    if (r.contradiction) return;
    const ds = r.domains,
      lower = ds.reduce(
        (sum, v, g) => sum + Math.min(...v.map((k) => c.costs[g][k])),
        0,
      );
    if (lower >= best) return;
    let g = -1;
    ds.forEach((v, i) => {
      if (v.length > 1 && (g < 0 || v.length < ds[g].length)) g = i;
    });
    if (g < 0) {
      if (c.solved(ds)) best = lower;
      return;
    }
    for (const value of [...ds[g]].sort(
      (a, b) => c.costs[g][a] - c.costs[g][b],
    )) {
      const next = ds.map((v) => [...v]);
      next[g] = [value];
      search(next);
      if (exhausted) return;
    }
  }
  search(c.initial);
  return {
    proven: !exhausted && Number.isFinite(best) && best <= moves,
    minimumMoves:
      !exhausted && Number.isFinite(best) && best <= moves ? best : null,
    optimal: !exhausted && best === moves,
    nodes,
  };
}

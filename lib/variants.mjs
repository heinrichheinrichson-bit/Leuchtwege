import { rotate, neighbor, evaluate } from './game.mjs';
import { fresh, boardOf } from './session.mjs';

export const variantModes = ['dual', 'path', 'linked'];
export const variantNames = {
  dual: 'Zwei Stromkreise',
  path: 'Lichtweg',
  linked: 'Gekoppelte Drehungen',
};
export const variantRules = {
  dual: 'Verbinde jede A-Kachel mit Quelle A und jede B-Kachel mit Quelle B. Die Netze dürfen sich nicht berühren. Kein Anschluss darf offen bleiben.',
  path: 'Verbinde die Quelle mit allen Sternen. Nur das leuchtende Netz muss ohne offene Anschlüsse sein. Übrige Kacheln dürfen dunkel bleiben.',
  linked:
    'Kacheln mit derselben Zahl drehen sich gemeinsam. Verbinde das ganze Netz ohne offene Anschlüsse. Antippen dreht beide Kacheln um 90 Grad.',
};
const spin = (mask, times) => {
  for (let i = 0; i < times % 4; i++) mask = rotate(mask);
  return mask;
};
function rng(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function variantPuzzle(
  mode,
  seed,
  n = 4,
  id = `variant-v1-${mode}-${n}-${seed}`,
) {
  if (
    !variantModes.includes(mode) ||
    ![3, 4].includes(n) ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  )
    throw Error('Ungültiges Rätsel');
  const random = rng(seed),
    size = n * n;
  const orientation = Math.floor(random() * 4);
  const order = Array.from({ length: size }, (_, i) => {
    let y = Math.floor(i / n),
      x = y % 2 ? n - 1 - (i % n) : i % n;
    for (let j = 0; j < orientation; j++) [x, y] = [n - 1 - y, x];
    return y * n + x;
  });
  const solution = Array(size).fill(0),
    owners = Array(size).fill(0),
    groups = [];
  const split = Math.floor(size / 2);
  if (mode === 'dual') for (const i of order.slice(split)) owners[i] = 1;
  const active =
    mode === 'path'
      ? order.slice(0, size - Math.max(2, Math.floor(size / 4)))
      : order;
  const regions =
    mode === 'dual' ? [order.slice(0, split), order.slice(split)] : [active];
  for (const cells of regions) {
    const allowed = new Set(cells),
      seen = new Set([cells[0]]),
      stack = [cells[0]];
    while (stack.length) {
      const at = stack.at(-1);
      const options = [0, 1, 2, 3]
        .map((d) => [d, neighbor(at, d, n)])
        .filter(([, j]) => allowed.has(j) && !seen.has(j));
      if (!options.length) {
        stack.pop();
        continue;
      }
      const [d, next] = options[Math.floor(random() * options.length)];
      solution[at] |= 1 << d;
      solution[next] |= 1 << ((d + 2) % 4);
      seen.add(next);
      stack.push(next);
    }
    if (seen.size !== cells.length) throw Error('Ungültiges Netz');
  }
  for (let i = 0; i < size; i++)
    if (!solution[i]) solution[i] = [3, 5, 7, 10, 12][Math.floor(random() * 5)];
  if (mode === 'linked')
    for (let i = 0; i < size; i += 2) groups.push(order.slice(i, i + 2));
  else for (let i = 0; i < size; i++) groups.push([i]);
  const puzzle = {
    id,
    variant: mode,
    mode,
    n,
    seed,
    name: variantNames[mode],
    tier: n === 3 ? 'Leicht' : 'Mittel',
    source: order[0],
    sources: regions.map((r) => r[0]),
    owners,
    groups,
    targets:
      mode === 'path'
        ? [active.at(-1), active[Math.floor(active.length / 2)]]
        : [],
    solution,
    initial: [...solution],
  };
  for (const group of groups) {
    const turns = Math.floor(random() * 4);
    for (const i of group) puzzle.initial[i] = spin(solution[i], turns);
  }
  // Stable unsolved start, even if a random scramble produced a valid alternative.
  if (variantStatus(puzzle, fresh(puzzle)).solved) {
    let changed = false;
    for (const group of groups) {
      const original = [...puzzle.initial];
      for (const i of group) puzzle.initial[i] = rotate(puzzle.initial[i]);
      if (!variantStatus(puzzle, fresh(puzzle)).solved) {
        changed = true;
        break;
      }
      puzzle.initial = original;
    }
    if (!changed) throw Error('Kein Start gefunden');
  }
  return puzzle;
}
export const variantCatalog = variantModes.flatMap((mode, m) =>
  Array.from({ length: 6 }, (_, i) =>
    variantPuzzle(
      mode,
      9350 + m * 300 + i * 17,
      i < 3 ? 3 : 4,
      `variant-v1-${mode}-catalog-${i + 1}`,
    ),
  ),
);
export function variantStatus(l, s) {
  const board = boardOf(l, s),
    a = { ...evaluate(board, l.n, l.source), wrong: new Set(), reached: 0 };
  if (l.variant === 'dual') {
    const nets = l.sources.map((source) => evaluate(board, l.n, source).lit);
    const lit = new Set(),
      wrong = new Set();
    board.forEach((_, i) => {
      if (nets[l.owners[i]].has(i)) lit.add(i);
      if (nets[1 - l.owners[i]].has(i)) wrong.add(i);
    });
    return {
      ...a,
      lit,
      wrong,
      nets,
      solved: lit.size === board.length && !wrong.size && a.open === 0,
    };
  }
  if (l.variant === 'path') {
    let open = 0;
    for (const i of a.lit)
      for (let d = 0; d < 4; d++)
        if (board[i] & (1 << d)) {
          const j = neighbor(i, d, l.n);
          if (j < 0 || !(board[j] & (1 << ((d + 2) % 4)))) open++;
        }
    const reached = l.targets.filter((i) => a.lit.has(i)).length;
    return {
      ...a,
      open,
      reached,
      solved: reached === l.targets.length && !open,
    };
  }
  return a;
}
export function variantAct(l, s, action) {
  if (action.type === 'reset') return fresh(l);
  if (action.type === 'undo')
    return s.history.length
      ? { ...s, ...s.history.at(-1), history: s.history.slice(0, -1) }
      : s;
  if (
    action.type !== 'turn' ||
    !Number.isInteger(action.index) ||
    !l.groups.some((g) => g.includes(action.index)) ||
    variantStatus(l, s).solved
  )
    return s;
  const group = l.groups.find((g) => g.includes(action.index));
  const { history, ...before } = s;
  return {
    ...s,
    turns: s.turns.map((v, i) => (group.includes(i) ? v + 1 : v)),
    moves: s.moves + 1,
    history: [...history, before].slice(-500),
  };
}
export function variantPlan(l, s) {
  if (variantStatus(l, s).solved) return [];
  const board = boardOf(l, s),
    actions = [];
  for (const group of l.groups) {
    const turns = [0, 1, 2, 3].find((k) =>
      group.every((i) => spin(board[i], k) === l.solution[i]),
    );
    if (turns === undefined) throw Error('Ungültige Kopplung');
    for (let k = 0; k < turns; k++)
      actions.push({ type: 'turn', index: group[0] });
  }
  let next = s;
  const verified = [];
  for (const action of actions) {
    next = variantAct(l, next, action);
    verified.push(action);
    if (variantStatus(l, next).solved) return verified;
  }
  throw Error('Kein Lösungsweg gefunden');
}
export const variantKey = 'leuchtwege-variants-v1';
export const emptyVariants = () => ({
  version: 1,
  mode: 'dual',
  sessions: {},
  free: {},
});
function validState(l, s) {
  const base = (v) =>
    v &&
    Array.isArray(v.turns) &&
    v.turns.length === l.n * l.n &&
    v.turns.every((x) => Number.isSafeInteger(x) && x >= 0) &&
    Array.isArray(v.locks) &&
    v.locks.length === v.turns.length &&
    v.locks.every((x) => x === false) &&
    Number.isSafeInteger(v.moves) &&
    v.moves >= 0 &&
    l.groups.every((g) => g.every((i) => v.turns[i] % 4 === v.turns[g[0]] % 4));
  return (
    base(s) &&
    Array.isArray(s.history) &&
    s.history.length <= 500 &&
    s.history.every(base)
  );
}
export function restoreVariants(raw) {
  const data = emptyVariants();
  if (raw?.version !== 1) return data;
  if (variantModes.includes(raw.mode)) data.mode = raw.mode;
  for (const l of variantCatalog)
    if (validState(l, raw.sessions?.[l.id]))
      data.sessions[l.id] = raw.sessions[l.id];
  for (const mode of variantModes)
    if (raw.free?.[mode]) {
      try {
        const saved = raw.free[mode],
          l = variantPuzzle(mode, saved.seed, saved.n);
        if (validState(l, saved.session))
          data.free[mode] = {
            seed: saved.seed,
            n: saved.n,
            session: saved.session,
          };
      } catch {}
    }
  return data;
}

import { variantCatalogSpecs } from './variant-catalog-data.mjs';
import { variantDifficulty } from './variant-difficulty.mjs';
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
    'Kacheln mit derselben Zahl drehen sich gemeinsam. Verbinde das ganze Netz ohne offene Anschlüsse. Antippen dreht beide Kacheln um 90 Grad. Kacheln ohne Zahl drehen einzeln.',
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
  generation = 1,
) {
  if (
    !variantModes.includes(mode) ||
    !(generation >= 2 ? [3, 4, 5, 6] : [3, 4]).includes(n) ||
    ![1, 2, 3].includes(generation) ||
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
  const split = Math.max(
    2,
    Math.floor(size * (generation === 3 ? 0.1 + random() * 0.25 : 0.5)),
  );
  if (mode === 'dual') for (const i of order.slice(split)) owners[i] = 1;
  if (generation >= 2 && mode === 'dual') {
    // Move border cells only while both coloured regions remain connected.
    for (let k = 0; k < size * 3; k++) {
      const i = Math.floor(random() * size),
        owner = owners[i];
      const cells = order.filter((j) => j !== i && owners[j] === owner);
      if (
        cells.length <
          Math.max(2, Math.floor(size / (generation === 3 ? 8 : 4))) ||
        ![0, 1, 2, 3].some((d) => {
          const j = neighbor(i, d, n);
          return j >= 0 && owners[j] !== owner;
        })
      )
        continue;
      const seen = new Set([cells[0]]),
        queue = [cells[0]];
      for (const at of queue)
        for (let d = 0; d < 4; d++) {
          const j = neighbor(at, d, n);
          if (j >= 0 && j !== i && owners[j] === owner && !seen.has(j)) {
            seen.add(j);
            queue.push(j);
          }
        }
      if (seen.size === cells.length) owners[i] = 1 - owner;
    }
  }
  const active =
    mode === 'path'
      ? order.slice(
          0,
          size -
            Math.max(
              2,
              Math.floor(
                size * (generation >= 2 ? 0.18 + random() * 0.23 : 0.25),
              ),
            ),
        )
      : order;
  const regions =
    mode === 'dual'
      ? [
          order.filter((i) => owners[i] === 0),
          order.filter((i) => owners[i] === 1),
        ]
      : [active];
  for (const cells of regions) {
    const allowed = new Set(cells),
      seen = new Set([cells[0]]),
      stack = [cells[0]];
    while (stack.length) {
      const atIndex =
        generation === 3
          ? Math.floor(random() * stack.length)
          : stack.length - 1;
      const at = stack[atIndex];
      const options = [0, 1, 2, 3]
        .map((d) => [d, neighbor(at, d, n)])
        .filter(([, j]) => allowed.has(j) && !seen.has(j));
      if (!options.length) {
        stack.splice(atIndex, 1);
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
  if (mode === 'linked') {
    const pairing = [...order];
    if (generation >= 2 && seed % 3 !== 0)
      for (let i = pairing.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [pairing[i], pairing[j]] = [pairing[j], pairing[i]];
      }
    const paired =
      generation === 3
        ? 2 * (1 + Math.floor(random() * Math.max(1, size / 6)))
        : size;
    for (let i = 0; i < size;) {
      const width = i < paired ? 2 : 1;
      groups.push(pairing.slice(i, i + width));
      i += width;
    }
  } else for (let i = 0; i < size; i++) groups.push([i]);
  const puzzle = {
    id,
    variant: mode,
    mode,
    n,
    seed,
    name: variantNames[mode],
    tier: n === 3 ? 'Leicht' : 'Mittel',
    source: regions[0][0],
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
  if (generation >= 2) puzzle.generatorVersion = generation;
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
export const variantCatalog = variantCatalogSpecs.map((spec) => ({
  ...variantPuzzle(spec.mode, spec.seed, spec.n, spec.id, spec.generation),
  difficulty: spec.difficulty,
  tier: spec.difficulty.tier,
}));
export function savedVariant(mode, saved) {
  const generation = [2, 3].includes(saved.generatorVersion)
    ? saved.generatorVersion
    : 1;
  const id =
    generation >= 2
      ? `variant-v${generation}-${mode}-${saved.n}-${saved.seed}`
      : undefined;
  const l = variantPuzzle(mode, saved.seed, saved.n, id, generation);
  if (generation >= 2) {
    l.difficulty = variantDifficulty(l);
    l.tier = l.difficulty.tier;
  }
  return l;
}
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
          l = savedVariant(mode, saved);
        if (validState(l, saved.session))
          data.free[mode] = {
            seed: saved.seed,
            n: saved.n,
            session: saved.session,
            ...([2, 3].includes(saved.generatorVersion)
              ? { generatorVersion: saved.generatorVersion }
              : {}),
          };
      } catch {}
    }
  if (
    Array.isArray(raw.recent) &&
    raw.recent.length <= 36 &&
    raw.recent.every((k) => typeof k === 'string' && k.length < 10000)
  )
    data.recent = [...new Set(raw.recent)];
  return data;
}

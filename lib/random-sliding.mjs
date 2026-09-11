import { neighbor, rotate } from './game.mjs';
import { slidingStatus, freshSliding, restoreSliding } from './sliding.mjs';

export const slidingTiers = ['Leicht', 'Mittel', 'Schwer'];
const ranges = {
  slide: [
    [4, 7],
    [10, 14],
    [17, 21],
  ],
  rotate: [
    [2, 3],
    [4, 5],
    [6, 8],
  ],
};
const neighbors = Array.from({ length: 9 }, (_, i) =>
  [0, 1, 2, 3].map((d) => neighbor(i, d, 3)).filter((j) => j >= 0),
);
const decode = (key) => [...key].map((c) => (c === '_' ? null : Number(c)));

// Enumerate ALL solved arrangements, including interchangeable tile identities.
// In combined mode orientations are free here: the distance measures required slides.
export function slidingGoals(l) {
  const goals = new Map(),
    positions = [],
    turns = Array(8).fill(0),
    board = [];
  const options = l.pieces.map((m) => {
    const result = [];
    for (let t = 0; t < (l.mode === 'rotate' ? 4 : 1); t++, m = rotate(m))
      if (!result.some((o) => o.mask === m)) result.push({ mask: m, t });
    return result;
  });
  function visit(i, used, blank) {
    if (i === 9) {
      const solution = { positions: [...positions], turns: [...turns] };
      if (slidingStatus(l, solution).solved) {
        const key = positions.map((id) => (id === null ? '_' : id)).join('');
        if (!goals.has(key)) goals.set(key, solution);
      }
      return;
    }
    for (let id = -1; id < 8; id++) {
      if (id < 0 ? blank : used & (1 << id)) continue;
      for (const { mask, t } of id < 0 ? [{ mask: 0, t: 0 }] : options[id]) {
        if ([0, 1, 2, 3].some((d) => neighbor(i, d, 3) < 0 && mask & (1 << d)))
          continue;
        if (i >= 3 && Boolean(mask & 1) !== Boolean(board[i - 3] & 4)) continue;
        if (i % 3 && Boolean(mask & 8) !== Boolean(board[i - 1] & 2)) continue;
        positions[i] = id < 0 ? null : id;
        board[i] = mask;
        if (id >= 0) turns[id] = t;
        visit(i + 1, id < 0 ? used : used | (1 << id), blank || id < 0);
      }
    }
  }
  visit(0, 0, false);
  return goals;
}

export function generateSliding({ mode, tier, seed, exclude = [] }) {
  if (
    !['slide', 'rotate'].includes(mode) ||
    !slidingTiers.includes(tier) ||
    !Number.isInteger(seed)
  )
    throw Error('Ungültige Rätselauswahl.');
  let state = seed >>> 0;
  const rand = (n) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor((state / 4294967296) * n);
  };
  const deadline = Date.now() + 12000;
  for (let attempt = 0; attempt < 20; attempt++) {
    if (Date.now() > deadline) break;
    const hole = rand(9),
      board = Array(9).fill(0),
      seen = new Set([hole === 0 ? 1 : 0]);
    while (seen.size < 8) {
      const edges = [];
      for (const i of seen)
        for (let d = 0; d < 4; d++) {
          const j = neighbor(i, d, 3);
          if (j >= 0 && j !== hole && !seen.has(j)) edges.push([i, d, j]);
        }
      const [i, d, j] = edges[rand(edges.length)];
      board[i] |= 1 << d;
      board[j] |= 1 << ((d + 2) % 4);
      seen.add(j);
    }
    const l = {
      id: `free-${mode}-${tier}-${seed >>> 0}`,
      mode,
      tier,
      n: 3,
      name: 'Freie Lichtwege',
      seed: seed >>> 0,
      pieces: board.filter(Boolean),
      sourceId: rand(8),
    };
    const goals = slidingGoals(l),
      keys = [...goals.keys()],
      roots = keys.map((_, i) => i),
      distances = new Map(keys.map((k, i) => [k, i]));
    const [min, max] = ranges[mode][slidingTiers.indexOf(tier)],
      target = min + rand(max - min + 1);
    let start = 0,
      end = keys.length,
      depth = 0;
    while (depth < target && start < end) {
      for (let q = start; q < end; q++) {
        if ((q & 4095) === 0 && Date.now() > deadline)
          throw Error('Das Rätsel braucht zu lange. Bitte erneut versuchen.');
        const key = keys[q],
          blank = key.indexOf('_');
        for (const from of neighbors[blank]) {
          const chars = [...key];
          [chars[blank], chars[from]] = [chars[from], chars[blank]];
          const next = chars.join('');
          if (distances.has(next)) continue;
          distances.set(next, keys.length);
          keys.push(next);
          roots.push(roots[q]);
        }
      }
      start = end;
      end = keys.length;
      depth++;
    }
    if (depth !== target || start === end) continue;
    const chosen = start + rand(end - start),
      key = keys[chosen];
    l.solution = goals.get(keys[roots[chosen]]);
    l.initial = {
      positions: decode(key),
      turns: Array.from({ length: 8 }, () => (mode === 'rotate' ? rand(4) : 0)),
    };
    if (mode === 'rotate') {
      // Require both mechanics, even if a different solved layout is accepted.
      const pieces = l.pieces.map((m, id) => {
        for (let k = 0; k < l.initial.turns[id]; k++) m = rotate(m);
        return m;
      });
      if (slidingGoals({ ...l, mode: 'slide', pieces }).size) continue;
    }
    l.minSlides = target;
    l.fingerprint =
      mode +
      ':' +
      l.initial.positions
        .map((id) => (id === null ? 0 : l.pieces[id]))
        .join(',');
    if (exclude.includes(l.fingerprint)) continue;
    return l;
  }
  throw Error('Kein passendes Rätsel gefunden. Bitte erneut versuchen.');
}

export function restoreFreeSliding(raw) {
  const result = {
    version: 1,
    slide: null,
    rotate: null,
    recent: [],
    tiers: { slide: 'Leicht', rotate: 'Leicht' },
  };
  if (raw?.version !== 1) return result;
  result.recent = Array.isArray(raw.recent)
    ? raw.recent.filter((x) => typeof x === 'string').slice(-100)
    : [];
  for (const mode of ['slide', 'rotate']) {
    if (slidingTiers.includes(raw.tiers?.[mode]))
      result.tiers[mode] = raw.tiers[mode];
    const entry = raw[mode],
      l = entry?.puzzle;
    if (
      !l ||
      l.n !== 3 ||
      l.mode !== mode ||
      typeof l.id !== 'string' ||
      !l.id.startsWith('free-' + mode + '-') ||
      !slidingTiers.includes(l.tier) ||
      !Array.isArray(l.pieces) ||
      l.pieces.length !== 8 ||
      !l.pieces.every((m) => Number.isInteger(m) && m > 0 && m < 16) ||
      !Number.isInteger(l.sourceId) ||
      l.sourceId < 0 ||
      l.sourceId > 7
    )
      continue;
    try {
      const valid = (state) =>
        restoreSliding([l], {
          version: 1,
          sessions: {
            [l.id]: { ...state, slides: 0, rotations: 0, history: [] },
          },
        }).sessions[l.id];
      if (
        !valid(l.initial) ||
        !valid(l.solution) ||
        !slidingStatus(l, l.solution).solved
      )
        continue;
      // An odd permutation cannot reach this stored target by legal slides.
      const parity = (p) => {
        const a = p.filter((x) => x !== null);
        let v = 0;
        for (let i = 0; i < 8; i++)
          for (let j = i + 1; j < 8; j++) if (a[i] > a[j]) v++;
        return v % 2;
      };
      if (parity(l.initial.positions) !== parity(l.solution.positions))
        continue;
      const session =
        restoreSliding([l], { version: 1, sessions: { [l.id]: entry.session } })
          .sessions[l.id] || freshSliding(l);
      result[mode] = {
        puzzle: l,
        session:
          parity(session.positions) === parity(l.solution.positions)
            ? session
            : freshSliding(l),
      };
    } catch {
      /* Ignore damaged free saves, preserving the other mode. */
    }
  }
  return result;
}

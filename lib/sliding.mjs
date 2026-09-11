import { evaluate, rotate } from './game.mjs';

export const adjacent = (a, b, n) =>
  Math.abs((a % n) - (b % n)) +
    Math.abs(Math.floor(a / n) - Math.floor(b / n)) ===
  1;
export function slidingBoard(l, s) {
  return s.positions.map((id) => {
    if (id === null) return 0;
    let m = l.pieces[id];
    for (let k = s.turns[id] % 4; k > 0; k--) m = rotate(m);
    return m;
  });
}
export function slidingStatus(l, s) {
  const board = slidingBoard(l, s);
  const result = evaluate(board, l.n, s.positions.indexOf(l.sourceId));
  return {
    ...result,
    solved: result.open === 0 && result.lit.size === l.pieces.length,
    litIds: new Set([...result.lit].map((i) => s.positions[i])),
  };
}
export const freshSliding = (l) => ({
  positions: [...l.initial.positions],
  turns: [...l.initial.turns],
  slides: 0,
  rotations: 0,
  history: [],
});
export function slideAct(l, s, action) {
  if (action.type === 'reset') return freshSliding(l);
  if (action.type === 'undo')
    return s.history.length
      ? { ...s.history.at(-1), history: s.history.slice(0, -1) }
      : s;
  if (
    slidingStatus(l, s).solved ||
    !Number.isInteger(action.id) ||
    action.id < 0 ||
    action.id >= l.pieces.length
  )
    return s;
  const pos = s.positions.indexOf(action.id),
    hole = s.positions.indexOf(null);
  if (action.type !== 'slide' && action.type !== 'turn') return s;
  if (action.type === 'slide' && !adjacent(pos, hole, l.n)) return s;
  if (action.type === 'turn' && l.mode !== 'rotate') return s;
  const next = {
    positions: [...s.positions],
    turns: [...s.turns],
    slides: s.slides,
    rotations: s.rotations,
    history: [
      ...s.history,
      {
        positions: [...s.positions],
        turns: [...s.turns],
        slides: s.slides,
        rotations: s.rotations,
      },
    ].slice(-500),
  };
  if (action.type === 'slide') {
    [next.positions[pos], next.positions[hole]] = [
      next.positions[hole],
      next.positions[pos],
    ];
    next.slides++;
  } else {
    next.turns[action.id]++;
    next.rotations++;
  }
  return next;
}
export function tapSliding(l, s, selected, position) {
  const id = s.positions[position];
  if (id === undefined) return { selected: null, action: null };
  if (id === null)
    return {
      selected: null,
      action:
        selected !== null &&
        adjacent(s.positions.indexOf(selected), position, l.n)
          ? { type: 'slide', id: selected }
          : null,
    };
  if (selected === id)
    return {
      selected: l.mode === 'rotate' ? id : null,
      action: l.mode === 'rotate' ? { type: 'turn', id } : null,
    };
  return { selected: id, action: null };
}
export function swipeSliding(l, s, id, dx, dy, cellSize) {
  const pos = s.positions.indexOf(id),
    hole = s.positions.indexOf(null);
  if (id === null || pos < 0 || !adjacent(pos, hole, l.n)) return null;
  const threshold = Math.max(12, Math.min(24, cellSize * 0.18));
  const x = (hole % l.n) - (pos % l.n),
    y = Math.floor(hole / l.n) - Math.floor(pos / l.n);
  const primary = x ? dx * x : dy * y,
    cross = x ? Math.abs(dy) : Math.abs(dx);
  return primary >= threshold && primary > cross * 1.35
    ? { type: 'slide', id }
    : null;
}
export function restoreSliding(levels, raw) {
  const result = { version: 1, current: 0, sessions: {} };
  if (raw?.version !== 1) return result;
  if (
    Number.isInteger(raw.current) &&
    raw.current >= 0 &&
    raw.current < levels.length
  )
    result.current = raw.current;
  for (const l of levels) {
    const s = raw.sessions?.[l.id];
    const valid = (v) =>
      v &&
      Array.isArray(v.positions) &&
      v.positions.length === l.n * l.n &&
      v.positions.filter((x) => x === null).length === 1 &&
      new Set(v.positions).size === l.n * l.n &&
      v.positions.every(
        (x) =>
          x === null || (Number.isInteger(x) && x >= 0 && x < l.pieces.length),
      ) &&
      Array.isArray(v.turns) &&
      v.turns.length === l.pieces.length &&
      v.turns.every(
        (x) =>
          Number.isSafeInteger(x) &&
          x >= 0 &&
          x < 1000000 &&
          (l.mode === 'rotate' || x === 0),
      ) &&
      [v.slides, v.rotations].every((x) => Number.isSafeInteger(x) && x >= 0);
    if (valid(s))
      result.sessions[l.id] = {
        positions: s.positions,
        turns: s.turns,
        slides: s.slides,
        rotations: s.rotations,
        history: Array.isArray(s.history)
          ? s.history.filter(valid).slice(-500)
          : [],
      };
  }
  return result;
}

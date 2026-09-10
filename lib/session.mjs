import { rotate, evaluate } from './game.mjs';
export const fresh = (l) => ({
  turns: l.initial.map(() => 0),
  locks: l.initial.map(() => false),
  history: [],
  moves: 0,
});
export function boardOf(l, s) {
  return l.initial.map((m, i) => {
    for (let k = ((s.turns[i] % 4) + 4) % 4; k > 0; k--) m = rotate(m);
    return m;
  });
}
export function act(l, s, action) {
  if (action.type === 'reset') return fresh(l);
  if (action.type === 'undo') {
    if (!s.history.length) return s;
    const last = s.history.at(-1);
    return { ...s, ...last, history: s.history.slice(0, -1) };
  }
  const i = action.index;
  if (!Number.isInteger(i) || i < 0 || i >= s.turns.length) return s;
  if (evaluate(boardOf(l, s), l.n, l.source).solved) return s;
  if (action.type === 'turn' && s.locks[i]) return s;
  const history = [
    ...s.history,
    { turns: [...s.turns], locks: [...s.locks], moves: s.moves },
  ].slice(-500);
  if (action.type === 'lock')
    return { ...s, history, locks: s.locks.map((v, j) => (i === j ? !v : v)) };
  if (action.type === 'turn')
    return {
      ...s,
      history,
      turns: s.turns.map((v, j) => (i === j ? v + 1 : v)),
      moves: s.moves + 1,
    };
  return s;
}
export function restore(levels, raw, legacy) {
  const result = { level: 0, sessions: {}, done: [], sound: false };
  const validIndex = (i) => Number.isInteger(i) && i >= 0 && i < levels.length;
  const validState = (s, l) =>
    s &&
    Array.isArray(s.turns) &&
    s.turns.length === l.initial.length &&
    s.turns.every((v) => Number.isSafeInteger(v) && v >= 0 && v < 1000000) &&
    Array.isArray(s.locks) &&
    s.locks.length === l.initial.length &&
    s.locks.every((v) => typeof v === 'boolean') &&
    Number.isSafeInteger(s.moves) &&
    s.moves >= 0;
  if (raw?.version === 2) {
    if (validIndex(raw.level)) result.level = raw.level;
    result.sound = raw.sound === true;
    for (const [key, s] of Object.entries(raw.sessions || {})) {
      const i = Number(key);
      if (validIndex(i) && validState(s, levels[i]))
        result.sessions[i] = {
          ...s,
          history: Array.isArray(s.history)
            ? s.history.filter((h) => validState(h, levels[i])).slice(-500)
            : [],
        };
    }
    if (Array.isArray(raw.done))
      result.done = [...new Set(raw.done.filter(validIndex))];
    return result;
  }
  if (legacy && validIndex(legacy.level)) {
    result.level = legacy.level;
    const l = levels[legacy.level],
      s = fresh(l);
    if (
      Array.isArray(legacy.board) &&
      legacy.board.length === l.initial.length
    ) {
      let ok = true;
      legacy.board.forEach((m, i) => {
        let mask = l.initial[i],
          k = 0;
        while (mask !== m && k < 4) {
          mask = rotate(mask);
          k++;
        }
        if (k === 4) ok = false;
        s.turns[i] = k;
      });
      if (ok) {
        s.moves =
          Number.isSafeInteger(legacy.moves) && legacy.moves >= 0
            ? legacy.moves
            : 0;
        result.sessions[legacy.level] = s;
      }
    }
    if (Array.isArray(legacy.done))
      result.done = legacy.done.filter(validIndex);
  }
  return result;
}

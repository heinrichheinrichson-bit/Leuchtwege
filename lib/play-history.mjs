import { dayKey } from './daily.mjs';
import { validFreeze } from './streak-freeze.mjs';
export const emptyHistory = () => ({
  version: 1,
  startedAt: null,
  clockVisible: true,
  attempts: [],
  current: {},
});
export function restoreHistory(raw) {
  const result = emptyHistory();
  if (raw?.version !== 1) return result;
  if (validFreeze(raw.freeze)) result.freeze = raw.freeze;
  result.startedAt = typeof raw.startedAt === 'string' ? raw.startedAt : null;
  result.clockVisible = raw.clockVisible !== false;
  const ids = new Set();
  result.attempts = (Array.isArray(raw.attempts) ? raw.attempts : []).filter(
    (a) => {
      if (
        !a ||
        typeof a.id !== 'string' ||
        ids.has(a.id) ||
        typeof a.puzzleId !== 'string' ||
        !['turn', 'slide', 'rotate', 'dual', 'path', 'linked'].includes(
          a.mode,
        ) ||
        !['catalog', 'free', 'daily'].includes(a.origin) ||
        typeof a.name !== 'string' ||
        !Number.isFinite(a.elapsedMs) ||
        a.elapsedMs < 0 ||
        !Number.isSafeInteger(a.moves) ||
        a.moves < 0 ||
        (a.effortMoves !== undefined &&
          (!Number.isSafeInteger(a.effortMoves) || a.effortMoves < a.moves)) ||
        (a.optimalProof !== undefined &&
          (a.optimalProof?.version !== 1 ||
            !Number.isSafeInteger(a.optimalProof.minimumMoves) ||
            a.optimalProof.minimumMoves < 0)) ||
        !['none', 'hint', 'test'].includes(a.assistance) ||
        !Number.isSafeInteger(a.hints) ||
        a.hints < 0 ||
        !Number.isSafeInteger(a.tests) ||
        a.tests < 0 ||
        !Number.isFinite(Date.parse(a.startedAt)) ||
        (a.completedAt !== null && !Number.isFinite(Date.parse(a.completedAt)))
      )
        return false;
      ids.add(a.id);
      return true;
    },
  );
  for (const a of result.attempts)
    if (raw.current?.[a.puzzleId] === a.id) result.current[a.puzzleId] = a.id;
  return result;
}
export function currentAttempt(data, puzzleId) {
  return data.attempts.find((a) => a.id === data.current[puzzleId]) || null;
}
export function updateAttempt(
  data,
  meta,
  {
    id,
    now,
    moves = 0,
    elapsedMs = 0,
    solved = false,
    assistance = 'none',
    restart = false,
  } = {},
) {
  let attempt = restart ? null : currentAttempt(data, meta.puzzleId);
  if (attempt?.completedAt) return data;
  const fresh = !attempt;
  if (fresh)
    attempt = {
      ...meta,
      id,
      startedAt: now,
      completedAt: null,
      elapsedMs: 0,
      moves,
      partialTime: moves > 0,
      effortMoves: moves,
      hints: 0,
      tests: 0,
      assistance: 'none',
    };
  const next = {
    ...attempt,
    elapsedMs: attempt.elapsedMs + Math.max(0, elapsedMs),
    moves,
    ...(Number.isSafeInteger(attempt.effortMoves)
      ? {
          effortMoves: attempt.effortMoves + Math.max(0, moves - attempt.moves),
        }
      : {}),
    hints: attempt.hints + (assistance === 'hint' ? 1 : 0),
    tests: attempt.tests + (assistance === 'test' ? 1 : 0),
    assistance:
      attempt.assistance === 'test' || assistance === 'test'
        ? 'test'
        : attempt.assistance === 'hint' || assistance === 'hint'
          ? 'hint'
          : 'none',
    completedAt: solved ? now : null,
    completedDay: solved ? dayKey(new Date(now)) : null,
  };
  return {
    ...data,
    startedAt: data.startedAt || now,
    attempts: fresh
      ? [...data.attempts, next]
      : data.attempts.map((a) => (a.id === next.id ? next : a)),
    current: { ...data.current, [meta.puzzleId]: next.id },
  };
}
export function historySummary(data, mode = 'all') {
  const all = data.attempts.filter((a) => mode === 'all' || a.mode === mode),
    completed = all.filter((a) => a.completedAt),
    regular = completed.filter((a) => a.assistance !== 'test');
  return {
    playedMs: all.reduce((s, a) => s + a.elapsedMs, 0),
    completed: regular.length,
    unique: new Set(regular.map((a) => a.puzzleId)).size,
    independent: regular.filter(
      (a) => a.assistance === 'none' && !a.partialTime,
    ).length,
    partial: regular.filter((a) => a.assistance === 'none' && a.partialTime)
      .length,
    withHints: regular.filter((a) => a.assistance === 'hint').length,
    tests: completed.filter((a) => a.assistance === 'test').length,
    hints: all.reduce((s, a) => s + a.hints, 0),
    recent: [...completed].sort((a, b) =>
      b.completedAt.localeCompare(a.completedAt),
    ),
  };
}
export function formatTime(ms) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return s >= 3600
    ? Math.floor(s / 3600) +
        ':' +
        String(Math.floor(s / 60) % 60).padStart(2, '0') +
        ':' +
        String(s % 60).padStart(2, '0')
    : String(Math.floor(s / 60)).padStart(2, '0') +
        ':' +
        String(s % 60).padStart(2, '0');
}

import { boardOf } from './session.mjs';
import { evaluate } from './game.mjs';
export function recommendedOrder(levels) {
  return levels
    .map((_, i) => i)
    .sort((a, b) => (levels[a].order ?? a) - (levels[b].order ?? b) || a - b);
}
export function isInProgress(l, s) {
  return (
    !!s &&
    (s.moves > 0 || s.locks.some(Boolean)) &&
    !evaluate(boardOf(l, s), l.n, l.source).solved
  );
}
export function continueTarget(levels, sessions, last, done) {
  if (isInProgress(levels[last], sessions[last]))
    return { index: last, resume: true };
  const other = Object.keys(sessions)
    .map(Number)
    .reverse()
    .find((i) => levels[i] && isInProgress(levels[i], sessions[i]));
  if (other !== undefined) return { index: other, resume: true };
  const order = recommendedOrder(levels);
  const next = order.find((i) => !done.includes(i));
  return { index: next ?? order[0], resume: false };
}
export function nextPuzzle(levels, current, done) {
  const order = recommendedOrder(levels),
    at = order.indexOf(current);
  for (let step = 1; step < levels.length; step++) {
    const i = order[(at + step) % levels.length];
    if (!done.includes(i)) return i;
  }
  return null;
}

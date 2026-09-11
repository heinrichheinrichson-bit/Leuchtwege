import { rotate, evaluate } from './game.mjs';
import { boardOf, act } from './session.mjs';
import { adjacent, slideAct, slidingStatus } from './sliding.mjs';

export const isSliding = (l) => Array.isArray(l.pieces);
export const helpSolved = (l, s) =>
  isSliding(l)
    ? slidingStatus(l, s).solved
    : evaluate(boardOf(l, s), l.n, l.source).solved;
function positionPath(start, goal, n) {
  const key = (p) => p.map((x) => (x === null ? '_' : x)).join('');
  const a = key(start),
    b = key(goal);
  if (a === b) return [];
  const maps = [
    new Map([[a, { parent: null, id: null }]]),
    new Map([[b, { parent: null, id: null }]]),
  ];
  const fronts = [[a], [b]];
  let meeting = null;
  while (fronts[0].length && fronts[1].length && meeting === null) {
    const side = fronts[0].length <= fronts[1].length ? 0 : 1,
      other = 1 - side,
      next = [];
    for (const current of fronts[side]) {
      const hole = current.indexOf('_');
      for (let p = 0; p < current.length; p++) {
        if (!adjacent(p, hole, n)) continue;
        const chars = [...current],
          id = Number(chars[p]);
        [chars[p], chars[hole]] = [chars[hole], chars[p]];
        const k = chars.join('');
        if (maps[side].has(k)) continue;
        maps[side].set(k, { parent: current, id });
        next.push(k);
        if (maps[other].has(k)) {
          meeting = k;
          break;
        }
      }
      if (meeting !== null) break;
    }
    fronts[side] = next;
  }
  if (meeting === null)
    throw Error('Diese Schiebestellung ist nicht erreichbar.');
  const path = [];
  for (
    let k = meeting;
    maps[0].get(k).parent !== null;
    k = maps[0].get(k).parent
  )
    path.unshift({ type: 'slide', id: maps[0].get(k).id });
  for (
    let k = meeting;
    maps[1].get(k).parent !== null;
    k = maps[1].get(k).parent
  )
    path.push({ type: 'slide', id: maps[1].get(k).id });
  return path;
}
export function solutionPlan(l, s) {
  if (helpSolved(l, s)) return [];
  const actions = [];
  if (isSliding(l)) {
    if (l.n !== 3) throw Error('Die Schiebehilfe unterstützt derzeit 3×3.');
    for (let id = 0; id < l.pieces.length; id++)
      for (const type of ['slide', ...(l.mode === 'rotate' ? ['turn'] : [])]) {
        const action = { type, id },
          next = slideAct(l, s, action);
        if (next !== s && helpSolved(l, next)) return [action];
      }
    if (!slidingStatus(l, l.solution).solved)
      throw Error('Ungültige Zielstellung.');
    actions.push(...positionPath(s.positions, l.solution.positions, l.n));
    if (l.mode === 'rotate')
      for (let id = 0; id < l.pieces.length; id++) {
        let mask = l.pieces[id],
          target = l.pieces[id];
        for (let k = 0; k < s.turns[id] % 4; k++) mask = rotate(mask);
        for (let k = 0; k < l.solution.turns[id] % 4; k++)
          target = rotate(target);
        while (mask !== target) {
          actions.push({ type: 'turn', id });
          mask = rotate(mask);
        }
      }
  } else {
    if (!evaluate(l.solution, l.n, l.source).solved)
      throw Error('Ungültige Zielstellung.');
    boardOf(l, s).forEach((mask, index) => {
      for (let k = 0; mask !== l.solution[index]; k++) {
        if (k >= 4) throw Error('Kachel passt nicht zur Lösung.');
        actions.push({ type: 'turn', index });
        mask = rotate(mask);
      }
    });
  }
  // Replay legal actions, accept an alternative network if it solves sooner.
  let current = s;
  const verified = [];
  for (const action of actions) {
    current = helpAct(l, current, action);
    verified.push(action);
    if (helpSolved(l, current)) return verified;
  }
  throw Error('Kein geprüfter Lösungsweg gefunden.');
}
function helpAct(l, s, a) {
  if (isSliding(l)) return slideAct(l, s, a);
  const unlocked = {
    ...s,
    locks: s.locks.map((v, i) => (i === a.index ? false : v)),
  };
  return act(l, unlocked, a);
}
export function applyHelp(l, s, plan, mode) {
  if (!['all', 'almost', 'step'].includes(mode))
    throw Error('Unbekannte Lösehilfe.');
  const count =
    mode === 'all'
      ? plan.length
      : mode === 'almost'
        ? Math.max(0, plan.length - 1)
        : Math.min(1, plan.length);
  if (!count) return s;
  let next = s;
  for (const action of plan.slice(0, count)) next = helpAct(l, next, action);
  const { history, ...snapshot } = s;
  return { ...next, history: [...history, snapshot].slice(-500) };
}

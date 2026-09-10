import { makeLevel, topologyKey } from './level-design.mjs';
import { difficulty } from './difficulty.mjs';
import { solutions, evaluate, rotate } from './game.mjs';
import { fresh, restore } from './session.mjs';

export const GENERATOR_VERSION = 1;
export const sizes = {
  Leicht: [3, 4, 5],
  Mittel: [4, 5, 6],
  Schwer: [4, 5, 6],
};
export function generateRandom({
  tier,
  size = 0,
  seed,
  recent = [],
  excluded = [],
  maxAttempts = 1500,
  budgetMs = 6000,
}) {
  if (
    !sizes[tier] ||
    (size !== 0 && !sizes[tier].includes(size)) ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  )
    throw Error('Invalid generation options');
  const started = performance.now();
  const blocked = new Set([...recent, ...excluded]);
  for (let attempt = 0; attempt < Math.min(maxAttempts, 1500); attempt++) {
    if (performance.now() - started >= budgetMs) return null;
    const n = size || sizes[tier][(seed + attempt) % sizes[tier].length];
    const candidateSeed = (seed + Math.imul(attempt, 2654435761)) >>> 0;
    const l = makeLevel(n, candidateSeed);
    if (!l) continue;
    const key = topologyKey(l);
    if (blocked.has(key)) continue;
    const d = difficulty(l);
    if (d.tier !== tier || d.method === 'search') continue;
    if (solutions(l.initial, n, l.source).length !== 1) continue;
    return {
      ...l,
      id: `free-${GENERATOR_VERSION}-${n}-${candidateSeed}`,
      name: 'Freier Lichtblick',
      lesson: null,
      difficulty: d,
      generatorVersion: GENERATOR_VERSION,
      key,
    };
  }
  return null;
}

export const emptyFree = () => ({
  version: 1,
  puzzle: null,
  session: null,
  recent: [],
  tier: 'Leicht',
  size: 0,
});
export function restoreFree(raw) {
  const result = emptyFree();
  if (raw?.version !== 1) return result;
  if (sizes[raw.tier]) result.tier = raw.tier;
  if (raw.size === 0 || sizes[result.tier].includes(raw.size))
    result.size = raw.size;
  if (Array.isArray(raw.recent))
    result.recent = raw.recent
      .filter((k) => typeof k === 'string' && k.length < 200)
      .slice(-100);
  const l = raw.puzzle;
  if (
    !l ||
    ![3, 4, 5, 6].includes(l.n) ||
    !Number.isInteger(l.source) ||
    l.source < 0 ||
    l.source >= l.n * l.n ||
    !sizes[l.difficulty?.tier] ||
    !Number.isInteger(l.seed) ||
    l.seed < 0 ||
    l.seed > 0xffffffff ||
    l.generatorVersion !== 1
  )
    return result;
  for (const b of [l.initial, l.solution])
    if (
      !Array.isArray(b) ||
      b.length !== l.n * l.n ||
      !b.every((m) => Number.isInteger(m) && m > 0 && m < 16)
    )
      return result;
  if (
    !evaluate(l.solution, l.n, l.source).solved ||
    evaluate(l.initial, l.n, l.source).solved
  )
    return result;
  if (
    !l.initial.every((m, i) =>
      [m, rotate(m), rotate(rotate(m)), rotate(rotate(rotate(m)))].includes(
        l.solution[i],
      ),
    )
  )
    return result;
  result.puzzle = {
    ...l,
    id: `free-1-${l.n}-${l.seed}`,
    name: 'Freier Lichtblick',
    lesson: null,
    key: topologyKey(l),
  };
  result.session =
    restore([l], { version: 2, sessions: { 0: raw.session } }).sessions[0] ||
    fresh(l);
  return result;
}
export function acceptRandom(saved, puzzle) {
  return {
    ...saved,
    puzzle,
    session: fresh(puzzle),
    recent: [...saved.recent.filter((k) => k !== puzzle.key), puzzle.key].slice(
      -100,
    ),
  };
}

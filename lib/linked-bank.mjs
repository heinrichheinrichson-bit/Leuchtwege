import bank from './linked-bank.json' with { type: 'json' };
import { rotate } from './game.mjs';
export const linkedBankSize = bank.length;
// Bank length AND order are fixed for generator v5. Expansion needs a new version.
// Each seed also produces its own legal whole-group scramble.
export function linkedBankPuzzle(seed, id) {
  const base = bank[seed % bank.length];
  if (!base) throw Error('Missing linked puzzle bank');
  let state = seed;
  const random = () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const initial = [...base.solution];
  for (const group of base.groups) {
    const turns = 1 + Math.floor(random() * 3);
    for (const cell of group)
      for (let k = 0; k < turns; k++) initial[cell] = rotate(initial[cell]);
  }
  return {
    n: 6,
    mode: 'linked',
    variant: 'linked',
    name: 'Gekoppelte Drehungen',
    id,
    seed,
    generatorVersion: 5,
    tier: 'Schwer',
    source: base.source,
    sources: [base.source],
    targets: [],
    owners: initial.map(() => 0),
    groups: base.groups.map((g) => [...g]),
    solution: [...base.solution],
    initial,
  };
}

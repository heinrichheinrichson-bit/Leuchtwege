import { readFileSync, writeFileSync } from 'node:fs';
import {
  generateSliding,
  slidingGoals,
  slidingTiers,
} from './lib/random-sliding.mjs';
import { adjacent, freshSliding } from './lib/sliding.mjs';
import { solutionPlan } from './lib/solve-help.mjs';
const file = 'lib/sliding-levels.json',
  levels = JSON.parse(readFileSync(file));
if (levels.length !== 6)
  throw Error(
    'Only extend the original six puzzles once; never replace published levels.',
  );
function minimum(l) {
  const goals = slidingGoals(l),
    key = l.initial.positions.map((id) => (id === null ? '_' : id)).join('');
  let front = [key],
    seen = new Set(front);
  for (let d = 0; front.length; d++) {
    if (front.some((k) => goals.has(k))) return d;
    const next = [];
    for (const k of front) {
      const hole = k.indexOf('_');
      for (let p = 0; p < 9; p++) {
        if (!adjacent(p, hole, 3)) continue;
        const chars = [...k];
        [chars[p], chars[hole]] = [chars[hole], chars[p]];
        const key = chars.join('');
        if (!seen.has(key)) {
          seen.add(key);
          next.push(key);
        }
      }
    }
    front = next;
  }
  throw Error('Unsolvable legacy puzzle');
}
for (const l of levels) {
  l.minSlides = minimum(l);
  l.tier =
    l.mode === 'slide'
      ? l.minSlides <= 8
        ? 'Leicht'
        : l.minSlides <= 15
          ? 'Mittel'
          : 'Schwer'
      : l.minSlides <= 3
        ? 'Leicht'
        : l.minSlides <= 5
          ? 'Mittel'
          : 'Schwer';
  console.log(l.id, l.tier, l.minSlides);
}
const names = [
  'Morgentau',
  'Lichtspur',
  'Kleine Runde',
  'Heller Winkel',
  'Wanderlicht',
  'Leise Wege',
  'Goldener Bogen',
  'Funkenflug',
  'Wegweiser',
  'Lichtbrücke',
  'Abendglanz',
  'Sternenpfad',
  'Lichtwechsel',
  'Zwischenräume',
  'Leuchtband',
  'Umlaufbahn',
  'Goldene Mitte',
  'Lichtermeer',
  'Fernlicht',
  'Lichterkreis',
];
const recent = levels.map(
  (l) =>
    l.mode +
    ':' +
    l.initial.positions.map((id) => (id === null ? 0 : l.pieces[id])).join(','),
);
for (const mode of ['slide', 'rotate'])
  for (const tier of slidingTiers) {
    let count = levels.filter((l) => l.mode === mode && l.tier === tier).length;
    for (; count < 20; count++) {
      const seed =
        920000 +
        (mode === 'rotate' ? 10000 : 0) +
        slidingTiers.indexOf(tier) * 1000 +
        count * 7;
      const l = generateSliding({ mode, tier, seed, exclude: recent });
      l.id = `${mode}-catalog-${slidingTiers.indexOf(tier) + 1}-${String(count + 1).padStart(2, '0')}`;
      l.name = names[count];
      l.witness = solutionPlan(l, freshSliding(l));
      recent.push(l.fingerprint);
      levels.push(l);
    }
  }
writeFileSync(file, JSON.stringify(levels, null, 2) + '\n');
console.log(
  'Created 60 puzzles per sliding mode, 20 per tier. Original indices and puzzle states preserved.',
);

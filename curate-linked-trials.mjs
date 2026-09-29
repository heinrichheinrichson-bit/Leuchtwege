import fs from 'node:fs';
import assert from 'node:assert/strict';
import { makeLevel } from './lib/level-design.mjs';
import { rotate } from './lib/game.mjs';
import { orientations, networkReasoning } from './lib/reasoning.mjs';
import { linkedChallengeConstraints, analyzeLinkedChallenge, countLinkedSolutions } from './lib/linked-challenge-analysis.mjs';

const found = [];
let best = 0;
for (let seed = 2000000; seed < 2500000 && found.length < 6; seed++) {
  const base = makeLevel(6, seed);
  if (!base) continue;
  const initial = [...base.solution];
  const independent = networkReasoning(orientations({ ...base, initial }), 6, base.source);
  const cells = independent.domains.map((d, i) => d.length > 1 ? i : -1).filter((i) => i >= 0);
  if (cells.length < 16) continue;
  let state = seed;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const deltas = independent.domains.map((ds, i) => {
    let mask = initial[i]; const out = [];
    for (let k = 0; k < 4; k++, mask = rotate(mask)) if (ds.includes(mask)) out.push(k);
    return out;
  });
  for (let attempt = 0; attempt < 40; attempt++) {
    const pairs = [], used = new Set();
    const shuffled = cells.map((i) => ({ i, order: random() })).sort((a,b) => a.order-b.order).map((x) => x.i);
    for (const a of shuffled) {
      if (used.has(a)) continue;
      const b = shuffled.find((b) => !used.has(b) && b !== a
        && Math.abs(a % 6 - b % 6) + Math.abs(Math.floor(a / 6) - Math.floor(b / 6)) >= 2
        && deltas[a].filter((k) => deltas[b].includes(k)).length >= 2);
      if (b === undefined) continue;
      pairs.push([a,b]); used.add(a); used.add(b);
      if (pairs.length === 4) break;
    }
    if (pairs.length < 4) continue;
    const l = { ...base, initial, mode: 'linked', variant: 'linked',
      groups: [...pairs, ...initial.map((_,i) => [i]).filter(([i]) => !used.has(i))],
      sources: [base.source], owners: initial.map(() => 0), targets: [] };
    const c = linkedChallengeConstraints(l), direct = c.propagate(c.initial);
    const ambiguous = pairs.filter((_, i) => direct.domains[i].length > 1).length;
    const uncertainty = direct.domains.filter((d) => d.length > 1).length;
    if (ambiguous < 4 || uncertainty < 12) continue;
    const report = analyzeLinkedChallenge(l);
    if (report.directUncertain > best) { best = report.directUncertain; console.log('Best', seed, report); }
    if (report.probeRounds < 2 && report.afterLookahead < 4) continue;
    const proof = countLinkedSolutions(l);
    if (proof.exhausted || proof.count !== 1) continue;
    // One board per base topology. Randomise each whole group legally.
    l.initial = [...initial];
    for (const group of l.groups) {
      const turns = 1 + Math.floor(random() * 3);
      for (const i of group) for (let k=0;k<turns;k++) l.initial[i]=rotate(l.initial[i]);
    }
    found.push({ ...l, trial: true, report });
    console.log('Found', found.length, seed, report);
    break;
  }
}
console.log('Finished', found.length);
assert.equal(found.length, 6, 'Do not replace the trial set with a partial search');
found.sort((a,b) => a.report.directUncertain-b.report.directUncertain || a.seed-b.seed);
const trials = found.map((l,i) => ({ ...l,
  id: `linked-trial-v1-${String(i+1).padStart(2,'0')}`,
  name: 'Gekoppelte Drehungen', tier: 'Schwer',
}));
fs.writeFileSync('lib/linked-trials.json', JSON.stringify(trials,null,2)+'\n');

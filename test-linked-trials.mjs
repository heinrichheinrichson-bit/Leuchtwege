import assert from 'node:assert/strict';
import { variantTrials, variantCatalog, variantAct, variantStatus, restoreVariants, emptyVariants } from './lib/variants.mjs';
import { fresh } from './lib/session.mjs';
import { solutionPlan, applyHelp } from './lib/solve-help.mjs';
import { analyzeLinkedChallenge, countLinkedSolutions } from './lib/linked-challenge-analysis.mjs';
import { rotationConstraints } from './lib/rotation-constraints.mjs';
assert.equal(variantTrials.length, 6);
for (const l of variantTrials) {
  assert(!variantCatalog.some(p => p.id === l.id));
  const a = analyzeLinkedChallenge(l);
  assert.equal(a.uncertainCouplings, 4);
  assert.equal(a.partnerGiveaways, 0);
  assert(a.probeRounds >= 2);
  const result = countLinkedSolutions(l);
  assert.equal(result.count, 1); assert(!result.exhausted);
  // Independent search using only the original constraint propagation.
  const c = rotationConstraints(l); let solutions = 0;
  function visit(ds) {
    const r = c.propagate(ds); if (r.contradiction) return;
    const index = r.domains.reduce((best,d,i) => d.length > 1 && (best < 0 || d.length < r.domains[best].length) ? i : best, -1);
    if (index < 0) { if (c.solved(r.domains)) solutions++; return; }
    for (const v of r.domains[index]) { const next = r.domains.map(d => [...d]); next[index] = [v]; visit(next); }
  }
  visit(c.initial); assert.equal(solutions,1);
  const s = fresh(l), plan = solutionPlan(l,s);
  assert(!variantStatus(l,s).solved);
  const almost = applyHelp(l,s,plan,'almost'); assert(!variantStatus(l,almost).solved);
  assert(variantStatus(l,applyHelp(l,almost,solutionPlan(l,almost),'step')).solved);
  assert(variantStatus(l,applyHelp(l,s,plan,'all')).solved);
  const step = applyHelp(l,s,plan,'step'); assert.equal(step.moves,1);
  assert.deepEqual(variantAct(l,step,{type:'undo'}),s);
  assert.deepEqual(restoreVariants({...emptyVariants(),sessions:{[l.id]:step}}).sessions[l.id],step);
}
console.log('Six trials: unique solutions, unresolved couplings, legal help, undo and persistence verified.');

import { rotationConstraints } from './rotation-constraints.mjs';
import { networkReasoning } from './reasoning.mjs';

// Offline review only. Includes mandatory network bridges and repeatedly shares
// deductions between individual cells and their coupled partners.
export function linkedChallengeConstraints(l) {
  const c = rotationConstraints(l);
  function propagate(input) {
    let domains = input.map((d) => [...d]), rounds = 0;
    for (;;) {
      const local = c.propagate(domains);
      if (local.contradiction) return { ...local, rounds };
      const cells = l.initial.map(() => []);
      l.groups.forEach((group, g) => group.forEach((cell, k) => {
        cells[cell] = [...new Set(local.domains[g].map((v) => c.candidates[g][v][k]))];
      }));
      const network = networkReasoning(cells, l.n, l.source);
      if (!network.valid) return { domains: local.domains, contradiction: true, rounds };
      const next = local.domains.map((ds, g) => ds.filter((v) =>
        l.groups[g].every((cell, k) => network.domains[cell].includes(c.candidates[g][v][k])),
      ));
      if (next.some((ds) => !ds.length)) return { domains: next, contradiction: true, rounds };
      if (next.every((ds, g) => ds.length === domains[g].length))
        return { domains: next, contradiction: false, rounds };
      domains = next;
      rounds++;
    }
  }
  return { ...c, propagate };
}

export function analyzeLinkedChallenge(l) {
  const c = linkedChallengeConstraints(l), direct = c.propagate(c.initial);
  if (direct.contradiction) throw Error('Invalid linked challenge');
  const coupled = l.groups.map((g, i) => g.length > 1 ? i : -1).filter((i) => i >= 0);
  const ambiguous = (ds) => ds.filter((d) => d.length > 1).length;
  const uncertainCouplings = coupled.filter((g) => direct.domains[g].length > 1).length;
  // Eliminate ALL failed one-group assumptions, then repeat direct deductions.
  // Count what remains: one surviving choice must not be confused with a trap.
  let current = direct.domains, rejected = 0, probeRounds = 0;
  for (;;) {
    const next = current.map((d) => [...d]);
    for (let g = 0; g < current.length; g++) {
      if (current[g].length < 2) continue;
      for (const value of current[g]) {
        const attempt = current.map((d) => [...d]);
        attempt[g] = [value];
        if (c.propagate(attempt).contradiction) {
          next[g] = next[g].filter((v) => v !== value);
          rejected++;
        }
      }
    }
    if (next.every((d, i) => d.length === current[i].length)) break;
    const result = c.propagate(next);
    if (result.contradiction) throw Error('Invalid probe deduction');
    current = result.domains;
    probeRounds++;
  }
  return {
    coupledGroups: coupled.length,
    uncertainCouplings,
    partnerGiveaways: coupled.length - uncertainCouplings,
    directUncertain: ambiguous(direct.domains),
    forcedCells: l.groups.reduce((n, g, i) => n + (direct.domains[i].length === 1 ? g.length : 0), 0),
    rejected,
    probeRounds,
    afterLookahead: ambiguous(current),
    coupledAfterLookahead: coupled.filter((g) => current[g].length > 1).length,
  };
}

export function countLinkedSolutions(l, { limit = 2, maxNodes = 50000 } = {}) {
  const c = linkedChallengeConstraints(l);
  let count = 0, nodes = 0, exhausted = false;
  function visit(input) {
    if (count >= limit || exhausted) return;
    if (++nodes > maxNodes) { exhausted = true; return; }
    const r = c.propagate(input);
    if (r.contradiction) return;
    let at = -1;
    r.domains.forEach((d, i) => {
      if (d.length > 1 && (at < 0 || d.length < r.domains[at].length)) at = i;
    });
    if (at < 0) { if (c.solved(r.domains)) count++; return; }
    for (const v of r.domains[at]) {
      const next = r.domains.map((d) => [...d]); next[at] = [v]; visit(next);
    }
  }
  visit(c.initial);
  return { count, exhausted, nodes };
}

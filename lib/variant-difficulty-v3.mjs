import { rotationConstraints } from './rotation-constraints.mjs';
export const variantTiers = ['Leicht', 'Mittel', 'Schwer'];
// Probe choices only AFTER exhausting neighbour and reachability deductions. Only proved
// contradictions count as dead ends; ambiguity alone may mean an easy alternative.
export function analyzeVariant(l) {
  const c = rotationConstraints(l),
    full = c.propagate(c.initial);
  if (full.contradiction) throw Error('Contradictory variant constraints');
  let probes = 0,
    deadEnds = 0,
    deepDeadEnds = 0,
    maxDeadEndDepth = 0,
    totalDepth = 0;
  for (let g = 0; g < full.domains.length; g++) {
    if (full.domains[g].length < 2) continue;
    for (const value of full.domains[g]) {
      const ds = full.domains.map((x) => [...x]);
      ds[g] = [value];
      const r = c.propagate(ds);
      probes++;
      if (r.contradiction) {
        deadEnds++;
        totalDepth += r.waves;
        maxDeadEndDepth = Math.max(maxDeadEndDepth, r.waves);
        if (r.waves >= 3) deepDeadEnds++;
      }
    }
  }
  const uncertain = full.domains.filter((ds) => ds.length > 1).length;
  // Long deduction chains and delayed contradictions carry weight, not size,
  // distance between paired tiles, or the number of scrambled rotations.
  const score = Number(
    (
      full.waves +
      maxDeadEndDepth * 1.5 +
      Math.min(6, deepDeadEnds * 0.5)
    ).toFixed(3),
  );
  return {
    version: 3,
    score,
    coupledGroups: l.groups.filter((g) => g.length > 1).length,
    waves: full.waves,
    uncertain,
    probes,
    deadEnds,
    deepDeadEnds,
    maxDeadEndDepth,
    meanDeadEndDepth: deadEnds ? Number((totalDepth / deadEnds).toFixed(2)) : 0,
  };
}
export function variantDifficulty(l) {
  const report = analyzeVariant(l);
  // Coupling adds constraints, so number of pairs alone is not difficulty.
  // Require both a substantial linked network and sustained deduction depth.
  const substantial =
    l.mode === 'path'
      ? l.targets.length >= 3
      : l.mode === 'dual'
        ? [0, 1].every(
            (owner) =>
              l.owners.filter((v) => v === owner).length >= (l.n * l.n) / 3,
          )
        : true;
  const hard =
    l.mode === 'linked'
      ? report.coupledGroups >= 6 && report.waves >= 6
      : substantial &&
        report.uncertain >= (l.mode === 'path' ? 8 : 6) &&
        report.deadEnds >= (l.mode === 'path' ? 4 : 2) &&
        report.maxDeadEndDepth >= 2;
  return {
    ...report,
    tier: hard ? 'Schwer' : report.score < 4 ? 'Leicht' : 'Mittel',
  };
}

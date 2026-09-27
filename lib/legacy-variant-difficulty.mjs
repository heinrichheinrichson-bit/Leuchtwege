import { rotationConstraints } from './rotation-constraints.mjs';
export const variantTiers = ['Leicht', 'Mittel', 'Schwer'];
// Probe plausible choices after immediate neighbour deductions. Only proved
// contradictions count as dead ends; ambiguity alone may mean an easy alternative.
export function analyzeVariant(l) {
  const c = rotationConstraints(l),
    local = c.propagate(c.initial, 1),
    full = c.propagate(c.initial);
  if (full.contradiction) throw Error('Contradictory variant constraints');
  let probes = 0,
    deadEnds = 0,
    deepDeadEnds = 0,
    maxDeadEndDepth = 0,
    totalDepth = 0;
  for (let g = 0; g < local.domains.length; g++) {
    if (local.domains[g].length < 2) continue;
    for (const value of local.domains[g]) {
      const ds = local.domains.map((x) => [...x]);
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
    version: 2,
    score,
    waves: full.waves,
    uncertain,
    probes,
    deadEnds,
    deepDeadEnds,
    maxDeadEndDepth,
    meanDeadEndDepth: deadEnds ? Number((totalDepth / deadEnds).toFixed(2)) : 0,
  };
}
export const variantThresholds = {
  dual: [4, 11],
  path: [4, 11],
  linked: [4, 11],
};
export function variantDifficulty(l) {
  const report = analyzeVariant(l),
    [easy, medium] = variantThresholds[l.mode];
  return {
    ...report,
    tier:
      report.score < easy
        ? 'Leicht'
        : report.score < medium
          ? 'Mittel'
          : 'Schwer',
  };
}

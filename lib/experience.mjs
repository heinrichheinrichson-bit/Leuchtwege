import { dailySpec, regularCompletion } from './daily.mjs';

// Published v1 rewards are reconstructed from immutable completed attempts.
// Keep this policy for these attempts when adding future reward sources.
export function dailyXp(tier, withoutHints = false) {
  return (
    35 +
    ({ Leicht: 0, Mittel: 10, Schwer: 25 }[tier] ?? 0) +
    (withoutHints ? 10 : 0)
  );
}
export function experienceSummary(attempts) {
  const awards = [],
    seen = new Set();
  for (const a of [...attempts]
    .filter(regularCompletion)
    .sort(
      (a, b) =>
        a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id),
    )) {
    if (a.origin !== 'daily') continue;
    let spec;
    try {
      spec = dailySpec(a.dailyDay, a.mode);
    } catch {
      continue;
    }
    if (a.puzzleId !== spec.id || seen.has(spec.id)) continue;
    seen.add(spec.id);
    awards.push({
      id: spec.id,
      attemptId: a.id,
      day: a.dailyDay,
      mode: a.mode,
      points: dailyXp(spec.tier, a.assistance === 'none' && a.hints === 0),
      completedAt: a.completedAt,
    });
  }
  const total = awards.reduce((sum, a) => sum + a.points, 0);
  let level = 1,
    current = total;
  while (current >= requiredXp(level)) {
    current -= requiredXp(level);
    level++;
  }
  return { total, level, current, required: requiredXp(level), awards };
}
export function requiredXp(level) {
  return 100 + (level - 1) * 50;
}

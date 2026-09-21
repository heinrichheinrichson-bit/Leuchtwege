import { attemptDailySpec, dailySlot, regularCompletion } from './daily.mjs';
import { milestoneSummary } from './milestones.mjs';

// Published v1 rewards are reconstructed from immutable completed attempts.
// Keep this policy for these attempts when adding future reward sources.
export function dailyXp(tier, withoutHints = false) {
  return puzzleXp('daily', tier, withoutHints);
}
export function puzzleXp(origin, tier, withoutHints = false, repeated = false) {
  if (repeated) return origin === 'daily' ? 0 : 5;
  return (
    ({ catalog: 20, free: 25, daily: 35 }[origin] ?? 0) +
    ({ Leicht: 0, Mittel: 10, Schwer: 25 }[tier] ?? 0) +
    (withoutHints ? 10 : 0)
  );
}
export function experienceSummary(attempts, freeze = null) {
  const awards = [],
    seen = new Set(),
    attemptIds = new Set();
  for (const a of [...attempts]
    .filter(regularCompletion)
    .sort(
      (a, b) =>
        a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id),
    )) {
    if (
      !['catalog', 'free', 'daily'].includes(a.origin) ||
      attemptIds.has(a.id)
    )
      continue;
    attemptIds.add(a.id);
    let tier = a.tier;
    if (a.origin === 'daily') {
      let spec;
      try {
        spec = attemptDailySpec(a);
      } catch {
        continue;
      }
      if (a.puzzleId !== spec.id) continue;
      tier = spec.tier;
    }
    const key =
      a.origin === 'daily'
        ? `daily:${a.dailyDay}:${dailySlot(a)}`
        : `${a.origin}:${a.mode}:${a.puzzleId}`;
    const points = puzzleXp(
      a.origin,
      tier,
      a.assistance === 'none' && a.hints === 0,
      seen.has(key),
    );
    seen.add(key);
    if (!points) continue;
    awards.push({
      id: a.puzzleId,
      attemptId: a.id,
      day: a.dailyDay,
      mode: a.mode,
      points,
      completedAt: a.completedAt,
    });
  }
  const milestones = milestoneSummary(
    attempts,
    undefined,
    freeze?.frozen || [],
  );
  const puzzleTotal = awards.reduce((sum, a) => sum + a.points, 0);
  const achievementAwards = milestones.achievements.filter((a) => a.done);
  const achievementTotal = achievementAwards.reduce(
    (sum, a) => sum + a.points,
    0,
  );
  const total =
    puzzleTotal +
    milestones.bonuses.reduce((sum, a) => sum + a.points, 0) +
    achievementTotal;
  let level = 1,
    current = total;
  while (current >= requiredXp(level)) {
    current -= requiredXp(level);
    level++;
  }
  return {
    total,
    puzzleTotal,
    achievementTotal,
    achievementAwards,
    level,
    current,
    required: requiredXp(level),
    awards,
    ...milestones,
  };
}
export function requiredXp(level) {
  return 100 + (level - 1) * 50;
}

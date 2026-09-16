import { achievementDefinitions } from './achievement-catalog.mjs';
import {
  dayKey,
  validDay,
  regularCompletion,
  dailySpec,
  shiftDay,
} from './daily.mjs';
export const MISSION_START = '2026-09-15';
export function eligibleAttempts(attempts) {
  const ids = new Set();
  return [...attempts]
    .filter((a) => {
      if (
        !regularCompletion(a) ||
        ids.has(a.id) ||
        !['catalog', 'free', 'daily'].includes(a.origin)
      )
        return false;
      if (a.origin === 'daily') {
        try {
          if (dailySpec(a.dailyDay, a.mode).id !== a.puzzleId) return false;
        } catch {
          return false;
        }
      }
      ids.add(a.id);
      return true;
    })
    .sort(
      (a, b) =>
        a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id),
    );
}
export function missionDefinitions(day) {
  if (!validDay(day)) return [];
  const n = Math.floor(Date.parse(day + 'T12:00:00Z') / 86400000);
  return [
    {
      id: 'two',
      title: 'Zwei Lichtblicke',
      detail: 'Löse zwei verschiedene Rätsel.',
      target: 2,
      points: 20,
      kind: 'all',
    },
    {
      id: 'modes',
      title: 'Neue Perspektiven',
      detail: 'Löse Rätsel in zwei Spielmodi.',
      target: 2,
      points: 25,
      kind: 'modes',
    },
    n % 2 === 0
      ? {
          id: 'clear',
          title: 'Aus eigener Kraft',
          detail: 'Löse ein Rätsel ohne Tipps.',
          target: 1,
          points: 15,
          kind: 'clear',
        }
      : {
          id: 'challenge',
          title: 'Eine Stufe weiter',
          detail: 'Löse ein mittleres oder schweres Rätsel.',
          target: 1,
          points: 15,
          kind: 'challenge',
        },
  ];
}
function dailyProgress(attempts, day) {
  return missionDefinitions(day).map((m) => {
    const seen = new Set();
    let attemptId = null;
    for (const a of attempts) {
      if (m.kind === 'clear' && (a.hints !== 0 || a.assistance !== 'none'))
        continue;
      if (m.kind === 'challenge' && !['Mittel', 'Schwer'].includes(a.tier))
        continue;
      seen.add(m.kind === 'modes' ? a.mode : `${a.mode}:${a.puzzleId}`);
      if (!attemptId && seen.size >= m.target) attemptId = a.id;
    }
    return {
      ...m,
      progress: Math.min(seen.size, m.target),
      attemptId,
      done: !!attemptId,
    };
  });
}
export function milestoneSummary(attempts, today = dayKey(), frozenDays = []) {
  const completed = eligibleAttempts(attempts),
    byDay = new Map(),
    bonuses = [];
  for (const a of completed) {
    const day = a.completedDay || dayKey(new Date(a.completedAt));
    if (!validDay(day) || day < MISSION_START || day > today) continue;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(a);
  }
  for (const [day, list] of byDay) {
    for (const m of dailyProgress(list, day))
      if (m.done)
        bonuses.push({
          id: `mission:${day}:${m.id}`,
          attemptId: m.attemptId,
          points: m.points,
          title: m.title,
        });
  }
  const definitions = achievementDefinitions;
  const sets = Object.fromEntries(
    [
      'count',
      'modes',
      'hard',
      'clear',
      'days',
      'turn',
      'slide',
      'rotate',
      'free',
      'daily',
    ].map((kind) => [kind, new Set()]),
  );
  const dayRuns = new Map();
  const unlocks = new Map();
  let longest = 0;
  for (const a of completed) {
    const key = `${a.mode}:${a.puzzleId}`,
      day = a.completedDay || dayKey(new Date(a.completedAt));
    if (!validDay(day) || day > today) continue;
    sets.count.add(key);
    sets.modes.add(a.mode);
    if (sets[a.mode]) sets[a.mode].add(key);
    if (a.origin === 'free' || a.origin === 'daily') sets[a.origin].add(key);
    if (a.tier === 'Schwer') sets.hard.add(key);
    if (a.hints === 0 && a.assistance === 'none') sets.clear.add(key);
    // Merge adjacent date intervals once per actual day, even after timezone changes.
    if (!sets.days.has(day)) {
      sets.days.add(day);
      const left = dayRuns.get(shiftDay(day, -1)) || 0;
      const right = dayRuns.get(shiftDay(day, 1)) || 0;
      const run = left + 1 + right;
      dayRuns.set(day, run);
      dayRuns.set(shiftDay(day, -left), run);
      dayRuns.set(shiftDay(day, right), run);
      longest = Math.max(longest, run);
    }
    for (const { id, target, kind } of definitions)
      if (
        !unlocks.has(id) &&
        (kind === 'streak' ? longest : sets[kind].size) >= target
      )
        unlocks.set(id, a.id);
  }
  if (frozenDays.length) {
    const playedByDay = new Map();
    for (const a of completed) {
      const day = a.completedDay || dayKey(new Date(a.completedAt));
      if (validDay(day) && day <= today && !playedByDay.has(day))
        playedByDay.set(day, a.id);
    }
    const covered = [
      ...new Set([
        ...playedByDay.keys(),
        ...frozenDays.filter((d) => validDay(d) && d < today),
      ]),
    ].sort();
    let run = 0,
      last = null;
    for (const day of covered) {
      if (!last || shiftDay(last, 1) !== day) run = 0;
      if (playedByDay.has(day)) run++;
      longest = Math.max(longest, run);
      for (const { id, target, kind } of definitions)
        if (
          kind === 'streak' &&
          !unlocks.has(id) &&
          run >= target &&
          playedByDay.has(day)
        )
          unlocks.set(id, playedByDay.get(day));
      last = day;
    }
  }
  return {
    missions: dailyProgress(byDay.get(today) || [], today),
    bonuses,
    achievements: definitions.map(({ id, title, detail, target, kind }) => ({
      kind,
      id,
      title,
      detail,
      target,
      progress: Math.min(target, kind === 'streak' ? longest : sets[kind].size),
      attemptId: unlocks.get(id),
      done: unlocks.has(id),
    })),
  };
}

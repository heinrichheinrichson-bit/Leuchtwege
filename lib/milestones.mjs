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
export function milestoneSummary(attempts, today = dayKey()) {
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
  const definitions = [
    ['first', 'Erster Lichtblick', 'Löse dein erstes Rätsel.', 1, 'count'],
    ['ten', 'Im Fluss', 'Löse 10 verschiedene Rätsel.', 10, 'count'],
    ['hundred', 'Lichtsammler', 'Löse 100 verschiedene Rätsel.', 100, 'count'],
    ['all', 'Alleskönner', 'Löse ein Rätsel in jedem Spielmodus.', 3, 'modes'],
    ['hard', 'Harter Kern', 'Löse ein schweres Rätsel.', 1, 'hard'],
    [
      'clear',
      'Klarer Kopf',
      'Löse 10 verschiedene Rätsel ohne Tipps.',
      10,
      'clear',
    ],
    [
      'week',
      'Eine Woche Licht',
      'Schließe an sieben aufeinanderfolgenden Tagen ein Spiel ab.',
      7,
      'streak',
    ],
  ];
  const sets = {
    count: new Set(),
    modes: new Set(),
    hard: new Set(),
    clear: new Set(),
    days: new Set(),
  };
  const unlocks = new Map();
  let longest = 0;
  for (const a of completed) {
    const key = `${a.mode}:${a.puzzleId}`,
      day = a.completedDay || dayKey(new Date(a.completedAt));
    if (!validDay(day) || day > today) continue;
    sets.count.add(key);
    sets.modes.add(a.mode);
    sets.days.add(day);
    if (a.tier === 'Schwer') sets.hard.add(key);
    if (a.hints === 0 && a.assistance === 'none') sets.clear.add(key);
    let run = 1;
    for (let d = shiftDay(day, -1); sets.days.has(d); d = shiftDay(d, -1))
      run++;
    for (let d = shiftDay(day, 1); sets.days.has(d); d = shiftDay(d, 1)) run++;
    longest = Math.max(longest, run);
    for (const [id, , , target, kind] of definitions)
      if (
        !unlocks.has(id) &&
        (kind === 'streak' ? longest : sets[kind].size) >= target
      )
        unlocks.set(id, a.id);
  }
  return {
    missions: dailyProgress(byDay.get(today) || [], today),
    bonuses,
    achievements: definitions.map(([id, title, detail, target, kind]) => ({
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

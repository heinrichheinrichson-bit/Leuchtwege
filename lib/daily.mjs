export const DAILY_START = '2026-09-12';
export const dailyModes = ['turn', 'slide', 'rotate'];
export const modeNames = {
  turn: 'Drehen',
  slide: 'Nur Schieben',
  rotate: 'Schieben & Drehen',
};
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(day + 'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === day;
}
export function shiftDay(day, n) {
  return new Date(Date.parse(day + 'T12:00:00Z') + n * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function dailySpec(day, mode) {
  if (!validDay(day) || !dailyModes.includes(mode))
    throw Error('Ungültiges Tagesrätsel.');
  let seed = 2166136261;
  for (const c of `daily-v1:${day}:${mode}`)
    seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  const ordinal = Math.floor(Date.parse(day + 'T12:00:00Z') / 86400000),
    tier = ['Leicht', 'Mittel', 'Schwer'][
      (ordinal + dailyModes.indexOf(mode)) % 3
    ];
  return {
    day,
    mode,
    seed,
    tier,
    id: `daily-v1-${mode}-${day}`,
    n: mode === 'turn' ? 4 : 3,
  };
}
export function regularCompletion(a) {
  return !!a.completedAt && a.assistance !== 'test' && !a.partialTime;
}
export function streakSummary(attempts, today = dayKey(), frozenDays = []) {
  const days = new Set(
    attempts
      .filter(regularCompletion)
      .map((a) => a.completedDay || dayKey(new Date(a.completedAt)))
      .filter((d) => validDay(d) && d <= today),
  );
  const frozen = new Set(
    frozenDays.filter((d) => validDay(d) && d < today && !days.has(d)),
  );
  const covered = new Set([...days, ...frozen]);
  let current = 0,
    d = days.has(today) ? today : shiftDay(today, -1);
  while (covered.has(d)) {
    if (days.has(d)) current++;
    d = shiftDay(d, -1);
  }
  let longest = 0,
    run = 0,
    last = null;
  for (const day of [...covered].sort()) {
    const count = days.has(day) ? 1 : 0;
    run = last && shiftDay(last, 1) === day ? run + count : count;
    longest = Math.max(longest, run);
    last = day;
  }
  return { current, longest, today: days.has(today), days, frozen };
}
export function dailyCompleted(attempts, day, mode) {
  return attempts.some(
    (a) =>
      a.origin === 'daily' &&
      a.dailyDay === day &&
      a.mode === mode &&
      regularCompletion(a),
  );
}
export function monthDays(month) {
  const first = month + '-01';
  if (!validDay(first)) throw Error('Ungültiger Monat');
  const leading = (new Date(first + 'T12:00:00Z').getUTCDay() + 6) % 7;
  const days = [];
  for (let d = first; d.startsWith(month); d = shiftDay(d, 1)) days.push(d);
  return { leading, days };
}

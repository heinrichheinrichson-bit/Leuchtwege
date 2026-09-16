import { dayKey, validDay, shiftDay, regularCompletion } from './daily.mjs';
export function validFreeze(s) {
  return (
    !!s &&
    s.version === 1 &&
    validDay(s.since) &&
    validDay(s.through) &&
    s.through >= shiftDay(s.since, -1) &&
    Number.isInteger(s.balance) &&
    s.balance >= 0 &&
    s.balance <= 2 &&
    Number.isInteger(s.progress) &&
    s.progress >= 0 &&
    s.progress < 7 &&
    (s.credit === null || validDay(s.credit)) &&
    Array.isArray(s.frozen) &&
    new Set(s.frozen).size === s.frozen.length &&
    s.frozen.every((d) => validDay(d) && d >= s.since && d <= s.through) &&
    typeof s.active === 'boolean'
  );
}
export function advanceFreeze(raw, attempts, today = dayKey()) {
  const played = new Set(
    attempts
      .filter(regularCompletion)
      .map((a) => a.completedDay || dayKey(new Date(a.completedAt)))
      .filter(validDay),
  );
  const s = validFreeze(raw)
    ? { ...raw, frozen: [...raw.frozen] }
    : {
        version: 1,
        since: today,
        through: shiftDay(today, -1),
        balance: 2,
        progress: 0,
        credit: null,
        frozen: [],
        active: played.has(shiftDay(today, -1)),
      };
  if (today < s.since || today <= s.through) return s;
  function credit(day) {
    if (s.credit && day <= s.credit) return;
    s.credit = day;
    s.progress++;
    if (s.progress === 7) {
      s.balance = Math.min(2, s.balance + 1);
      s.progress = 0;
    }
  }
  for (let day = shiftDay(s.through, 1); day < today; day = shiftDay(day, 1)) {
    if (played.has(day)) {
      credit(day);
      s.active = true;
    } else if (s.active && s.balance > 0) {
      s.balance--;
      s.frozen.push(day);
    } else s.active = false;
    s.through = day;
  }
  if (played.has(today)) credit(today);
  return s;
}

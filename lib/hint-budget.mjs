export function hintBudget(raw) {
  if (Number.isInteger(raw))
    return { used: Math.min(3, Math.max(0, raw)), rewards: [] };
  const rewards = Array.isArray(raw?.rewards)
    ? [
        ...new Set(
          raw.rewards.filter((v) => typeof v === 'string' && v.length < 100),
        ),
      ]
    : [];
  const used =
    Number.isSafeInteger(raw?.used) && raw.used >= 0
      ? Math.min(raw.used, 3 + rewards.length)
      : 0;
  return { used, rewards };
}
export const remainingHints = (b) => Math.max(0, 3 + b.rewards.length - b.used);
export function spendHint(b) {
  if (!remainingHints(b)) throw Error('Keine Tipps verfügbar.');
  return { ...b, used: b.used + 1 };
}
export function rewardHint(b, receipt) {
  if (!receipt || b.rewards.includes(receipt)) return b;
  return { ...b, rewards: [...b.rewards, receipt] };
}

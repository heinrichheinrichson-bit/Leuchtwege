// Compare membership, not just counts: a turn may light one branch and cut another.
// Disconnection takes precedence in that case. Completion is handled separately.
export function connectionSound(before, after) {
  if (after.solved) return null;
  if ([...before.lit].some((i) => !after.lit.has(i))) return 'disconnect';
  if ([...after.lit].some((i) => !before.lit.has(i))) return 'connect';
  return null;
}

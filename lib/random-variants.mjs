import { variantDifficulty as legacyDifficulty } from './legacy-variant-difficulty.mjs';
import {
  variantModes,
  variantCatalog,
  variantPuzzle,
  variantPlan,
} from './variants.mjs';
import { variantDifficulty } from './variant-difficulty.mjs';
import { variantFingerprint } from './variant-fingerprint.mjs';
import { fresh } from './session.mjs';
export const variantSizes = {
  dual: { Leicht: [3, 4], Mittel: [4, 5, 6], Schwer: [6] },
  path: { Leicht: [3], Mittel: [3, 4, 5], Schwer: [5, 6] },
  linked: { Leicht: [3, 4], Mittel: [4, 5, 6], Schwer: [6] },
};
const excluded = new Set(variantCatalog.map(variantFingerprint));
export function generateVariant({
  mode,
  legacy = false,
  tier,
  size = 0,
  seed,
  recent = [],
  maxAttempts = 15000,
  budgetMs = 6000,
}) {
  const sizes = (
    legacy
      ? {
          dual: { Leicht: [3, 4, 5, 6], Mittel: [4, 5, 6], Schwer: [6] },
          path: { Leicht: [3], Mittel: [3, 4], Schwer: [4, 5, 6] },
          linked: { Leicht: [3, 4, 5, 6], Mittel: [4, 5, 6], Schwer: [6] },
        }
      : variantSizes
  )[mode]?.[tier];
  if (
    !variantModes.includes(mode) ||
    !sizes ||
    (size !== 0 && !sizes.includes(size)) ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  )
    throw Error('Invalid generation options');
  const start = performance.now(),
    blocked = new Set([
      ...(legacy
        ? variantCatalog
            .filter((l) => (l.generatorVersion || 1) <= 3)
            .map(variantFingerprint)
        : excluded),
      ...recent,
    ]);
  for (let attempt = 0; attempt < Math.min(15000, maxAttempts); attempt++) {
    if (performance.now() - start > budgetMs) return null;
    const n = size || sizes[(seed + attempt) % sizes.length],
      candidate = (seed + Math.imul(attempt, 2654435761)) >>> 0;
    const l = variantPuzzle(
      mode,
      candidate,
      n,
      `variant-v${legacy ? 3 : 4}-${mode}-${n}-${candidate}`,
      legacy ? 3 : 4,
    );
    const d = legacy ? legacyDifficulty(l) : variantDifficulty(l);
    if (d.tier !== tier) continue;
    const key = variantFingerprint(l);
    if (blocked.has(key)) continue;
    if (variantPlan(l, fresh(l)).length < 4) continue;
    return { ...l, tier, difficulty: d, key };
  }
  return null;
}

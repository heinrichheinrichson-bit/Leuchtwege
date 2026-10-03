import { linkedBankSize } from './linked-bank.mjs';
import { variantDifficulty as difficultyV4 } from './variant-difficulty-v4.mjs';
import { variantDifficulty as legacyDifficulty } from './legacy-variant-difficulty.mjs';
import {
  variantModes,
  variantCatalog,
  variantPuzzle,
  variantPlan,
} from './variants.mjs';
import { variantDifficulty } from './variant-difficulty.mjs';
import { variantDifficulty as difficultyV3 } from './variant-difficulty-v3.mjs';
import { variantFingerprint } from './variant-fingerprint.mjs';
import { fresh } from './session.mjs';
import { linkedReserve } from './linked-reserve.mjs';
export const variantSizes = {
  dual: { Leicht: [3, 4], Mittel: [4, 5, 6], Schwer: [6] },
  path: { Leicht: [3], Mittel: [3, 4, 5], Schwer: [5, 6] },
  linked: { Leicht: [3, 4], Mittel: [4, 5, 6], Schwer: [6] },
};
const excluded = new Set(variantCatalog.map(variantFingerprint));
export function generateVariant({
  mode,
  legacy = false,
  ratingVersion = 5,
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
        : ratingVersion === 3
          ? variantCatalog
              .filter(
                (l) =>
                  !l.id.includes('-planning-') &&
                  (l.generatorVersion || 1) <= 4,
              )
              .map(variantFingerprint)
          : ratingVersion === 4
            ? variantCatalog
                .filter((l) => (l.generatorVersion || 1) <= 4)
                .map(variantFingerprint)
            : excluded),
      ...recent,
    ]);
  if (!legacy && ratingVersion >= 5 && mode === 'linked' && tier === 'Schwer') {
    // Select from independently verified structures, not easy boards with more
    // random turns. Skip catalogue boards and the player's recent structures.
    for (
      let attempt = 0;
      attempt < Math.min(linkedBankSize, maxAttempts);
      attempt++
    ) {
      if (performance.now() - start > budgetMs) return null;
      const candidate = (seed + attempt) >>> 0;
      const l = variantPuzzle(
        mode,
        candidate,
        6,
        `variant-v5-linked-6-${candidate}`,
        5,
      );
      const key = variantFingerprint(l);
      if (blocked.has(key)) continue;
      const d = variantDifficulty(l);
      if (d.tier !== tier)
        throw Error('Linked bank no longer meets its rating');
      return { ...l, tier, difficulty: d, key };
    }
    return null;
  }
  for (let attempt = 0; attempt < Math.min(15000, maxAttempts); attempt++) {
    if (performance.now() - start > budgetMs) return null;
    // Hard linked boards are rare. A bounded fresh search is followed by a
    // vetted reserve before continuing the search. This uses attempt count,
    // never machine speed, so daily seeds produce the same board on all devices.
    const reserve =
      !legacy &&
      ratingVersion === 4 &&
      mode === 'linked' &&
      tier === 'Schwer' &&
      attempt >= 256 &&
      attempt < 256 + linkedReserve.length;
    const n = size || sizes[(seed + attempt) % sizes.length],
      candidate = reserve
        ? linkedReserve[(seed + attempt - 256) % linkedReserve.length]
        : (seed + Math.imul(attempt, 2654435761)) >>> 0;
    const l = variantPuzzle(
      mode,
      candidate,
      n,
      `variant-v${legacy ? 3 : 4}-${mode}-${n}-${candidate}`,
      legacy ? 3 : 4,
    );
    const d = legacy
      ? legacyDifficulty(l)
      : ratingVersion === 3
        ? difficultyV3(l)
        : ratingVersion === 4
          ? difficultyV4(l)
          : variantDifficulty(l);
    if (d.tier !== tier) continue;
    const key = variantFingerprint(l);
    if (blocked.has(key)) continue;
    if (variantPlan(l, fresh(l)).length < 4) continue;
    return { ...l, tier, difficulty: d, key };
  }
  return null;
}

import { dailySpec } from './daily.mjs';
import { generateRandom, restoreFree } from './random-game.mjs';
import { generateSliding, restoreFreeSliding } from './random-sliding.mjs';
import { variantFingerprint } from './variant-fingerprint.mjs';
import { generateVariant } from './random-variants.mjs';
import { savedVariant, restoreVariants, variantModes } from './variants.mjs';
import { fresh } from './session.mjs';
import { freshSliding } from './sliding.mjs';
// v1 seeds and generation rules form the daily schedule; preserve them for old dates.
export function generateDaily(day, mode, slot) {
  const spec = dailySpec(day, mode, slot);
  const generated =
    mode === 'turn'
      ? generateRandom({
          tier: spec.tier,
          size: slot === undefined ? 4 : 0,
          seed: spec.seed,
        })
      : variantModes.includes(mode)
        ? generateVariant({
            mode,
            tier: spec.tier,
            seed: spec.seed,
            budgetMs: 10000,
          })
        : generateSliding({ mode, tier: spec.tier, seed: spec.seed });
  if (!generated)
    throw Error(
      'Die Erzeugung braucht länger. Bitte dasselbe Tagesrätsel erneut öffnen.',
    );
  const puzzle = {
    ...generated,
    id: spec.id,
    name: `Tageslicht · ${day.split('-').reverse().join('.')}`,
    dailyDay: day,
    mode,
    tier: spec.tier,
  };
  return {
    version: slot === undefined ? 1 : 2,
    ...(slot === undefined ? {} : { slot }),
    day,
    mode,
    puzzle,
    session:
      mode === 'turn' || variantModes.includes(mode)
        ? fresh(puzzle)
        : freshSliding(puzzle),
  };
}
export function restoreDaily(raw, day, mode, slot) {
  try {
    const spec = dailySpec(day, mode, slot);
    if (
      raw?.version !== (slot === undefined ? 1 : 2) ||
      raw.slot !== slot ||
      raw.day !== day ||
      raw.mode !== mode ||
      raw.puzzle?.id !== spec.id ||
      (spec.n !== 0 && raw.puzzle.n !== spec.n) ||
      raw.puzzle.mode !== mode
    )
      return null;
    let checked;
    if (mode === 'turn')
      checked = restoreFree({
        version: 1,
        puzzle: raw.puzzle,
        session: raw.session,
      });
    else if (variantModes.includes(mode)) {
      const saved = {
        seed: raw.puzzle.seed,
        n: raw.puzzle.n,
        generatorVersion: raw.puzzle.generatorVersion,
        session: raw.session,
      };
      const restored = restoreVariants({
        version: 1,
        mode,
        sessions: {},
        free: { [mode]: saved },
      }).free[mode];
      if (!restored) return null;
      const puzzle = savedVariant(mode, restored);
      checked = {
        puzzle: { ...puzzle, key: variantFingerprint(puzzle) },
        session: restored.session,
      };
    } else
      checked = restoreFreeSliding({
        version: 1,
        [mode]: {
          puzzle: { ...raw.puzzle, id: `free-${mode}-restore` },
          session: raw.session,
        },
      })[mode];
    if (!checked?.puzzle) return null;
    return {
      ...raw,
      puzzle: {
        ...checked.puzzle,
        id: spec.id,
        name: raw.puzzle.name,
        dailyDay: day,
        mode,
        tier: spec.tier,
      },
      session: checked.session,
    };
  } catch {
    return null;
  }
}

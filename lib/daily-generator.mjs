import { dailySpec } from './daily.mjs';
import { generateRandom, restoreFree } from './random-game.mjs';
import { generateSliding, restoreFreeSliding } from './random-sliding.mjs';
import { fresh } from './session.mjs';
import { freshSliding } from './sliding.mjs';
// v1 seeds and generation rules form the daily schedule; preserve them for old dates.
export function generateDaily(day, mode) {
  const spec = dailySpec(day, mode);
  const generated =
    mode === 'turn'
      ? generateRandom({ tier: spec.tier, size: 4, seed: spec.seed })
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
    version: 1,
    day,
    mode,
    puzzle,
    session: mode === 'turn' ? fresh(puzzle) : freshSliding(puzzle),
  };
}
export function restoreDaily(raw, day, mode) {
  try {
    const spec = dailySpec(day, mode);
    if (
      raw?.version !== 1 ||
      raw.day !== day ||
      raw.mode !== mode ||
      raw.puzzle?.id !== spec.id ||
      raw.puzzle.n !== spec.n ||
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
    else
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

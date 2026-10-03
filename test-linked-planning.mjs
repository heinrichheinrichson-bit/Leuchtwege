import { variantDifficulty as difficultyV4 } from './lib/variant-difficulty-v4.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { variantCatalog, variantPuzzle } from './lib/variants.mjs';
import { variantDifficulty } from './lib/variant-difficulty.mjs';
import { generateDaily, restoreDaily } from './lib/daily-generator.mjs';
import { linkedReserve } from './lib/linked-reserve.mjs';
import { generateVariant } from './lib/random-variants.mjs';
import { variantFingerprint } from './lib/variant-fingerprint.mjs';

// A long forced chain used to be enough for Hard. It must no longer be.
const forced = variantCatalog.filter(
  (l) =>
    l.mode === 'linked' &&
    l.difficulty.coupledGroups >= 6 &&
    l.difficulty.waves >= 6 &&
    l.difficulty.uncertain === 0,
);
assert(forced.length > 0);
assert(forced.every((l) => l.tier !== 'Schwer'));
const hard = variantCatalog.filter(
  (l) => l.mode === 'linked' && l.tier === 'Schwer',
);
assert(hard.length >= 30);
for (const l of hard) {
  const d = variantDifficulty(l);
  assert(
    d.uncertainCouplings >= 4 && d.directUncertain >= 12 && d.probeRounds >= 2,
  );
  // The solution is not an input to the difficulty assessment.
  assert.deepEqual(variantDifficulty({ ...l, solution: undefined }), d);
}
assert.equal(
  variantDifficulty(variantPuzzle('linked', 801361, 6, 'test', 4)).tier,
  'Mittel',
);
const seen = new Set(variantCatalog.map(variantFingerprint));
assert.equal(linkedReserve.length, 128);
for (const seed of linkedReserve) {
  const l = variantPuzzle('linked', seed, 6, 'reserve', 4);
  assert.equal(difficultyV4(l).tier, 'Schwer');
  const key = variantFingerprint(l);
  assert(
    !seen.has(key),
    'Reserve has neither catalogue duplicates nor internal duplicates',
  );
  seen.add(key);
}
// This seed exhausted the old 15,000 attempts. The bounded reserve fixes it.
const options = {
  mode: 'linked',
  tier: 'Schwer',
  seed: 579690,
  maxAttempts: 512,
};
const generated = generateVariant(options);
assert(generated);
assert.equal(
  generateVariant(options).seed,
  generated.seed,
  'Deterministic across runs',
);
const next = generateVariant({ ...options, recent: [generated.key] });
assert(
  next && next.key !== generated.key,
  'Skip recently played reserve puzzles',
);
for (const fixture of JSON.parse(
  fs.readFileSync('test-fixtures/daily-before-planning.json'),
)) {
  const { day, mode, slot, hash } = fixture;
  const daily = generateDaily(day, mode, slot),
    p = daily.puzzle;
  assert.equal(
    createHash('sha256')
      .update(
        JSON.stringify([
          p.id,
          p.n,
          p.initial,
          p.solution,
          p.groups,
          p.sources,
          p.owners,
          p.targets,
        ]),
      )
      .digest('hex'),
    hash,
    'Previously published daily boards must not change',
  );
  const restored = restoreDaily(
    JSON.parse(JSON.stringify(daily)),
    day,
    mode,
    slot,
  );
  assert(restored);
  assert.equal(restored.puzzle.difficulty.tier, daily.puzzle.difficulty.tier);
}
for (const day of ['2026-09-29', '2026-10-01', '2026-10-15']) {
  const daily = generateDaily(day, 'linked', 2);
  assert.equal(daily.puzzle.difficulty.version, day < '2026-10-04' ? 4 : 5);
  assert.equal(daily.puzzle.difficulty.tier, 'Schwer');
  assert(restoreDaily(daily, day, 'linked', 2));
}
console.log(
  'PASS: linked planning thresholds, solution-independent rating, historical daily identities and new daily generation.',
);

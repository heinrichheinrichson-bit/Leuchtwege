# Tvispy 1.41 test

## Linked Rotations

The six trial puzzles informed the regular hard catalogue. The standalone trial section is removed; saved trial attempts remain resumable for compatibility.

30 new regular hard puzzles and 128 separate free-play structures use four unresolved coupled pairs, at least 12 unresolved variables after direct deduction, and either multiple failed-assumption rounds or unresolved choices after probing. Every bank structure has a unique solution independently checked by exhaustive constraint search. Free play randomly selects verified structures and legally scrambles their groups; it does not claim unlimited unique topologies. Published generation-5 bank order and length are immutable.

Existing puzzle identities and saves are preserved. Former linked hard puzzles now classified as medium retain their boards. Daily generation changes on 2026-10-04; previous daily ratings and identities use the historical classifier.

## Difficulty audit

All 854 regular catalogue puzzles were checked with their mode-specific criteria. Sliding distances are independently verified by breadth-first search to any valid goal. slide-1 requires eight slides and moves from easy to medium. Other modes were rechecked using their existing reasoning analysis, with the stronger linked classifier added in this release. These measurements support classification; they do not guarantee identical perceived difficulty for every player.

The reproducible per-puzzle report is all-mode-difficulty-audit.json. Run audit-all-modes.mjs --check to verify it.

## Completion messages

32 original bilingual title/body pairs rotate without repetition within a full bag. Reopening a result for the same attempt keeps its message. This decorative history is independent of rewards and puzzle progress. Existing delayed celebration and navigation are preserved.

## Validation

Full regression suite, TypeScript, test web build, Android debug build, and mobile browser result/menu checks. Test assistance remains available in this test APK.

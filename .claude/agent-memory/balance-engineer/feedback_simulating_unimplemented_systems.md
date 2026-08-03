---
name: feedback-simulating-unimplemented-systems
description: How to build a real (not reimplemented-math) simulation when the system under test has zero code implementation yet
metadata:
  type: feedback
---

Pattern confirmed twice now: once in the pre-existing `tools/balance-sim/dedication-l1-10-dpr.js` (REV 2 comment explains the same reasoning), and again for the 2026-07-30 attribute-remap saves review.

When asked to balance-test a proposed system that has no code yet (e.g. the six-attribute remap, unimplemented L4-L10 ability content), don't fabricate placeholder math for the missing piece. Instead:
1. Check whether the proposal's own design doc states a clean 1:1 mapping to something that IS live (e.g. this remap's own table says STR->Prowess and CON->Vitality are "clean 1:1, no split"). If so, the live D&D-labelled numbers in `Character.js`/`CombatManager.js`/`EncounterBuilder.js` ARE the new system's numbers under a different name — simulate with those directly, don't invent new formulas.
2. Reuse real config (`RULES` from `rulesEngine.js`, point-buy costs, ASI levels, proficiency tables) and real dice utilities (`src/utils/dice.js`) rather than hardcoding derived constants.
3. For the part of the proposal that genuinely has no live analog (e.g. a future evasion/soak AC split), build it as an explicitly-labeled hypothetical/toggle (see `EVASION_AC_MODE` env var in the remap harness) and report it separately from the grounded result, not blended into the headline verdict.
4. State plainly in the harness file header which parts are real-data Monte Carlo and which are a documented hypothetical — a future reader (including a future me) needs to be able to tell those apart without re-deriving it.

**Why this matters:** the alternative — reimplementing a guessed version of the unbuilt math — tests the guess, not the game, which is the exact failure mode this role exists to avoid (per `.claude/skills/balance-engineer/SKILL.md`: "reusing the real rulesEngine.js... never a reimplementation of the math, or you're testing your own guess instead of the game").
